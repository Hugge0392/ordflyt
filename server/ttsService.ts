import * as sdk from "microsoft-cognitiveservices-speech-sdk";

interface TTSRequest {
  text: string;
  voice?: string;
  rate?: string;
  pitch?: string;
}

interface TTSChunk {
  index: number;
  text: string;
  audioBuffer: Buffer;
}

interface ChunkedTTSRequest {
  text: string;
  voice?: string;
  rate?: string;
  pitch?: string;
  maxChunkLength?: number;
}

export class TextToSpeechService {
  private speechConfig: sdk.SpeechConfig;

  constructor() {
    const subscriptionKey = process.env.AZURE_SPEECH_KEY;
    const serviceRegion = process.env.AZURE_SPEECH_REGION;

    if (!subscriptionKey || !serviceRegion) {
      throw new Error("Azure Speech Service credentials not found in environment variables");
    }

    this.speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
    
    // Set default Swedish voice
    this.speechConfig.speechSynthesisVoiceName = "sv-SE-MattiasNeural";
    this.speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz160KBitRateMonoMp3;
  }

  async synthesizeSpeech(request: TTSRequest): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // Create SSML for better control over speech synthesis
      const ssml = this.createSSML(request);
      
      // Create speech synthesizer
      const synthesizer = new sdk.SpeechSynthesizer(this.speechConfig);

      synthesizer.speakSsmlAsync(
        ssml,
        (result: any) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            synthesizer.close();
            
            // Improved Buffer conversion using Uint8Array for safety
            const audioBuffer = Buffer.from(new Uint8Array(result.audioData));
            
            // Log magic bytes (first 4 bytes) and total length for debugging
            const magicBytes = Array.from(audioBuffer.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join(' ');
            console.log(`TTS Audio: ${audioBuffer.length} bytes, magic: ${magicBytes}`);
            
            resolve(audioBuffer);
          } else {
            synthesizer.close();
            reject(new Error(`Speech synthesis failed: ${result.errorDetails}`));
          }
        },
        (error: any) => {
          synthesizer.close();
          reject(new Error(`Speech synthesis error: ${error}`));
        }
      );
    });
  }

  private createSSML(request: TTSRequest): string {
    const voice = request.voice || "sv-SE-MattiasNeural";
    const rate = request.rate || "medium";
    const pitch = request.pitch || "medium";

    return `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="sv-SE">
        <voice name="${voice}">
          <prosody rate="${rate}" pitch="${pitch}">
            ${this.escapeXml(request.text)}
          </prosody>
        </voice>
      </speak>
    `;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  // Text segmentation function
  segmentText(text: string, maxChunkLength: number = 200): string[] {
    // Clean and normalize the text
    const cleanedText = text
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Decode HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    if (!cleanedText) {
      return [];
    }

    const chunks: string[] = [];
    
    // First try to split by double line breaks (paragraphs)
    const paragraphs = cleanedText.split(/\n\s*\n/).filter(p => p.trim());
    
    for (const paragraph of paragraphs) {
      if (paragraph.length <= maxChunkLength) {
        chunks.push(paragraph.trim());
      } else {
        // If paragraph is too long, split by sentences
        const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim());
        let currentChunk = '';
        
        for (const sentence of sentences) {
          const trimmedSentence = sentence.trim();
          if (!trimmedSentence) continue;
          
          // Add punctuation back
          const sentenceWithPunctuation = trimmedSentence + (sentence.match(/[.!?]+/) ? sentence.match(/[.!?]+/)?.[0] || '.' : '.');
          
          if ((currentChunk + ' ' + sentenceWithPunctuation).length <= maxChunkLength) {
            currentChunk = currentChunk ? currentChunk + ' ' + sentenceWithPunctuation : sentenceWithPunctuation;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk);
            }
            
            // If single sentence is still too long, split by words
            if (sentenceWithPunctuation.length > maxChunkLength) {
              const words = sentenceWithPunctuation.split(' ');
              let wordChunk = '';
              
              for (const word of words) {
                if ((wordChunk + ' ' + word).length <= maxChunkLength) {
                  wordChunk = wordChunk ? wordChunk + ' ' + word : word;
                } else {
                  if (wordChunk) {
                    chunks.push(wordChunk);
                  }
                  wordChunk = word;
                }
              }
              
              if (wordChunk) {
                chunks.push(wordChunk);
              }
            } else {
              currentChunk = sentenceWithPunctuation;
            }
          }
        }
        
        if (currentChunk) {
          chunks.push(currentChunk);
        }
      }
    }
    
    return chunks.filter(chunk => chunk.trim().length > 0);
  }

  // Synthesize text in chunks for faster startup
  async synthesizeChunkedSpeech(request: ChunkedTTSRequest): Promise<TTSChunk[]> {
    const { text, voice, rate, pitch, maxChunkLength = 200 } = request;
    
    if (!text || typeof text !== 'string') {
      throw new Error("Text is required and must be a string");
    }

    const textChunks = this.segmentText(text, maxChunkLength);
    
    if (textChunks.length === 0) {
      throw new Error("No valid text chunks found");
    }

    console.log(`TTS Chunked: Processing ${textChunks.length} chunks, lengths: ${textChunks.map(c => c.length).join(', ')}`);
    
    const chunks: TTSChunk[] = [];
    
    // Process all chunks concurrently for better performance
    const synthesisPromises = textChunks.map(async (chunkText, index) => {
      try {
        const audioBuffer = await this.synthesizeSpeech({
          text: chunkText,
          voice,
          rate,
          pitch
        });
        
        return {
          index,
          text: chunkText,
          audioBuffer
        } as TTSChunk;
      } catch (error) {
        console.error(`Error synthesizing chunk ${index}:`, error);
        throw new Error(`Failed to synthesize chunk ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
    
    const results = await Promise.all(synthesisPromises);
    chunks.push(...results);
    
    console.log(`TTS Chunked: Successfully synthesized ${chunks.length} audio chunks`);
    
    return chunks.sort((a, b) => a.index - b.index);
  }

  // Get available Swedish voices
  getAvailableVoices(): Array<{ name: string; displayName: string; gender: string }> {
    return [
      { name: "sv-SE-MattiasNeural", displayName: "Mattias (Man)", gender: "Male" },
      { name: "sv-SE-SofieNeural", displayName: "Sofie (Kvinna)", gender: "Female" },
      { name: "sv-SE-HilleviNeural", displayName: "Hillevi (Kvinna)", gender: "Female" }
    ];
  }
}

export const ttsService = new TextToSpeechService();