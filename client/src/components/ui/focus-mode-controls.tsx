import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';

interface FocusSettings {
  fontSize: number;
  lineHeight: number;
}

const defaultSettings: FocusSettings = {
  fontSize: 40,
  lineHeight: 1.5,
};

export function FocusModeControls() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<FocusSettings>(defaultSettings);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('focus-mode-settings');
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsedSettings });
      } catch (error) {
        console.error('Failed to parse focus mode settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage and apply them
  useEffect(() => {
    localStorage.setItem('focus-mode-settings', JSON.stringify(settings));
    applySettings(settings);
  }, [settings]);

  const applySettings = (settings: FocusSettings) => {
    const root = document.documentElement;
    
    // Apply focus mode CSS variables
    root.style.setProperty('--focus-font-size', `${settings.fontSize}px`);
    root.style.setProperty('--focus-line-height', settings.lineHeight.toString());
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('focus-mode-settings');
  };

  const updateSetting = <K extends keyof FocusSettings>(
    key: K,
    value: FocusSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const isModified = JSON.stringify(settings) !== JSON.stringify(defaultSettings);

  return (
    <div className="fixed top-4 left-4 z-[9999]">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-background border-2 shadow-lg hover:shadow-xl transition-all"
            data-testid="button-focus-controls-toggle"
          >
            <Settings className="w-4 h-4 mr-2" />
            Fokusläge
            {isModified && (
              <Badge variant="secondary" className="ml-2 w-2 h-2 p-0 rounded-full bg-blue-500" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2">
          <div className="bg-background border-2 rounded-lg shadow-xl p-4 w-80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Fokusläge Inställningar</h3>
              {isModified && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetSettings}
                  className="text-muted-foreground hover:text-foreground"
                  data-testid="button-focus-reset"
                >
                  Återställ
                </Button>
              )}
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <Label htmlFor="focus-font-size">
                Textstorlek: {settings.fontSize}px
              </Label>
              <Slider
                id="focus-font-size"
                min={16}
                max={72}
                step={2}
                value={[settings.fontSize]}
                onValueChange={(value) => updateSetting('fontSize', value[0])}
                className="w-full"
                data-testid="slider-focus-font-size"
              />
            </div>

            {/* Line Height */}
            <div className="space-y-2">
              <Label htmlFor="focus-line-height">
                Radavstånd: {settings.lineHeight}
              </Label>
              <Slider
                id="focus-line-height"
                min={1.0}
                max={3.0}
                step={0.1}
                value={[settings.lineHeight]}
                onValueChange={(value) => updateSetting('lineHeight', value[0])}
                className="w-full"
                data-testid="slider-focus-line-height"
              />
            </div>

            <div className="text-sm text-muted-foreground">
              Dessa inställningar gäller bara för fokusläge och påverkar inte normal läsning.
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}