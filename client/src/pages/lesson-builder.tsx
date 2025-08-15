import { useState } from "react";
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
import { LessonTemplates } from "@/components/LessonTemplates";
import { LessonValidator } from "@/components/LessonValidator";

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
  const [showPreview, setShowPreview] = useState(false);
  const [currentPreviewMoment, setCurrentPreviewMoment] = useState(0);
  const [savedLessons, setSavedLessons] = useState<Lesson[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

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

  const duplicateMoment = (momentId: string) => {
    const momentToDuplicate = currentLesson.moments.find(m => m.id === momentId);
    if (!momentToDuplicate) return;

    const newMoment: LessonMoment = {
      ...momentToDuplicate,
      id: `moment_${Date.now()}`,
      title: `${momentToDuplicate.title} (kopia)`,
      order: currentLesson.moments.length
    };

    setCurrentLesson({
      ...currentLesson,
      moments: [...currentLesson.moments, newMoment]
    });
  };

  const saveLesson = () => {
    if (!currentLesson.title.trim()) {
      alert('Lektionen måste ha en titel');
      return;
    }

    const lessonToSave = {
      ...currentLesson,
      id: currentLesson.id || `lesson_${Date.now()}`
    };

    const saved = localStorage.getItem('saved-lessons');
    const existingLessons = saved ? JSON.parse(saved) : [];
    const existingIndex = existingLessons.findIndex((l: any) => l.id === lessonToSave.id);
    
    if (existingIndex >= 0) {
      existingLessons[existingIndex] = lessonToSave;
    } else {
      existingLessons.push(lessonToSave);
    }

    localStorage.setItem('saved-lessons', JSON.stringify(existingLessons));
    setSavedLessons(existingLessons);
    setCurrentLesson(lessonToSave);
    
    alert('Lektionen sparades!');
  };

  const loadFromTemplate = (template: any) => {
    const newLesson: Lesson = {
      id: `lesson_${Date.now()}`,
      title: template.name,
      wordClass: template.wordClass,
      moments: template.moments.map((moment: any, index: number) => ({
        id: `moment_${Date.now()}_${index}`,
        ...moment,
        order: index
      }))
    };

    setCurrentLesson(newLesson);
  };

  const newLesson = () => {
    if (currentLesson.moments.length > 0 && !confirm('Är du säker på att du vill skapa en ny lektion? Osparade ändringar går förlorade.')) {
      return;
    }
    setCurrentLesson({
      id: '',
      wordClass: '',
      title: '',
      moments: []
    });
  };

  const exportLesson = () => {
    const dataStr = JSON.stringify(currentLesson, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentLesson.title || 'lektion'}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
              <CharacterLibrary
                currentImage={moment.config.characterImage}
                onCharacterSelect={(imageUrl) => updateMomentConfig(moment.id, { ...moment.config, characterImage: imageUrl })}
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
              <Label>Minnespar - Lägg till ord</Label>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="text-sm">Första ordet</Label>
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
                  <Label className="text-sm">Andra ordet</Label>
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
              <Label>Ord som ska hittas (kommaseparerade)</Label>
              <Input
                value={(moment.config.targetWords || []).join(', ')}
                onChange={(e) => updateMomentConfig(moment.id, { 
                  ...moment.config, 
                  targetWords: e.target.value.split(',').map(w => w.trim()).filter(w => w)
                })}
                placeholder="katten, mattan, fisk"
              />
              <div className="text-xs text-gray-500 mt-1">
                Ange exakt vilka ord som ska klickas på (skiftlägeskänsligt)
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
              <Label>Instruktion till eleven</Label>
              <Input
                value={moment.config.instruction}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, instruction: e.target.value })}
                placeholder="Sortera orden i rätt korgar"
              />
            </div>
            <div>
              <Label>Ord att sortera (ett ord per rad eller kommaseparerat)</Label>
              <Textarea
                value={moment.config.words.join('\n')}
                onChange={(e) => {
                  const input = e.target.value;
                  let words: string[] = [];
                  
                  if (input.includes('\n')) {
                    words = input.split('\n').map(s => s.trim()).filter(w => w);
                  } else {
                    words = input.split(',').map(s => s.trim()).filter(w => w);
                  }
                  
                  updateMomentConfig(moment.id, { ...moment.config, words });
                }}
                placeholder="hund\nspringa\nblå\nsnabbt\njag\nunder"
                className="min-h-[80px]"
                style={{ whiteSpace: 'pre-wrap' }}
              />
            </div>
            <div>
              <Label>Kategorier/korgar (en kategori per rad eller kommaseparerat)</Label>
              <Textarea
                value={moment.config.categories.join('\n')}
                onChange={(e) => {
                  const input = e.target.value;
                  let categories: string[] = [];
                  
                  if (input.includes('\n')) {
                    categories = input.split('\n').map(s => s.trim()).filter(c => c);
                  } else {
                    categories = input.split(',').map(s => s.trim()).filter(c => c);
                  }
                  
                  updateMomentConfig(moment.id, { ...moment.config, categories });
                }}
                placeholder="Substantiv\nVerb\nAdjektiv"
                className="min-h-[60px]"
                style={{ whiteSpace: 'pre-wrap' }}
              />
            </div>
          </div>
        );

      case 'ordmoln':
        return (
          <div className="space-y-4">
            <div>
              <Label>Ord för ordmolnet (ett ord per rad eller kommaseparerat)</Label>
              <Textarea
                value={moment.config.words.join('\n')}
                onChange={(e) => {
                  // Support both newline and comma separation
                  const input = e.target.value;
                  let words: string[] = [];
                  
                  if (input.includes('\n')) {
                    words = input.split('\n').map(s => s.trim()).filter(w => w);
                  } else {
                    words = input.split(',').map(s => s.trim()).filter(w => w);
                  }
                  
                  updateMomentConfig(moment.id, { ...moment.config, words });
                }}
                placeholder="substantiv\ndjur\nhus\nbil\nkatt\nhund\nbok\nstol"
                className="min-h-[120px]"
                style={{ whiteSpace: 'pre-wrap' }}
              />
              <div className="text-xs text-gray-500 mt-1">
                Ett ord per rad eller separera med komma
              </div>
            </div>
            <div>
              <Label>Tema/kategori</Label>
              <Input
                value={moment.config.theme}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, theme: e.target.value })}
                placeholder="T.ex. Substantiv, Djur, Föremål"
              />
            </div>
            <div>
              <Label>Storlek</Label>
              <Select
                value={moment.config.size}
                onValueChange={(value) => updateMomentConfig(moment.id, { ...moment.config, size: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Liten</SelectItem>
                  <SelectItem value="medium">Medel</SelectItem>
                  <SelectItem value="large">Stor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'korsord':
        return (
          <div className="space-y-4">
            <div>
              <Label>Korsordsfrågor (fråga|svar, en per rad)</Label>
              <Textarea
                value={moment.config.clues.map((clue: any) => `${clue.question}|${clue.answer}`).join('\n')}
                onChange={(e) => {
                  const clues = e.target.value.split('\n').filter(line => line.trim()).map(line => {
                    const [question, answer] = line.split('|');
                    return { question: question?.trim() || '', answer: answer?.trim() || '' };
                  });
                  updateMomentConfig(moment.id, { ...moment.config, clues });
                }}
                placeholder="Ett djur som säger vov|HUND\nNågot man kör|BIL\nEn färg som blod|RÖD"
                className="min-h-[120px]"
                style={{ whiteSpace: 'pre-wrap' }}
              />
              <div className="text-xs text-gray-500 mt-1">
                Tryck Enter för ny rad. Format: fråga|SVAR (svaret med versaler)
              </div>
            </div>
            
            {moment.config.clues && moment.config.clues.length > 0 && (
              <div className="mt-6">
                <CrosswordBuilder
                  clues={moment.config.clues}
                  onGridUpdate={(grid) => updateMomentConfig(moment.id, { ...moment.config, grid })}
                  initialGrid={moment.config.grid || []}
                />
              </div>
            )}
          </div>
        );

      case 'dra-ord':
        return (
          <div className="space-y-4">
            <div>
              <Label>Ord att dra (ett ord per rad eller kommaseparerat)</Label>
              <Textarea
                value={moment.config.words.join('\n')}
                onChange={(e) => {
                  const input = e.target.value;
                  let words: string[] = [];
                  
                  if (input.includes('\n')) {
                    words = input.split('\n').map(s => s.trim()).filter(w => w);
                  } else {
                    words = input.split(',').map(s => s.trim()).filter(w => w);
                  }
                  
                  updateMomentConfig(moment.id, { ...moment.config, words });
                }}
                placeholder="hund\nkatt\nbil\nhus"
                className="min-h-[80px]"
                style={{ whiteSpace: 'pre-wrap' }}
              />
            </div>
            <div>
              <Label>Målområden (ett område per rad eller kommaseparerat)</Label>
              <Textarea
                value={moment.config.targets.join('\n')}
                onChange={(e) => {
                  const input = e.target.value;
                  let targets: string[] = [];
                  
                  if (input.includes('\n')) {
                    targets = input.split('\n').map(s => s.trim()).filter(t => t);
                  } else {
                    targets = input.split(',').map(s => s.trim()).filter(t => t);
                  }
                  
                  updateMomentConfig(moment.id, { ...moment.config, targets });
                }}
                placeholder="Djur\nFöremål\nFärger"
                className="min-h-[60px]"
                style={{ whiteSpace: 'pre-wrap' }}
              />
            </div>
          </div>
        );

      default:
        return <p className="text-gray-500">Konfiguration för {moment.type} kommer snart...</p>;
    }
  };

  const renderPreviewMoment = (moment: LessonMoment) => {
    switch(moment.type) {
      case 'textruta':
        return (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
              <p className="text-lg mb-6 leading-relaxed">{moment.config.text || 'Här kommer texten...'}</p>
              <Button>{moment.config.buttonText || 'Nästa'}</Button>
            </div>
          </div>
        );

      case 'pratbubbla':
        return (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-start space-x-4">
              <div className="text-6xl">
                {moment.config.characterImage || '👨‍🏫'}
              </div>
              <div className="bg-white border-2 border-gray-300 rounded-2xl p-6 relative">
                <div className="absolute -left-3 top-6 w-6 h-6 bg-white border-l-2 border-b-2 border-gray-300 transform rotate-45"></div>
                <p className="text-lg">{moment.config.text || 'Här kommer pratbubblan...'}</p>
              </div>
            </div>
          </div>
        );

      case 'memory':
        return (
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-xl font-bold mb-6">Memory - {moment.config.difficulty}</h3>
            <div className="grid grid-cols-4 gap-4">
              {Array.from({length: moment.config.difficulty === 'easy' ? 8 : moment.config.difficulty === 'medium' ? 12 : 16}).map((_, i) => (
                <div key={i} className="bg-blue-500 rounded-lg h-20 flex items-center justify-center text-white font-bold">
                  ?
                </div>
              ))}
            </div>
          </div>
        );

      case 'finns-ordklass':
        return (
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-xl font-bold mb-4">{moment.config.instruction || 'Klicka på orden'}</h3>
            <div className="bg-gray-50 border rounded-lg p-6">
              <p className="text-lg leading-relaxed">
                {(moment.config.text || 'Här kommer texten...').split(' ').map((word: string, i: number) => (
                  <span key={i} className="hover:bg-yellow-200 cursor-pointer px-1 py-0.5 rounded">
                    {word}{' '}
                  </span>
                ))}
              </p>
            </div>
          </div>
        );

      case 'sortera-korgar':
        return (
          <div className="max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-center mb-6">{moment.config.instruction || 'Sortera orden'}</h3>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold mb-4">Ord att sortera:</h4>
                <div className="flex flex-wrap gap-2">
                  {(moment.config.words || []).map((word: string, i: number) => (
                    <div key={i} className="bg-blue-500 text-white px-3 py-2 rounded cursor-move">
                      {word}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Korgar:</h4>
                <div className="space-y-3">
                  {(moment.config.categories || []).map((category: string, i: number) => (
                    <div key={i} className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-16">
                      <div className="font-medium text-gray-600">{category}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'ordmoln':
        return (
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-xl font-bold mb-6">Ordmoln: {moment.config.theme || 'Tema'}</h3>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-8 min-h-64 flex items-center justify-center">
              <div className="flex flex-wrap justify-center gap-3">
                {(moment.config.words || []).map((word: string, i: number) => (
                  <span 
                    key={i} 
                    className="bg-white border-2 border-blue-300 px-4 py-2 rounded-full font-semibold hover:bg-blue-100 cursor-pointer"
                    style={{fontSize: `${Math.random() * 8 + 12}px`}}
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'korsord':
        return (
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-xl font-bold mb-6">Korsord</h3>
            <div className="bg-white border rounded-lg p-6">
              <div className="grid grid-cols-10 gap-1 mb-6">
                {Array.from({length: 100}).map((_, i) => (
                  <div key={i} className="w-6 h-6 border border-gray-300 bg-gray-50"></div>
                ))}
              </div>
              <div className="text-left">
                <h4 className="font-semibold mb-2">Ledtrådar:</h4>
                {(moment.config.clues || []).map((clue: any, i: number) => (
                  <div key={i} className="text-sm mb-1">
                    {i + 1}. {clue.question}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-4">🚧</div>
            <p>Förhandsvisning för {moment.title} kommer snart</p>
          </div>
        );
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
              <Button 
                variant="outline" 
                onClick={() => setShowPreview(true)}
                disabled={currentLesson.moments.length === 0}
              >
                👁️ Förhandsgranska
              </Button>
              <div className="flex space-x-2">
                <LessonTemplates onSelectTemplate={loadFromTemplate} />
                <Button variant="outline" onClick={newLesson}>🆕 Ny</Button>
                <Button variant="outline" onClick={() => setShowValidation(!showValidation)}>
                  ✅ Validera
                </Button>
                <Button onClick={saveLesson}>💾 Spara</Button>
                <Button variant="outline" onClick={exportLesson}>📤 Exportera</Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Validation Panel */}
        {showValidation && (
          <div className="mb-6">
            <LessonValidator lesson={currentLesson} />
          </div>
        )}
        
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
                
                {currentLesson.moments.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Moment:</span>
                      <span>{currentLesson.moments.length}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Beräknad tid:</span>
                      <span>{Math.max(5, currentLesson.moments.length * 3)} min</span>
                    </div>
                  </div>
                )}
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
                    <h3 className="text-lg font-medium mb-2">Skapa din första lektion</h3>
                    <p className="mb-4">Välj moment från vänstra menyn eller använd en färdig mall</p>
                    <div className="flex justify-center space-x-4">
                      <LessonTemplates onSelectTemplate={loadFromTemplate} />
                      <Button variant="outline" onClick={() => addMoment('pratbubbla')}>
                        💬 Börja med pratbubbla
                      </Button>
                    </div>

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
                                    <DialogDescription>
                                      Ställ in inställningar för detta moment
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="mt-4">
                                    {renderMomentConfig(moment)}
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => duplicateMoment(moment.id)}
                                title="Duplicera moment"
                              >
                                📋
                              </Button>
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

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Förhandsvisning: {currentLesson.title}</DialogTitle>
            <DialogDescription>
              Så här kommer lektionen att se ut för eleverna
            </DialogDescription>
          </DialogHeader>
          
          {currentLesson.moments.length > 0 && (
            <div className="space-y-6">
              {/* Progress bar */}
              <div className="flex items-center space-x-4">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${((currentPreviewMoment + 1) / currentLesson.moments.length) * 100}%`
                    }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600">
                  {currentPreviewMoment + 1} / {currentLesson.moments.length}
                </span>
              </div>

              {/* Current moment preview */}
              <div className="min-h-96 bg-gray-50 rounded-lg p-8">
                {currentLesson.moments[currentPreviewMoment] ? (
                  <InteractivePreview 
                    moment={currentLesson.moments[currentPreviewMoment]}
                    onNext={() => setCurrentPreviewMoment(Math.min(currentLesson.moments.length - 1, currentPreviewMoment + 1))}
                  />
                ) : (
                  <div className="text-center text-gray-500 py-12">
                    <div className="text-4xl mb-4">📝</div>
                    <p>Inget moment att visa</p>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPreviewMoment(Math.max(0, currentPreviewMoment - 1))}
                  disabled={currentPreviewMoment === 0}
                >
                  ← Föregående
                </Button>
                <Button
                  onClick={() => setCurrentPreviewMoment(Math.min(currentLesson.moments.length - 1, currentPreviewMoment + 1))}
                  disabled={currentPreviewMoment === currentLesson.moments.length - 1}
                >
                  Nästa →
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}