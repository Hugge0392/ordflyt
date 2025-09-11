import * as sdk from "microsoft-cognitiveservices-speech-sdk";

interface TTSRequest {
  text: string;
  voice?: string;
  rate?: string;
  pitch?: string;
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
            resolve(Buffer.from(result.audioData));
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