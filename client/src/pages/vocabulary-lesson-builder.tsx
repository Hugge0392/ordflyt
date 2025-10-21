import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CharacterLibrary } from "@/components/CharacterLibrary";
import { InteractivePreview } from "@/components/InteractivePreview";
import { BookOpen, Play, Save, Upload, Download, Plus, Trash2, GripVertical, ArrowLeft } from "lucide-react";

interface VocabularyMoment {
  id: string;
  type: 'textruta' | 'pratbubbla' | 'fyll-mening';
  title: string;
  order: number;
  config: any;
}

interface VocabularyLesson {
  id: string;
  category: string; // e.g., "djur", "mat", "känslor"
  title: string;
  background: string;
  moments: VocabularyMoment[];
}

const MOMENT_TYPES = [
  { id: 'textruta', name: 'Textruta', icon: '📝', description: 'Förklarande text med fortsätt-knapp' },
  { id: 'pratbubbla', name: 'Pratbubbla', icon: '💬', description: 'Dialog med figur och frågor' },
  { id: 'fyll-mening', name: 'Fyll i meningen', icon: '✍️', description: 'Övning där eleven fyller i rätt ord' },
];

const VOCABULARY_CATEGORIES = [
  'Djur', 'Mat och dryck', 'Känslor', 'Familj', 'Kroppen', 'Kläder', 'Naturen', 
  'I skolan', 'Hemma', 'På stan', 'Transportmedel', 'Väder', 'Färger', 'Siffror', 
  'Tid', 'Riktningar', 'Adjektiv', 'Verb - vanliga', 'Samhälle', 'Fritid', 'Allmänt'
];

export default function VocabularyLessonBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentLesson, setCurrentLesson] = useState<VocabularyLesson>({
    id: '',
    category: '',
    title: '',
    background: 'beach',
    moments: []
  });
  
  const [draggedMoment, setDraggedMoment] = useState<string | null>(null);
  const [editingMoment, setEditingMoment] = useState<VocabularyMoment | null>(null);
  const [showMomentDialog, setShowMomentDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPreviewMoment, setCurrentPreviewMoment] = useState(0);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishData, setPublishData] = useState({
    category: '',
    difficulty: 'medium',
    description: ''
  });
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  // Fetch lesson drafts
  const { data: savedLessons = [] } = useQuery<any[]>({
    queryKey: ['/api/vocabulary-lessons/drafts'],
  });
  
  // Fetch published lessons
  const { data: publishedLessons = [] } = useQuery<any[]>({
    queryKey: ['/api/vocabulary-lessons/published'],
  });

  // Save/update lesson draft mutations
  const saveLessonMutation = useMutation({
    mutationFn: async (lessonData: any) => {
      if (lessonData.id && lessonData.id.startsWith('vocab_lesson_')) {
        try {
          await apiRequest('GET', `/api/vocabulary-lessons/drafts/${lessonData.id}`);
          return await apiRequest('PUT', `/api/vocabulary-lessons/drafts/${lessonData.id}`, lessonData);
        } catch (error) {
          // Draft doesn't exist, create new one
        }
      }
      return await apiRequest('POST', '/api/vocabulary-lessons/drafts', lessonData);
    },
    onSuccess: (savedLesson) => {
      setCurrentLesson(savedLesson);
      queryClient.invalidateQueries({ queryKey: ['/api/vocabulary-lessons/drafts'] });
      toast({
        title: "Lektion sparad!",
        description: "Lektionen har sparats som utkast.",
      });
    },
    onError: (error) => {
      toast({
        title: "Sparning misslyckades",
        description: "Kunde inte spara lektionen. Försök igen.",
        variant: "destructive",
      });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      await apiRequest('DELETE', `/api/vocabulary-lessons/drafts/${lessonId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vocabulary-lessons/drafts'] });
      toast({
        title: "Lektion borttagen",
        description: "Lektionsutkastet har tagits bort.",
      });
    },
  });

  // Publish lesson mutation
  const publishLessonMutation = useMutation({
    mutationFn: async (lessonData: any) => {
      if (editingLessonId) {
        return await apiRequest('PUT', `/api/vocabulary-lessons/published/${editingLessonId}`, lessonData);
      } else {
        return await apiRequest('POST', '/api/vocabulary-lessons/publish', lessonData);
      }
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/vocabulary-lessons/published'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vocabulary-lessons/drafts'] });
      
      toast({
        title: editingLessonId ? "Lektion uppdaterad!" : "Lektion publicerad!",
        description: editingLessonId 
          ? "Lektionen har uppdaterats framgångsrikt." 
          : "Lektionen är nu tillgänglig för elever!",
      });
      
      setShowPublishDialog(false);
      setEditingLessonId(null);
      
      // Reset lesson
      setCurrentLesson({
        id: '',
        category: '',
        title: '',
        background: 'beach',
        moments: []
      });
      setPublishData({
        category: '',
        difficulty: 'medium',
        description: ''
      });
    },
    onError: (error) => {
      toast({
        title: editingLessonId ? "Uppdatering misslyckades" : "Publicering misslyckades",
        description: "Kunde inte publicera lektionen. Försök igen.",
        variant: "destructive",
      });
    },
  });

  const addMoment = (type: string) => {
    const newMoment: VocabularyMoment = {
      id: `moment_${Date.now()}`,
      type: type as any,
      title: MOMENT_TYPES.find(t => t.id === type)?.name || '',
      order: (currentLesson.moments || []).length,
      config: getDefaultConfig(type)
    };
    
    setCurrentLesson({
      ...currentLesson,
      moments: [...(currentLesson.moments || []), newMoment]
    });
  };

  const getDefaultConfig = (type: string) => {
    switch(type) {
      case 'textruta':
        return { text: '', buttonText: 'Nästa' };
      case 'pratbubbla':
        return { 
          characterImage: '', 
          animationSpeed: 50,
          items: [{ id: 'item-1', type: 'text', order: 1, content: '' }]
        };
      case 'fyll-mening':
        return { sentence: '', blanks: [], options: [] };
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

    newMoments.forEach((moment, index) => {
      moment.order = index;
    });

    setCurrentLesson({ ...currentLesson, moments: newMoments });
    setDraggedMoment(null);
  };

  const removeMoment = (momentId: string) => {
    setCurrentLesson({
      ...currentLesson,
      moments: (currentLesson.moments || []).filter(m => m.id !== momentId)
    });
  };

  const duplicateMoment = (momentId: string) => {
    const momentToDuplicate = currentLesson.moments.find(m => m.id === momentId);
    if (!momentToDuplicate) return;

    const newMoment: VocabularyMoment = {
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
      toast({
        title: "Titel saknas",
        description: "Lektionen måste ha en titel",
        variant: "destructive",
      });
      return;
    }

    const lessonToSave = {
      ...currentLesson,
      id: currentLesson.id || `vocab_lesson_${Date.now()}`,
      content: {
        title: currentLesson.title,
        moments: currentLesson.moments,
        category: currentLesson.category,
        background: currentLesson.background
      }
    };

    saveLessonMutation.mutate(lessonToSave);
  };

  const loadFromDraft = (draft: any) => {
    if (currentLesson.moments && currentLesson.moments.length > 0 && !confirm('Är du säker på att du vill ladda detta utkast? Osparade ändringar går förlorade.')) {
      return;
    }
    
    const loadedLesson: VocabularyLesson = {
      id: draft.id,
      title: draft.title,
      category: draft.category || '',
      background: draft.background || 'beach',
      moments: draft.content?.moments || []
    };

    setCurrentLesson(loadedLesson);
    setShowLoadDialog(false);
    
    toast({
      title: "Utkast laddat",
      description: `"${draft.title}" har laddats in i redigeraren.`,
    });
  };

  const deleteDraft = (draftId: string) => {
    if (confirm('Är du säker på att du vill ta bort detta utkast? Detta kan inte ångras.')) {
      deleteLessonMutation.mutate(draftId);
    }
  };

  const handlePublish = () => {
    if (!currentLesson.title.trim()) {
      toast({
        title: "Titel saknas",
        description: "Ge lektionen en titel innan du publicerar den.",
        variant: "destructive",
      });
      return;
    }

    if (!currentLesson.moments || currentLesson.moments.length === 0) {
      toast({
        title: "Inga moment",
        description: "Lägg till minst ett moment innan du publicerar lektionen.",
        variant: "destructive",
      });
      return;
    }

    setShowPublishDialog(true);
  };

  const confirmPublish = () => {
    if (!publishData.category) {
      toast({
        title: "Kategori saknas",
        description: "Välj vilken kategori lektionen tillhör.",
        variant: "destructive",
      });
      return;
    }

    const lessonData = {
      title: currentLesson.title,
      description: publishData.description || `En lektion om ${publishData.category}`,
      category: publishData.category,
      difficulty: publishData.difficulty,
      content: {
        title: currentLesson.title,
        moments: currentLesson.moments,
        category: publishData.category,
        background: currentLesson.background
      }
    };

    publishLessonMutation.mutate(lessonData);
  };

  const newLesson = () => {
    if (currentLesson.moments && currentLesson.moments.length > 0 && !confirm('Är du säker på att du vill skapa en ny lektion? Osparade ändringar går förlorade.')) {
      return;
    }
    setCurrentLesson({
      id: '',
      category: '',
      title: '',
      background: 'beach',
      moments: []
    });
  };

  const updateMomentConfig = (momentId: string, config: any) => {
    setCurrentLesson({
      ...currentLesson,
      moments: (currentLesson.moments || []).map(m => 
        m.id === momentId ? { ...m, config } : m
      )
    });
  };

  // Helper functions for "fyll-mening" moment type
  const addSentenceToMoment = (momentId: string) => {
    const moment = currentLesson.moments.find(m => m.id === momentId);
    if (!moment) return;
    
    const sentences = moment.config.sentences || [];
    const newSentence = {
      id: `sentence-${Date.now()}`,
      text: '',
      blanks: [],
      order: sentences.length
    };
    
    updateMomentConfig(momentId, { 
      ...moment.config, 
      sentences: [...sentences, newSentence] 
    });
  };

  const updateSentenceInMoment = (momentId: string, sentenceId: string, updates: any) => {
    const moment = currentLesson.moments.find(m => m.id === momentId);
    if (!moment) return;
    
    const sentences = moment.config.sentences || [];
    const newSentences = sentences.map((s: any) => 
      s.id === sentenceId ? { ...s, ...updates } : s
    );
    
    updateMomentConfig(momentId, { ...moment.config, sentences: newSentences });
  };

  const removeSentenceFromMoment = (momentId: string, sentenceId: string) => {
    const moment = currentLesson.moments.find(m => m.id === momentId);
    if (!moment) return;
    
    const sentences = moment.config.sentences || [];
    const newSentences = sentences.filter((s: any) => s.id !== sentenceId);
    
    updateMomentConfig(momentId, { ...moment.config, sentences: newSentences });
  };

  const renderMomentConfig = (moment: VocabularyMoment) => {
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
        const addItem = (type: 'text' | 'question') => {
          const items = moment.config.items || [];
          const newOrder = Math.max(0, ...items.map((i: any) => i.order)) + 1;
          const newItem = {
            id: `item-${Date.now()}`,
            type,
            order: newOrder,
            content: '',
            ...(type === 'question' ? { 
              alternatives: [{ text: '', correct: true }],
              correctFeedback: 'Rätt! Bra jobbat!',
              incorrectFeedback: 'Fel svar. Försök igen!'
            } : {})
          };
          const newItems = [...items, newItem].sort((a: any, b: any) => a.order - b.order);
          updateMomentConfig(moment.id, { ...moment.config, items: newItems });
        };
        
        const updateItem = (itemId: string, updates: any) => {
          const items = moment.config.items || [];
          const newItems = items.map((item: any) => 
            item.id === itemId ? { ...item, ...updates } : item
          ).sort((a: any, b: any) => a.order - b.order);
          updateMomentConfig(moment.id, { ...moment.config, items: newItems });
        };
        
        const removeItem = (itemId: string) => {
          const items = moment.config.items || [];
          const newItems = items.filter((item: any) => item.id !== itemId);
          updateMomentConfig(moment.id, { ...moment.config, items: newItems });
        };
        
        const updateAlternative = (itemId: string, altIndex: number, updates: any) => {
          const items = moment.config.items || [];
          const item = items.find((i: any) => i.id === itemId);
          if (item?.alternatives) {
            const newAlternatives = [...item.alternatives];
            newAlternatives[altIndex] = { ...newAlternatives[altIndex], ...updates };
            updateItem(itemId, { alternatives: newAlternatives });
          }
        };
        
        const addAlternative = (itemId: string) => {
          const items = moment.config.items || [];
          const item = items.find((i: any) => i.id === itemId);
          if (item?.alternatives) {
            const newAlternatives = [...item.alternatives, { text: '', correct: false }];
            updateItem(itemId, { alternatives: newAlternatives });
          }
        };
        
        const removeAlternative = (itemId: string, altIndex: number) => {
          const items = moment.config.items || [];
          const item = items.find((i: any) => i.id === itemId);
          if (item?.alternatives) {
            const newAlternatives = item.alternatives.filter((_: any, i: number) => i !== altIndex);
            updateItem(itemId, { alternatives: newAlternatives });
          }
        };

        const moveItem = (itemId: string, direction: 'up' | 'down') => {
          const items = moment.config.items || [];
          const currentIndex = items.findIndex((item: any) => item.id === itemId);
          if (currentIndex === -1) return;
          
          const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
          if (newIndex < 0 || newIndex >= items.length) return;
          
          const newItems = [...items];
          [newItems[currentIndex], newItems[newIndex]] = [newItems[newIndex], newItems[currentIndex]];
          
          newItems.forEach((item: any, index: number) => {
            item.order = index + 1;
          });
          
          updateMomentConfig(moment.id, { ...moment.config, items: newItems });
        };
        
        return (
          <div className="space-y-4">
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
            
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => addItem('text')}>
                + Text
              </Button>
              <Button size="sm" variant="outline" onClick={() => addItem('question')}>
                + Fråga
              </Button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {(moment.config.items || []).map((item: any, index: number) => (
                <Card key={item.id} className="">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant={item.type === 'text' ? 'default' : 'secondary'}>
                        {index + 1}. {item.type === 'text' ? 'Text' : 'Fråga'}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => moveItem(item.id, 'up')}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => moveItem(item.id, 'down')}
                          disabled={index === (moment.config.items || []).length - 1}
                        >
                          ↓
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => removeItem(item.id)}>
                          ×
                        </Button>
                      </div>
                    </div>
                    
                    {item.type === 'text' && (
                      <div className="space-y-2">
                        <Label>Text innehåll</Label>
                        <Textarea 
                          rows={3} 
                          value={item.content} 
                          onChange={(e) => updateItem(item.id, { content: e.target.value })} 
                          placeholder="Skriv text här..." 
                        />
                      </div>
                    )}
                    
                    {item.type === 'question' && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Fråga</Label>
                          <Textarea 
                            rows={2} 
                            value={item.content} 
                            onChange={(e) => updateItem(item.id, { content: e.target.value })} 
                            placeholder="Skriv frågan här..." 
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Svarsalternativ</Label>
                          {(item.alternatives || []).map((alt: any, altIndex: number) => (
                            <div key={altIndex} className="flex items-center gap-2">
                              <Badge variant={alt.correct ? 'default' : 'secondary'}>{altIndex + 1}</Badge>
                              <Input 
                                value={alt.text} 
                                onChange={(e) => updateAlternative(item.id, altIndex, { text: e.target.value })} 
                                placeholder={`Alternativ ${altIndex + 1}`} 
                                className="flex-1"
                              />
                              <Checkbox
                                checked={alt.correct}
                                onCheckedChange={(checked) => updateAlternative(item.id, altIndex, { correct: !!checked })}
                              />
                              <Label className="text-sm">Rätt</Label>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => removeAlternative(item.id, altIndex)}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                          <Button size="sm" variant="outline" onClick={() => addAlternative(item.id)}>
                            + Lägg till alternativ
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Feedback för rätt svar</Label>
                            <Input
                              value={item.correctFeedback || 'Rätt! Bra jobbat!'}
                              onChange={(e) => updateItem(item.id, { correctFeedback: e.target.value })}
                              placeholder="Rätt! Bra jobbat!"
                            />
                          </div>
                          <div>
                            <Label>Feedback för fel svar</Label>
                            <Input
                              value={item.incorrectFeedback || 'Fel svar. Försök igen!'}
                              onChange={(e) => updateItem(item.id, { incorrectFeedback: e.target.value })}
                              placeholder="Fel svar. Försök igen!"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'fyll-mening':

        // Auto-generate word bank from correct answers
        const autoGenerateWordBank = () => {
          const sentences = moment.config.sentences || [];
          const correctWords: string[] = [];
          
          sentences.forEach((sentence: any) => {
            const text = sentence.text || '';
            // Find words in [...] brackets
            const matches = text.match(/\[([^\]]+)\]/g);
            if (matches) {
              matches.forEach((match: string) => {
                const word = match.slice(1, -1).trim();
                if (word && !correctWords.includes(word)) {
                  correctWords.push(word);
                }
              });
            }
          });

          return correctWords;
        };

        const currentWordBank = moment.config.wordBank || autoGenerateWordBank();
        const distractors = moment.config.distractors || [];

        return (
          <div className="space-y-6">
            <div>
              <Label>Instruktion</Label>
              <Input
                value={moment.config.instruction || 'Dra rätt ord till luckan i meningen'}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, instruction: e.target.value })}
                placeholder="Dra rätt ord till luckan"
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Meningar med luckor</Label>
                <Button size="sm" onClick={() => addSentenceToMoment(moment.id)} variant="outline">
                  + Lägg till mening
                </Button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                💡 Skriv ord inom hakparenteser [...] för att skapa luckor. 
                Exempel: "Jag har [ont] idag" eller "Katten [sitter] på [mattan]"
              </p>

              {(!moment.config.sentences || moment.config.sentences.length === 0) && (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                  <p className="text-gray-500 mb-2">Inga meningar ännu</p>
                  <Button size="sm" onClick={() => addSentenceToMoment(moment.id)}>
                    Skapa första meningen
                  </Button>
                </div>
              )}

              <div className="space-y-3">
                {(moment.config.sentences || []).map((sentence: any, index: number) => (
                  <Card key={sentence.id}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <Badge variant="outline">Mening {index + 1}</Badge>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => removeSentenceFromMoment(moment.id, sentence.id)}
                          >
                            ×
                          </Button>
                        </div>
                        
                        <div>
                          <Label className="text-sm">Mening med luckor</Label>
                          <Textarea
                            value={sentence.text}
                            onChange={(e) => updateSentenceInMoment(moment.id, sentence.id, { text: e.target.value })}
                            placeholder="Exempel: Jag har [ont] idag, eller: Katten [sitter] på [mattan]"
                            className="min-h-[80px] font-mono"
                            rows={2}
                          />
                        </div>

                        {/* Preview how it will look */}
                        {sentence.text && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <Label className="text-xs text-blue-700 mb-2 block">Förhandsvisning:</Label>
                            <div className="flex flex-wrap gap-2 items-center">
                              {sentence.text.split(/(\[[^\]]+\])/).map((part: string, i: number) => {
                                if (part.match(/\[([^\]]+)\]/)) {
                                  const word = part.slice(1, -1);
                                  return (
                                    <span 
                                      key={i} 
                                      className="inline-flex items-center gap-1 px-3 py-1 bg-white border-2 border-dashed border-blue-400 rounded text-blue-700 font-medium"
                                    >
                                      <span className="text-xs">📍</span> {word}
                                    </span>
                                  );
                                }
                                return <span key={i} className="text-gray-700">{part}</span>;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Word Bank Configuration */}
            <div className="border-t pt-4">
              <Label className="text-base font-semibold mb-3 block">Ordbank</Label>
              
              {/* Auto-detected correct words */}
              <div className="mb-4">
                <Label className="text-sm text-green-700 mb-2 block">✅ Rätt ord (automatiskt funna):</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-green-50 rounded border border-green-200">
                  {currentWordBank.length > 0 ? (
                    currentWordBank.map((word: string) => (
                      <Badge key={word} className="bg-green-100 text-green-800 border-green-300">
                        {word}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500 italic">
                      Lägg till meningar med ord inom [...] för att generera ordbank
                    </span>
                  )}
                </div>
              </div>

              {/* Distractors */}
              <div>
                <Label className="text-sm text-orange-700 mb-2 block">❌ Distraktorer (felaktiga alternativ):</Label>
                <Input
                  value={distractors.join(', ')}
                  onChange={(e) => updateMomentConfig(moment.id, { 
                    ...moment.config, 
                    distractors: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) 
                  })}
                  placeholder="lätt, snabbt, gärna, aldrig"
                  className="mb-2"
                />
                <p className="text-xs text-gray-500">
                  Lägg till ord som INTE passar, för att göra övningen svårare
                </p>
                
                {distractors.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-orange-50 rounded border border-orange-200 mt-2">
                    {distractors.map((word: string) => (
                      <Badge key={word} className="bg-orange-100 text-orange-800 border-orange-300">
                        {word}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Complete word bank preview */}
              {(currentWordBank.length > 0 || distractors.length > 0) && (
                <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded">
                  <Label className="text-sm text-purple-700 mb-2 block">
                    🎯 Komplett ordbank (som eleven ser):
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {[...currentWordBank, ...distractors].sort(() => Math.random() - 0.5).map((word: string, i: number) => (
                      <span 
                        key={i}
                        className="px-3 py-2 bg-white border-2 border-purple-300 rounded font-medium text-gray-700 shadow-sm"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="border-t pt-4">
              <Label className="text-base font-semibold mb-3 block">Inställningar</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Visa feedback direkt</Label>
                    <p className="text-xs text-gray-500">Visa om svaret är rätt/fel när eleven drar ordet</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={moment.config.showImmediateFeedback !== false}
                    onChange={(e) => updateMomentConfig(moment.id, { 
                      ...moment.config, 
                      showImmediateFeedback: e.target.checked 
                    })}
                    className="w-4 h-4"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Blanda meningarnas ordning</Label>
                    <p className="text-xs text-gray-500">Visa meningarna i slumpmässig ordning</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={moment.config.shuffleSentences === true}
                    onChange={(e) => updateMomentConfig(moment.id, { 
                      ...moment.config, 
                      shuffleSentences: e.target.checked 
                    })}
                    className="w-4 h-4"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Momenttyp saknas konfiguration</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="text-purple-600 border-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Tillbaka till admin
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookOpen className="w-8 h-8" />
                Ordkunskap - Lektionsbyggare
              </h1>
              <p className="text-purple-100">Skapa lektioner för att utveckla elevernas ordförråd</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Lesson Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Lektionsinformation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Titel</Label>
                  <Input
                    value={currentLesson.title}
                    onChange={(e) => setCurrentLesson({ ...currentLesson, title: e.target.value })}
                    placeholder="t.ex. Lär dig ord om djur"
                  />
                </div>
                <div>
                  <Label>Kategori</Label>
                  <Select value={currentLesson.category} onValueChange={(value) => setCurrentLesson({ ...currentLesson, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {VOCABULARY_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Bakgrund</Label>
                  <Select value={currentLesson.background} onValueChange={(value) => setCurrentLesson({ ...currentLesson, background: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beach">Strand</SelectItem>
                      <SelectItem value="forest">Skog</SelectItem>
                      <SelectItem value="classroom">Klassrum</SelectItem>
                      <SelectItem value="space">Rymden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lägg till moment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {MOMENT_TYPES.map(type => (
                  <Button
                    key={type.id}
                    onClick={() => addMoment(type.id)}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <span className="mr-2">{type.icon}</span>
                    {type.name}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Åtgärder</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={newLesson} variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Ny lektion
                </Button>
                <Button onClick={saveLesson} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Spara utkast
                </Button>
                <Button onClick={() => setShowLoadDialog(true)} variant="outline" className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Ladda utkast
                </Button>
                <Button onClick={handlePublish} variant="default" className="w-full bg-purple-600 hover:bg-purple-700">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Publicera
                </Button>
                <Button 
                  onClick={() => {
                    if (currentLesson.moments.length > 0) {
                      setShowPreview(true);
                      setCurrentPreviewMoment(0);
                    } else {
                      toast({
                        title: "Inga moment",
                        description: "Lägg till moment innan du förhandsgranskar.",
                        variant: "destructive",
                      });
                    }
                  }} 
                  variant="outline" 
                  className="w-full"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Förhandsgranska
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Center Panel - Moment List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Lektionsmoment ({currentLesson.moments.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {currentLesson.moments.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Lägg till ditt första moment</p>
                    <p className="text-sm">Välj en momenttyp från vänster panel</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentLesson.moments.map((moment, index) => (
                      <div
                        key={moment.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, moment.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow cursor-move"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <GripVertical className="w-5 h-5 text-gray-400 mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge>{index + 1}</Badge>
                                <span className="font-medium">{moment.title}</span>
                                <Badge variant="outline">
                                  {MOMENT_TYPES.find(t => t.id === moment.type)?.icon}
                                </Badge>
                              </div>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    Redigera
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Redigera moment: {moment.title}</DialogTitle>
                                    <DialogDescription>
                                      Konfigurera momentets innehåll och inställningar
                                    </DialogDescription>
                                  </DialogHeader>
                                  {renderMomentConfig(moment)}
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => duplicateMoment(moment.id)}
                              title="Duplicera"
                            >
                              Kopiera
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeMoment(moment.id)}
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* Load Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ladda utkast</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {savedLessons.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Inga sparade utkast</p>
            ) : (
              savedLessons.map((draft: any) => (
                <div key={draft.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{draft.title}</p>
                    <p className="text-sm text-gray-500">{draft.category || 'Ingen kategori'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => loadFromDraft(draft)}>
                      Ladda
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteDraft(draft.id)}>
                      Ta bort
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publicera lektion</DialogTitle>
            <DialogDescription>
              Gör lektionen tillgänglig för elever
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kategori</Label>
              <Select value={publishData.category} onValueChange={(value) => setPublishData({ ...publishData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj kategori" />
                </SelectTrigger>
                <SelectContent>
                  {VOCABULARY_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Svårighetsgrad</Label>
              <Select value={publishData.difficulty} onValueChange={(value) => setPublishData({ ...publishData, difficulty: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Lätt</SelectItem>
                  <SelectItem value="medium">Medel</SelectItem>
                  <SelectItem value="hard">Svår</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Beskrivning</Label>
              <Textarea
                value={publishData.description}
                onChange={(e) => setPublishData({ ...publishData, description: e.target.value })}
                placeholder="Beskriv vad lektionen handlar om..."
              />
            </div>
            <Button onClick={confirmPublish} className="w-full">
              Publicera
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">Förhandsgranskning</h2>
              <Button onClick={() => setShowPreview(false)} variant="outline">
                Stäng
              </Button>
            </div>
            <div className="p-6">
              {currentLesson.moments[currentPreviewMoment] && (
                <InteractivePreview
                  moment={currentLesson.moments[currentPreviewMoment]}
                  onNext={() => {
                    if (currentPreviewMoment < currentLesson.moments.length - 1) {
                      setCurrentPreviewMoment(currentPreviewMoment + 1);
                    } else {
                      setShowPreview(false);
                      setCurrentPreviewMoment(0);
                    }
                  }}
                  lesson={currentLesson}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

