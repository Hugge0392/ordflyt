import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ImageUploader } from "@/components/ImageUploader";
import { InteractivePreview } from "@/components/InteractivePreview";
import { CrosswordBuilder } from "@/components/CrosswordBuilder";
import { CharacterLibrary } from "@/components/CharacterLibrary";

interface LessonMoment {
  id: string;
  type: 'textruta' | 'pratbubbla' | 'memory' | 'korsord' | 'finns-ordklass' | 'fyll-mening' | 'dra-ord' | 'ordmoln' | 'sortera-korgar';
  title: string;
  order: number;
  config: any;
  style?: {
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
    backgroundImage?: string;
  };
}

interface Lesson {
  id: string;
  wordClass: string;
  title: string;
  description: string;
  moments: LessonMoment[];
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    backgroundImage?: string;
  };
}

const MOMENT_TYPES = [
  { id: 'textruta', name: 'Textruta', icon: '📝', description: 'Enkel text med fortsätt-knapp' },
  { id: 'pratbubbla', name: 'Pratbubbla', icon: '💬', description: 'Text som genereras fram med figur' },
  { id: 'memory', name: 'Memory', icon: '🃏', description: 'Minnesspel med matchande ord' },
  { id: 'korsord', name: 'Korsord', icon: '🔤', description: 'Korsord med ordklassfrågor' },
  { id: 'finns-ordklass', name: 'Finns ordklass i text', icon: '🔍', description: 'Klicka på ord av viss ordklass' },
  { id: 'fyll-mening', name: 'Fyll i meningen', icon: '✍️', description: 'Dra ord till rätt plats' },
  { id: 'dra-ord', name: 'Dra ord', icon: '↔️', description: 'Dra och släpp övning' },
  { id: 'ordmoln', name: 'Ordmoln', icon: '☁️', description: 'Interaktivt ordmoln' },
  { id: 'sortera-korgar', name: 'Sortera i korgar', icon: '🗂️', description: 'Sortera ord i olika kategorier' }
];

const WORD_CLASSES = [
  'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection', 'numeral'
];

const THEMES = [
  { id: 'default', name: 'Standard', primary: '#3b82f6', secondary: '#e5e7eb' },
  { id: 'pirate', name: 'Pirat', primary: '#dc2626', secondary: '#fef3c7' },
  { id: 'nature', name: 'Natur', primary: '#16a34a', secondary: '#dcfce7' },
  { id: 'ocean', name: 'Hav', primary: '#0ea5e9', secondary: '#e0f2fe' },
  { id: 'sunset', name: 'Solnedgång', primary: '#f97316', secondary: '#fed7aa' },
  { id: 'forest', name: 'Skog', primary: '#15803d', secondary: '#f0fdf4' }
];

const FONT_FAMILIES = [
  { id: 'default', name: 'Standard', font: 'Inter, sans-serif' },
  { id: 'playful', name: 'Lekfull', font: 'Comic Sans MS, cursive' },
  { id: 'elegant', name: 'Elegant', font: 'Georgia, serif' },
  { id: 'modern', name: 'Modern', font: 'Helvetica, Arial, sans-serif' }
];

export default function LessonBuilder() {
  const [currentLesson, setCurrentLesson] = useState<Lesson>({
    id: '',
    wordClass: '',
    title: '',
    description: '',
    moments: [],
    theme: {
      primaryColor: '#3b82f6',
      secondaryColor: '#e5e7eb',
      fontFamily: 'Inter, sans-serif'
    }
  });
  
  const [draggedMoment, setDraggedMoment] = useState<string | null>(null);
  const [editingMoment, setEditingMoment] = useState<LessonMoment | null>(null);
  const [showMomentDialog, setShowMomentDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPreviewMoment, setCurrentPreviewMoment] = useState(0);
  const [showThemeDialog, setShowThemeDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'design'>('content');

  const addMoment = (type: string) => {
    const newMoment: LessonMoment = {
      id: `moment_${Date.now()}`,
      type: type as any,
      title: MOMENT_TYPES.find(t => t.id === type)?.name || '',
      order: currentLesson.moments.length,
      config: getDefaultConfig(type),
      style: {
        backgroundColor: currentLesson.theme?.secondaryColor || '#e5e7eb',
        textColor: '#1f2937',
        fontFamily: currentLesson.theme?.fontFamily || 'Inter, sans-serif'
      }
    };
    
    setCurrentLesson({
      ...currentLesson,
      moments: [...currentLesson.moments, newMoment]
    });
  };

  const getDefaultConfig = (type: string) => {
    switch(type) {
      case 'textruta':
        return { text: '', buttonText: 'Nästa' };
      case 'pratbubbla':
        return { text: '', characterImage: '', animationSpeed: 50 };
      case 'memory':
        return { wordPairs: [], difficulty: 'easy' };
      case 'korsord':
        return { clues: [], size: { width: 10, height: 10 } };
      case 'finns-ordklass':
        return { text: '', targetWordClass: '', instruction: '', targetWords: [] };
      case 'fyll-mening':
        return { sentence: '', blanks: [], options: [] };
      case 'dra-ord':
        return { words: [], targets: [] };
      case 'ordmoln':
        return { words: [], theme: '', size: 'medium' };
      case 'sortera-korgar':
        return { words: [], categories: [], instruction: '' };
      default:
        return {};
    }
  };

  const removeMoment = (momentId: string) => {
    setCurrentLesson({
      ...currentLesson,
      moments: currentLesson.moments.filter(m => m.id !== momentId)
    });
  };

  const updateMomentConfig = (momentId: string, config: any) => {
    setCurrentLesson({
      ...currentLesson,
      moments: currentLesson.moments.map(m => 
        m.id === momentId ? { ...m, config } : m
      )
    });
  };

  const updateLessonTheme = (updates: Partial<Lesson['theme']>) => {
    setCurrentLesson({
      ...currentLesson,
      theme: { 
        primaryColor: '#3b82f6',
        secondaryColor: '#e5e7eb',
        fontFamily: 'Inter, sans-serif',
        ...currentLesson.theme, 
        ...updates 
      }
    });
  };

  const renderMomentConfig = (moment: LessonMoment) => {
    switch(moment.type) {
      case 'textruta':
        return (
          <div className="space-y-4">
            <div>
              <Label>Text</Label>
              <Textarea
                value={moment.config.text}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, text: e.target.value })}
                placeholder="Skriv texten som ska visas..."
                className="min-h-[120px]"
              />
            </div>
            <div>
              <Label>Knapptext</Label>
              <Input
                value={moment.config.buttonText}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, buttonText: e.target.value })}
                placeholder="Nästa"
              />
            </div>
          </div>
        );

      case 'pratbubbla':
        return (
          <div className="space-y-4">
            <div>
              <Label>Text som ska "pratas"</Label>
              <Textarea
                value={moment.config.text}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, text: e.target.value })}
                placeholder="Hej! Jag ska hjälpa dig lära dig substantiv..."
                className="min-h-[120px]"
              />
            </div>
            <div>
              <CharacterLibrary
                currentImage={moment.config.characterImage}
                onCharacterSelect={(imageUrl) => updateMomentConfig(moment.id, { ...moment.config, characterImage: imageUrl })}
              />
            </div>
          </div>
        );

      case 'memory':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ord 1</Label>
                <Input
                  placeholder="t.ex. hund"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const word1 = e.currentTarget.value.trim();
                      const word2Input = e.currentTarget.parentElement?.parentElement?.querySelector('input:last-child') as HTMLInputElement;
                      const word2 = word2Input?.value.trim();
                      
                      if (word1 && word2) {
                        const newPairs = [...(moment.config.wordPairs || []), `${word1}|${word2}`];
                        updateMomentConfig(moment.id, { ...moment.config, wordPairs: newPairs });
                        e.currentTarget.value = '';
                        if (word2Input) word2Input.value = '';
                      }
                    }
                  }}
                />
              </div>
              <div>
                <Label>Ord 2</Label>
                <Input
                  placeholder="t.ex. djur"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const word2 = e.currentTarget.value.trim();
                      const word1Input = e.currentTarget.parentElement?.parentElement?.querySelector('input:first-child') as HTMLInputElement;
                      const word1 = word1Input?.value.trim();
                      
                      if (word1 && word2) {
                        const newPairs = [...(moment.config.wordPairs || []), `${word1}|${word2}`];
                        updateMomentConfig(moment.id, { ...moment.config, wordPairs: newPairs });
                        e.currentTarget.value = '';
                        if (word1Input) word1Input.value = '';
                      }
                    }
                  }}
                />
              </div>
            </div>
            
            <Button 
              onClick={() => {
                const word1Input = document.querySelector('input[placeholder="t.ex. hund"]') as HTMLInputElement;
                const word2Input = document.querySelector('input[placeholder="t.ex. djur"]') as HTMLInputElement;
                const word1 = word1Input?.value.trim();
                const word2 = word2Input?.value.trim();
                
                if (word1 && word2) {
                  const newPairs = [...(moment.config.wordPairs || []), `${word1}|${word2}`];
                  updateMomentConfig(moment.id, { ...moment.config, wordPairs: newPairs });
                  word1Input.value = '';
                  word2Input.value = '';
                }
              }}
              className="w-full mb-4"
            >
              Lägg till par
            </Button>
            
            <div className="border rounded-lg p-4 bg-gray-50">
              <Label className="text-sm font-medium">Skapade par:</Label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {(moment.config.wordPairs || []).map((pair: string, index: number) => {
                  const [word1, word2] = pair.split('|');
                  return (
                    <div key={index} className="flex justify-between items-center bg-white p-3 rounded border">
                      <span className="text-sm font-medium">{word1} ↔ {word2}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newPairs = moment.config.wordPairs.filter((_: string, i: number) => i !== index);
                          updateMomentConfig(moment.id, { ...moment.config, wordPairs: newPairs });
                        }}
                      >
                        Ta bort
                      </Button>
                    </div>
                  );
                })}
              </div>
              {(!moment.config.wordPairs || moment.config.wordPairs.length === 0) && (
                <div className="text-gray-400 text-sm mt-2 text-center py-4">Inga par skapade än. Fyll i båda fälten och klicka "Lägg till par".</div>
              )}
            </div>
          </div>
        );

      case 'finns-ordklass':
        return (
          <div className="space-y-4">
            <div>
              <Label>Instruktion</Label>
              <Input
                value={moment.config.instruction}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, instruction: e.target.value })}
                placeholder="Klicka på orden: katten, mattan, fisk"
              />
            </div>
            <div>
              <Label>Text med ord</Label>
              <Textarea
                value={moment.config.text}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, text: e.target.value })}
                placeholder="Katten sitter på mattan och äter fisk."
                className="min-h-[120px]"
              />
            </div>
            <div>
              <Label>Ord som ska hittas</Label>
              <Textarea
                value={(moment.config.targetWords || []).join('\n')}
                onChange={(e) => updateMomentConfig(moment.id, { 
                  ...moment.config, 
                  targetWords: e.target.value.split('\n').map(w => w.trim()).filter(w => w)
                })}
                placeholder="katten&#10;mattan&#10;fisk"
                className="min-h-[100px]"
              />
              <div className="text-xs text-gray-500 mt-1">
                Ange ett ord per rad. Exempel:<br/>
                katten<br/>
                mattan<br/>
                fisk
              </div>
            </div>
            <div>
              <Label>Ordklass (för feedback)</Label>
              <Select
                value={moment.config.targetWordClass}
                onValueChange={(value) => updateMomentConfig(moment.id, { ...moment.config, targetWordClass: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORD_CLASSES.map(wc => (
                    <SelectItem key={wc} value={wc}>{wc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return <p className="text-gray-500">Konfiguration för {moment.type} kommer snart...</p>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Sleek Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link href="/admin">
                <Button variant="outline" className="hover:bg-blue-50">← Tillbaka</Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Lektionsbyggare
                </h1>
                <p className="text-sm text-gray-600">Skapa engagerande interaktiva lektioner</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setShowPreview(true)}
                disabled={currentLesson.moments.length === 0}
                className="bg-blue-50 hover:bg-blue-100"
              >
                👁️ Förhandsgranska
              </Button>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg">
                💾 Spara lektion
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Quick Setup Card */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm shadow-xl border-0">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label className="text-base font-semibold text-gray-700">Ordklass</Label>
                <Select
                  value={currentLesson.wordClass}
                  onValueChange={(value) => setCurrentLesson({ ...currentLesson, wordClass: value })}
                >
                  <SelectTrigger className="mt-2 h-12">
                    <SelectValue placeholder="Välj ordklass" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORD_CLASSES.map(wc => (
                      <SelectItem key={wc} value={wc}>{wc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-base font-semibold text-gray-700">Lektionstitel</Label>
                <Input
                  value={currentLesson.title}
                  onChange={(e) => setCurrentLesson({ ...currentLesson, title: e.target.value })}
                  placeholder="T.ex. Substantiv - Grunderna"
                  className="mt-2 h-12"
                />
              </div>

              <div>
                <Label className="text-base font-semibold text-gray-700">Beskrivning</Label>
                <Input
                  value={currentLesson.description}
                  onChange={(e) => setCurrentLesson({ ...currentLesson, description: e.target.value })}
                  placeholder="En kort beskrivning av lektionen"
                  className="mt-2 h-12"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-white/50 p-1 rounded-lg">
            <Button
              variant={activeTab === 'content' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('content')}
              className={`flex-1 ${activeTab === 'content' ? 'bg-white shadow-md' : ''}`}
            >
              📝 Innehåll & Moment
            </Button>
            <Button
              variant={activeTab === 'design' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('design')}
              className={`flex-1 ${activeTab === 'design' ? 'bg-white shadow-md' : ''}`}
            >
              🎨 Design & Utseende
            </Button>
          </div>
        </div>

        {activeTab === 'content' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Content Section */}
            <div className="space-y-6">
              <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg">
                  <CardTitle className="text-gray-800">Lägg till moment</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 gap-3">
                    {MOMENT_TYPES.map(momentType => (
                      <Button
                        key={momentType.id}
                        variant="outline"
                        onClick={() => addMoment(momentType.id)}
                        className="flex items-center justify-start p-4 h-auto hover:bg-blue-50 border-2 hover:border-blue-200"
                      >
                        <span className="text-3xl mr-4">{momentType.icon}</span>
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-gray-800">{momentType.name}</div>
                          <div className="text-sm text-gray-600 mt-1">{momentType.description}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Timeline Section */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
                  <CardTitle className="text-gray-800">Lektionens tidslinje ({currentLesson.moments.length} moment)</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {currentLesson.moments.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <div className="text-6xl mb-4">📝</div>
                      <h3 className="text-xl font-semibold mb-2">Inga moment än</h3>
                      <p>Börja med att lägga till moment från panelen till vänster</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {currentLesson.moments
                        .sort((a, b) => a.order - b.order)
                        .map((moment, index) => (
                          <div
                            key={moment.id}
                            className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border-2 border-blue-100 hover:border-blue-200 transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                                  {index + 1}
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-800">
                                    {MOMENT_TYPES.find(t => t.id === moment.type)?.icon} {moment.title}
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    {MOMENT_TYPES.find(t => t.id === moment.type)?.description}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingMoment(moment)}
                                  className="hover:bg-blue-50"
                                >
                                  ⚙️ Redigera
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeMoment(moment.id)}
                                  className="hover:bg-red-50 hover:border-red-200"
                                >
                                  🗑️
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          // Design Tab
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 rounded-t-lg">
                <CardTitle className="text-gray-800">🎨 Tema & Färger</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <Label className="text-base font-semibold">Välj tema</Label>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {THEMES.map(theme => (
                      <Button
                        key={theme.id}
                        variant="outline"
                        onClick={() => updateLessonTheme({ primaryColor: theme.primary, secondaryColor: theme.secondary })}
                        className="h-20 flex flex-col items-center justify-center space-y-2 hover:scale-105 transition-transform"
                        style={{ 
                          backgroundColor: currentLesson.theme?.primaryColor === theme.primary ? theme.secondary : 'white',
                          borderColor: theme.primary
                        }}
                      >
                        <div 
                          className="w-8 h-8 rounded-full"
                          style={{ backgroundColor: theme.primary }}
                        ></div>
                        <span className="text-sm font-medium">{theme.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold">Primärfärg</Label>
                  <div className="flex items-center space-x-3 mt-2">
                    <input
                      type="color"
                      value={currentLesson.theme?.primaryColor || '#3b82f6'}
                      onChange={(e) => updateLessonTheme({ primaryColor: e.target.value })}
                      className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                    <Input
                      value={currentLesson.theme?.primaryColor || '#3b82f6'}
                      onChange={(e) => updateLessonTheme({ primaryColor: e.target.value })}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold">Sekundärfärg</Label>
                  <div className="flex items-center space-x-3 mt-2">
                    <input
                      type="color"
                      value={currentLesson.theme?.secondaryColor || '#e5e7eb'}
                      onChange={(e) => updateLessonTheme({ secondaryColor: e.target.value })}
                      className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                    <Input
                      value={currentLesson.theme?.secondaryColor || '#e5e7eb'}
                      onChange={(e) => updateLessonTheme({ secondaryColor: e.target.value })}
                      placeholder="#e5e7eb"
                      className="flex-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
                <CardTitle className="text-gray-800">✍️ Typografi</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <Label className="text-base font-semibold">Typsnitt</Label>
                  <div className="grid grid-cols-1 gap-3 mt-3">
                    {FONT_FAMILIES.map(font => (
                      <Button
                        key={font.id}
                        variant="outline"
                        onClick={() => updateLessonTheme({ fontFamily: font.font })}
                        className={`h-16 justify-start text-left px-4 ${
                          currentLesson.theme?.fontFamily === font.font ? 'bg-blue-50 border-blue-300' : ''
                        }`}
                        style={{ fontFamily: font.font }}
                      >
                        <div>
                          <div className="font-semibold">{font.name}</div>
                          <div className="text-sm text-gray-600">AaBbCc 123 åäö</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Förhandsgranska lektion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <InteractivePreview 
              moments={currentLesson.moments}
              currentMoment={currentPreviewMoment}
              onNext={() => setCurrentPreviewMoment(prev => Math.min(prev + 1, currentLesson.moments.length - 1))}
              onPrevious={() => setCurrentPreviewMoment(prev => Math.max(prev - 1, 0))}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Moment Modal */}
      {editingMoment && (
        <Dialog open={!!editingMoment} onOpenChange={() => setEditingMoment(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Redigera {editingMoment.title}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {renderMomentConfig(editingMoment)}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}