import { Play, Pause, Square, Volume2, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useEffect } from 'react';

interface TextToSpeechControlsProps {
  text: string;
  className?: string;
  variant?: 'default' | 'minimal';
  accessibilityStyles?: React.CSSProperties;
}

export function TextToSpeechControls({
  text,
  className = '',
  variant = 'default',
  accessibilityStyles = {}
}: TextToSpeechControlsProps) {
  const {
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
  } = useTextToSpeech();

  useEffect(() => {
    fetchVoices();
  }, [fetchVoices]);

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else if (currentPosition > 0 && duration > 0) {
      resume();
    } else {
      play(text);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentPosition / duration) * 100 : 0;

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          onClick={handlePlayPause}
          disabled={isLoading || !text.trim()}
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0"
          data-testid="button-tts-play-pause"
          style={accessibilityStyles}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        {error && (
          <span className="text-xs text-red-500" title={error}>
            ⚠️
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`} style={accessibilityStyles}>
      {/* Main controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePlayPause}
            disabled={isLoading || !text.trim()}
            size="sm"
            variant="outline"
            data-testid="button-tts-play-pause"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4 mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isLoading ? 'Laddar...' : isPlaying ? 'Pausa' : 'Spela upp'}
          </Button>
          
          <Button
            onClick={stop}
            disabled={!isPlaying && currentPosition === 0}
            size="sm"
            variant="outline"
            data-testid="button-tts-stop"
          >
            <Square className="h-4 w-4 mr-2" />
            Stopp
          </Button>
        </div>

        {/* Settings */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              data-testid="button-tts-settings"
            >
              <Settings className="h-4 w-4 mr-2" />
              Inställningar
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Röstinställningar</h4>
              
              {/* Voice selection */}
              <div className="space-y-2">
                <Label htmlFor="voice-select" className="text-sm">Röst</Label>
                <Select
                  value={settings.voice}
                  onValueChange={(value) => setSettings({ voice: value })}
                >
                  <SelectTrigger id="voice-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVoices.map((voice) => (
                      <SelectItem key={voice.name} value={voice.name}>
                        {voice.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rate */}
              <div className="space-y-2">
                <Label className="text-sm">Hastighet</Label>
                <Select
                  value={settings.rate}
                  onValueChange={(value) => setSettings({ rate: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="x-slow">Mycket långsam</SelectItem>
                    <SelectItem value="slow">Långsam</SelectItem>
                    <SelectItem value="medium">Normal</SelectItem>
                    <SelectItem value="fast">Snabb</SelectItem>
                    <SelectItem value="x-fast">Mycket snabb</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Pitch */}
              <div className="space-y-2">
                <Label className="text-sm">Tonhöjd</Label>
                <Select
                  value={settings.pitch}
                  onValueChange={(value) => setSettings({ pitch: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="x-low">Mycket låg</SelectItem>
                    <SelectItem value="low">Låg</SelectItem>
                    <SelectItem value="medium">Normal</SelectItem>
                    <SelectItem value="high">Hög</SelectItem>
                    <SelectItem value="x-high">Mycket hög</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Progress bar and time */}
      {(isPlaying || currentPosition > 0) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span>{formatTime(currentPosition)}</span>
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
              <div 
                className="bg-blue-500 h-1 rounded-full transition-all duration-200"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            <span>Fel: {error}</span>
          </div>
        </div>
      )}
    </div>
  );
}