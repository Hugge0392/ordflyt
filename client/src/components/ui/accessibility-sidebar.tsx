import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Settings, Eye, Type, Palette, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";

interface AccessibilitySettings {
  fontSize: number;
  lineHeight: number;
  fontFamily: 'standard' | 'dyslexia-friendly';
  contrast: 'normal' | 'high';
  backgroundColor: 'white' | 'beige' | 'light-gray' | 'black-white' | 'black-light-red' | 'yellow-blue' | 'black-light-blue';
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

interface AccessibilitySidebarProps {
  onToggle?: (isOpen: boolean) => void;
}

export function AccessibilitySidebar({ onToggle }: AccessibilitySidebarProps = {}) {
  const [isOpen, setIsOpen] = useState(true);
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
    
    // Load sidebar state
    const sidebarOpen = localStorage.getItem('accessibility-sidebar-open');
    if (sidebarOpen !== null) {
      setIsOpen(JSON.parse(sidebarOpen));
    }
  }, []);

  // Save settings to localStorage and apply them
  useEffect(() => {
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
    localStorage.setItem('accessibility-sidebar-open', JSON.stringify(isOpen));
    applySettings(settings);
    onToggle?.(isOpen);
  }, [settings, isOpen, onToggle]);

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
    
    // Apply background and text colors
    const colorSchemes = {
      'white': { bg: '#ffffff', text: '#000000' },
      'beige': { bg: '#f5f5dc', text: '#000000' },
      'light-gray': { bg: '#f8f9fa', text: '#000000' },
      'black-white': { bg: '#000000', text: '#ffffff' },
      'black-light-red': { bg: '#ffcccb', text: '#000000' },
      'yellow-blue': { bg: '#0066cc', text: '#ffff99' },
      'black-light-blue': { bg: '#add8e6', text: '#000000' }
    };
    const scheme = colorSchemes[settings.backgroundColor];
    root.style.setProperty('--accessibility-bg-color', scheme.bg);
    root.style.setProperty('--accessibility-text-color', scheme.text);
    
    // Apply contrast (only affects border, text color is set by color scheme)
    if (settings.contrast === 'high') {
      root.style.setProperty('--accessibility-border-color', scheme.text);
    } else {
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
    <>
      {/* Toggle Button - Only show when closed */}
      {!isOpen && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50"
          data-testid="button-accessibility-toggle"
        >
          <ChevronRight className="w-4 h-4" />
          <span className="ml-2">Tillgänglighet</span>
          {isModified && (
            <Badge variant="secondary" className="ml-2 w-2 h-2 p-0 rounded-full bg-blue-500" />
          )}
        </Button>
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-background border-r border-border z-40 transform transition-transform duration-300 overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 space-y-6">
          <div className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Tillgänglighetsinställningar</h2>
                {isModified && (
                  <Badge variant="secondary" className="w-2 h-2 p-0 rounded-full bg-blue-500" />
                )}
              </div>
              {/* Close button inside sidebar */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="p-1 h-auto"
                data-testid="button-accessibility-close"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Anpassa texten för bättre läsbarhet
            </p>
          </div>

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
                <SelectItem value="black-white">Svart bakgrund, vit text</SelectItem>
                <SelectItem value="black-light-red">Svart text på ljusröd bakgrund</SelectItem>
                <SelectItem value="yellow-blue">Ljusgul text på blå bakgrund</SelectItem>
                <SelectItem value="black-light-blue">Svart text på ljusblå bakgrund</SelectItem>
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
        </div>
      </div>

      {/* Overlay when sidebar is open on smaller screens */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}