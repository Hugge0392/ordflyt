import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Plus, 
  BookOpen, 
  Edit, 
  Trash2, 
  Copy,
  Eye,
  EyeOff,
  Settings,
  Palette,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Image,
  Volume2,
  PlayCircle,
  Target,
  Clock,
  Award,
  Users,
  Sparkles,
  Download,
  FileDown,
  Printer
} from "lucide-react";
import { 
  type VocabularySet, 
  type VocabularyWord,
  type VocabularyExercise,
  insertVocabularySetSchema,
  insertVocabularyWordSchema,
  insertVocabularyExerciseSchema
} from "@shared/schema";

// Vocabulary exercise types
const EXERCISE_TYPES = [
  { value: 'flashcards', label: 'Flashcards', description: 'Traditional flashcard practice' },
  { value: 'multiple_choice', label: 'Multiple Choice', description: 'Choose the correct definition' },
  { value: 'fill_in_blank', label: 'Fill in the Blank', description: 'Complete sentences with vocabulary words' },
  { value: 'matching', label: 'Matching', description: 'Match words to definitions' },
  { value: 'word_association', label: 'Word Association', description: 'Connect related words' },
  { value: 'sentence_completion', label: 'Sentence Completion', description: 'Complete sentences meaningfully' },
  { value: 'definition_matching', label: 'Definition Matching', description: 'Match definitions to words' },
  { value: 'synonym_antonym', label: 'Synonym/Antonym', description: 'Practice synonyms and antonyms' },
  { value: 'image_matching', label: 'Image Matching', description: 'Match words to images' },
  { value: 'spelling', label: 'Spelling', description: 'Practice spelling vocabulary words' }
];

// Theme colors for vocabulary sets
const THEME_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Indigo', value: '#6366F1' }
];

// Form schemas
const vocabularySetSchema = insertVocabularySetSchema.extend({
  title: z.string().min(1, "Titel krävs").max(255, "Titel för lång"),
  description: z.string().optional(),
  themeColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Ogiltig färg"),
  frameColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Ogiltig färg"),
  orderNumbersColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Ogiltig färg"),
  bannerImage: z.string().optional(),
  isPublished: z.boolean().default(false),
});

const vocabularyWordSchema = insertVocabularyWordSchema.extend({
  term: z.string().min(1, "Ord krävs").max(255, "Ord för långt"),
  definition: z.string().min(1, "Definition krävs"),
  synonym: z.string().optional(),
  antonym: z.string().optional(),
  example: z.string().optional(),
  imageUrl: z.string().optional(),
  pronunciationUrl: z.string().optional(),
  phonetic: z.string().optional(),
  orderIndex: z.number().default(0),
});

const vocabularyExerciseSchema = insertVocabularyExerciseSchema.extend({
  title: z.string().min(1, "Titel krävs").max(255, "Titel för lång"),
  description: z.string().optional(),
  instructions: z.string().optional(),
  timeLimit: z.number().optional(),
  pointsPerCorrect: z.number().min(1).default(10),
  minPassingScore: z.number().min(0).max(100).default(70),
  allowRetries: z.boolean().default(true),
  isActive: z.boolean().default(true),
  orderIndex: z.number().default(0),
  config: z.record(z.unknown()).default({}),
});

// Dynamic exercise configuration schemas
const getExerciseConfigSchema = (exerciseType: string) => {
  switch (exerciseType) {
    case 'flashcards':
      return z.object({
        showPhonetics: z.boolean().default(true),
        showImages: z.boolean().default(true),
        autoAdvance: z.boolean().default(false),
        shuffleCards: z.boolean().default(true),
      });
    case 'multiple_choice':
      return z.object({
        numberOfOptions: z.number().min(2).max(6).default(4),
        showImages: z.boolean().default(false),
        randomizeOptions: z.boolean().default(true),
      });
    case 'fill_in_blank':
      return z.object({
        caseSensitive: z.boolean().default(false),
        allowPartialCredit: z.boolean().default(true),
        showHints: z.boolean().default(true),
      });
    case 'matching':
      return z.object({
        maxPairs: z.number().min(4).max(12).default(8),
        showImages: z.boolean().default(true),
        allowDragDrop: z.boolean().default(true),
      });
    case 'word_association':
      return z.object({
        numberOfAssociations: z.number().min(2).max(8).default(4),
        includeAntonyms: z.boolean().default(true),
        includeSynonyms: z.boolean().default(true),
      });
    case 'sentence_completion':
      return z.object({
        providedWords: z.array(z.string()).default([]),
        allowFreeText: z.boolean().default(false),
        maxWords: z.number().min(1).max(20).default(10),
      });
    case 'definition_matching':
      return z.object({
        showExamples: z.boolean().default(true),
        reverseMode: z.boolean().default(false),
        includeDistractors: z.boolean().default(true),
      });
    case 'synonym_antonym':
      return z.object({
        focusOn: z.enum(['synonyms', 'antonyms', 'both']).default('both'),
        difficultyLevel: z.enum(['easy', 'medium', 'hard']).default('medium'),
      });
    case 'image_matching':
      return z.object({
        requireImages: z.boolean().default(true),
        allowTextFallback: z.boolean().default(false),
        gridSize: z.enum(['2x2', '3x3', '4x4']).default('3x3'),
      });
    case 'spelling':
      return z.object({
        showDefinition: z.boolean().default(true),
        allowHints: z.boolean().default(true),
        maxAttempts: z.number().min(1).max(5).default(3),
      });
    default:
      return z.object({});
  }
};

type VocabularySetForm = z.infer<typeof vocabularySetSchema>;
type VocabularyWordForm = z.infer<typeof vocabularyWordSchema>;
type VocabularyExerciseForm = z.infer<typeof vocabularyExerciseSchema>;

// Sortable word item component
function SortableWordItem({ word, onEdit, onDelete }: { 
  word: VocabularyWord, 
  onEdit: (word: VocabularyWord) => void,
  onDelete: (id: string) => void 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: word.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-white border rounded-lg hover:bg-gray-50 ${
        isDragging ? 'opacity-50 shadow-lg z-10' : ''
      }`}
      data-testid={`word-item-${word.id}`}
    >
      <div 
        className="cursor-grab text-gray-400 hover:text-gray-600 touch-none"
        {...attributes}
        {...listeners}
        data-testid={`drag-handle-word-${word.id}`}
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-900" data-testid={`text-word-term-${word.id}`}>
            {word.term}
          </span>
          {word.phonetic && (
            <span 
              className="text-sm text-gray-500 font-mono" 
              data-testid={`text-word-phonetic-${word.id}`}
            >
              /{word.phonetic}/
            </span>
          )}
          {word.pronunciationUrl && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              data-testid={`button-play-pronunciation-${word.id}`}
            >
              <Volume2 className="w-3 h-3" />
            </Button>
          )}
        </div>
        <p 
          className="text-sm text-gray-600 truncate" 
          data-testid={`text-word-definition-${word.id}`}
        >
          {word.definition}
        </p>
        {(word.synonym || word.antonym) && (
          <div className="flex gap-4 mt-1 text-xs" data-testid={`word-synonyms-antonyms-${word.id}`}>
            {word.synonym && (
              <span className="text-green-600" data-testid={`text-word-synonym-${word.id}`}>
                Synonym: {word.synonym}
              </span>
            )}
            {word.antonym && (
              <span className="text-red-600" data-testid={`text-word-antonym-${word.id}`}>
                Antonym: {word.antonym}
              </span>
            )}
          </div>
        )}
      </div>
      {word.imageUrl && (
        <div 
          className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center"
          data-testid={`image-preview-word-${word.id}`}
        >
          <Image className="w-6 h-6 text-gray-400" />
        </div>
      )}
      <div className="flex gap-1" data-testid={`word-actions-${word.id}`}>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onEdit(word)}
          data-testid={`button-edit-word-${word.id}`}
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          className="text-red-600 hover:text-red-700"
          onClick={() => onDelete(word.id)}
          data-testid={`button-delete-word-${word.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminVocabulary() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Main state
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedSet, setSelectedSet] = useState<VocabularySet | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPublished, setFilterPublished] = useState<boolean | null>(null);
  
  // Dialog states
  const [isCreateSetDialogOpen, setIsCreateSetDialogOpen] = useState(false);
  const [isEditSetDialogOpen, setIsEditSetDialogOpen] = useState(false);
  const [isWordDialogOpen, setIsWordDialogOpen] = useState(false);
  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<VocabularyWord | null>(null);
  const [editingExercise, setEditingExercise] = useState<VocabularyExercise | null>(null);
  
  // PDF export state
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [batchExportDialog, setBatchExportDialog] = useState(false);
  const [selectedExportSets, setSelectedExportSets] = useState<string[]>([]);

  // Collapsible sections state
  const [sectionsOpen, setSectionsOpen] = useState({
    setDetails: true,
    words: true,
    exercises: true
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Set page title and meta description
  useEffect(() => {
    document.title = "Vocabulary Builder | Admin";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Skapa och hantera ordförråd för svenska lektioner.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Skapa och hantera ordförråd för svenska lektioner.';
      document.head.appendChild(meta);
    }
  }, []);

  // Data fetching
  const { data: vocabularySets = [], isLoading: setsLoading } = useQuery<VocabularySet[]>({
    queryKey: ["/api/vocabulary/sets"],
  });

  const { data: selectedSetWords = [], isLoading: wordsLoading } = useQuery<VocabularyWord[]>({
    queryKey: ["/api/vocabulary/sets", selectedSet?.id, "words"],
    enabled: !!selectedSet?.id,
  });

  const { data: selectedSetExercises = [], isLoading: exercisesLoading } = useQuery<VocabularyExercise[]>({
    queryKey: ["/api/vocabulary/sets", selectedSet?.id, "exercises"],
    enabled: !!selectedSet?.id,
  });

  // Forms
  const setForm = useForm<VocabularySetForm>({
    resolver: zodResolver(vocabularySetSchema),
    defaultValues: {
      title: "",
      description: "",
      themeColor: "#3B82F6",
      frameColor: "#1F2937", 
      orderNumbersColor: "#F59E0B",
      bannerImage: "",
      isPublished: false,
    },
  });

  const wordForm = useForm<VocabularyWordForm>({
    resolver: zodResolver(vocabularyWordSchema),
    defaultValues: {
      term: "",
      definition: "",
      synonym: "",
      antonym: "",
      example: "",
      imageUrl: "",
      pronunciationUrl: "",
      phonetic: "",
      orderIndex: 0,
    },
  });

  const exerciseForm = useForm<VocabularyExerciseForm>({
    resolver: zodResolver(vocabularyExerciseSchema),
    defaultValues: {
      title: "",
      description: "",
      instructions: "",
      type: "flashcards",
      timeLimit: undefined,
      pointsPerCorrect: 10,
      minPassingScore: 70,
      allowRetries: true,
      isActive: true,
      orderIndex: 0,
      config: {},
    },
  });

  // Watch exercise type for dynamic configuration
  const watchedExerciseType = exerciseForm.watch('type');

  // Mutations for vocabulary sets
  const createSetMutation = useMutation({
    mutationFn: async (data: VocabularySetForm) => {
      return apiRequest('POST', '/api/vocabulary/sets', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vocabulary/sets"] });
      toast({
        title: "Framgång",
        description: "Ordförrådsset skapat!"
      });
      setIsCreateSetDialogOpen(false);
      setForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Fel",
        description: error.message || "Kunde inte skapa ordförrådsset",
        variant: "destructive"
      });
    }
  });

  const updateSetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<VocabularySetForm> }) => {
      return apiRequest('PUT', `/api/vocabulary/sets/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vocabulary/sets"] });
      if (selectedSet) {
        queryClient.invalidateQueries({ queryKey: ["/api/vocabulary/sets", selectedSet.id, "words"] });
        queryClient.invalidateQueries({ queryKey: ["/api/vocabulary/sets", selectedSet.id, "exercises"] });
      }
      toast({
        title: "Framgång",
        description: "Ordförrådsset uppdaterat!"
      });
      setIsEditSetDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Fel",
        description: error.message || "Kunde inte uppdatera ordförrådsset",
        variant: "destructive"
      });
    }
  });

  const deleteSetMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/vocabulary/sets/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vocabulary/sets"] });
      toast({
        title: "Framgång",
        description: "Ordförrådsset borttaget!"
      });
      if (selectedSet) {
        setSelectedSet(null);
        setActiveTab("overview");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Fel",
        description: error.message || "Kunde inte ta bort ordförrådsset",
        variant: "destructive"
      });
    }
  });

  // Mutations for vocabulary words
  const createWordMutation = useMutation({
    mutationFn: async (data: VocabularyWordForm & { setId: string }) => {
      return apiRequest('POST', `/api/vocabulary/sets/${data.setId}/words`, data);
    },
    onSuccess: () => {
      if (selectedSet) {
        queryClient.invalidateQueries({ queryKey: ["/api/vocabulary/sets", selectedSet.id, "words"] });
      }
      toast({
        title: "Framgång",
        description: "Ord tillagt!"
      });
      setIsWordDialogOpen(false);
      wordForm.reset();
      setEditingWord(null);
    },
    onError: (error: any) => {
      toast({
        title: "Fel",
        description: error.message || "Kunde inte lägga till ord",
        variant: "destructive"
      });
    }
  });

  const updateWordMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<VocabularyWordForm> }) => {
      return apiRequest('PUT', `/api/vocabulary/words/${id}`, data);
    },
    onSuccess: () => {
      if (selectedSet) {
        queryClient.invalidateQueries({ queryKey: ["/api/vocabulary/sets", selectedSet.id, "words"] });
      }
      toast({
        title: "Framgång",
        description: "Ord uppdaterat!"
      });
      setIsWordDialogOpen(false);
      setEditingWord(null);
    },
    onError: (error: any) => {
      toast({
        title: "Fel",
        description: error.message || "Kunde inte uppdatera ord",
        variant: "destructive"
      });
    }
  });

  const deleteWordMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/vocabulary/words/${id}`, {});
    },
    onSuccess: () => {
      if (selectedSet) {
        queryClient.invalidateQueries({ queryKey: ["/api/vocabulary/sets", selectedSet.id, "words"] });
      }
      toast({
        title: "Framgång",
        description: "Ord borttaget!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fel",
        description: error.message || "Kunde inte ta bort ord",
        variant: "destructive"
      });
    }
  });

  // Mutations for vocabulary exercises
  const createExerciseMutation = useMutation({
    mutationFn: async (data: VocabularyExerciseForm & { setId: string }) => {
      return apiRequest('POST', `/api/vocabulary/sets/${data.setId}/exercises`, data);
    },
    onSuccess: () => {
      if (selectedSet) {
        queryClient.invalidateQueries({ queryKey: ["/api/vocabulary/sets", selectedSet.id, "exercises"] });
      }
      toast({
        title: "Framgång",
        description: "Övning skapad!"
      });
      setIsExerciseDialogOpen(false);
      exerciseForm.reset();
      setEditingExercise(null);
    },
    onError: (error: any) => {
      toast({
        title: "Fel",
        description: error.message || "Kunde inte skapa övning",
        variant: "destructive"
      });
    }
  });

  const updateExerciseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<VocabularyExerciseForm> }) => {
      return apiRequest('PUT', `/api/vocabulary/exercises/${id}`, data);
    },
    onSuccess: () => {
      if (selectedSet) {
        queryClient.invalidateQueries({ queryKey: ["/api/vocabulary/sets", selectedSet.id, "exercises"] });
      }
      toast({
        title: "Framgång",
        description: "Övning uppdaterad!"
      });
      setIsExerciseDialogOpen(false);
      setEditingExercise(null);
    },
    onError: (error: any) => {
      toast({
        title: "Fel",
        description: error.message || "Kunde inte uppdatera övning",
        variant: "destructive"
      });
    }
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/vocabulary/exercises/${id}`, {});
    },
    onSuccess: () => {
      if (selectedSet) {
        queryClient.invalidateQueries({ queryKey: ["/api/vocabulary/sets", selectedSet.id, "exercises"] });
      }
      toast({
        title: "Framgång",
        description: "Övning borttagen!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fel",
        description: error.message || "Kunde inte ta bort övning",
        variant: "destructive"
      });
    }
  });

  // PDF Export Functions
  const exportVocabularySetPDF = async (setId: string, options: any) => {
    try {
      setExportLoading(true);
      
      // Use apiRequest to handle CSRF tokens automatically
      const response = await fetch(`/api/vocabulary/sets/${setId}/export/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': await (async () => {
            try {
              const res = await fetch('/api/auth/me', { credentials: "include" });
              if (res.ok) {
                const data = await res.json();
                return data.csrfToken || '';
              }
            } catch (e) {
              console.warn('Failed to get CSRF token:', e);
            }
            return localStorage.getItem('csrfToken') || '';
          })(),
        },
        credentials: "include",
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to export PDF');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `vocabulary_export_${new Date().toISOString().split('T')[0]}.pdf`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export framgångsrik",
        description: "PDF:en har laddats ner framgångsrikt.",
      });
      
      // Only close dialog on success
      setIsExportDialogOpen(false);
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Export misslyckades",
        description: error.message || "Kunde inte exportera PDF. Försök igen.",
        variant: "destructive",
      });
      // Keep dialog open on error so user can retry
    } finally {
      setExportLoading(false);
    }
  };

  const exportBatchVocabularyPDF = async (setIds: string[], options: any) => {
    try {
      setExportLoading(true);
      
      // Use proper CSRF token handling
      const response = await fetch('/api/vocabulary/export/batch/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': await (async () => {
            try {
              const res = await fetch('/api/auth/me', { credentials: "include" });
              if (res.ok) {
                const data = await res.json();
                return data.csrfToken || '';
              }
            } catch (e) {
              console.warn('Failed to get CSRF token:', e);
            }
            return localStorage.getItem('csrfToken') || '';
          })(),
        },
        credentials: "include",
        body: JSON.stringify({ setIds, ...options }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to export batch PDF');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `vocabulary_batch_export_${new Date().toISOString().split('T')[0]}.pdf`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Batch export framgångsrik",
        description: `${setIds.length} ordförrådsset har exporterats framgångsrikt.`,
      });
      
      // Only close dialog on success
      setBatchExportDialog(false);
    } catch (error: any) {
      console.error('Error exporting batch PDF:', error);
      toast({
        title: "Batch export misslyckades",
        description: error.message || "Kunde inte exportera PDF. Försök igen.",
        variant: "destructive",
      });
      // Keep dialog open on error so user can retry
    } finally {
      setExportLoading(false);
    }
  };

  const exportExerciseWorksheetPDF = async (exerciseId: string, options: any) => {
    try {
      setExportLoading(true);
      
      // Use proper CSRF token handling
      const response = await fetch(`/api/vocabulary/exercises/${exerciseId}/export/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': await (async () => {
            try {
              const res = await fetch('/api/auth/me', { credentials: "include" });
              if (res.ok) {
                const data = await res.json();
                return data.csrfToken || '';
              }
            } catch (e) {
              console.warn('Failed to get CSRF token:', e);
            }
            return localStorage.getItem('csrfToken') || '';
          })(),
        },
        credentials: "include",
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to export exercise worksheet PDF');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `exercise_worksheet_${new Date().toISOString().split('T')[0]}.pdf`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Övningsblad exporterat",
        description: "PDF-övningsbladet har laddats ner framgångsrikt.",
      });
    } catch (error: any) {
      console.error('Error exporting exercise worksheet PDF:', error);
      toast({
        title: "Export misslyckades",
        description: error.message || "Kunde inte exportera övningsbladet. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  // Event handlers
  const handleCreateSet = (data: VocabularySetForm) => {
    createSetMutation.mutate(data);
  };

  const handleUpdateSet = (data: VocabularySetForm) => {
    if (selectedSet) {
      updateSetMutation.mutate({ id: selectedSet.id, data });
    }
  };

  const handleCreateWord = (data: VocabularyWordForm) => {
    if (selectedSet) {
      createWordMutation.mutate({ ...data, setId: selectedSet.id });
    }
  };

  const handleUpdateWord = (data: VocabularyWordForm) => {
    if (editingWord) {
      updateWordMutation.mutate({ id: editingWord.id, data });
    }
  };

  const handleCreateExercise = (data: VocabularyExerciseForm) => {
    if (selectedSet) {
      createExerciseMutation.mutate({ ...data, setId: selectedSet.id });
    }
  };

  const handleUpdateExercise = (data: VocabularyExerciseForm) => {
    if (editingExercise) {
      updateExerciseMutation.mutate({ id: editingExercise.id, data });
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (active.id !== over.id && selectedSet) {
      const oldIndex = selectedSetWords.findIndex(word => word.id === active.id);
      const newIndex = selectedSetWords.findIndex(word => word.id === over.id);
      
      const newWords = arrayMove(selectedSetWords, oldIndex, newIndex);
      
      // Optimistic update
      queryClient.setQueryData(
        ['/api/vocabulary/sets', selectedSet.id, 'words'],
        newWords.map((word, index) => ({ ...word, orderIndex: index }))
      );
      
      // Update order indexes with mutation
      newWords.forEach((word, index) => {
        if (word.orderIndex !== index) {
          updateWordMutation.mutate(
            { 
              id: word.id, 
              data: { orderIndex: index } 
            },
            {
              onError: () => {
                // Revert optimistic update on error
                queryClient.invalidateQueries({ 
                  queryKey: ['/api/vocabulary/sets', selectedSet.id, 'words'] 
                });
              }
            }
          );
        }
      });
    }
  };

  const openEditWordDialog = (word: VocabularyWord) => {
    setEditingWord(word);
    wordForm.reset({
      term: word.term,
      definition: word.definition,
      synonym: word.synonym || "",
      antonym: word.antonym || "",
      example: word.example || "",
      imageUrl: word.imageUrl || "",
      pronunciationUrl: word.pronunciationUrl || "",
      phonetic: word.phonetic || "",
      orderIndex: word.orderIndex,
    });
    setIsWordDialogOpen(true);
  };

  const openEditExerciseDialog = (exercise: VocabularyExercise) => {
    setEditingExercise(exercise);
    exerciseForm.reset({
      title: exercise.title,
      description: exercise.description || "",
      instructions: exercise.instructions || "",
      type: exercise.type as any,
      timeLimit: exercise.timeLimit || undefined,
      pointsPerCorrect: exercise.pointsPerCorrect,
      minPassingScore: exercise.minPassingScore,
      allowRetries: exercise.allowRetries,
      isActive: exercise.isActive,
      orderIndex: exercise.orderIndex,
      config: exercise.config,
    });
    setIsExerciseDialogOpen(true);
  };

  const openEditSetDialog = (set: VocabularySet) => {
    setSelectedSet(set);
    setForm.reset({
      title: set.title,
      description: set.description || "",
      themeColor: set.themeColor,
      frameColor: set.frameColor,
      orderNumbersColor: set.orderNumbersColor,
      bannerImage: set.bannerImage || "",
      isPublished: set.isPublished,
    });
    setIsEditSetDialogOpen(true);
  };

  // Filter sets based on search and filters
  const filteredSets = vocabularySets.filter(set => {
    if (searchTerm && !set.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !(set.description && set.description.toLowerCase().includes(searchTerm.toLowerCase()))) {
      return false;
    }
    if (filterPublished !== null && set.isPublished !== filterPublished) {
      return false;
    }
    return true;
  });

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (setsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">📚</div>
          <div className="text-lg text-gray-600">Laddar ordförråd...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin">
            <Button variant="outline" size="sm" data-testid="button-back-admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka till admin
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-purple-600" />
              Ordförråd Builder
            </h1>
            <p className="text-gray-600">Skapa och hantera ordförråd för svenska lektioner</p>
          </div>
          <Button 
            onClick={() => setIsCreateSetDialogOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            data-testid="button-create-vocabulary-set"
          >
            <Plus className="w-4 h-4 mr-2" />
            Skapa Nytt Set
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="main-tabs">
          <TabsList className="mb-6" data-testid="tabs-list">
            <TabsTrigger value="overview" data-testid="tab-overview">
              Översikt ({vocabularySets.length})
            </TabsTrigger>
            {selectedSet && (
              <TabsTrigger value="builder" data-testid="tab-builder">
                {selectedSet.title} - Builder
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview">
            {/* Search and filters */}
            <Card className="mb-6" data-testid="search-filter-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" data-testid="search-filter-title">
                  <Search className="w-5 h-5" />
                  Sök och filtrera
                </CardTitle>
              </CardHeader>
              <CardContent data-testid="search-filter-content">
                <div className="flex gap-4 items-center" data-testid="search-filter-controls">
                  <div className="flex-1">
                    <Input
                      placeholder="Sök efter ordförrådsset..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      data-testid="input-search-vocabulary-sets"
                    />
                  </div>
                  <Select 
                    value={filterPublished === null ? "all" : filterPublished ? "published" : "draft"}
                    onValueChange={(value) => setFilterPublished(
                      value === "all" ? null : value === "published"
                    )}
                  >
                    <SelectTrigger className="w-48" data-testid="select-filter-published">
                      <SelectValue placeholder="Filtrera efter status" />
                    </SelectTrigger>
                    <SelectContent data-testid="filter-published-options">
                      <SelectItem value="all" data-testid="option-filter-all">Alla set</SelectItem>
                      <SelectItem value="published" data-testid="option-filter-published">Publicerade</SelectItem>
                      <SelectItem value="draft" data-testid="option-filter-draft">Utkast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8" data-testid="stats-grid">
              <Card data-testid="stat-card-total-sets">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium" data-testid="stat-label-total-sets">Totalt Sets</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-total-sets">{vocabularySets.length}</div>
                </CardContent>
              </Card>
              
              <Card data-testid="stat-card-published-sets">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium" data-testid="stat-label-published-sets">Publicerade</CardTitle>
                  <Eye className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600" data-testid="stat-published-sets">
                    {vocabularySets.filter(s => s.isPublished).length}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="stat-card-draft-sets">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium" data-testid="stat-label-draft-sets">Utkast</CardTitle>
                  <EyeOff className="h-4 w-4 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-600" data-testid="stat-draft-sets">
                    {vocabularySets.filter(s => !s.isPublished).length}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="stat-card-total-words">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium" data-testid="stat-label-total-words">Totalt Ord</CardTitle>
                  <Sparkles className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600" data-testid="stat-total-words">
                    {/* This would need to be calculated from all words across all sets */}
                    -
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Vocabulary Sets List */}
            <Card data-testid="vocabulary-sets-list-card">
              <CardHeader>
                <CardTitle data-testid="vocabulary-sets-title">Ordförrådsset</CardTitle>
                <CardDescription data-testid="vocabulary-sets-description">
                  Hantera alla ordförrådsset som elever kan använda för sina lektioner.
                </CardDescription>
              </CardHeader>
              <CardContent data-testid="vocabulary-sets-content">
                {setsLoading ? (
                  <div className="text-center py-12" data-testid="loading-sets">
                    <div className="animate-spin text-4xl mb-4">📚</div>
                    <div className="text-lg text-gray-600">Laddar ordförrådsset...</div>
                  </div>
                ) : filteredSets.length === 0 ? (
                  <div className="text-center py-12" data-testid="empty-sets-message">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-xl font-bold text-gray-600 mb-2" data-testid="empty-sets-title">
                      {searchTerm || filterPublished !== null ? "Inga matchande set hittades" : "Inga ordförrådsset än"}
                    </h3>
                    <p className="text-gray-500 mb-4" data-testid="empty-sets-description">
                      {searchTerm || filterPublished !== null 
                        ? "Prova att ändra dina sökkriterier."
                        : "Skapa ditt första ordförrådsset för att komma igång."
                      }
                    </p>
                    {!searchTerm && filterPublished === null && (
                      <Button 
                        onClick={() => setIsCreateSetDialogOpen(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        data-testid="button-create-first-vocabulary-set"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Skapa Ordförrådsset
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table data-testid="vocabulary-sets-table">
                    <TableHeader>
                      <TableRow data-testid="table-header-row">
                        <TableHead data-testid="table-head-title">Titel</TableHead>
                        <TableHead data-testid="table-head-description">Beskrivning</TableHead>
                        <TableHead data-testid="table-head-theme">Tema</TableHead>
                        <TableHead data-testid="table-head-status">Status</TableHead>
                        <TableHead data-testid="table-head-created">Skapad</TableHead>
                        <TableHead data-testid="table-head-actions">Åtgärder</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSets.map((set) => (
                        <TableRow key={set.id} data-testid={`row-vocabulary-set-${set.id}`}>
                          <TableCell data-testid={`cell-title-${set.id}`}>
                            <div className="font-medium" data-testid={`text-set-title-${set.id}`}>
                              {set.title}
                            </div>
                          </TableCell>
                          <TableCell data-testid={`cell-description-${set.id}`}>
                            <div className="text-sm text-gray-500 truncate max-w-xs" data-testid={`text-set-description-${set.id}`}>
                              {set.description || 'Ingen beskrivning'}
                            </div>
                          </TableCell>
                          <TableCell data-testid={`cell-theme-${set.id}`}>
                            <div 
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: set.themeColor }}
                              title={set.themeColor}
                              data-testid={`color-indicator-${set.id}`}
                            />
                          </TableCell>
                          <TableCell data-testid={`cell-status-${set.id}`}>
                            <Badge 
                              variant={set.isPublished ? "default" : "secondary"}
                              className={set.isPublished ? "bg-green-100 text-green-800" : ""}
                              data-testid={`badge-status-${set.id}`}
                            >
                              {set.isPublished ? "Publicerad" : "Utkast"}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`cell-created-${set.id}`}>
                            <div className="text-sm text-gray-500" data-testid={`text-created-date-${set.id}`}>
                              {new Date(set.createdAt).toLocaleDateString('sv-SE')}
                            </div>
                          </TableCell>
                          <TableCell data-testid={`cell-actions-${set.id}`}>
                            <div className="flex items-center gap-1" data-testid={`actions-container-${set.id}`}>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedSet(set);
                                  setActiveTab("builder");
                                }}
                                title="Öppna builder"
                                data-testid={`button-open-builder-${set.id}`}
                              >
                                <Settings className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => openEditSetDialog(set)}
                                title="Redigera set"
                                data-testid={`button-edit-set-${set.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => duplicateSetMutation.mutate(set.id)}
                                disabled={duplicateSetMutation.isPending}
                                title="Duplicera set"
                                data-testid={`button-duplicate-set-${set.id}`}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => togglePublishMutation.mutate({ 
                                  id: set.id, 
                                  isPublished: !set.isPublished 
                                })}
                                disabled={togglePublishMutation.isPending}
                                title={set.isPublished ? "Göm set" : "Publicera set"}
                                data-testid={`button-toggle-publish-${set.id}`}
                              >
                                {set.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    title="Ta bort set"
                                    data-testid={`button-delete-set-${set.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent data-testid={`delete-dialog-${set.id}`}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle data-testid="delete-dialog-title">
                                      Ta bort ordförrådsset
                                    </AlertDialogTitle>
                                    <AlertDialogDescription data-testid="delete-dialog-description">
                                      Är du säker på att du vill ta bort "{set.title}"? 
                                      Detta kommer också att ta bort alla ord och övningar i setet. 
                                      Denna åtgärd kan inte ångras.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel data-testid="button-cancel-delete">
                                      Avbryt
                                    </AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => deleteSetMutation.mutate(set.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                      disabled={deleteSetMutation.isPending}
                                      data-testid={`button-confirm-delete-${set.id}`}
                                    >
                                      {deleteSetMutation.isPending ? "Tar bort..." : "Ta bort"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {selectedSet && (
            <TabsContent value="builder">
              <div className="space-y-6">
                {/* Set Details Section */}
                <Card>
                  <Collapsible 
                    open={sectionsOpen.setDetails}
                    onOpenChange={() => toggleSection('setDetails')}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-gray-50">
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Palette className="w-5 h-5 text-purple-600" />
                            Set-detaljer: {selectedSet.title}
                          </div>
                          {sectionsOpen.setDetails ? <ChevronUp /> : <ChevronDown />}
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <h4 className="font-medium mb-2">Grundläggande information</h4>
                            <div className="space-y-2 text-sm">
                              <div><strong>Titel:</strong> {selectedSet.title}</div>
                              <div><strong>Beskrivning:</strong> {selectedSet.description || 'Ingen beskrivning'}</div>
                              <div><strong>Status:</strong> 
                                <Badge 
                                  variant={selectedSet.isPublished ? "default" : "secondary"}
                                  className={`ml-2 ${selectedSet.isPublished ? "bg-green-100 text-green-800" : ""}`}
                                >
                                  {selectedSet.isPublished ? "Publicerad" : "Utkast"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Färgschema</h4>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded border"
                                  style={{ backgroundColor: selectedSet.themeColor }}
                                />
                                <span className="text-sm">Tema: {selectedSet.themeColor}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded border"
                                  style={{ backgroundColor: selectedSet.frameColor }}
                                />
                                <span className="text-sm">Ram: {selectedSet.frameColor}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded border"
                                  style={{ backgroundColor: selectedSet.orderNumbersColor }}
                                />
                                <span className="text-sm">Nummer: {selectedSet.orderNumbersColor}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Statistik</h4>
                            <div className="space-y-2 text-sm">
                              <div><strong>Ord:</strong> {selectedSetWords.length}</div>
                              <div><strong>Övningar:</strong> {selectedSetExercises.length}</div>
                              <div><strong>Aktiva övningar:</strong> {selectedSetExercises.filter(e => e.isActive).length}</div>
                              <div><strong>Skapad:</strong> {new Date(selectedSet.createdAt).toLocaleDateString('sv-SE')}</div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex flex-wrap gap-2">
                            <Button 
                              onClick={() => openEditSetDialog(selectedSet)}
                              variant="outline"
                              data-testid="button-edit-set-details"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Redigera set-detaljer
                            </Button>
                            <Button 
                              onClick={() => setIsExportDialogOpen(true)}
                              variant="outline"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              disabled={exportLoading}
                              data-testid="button-export-pdf"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              {exportLoading ? "Exporterar..." : "Exportera PDF"}
                            </Button>
                            <Button 
                              onClick={() => setBatchExportDialog(true)}
                              variant="outline"
                              className="text-green-600 border-green-200 hover:bg-green-50"
                              disabled={exportLoading}
                              data-testid="button-batch-export"
                            >
                              <FileDown className="w-4 h-4 mr-2" />
                              {exportLoading ? "Exporterar..." : "Batch Export"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>

                {/* Words Management Section */}
                <Card>
                  <Collapsible 
                    open={sectionsOpen.words}
                    onOpenChange={() => toggleSection('words')}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-gray-50">
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-600" />
                            Ord ({selectedSetWords.length})
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              onClick={() => {
                                setEditingWord(null);
                                wordForm.reset();
                                setIsWordDialogOpen(true);
                              }}
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                              data-testid="button-add-word"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Lägg till ord
                            </Button>
                            {sectionsOpen.words ? <ChevronUp /> : <ChevronDown />}
                          </div>
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        {wordsLoading ? (
                          <div className="text-center py-8">
                            <div className="animate-spin text-2xl mb-4">⌛</div>
                            <div>Laddar ord...</div>
                          </div>
                        ) : selectedSetWords.length === 0 ? (
                          <div className="text-center py-8">
                            <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <h4 className="text-lg font-medium text-gray-600 mb-2">Inga ord än</h4>
                            <p className="text-gray-500 mb-4">Lägg till ord för att bygga upp ordförrådssetet.</p>
                            <Button 
                              onClick={() => {
                                setEditingWord(null);
                                wordForm.reset();
                                setIsWordDialogOpen(true);
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                              data-testid="button-add-first-word"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Lägg till första ordet
                            </Button>
                          </div>
                        ) : (
                          <DndContext 
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                            modifiers={[restrictToVerticalAxis]}
                          >
                            <SortableContext items={selectedSetWords.map(w => w.id)} strategy={verticalListSortingStrategy}>
                              <div className="space-y-3">
                                {selectedSetWords.map((word) => (
                                  <SortableWordItem 
                                    key={word.id}
                                    word={word}
                                    onEdit={openEditWordDialog}
                                    onDelete={(id) => deleteWordMutation.mutate(id)}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>

                {/* Exercises Section */}
                <Card>
                  <Collapsible 
                    open={sectionsOpen.exercises}
                    onOpenChange={() => toggleSection('exercises')}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-gray-50">
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-purple-600" />
                            Övningar ({selectedSetExercises.length})
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              onClick={() => {
                                setEditingExercise(null);
                                exerciseForm.reset();
                                setIsExerciseDialogOpen(true);
                              }}
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                              data-testid="button-add-exercise"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Lägg till övning
                            </Button>
                            {sectionsOpen.exercises ? <ChevronUp /> : <ChevronDown />}
                          </div>
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        {exercisesLoading ? (
                          <div className="text-center py-8">
                            <div className="animate-spin text-2xl mb-4">⌛</div>
                            <div>Laddar övningar...</div>
                          </div>
                        ) : selectedSetExercises.length === 0 ? (
                          <div className="text-center py-8">
                            <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <h4 className="text-lg font-medium text-gray-600 mb-2">Inga övningar än</h4>
                            <p className="text-gray-500 mb-4">Skapa övningar för att låta elever träna ordförrådssetet.</p>
                            <Button 
                              onClick={() => {
                                setEditingExercise(null);
                                exerciseForm.reset();
                                setIsExerciseDialogOpen(true);
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                              data-testid="button-add-first-exercise"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Skapa första övningen
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {selectedSetExercises.map((exercise) => (
                              <div key={exercise.id} className="border rounded-lg p-4 bg-white">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <h4 className="font-medium">{exercise.title}</h4>
                                    <Badge variant="outline" className="text-xs">
                                      {EXERCISE_TYPES.find(t => t.value === exercise.type)?.label || exercise.type}
                                    </Badge>
                                    <Badge 
                                      variant={exercise.isActive ? "default" : "secondary"}
                                      className={exercise.isActive ? "bg-green-100 text-green-800" : ""}
                                    >
                                      {exercise.isActive ? "Aktiv" : "Inaktiv"}
                                    </Badge>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => openEditExerciseDialog(exercise)}
                                      data-testid={`button-edit-exercise-${exercise.id}`}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="text-red-600 hover:text-red-700"
                                      onClick={() => deleteExerciseMutation.mutate(exercise.id)}
                                      data-testid={`button-delete-exercise-${exercise.id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                                {exercise.description && (
                                  <p className="text-sm text-gray-600 mb-2">{exercise.description}</p>
                                )}
                                <div className="flex gap-4 text-xs text-gray-500">
                                  {exercise.timeLimit && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {Math.floor(exercise.timeLimit / 60)}min
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <Award className="w-3 h-3" />
                                    {exercise.pointsPerCorrect}p per rätt svar
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Target className="w-3 h-3" />
                                    {exercise.minPassingScore}% för godkänt
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Create Vocabulary Set Dialog */}
        <Dialog open={isCreateSetDialogOpen} onOpenChange={setIsCreateSetDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Skapa Nytt Ordförrådsset</DialogTitle>
              <DialogDescription>
                Skapa ett nytt ordförrådsset som elever kan använda för att lära sig nya ord.
              </DialogDescription>
            </DialogHeader>
            <Form {...setForm}>
              <form onSubmit={setForm.handleSubmit(handleCreateSet)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={setForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Titel</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="T.ex. Adjektiv för beskrivning" 
                            data-testid="input-set-title"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={setForm.control}
                    name="themeColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temafärg</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-theme-color">
                              <SelectValue placeholder="Välj färg" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {THEME_COLORS.map((color) => (
                              <SelectItem key={color.value} value={color.value}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-4 h-4 rounded border"
                                    style={{ backgroundColor: color.value }}
                                  />
                                  {color.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={setForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beskrivning</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Beskriv vad detta ordförrådsset handlar om..."
                          data-testid="textarea-set-description"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={setForm.control}
                    name="frameColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ramfärg</FormLabel>
                        <FormControl>
                          <Input 
                            type="color"
                            data-testid="input-frame-color"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={setForm.control}
                    name="orderNumbersColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nummerfärg</FormLabel>
                        <FormControl>
                          <Input 
                            type="color"
                            data-testid="input-order-numbers-color"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={setForm.control}
                  name="isPublished"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Publicera omedelbart</FormLabel>
                        <FormDescription>
                          Gör ordförrådssetet tillgängligt för elever direkt
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-is-published"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setIsCreateSetDialogOpen(false)}
                    data-testid="button-cancel-create-set"
                  >
                    Avbryt
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createSetMutation.isPending}
                    data-testid="button-save-set"
                  >
                    {createSetMutation.isPending ? "Skapar..." : "Skapa Set"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Vocabulary Set Dialog */}
        <Dialog open={isEditSetDialogOpen} onOpenChange={setIsEditSetDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Redigera Ordförrådsset</DialogTitle>
              <DialogDescription>
                Uppdatera inställningar för detta ordförrådsset.
              </DialogDescription>
            </DialogHeader>
            <Form {...setForm}>
              <form onSubmit={setForm.handleSubmit(handleUpdateSet)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={setForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Titel</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="T.ex. Adjektiv för beskrivning" 
                            data-testid="input-edit-set-title"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={setForm.control}
                    name="themeColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temafärg</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-theme-color">
                              <SelectValue placeholder="Välj färg" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {THEME_COLORS.map((color) => (
                              <SelectItem key={color.value} value={color.value}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-4 h-4 rounded border"
                                    style={{ backgroundColor: color.value }}
                                  />
                                  {color.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={setForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beskrivning</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Beskriv vad detta ordförrådsset handlar om..."
                          data-testid="textarea-edit-set-description"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={setForm.control}
                    name="frameColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ramfärg</FormLabel>
                        <FormControl>
                          <Input 
                            type="color"
                            data-testid="input-edit-frame-color"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={setForm.control}
                    name="orderNumbersColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nummerfärg</FormLabel>
                        <FormControl>
                          <Input 
                            type="color"
                            data-testid="input-edit-order-numbers-color"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={setForm.control}
                  name="isPublished"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Publicerad</FormLabel>
                        <FormDescription>
                          Gör ordförrådssetet tillgängligt för elever
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-edit-is-published"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setIsEditSetDialogOpen(false)}
                    data-testid="button-cancel-edit-set"
                  >
                    Avbryt
                  </Button>
                  <Button 
                    type="submit"
                    disabled={updateSetMutation.isPending}
                    data-testid="button-update-set"
                  >
                    {updateSetMutation.isPending ? "Uppdaterar..." : "Uppdatera Set"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Word Dialog */}
        <Dialog open={isWordDialogOpen} onOpenChange={setIsWordDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingWord ? "Redigera Ord" : "Lägg till Nytt Ord"}</DialogTitle>
              <DialogDescription>
                {editingWord ? "Uppdatera detta ord i ordförrådssetet." : "Lägg till ett nytt ord till ordförrådssetet."}
              </DialogDescription>
            </DialogHeader>
            <Form {...wordForm}>
              <form onSubmit={wordForm.handleSubmit(editingWord ? handleUpdateWord : handleCreateWord)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={wordForm.control}
                    name="term"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ord</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="T.ex. vacker" 
                            data-testid="input-word-term"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={wordForm.control}
                    name="phonetic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Uttal (fonetisk)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="T.ex. ˈvakːər" 
                            data-testid="input-word-phonetic"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={wordForm.control}
                  name="definition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Definition</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Förklara vad ordet betyder..."
                          data-testid="textarea-word-definition"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={wordForm.control}
                    name="synonym"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Synonym (valfritt)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="T.ex. snygg, fin" 
                            data-testid="input-word-synonym"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={wordForm.control}
                    name="antonym"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Antonym (valfritt)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="T.ex. ful, otrevlig" 
                            data-testid="input-word-antonym"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={wordForm.control}
                  name="example"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exempelmening (valfritt)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Skriv en mening som använder ordet..."
                          data-testid="textarea-word-example"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={wordForm.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bild-URL (valfritt)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://..." 
                            data-testid="input-word-image-url"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={wordForm.control}
                    name="pronunciationUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ljud-URL (valfritt)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://..." 
                            data-testid="input-word-pronunciation-url"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setIsWordDialogOpen(false);
                      setEditingWord(null);
                    }}
                    data-testid="button-cancel-word"
                  >
                    Avbryt
                  </Button>
                  <Button 
                    type="submit"
                    disabled={editingWord ? updateWordMutation.isPending : createWordMutation.isPending}
                    data-testid="button-save-word"
                  >
                    {editingWord 
                      ? (updateWordMutation.isPending ? "Uppdaterar..." : "Uppdatera Ord")
                      : (createWordMutation.isPending ? "Lägger till..." : "Lägg till Ord")
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Exercise Dialog */}
        <Dialog open={isExerciseDialogOpen} onOpenChange={setIsExerciseDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="exercise-dialog">
            <DialogHeader>
              <DialogTitle data-testid="exercise-dialog-title">
                {editingExercise ? "Redigera Övning" : "Skapa Ny Övning"}
              </DialogTitle>
              <DialogDescription data-testid="exercise-dialog-description">
                {editingExercise ? "Uppdatera denna övning i ordförrådssetet." : "Skapa en ny övning för ordförrådssetet."}
              </DialogDescription>
            </DialogHeader>
            <Form {...exerciseForm}>
              <form onSubmit={exerciseForm.handleSubmit(editingExercise ? handleUpdateExercise : handleCreateExercise)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={exerciseForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Titel</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="T.ex. Adjektiv-flashcards" 
                            data-testid="input-exercise-title"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={exerciseForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Övningstyp</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-exercise-type">
                              <SelectValue placeholder="Välj övningstyp" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EXERCISE_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div>
                                  <div className="font-medium">{type.label}</div>
                                  <div className="text-xs text-gray-500">{type.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={exerciseForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beskrivning (valfritt)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Beskriv vad denna övning handlar om..."
                          data-testid="textarea-exercise-description"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={exerciseForm.control}
                  name="instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instruktioner (valfritt)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Ge instruktioner till eleverna..."
                          data-testid="textarea-exercise-instructions"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={exerciseForm.control}
                    name="timeLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tidsgräns (sekunder)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="Valfritt"
                            data-testid="input-exercise-time-limit"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={exerciseForm.control}
                    name="pointsPerCorrect"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Poäng per rätt svar</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="1"
                            data-testid="input-exercise-points-per-correct"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={exerciseForm.control}
                    name="minPassingScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lägsta godkända (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="0"
                            max="100"
                            data-testid="input-exercise-min-passing-score"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 70)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Dynamic Exercise Configuration */}
                {watchedExerciseType && (
                  <div className="border rounded-lg p-4 bg-gray-50" data-testid="exercise-configuration-section">
                    <h4 className="font-medium mb-3" data-testid="configuration-title">
                      Konfiguration för {EXERCISE_TYPES.find(t => t.value === watchedExerciseType)?.label}
                    </h4>
                    <div className="space-y-4" data-testid={`config-form-${watchedExerciseType}`}>
                      {watchedExerciseType === 'flashcards' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="showPhonetics"
                              defaultChecked={true}
                              data-testid="checkbox-show-phonetics"
                            />
                            <label htmlFor="showPhonetics" className="text-sm">Visa fonetik</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="showImages"
                              defaultChecked={true}
                              data-testid="checkbox-show-images"
                            />
                            <label htmlFor="showImages" className="text-sm">Visa bilder</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="autoAdvance"
                              defaultChecked={false}
                              data-testid="checkbox-auto-advance"
                            />
                            <label htmlFor="autoAdvance" className="text-sm">Auto-framsteg</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="shuffleCards"
                              defaultChecked={true}
                              data-testid="checkbox-shuffle-cards"
                            />
                            <label htmlFor="shuffleCards" className="text-sm">Blanda kort</label>
                          </div>
                        </div>
                      )}
                      {watchedExerciseType === 'multiple_choice' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Antal alternativ</label>
                            <Input 
                              type="number"
                              min="2"
                              max="6"
                              defaultValue="4"
                              data-testid="input-number-of-options"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="showImagesMultiple"
                              defaultChecked={false}
                              data-testid="checkbox-show-images-multiple"
                            />
                            <label htmlFor="showImagesMultiple" className="text-sm">Visa bilder</label>
                          </div>
                        </div>
                      )}
                      {watchedExerciseType === 'fill_in_blank' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="caseSensitive"
                              defaultChecked={false}
                              data-testid="checkbox-case-sensitive"
                            />
                            <label htmlFor="caseSensitive" className="text-sm">Versalkänslig</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="allowPartialCredit"
                              defaultChecked={true}
                              data-testid="checkbox-partial-credit"
                            />
                            <label htmlFor="allowPartialCredit" className="text-sm">Delpoäng</label>
                          </div>
                        </div>
                      )}
                      {watchedExerciseType === 'matching' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Max par</label>
                            <Input 
                              type="number"
                              min="4"
                              max="12"
                              defaultValue="8"
                              data-testid="input-max-pairs"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="allowDragDrop"
                              defaultChecked={true}
                              data-testid="checkbox-allow-drag-drop"
                            />
                            <label htmlFor="allowDragDrop" className="text-sm">Tillåt dra och släpp</label>
                          </div>
                        </div>
                      )}
                      {watchedExerciseType === 'spelling' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="showDefinition"
                              defaultChecked={true}
                              data-testid="checkbox-show-definition"
                            />
                            <label htmlFor="showDefinition" className="text-sm">Visa definition</label>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Max försök</label>
                            <Input 
                              type="number"
                              min="1"
                              max="5"
                              defaultValue="3"
                              data-testid="input-max-attempts"
                            />
                          </div>
                        </div>
                      )}
                      {/* Add more exercise type configurations as needed */}
                      {!['flashcards', 'multiple_choice', 'fill_in_blank', 'matching', 'spelling'].includes(watchedExerciseType) && (
                        <div className="text-sm text-gray-500" data-testid="no-config-message">
                          Inga speciella konfigurationer för denna övningstyp.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-6">
                  <FormField
                    control={exerciseForm.control}
                    name="allowRetries"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-exercise-allow-retries"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Tillåt återförsök</FormLabel>
                          <FormDescription>
                            Låt elever försöka igen om de inte klarar övningen
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={exerciseForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-exercise-is-active"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Aktiv övning</FormLabel>
                          <FormDescription>
                            Gör övningen tillgänglig för elever
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setIsExerciseDialogOpen(false);
                      setEditingExercise(null);
                    }}
                    data-testid="button-cancel-exercise"
                    disabled={editingExercise ? updateExerciseMutation.isPending : createExerciseMutation.isPending}
                  >
                    Avbryt
                  </Button>
                  <Button 
                    type="submit"
                    disabled={editingExercise ? updateExerciseMutation.isPending : createExerciseMutation.isPending}
                    data-testid="button-save-exercise"
                  >
                    {editingExercise 
                      ? (updateExerciseMutation.isPending ? "Uppdaterar..." : "Uppdatera Övning")
                      : (createExerciseMutation.isPending ? "Skapar..." : "Skapa Övning")
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}