import { useState, useRef, useCallback, useEffect } from 'react';

interface TTSSettings {
  voice: string;
  rate: string;
  pitch: string;
}

interface AudioChunk {
  index: number;
  text: string;
  audio: string; // base64 encoded
  size: number;
}

interface ChunkedTTSResponse {
  chunks: AudioChunk[];
  totalChunks: number;
  totalSize: number;
}

interface UseTextToSpeechReturn {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  currentPosition: number;
  duration: number;
  currentChunk: number;
  totalChunks: number;
  chunkProgress: number;
  settings: TTSSettings;
  availableVoices: Array<{ name: string; displayName: string; gender: string }>;
  play: (text: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setSettings: (settings: Partial<TTSSettings>) => void;
  fetchVoices: () => Promise<void>;
}

const DEFAULT_VOICES = [
  { name: "sv-SE-MattiasNeural", displayName: "Mattias (Man)", gender: "Male" },
  { name: "sv-SE-SofieNeural", displayName: "Sofie (Kvinna)", gender: "Female" },
  { name: "sv-SE-HilleviNeural", displayName: "Hillevi (Kvinna)", gender: "Female" }
];

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [chunkProgress, setChunkProgress] = useState(0);
  const [availableVoices, setAvailableVoices] = useState(DEFAULT_VOICES);
  const [settings, setSettingsState] = useState<TTSSettings>({
    voice: "sv-SE-MattiasNeural",
    rate: "medium",
    pitch: "medium"
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTextRef = useRef<string>("");
  const audioQueueRef = useRef<AudioChunk[]>([]);
  const currentChunkIndexRef = useRef<number>(0);
  const audioUrlsRef = useRef<string[]>([]);
  const isChunkedPlaybackRef = useRef<boolean>(false);

  // Helper function to clean up audio element from DOM
  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.parentNode) {
        audioRef.current.parentNode.removeChild(audioRef.current);
      }
      audioRef.current = null;
    }
    
    // Cleanup audio URLs to prevent memory leaks
    audioUrlsRef.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.warn('Error revoking audio URL:', error);
      }
    });
    audioUrlsRef.current = [];
    
    // Reset chunked playback state
    audioQueueRef.current = [];
    currentChunkIndexRef.current = 0;
    isChunkedPlaybackRef.current = false;
    setCurrentChunk(0);
    setTotalChunks(0);
    setChunkProgress(0);
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return cleanupAudio;
  }, [cleanupAudio]);

  const setSettings = useCallback((newSettings: Partial<TTSSettings>) => {
    setSettingsState(prev => ({ ...prev, ...newSettings }));
  }, []);

  const fetchVoices = useCallback(async () => {
    try {
      const response = await fetch('/api/tts/voices');
      if (response.ok) {
        const data = await response.json();
        setAvailableVoices(data.voices || DEFAULT_VOICES);
      }
    } catch (err) {
      console.warn('Failed to fetch voices, using defaults:', err);
      setAvailableVoices(DEFAULT_VOICES);
    }
  }, []);

  const cleanText = useCallback((text: string): string => {
    // Remove HTML tags and clean up text for TTS
    return text
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Decode HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }, []);

  // Play a specific audio chunk
  const playChunk = useCallback(async (chunk: AudioChunk) => {
    try {
      // Decode base64 audio data
      const audioData = atob(chunk.audio);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }

      const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlsRef.current.push(audioUrl);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Add audio element to DOM for testing
      audio.style.display = 'none';
      audio.setAttribute('data-testid', `tts-audio-chunk-${chunk.index}`);
      document.body.appendChild(audio);

      return new Promise<void>((resolve, reject) => {
        audio.addEventListener('loadedmetadata', () => {
          setDuration(audio.duration);
        });

        audio.addEventListener('timeupdate', () => {
          setCurrentPosition(audio.currentTime);
          const progress = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
          setChunkProgress(progress);
        });

        audio.addEventListener('play', () => {
          setIsPlaying(true);
          setIsLoading(false);
        });

        audio.addEventListener('pause', () => {
          setIsPlaying(false);
        });

        audio.addEventListener('ended', () => {
          setIsPlaying(false);
          setCurrentPosition(0);
          resolve();
        });

        audio.addEventListener('error', (e) => {
          console.error('Audio chunk playback error:', e);
          setError('Fel vid uppspelning av ljudsegment');
          setIsPlaying(false);
          setIsLoading(false);
          reject(new Error('Audio chunk playback failed'));
        });

        // Start playback
        audio.play().catch(reject);
      });
    } catch (error) {
      setError('Fel vid bearbetning av ljuddata');
      throw error;
    }
  }, []);

  // Play next chunk in queue
  const playNextChunk = useCallback(async () => {
    if (currentChunkIndexRef.current >= audioQueueRef.current.length) {
      // All chunks played, cleanup
      setIsPlaying(false);
      setCurrentPosition(0);
      setChunkProgress(0);
      cleanupAudio();
      return;
    }

    const nextChunk = audioQueueRef.current[currentChunkIndexRef.current];
    setCurrentChunk(currentChunkIndexRef.current + 1);
    
    console.log(`Playing chunk ${currentChunkIndexRef.current + 1}/${audioQueueRef.current.length}: "${nextChunk.text.substring(0, 50)}..."`);

    try {
      await playChunk(nextChunk);
      currentChunkIndexRef.current++;
      
      // Automatically play next chunk if there are more
      if (currentChunkIndexRef.current < audioQueueRef.current.length) {
        await playNextChunk();
      }
    } catch (error) {
      console.error('Error playing chunk:', error);
      setError('Fel vid uppspelning av ljudsegment');
      setIsPlaying(false);
    }
  }, [playChunk, cleanupAudio]);

  const play = useCallback(async (text: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Stop current audio if playing
      cleanupAudio();

      const cleanedText = cleanText(text);
      currentTextRef.current = cleanedText;

      if (!cleanedText.trim()) {
        throw new Error('Ingen text att läsa upp');
      }

      // Check for development bypass mode
      const isDevBypass = !import.meta.env.PROD && localStorage.getItem('devBypass') === 'true';

      if (isDevBypass) {
        console.log('🔊 Dev bypass active - using Web Speech API for TTS');

        // Use browser's built-in Web Speech API as fallback
        if (!('speechSynthesis' in window)) {
          throw new Error('Webbläsaren stöder inte uppläsning');
        }

        // Stop any current speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(cleanedText);

        // Try to find a Swedish voice
        const voices = window.speechSynthesis.getVoices();
        const swedishVoice = voices.find(voice =>
          voice.lang.startsWith('sv') || voice.name.toLowerCase().includes('swedish')
        );

        if (swedishVoice) {
          utterance.voice = swedishVoice;
          console.log('🇸🇪 Using Swedish voice:', swedishVoice.name);
        } else {
          console.log('⚠️ No Swedish voice found, using default');
        }

        // Configure speech settings
        utterance.rate = parseFloat(settings.rate);
        utterance.pitch = parseFloat(settings.pitch);
        utterance.volume = 1;

        utterance.onstart = () => {
          setIsPlaying(true);
          setIsLoading(false);
          console.log('🎵 Web Speech TTS started');
        };

        utterance.onend = () => {
          setIsPlaying(false);
          setCurrentPosition(0);
          console.log('🔇 Web Speech TTS ended');
        };

        utterance.onerror = (event) => {
          setIsPlaying(false);
          setIsLoading(false);
          setError(`Uppläsningsfel: ${event.error}`);
          console.error('❌ Web Speech TTS error:', event.error);
        };

        // Start speech
        window.speechSynthesis.speak(utterance);
        return;
      }

      // Decide whether to use chunked or regular synthesis based on text length
      const useChunkedSynthesis = cleanedText.length > 500;

      if (useChunkedSynthesis) {
        console.log(`TTS: Using chunked synthesis for ${cleanedText.length} characters`);
        
        // Request chunked TTS synthesis
        const response = await fetch('/api/tts/synthesize-chunked', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: cleanedText,
            voice: settings.voice,
            rate: settings.rate,
            pitch: settings.pitch,
            maxChunkLength: 200
          })
        });

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch (e) {
            errorMessage = await response.text() || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const chunkedResponse: ChunkedTTSResponse = await response.json();
        
        // Set up chunked playback
        audioQueueRef.current = chunkedResponse.chunks;
        currentChunkIndexRef.current = 0;
        isChunkedPlaybackRef.current = true;
        setTotalChunks(chunkedResponse.totalChunks);
        setCurrentChunk(0);
        
        console.log(`TTS: Loaded ${chunkedResponse.totalChunks} chunks, total size: ${chunkedResponse.totalSize} bytes`);

        // Start playing the first chunk immediately
        await playNextChunk();

      } else {
        console.log(`TTS: Using regular synthesis for ${cleanedText.length} characters`);
        
        // Use regular single synthesis for shorter texts
        isChunkedPlaybackRef.current = false;
        setTotalChunks(1);
        setCurrentChunk(1);
        
        const response = await fetch('/api/tts/synthesize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: cleanedText,
            voice: settings.voice,
            rate: settings.rate,
            pitch: settings.pitch
          })
        });

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
            } else {
              errorMessage = await response.text() || errorMessage;
            }
          } catch (e) {
            // Use default error message
          }
          throw new Error(errorMessage);
        }

        // Create audio from response using arrayBuffer for better control
        const arrayBuffer = await response.arrayBuffer();
        
        // Log arrayBuffer size for debugging
        console.log(`TTS Client: Received ${arrayBuffer.byteLength} bytes`);
        
        // Use server's Content-Type header instead of hardcoded 'audio/mpeg'
        const contentType = response.headers.get('Content-Type') ?? 'application/octet-stream';
        const audioBlob = new Blob([new Uint8Array(arrayBuffer)], { type: contentType });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        // Add audio element to DOM for testing tools to detect
        audio.style.display = 'none';
        audio.setAttribute('data-testid', 'tts-audio-element');
        document.body.appendChild(audio);

        // Set up audio event listeners
        audio.addEventListener('loadedmetadata', () => {
          setDuration(audio.duration);
        });

        audio.addEventListener('timeupdate', () => {
          setCurrentPosition(audio.currentTime);
          const progress = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
          setChunkProgress(progress);
        });

        audio.addEventListener('play', () => {
          setIsPlaying(true);
          setIsLoading(false);
        });

        audio.addEventListener('pause', () => {
          setIsPlaying(false);
        });

        audio.addEventListener('ended', () => {
          setIsPlaying(false);
          setCurrentPosition(0);
          URL.revokeObjectURL(audioUrl);
          cleanupAudio();
        });

        audio.addEventListener('error', (e) => {
          console.error('Audio playback error:', e);
          const audioError = audio.error;
          let errorMessage = 'Fel vid uppspelning av ljud';
          
          if (audioError) {
            switch (audioError.code) {
              case MediaError.MEDIA_ERR_ABORTED:
                errorMessage = 'Uppspelning avbröts';
                break;
              case MediaError.MEDIA_ERR_NETWORK:
                errorMessage = 'Nätverksfel vid uppspelning';
                break;
              case MediaError.MEDIA_ERR_DECODE:
                errorMessage = 'Fel vid avkodning av ljud';
                break;
              case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = 'Ljudformat stöds inte';
                break;
              default:
                errorMessage = `Uppspelningsfel: ${audioError.message || 'Okänt fel'}`;
            }
          }
          
          setError(errorMessage);
          setIsPlaying(false);
          setIsLoading(false);
          URL.revokeObjectURL(audioUrl);
          cleanupAudio();
        });

        // Start playback
        await audio.play();
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Okänt fel uppstod';
      setError(errorMessage);
      setIsPlaying(false);
      setIsLoading(false);
      console.error('TTS Error:', err);
      console.error('TTS Error details:', {
        message: errorMessage,
        originalError: err,
        text: cleanText(text).substring(0, 100)
      });
    }
  }, [settings, cleanText, playNextChunk]);

  const pause = useCallback(() => {
    // Check if we're using Web Speech API (dev bypass mode)
    const isDevBypass = !import.meta.env.PROD && localStorage.getItem('devBypass') === 'true';

    if (isDevBypass && window.speechSynthesis) {
      window.speechSynthesis.pause();
      console.log('⏸️ Web Speech TTS paused');
      return;
    }

    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, []);

  const resume = useCallback(() => {
    // Check if we're using Web Speech API (dev bypass mode)
    const isDevBypass = !import.meta.env.PROD && localStorage.getItem('devBypass') === 'true';

    if (isDevBypass && window.speechSynthesis) {
      window.speechSynthesis.resume();
      console.log('▶️ Web Speech TTS resumed');
      return;
    }

    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(err => {
        setError('Fel vid återupptagning av uppspelning');
        console.error('Resume error:', err);
      });
    }
  }, []);

  const stop = useCallback(() => {
    // Check if we're using Web Speech API (dev bypass mode)
    const isDevBypass = !import.meta.env.PROD && localStorage.getItem('devBypass') === 'true';

    if (isDevBypass && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setCurrentPosition(0);
      console.log('⏹️ Web Speech TTS stopped');
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentPosition(0);
      setIsPlaying(false);
    }
    cleanupAudio();
  }, [cleanupAudio]);

  return {
    isPlaying,
    isLoading,
    error,
    currentPosition,
    duration,
    currentChunk,
    totalChunks,
    chunkProgress,
    settings,
    availableVoices,
    play,
    pause,
    resume,
    stop,
    setSettings,
    fetchVoices
  };
}