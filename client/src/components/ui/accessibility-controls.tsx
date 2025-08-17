import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Settings, Eye, Type, Palette, RotateCcw } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AccessibilitySettings {
  fontSize: number;
  lineHeight: number;
  fontFamily: 'standard' | 'dyslexia-friendly';
  contrast: 'normal' | 'high';
  backgroundColor: 'white' | 'beige' | 'light-gray';
  wordSpacing: number;
  letterSpacing: number;
}

const defaultSettings: AccessibilitySettings = {
  fontSize: 16,
  lineHeight: 1.5,
  fontFamily: 'standard',
  contrast: 'normal',
  backgroundColor: 'white',
  wordSpacing: 0,
  letterSpacing: 0,
};

export function AccessibilityControls() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('accessibility-settings');
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsedSettings });
      } catch (error) {
        console.error('Failed to parse accessibility settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage and apply them
  useEffect(() => {
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
    applySettings(settings);
  }, [settings]);

  const applySettings = (settings: AccessibilitySettings) => {
    const root = document.documentElement;
    
    // Apply font size
    root.style.setProperty('--accessibility-font-size', `${settings.fontSize}px`);
    
    // Apply line height
    root.style.setProperty('--accessibility-line-height', settings.lineHeight.toString());
    
    // Apply font family
    const fontFamily = settings.fontFamily === 'dyslexia-friendly' 
      ? '"OpenDyslexic", "Comic Sans MS", cursive, sans-serif'
      : 'system-ui, -apple-system, sans-serif';
    root.style.setProperty('--accessibility-font-family', fontFamily);
    
    // Apply word spacing
    root.style.setProperty('--accessibility-word-spacing', `${settings.wordSpacing}px`);
    
    // Apply letter spacing
    root.style.setProperty('--accessibility-letter-spacing', `${settings.letterSpacing}px`);
    
    // Apply background color
    const bgColors = {
      'white': '#ffffff',
      'beige': '#f5f5dc',
      'light-gray': '#f8f9fa'
    };
    root.style.setProperty('--accessibility-bg-color', bgColors[settings.backgroundColor]);
    
    // Apply contrast
    if (settings.contrast === 'high') {
      root.style.setProperty('--accessibility-text-color', '#000000');
      root.style.setProperty('--accessibility-border-color', '#000000');
    } else {
      root.style.setProperty('--accessibility-text-color', 'inherit');
      root.style.setProperty('--accessibility-border-color', 'inherit');
    }

    // Add accessibility class to body
    document.body.classList.toggle('accessibility-enhanced', 
      settings.fontSize !== defaultSettings.fontSize ||
      settings.lineHeight !== defaultSettings.lineHeight ||
      settings.fontFamily !== defaultSettings.fontFamily ||
      settings.contrast !== defaultSettings.contrast ||
      settings.backgroundColor !== defaultSettings.backgroundColor ||
      settings.wordSpacing !== defaultSettings.wordSpacing ||
      settings.letterSpacing !== defaultSettings.letterSpacing
    );
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('accessibility-settings');
  };

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const isModified = JSON.stringify(settings) !== JSON.stringify(defaultSettings);

  return (
    <div className="fixed top-4 right-4 z-50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-background border-2 shadow-lg hover:shadow-xl transition-all"
            data-testid="button-accessibility-toggle"
          >
            <Settings className="w-4 h-4 mr-2" />
            Tillgänglighet
            {isModified && (
              <Badge variant="secondary" className="ml-2 w-2 h-2 p-0 rounded-full bg-blue-500" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2">
          <Card className="w-80 bg-background border-2 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Tillgänglighetsinställningar
              </CardTitle>
              <CardDescription>
                Anpassa texten för bättre läsbarhet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Font Size */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  <Label className="text-sm font-medium">
                    Textstorlek: {settings.fontSize}px
                  </Label>
                </div>
                <Slider
                  value={[settings.fontSize]}
                  onValueChange={([value]) => updateSetting('fontSize', value)}
                  min={12}
                  max={24}
                  step={1}
                  className="w-full"
                  data-testid="slider-font-size"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Liten</span>
                  <span>Normal</span>
                  <span>Stor</span>
                </div>
              </div>

              {/* Line Height */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Radavstånd: {settings.lineHeight}
                </Label>
                <Slider
                  value={[settings.lineHeight]}
                  onValueChange={([value]) => updateSetting('lineHeight', value)}
                  min={1.0}
                  max={2.5}
                  step={0.1}
                  className="w-full"
                  data-testid="slider-line-height"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Tätt</span>
                  <span>Normal</span>
                  <span>Luftigt</span>
                </div>
              </div>

              {/* Word Spacing */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Ordavstånd: {settings.wordSpacing}px
                </Label>
                <Slider
                  value={[settings.wordSpacing]}
                  onValueChange={([value]) => updateSetting('wordSpacing', value)}
                  min={0}
                  max={8}
                  step={1}
                  className="w-full"
                  data-testid="slider-word-spacing"
                />
              </div>

              {/* Letter Spacing */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Teckenavstånd: {settings.letterSpacing}px
                </Label>
                <Slider
                  value={[settings.letterSpacing]}
                  onValueChange={([value]) => updateSetting('letterSpacing', value)}
                  min={0}
                  max={4}
                  step={0.5}
                  className="w-full"
                  data-testid="slider-letter-spacing"
                />
              </div>

              {/* Font Family */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Teckensnitt</Label>
                <Select
                  value={settings.fontFamily}
                  onValueChange={(value: AccessibilitySettings['fontFamily']) => 
                    updateSetting('fontFamily', value)
                  }
                >
                  <SelectTrigger data-testid="select-font-family">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="dyslexia-friendly">Dyslexivänligt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Background Color */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  <Label className="text-sm font-medium">Bakgrundsfärg</Label>
                </div>
                <Select
                  value={settings.backgroundColor}
                  onValueChange={(value: AccessibilitySettings['backgroundColor']) => 
                    updateSetting('backgroundColor', value)
                  }
                >
                  <SelectTrigger data-testid="select-background-color">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="white">Vit</SelectItem>
                    <SelectItem value="beige">Beige</SelectItem>
                    <SelectItem value="light-gray">Ljusgrå</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* High Contrast */}
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Hög kontrast</Label>
                <Switch
                  checked={settings.contrast === 'high'}
                  onCheckedChange={(checked) => 
                    updateSetting('contrast', checked ? 'high' : 'normal')
                  }
                  data-testid="switch-high-contrast"
                />
              </div>

              {/* Reset Button */}
              {isModified && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetSettings}
                  className="w-full"
                  data-testid="button-reset-accessibility"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Återställ till standard
                </Button>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}