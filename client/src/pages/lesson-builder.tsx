import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface LessonMoment {
  id: string;
  type: 'textruta' | 'pratbubbla' | 'memory' | 'korsord' | 'finns-ordklass' | 'fyll-mening' | 'dra-ord' | 'ordmoln' | 'sortera-korgar';
  title: string;
  order: number;
  config: any;
}

interface Lesson {
  id: string;
  wordClass: string;
  title: string;
  moments: LessonMoment[];
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

export default function LessonBuilder() {
  const [currentLesson, setCurrentLesson] = useState<Lesson>({
    id: '',
    wordClass: '',
    title: '',
    moments: []
  });
  
  const [draggedMoment, setDraggedMoment] = useState<string | null>(null);
  const [editingMoment, setEditingMoment] = useState<LessonMoment | null>(null);
  const [showMomentDialog, setShowMomentDialog] = useState(false);

  const addMoment = (type: string) => {
    const newMoment: LessonMoment = {
      id: `moment_${Date.now()}`,
      type: type as any,
      title: MOMENT_TYPES.find(t => t.id === type)?.name || '',
      order: currentLesson.moments.length,
      config: getDefaultConfig(type)
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
        return { text: '', targetWordClass: '', instruction: '' };
      case 'fyll-mening':
        return { sentence: '', blanks: [], options: [] };
      case 'dra-ord':
        return { words: [], targets: [] };
      case 'ordmoln':
        return { words: [], theme: '' };
      case 'sortera-korgar':
        return { words: [], categories: [] };
      default:
        return {};
    }
  };

  const handleDragStart = (e: React.DragEvent, momentId: string) => {
    setDraggedMoment(momentId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedMoment) return;

    const draggedIndex = currentLesson.moments.findIndex(m => m.id === draggedMoment);
    if (draggedIndex === -1) return;

    const newMoments = [...currentLesson.moments];
    const [draggedItem] = newMoments.splice(draggedIndex, 1);
    newMoments.splice(targetIndex, 0, draggedItem);

    // Update order
    newMoments.forEach((moment, index) => {
      moment.order = index;
    });

    setCurrentLesson({ ...currentLesson, moments: newMoments });
    setDraggedMoment(null);
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
              <Label>Figurbild (URL eller emoji)</Label>
              <Input
                value={moment.config.characterImage}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, characterImage: e.target.value })}
                placeholder="👨‍🏫 eller URL till bild"
              />
            </div>
            <div>
              <Label>Animationshastighet (ms per tecken)</Label>
              <Input
                type="number"
                value={moment.config.animationSpeed}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, animationSpeed: parseInt(e.target.value) })}
                placeholder="50"
              />
            </div>
          </div>
        );

      case 'memory':
        return (
          <div className="space-y-4">
            <div>
              <Label>Ordpar (ett par per rad, separerade med |)</Label>
              <Textarea
                value={moment.config.wordPairs.join('\n')}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, wordPairs: e.target.value.split('\n').filter(line => line.trim()) })}
                placeholder="hund|djur&#10;bil|fordon&#10;rött|färg"
                className="min-h-[120px]"
              />
            </div>
            <div>
              <Label>Svårighetsgrad</Label>
              <Select
                value={moment.config.difficulty}
                onValueChange={(value) => updateMomentConfig(moment.id, { ...moment.config, difficulty: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Lätt (4 par)</SelectItem>
                  <SelectItem value="medium">Medel (6 par)</SelectItem>
                  <SelectItem value="hard">Svår (8 par)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'finns-ordklass':
        return (
          <div className="space-y-4">
            <div>
              <Label>Text där ord ska hittas</Label>
              <Textarea
                value={moment.config.text}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, text: e.target.value })}
                placeholder="Katten satt på mattan och tittade ut genom fönstret."
                className="min-h-[120px]"
              />
            </div>
            <div>
              <Label>Målordklass</Label>
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
            <div>
              <Label>Instruktion</Label>
              <Input
                value={moment.config.instruction}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, instruction: e.target.value })}
                placeholder="Klicka på alla substantiv i texten"
              />
            </div>
          </div>
        );

      case 'fyll-mening':
        return (
          <div className="space-y-4">
            <div>
              <Label>Mening med [BLANK] för tomrum</Label>
              <Textarea
                value={moment.config.sentence}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, sentence: e.target.value })}
                placeholder="[BLANK] springer snabbt genom [BLANK]."
                className="min-h-[80px]"
              />
            </div>
            <div>
              <Label>Rätta svar (kommaseparerade)</Label>
              <Input
                value={moment.config.blanks.join(', ')}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, blanks: e.target.value.split(',').map(s => s.trim()) })}
                placeholder="Hunden, parken"
              />
            </div>
            <div>
              <Label>Distraktorer (extra alternativ)</Label>
              <Input
                value={moment.config.options.join(', ')}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, options: e.target.value.split(',').map(s => s.trim()) })}
                placeholder="katten, bilen, huset"
              />
            </div>
          </div>
        );

      case 'sortera-korgar':
        return (
          <div className="space-y-4">
            <div>
              <Label>Ord att sortera (kommaseparerade)</Label>
              <Textarea
                value={moment.config.words.join(', ')}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, words: e.target.value.split(',').map(s => s.trim()) })}
                placeholder="hund, springa, blå, snabbt, jag, under"
                className="min-h-[80px]"
              />
            </div>
            <div>
              <Label>Kategorier (kommaseparerade)</Label>
              <Input
                value={moment.config.categories.join(', ')}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, categories: e.target.value.split(',').map(s => s.trim()) })}
                placeholder="Substantiv, Verb, Adjektiv"
              />
            </div>
          </div>
        );

      default:
        return <p className="text-gray-500">Konfiguration för {moment.type} kommer snart...</p>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin">
                <Button variant="outline">← Tillbaka</Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Lektionsbyggare</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline">Förhandsgranska</Button>
              <Button>Spara lektion</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lesson Settings */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Lektionsinställningar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Ordklass</Label>
                  <Select
                    value={currentLesson.wordClass}
                    onValueChange={(value) => setCurrentLesson({ ...currentLesson, wordClass: value })}
                  >
                    <SelectTrigger>
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
                  <Label>Lektionstitel</Label>
                  <Input
                    value={currentLesson.title}
                    onChange={(e) => setCurrentLesson({ ...currentLesson, title: e.target.value })}
                    placeholder="T.ex. Substantiv - Grunderna"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Available Moments */}
            <Card>
              <CardHeader>
                <CardTitle>Tillgängliga moment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  {MOMENT_TYPES.map(momentType => (
                    <Button
                      key={momentType.id}
                      variant="outline"
                      onClick={() => addMoment(momentType.id)}
                      className="justify-start h-auto p-3 text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{momentType.icon}</span>
                        <div>
                          <div className="font-medium">{momentType.name}</div>
                          <div className="text-xs text-gray-500">{momentType.description}</div>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Lektionstidslinje</CardTitle>
              </CardHeader>
              <CardContent>
                {currentLesson.moments.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-4">📝</div>
                    <p>Börja bygga din lektion genom att lägga till moment från vänster panel</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentLesson.moments
                      .sort((a, b) => a.order - b.order)
                      .map((moment, index) => (
                        <div
                          key={moment.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, moment.id)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index)}
                          className="bg-white border-2 border-dashed border-gray-200 rounded-lg p-4 cursor-move hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Badge variant="secondary">{index + 1}</Badge>
                              <span className="text-2xl">
                                {MOMENT_TYPES.find(t => t.id === moment.type)?.icon}
                              </span>
                              <div>
                                <div className="font-medium">{moment.title}</div>
                                <div className="text-sm text-gray-500">
                                  {MOMENT_TYPES.find(t => t.id === moment.type)?.description}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    ⚙️ Konfigurera
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Konfigurera: {moment.title}</DialogTitle>
                                  </DialogHeader>
                                  <div className="mt-4">
                                    {renderMomentConfig(moment)}
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => removeMoment(moment.id)}
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
      </div>
    </div>
  );
}