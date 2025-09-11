import { useState, useRef, useCallback } from 'react';

interface TTSSettings {
  voice: string;
  rate: string;
  pitch: string;
}

interface UseTextToSpeechReturn {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  currentPosition: number;
  duration: number;
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
  const [availableVoices, setAvailableVoices] = useState(DEFAULT_VOICES);
  const [settings, setSettingsState] = useState<TTSSettings>({
    voice: "sv-SE-MattiasNeural",
    rate: "medium",
    pitch: "medium"
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTextRef = useRef<string>("");

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

  const play = useCallback(async (text: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Stop current audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const cleanedText = cleanText(text);
      currentTextRef.current = cleanedText;

      if (!cleanedText.trim()) {
        throw new Error('Ingen text att läsa upp');
      }

      // Request TTS synthesis
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
      const audioBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Set up audio event listeners
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });

      audio.addEventListener('timeupdate', () => {
        setCurrentPosition(audio.currentTime);
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
      });

      // Start playback
      await audio.play();

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
  }, [settings, cleanText]);

  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(err => {
        setError('Fel vid återupptagning av uppspelning');
        console.error('Resume error:', err);
      });
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentPosition(0);
      setIsPlaying(false);
    }
  }, []);

  return {
    isPlaying,
    isLoading,
    error,
    currentPosition,
    duration,
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