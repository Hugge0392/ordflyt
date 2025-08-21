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
import { ImageUploader } from "@/components/ImageUploader";
import { InteractivePreview } from "@/components/InteractivePreview";
import { CrosswordBuilder } from "@/components/CrosswordBuilder";
import { CharacterLibrary } from "@/components/CharacterLibrary";
import { LessonTemplates } from "@/components/LessonTemplates";
import { LessonValidator } from "@/components/LessonValidator";
import { 
  OrdracetConfigurator, 
  MeningPusselConfigurator, 
  GissaOrdetConfigurator, 
  RimSpelConfigurator, 
  SynonymerConfigurator, 
  QuizConfigurator,
  OrdklassdrakConfigurator
} from "@/components/GameConfigurators";

interface LessonMoment {
  id: string;
  type: 'textruta' | 'pratbubbla' | 'memory' | 'korsord' | 'finns-ordklass' | 'fyll-mening' | 'dra-ord' | 'ordmoln' | 'sortera-korgar' | 'ordracet' | 'mening-pussel' | 'gissa-ordet' | 'rim-spel' | 'synonymer' | 'motsatser' | 'ordkedja' | 'bokstavs-jakt' | 'ordlangd' | 'bild-ord' | 'stavning' | 'ordbok' | 'berattelse' | 'quiz' | 'ljudspel' | 'ordform' | 'piratgrav' | 'ordklassdrak' | 'tabellen' | 'slutprov' | 'slutdiplom';
  title: string;
  order: number;
  config: any;
}

interface Lesson {
  id: string;
  wordClass: string;
  title: string;
  background: string;
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
  { id: 'sortera-korgar', name: 'Sortera i korgar', icon: '🗂️', description: 'Sortera ord i olika kategorier' },
  { id: 'ordracet', name: 'Ordracet', icon: '🏃‍♂️', description: 'Snabbt spel där ord regnar från himlen' },
  { id: 'mening-pussel', name: 'Meningspussel', icon: '🧩', description: 'Sätt ihop meningar från orddelar' },
  { id: 'gissa-ordet', name: 'Gissa ordet', icon: '🎯', description: 'Gissa ord från ledtrådar' },
  { id: 'rim-spel', name: 'Rimspel', icon: '🎵', description: 'Hitta ord som rimmar' },
  { id: 'synonymer', name: 'Synonymer', icon: '🔄', description: 'Matcha ord med samma betydelse' },
  { id: 'motsatser', name: 'Motsatser', icon: '⚖️', description: 'Hitta ord med motsatt betydelse' },
  { id: 'ordkedja', name: 'Ordkedja', icon: '🔗', description: 'Bygg en kedja av relaterade ord' },
  { id: 'bokstavs-jakt', name: 'Bokstavsjakt', icon: '🔤', description: 'Hitta ord som börjar med viss bokstav' },
  { id: 'ordlangd', name: 'Ordlängd', icon: '📏', description: 'Sortera ord efter antal bokstäver' },
  { id: 'bild-ord', name: 'Bild och ord', icon: '🖼️', description: 'Matcha bilder med rätt ord' },
  { id: 'stavning', name: 'Stavning', icon: '🔤', description: 'Stava ord korrekt' },
  { id: 'ordbok', name: 'Ordbok', icon: '📚', description: 'Slå upp ord och lär betydelser' },
  { id: 'berattelse', name: 'Berättelse', icon: '📖', description: 'Interaktiv berättelse med val' },
  { id: 'quiz', name: 'Quiz', icon: '❓', description: 'Flervalsfrågor om grammatik' },
  { id: 'ljudspel', name: 'Ljudspel', icon: '🔊', description: 'Lyssna och identifiera ord' },
  { id: 'ordform', name: 'Ordform', icon: '🔀', description: 'Böj ord i olika former' },
  { id: 'piratgrav', name: 'Piratgräv', icon: '🏴‍☠️', description: 'Piratspel för att lära sig substantiv' },
  { id: 'ordklassdrak', name: 'Ordklassdrak', icon: '🐉', description: 'Mata draken med ord från rätt ordklass' },
  { id: 'tabellen', name: 'Tabellen', icon: '📋', description: 'Dra ord från en lista och placera dem rätt i en tabell' },
  { id: 'slutprov', name: 'Slutprov', icon: '📝', description: 'Tidsbegränsad slutexamination med meningar' },
  { id: 'slutdiplom', name: 'Slutdiplom', icon: '🏆', description: 'Pampigt diplom för kursgenom­förande' }
];

const WORD_CLASSES = [
  'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection', 'numeral'
];

export default function LessonBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentLesson, setCurrentLesson] = useState<Lesson>({
    id: '',
    wordClass: '',
    title: '',
    background: 'beach',
    moments: []
  });
  
  const [draggedMoment, setDraggedMoment] = useState<string | null>(null);
  const [editingMoment, setEditingMoment] = useState<LessonMoment | null>(null);
  const [showMomentDialog, setShowMomentDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPreviewMoment, setCurrentPreviewMoment] = useState(0);
  // Remove savedLessons state - using server data instead
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishData, setPublishData] = useState({
    wordClass: '',
    difficulty: 'medium',
    description: ''
  });
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  
  // Piratgrav configuration state
  const [piratgravWord1, setPiratgravWord1] = useState('');
  const [piratgravWord2, setPiratgravWord2] = useState('');
  
  // Lesson merging state
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [selectedLessons, setSelectedLessons] = useState<{lesson1: any | null, lesson2: any | null}>({lesson1: null, lesson2: null});
  const [mergeOptions, setMergeOptions] = useState<{insertPosition: 'beginning' | 'end' | 'replace', preserveMetadata: boolean}>({insertPosition: 'end', preserveMetadata: false});

  // Fetch word classes for publish dialog
  const { data: wordClasses = [] } = useQuery<any[]>({
    queryKey: ['/api/word-classes'],
  });

  // Fetch lesson drafts
  const { data: savedLessons = [] } = useQuery<any[]>({
    queryKey: ['/api/lessons/drafts'],
  });
  
  // Fetch published lessons for merging
  const { data: publishedLessons = [] } = useQuery<any[]>({
    queryKey: ['/api/lessons/published'],
  });

  // Save/update lesson draft mutations
  const saveLessonMutation = useMutation({
    mutationFn: async (lessonData: any) => {
      if (lessonData.id && lessonData.id.startsWith('lesson_')) {
        // Check if this draft exists on server
        try {
          const response = await apiRequest('GET', `/api/lessons/drafts/${lessonData.id}`);
          if (response.ok) {
            // Update existing draft
            const updateResponse = await apiRequest('PUT', `/api/lessons/drafts/${lessonData.id}`, lessonData);
            return updateResponse.json();
          }
        } catch (error) {
          // Draft doesn't exist, create new one
        }
      }
      // Create new draft
      const response = await apiRequest('POST', '/api/lessons/drafts', lessonData);
      return response.json();
    },
    onSuccess: (savedLesson) => {
      // Update current lesson with server ID
      setCurrentLesson(savedLesson);
      // Invalidate drafts cache
      queryClient.invalidateQueries({ queryKey: ['/api/lessons/drafts'] });
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
      await apiRequest('DELETE', `/api/lessons/drafts/${lessonId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lessons/drafts'] });
      toast({
        title: "Lektion borttagen",
        description: "Lektionsutkastet har tagits bort.",
      });
    },
    onError: (error) => {
      toast({
        title: "Borttagning misslyckades",
        description: "Kunde inte ta bort lektionen. Försök igen.",
        variant: "destructive",
      });
    },
  });

  // Publish lesson mutation
  const publishLessonMutation = useMutation({
    mutationFn: async (lessonData: any) => {
      console.log('Publishing lesson data:', lessonData);
      
      if (editingLessonId) {
        // Update existing lesson
        return await apiRequest('PUT', `/api/lessons/published/${editingLessonId}`, lessonData);
      } else {
        // Create new lesson
        return await apiRequest('POST', '/api/lessons/publish', lessonData);
      }
    },
    onSuccess: (response) => {
      console.log('Publish onSuccess called with response:', response);
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/lessons/published'] });
      queryClient.invalidateQueries({ queryKey: ['/api/lessons/drafts'] });
      
      toast({
        title: editingLessonId ? "Lektion uppdaterad!" : "Lektion publicerad!",
        description: editingLessonId 
          ? "Lektionen har uppdaterats framgångsrikt." 
          : "Lektionen är nu tillgänglig i ordklassmenyn!",
      });
      
      // Stäng publiceringsdialogen
      setShowPublishDialog(false);
      setEditingLessonId(null);
      
      // Reset lesson after successful publish
      setCurrentLesson({
        id: '',
        wordClass: '',
        title: '',
        background: 'beach',
        moments: []
      });
      setPublishData({
        wordClass: '',
        difficulty: 'medium',
        description: ''
      });
    },
    onError: (error) => {
      console.error('Publish onError called with error:', error);
      toast({
        title: editingLessonId ? "Uppdatering misslyckades" : "Publicering misslyckades",
        description: editingLessonId 
          ? "Kunde inte uppdatera lektionen. Försök igen."
          : "Kunde inte publicera lektionen. Försök igen.",
        variant: "destructive",
      });
    },
  });

  // Component initialization
  useEffect(() => {
    // Future: Add lesson loading for editing functionality
  }, []);

  const addMoment = (type: string) => {
    const newMoment: LessonMoment = {
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
      case 'ordracet':
        return { words: [], speed: 'medium', duration: 60, theme: '' };
      case 'mening-pussel':
        return { sentences: [], difficulty: 'easy' };
      case 'gissa-ordet':
        return { words: [], clues: [], maxGuesses: 3 };
      case 'rim-spel':
        return { words: [], instruction: 'Hitta ord som rimmar' };
      case 'synonymer':
        return { wordPairs: [], instruction: 'Matcha ord med samma betydelse' };
      case 'motsatser':
        return { wordPairs: [], instruction: 'Hitta motsatser' };
      case 'ordkedja':
        return { startWord: '', categories: [], chainLength: 5 };
      case 'bokstavs-jakt':
        return { letters: [], words: [], timeLimit: 30 };
      case 'ordlangd':
        return { words: [], instruction: 'Sortera efter antal bokstäver' };
      case 'bild-ord':
        return { pairs: [], instruction: 'Matcha bild med ord' };
      case 'stavning':
        return { words: [], difficulty: 'easy', allowHints: true };
      case 'ordbok':
        return { words: [], showDefinitions: true };
      case 'berattelse':
        return { story: '', choices: [], outcomes: [] };
      case 'quiz':
        return { questions: [], timeLimit: 0, randomOrder: true };
      case 'ljudspel':
        return { words: [], audioType: 'pronunciation' };
      case 'ordform':
        return { baseWords: [], forms: [], instruction: 'Böj orden korrekt' };
      case 'piratgrav':
        return { words: [], instruction: 'Gräv fram ord och avgör om de är substantiv' };
      case 'ordklassdrak':
        return { 
          distractors: [], 
          targetWords: [],
          wordsPerRound: 8
        };
      case 'tabellen':
        return {
          tableTitle: '',
          columns: ['Kolumn 1', 'Kolumn 2'], // Table column headers
          rows: [
            { id: 'row1', cells: ['', ''] }, // Empty cells to be filled
            { id: 'row2', cells: ['', ''] }
          ],
          wordBank: [], // Words to drag from
          correctAnswers: {}, // Maps cell position to correct word
          instruction: 'Dra orden från listan och placera dem på rätt plats i tabellen'
        };
      case 'slutprov':
        return {
          sentences: [],
          targetWords: [], // Array of arrays - one array per sentence with target words
          requiredCorrect: 5,
          timeLimit: 60,
          penaltySeconds: 5,
          instruction: 'Klicka på ord av rätt ordklass'
        };
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
      moments: (currentLesson.moments || []).filter(m => m.id !== momentId)
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
      toast({
        title: "Titel saknas",
        description: "Lektionen måste ha en titel",
        variant: "destructive",
      });
      return;
    }

    const lessonToSave = {
      ...currentLesson,
      id: currentLesson.id || `lesson_${Date.now()}`,
      content: {
        title: currentLesson.title,
        moments: currentLesson.moments,
        wordClass: currentLesson.wordClass,
        background: currentLesson.background
      }
    };

    saveLessonMutation.mutate(lessonToSave);
  };

  const loadFromTemplate = (template: any) => {
    const newLesson: Lesson = {
      id: `lesson_${Date.now()}`,
      title: template.name,
      wordClass: template.wordClass,
      background: template.background || 'beach',
      moments: template.moments.map((moment: any, index: number) => ({
        id: `moment_${Date.now()}_${index}`,
        ...moment,
        order: index
      }))
    };

    setCurrentLesson(newLesson);
  };

  const loadFromDraft = (draft: any) => {
    if (currentLesson.moments && currentLesson.moments.length > 0 && !confirm('Är du säker på att du vill ladda detta utkast? Osparade ändringar går förlorade.')) {
      return;
    }
    
    const loadedLesson: Lesson = {
      id: draft.id,
      title: draft.title,
      wordClass: draft.wordClass || '',
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
    if (!publishData.wordClass) {
      toast({
        title: "Ordklass saknas",
        description: "Välj vilken ordklass lektionen tillhör.",
        variant: "destructive",
      });
      return;
    }

    const lessonData = {
      title: currentLesson.title,
      description: publishData.description || `En interaktiv lektion med ${currentLesson.moments.length} moment`,
      wordClass: publishData.wordClass,
      difficulty: publishData.difficulty,
      content: {
        title: currentLesson.title,
        moments: currentLesson.moments,
        wordClass: publishData.wordClass,
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
      wordClass: '',
      title: '',
      background: 'beach',
      moments: []
    });
  };
  
  const mergeLessons = () => {
    const { lesson1, lesson2 } = selectedLessons;
    if (!lesson1 || !lesson2) {
      toast({
        title: "Välj två lektioner",
        description: "Du måste välja två lektioner att slå samman.",
        variant: "destructive",
      });
      return;
    }
    
    // Extract moments from both lessons
    const lesson1Moments = lesson1.content?.moments || lesson1.moments || [];
    const lesson2Moments = lesson2.content?.moments || lesson2.moments || [];
    
    // Combine moments with new IDs and correct order
    let combinedMoments: LessonMoment[] = [];
    let nextOrder = 0;
    
    if (mergeOptions.insertPosition === 'beginning') {
      // Add lesson1 moments first
      combinedMoments = [...lesson1Moments.map((moment: any) => ({
        ...moment,
        id: `merged1_${Date.now()}_${nextOrder++}`,
        order: nextOrder - 1
      }))];
      
      // Add lesson2 moments
      combinedMoments = [...combinedMoments, ...lesson2Moments.map((moment: any) => ({
        ...moment,
        id: `merged2_${Date.now()}_${nextOrder++}`,
        order: nextOrder - 1
      }))];
      
      // Add current lesson moments at the end
      combinedMoments = [...combinedMoments, ...currentLesson.moments.map((moment: any) => ({
        ...moment,
        order: nextOrder++
      }))];
    } else if (mergeOptions.insertPosition === 'end') {
      // Keep current lesson moments first
      combinedMoments = [...currentLesson.moments.map((moment: any) => ({
        ...moment,
        order: nextOrder++
      }))];
      
      // Add lesson1 moments
      combinedMoments = [...combinedMoments, ...lesson1Moments.map((moment: any) => ({
        ...moment,
        id: `merged1_${Date.now()}_${nextOrder++}`,
        order: nextOrder - 1
      }))];
      
      // Add lesson2 moments
      combinedMoments = [...combinedMoments, ...lesson2Moments.map((moment: any) => ({
        ...moment,
        id: `merged2_${Date.now()}_${nextOrder++}`,
        order: nextOrder - 1
      }))];
    } else { // replace
      // Replace current lesson with merged lessons
      combinedMoments = [...lesson1Moments.map((moment: any) => ({
        ...moment,
        id: `merged1_${Date.now()}_${nextOrder++}`,
        order: nextOrder - 1
      }))];
      
      combinedMoments = [...combinedMoments, ...lesson2Moments.map((moment: any) => ({
        ...moment,
        id: `merged2_${Date.now()}_${nextOrder++}`,
        order: nextOrder - 1
      }))];
    }
    
    // Handle metadata preservation
    let mergedLesson = { ...currentLesson };
    
    if (mergeOptions.preserveMetadata && lesson1) {
      mergedLesson = {
        ...mergedLesson,
        title: lesson1.title || lesson1.content?.title || mergedLesson.title,
        wordClass: lesson1.wordClass || lesson1.content?.wordClass || mergedLesson.wordClass,
        background: lesson1.background || lesson1.content?.background || mergedLesson.background
      };
    }
    
    // Update current lesson
    setCurrentLesson({
      ...mergedLesson,
      moments: combinedMoments
    });
    
    // Close dialog and reset selections
    setShowMergeDialog(false);
    setSelectedLessons({lesson1: null, lesson2: null});
    
    toast({
      title: "Lektioner sammanslagit!",
      description: `${combinedMoments.length} moment från ${lesson1.title} och ${lesson2.title} har lagts till.`,
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
      moments: (currentLesson.moments || []).map(m => 
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
          
          // Update order values to match new positions
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
            
            {/* Lägg till knappar */}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => addItem('text')}>
                + Text
              </Button>
              <Button size="sm" variant="outline" onClick={() => addItem('question')}>
                + Fråga
              </Button>
            </div>
            
            {/* Items */}
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
                          title="Flytta upp"
                        >
                          ↑
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => moveItem(item.id, 'down')}
                          disabled={index === (moment.config.items || []).length - 1}
                          title="Flytta ner"
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
        const currentClues = moment.config.clues || [];
        
        const addNewClue = () => {
          const newClues = [...currentClues, { question: '', answer: '' }];
          updateMomentConfig(moment.id, { ...moment.config, clues: newClues });
        };
        
        const removeClue = (index: number) => {
          const newClues = currentClues.filter((_: any, i: number) => i !== index);
          updateMomentConfig(moment.id, { ...moment.config, clues: newClues });
        };
        
        const updateClue = (index: number, field: 'question' | 'answer', value: string) => {
          const newClues = [...currentClues];
          newClues[index] = { ...newClues[index], [field]: value };
          updateMomentConfig(moment.id, { ...moment.config, clues: newClues });
        };
        
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Korsordsfrågor</Label>
              <Button onClick={addNewClue} size="sm" variant="outline">
                + Lägg till fråga
              </Button>
            </div>
            
            {currentClues.length > 0 && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {currentClues.map((clue: any, index: number) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-sm text-gray-600">
                      {index + 1}.
                    </div>
                    <div className="col-span-5">
                      <Input
                        placeholder="Skriv din fråga..."
                        value={clue.question}
                        onChange={(e) => updateClue(index, 'question', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-5">
                      <Input
                        placeholder="SVAR (versaler)"
                        value={clue.answer}
                        onChange={(e) => updateClue(index, 'answer', e.target.value.toUpperCase())}
                        className="text-sm font-mono"
                      />
                    </div>
                    <Button 
                      onClick={() => removeClue(index)} 
                      size="sm" 
                      variant="ghost" 
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {currentClues.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-lg mb-2">🔤</div>
                <p>Inga frågor än. Klicka "Lägg till fråga" för att börja.</p>
              </div>
            )}
            
            {currentClues.length > 0 && (
              <div className="mt-6">
                <CrosswordBuilder
                  clues={currentClues.filter((clue: any) => clue.question && clue.answer)}
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

      case 'ordracet':
        return <OrdracetConfigurator moment={moment} updateMomentConfig={updateMomentConfig} />;

      case 'mening-pussel':
        return <MeningPusselConfigurator moment={moment} updateMomentConfig={updateMomentConfig} />;

      case 'gissa-ordet':
        return <GissaOrdetConfigurator moment={moment} updateMomentConfig={updateMomentConfig} />;

      case 'rim-spel':
        return <RimSpelConfigurator moment={moment} updateMomentConfig={updateMomentConfig} />;

      case 'synonymer':
        return <SynonymerConfigurator moment={moment} updateMomentConfig={updateMomentConfig} />;

      case 'motsatser':
        return <SynonymerConfigurator moment={moment} updateMomentConfig={updateMomentConfig} />;

      case 'quiz':
        return <QuizConfigurator moment={moment} updateMomentConfig={updateMomentConfig} />;

      case 'ordklassdrak':
        return <OrdklassdrakConfigurator moment={moment} updateMomentConfig={updateMomentConfig} />;

      case 'tabellen':
        const addColumn = () => {
          const columns = [...(moment.config.columns || []), ''];
          const rows = moment.config.rows?.map((row: any) => ({
            ...row,
            cells: [...row.cells, '']
          })) || [];
          updateMomentConfig(moment.id, { ...moment.config, columns, rows });
        };

        const removeColumn = (index: number) => {
          const columns = moment.config.columns?.filter((_: any, i: number) => i !== index) || [];
          const rows = moment.config.rows?.map((row: any) => ({
            ...row,
            cells: row.cells.filter((_: any, i: number) => i !== index)
          })) || [];
          updateMomentConfig(moment.id, { ...moment.config, columns, rows });
        };

        const addRow = () => {
          const newRow = {
            id: `row${Date.now()}`,
            cells: new Array(moment.config.columns?.length || 2).fill('')
          };
          const rows = [...(moment.config.rows || []), newRow];
          updateMomentConfig(moment.id, { ...moment.config, rows });
        };

        const removeRow = (index: number) => {
          const rows = moment.config.rows?.filter((_: any, i: number) => i !== index) || [];
          updateMomentConfig(moment.id, { ...moment.config, rows });
        };

        const addWordToBank = () => {
          const wordBank = [...(moment.config.wordBank || []), ''];
          updateMomentConfig(moment.id, { ...moment.config, wordBank });
        };

        const removeWordFromBank = (index: number) => {
          const wordBank = moment.config.wordBank?.filter((_: any, i: number) => i !== index) || [];
          updateMomentConfig(moment.id, { ...moment.config, wordBank });
        };

        return (
          <div className="space-y-6">
            <div>
              <Label>Tabelltitel</Label>
              <Input
                value={moment.config.tableTitle || ''}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, tableTitle: e.target.value })}
                placeholder="T.ex. Sortera djur efter typ"
              />
            </div>

            <div>
              <Label>Instruktion</Label>
              <Textarea
                value={moment.config.instruction || ''}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, instruction: e.target.value })}
                placeholder="Förklara vad eleverna ska göra..."
                className="min-h-[80px]"
              />
            </div>

            <div>
              <Label>Kolumnrubriker</Label>
              <div className="space-y-2">
                {(moment.config.columns || []).map((column: string, index: number) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={column}
                      onChange={(e) => {
                        const columns = [...moment.config.columns];
                        columns[index] = e.target.value;
                        updateMomentConfig(moment.id, { ...moment.config, columns });
                      }}
                      placeholder={`Kolumn ${index + 1}`}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeColumn(index)}
                      className="text-red-600 hover:text-red-700"
                      disabled={moment.config.columns?.length <= 1}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addColumn}>
                  + Lägg till kolumn
                </Button>
              </div>
            </div>

            <div>
              <Label>Tabellrader</Label>
              <div className="space-y-2">
                {(moment.config.rows || []).map((row: any, rowIndex: number) => (
                  <div key={row.id} className="border rounded p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Rad {rowIndex + 1}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeRow(rowIndex)}
                        className="text-red-600 hover:text-red-700"
                        disabled={moment.config.rows?.length <= 1}
                      >
                        ✕
                      </Button>
                    </div>
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${moment.config.columns?.length || 2}, 1fr)` }}>
                      {row.cells.map((cell: string, cellIndex: number) => (
                        <Input
                          key={cellIndex}
                          value={cell}
                          onChange={(e) => {
                            const rows = [...moment.config.rows];
                            rows[rowIndex].cells[cellIndex] = e.target.value;
                            updateMomentConfig(moment.id, { ...moment.config, rows });
                          }}
                          placeholder={`${moment.config.columns?.[cellIndex] || `Kolumn ${cellIndex + 1}`}`}
                          className="text-sm"
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addRow}>
                  + Lägg till rad
                </Button>
              </div>
            </div>

            <div>
              <Label>Ordbank (ord att dra från)</Label>
              <div className="space-y-2">
                {(moment.config.wordBank || []).map((word: string, index: number) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={word}
                      onChange={(e) => {
                        const wordBank = [...moment.config.wordBank];
                        wordBank[index] = e.target.value;
                        updateMomentConfig(moment.id, { ...moment.config, wordBank });
                      }}
                      placeholder="Skriv ett ord..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeWordFromBank(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addWordToBank}>
                  + Lägg till ord
                </Button>
              </div>
            </div>

            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
              <strong>Tips:</strong> Definiera rätt svar genom att sätta korrekt text direkt i tabellradernas celler. 
              Orden från ordbanken kommer att dras till dessa positioner under spelet.
            </div>
          </div>
        );

      case 'ordkedja':
        return (
          <div className="space-y-4">
            <div>
              <Label>Startord</Label>
              <Input
                value={moment.config.startWord}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, startWord: e.target.value })}
                placeholder="katt"
              />
            </div>
            <div>
              <Label>Kedjelängd</Label>
              <Input
                type="number"
                value={moment.config.chainLength || 5}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, chainLength: parseInt(e.target.value) })}
              />
            </div>
          </div>
        );

      case 'bokstavs-jakt':
        return (
          <div className="space-y-4">
            <div>
              <Label>Bokstäver att jaga (separerade med komma)</Label>
              <Input
                value={(moment.config.letters || []).join(', ')}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, letters: e.target.value.split(',').map(l => l.trim()) })}
                placeholder="A, B, K, S"
              />
            </div>
            <div>
              <Label>Tidsgräns (sekunder)</Label>
              <Input
                type="number"
                value={moment.config.timeLimit || 30}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, timeLimit: parseInt(e.target.value) })}
              />
            </div>
          </div>
        );

      case 'stavning':
        return (
          <div className="space-y-4">
            <div>
              <Label>Ord att stava (ett per rad)</Label>
              <Textarea
                value={(moment.config.words || []).join('\n')}
                onChange={(e) => {
                  const words = e.target.value.split('\n').map(w => w.trim()).filter(w => w);
                  updateMomentConfig(moment.id, { ...moment.config, words });
                }}
                placeholder="katt\nhund\nbil"
                className="min-h-[80px]"
              />
            </div>
            <div>
              <Label>Tillåt ledtrådar</Label>
              <Select
                value={moment.config.allowHints ? 'true' : 'false'}
                onValueChange={(value) => updateMomentConfig(moment.id, { ...moment.config, allowHints: value === 'true' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Ja</SelectItem>
                  <SelectItem value="false">Nej</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'berattelse':
        return (
          <div className="space-y-4">
            <div>
              <Label>Berättelse</Label>
              <Textarea
                value={moment.config.story}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, story: e.target.value })}
                placeholder="Det var en gång en katt som..."
                className="min-h-[120px]"
              />
            </div>
            <div>
              <Label>Val och utfall (format: val|utfall, ett per rad)</Label>
              <Textarea
                value={(moment.config.choices || []).map((choice: any) => `${choice.text}|${choice.outcome}`).join('\n')}
                onChange={(e) => {
                  const choices = e.target.value.split('\n').filter(line => line.includes('|')).map(line => {
                    const [text, outcome] = line.split('|');
                    return { text: text?.trim() || '', outcome: outcome?.trim() || '' };
                  });
                  updateMomentConfig(moment.id, { ...moment.config, choices });
                }}
                placeholder="Gå till höger|Du hittar en skattkista\nGå till vänster|Du möter en drake"
                className="min-h-[80px]"
              />
            </div>
          </div>
        );

      case 'piratgrav':
        const existingWords = moment.config.words || [];
        
        const addWordPair = () => {
          if (piratgravWord1.trim() && piratgravWord2.trim()) {
            const newWords = [
              ...existingWords,
              { w: piratgravWord1.trim(), n: true },
              { w: piratgravWord2.trim(), n: false }
            ];
            updateMomentConfig(moment.id, { ...moment.config, words: newWords });
            setPiratgravWord1('');
            setPiratgravWord2('');
          }
        };
        
        const removeWordPair = (index: number) => {
          const newWords = [...existingWords];
          newWords.splice(index, 2); // Remove both words in the pair
          updateMomentConfig(moment.id, { ...moment.config, words: newWords });
        };
        
        return (
          <div className="space-y-4">
            <div>
              <Label>Instruktion till eleven</Label>
              <Input
                value={moment.config.instruction}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, instruction: e.target.value })}
                placeholder="Gräv fram ord och avgör om de är substantiv"
              />
            </div>
            <div>
              <Label>Lägg till ordpar (substantiv och icke-substantiv)</Label>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-sm">Substantiv</Label>
                  <Input
                    value={piratgravWord1}
                    onChange={(e) => setPiratgravWord1(e.target.value)}
                    placeholder="t.ex. katt"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-sm">Icke-substantiv</Label>
                  <Input
                    value={piratgravWord2}
                    onChange={(e) => setPiratgravWord2(e.target.value)}
                    placeholder="t.ex. springa"
                  />
                </div>
                <Button 
                  onClick={addWordPair}
                  disabled={!piratgravWord1.trim() || !piratgravWord2.trim()}
                  className="whitespace-nowrap"
                >
                  Lägg till par
                </Button>
              </div>
              
              {existingWords.length > 0 && (
                <div className="mt-4">
                  <Label className="text-sm mb-2 block">Tillagda ordpar:</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {Array.from({length: Math.ceil(existingWords.length / 2)}).map((_, pairIndex) => {
                      const index = pairIndex * 2;
                      const word1 = existingWords[index];
                      const word2 = existingWords[index + 1];
                      if (!word1 || !word2) return null;
                      
                      return (
                        <div key={pairIndex} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <div className="flex gap-4">
                            <span className="font-medium text-green-600">{word1.w} (substantiv)</span>
                            <span className="font-medium text-blue-600">{word2.w} (icke-substantiv)</span>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => removeWordPair(index)}
                          >
                            Ta bort
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {existingWords.length === 0 && (
                <div className="text-xs text-gray-500 mt-2">
                  Lämna tomt för att använda standardorden
                </div>
              )}
            </div>
          </div>
        );

      case 'slutprov':
        const addSentence = () => {
          const sentences = moment.config.sentences || [];
          const targetWords = moment.config.targetWords || [];
          const newSentences = [...sentences, ''];
          const newTargetWords = [...targetWords, ''];
          updateMomentConfig(moment.id, { 
            ...moment.config, 
            sentences: newSentences,
            targetWords: newTargetWords
          });
        };
        
        const updateSentence = (index: number, value: string) => {
          const sentences = moment.config.sentences || [];
          const newSentences = [...sentences];
          newSentences[index] = value;
          updateMomentConfig(moment.id, { ...moment.config, sentences: newSentences });
        };
        
        const updateTargetWords = (index: number, value: string) => {
          const targetWords = moment.config.targetWords || [];
          const newTargetWords = [...targetWords];
          newTargetWords[index] = value;
          updateMomentConfig(moment.id, { ...moment.config, targetWords: newTargetWords });
        };
        
        const removeSentence = (index: number) => {
          const sentences = moment.config.sentences || [];
          const targetWords = moment.config.targetWords || [];
          const newSentences = sentences.filter((_: string, i: number) => i !== index);
          const newTargetWords = targetWords.filter((_: string, i: number) => i !== index);
          updateMomentConfig(moment.id, { 
            ...moment.config, 
            sentences: newSentences,
            targetWords: newTargetWords
          });
        };
        
        return (
          <div className="space-y-4">
            <div>
              <Label>Instruktion till eleven</Label>
              <Input
                value={moment.config.instruction || 'Klicka på ord av rätt ordklass'}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, instruction: e.target.value })}
                placeholder="Klicka på ord av rätt ordklass"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Antal rätt för godkänt</Label>
                <Input
                  type="number"
                  min="1"
                  value={moment.config.requiredCorrect || 5}
                  onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, requiredCorrect: parseInt(e.target.value) || 5 })}
                  placeholder="5"
                />
              </div>
              <div>
                <Label>Tidsgräns (sekunder)</Label>
                <Input
                  type="number"
                  min="10"
                  value={moment.config.timeLimit || 60}
                  onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, timeLimit: parseInt(e.target.value) || 60 })}
                  placeholder="60"
                />
              </div>
              <div>
                <Label>Strafftid vid fel (sekunder)</Label>
                <Input
                  type="number"
                  min="0"
                  value={moment.config.penaltySeconds || 5}
                  onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, penaltySeconds: parseInt(e.target.value) || 5 })}
                  placeholder="5"
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Meningar för slutprovet</Label>
                <Button onClick={addSentence} size="sm">
                  Lägg till mening
                </Button>
              </div>
              
              <div className="space-y-4 max-h-60 overflow-y-auto">
                {(moment.config.sentences || []).map((sentence: string, index: number) => (
                  <div key={index} className="space-y-2 p-4 border rounded-lg bg-gray-50">
                    <div className="flex justify-between items-center">
                      <Label className="font-semibold">Mening {index + 1}</Label>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeSentence(index)}
                      >
                        Ta bort
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-sm">Mening:</Label>
                        <Textarea
                          value={sentence}
                          onChange={(e) => updateSentence(index, e.target.value)}
                          placeholder="Skriv en mening här..."
                          className="min-h-[40px] resize-none"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Ord att klicka på (separera med komma):</Label>
                        <Input
                          value={(moment.config.targetWords || [])[index] || ''}
                          onChange={(e) => updateTargetWords(index, e.target.value)}
                          placeholder="t.ex. katt, hund, bil"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          Ange vilka ord eleven ska klicka på i denna mening
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {(!moment.config.sentences || moment.config.sentences.length === 0) && (
                <div className="text-xs text-gray-500 mt-2">
                  Lägg till meningar som eleverna ska analysera i slutprovet
                </div>
              )}
            </div>
          </div>
        );

      case 'slutdiplom':
        return (
          <div className="space-y-4">
            <div>
              <Label>Kursnamn</Label>
              <Input
                value={moment.config.courseName || ''}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, courseName: e.target.value })}
                placeholder="t.ex. Substantivkursen, Ordklasser nivå 1"
              />
            </div>
            <div>
              <Label>Diplom-titel</Label>
              <Input
                value={moment.config.diplomaTitle || 'Grattis!'}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, diplomaTitle: e.target.value })}
                placeholder="Grattis!"
              />
            </div>
            <div>
              <Label>Meddelande</Label>
              <Textarea
                value={moment.config.message || 'Du har slutfört kursen med framgång!'}
                onChange={(e) => updateMomentConfig(moment.id, { ...moment.config, message: e.target.value })}
                placeholder="Du har slutfört kursen med framgång!"
                className="min-h-[80px]"
              />
            </div>
            <div>
              <Label>Visa detaljerad statistik</Label>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  checked={moment.config.showStats !== false}
                  onCheckedChange={(checked) => updateMomentConfig(moment.id, { ...moment.config, showStats: !!checked })}
                />
                <Label className="text-sm">Visa antal rätt och fel svar</Label>
              </div>
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
                <div className="space-y-2">
                  {(moment.config.items || []).map((item: any, index: number) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <Badge variant={item.type === 'text' ? 'default' : 'secondary'} className="text-xs">
                        {item.order}. {item.type === 'text' ? 'Text' : 'Fråga'}
                      </Badge>
                      <p className="text-sm truncate">
                        {item.content || '(tomt innehåll)'}
                      </p>
                    </div>
                  ))}
                  {(!moment.config.items || moment.config.items.length === 0) && (
                    <p className="text-gray-500">Ingen text ännu...</p>
                  )}
                </div>
                
                {moment.config.question && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold mb-2">{moment.config.question}</h4>
                    <div className="space-y-2">
                      {(moment.config.alternatives || []).map((alt: any, index: number) => (
                        <div 
                          key={index} 
                          className={`p-2 border rounded text-sm ${
                            alt.correct ? 'border-green-300 bg-green-50' : 'border-gray-300'
                          }`}
                        >
                          {alt.text} {alt.correct && '✓'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
        const gridData = moment.config.grid || [];
        const gridSize = 15;
        
        const getCellData = (x: number, y: number) => {
          return gridData.find((cell: any) => cell.x === x && cell.y === y);
        };
        
        return (
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-xl font-bold mb-6">Korsord</h3>
            <div className="bg-white border rounded-lg p-6">
              <div className="grid gap-1 mb-6 max-w-2xl mx-auto" style={{gridTemplateColumns: 'repeat(15, 1fr)'}}>
                {Array.from({length: gridSize * gridSize}).map((_, index) => {
                  const x = index % gridSize;
                  const y = Math.floor(index / gridSize);
                  const cellData = getCellData(x, y);
                  
                  return (
                    <div key={`${x}-${y}`} className="relative">
                      {cellData?.isInputBox ? (
                        <div className="w-8 h-8 border-2 border-gray-800 bg-white relative flex items-center justify-center">
                          <Input
                            className="w-full h-full p-0 text-center text-lg font-bold border-0 bg-transparent focus:ring-0 focus:border-0"
                            maxLength={1}
                            style={{ fontSize: '16px' }}
                          />
                          {cellData?.number && (
                            <div className="absolute top-0 left-0 text-xs font-bold text-blue-600 pointer-events-none bg-white px-1">
                              {cellData.number}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-8 h-8 border border-gray-300 bg-gray-100"></div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {(moment.config.clues || []).length > 0 && (
                <div className="text-left max-w-2xl mx-auto">
                  <h4 className="font-semibold mb-3 text-lg">Ledtrådar:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(moment.config.clues || []).map((clue: any, i: number) => (
                      <div key={i} className="text-sm mb-2 p-2 bg-gray-50 rounded">
                        <span className="font-semibold">{i + 1}.</span> {clue.question}
                        <div className="text-xs text-gray-600 mt-1">
                          ({clue.answer?.length || 0} bokstäver)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {!(moment.config.clues || []).length && (
                <div className="text-gray-500 text-center py-8">
                  <div className="text-2xl mb-2">🔤</div>
                  <p>Lägg till korsordsfrågor för att se dem här</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'slutdiplom':
        return (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-4 border-yellow-400 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-2xl font-bold text-yellow-700 mb-2">
                {moment.config.diplomaTitle || 'Grattis!'}
              </h3>
              <div className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-4 mb-4">
                <h4 className="font-bold text-lg text-yellow-800">
                  {moment.config.courseName || 'Kursnamn'}
                </h4>
              </div>
              <p className="text-gray-700 mb-4">
                {moment.config.message || 'Du har slutfört kursen med framgång!'}
              </p>
              {moment.config.showStats !== false && (
                <div className="bg-white border-2 border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="text-sm text-gray-600 mb-2">📊 Resultatstatistik</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-green-100 p-2 rounded">Rätt svar</div>
                    <div className="bg-red-100 p-2 rounded">Fel svar</div>
                    <div className="bg-blue-100 p-2 rounded">Resultat %</div>
                  </div>
                </div>
              )}
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
                disabled={!currentLesson.moments || currentLesson.moments.length === 0}
              >
                👁️ Förhandsgranska
              </Button>
              <div className="flex space-x-2">
                <LessonTemplates onSelectTemplate={loadFromTemplate} />
                <Button variant="outline" onClick={() => setShowLoadDialog(true)}>📂 Ladda</Button>
                <Button variant="outline" onClick={() => setShowMergeDialog(true)}>🔗 Slå samman</Button>
                <Button variant="outline" onClick={newLesson}>🆕 Ny</Button>
                <Button variant="outline" onClick={() => setShowValidation(!showValidation)}>
                  ✅ Validera
                </Button>
                <Button onClick={saveLesson}>💾 Spara</Button>
                <Button variant="outline" onClick={exportLesson}>📤 Exportera</Button>
                <Button 
                  onClick={handlePublish}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={publishLessonMutation.isPending}
                >
                  {publishLessonMutation.isPending ? 
                    (editingLessonId ? '💾 Uppdaterar...' : '📤 Publicerar...') : 
                    (editingLessonId ? '💾 Uppdatera' : '🚀 Publicera')
                  }
                </Button>
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
                
                <div>
                  <Label>Bakgrund</Label>
                  <Select
                    value={currentLesson.background}
                    onValueChange={(value) => setCurrentLesson({ ...currentLesson, background: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Välj bakgrund" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beach">Strand</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {currentLesson.moments && currentLesson.moments.length > 0 && (
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
                {!currentLesson.moments || currentLesson.moments.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-4">📝</div>
                    <h3 className="text-lg font-medium mb-2">Skapa din första lektion</h3>
                    <p className="mb-4">Välj moment från vänstra menyn eller använd en färdig mall</p>
                    <div className="space-y-4">
                      <LessonTemplates onSelectTemplate={loadFromTemplate} />
                      <div className="text-sm text-gray-600">eller välj ett moment nedan:</div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" onClick={() => addMoment('ordracet')}>
                          🏃‍♂️ Ordracet
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => addMoment('quiz')}>
                          ❓ Quiz
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => addMoment('pratbubbla')}>
                          💬 Pratbubbla
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => addMoment('gissa-ordet')}>
                          🎯 Gissa ordet
                        </Button>
                      </div>
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
          
          {currentLesson.moments && currentLesson.moments.length > 0 && (
            <div className="space-y-6">
              {/* Progress bar */}
              <div className="flex items-center space-x-4">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${((currentPreviewMoment + 1) / (currentLesson.moments || []).length) * 100}%`
                    }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600">
                  {currentPreviewMoment + 1} / {(currentLesson.moments || []).length}
                </span>
              </div>

              {/* Current moment preview */}
              <div className="min-h-96 bg-gray-50 rounded-lg p-8">
                {currentLesson.moments[currentPreviewMoment] ? (
                  <InteractivePreview 
                    moment={currentLesson.moments[currentPreviewMoment]}
                    lesson={currentLesson}
                    onNext={() => setCurrentPreviewMoment(Math.min((currentLesson.moments || []).length - 1, currentPreviewMoment + 1))}
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
                  onClick={() => setCurrentPreviewMoment(Math.min((currentLesson.moments || []).length - 1, currentPreviewMoment + 1))}
                  disabled={currentPreviewMoment === (currentLesson.moments || []).length - 1}
                >
                  Nästa →
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Publicera lektion</DialogTitle>
            <DialogDescription>
              Publicerad lektion blir tillgänglig i huvudmenyn under vald ordklass
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Ordklass *</Label>
              <Select
                value={publishData.wordClass}
                onValueChange={(value) => setPublishData({...publishData, wordClass: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj ordklass" />
                </SelectTrigger>
                <SelectContent>
                  {(wordClasses as any[]).map((wc: any) => (
                    <SelectItem key={wc.id} value={wc.name}>{wc.swedishName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Svårighetsgrad</Label>
              <Select
                value={publishData.difficulty}
                onValueChange={(value) => setPublishData({...publishData, difficulty: value})}
              >
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
              <Label>Beskrivning (valfritt)</Label>
              <Textarea
                value={publishData.description}
                onChange={(e) => setPublishData({...publishData, description: e.target.value})}
                placeholder="Kort beskrivning av vad lektionen handlar om..."
                className="min-h-[80px]"
              />
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setShowPublishDialog(false)}
            >
              Avbryt
            </Button>
            <Button
              onClick={confirmPublish}
              disabled={publishLessonMutation.isPending}
            >
              {publishLessonMutation.isPending ? 'Publicerar...' : 'Publicera'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Merge Lessons Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Slå samman lektioner</DialogTitle>
            <DialogDescription>
              Välj två lektioner att slå samman och bestäm hur de ska kombineras
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Lesson Selection */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Första lektionen</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Utkast</h4>
                  {savedLessons.map((lesson: any) => (
                    <div key={`draft-${lesson.id}`} className={`p-3 border rounded cursor-pointer transition-colors ${
                      selectedLessons.lesson1?.id === lesson.id ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50'
                    }`} onClick={() => setSelectedLessons({...selectedLessons, lesson1: lesson})}>
                      <div className="font-medium">{lesson.title}</div>
                      <div className="text-sm text-gray-500">{lesson.content?.moments?.length || 0} moment</div>
                    </div>
                  ))}
                  
                  <h4 className="text-sm font-medium text-gray-600 mb-2 mt-4">Publicerade lektioner</h4>
                  {publishedLessons.map((lesson: any) => (
                    <div key={`published-${lesson.id}`} className={`p-3 border rounded cursor-pointer transition-colors ${
                      selectedLessons.lesson1?.id === lesson.id ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50'
                    }`} onClick={() => setSelectedLessons({...selectedLessons, lesson1: lesson})}>
                      <div className="font-medium">{lesson.title}</div>
                      <div className="text-sm text-gray-500">{lesson.content?.moments?.length || 0} moment</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Andra lektionen</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Utkast</h4>
                  {savedLessons.map((lesson: any) => (
                    <div key={`draft2-${lesson.id}`} className={`p-3 border rounded cursor-pointer transition-colors ${
                      selectedLessons.lesson2?.id === lesson.id ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'
                    }`} onClick={() => setSelectedLessons({...selectedLessons, lesson2: lesson})}>
                      <div className="font-medium">{lesson.title}</div>
                      <div className="text-sm text-gray-500">{lesson.content?.moments?.length || 0} moment</div>
                    </div>
                  ))}
                  
                  <h4 className="text-sm font-medium text-gray-600 mb-2 mt-4">Publicerade lektioner</h4>
                  {publishedLessons.map((lesson: any) => (
                    <div key={`published2-${lesson.id}`} className={`p-3 border rounded cursor-pointer transition-colors ${
                      selectedLessons.lesson2?.id === lesson.id ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'
                    }`} onClick={() => setSelectedLessons({...selectedLessons, lesson2: lesson})}>
                      <div className="font-medium">{lesson.title}</div>
                      <div className="text-sm text-gray-500">{lesson.content?.moments?.length || 0} moment</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Selected Lessons Preview */}
            {(selectedLessons.lesson1 || selectedLessons.lesson2) && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">Valda lektioner</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded border">
                    <h4 className="font-medium text-blue-800">Första lektionen</h4>
                    {selectedLessons.lesson1 ? (
                      <div>
                        <div className="font-medium">{selectedLessons.lesson1.title}</div>
                        <div className="text-sm text-gray-600">{(selectedLessons.lesson1.content?.moments || selectedLessons.lesson1.moments || []).length} moment</div>
                      </div>
                    ) : (
                      <div className="text-gray-500">Ingen lektion vald</div>
                    )}
                  </div>
                  <div className="p-3 bg-green-50 rounded border">
                    <h4 className="font-medium text-green-800">Andra lektionen</h4>
                    {selectedLessons.lesson2 ? (
                      <div>
                        <div className="font-medium">{selectedLessons.lesson2.title}</div>
                        <div className="text-sm text-gray-600">{(selectedLessons.lesson2.content?.moments || selectedLessons.lesson2.moments || []).length} moment</div>
                      </div>
                    ) : (
                      <div className="text-gray-500">Ingen lektion vald</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Merge Options */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">Alternativ för sammanslagning</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Var ska de sammanslagna momenten placeras?</Label>
                  <Select
                    value={mergeOptions.insertPosition}
                    onValueChange={(value: 'beginning' | 'end' | 'replace') => 
                      setMergeOptions({...mergeOptions, insertPosition: value})
                    }
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginning">I början (före nuvarande moment)</SelectItem>
                      <SelectItem value="end">I slutet (efter nuvarande moment)</SelectItem>
                      <SelectItem value="replace">Ersätt nuvarande lektion helt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="preserveMetadata"
                    checked={mergeOptions.preserveMetadata}
                    onCheckedChange={(checked) => 
                      setMergeOptions({...mergeOptions, preserveMetadata: !!checked})
                    }
                  />
                  <Label htmlFor="preserveMetadata" className="text-sm">
                    Behåll metadata (titel, ordklass, bakgrund) från första lektionen
                  </Label>
                </div>
              </div>
            </div>
            
            {/* Preview Result */}
            {selectedLessons.lesson1 && selectedLessons.lesson2 && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">Förhandsvisning av resultat</h3>
                <div className="p-4 bg-gray-50 rounded border">
                  <div className="text-sm space-y-1">
                    <div>Totalt antal moment: {(
                      (selectedLessons.lesson1.content?.moments || selectedLessons.lesson1.moments || []).length +
                      (selectedLessons.lesson2.content?.moments || selectedLessons.lesson2.moments || []).length +
                      (mergeOptions.insertPosition === 'replace' ? 0 : currentLesson.moments.length)
                    )}</div>
                    <div>Från "{selectedLessons.lesson1.title}": {(selectedLessons.lesson1.content?.moments || selectedLessons.lesson1.moments || []).length} moment</div>
                    <div>Från "{selectedLessons.lesson2.title}": {(selectedLessons.lesson2.content?.moments || selectedLessons.lesson2.moments || []).length} moment</div>
                    {mergeOptions.insertPosition !== 'replace' && (
                      <div>Från nuvarande lektion: {currentLesson.moments.length} moment</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowMergeDialog(false);
                setSelectedLessons({lesson1: null, lesson2: null});
              }}
            >
              Avbryt
            </Button>
            <Button
              onClick={mergeLessons}
              disabled={!selectedLessons.lesson1 || !selectedLessons.lesson2}
            >
              Slå samman lektioner
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Load Lesson Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sparade lektionsutkast</DialogTitle>
            <DialogDescription>
              Välj ett utkast att ladda in i redigeraren
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(savedLessons as any[]).length === 0 ? (
              <div className="col-span-2 text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="text-lg font-medium mb-2">Inga sparade utkast</h3>
                <p>Du har inga sparade lektionsutkast än. Skapa en lektion och spara den som utkast först.</p>
              </div>
            ) : (
              (savedLessons as any[]).map((draft: any) => (
                <Card key={draft.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{draft.title}</CardTitle>
                      <Badge variant="outline">
                        {draft.wordClass || 'Ingen ordklass'}
                      </Badge>
                    </div>
                    {draft.description && (
                      <p className="text-sm text-gray-600">{draft.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Moment:</span>
                        <span className="font-medium">{draft.content?.moments?.length || 0} stycken</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Uppdaterad:</span>
                        <span>{new Date(draft.updatedAt).toLocaleDateString('sv-SE')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Svårighet:</span>
                        <span className="capitalize">{draft.difficulty || 'medium'}</span>
                      </div>
                      <div className="flex space-x-2 mt-4">
                        <Button 
                          onClick={() => loadFromDraft(draft)}
                          className="flex-1"
                          size="sm"
                        >
                          📂 Ladda
                        </Button>
                        <Button 
                          onClick={() => deleteDraft(draft.id)}
                          variant="destructive"
                          size="sm"
                          disabled={deleteLessonMutation.isPending}
                        >
                          🗑️
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}