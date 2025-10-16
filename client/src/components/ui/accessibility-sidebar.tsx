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
  backgroundColor: 'black-on-white' | 'light-gray-on-gray' | 'white-on-black' | 'black-on-light-yellow' | 'black-on-light-blue' | 'light-yellow-on-blue' | 'black-on-light-red';
}

const defaultSettings: AccessibilitySettings = {
  fontSize: 34,
  lineHeight: 1.5,
  fontFamily: 'standard',
  contrast: 'normal',
  backgroundColor: 'black-on-white',
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
        
        // Migrate old color scheme names to new ones
        const colorMigrations = {
          'white': 'black-on-white',
          'beige': 'black-on-white', // fallback to default
          'light-gray': 'black-on-white', // fallback to default
          'black-white': 'white-on-black',
          'black-light-red': 'black-on-light-red',
          'yellow-blue': 'light-yellow-on-blue',
          'black-light-blue': 'black-on-light-blue'
        };
        
        if (parsedSettings.backgroundColor && colorMigrations[parsedSettings.backgroundColor as keyof typeof colorMigrations]) {
          parsedSettings.backgroundColor = colorMigrations[parsedSettings.backgroundColor as keyof typeof colorMigrations];
        }
        
        setSettings({ ...defaultSettings, ...parsedSettings });
      } catch (error) {
        console.error('Failed to parse accessibility settings:', error);
        // Reset to default if parsing fails
        setSettings(defaultSettings);
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
    
    
    // Apply background and text colors
    const colorSchemes = {
      'black-on-white': { bg: '#FFFFFF', text: '#000000' },
      'light-gray-on-gray': { bg: '#595959', text: '#D9D9D9' },
      'white-on-black': { bg: '#000000', text: '#FFFFFF' },
      'black-on-light-yellow': { bg: '#FFFFCC', text: '#000000' },
      'black-on-light-blue': { bg: '#CCFFFF', text: '#000000' },
      'light-yellow-on-blue': { bg: '#003399', text: '#FFFFCC' },
      'black-on-light-red': { bg: '#FFCCCC', text: '#000000' }
    };
    const scheme = colorSchemes[settings.backgroundColor] || colorSchemes['black-on-white'];
    root.style.setProperty('--accessibility-bg-color', scheme.bg);
    root.style.setProperty('--accessibility-text-color', scheme.text);
    
    // Apply contrast (only affects border, text color is set by color scheme)
    if (settings.contrast === 'high') {
      root.style.setProperty('--accessibility-border-color', scheme.text);
    } else {
      root.style.setProperty('--accessibility-border-color', 'inherit');
    }

    // Add accessibility class to reading content only
    const readingContent = document.querySelector('.reading-content');
    if (readingContent) {
      readingContent.classList.toggle('accessibility-enhanced', 
        settings.fontSize !== defaultSettings.fontSize ||
        settings.lineHeight !== defaultSettings.lineHeight ||
        settings.fontFamily !== defaultSettings.fontFamily ||
        settings.contrast !== defaultSettings.contrast ||
        settings.backgroundColor !== defaultSettings.backgroundColor
      );
    }
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
          className="fixed top-4 left-4 z-50 bg-white/95 backdrop-blur-sm shadow-lg border-gray-200 hover:bg-white hover:shadow-xl transition-all duration-200"
          data-testid="button-accessibility-toggle"
        >
          <Eye className="w-4 h-4" />
          <span className="ml-2 font-medium">Tillgänglighet</span>
          {isModified && (
            <Badge variant="secondary" className="ml-2 w-2 h-2 p-0 rounded-full bg-blue-500 animate-pulse" />
          )}
        </Button>
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-white/98 dark:bg-gray-900/98 backdrop-blur-sm border-r border-gray-200 dark:border-gray-700 z-40 transform transition-all duration-300 ease-out overflow-y-auto shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 space-y-8">
          <div className="pt-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tillgänglighet</h2>
                  {isModified && (
                    <Badge variant="secondary" className="mt-1 text-xs px-2 py-1 bg-blue-100 text-blue-700 border-blue-200">
                      Anpassat
                    </Badge>
                  )}
                </div>
              </div>
              {/* Close button inside sidebar */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="p-2 h-auto rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                data-testid="button-accessibility-close"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Anpassa texten för optimal läsbarhet och komfort
            </p>
          </div>

          {/* Font Size */}
          <div className="space-y-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-green-100 dark:bg-green-900/30">
                <Type className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                  Textstorlek
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">{settings.fontSize}px</p>
              </div>
            </div>
            <Slider
              value={[settings.fontSize]}
              onValueChange={([value]) => updateSetting('fontSize', value)}
              min={16}
              max={60}
              step={2}
              className="w-full"
              data-testid="slider-font-size"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                Liten
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                Normal
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                Stor
              </span>
            </div>
          </div>

          {/* Line Height */}
          <div className="space-y-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                  Radavstånd
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">{settings.lineHeight.toFixed(1)}</p>
              </div>
            </div>
            <Slider
              value={[settings.lineHeight]}
              onValueChange={([value]) => updateSetting('lineHeight', value)}
              min={1.0}
              max={2.5}
              step={0.1}
              className="w-full"
              data-testid="slider-line-height"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-1 rounded bg-gray-300"></span>
                Tätt
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-gray-400"></span>
                Normal
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-3 rounded bg-gray-500"></span>
                Luftigt
              </span>
            </div>
          </div>


          {/* Font Family */}
          <div className="space-y-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-orange-100 dark:bg-orange-900/30">
                <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <Label className="text-sm font-semibold text-gray-900 dark:text-white">Teckensnitt</Label>
            </div>
            <Select
              value={settings.fontFamily}
              onValueChange={(value: AccessibilitySettings['fontFamily']) => 
                updateSetting('fontFamily', value)
              }
            >
              <SelectTrigger data-testid="select-font-family" className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="dyslexia-friendly">Dyslexivänligt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Background Color */}
          <div className="space-y-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-pink-100 dark:bg-pink-900/30">
                <Palette className="w-4 h-4 text-pink-600 dark:text-pink-400" />
              </div>
              <Label className="text-sm font-semibold text-gray-900 dark:text-white">Bakgrundsfärg</Label>
            </div>
            <Select
              value={settings.backgroundColor}
              onValueChange={(value: AccessibilitySettings['backgroundColor']) => 
                updateSetting('backgroundColor', value)
              }
            >
              <SelectTrigger data-testid="select-background-color" className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="black-on-white">Svart på vitt (standard)</SelectItem>
                <SelectItem value="light-gray-on-gray">Ljusgrå på grå</SelectItem>
                <SelectItem value="white-on-black">Vit på svart</SelectItem>
                <SelectItem value="black-on-light-yellow">Svart på ljusgul</SelectItem>
                <SelectItem value="black-on-light-blue">Svart på ljusblå</SelectItem>
                <SelectItem value="light-yellow-on-blue">Ljusgul på blå</SelectItem>
                <SelectItem value="black-on-light-red">Svart på ljusröd</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* High Contrast */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-indigo-100 dark:bg-indigo-900/30">
                <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-900 dark:text-white">Hög kontrast</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">För bättre synbarhet</p>
              </div>
            </div>
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
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                size="sm"
                onClick={resetSettings}
                className="w-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 transition-all duration-200"
                data-testid="button-reset-accessibility"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Återställ till standard
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay when sidebar is open on smaller screens */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden transition-all duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}