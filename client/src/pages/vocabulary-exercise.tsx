import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { 
  BookOpen, 
  PlayCircle,
  ArrowLeft, 
  ArrowRight,
  Check,
  X,
  RotateCcw,
  Trophy,
  Timer,
  Target,
  Star,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Shuffle,
  Brain,
  Zap,
  Heart,
  Medal,
  TrendingUp,
  Image,
  Grid3X3,
  FileText,
  RefreshCw
} from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  type VocabularySet, 
  type VocabularyWord,
  type VocabularyExercise,
  type VocabularyAttempt,
  insertVocabularyAttemptSchema
} from "@shared/schema";

// Exercise types we support
const EXERCISE_TYPES = [
  { 
    id: 'true_false', 
    title: 'Sant/Falskt', 
    description: 'Avgör om påståendet stämmer',
    icon: <Check className="w-6 h-6" />,
    color: 'bg-green-100 text-green-800 border-green-200',
    difficulty: 'Lätt'
  },
  { 
    id: 'fill_in_blank', 
    title: 'Lucktext', 
    description: 'Fyll i det saknade ordet',
    icon: <BookOpen className="w-6 h-6" />,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    difficulty: 'Medel'
  },
  { 
    id: 'matching', 
    title: 'Matcha', 
    description: 'Matcha ord med definitioner',
    icon: <Shuffle className="w-6 h-6" />,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    difficulty: 'Medel'
  },
  { 
    id: 'flashcards', 
    title: 'Flashcards', 
    description: 'Interaktiva kort med spaced repetition',
    icon: <Zap className="w-6 h-6" />,
    color: 'bg-gradient-to-r from-pink-100 to-purple-100 text-pink-800 border-pink-200',
    difficulty: 'Anpassad'
  },
  { 
    id: 'image_matching', 
    title: 'Bild-matchning', 
    description: 'Dra bilder till rätt ord',
    icon: <Image className="w-6 h-6" />,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    difficulty: 'Lätt'
  },
  { 
    id: 'crossword', 
    title: 'Korsord', 
    description: 'Lös korsord med ordförråd',
    icon: <Grid3X3 className="w-6 h-6" />,
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    difficulty: 'Svår'
  },
  { 
    id: 'sentence_completion', 
    title: 'Mening', 
    description: 'Använd ord i meningar',
    icon: <FileText className="w-6 h-6" />,
    color: 'bg-teal-100 text-teal-800 border-teal-200',
    difficulty: 'Medel'
  },
  { 
    id: 'synonym_antonym', 
    title: 'Synonymer/Motsatser', 
    description: 'Hitta liknande eller motsatta ord',
    icon: <RefreshCw className="w-6 h-6" />,
    color: 'bg-rose-100 text-rose-800 border-rose-200',
    difficulty: 'Medel'
  }
];

// Exercise result interface
interface ExerciseResult {
  questionId: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
  hints?: number;
}

interface ExerciseState {
  currentQuestion: number;
  totalQuestions: number;
  score: number;
  timeStarted: number;
  results: ExerciseResult[];
  streak: number;
  maxStreak: number;
}

// Exercise question interfaces
interface TrueFalseQuestion {
  id: string;
  statement: string;
  isTrue: boolean;
  word: VocabularyWord;
  explanation: string;
}

interface FillInBlankQuestion {
  id: string;
  sentence: string;
  correctWord: string;
  word: VocabularyWord;
  hints?: string[];
}

interface MatchingPair {
  id: string;
  term: string;
  definition: string;
  word: VocabularyWord;
}

interface MatchingQuestion {
  id: string;
  pairs: MatchingPair[];
  userMatches: Record<string, string>;
}

// New question interfaces for additional exercise types
interface ImageMatchingQuestion {
  id: string;
  images: ImageMatchingPair[];
  userMatches: Record<string, string>;
}

interface ImageMatchingPair {
  id: string;
  imageUrl: string;
  word: VocabularyWord;
  alt: string;
}

interface CrosswordQuestion {
  id: string;
  clues: CrosswordClue[];
  grid: CrosswordCell[];
  userAnswers: Record<string, string>;
  completedCells: number;
  totalCells: number;
}

interface CrosswordClue {
  id: string;
  number: number;
  direction: 'across' | 'down';
  clue: string;
  answer: string;
  startX: number;
  startY: number;
  word: VocabularyWord;
}

interface CrosswordCell {
  x: number;
  y: number;
  letter: string;
  number?: number;
  isStart?: boolean;
  direction?: 'across' | 'down';
  clueId?: string;
  isBlocked?: boolean;
}

interface SentenceCompletionQuestion {
  id: string;
  sentence: string;
  correctWord: string;
  wordBank: string[];
  word: VocabularyWord;
  context?: string;
  sentenceType: 'fill_blank' | 'word_bank' | 'create_sentence';
}

interface SynonymAntonymQuestion {
  id: string;
  targetWord: string;
  questionType: 'synonym' | 'antonym';
  options: string[];
  correctAnswer: string;
  word: VocabularyWord;
  explanation?: string;
}

type Question = TrueFalseQuestion | FillInBlankQuestion | MatchingQuestion | 
                ImageMatchingQuestion | CrosswordQuestion | SentenceCompletionQuestion | 
                SynonymAntonymQuestion;

interface ExerciseRunnerProps {
  setId?: string;
  exerciseId?: string;
}

export default function VocabularyExercise({ setId: propSetId, exerciseId: propExerciseId }: ExerciseRunnerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const params = useParams<{ exerciseId?: string, setId?: string }>();
  
  // Use route params if available, otherwise use props
  const exerciseId = params.exerciseId || propExerciseId;
  const setIdFromRoute = params.setId || propSetId;
  
  // Main state
  const [currentView, setCurrentView] = useState<'selection' | 'exercise' | 'results'>('selection');
  const [selectedSet, setSelectedSet] = useState<VocabularySet | null>(null);
  const [selectedExerciseType, setSelectedExerciseType] = useState<string | null>(null);
  const [exerciseState, setExerciseState] = useState<ExerciseState | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<ExerciseResult | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(true); // Allow manual control of advancement
  const [showManualNext, setShowManualNext] = useState(false);

  // Drag and drop for matching exercises
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Set page title and meta description
  useEffect(() => {
    document.title = "Ordförrådsövningar | KlassKamp";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Träna ditt ordförråd med roliga och interaktiva övningar. Sant/falskt, lucktext och matchningsövningar.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Träna ditt ordförråd med roliga och interaktiva övningar. Sant/falskt, lucktext och matchningsövningar.';
      document.head.appendChild(meta);
    }
  }, []);

  // Fetch published vocabulary sets
  const { data: vocabularySets = [], isLoading: setsLoading } = useQuery<VocabularySet[]>({
    queryKey: ["/api/vocabulary/sets/published"],
  });

  // Fetch exercise data if exerciseId is present
  const { data: exerciseData, isLoading: exerciseLoading } = useQuery<VocabularyExercise>({
    queryKey: ["/api/vocabulary/exercises", exerciseId],
    enabled: !!exerciseId && exerciseId !== 'temp',
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch words for selected set with error handling
  const { data: setWords = [], isLoading: wordsLoading, error: wordsError } = useQuery<VocabularyWord[]>({
    queryKey: ["/api/vocabulary/sets", selectedSet?.id, "words"],
    enabled: !!selectedSet?.id,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Effect to handle exerciseId route - auto-load and start exercise
  useEffect(() => {
    if (exerciseData && !selectedSet && currentView === 'selection') {
      // Find the vocabulary set for this exercise
      const targetSet = vocabularySets.find(set => set.id === exerciseData.setId);
      if (targetSet) {
        setSelectedSet(targetSet);
        setSelectedExerciseType(exerciseData.type);
        // Don't start immediately - wait for words to load
      }
    }
  }, [exerciseData, vocabularySets, selectedSet, currentView]);

  // Effect to auto-start exercise when exercise data and words are ready
  useEffect(() => {
    if (exerciseData && selectedSet && selectedExerciseType && 
        setWords.length > 0 && !wordsLoading && currentView === 'selection') {
      // Auto-start the exercise for direct links
      startExercise(selectedSet, selectedExerciseType);
    }
  }, [exerciseData, selectedSet, selectedExerciseType, setWords, wordsLoading, currentView]);

  // Generate questions based on exercise type and vocabulary words
  const generateQuestions = useCallback((type: string, words: VocabularyWord[]): Question[] => {
    if (!words.length) return [];

    const shuffledWords = [...words].sort(() => Math.random() - 0.5);
    const questionsToGenerate = Math.min(10, shuffledWords.length); // Max 10 questions

    switch (type) {
      case 'true_false':
        return shuffledWords.slice(0, questionsToGenerate).map((word, index) => {
          const isTrue = Math.random() > 0.5;
          const statement = isTrue 
            ? `"${word.term}" betyder "${word.definition}"`
            : `"${word.term}" betyder "${getRandomDefinition(words, word)}"`;
          
          return {
            id: `tf_${index}`,
            statement,
            isTrue,
            word,
            explanation: isTrue 
              ? `Rätt! ${word.term} betyder verkligen ${word.definition}`
              : `Fel! ${word.term} betyder ${word.definition}, inte ${getRandomDefinition(words, word)}`
          };
        });

      case 'fill_in_blank':
        return shuffledWords.slice(0, questionsToGenerate).map((word, index) => {
          const sentence = word.example || `Kan du fylla i det rätta ordet? ${word.definition} - ______`;
          const sentenceWithBlank = word.example 
            ? sentence.replace(new RegExp(word.term, 'gi'), '______')
            : sentence;
          
          return {
            id: `fib_${index}`,
            sentence: sentenceWithBlank,
            correctWord: word.term.toLowerCase(),
            word,
            hints: word.definition ? [word.definition] : []
          };
        });

      case 'matching':
        const pairsToUse = Math.min(6, shuffledWords.length); // Max 6 pairs for matching
        const pairs = shuffledWords.slice(0, pairsToUse).map((word, index) => ({
          id: `pair_${index}`,
          term: word.term,
          definition: word.definition,
          word
        }));
        
        return [{
          id: 'matching_0',
          pairs,
          userMatches: {}
        }];

      case 'image_matching':
        const imagesToUse = Math.min(6, shuffledWords.length); // Max 6 images for matching
        let imageWords = shuffledWords.slice(0, imagesToUse).filter(word => word.imageUrl && word.imageUrl.length > 0);
        
        // If we don't have enough images, mix real images with placeholder/text alternatives
        if (imageWords.length < 3) {
          // Add words without images but create text-based visual representations
          const wordsWithoutImages = shuffledWords.filter(word => !word.imageUrl || word.imageUrl.length === 0).slice(0, imagesToUse - imageWords.length);
          
          const mixedImages = [
            ...imageWords.map((word, index) => ({
              id: `img_pair_${index}`,
              imageUrl: word.imageUrl!,
              word,
              alt: `Bild för ${word.term}`
            })),
            ...wordsWithoutImages.map((word, index) => ({
              id: `text_pair_${imageWords.length + index}`,
              imageUrl: '', // Empty URL to trigger text fallback
              word,
              alt: `Textbeskrivning för ${word.term}`
            }))
          ];
          
          return [{
            id: 'image_matching_0',
            images: mixedImages,
            userMatches: {}
          }];
        }
        
        return [{
          id: 'image_matching_0',
          images: imageWords.map((word, index) => ({
            id: `img_pair_${index}`,
            imageUrl: word.imageUrl!,
            word,
            alt: `Bild för ${word.term}`
          })),
          userMatches: {}
        }];

      case 'crossword':
        const crosswordWords = shuffledWords
          .slice(0, Math.min(6, shuffledWords.length))
          .filter(word => word.term.length >= 3 && word.term.length <= 10); // Reasonable word length for crosswords
        
        if (crosswordWords.length < 3) {
          // Not enough suitable words for crossword, fallback to simple list
          return shuffledWords.slice(0, 3).map((word, index) => ({
            id: `simple_clue_${index}`,
            clues: [{
              id: `clue_${index}`,
              number: index + 1,
              direction: 'across' as const,
              clue: word.definition,
              answer: word.term.toUpperCase().replace(/[^A-ZÅÄÖÉ]/g, ''),
              startX: 0,
              startY: index * 2,
              word
            }],
            grid: [],
            userAnswers: {},
            completedCells: 0,
            totalCells: word.term.length
          }));
        }
        
        // Create better crossword layout with some intersection attempts
        const clues: CrosswordClue[] = [];
        const gridSize = 12;
        
        crosswordWords.forEach((word, index) => {
          const cleanAnswer = word.term.toUpperCase().replace(/[^A-ZÅÄÖÉ]/g, '');
          let startX, startY;
          
          if (index === 0) {
            // First word goes in the center horizontally
            startX = Math.max(1, Math.floor((gridSize - cleanAnswer.length) / 2));
            startY = Math.floor(gridSize / 2);
          } else if (index === 1) {
            // Second word tries to intersect vertically
            const firstWord = clues[0];
            const intersection = findCommonLetter(firstWord.answer, cleanAnswer);
            if (intersection.found) {
              startX = firstWord.startX + intersection.pos1;
              startY = Math.max(1, firstWord.startY - intersection.pos2);
            } else {
              // Fallback: place vertically in a different column
              startX = Math.max(1, Math.floor(gridSize / 3));
              startY = Math.max(1, Math.floor((gridSize - cleanAnswer.length) / 2));
            }
          } else {
            // Subsequent words placed with some spacing
            const isHorizontal = index % 2 === 0;
            if (isHorizontal) {
              startX = Math.max(1, Math.floor(Math.random() * (gridSize - cleanAnswer.length - 1)));
              startY = Math.max(1, Math.min(gridSize - 2, 2 + index));
            } else {
              startX = Math.max(1, Math.min(gridSize - 2, 2 + index));
              startY = Math.max(1, Math.floor(Math.random() * (gridSize - cleanAnswer.length - 1)));
            }
          }
          
          clues.push({
            id: `clue_${index}`,
            number: index + 1,
            direction: index % 2 === 0 ? 'across' : 'down',
            clue: word.definition,
            answer: cleanAnswer,
            startX,
            startY,
            word
          });
        });
        
        return [{
          id: 'crossword_0',
          clues,
          grid: [], // Grid will be generated in UI component
          userAnswers: {},
          completedCells: 0,
          totalCells: clues.reduce((sum, clue) => sum + clue.answer.length, 0)
        }];

      case 'sentence_completion':
        return shuffledWords.slice(0, questionsToGenerate).map((word, index) => {
          const sentenceTypes = ['fill_blank', 'word_bank', 'create_sentence'] as const;
          const randomType = sentenceTypes[Math.floor(Math.random() * sentenceTypes.length)];
          
          let sentence = '';
          let wordBank: string[] = [];
          
          if (word.example) {
            sentence = word.example.replace(new RegExp(word.term, 'gi'), '______');
          } else {
            sentence = `Använd ordet "${word.term}" i en mening som visar dess betydelse: ${word.definition}`;
          }
          
          if (randomType === 'word_bank') {
            // Create word bank with correct word and distractors
            const otherWords = words.filter(w => w.id !== word.id).slice(0, 3);
            wordBank = [word.term, ...otherWords.map(w => w.term)].sort(() => Math.random() - 0.5);
          }
          
          return {
            id: `sc_${index}`,
            sentence,
            correctWord: word.term,
            wordBank,
            word,
            context: word.definition,
            sentenceType: randomType
          };
        });

      case 'synonym_antonym':
        return shuffledWords.slice(0, questionsToGenerate).map((word, index) => {
          const questionType = Math.random() > 0.5 ? 'synonym' : 'antonym';
          const options: string[] = [];
          const otherWords = words.filter(w => w.id !== word.id);
          
          let correctAnswer = '';
          let explanation = '';
          
          if (questionType === 'synonym') {
            // Create better educational synonym questions using word definitions
            // Extract key words from definition that could be synonyms
            const definitionWords = word.definition.toLowerCase()
              .replace(/[.,!?;]/g, '')
              .split(' ')
              .filter(w => w.length > 3 && !['detta', 'denna', 'något', 'någon', 'eller', 'till', 'från', 'med', 'för'].includes(w));
            
            if (definitionWords.length > 0) {
              // Use a key word from the definition as the correct answer
              correctAnswer = definitionWords[0];
              explanation = `"${correctAnswer}" har liknande betydelse som "${word.term}". Båda beskriver: ${word.definition}`;
            } else {
              // Fallback: create a descriptive synonym
              correctAnswer = `något som är ${word.definition.split(' ').slice(0, 2).join(' ')}`;
              explanation = `"${word.term}" betyder ${word.definition}`;
            }
            
            options.push(correctAnswer);
            
            // Add distractors from other word definitions
            const distractors = otherWords.slice(0, 3).map(w => {
              const defWords = w.definition.toLowerCase()
                .replace(/[.,!?;]/g, '')
                .split(' ')
                .filter(dw => dw.length > 3);
              return defWords[0] || w.term;
            });
            options.push(...distractors);
            
          } else {
            // Create educational antonym questions
            // Use context clues to create meaningful opposites
            const antonymPairs: Record<string, string> = {
              'stor': 'liten',
              'liten': 'stor', 
              'hög': 'låg',
              'låg': 'hög',
              'varm': 'kall',
              'kall': 'varm',
              'ljus': 'mörk',
              'mörk': 'ljus',
              'snabb': 'långsam',
              'långsam': 'snabb',
              'glad': 'ledsen',
              'ledsen': 'glad',
              'hård': 'mjuk',
              'mjuk': 'hård',
              'ny': 'gammal',
              'gammal': 'ny'
            };
            
            // Check if we have a direct antonym
            const directAntonym = antonymPairs[word.term.toLowerCase()];
            if (directAntonym) {
              correctAnswer = directAntonym;
              explanation = `"${directAntonym}" är motsatsen till "${word.term}"`;
            } else {
              // Create contextual opposite
              correctAnswer = `inte ${word.term.toLowerCase()}`;
              explanation = `Motsatsen till "${word.term}" skulle vara något som inte är ${word.definition.toLowerCase()}`;
            }
            
            options.push(correctAnswer);
            
            // Add distractors - other words that aren't opposites
            const distractors = otherWords.slice(0, 3).map(w => w.term.toLowerCase());
            options.push(...distractors);
          }
          
          // Shuffle options
          const shuffledOptions = options.sort(() => Math.random() - 0.5);
          
          return {
            id: `sa_${index}`,
            targetWord: word.term,
            questionType,
            options: shuffledOptions,
            correctAnswer,
            word,
            explanation
          };
        });

      default:
        return [];
    }
  }, []);

  // Helper function to get a random definition from other words
  const getRandomDefinition = (words: VocabularyWord[], excludeWord: VocabularyWord): string => {
    const otherWords = words.filter(w => w.id !== excludeWord.id);
    if (otherWords.length === 0) return "en helt annan betydelse";
    const randomWord = otherWords[Math.floor(Math.random() * otherWords.length)];
    return randomWord.definition;
  };

  // Helper function to find common letters between two words for crossword intersection
  const findCommonLetter = (word1: string, word2: string): { found: boolean, pos1: number, pos2: number } => {
    for (let i = 0; i < word1.length; i++) {
      for (let j = 0; j < word2.length; j++) {
        if (word1[i] === word2[j]) {
          return { found: true, pos1: i, pos2: j };
        }
      }
    }
    return { found: false, pos1: -1, pos2: -1 };
  };

  // Start exercise
  const startExercise = (set: VocabularySet, exerciseType: string) => {
    // Handle flashcards - redirect to flashcard session
    if (exerciseType === 'flashcards') {
      setLocation(`/vocabulary/flashcards/${set.id}`);
      return;
    }

    // Ensure the parent selectedSet matches the set being started
    if (selectedSet?.id !== set.id) {
      setSelectedSet(set);
      toast({
        title: "Laddar ordförråd... ⏳",
        description: "Väntar på att orden ska laddas för det valda setet."
      });
      return;
    }

    if (wordsLoading) {
      toast({
        title: "Vänta lite! ⏳",
        description: "Orden laddas fortfarande. Försök igen om en stund."
      });
      return;
    }

    if (!setWords.length) {
      toast({
        title: "Inga ord att öva på 😕",
        description: "Det här ordförrådssetet har inga ord att öva på än. Prova ett annat!",
        variant: "destructive"
      });
      return;
    }

    const generatedQuestions = generateQuestions(exerciseType, setWords);
    if (!generatedQuestions.length) {
      toast({
        title: "Kunde inte skapa övningar 😞",
        description: "Det gick inte att skapa övningar för det här ordförrådssetet. Prova ett annat!",
        variant: "destructive"
      });
      return;
    }

    setSelectedSet(set);
    setSelectedExerciseType(exerciseType);
    setQuestions(generatedQuestions);
    setExerciseState({
      currentQuestion: 0,
      totalQuestions: generatedQuestions.length,
      score: 0,
      timeStarted: Date.now(),
      results: [],
      streak: 0,
      maxStreak: 0
    });
    setCurrentView('exercise');
  };

  // Submit answer for current question
  const submitAnswer = (answer: string) => {
    if (!exerciseState || !questions[exerciseState.currentQuestion]) return;

    const currentQuestion = questions[exerciseState.currentQuestion];
    const timeSpent = Date.now() - exerciseState.timeStarted;
    
    let isCorrect = false;
    let correctAnswer = '';

    // Determine if answer is correct based on question type
    switch (selectedExerciseType) {
      case 'true_false':
        const tfQuestion = currentQuestion as TrueFalseQuestion;
        isCorrect = (answer === 'true') === tfQuestion.isTrue;
        correctAnswer = tfQuestion.isTrue ? 'true' : 'false';
        break;
      
      case 'fill_in_blank':
        const fibQuestion = currentQuestion as FillInBlankQuestion;
        isCorrect = answer.toLowerCase().trim() === fibQuestion.correctWord.toLowerCase();
        correctAnswer = fibQuestion.correctWord;
        break;
      
      case 'matching':
        const matchingQuestion = currentQuestion as MatchingQuestion;
        const allPairsMatched = matchingQuestion.pairs.every(pair => 
          matchingQuestion.userMatches[pair.id] === pair.definition
        );
        isCorrect = allPairsMatched;
        correctAnswer = 'all_pairs_matched';
        break;

      case 'image_matching':
        const imageQuestion = currentQuestion as ImageMatchingQuestion;
        const allImagesMatched = imageQuestion.images.every(image => 
          imageQuestion.userMatches[image.id] === image.word.term
        );
        isCorrect = allImagesMatched;
        correctAnswer = 'all_images_matched';
        break;

      case 'crossword':
        const crosswordQuestion = currentQuestion as CrosswordQuestion;
        const allCluesCorrect = crosswordQuestion.clues.every(clue => {
          const userAnswer = crosswordQuestion.userAnswers[clue.id];
          return userAnswer && userAnswer.toUpperCase() === clue.answer.toUpperCase();
        });
        isCorrect = allCluesCorrect;
        correctAnswer = 'all_words_completed';
        break;

      case 'sentence_completion':
        const sentenceQuestion = currentQuestion as SentenceCompletionQuestion;
        if (sentenceQuestion.sentenceType === 'fill_blank' || sentenceQuestion.sentenceType === 'word_bank') {
          isCorrect = answer.toLowerCase().trim() === sentenceQuestion.correctWord.toLowerCase();
        } else {
          // For 'create_sentence' type, check if the sentence includes the word and makes sense
          const includesWord = answer.toLowerCase().includes(sentenceQuestion.correctWord.toLowerCase());
          const isValidLength = answer.trim().length > 10; // Basic validation
          isCorrect = includesWord && isValidLength;
        }
        correctAnswer = sentenceQuestion.correctWord;
        break;

      case 'synonym_antonym':
        const synonymQuestion = currentQuestion as SynonymAntonymQuestion;
        isCorrect = answer === synonymQuestion.correctAnswer;
        correctAnswer = synonymQuestion.correctAnswer;
        break;
    }

    const result: ExerciseResult = {
      questionId: currentQuestion.id,
      question: getQuestionText(currentQuestion),
      userAnswer: answer,
      correctAnswer,
      isCorrect,
      timeSpent,
    };

    const newStreak = isCorrect ? exerciseState.streak + 1 : 0;
    const newScore = isCorrect ? exerciseState.score + 10 : exerciseState.score;

    setExerciseState(prev => prev ? {
      ...prev,
      score: newScore,
      results: [...prev.results, result],
      streak: newStreak,
      maxStreak: Math.max(prev.maxStreak, newStreak)
    } : null);

    setFeedbackResult(result);
    setShowFeedback(true);

    if (autoAdvance) {
      // Auto-advance after showing feedback (3 seconds for children to read)
      setTimeout(() => {
        setShowFeedback(false);
        setShowManualNext(false);
        nextQuestion();
      }, 3000);
    } else {
      // Show manual next button after 1 second
      setTimeout(() => {
        setShowManualNext(true);
      }, 1000);
    }
  };

  // Get question text for display
  const getQuestionText = (question: Question): string => {
    switch (selectedExerciseType) {
      case 'true_false':
        return (question as TrueFalseQuestion).statement;
      case 'fill_in_blank':
        return (question as FillInBlankQuestion).sentence;
      case 'matching':
        return 'Matcha ord med definitioner';
      default:
        return '';
    }
  };

  // Manual next function
  const handleManualNext = () => {
    setShowFeedback(false);
    setShowManualNext(false);
    nextQuestion();
  };

  // Move to next question or finish exercise
  const nextQuestion = () => {
    if (!exerciseState) return;

    if (exerciseState.currentQuestion + 1 >= exerciseState.totalQuestions) {
      finishExercise();
    } else {
      setExerciseState(prev => prev ? {
        ...prev,
        currentQuestion: prev.currentQuestion + 1
      } : null);
      setCurrentAnswer('');
    }
  };

  // Finish exercise and show results
  const finishExercise = () => {
    setCurrentView('results');
    // Here we could save the attempt to the backend
    saveAttempt();
  };

  // State for rewards and achievements
  const [rewardInfo, setRewardInfo] = useState<{
    rewards: {
      coinsEarned: number;
      baseCoins: number;
      accuracyBonus: number;
      exerciseTypeBonus: number;
      streakBonusCoins: number;
      experienceEarned: number;
      totalReward: number;
    };
    streak: {
      current: number;
      previous: number;
      longest: number;
      isNewDay: boolean;
      continued: boolean;
      broken: boolean;
      nextMilestone: number;
    };
    achievement: {
      title: string;
      coinsAwarded: number;
      type: string;
    } | null;
    performance: {
      accuracy: number;
      correctAnswers: number;
      totalQuestions: number;
      exerciseType: string;
    };
  } | null>(null);

  // Save attempt to backend
  const saveAttemptMutation = useMutation({
    mutationFn: async (attemptData: typeof insertVocabularyAttemptSchema._input) => {
      if (!exerciseId) {
        throw new Error('No exercise ID available');
      }
      return apiRequest('POST', `/api/vocabulary/exercises/${exerciseId}/attempts`, attemptData);
    },
    onSuccess: (response: any) => {
      // Store reward information for display
      if (response.rewards) {
        setRewardInfo(response);
      }

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/vocabulary/exercises', exerciseId, 'attempts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vocabulary/sets', 'published'] });
      queryClient.invalidateQueries({ queryKey: ['/api/student/currency'] }); // Refresh currency display

      // Show comprehensive reward toast
      if (response.rewards) {
        const { coinsEarned, streakBonusCoins } = response.rewards;
        const { current: streak, isNewDay, continued } = response.streak;
        
        let title = "Fantastiskt jobbat! 🎉";
        let description = `Du tjänade ${coinsEarned} mynt!`;
        
        if (streakBonusCoins > 0) {
          title = "Streak-bonus! 🔥";
          description = `${coinsEarned} mynt tjänade! ${streakBonusCoins} bonus för ${streak}-dagars streak!`;
        } else if (isNewDay && continued) {
          description += ` Du fortsätter din ${streak}-dagars streak!`;
        } else if (isNewDay) {
          description += " Din streak började idag!";
        }

        toast({
          title,
          description
        });

        // Show achievement toast if unlocked
        if (response.achievement) {
          setTimeout(() => {
            toast({
              title: `🏆 ${response.achievement.title}!`,
              description: `Du fick en prestation! +${response.achievement.coinsAwarded} extra mynt!`
            });
          }, 1500);
        }
      } else {
        toast({
          title: "Bra jobbat! 🎉",
          description: "Ditt resultat har sparats och du kan se det i dina framsteg."
        });
      }
    },
    onError: (error: any) => {
      console.error('Failed to save attempt:', error);
      toast({
        title: "Kunde inte spara",
        description: "Det gick inte att spara ditt resultat just nu. Försök igen senare.",
        variant: "destructive"
      });
    }
  });

  const saveAttempt = () => {
    if (!exerciseState || !selectedSet) return;
    
    // For demo mode (no exerciseId or exerciseId is 'temp'), just show success message
    if (!exerciseId || exerciseId === 'temp') {
      toast({
        title: "Demo genomförd! 🎉",
        description: `Du fick ${exerciseState.score} av ${exerciseState.totalQuestions * 10} poäng!`
      });
      return;
    }
    
    // Calculate performance metrics for backend
    const correctAnswers = exerciseState.results.filter(r => r.isCorrect).length;
    const totalQuestions = exerciseState.totalQuestions;
    
    const attemptData = {
      exerciseId: exerciseId,
      studentId: user?.id || 'anonymous', // Use authenticated user ID if available
      status: 'completed' as const,
      score: exerciseState.score,
      maxScore: totalQuestions * 10,
      timeSpent: Math.floor((Date.now() - exerciseState.timeStarted) / 1000), // in seconds
      answers: {
        responses: exerciseState.results,
        totalQuestions: totalQuestions,
        correctCount: correctAnswers
      },
      completedAt: new Date()
    };

    saveAttemptMutation.mutate(attemptData);
  };

  // Reset and try again
  const tryAgain = () => {
    if (selectedSet && selectedExerciseType) {
      startExercise(selectedSet, selectedExerciseType);
    }
  };

  // Go back to selection
  const backToSelection = () => {
    setCurrentView('selection');
    setSelectedSet(null);
    setSelectedExerciseType(null);
    setExerciseState(null);
    setQuestions([]);
    setCurrentAnswer('');
  };

  // Handle exit confirmation
  const handleExit = () => {
    if (currentView === 'exercise' && exerciseState) {
      setShowExitDialog(true);
    } else {
      setLocation('/elev');
    }
  };

  // Render loading state
  if (setsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 dark:from-blue-950 to-purple-100 dark:to-purple-900">
        <div className="text-center" data-testid="loading-screen">
          <div className="animate-spin text-6xl mb-6">📚</div>
          <div className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Laddar ordförråd...</div>
          <div className="text-lg text-gray-600 dark:text-gray-300">Det här tar bara en liten stund!</div>
        </div>
      </div>
    );
  }

  // Handle vocabulary sets error
  if (!setsLoading && vocabularySets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 dark:from-blue-950 to-purple-100 dark:to-purple-900">
        <div className="text-center max-w-md" data-testid="no-sets-screen">
          <div className="text-6xl mb-6">📚</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Inga ordförrådsset hittades</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            Det finns inga ordförrådsset att öva på just nu. Kom tillbaka senare!
          </p>
          <Button onClick={() => setLocation('/elev')} size="lg" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tillbaka till hem
          </Button>
        </div>
      </div>
    );
  }

  // Handle words loading error
  if (wordsError && selectedSet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 dark:from-blue-950 to-purple-100 dark:to-purple-900">
        <div className="text-center max-w-md" data-testid="words-error-screen">
          <div className="text-6xl mb-6">😞</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Kunde inte ladda orden</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            Det gick inte att ladda orden för "{selectedSet.title}". Försök igen!
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={() => {
                setSelectedSet(null);
                setCurrentView('selection');
              }} 
              size="lg" 
              variant="outline"
              data-testid="button-try-different-set"
            >
              Välj annat set
            </Button>
            <Button 
              onClick={() => window.location.reload()} 
              size="lg"
              data-testid="button-reload-page"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Försök igen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 dark:from-blue-950 via-purple-50 dark:via-purple-950 to-pink-50 dark:to-pink-950">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-white/20 dark:border-gray-700/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleExit}
                data-testid="button-back-home"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Tillbaka
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100" data-testid="text-page-title">
                  Ordförrådsövningar
                </h1>
                {selectedSet && (
                  <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-selected-set">
                    {selectedSet.title}
                  </p>
                )}
              </div>
            </div>
            
            {/* Progress indicator for exercise */}
            {currentView === 'exercise' && exerciseState && (
              <div className="flex items-center gap-4" data-testid="exercise-progress">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Fråga {exerciseState.currentQuestion + 1} av {exerciseState.totalQuestions}
                </div>
                <Progress 
                  value={(exerciseState.currentQuestion / exerciseState.totalQuestions) * 100} 
                  className="w-32"
                  data-testid="progress-bar"
                />
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span data-testid="text-current-score">{exerciseState.score}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {currentView === 'selection' && (
          <SelectionScreen 
            vocabularySets={vocabularySets}
            exerciseTypes={EXERCISE_TYPES}
            selectedSet={selectedSet}
            setSelectedSet={setSelectedSet}
            setWords={setWords}
            wordsLoading={wordsLoading}
            onStartExercise={startExercise}
          />
        )}
        
        {currentView === 'exercise' && exerciseState && questions[exerciseState.currentQuestion] && (
          <ExerciseScreen
            exerciseType={selectedExerciseType!}
            question={questions[exerciseState.currentQuestion]}
            exerciseState={exerciseState}
            currentAnswer={currentAnswer}
            setCurrentAnswer={setCurrentAnswer}
            onSubmitAnswer={submitAnswer}
            showFeedback={showFeedback}
            feedbackResult={feedbackResult}
            sensors={sensors}
            draggedItem={draggedItem}
            setDraggedItem={setDraggedItem}
            autoAdvance={autoAdvance}
            setAutoAdvance={setAutoAdvance}
            showManualNext={showManualNext}
            handleManualNext={() => {
              setShowFeedback(false);
              setShowManualNext(false);
              nextQuestion();
            }}
          />
        )}
        
        {currentView === 'results' && exerciseState && (
          <ResultsScreen
            exerciseState={exerciseState}
            selectedSet={selectedSet!}
            exerciseType={selectedExerciseType!}
            rewardInfo={rewardInfo}
            onTryAgain={tryAgain}
            onBackToSelection={backToSelection}
          />
        )}
      </main>

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent data-testid="exit-confirmation-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Avsluta övning?</AlertDialogTitle>
            <AlertDialogDescription>
              Om du lämnar nu kommer dina framsteg inte att sparas. Är du säker på att du vill avsluta?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-exit">Fortsätt öva</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => setLocation('/elev')}
              data-testid="button-confirm-exit"
            >
              Ja, avsluta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Selection Screen Component
function SelectionScreen({ 
  vocabularySets, 
  exerciseTypes, 
  selectedSet,
  setSelectedSet,
  setWords,
  wordsLoading,
  onStartExercise 
}: { 
  vocabularySets: VocabularySet[], 
  exerciseTypes: typeof EXERCISE_TYPES,
  selectedSet: VocabularySet | null,
  setSelectedSet: (set: VocabularySet | null) => void,
  setWords: VocabularyWord[],
  wordsLoading: boolean,
  onStartExercise: (set: VocabularySet, type: string) => void 
}) {

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-4" data-testid="text-selection-title">
          Välj ordförrådsset och övningstyp
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400" data-testid="text-selection-description">
          Välj först ett ordförrådsset och sedan vilken typ av övning du vill göra.
        </p>
      </div>

      {/* Vocabulary Sets */}
      <div>
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4" data-testid="text-sets-title">
          📚 Ordförrådsset
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vocabularySets.map((set) => (
            <Card 
              key={set.id} 
              className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
                selectedSet?.id === set.id 
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => setSelectedSet(set)}
              data-testid={`card-vocabulary-set-${set.id}`}
            >
              <CardHeader 
                className="pb-3"
                style={{ 
                  backgroundColor: selectedSet?.id === set.id ? `${set.themeColor || '#3B82F6'}20` : undefined,
                  borderColor: set.frameColor || '#1F2937'
                }}
              >
                <div className="flex items-center justify-between">
                  <CardTitle 
                    className="text-lg" 
                    style={{ color: set.themeColor || '#3B82F6' }}
                    data-testid={`text-set-title-${set.id}`}
                  >
                    {set.title}
                  </CardTitle>
                  {selectedSet?.id === set.id && (
                    <Check className="w-5 h-5 text-blue-500" data-testid="icon-set-selected" />
                  )}
                </div>
                {set.description && (
                  <CardDescription data-testid={`text-set-description-${set.id}`}>
                    {set.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span data-testid={`text-word-count-${set.id}`}>
                    {/* This should show actual word count from API */}
                    📝 Ord att lära
                  </span>
                  <Badge 
                    variant="secondary"
                    style={{ 
                      backgroundColor: `${set.themeColor || '#3B82F6'}20`,
                      color: set.themeColor || '#3B82F6'
                    }}
                    data-testid={`badge-difficulty-${set.id}`}
                  >
                    Ordförråd
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Exercise Types */}
      {selectedSet && (
        <div className="animate-in fade-in-50 slide-in-from-bottom-4">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4" data-testid="text-exercise-types-title">
            🎯 Välj övningstyp
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {exerciseTypes.map((type) => (
              <Card 
                key={type.id}
                className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => onStartExercise(selectedSet, type.id)}
                data-testid={`card-exercise-type-${type.id}`}
              >
                <CardHeader className="text-center pb-3">
                  <div className={`w-16 h-16 mx-auto rounded-full ${type.color} flex items-center justify-center mb-3`}>
                    {type.icon}
                  </div>
                  <CardTitle className="text-lg" data-testid={`text-exercise-title-${type.id}`}>
                    {type.title}
                  </CardTitle>
                  <CardDescription data-testid={`text-exercise-description-${type.id}`}>
                    {type.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Badge variant="outline" data-testid={`badge-exercise-difficulty-${type.id}`}>
                    {type.difficulty}
                  </Badge>
                  <div className="mt-2">
                    <Button 
                      className="w-full" 
                      size="sm"
                      onClick={() => onStartExercise(selectedSet, type.id)}
                      disabled={!selectedSet || wordsLoading || setWords.length === 0}
                      data-testid={`button-start-exercise-${type.id}`}
                    >
                      {wordsLoading ? (
                        <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <PlayCircle className="w-4 h-4 mr-2" />
                      )}
                      {!selectedSet ? 'Välj ett ordförrådsset först' : 
                       wordsLoading ? 'Laddar ord...' :
                       setWords.length === 0 ? 'Inga ord tillgängliga' :
                       'Starta övning'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Exercise Screen Component
function ExerciseScreen({ 
  exerciseType, 
  question, 
  exerciseState, 
  currentAnswer, 
  setCurrentAnswer, 
  onSubmitAnswer,
  showFeedback,
  feedbackResult,
  sensors,
  draggedItem,
  setDraggedItem,
  autoAdvance,
  setAutoAdvance,
  showManualNext,
  handleManualNext
}: {
  exerciseType: string,
  question: Question,
  exerciseState: ExerciseState,
  currentAnswer: string,
  setCurrentAnswer: (answer: string) => void,
  onSubmitAnswer: (answer: string) => void,
  showFeedback: boolean,
  feedbackResult: ExerciseResult | null,
  sensors: any,
  draggedItem: string | null,
  setDraggedItem: (item: string | null) => void,
  autoAdvance: boolean,
  setAutoAdvance: (value: boolean) => void,
  showManualNext: boolean,
  handleManualNext: () => void
}) {
  
  const renderExercise = () => {
    switch (exerciseType) {
      case 'true_false':
        return <TrueFalseExercise 
          question={question as TrueFalseQuestion}
          onAnswer={onSubmitAnswer}
          disabled={showFeedback}
        />;
      
      case 'fill_in_blank':
        return <FillInBlankExercise 
          question={question as FillInBlankQuestion}
          currentAnswer={currentAnswer}
          setCurrentAnswer={setCurrentAnswer}
          onSubmitAnswer={onSubmitAnswer}
          disabled={showFeedback}
        />;
      
      case 'matching':
        return <MatchingExercise 
          question={question as MatchingQuestion}
          onAnswer={onSubmitAnswer}
          disabled={showFeedback}
          sensors={sensors}
          draggedItem={draggedItem}
          setDraggedItem={setDraggedItem}
          autoAdvance={autoAdvance}
          setAutoAdvance={setAutoAdvance}
        />;

      case 'image_matching':
        return <ImageMatchingExercise 
          question={question as ImageMatchingQuestion}
          onAnswer={onSubmitAnswer}
          disabled={showFeedback}
          sensors={sensors}
          draggedItem={draggedItem}
          setDraggedItem={setDraggedItem}
          autoAdvance={autoAdvance}
          setAutoAdvance={setAutoAdvance}
        />;

      case 'crossword':
        return <CrosswordExercise 
          question={question as CrosswordQuestion}
          onAnswer={onSubmitAnswer}
          disabled={showFeedback}
        />;

      case 'sentence_completion':
        return <SentenceCompletionExercise 
          question={question as SentenceCompletionQuestion}
          currentAnswer={currentAnswer}
          setCurrentAnswer={setCurrentAnswer}
          onSubmitAnswer={onSubmitAnswer}
          disabled={showFeedback}
        />;

      case 'synonym_antonym':
        return <SynonymAntonymExercise 
          question={question as SynonymAntonymQuestion}
          onAnswer={onSubmitAnswer}
          disabled={showFeedback}
        />;
      
      default:
        return <div>Okänd övningstyp</div>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Exercise Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-current-question">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600" data-testid="text-question-number">
              {exerciseState.currentQuestion + 1}
            </div>
            <div className="text-sm text-gray-600">av {exerciseState.totalQuestions}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-current-score">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600" data-testid="text-score">
              {exerciseState.score}
            </div>
            <div className="text-sm text-gray-600">Poäng</div>
          </CardContent>
        </Card>
        <Card data-testid="card-current-streak">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600" data-testid="text-streak">
              {exerciseState.streak}
            </div>
            <div className="text-sm text-gray-600">I rad</div>
          </CardContent>
        </Card>
        <Card data-testid="card-time-elapsed">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600" data-testid="text-time">
              {Math.floor((Date.now() - exerciseState.timeStarted) / 1000)}s
            </div>
            <div className="text-sm text-gray-600">Tid</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Exercise */}
      <Card className="p-8" data-testid="card-main-exercise">
        {renderExercise()}
      </Card>

      {/* Feedback Overlay */}
      {showFeedback && feedbackResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="feedback-overlay">
          <Card className={`max-w-md mx-4 ${feedbackResult.isCorrect ? 'border-green-500' : 'border-red-500'}`}>
            <CardContent className="p-8 text-center">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                feedbackResult.isCorrect 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-red-100 text-red-600'
              }`}>
                {feedbackResult.isCorrect ? 
                  <Check className="w-8 h-8" /> : 
                  <X className="w-8 h-8" />
                }
              </div>
              <h3 className={`text-xl font-bold mb-2 ${
                feedbackResult.isCorrect ? 'text-green-600' : 'text-red-600'
              }`} data-testid="text-feedback-result">
                {feedbackResult.isCorrect ? 'Rätt svar! 🎉' : 'Fel svar 😞'}
              </h3>
              <div className="text-lg text-gray-700 mb-6" data-testid="text-feedback-explanation">
                {exerciseType === 'true_false' && (
                  <p className="bg-blue-50 p-4 rounded-lg">
                    {(question as TrueFalseQuestion).explanation}
                  </p>
                )}
                {exerciseType === 'fill_in_blank' && (
                  <p className="bg-blue-50 p-4 rounded-lg">
                    Rätt svar är: <strong className="text-blue-800">{(question as FillInBlankQuestion).correctWord}</strong>
                  </p>
                )}
                {exerciseType === 'matching' && (
                  <p className="bg-blue-50 p-4 rounded-lg">
                    {feedbackResult.isCorrect 
                      ? 'Fantastiskt! Du matchade alla par korrekt!' 
                      : 'Nästan rätt! Några par matchade inte korrekt. Försök igen!'}
                  </p>
                )}
                {exerciseType === 'image_matching' && (
                  <p className="bg-blue-50 p-4 rounded-lg">
                    {feedbackResult.isCorrect 
                      ? 'Utmärkt! Du matchade alla bilder med rätt ord!' 
                      : 'Nästan rätt! Några bilder matchade inte korrekt. Försök igen!'}
                  </p>
                )}
                {exerciseType === 'crossword' && (
                  <p className="bg-blue-50 p-4 rounded-lg">
                    {feedbackResult.isCorrect 
                      ? 'Fantastiskt! Du löste hela korsordet!' 
                      : 'Bra försök! Några ord är inte rätt än. Kontrollera dina svar!'}
                  </p>
                )}
                {exerciseType === 'sentence_completion' && (
                  <p className="bg-blue-50 p-4 rounded-lg">
                    {feedbackResult.isCorrect 
                      ? 'Perfekt! Du använde ordet korrekt i meningen!' 
                      : 'Inte riktigt rätt. Tänk på ordets betydelse och försök igen!'}
                  </p>
                )}
                {exerciseType === 'synonym_antonym' && (
                  <p className="bg-blue-50 p-4 rounded-lg">
                    {feedbackResult.isCorrect 
                      ? 'Rätt svar! Du hittade rätt synonym/antonym!' 
                      : 'Fel svar. Tänk på vad ordet betyder och försök igen!'}
                  </p>
                )}
              </div>
              
              {/* Auto-advance indicator or manual next button */}
              {!autoAdvance && showManualNext && (
                <Button 
                  onClick={handleManualNext}
                  size="lg"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 text-lg"
                  data-testid="button-manual-next"
                >
                  <ArrowRight className="w-5 h-5 mr-2" />
                  Nästa fråga
                </Button>
              )}
              
              {autoAdvance && (
                <div className="flex items-center justify-center text-sm text-gray-500" data-testid="auto-advance-indicator">
                  <Timer className="w-4 h-4 mr-1" />
                  Nästa fråga kommer snart...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// True/False Exercise Component
function TrueFalseExercise({ 
  question, 
  onAnswer, 
  disabled 
}: { 
  question: TrueFalseQuestion, 
  onAnswer: (answer: string) => void, 
  disabled: boolean 
}) {
  return (
    <div className="text-center space-y-6">
      <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100" data-testid="text-true-false-statement">
        {question.statement}
      </h3>
      <p className="text-lg text-gray-600 dark:text-gray-400">
        Är detta påstående sant eller falskt?
      </p>
      <div className="flex gap-4 justify-center">
        <Button 
          size="lg"
          onClick={() => onAnswer('true')}
          disabled={disabled}
          className="bg-green-500 hover:bg-green-600 text-white min-w-32"
          data-testid="button-answer-true"
        >
          <Check className="w-5 h-5 mr-2" />
          Sant
        </Button>
        <Button 
          size="lg"
          onClick={() => onAnswer('false')}
          disabled={disabled}
          className="bg-red-500 hover:bg-red-600 text-white min-w-32"
          data-testid="button-answer-false"
        >
          <X className="w-5 h-5 mr-2" />
          Falskt
        </Button>
      </div>
    </div>
  );
}

// Fill in Blank Exercise Component
function FillInBlankExercise({ 
  question, 
  currentAnswer, 
  setCurrentAnswer, 
  onSubmitAnswer, 
  disabled 
}: { 
  question: FillInBlankQuestion,
  currentAnswer: string,
  setCurrentAnswer: (answer: string) => void,
  onSubmitAnswer: (answer: string) => void,
  disabled: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4" data-testid="text-fill-blank-sentence">
          {question.sentence}
        </h3>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Fyll i det saknade ordet
        </p>
      </div>
      
      <div className="max-w-md mx-auto space-y-4">
        <input
          type="text"
          value={currentAnswer}
          onChange={(e) => setCurrentAnswer(e.target.value)}
          className="w-full p-4 text-xl text-center border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
          placeholder="Skriv ditt svar här..."
          disabled={disabled}
          data-testid="input-fill-blank-answer"
          onKeyPress={(e) => {
            if (e.key === 'Enter' && currentAnswer.trim() && !disabled) {
              onSubmitAnswer(currentAnswer.trim());
            }
          }}
        />
        
        {question.hints && question.hints.length > 0 && (
          <div className="text-center text-sm text-gray-500" data-testid="text-fill-blank-hint">
            💡 Tips: {question.hints[0]}
          </div>
        )}
        
        <Button 
          onClick={() => onSubmitAnswer(currentAnswer.trim())}
          disabled={!currentAnswer.trim() || disabled}
          className="w-full"
          size="lg"
          data-testid="button-submit-fill-blank"
        >
          Svara
        </Button>
      </div>
    </div>
  );
}

// Matching Exercise Component  
function MatchingExercise({ 
  question, 
  onAnswer, 
  disabled, 
  sensors,
  draggedItem,
  setDraggedItem,
  autoAdvance,
  setAutoAdvance
}: { 
  question: MatchingQuestion,
  onAnswer: (answer: string) => void,
  disabled: boolean,
  sensors: any,
  draggedItem: string | null,
  setDraggedItem: (item: string | null) => void,
  autoAdvance: boolean,
  setAutoAdvance: (value: boolean) => void
}) {
  const [userMatches, setUserMatches] = useState<Record<string, string>>(question.userMatches);
  const [terms] = useState(question.pairs.map(p => ({ id: p.id, text: p.term })));
  const [definitions] = useState([...question.pairs.map(p => ({ id: p.id, text: p.definition }))].sort(() => Math.random() - 0.5));

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedItem(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedItem(null);
    
    if (over && active.id !== over.id) {
      const termId = active.id as string;
      const definitionId = over.id as string;
      
      // Find the definition text
      const matchedDefinition = definitions.find(d => d.id === definitionId);
      if (matchedDefinition) {
        setUserMatches(prev => ({
          ...prev,
          [termId]: matchedDefinition.text
        }));
      }
    }
  };

  const resetMatches = () => {
    setUserMatches({});
  };

  const submitMatches = () => {
    // Update the question with user matches for validation
    question.userMatches = userMatches;
    onAnswer('submitted');
  };

  const allPairsMatched = question.pairs.every(pair => userMatches[pair.id]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4" data-testid="text-matching-title">
          Matcha ord med definitioner
        </h3>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Dra termerna till rätt definitioner
        </p>
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Terms */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-center" data-testid="text-terms-title">Termer</h4>
            <div className="space-y-3">
              {terms.map(term => (
                <DraggableTerm 
                  key={term.id} 
                  term={term} 
                  disabled={disabled}
                  matched={!!userMatches[term.id]}
                />
              ))}
            </div>
          </div>

          {/* Definitions */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-center" data-testid="text-definitions-title">Definitioner</h4>
            <div className="space-y-3">
              {definitions.map(definition => (
                <DroppableDefinition 
                  key={definition.id} 
                  definition={definition}
                  matchedTerm={Object.entries(userMatches).find(([, def]) => def === definition.text)?.[0]}
                  terms={terms}
                />
              ))}
            </div>
          </div>
        </div>
        
        <DragOverlay>
          {draggedItem ? (
            <div className="p-4 rounded-lg border-2 bg-blue-200 border-blue-400 text-blue-900 text-center shadow-lg opacity-90">
              {terms.find(t => t.id === draggedItem)?.text || 'Dragging...'}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="text-center space-y-4">
        {/* Settings toggle for auto-advance */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoAdvance}
              onChange={(e) => setAutoAdvance(e.target.checked)}
              className="rounded"
              data-testid="checkbox-auto-advance"
            />
            Automatisk nästa fråga (3 sekunder)
          </label>
        </div>
        
        <div className="flex gap-4 justify-center flex-wrap">
          <Button 
            onClick={submitMatches}
            disabled={!allPairsMatched || disabled}
            size="lg"
            className="min-w-48"
            data-testid="button-submit-matching"
          >
            Kontrollera svar
          </Button>
          
          <Button 
            onClick={resetMatches}
            disabled={disabled || Object.keys(userMatches).length === 0}
            size="lg"
            variant="outline"
            className="min-w-48"
            data-testid="button-reset-matching"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Börja om
          </Button>
        </div>
      </div>
    </div>
  );
}

// Draggable Term Component
function DraggableTerm({ 
  term, 
  disabled, 
  matched 
}: { 
  term: { id: string, text: string }, 
  disabled: boolean,
  matched: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: term.id, disabled });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 rounded-lg border-2 text-center cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-30 z-10' : ''
      } ${
        matched 
          ? 'bg-green-100 border-green-300 text-green-800' 
          : 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200 hover:border-blue-400'
      } ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      }`}
      {...attributes}
      {...listeners}
      data-testid={`draggable-term-${term.id}`}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-label={`Draggable term: ${term.text}${matched ? ' - already matched' : ''}`}
    >
      {term.text}
    </div>
  );
}

// Droppable Definition Component
function DroppableDefinition({ 
  definition, 
  matchedTerm,
  terms
}: { 
  definition: { id: string, text: string },
  matchedTerm?: string,
  terms: { id: string, text: string }[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: definition.id });

  return (
    <div
      ref={setNodeRef}
      className={`p-4 rounded-lg border-2 min-h-16 flex items-center justify-center text-center transition-all ${
        matchedTerm 
          ? 'bg-green-100 border-green-300 text-green-800' 
          : isOver
            ? 'bg-yellow-100 border-yellow-300 text-yellow-800 border-dashed border-4'
            : 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200'
      }`}
      data-testid={`droppable-definition-${definition.id}`}
      role="region"
      aria-label={`Drop zone for definition: ${definition.text}${matchedTerm ? ' - matched' : ''}`}
    >
      <div className="text-center">
        <div className="font-medium">{definition.text}</div>
        {matchedTerm && (
          <div className="mt-2 text-sm font-bold text-green-700 bg-green-200 px-2 py-1 rounded">
            {terms.find(t => t.id === matchedTerm)?.text || 'Matched'}
          </div>
        )}
      </div>
    </div>
  );
}

// Image Matching Exercise Component  
function ImageMatchingExercise({ 
  question, 
  onAnswer, 
  disabled, 
  sensors,
  draggedItem,
  setDraggedItem,
  autoAdvance,
  setAutoAdvance
}: { 
  question: ImageMatchingQuestion,
  onAnswer: (answer: string) => void,
  disabled: boolean,
  sensors: any,
  draggedItem: string | null,
  setDraggedItem: (item: string | null) => void,
  autoAdvance: boolean,
  setAutoAdvance: (value: boolean) => void
}) {
  const [userMatches, setUserMatches] = useState<Record<string, string>>(question.userMatches);
  const [words] = useState(question.images.map(img => ({ id: img.id, text: img.word.term })));
  const [images] = useState([...question.images].sort(() => Math.random() - 0.5));

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedItem(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedItem(null);
    
    if (over && active.id !== over.id) {
      const wordId = active.id as string;
      const imageId = over.id as string;
      
      // Find the image word
      const matchedImage = images.find(img => img.id === imageId);
      if (matchedImage) {
        setUserMatches(prev => ({
          ...prev,
          [imageId]: matchedImage.word.term
        }));
      }
    }
  };

  const resetMatches = () => {
    setUserMatches({});
  };

  const submitMatches = () => {
    // Update the question with user matches for validation
    question.userMatches = userMatches;
    onAnswer('submitted');
  };

  const allImagesMatched = question.images.every(image => userMatches[image.id]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4" data-testid="text-image-matching-title">
          Matcha bilder med ord
        </h3>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Dra orden till rätt bilder
        </p>
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Words */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-center" data-testid="text-words-title">Ord</h4>
            <div className="space-y-3">
              {words.map(word => (
                <DraggableWord 
                  key={word.id} 
                  word={word} 
                  disabled={disabled}
                  matched={Object.values(userMatches).includes(word.text)}
                />
              ))}
            </div>
          </div>

          {/* Images */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-center" data-testid="text-images-title">Bilder</h4>
            <div className="grid grid-cols-2 gap-3">
              {images.map(image => (
                <DroppableImage 
                  key={image.id} 
                  image={image}
                  matchedWord={userMatches[image.id]}
                  words={words}
                />
              ))}
            </div>
          </div>
        </div>
        
        <DragOverlay>
          {draggedItem ? (
            <div className="p-4 rounded-lg border-2 bg-blue-200 border-blue-400 text-blue-900 text-center shadow-lg opacity-90">
              {words.find(w => w.id === draggedItem)?.text || 'Dragging...'}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoAdvance}
              onChange={(e) => setAutoAdvance(e.target.checked)}
              className="rounded"
              data-testid="checkbox-auto-advance"
            />
            Automatisk nästa fråga (3 sekunder)
          </label>
        </div>
        
        <div className="flex gap-4 justify-center flex-wrap">
          <Button 
            onClick={submitMatches}
            disabled={!allImagesMatched || disabled}
            size="lg"
            className="min-w-48"
            data-testid="button-submit-image-matching"
          >
            Kontrollera svar
          </Button>
          
          <Button 
            onClick={resetMatches}
            disabled={disabled || Object.keys(userMatches).length === 0}
            size="lg"
            variant="outline"
            className="min-w-48"
            data-testid="button-reset-image-matching"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Börja om
          </Button>
        </div>
      </div>
    </div>
  );
}

// Draggable Word Component for Image Matching
function DraggableWord({ 
  word, 
  disabled, 
  matched 
}: { 
  word: { id: string, text: string }, 
  disabled: boolean,
  matched: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: word.id, disabled });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 rounded-lg border-2 text-center cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-30 z-10' : ''
      } ${
        matched 
          ? 'bg-green-100 border-green-300 text-green-800' 
          : 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200 hover:border-blue-400'
      } ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      }`}
      {...attributes}
      {...listeners}
      data-testid={`draggable-word-${word.id}`}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-label={`Draggable word: ${word.text}${matched ? ' - already matched' : ''}`}
    >
      {word.text}
    </div>
  );
}

// Droppable Image Component for Image Matching
function DroppableImage({ 
  image, 
  matchedWord,
  words
}: { 
  image: ImageMatchingPair,
  matchedWord?: string,
  words: { id: string, text: string }[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: image.id });

  return (
    <div
      ref={setNodeRef}
      className={`relative aspect-square rounded-lg border-2 transition-all overflow-hidden ${
        matchedWord 
          ? 'border-green-300 bg-green-50' 
          : isOver
            ? 'border-yellow-300 bg-yellow-50 border-dashed border-4'
            : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
      }`}
      data-testid={`droppable-image-${image.id}`}
      role="region"
      aria-label={`Drop zone for image: ${image.alt}${matchedWord ? ' - matched' : ''}`}
    >
      <img 
        src={image.imageUrl} 
        alt={image.alt}
        className="w-full h-full object-cover"
        onError={(e) => {
          // Fallback to a placeholder or text
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.nextElementSibling?.setAttribute('style', 'display: flex');
        }}
      />
      <div className="hidden w-full h-full items-center justify-center bg-gray-200 text-gray-600 text-sm p-2">
        {image.word.term}
      </div>
      
      {matchedWord && (
        <div className="absolute bottom-0 left-0 right-0 bg-green-600 text-white text-sm font-bold text-center py-1">
          {matchedWord}
        </div>
      )}
    </div>
  );
}

// Crossword Exercise Component (using existing CrosswordBuilder)
function CrosswordExercise({
  question,
  onAnswer,
  disabled
}: {
  question: CrosswordQuestion,
  onAnswer: (answer: string) => void,
  disabled: boolean
}) {
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>(question.userAnswers);

  const handleAnswerChange = (clueId: string, answer: string) => {
    const newAnswers = { ...userAnswers, [clueId]: answer };
    setUserAnswers(newAnswers);
    question.userAnswers = newAnswers;
    
    // Check if all clues are answered
    const allAnswered = question.clues.every(clue => newAnswers[clue.id]?.trim());
    if (allAnswered) {
      onAnswer('all_completed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4" data-testid="text-crossword-title">
          Korsord
        </h3>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Lös korsorder genom att fylla i orden baserat på ledtrådarna
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Clues */}
        <div className="space-y-4">
          <h4 className="font-semibold text-lg text-center" data-testid="text-clues-title">Ledtrådar</h4>
          <div className="space-y-3">
            {question.clues.map(clue => (
              <div key={clue.id} className="border rounded-lg p-4 bg-gray-50" data-testid={`clue-${clue.id}`}>
                <div className="flex items-start gap-3">
                  <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {clue.number}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-2">
                      {clue.direction === 'across' ? 'Vågrät' : 'Lodrät'}
                    </p>
                    <p className="font-medium mb-3">{clue.clue}</p>
                    <input
                      type="text"
                      value={userAnswers[clue.id] || ''}
                      onChange={(e) => handleAnswerChange(clue.id, e.target.value)}
                      placeholder={`${clue.answer.length} bokstäver`}
                      maxLength={clue.answer.length}
                      className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none uppercase tracking-wider"
                      disabled={disabled}
                      data-testid={`input-clue-${clue.id}`}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {userAnswers[clue.id]?.length || 0} / {clue.answer.length} bokstäver
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress and visual feedback */}
        <div className="space-y-4">
          <h4 className="font-semibold text-lg text-center" data-testid="text-progress-title">Framsteg</h4>
          <div className="bg-white rounded-lg p-4 border">
            <div className="space-y-3">
              {question.clues.map(clue => {
                const userAnswer = userAnswers[clue.id] || '';
                const isComplete = userAnswer.length === clue.answer.length;
                const isCorrect = userAnswer.toUpperCase() === clue.answer.toUpperCase();
                
                return (
                  <div key={clue.id} className="flex items-center justify-between p-2 rounded" data-testid={`progress-clue-${clue.id}`}>
                    <span className="text-sm font-medium">{clue.number}. {clue.direction === 'across' ? 'Vågrät' : 'Lodrät'}</span>
                    <div className="flex items-center gap-2">
                      {isComplete && isCorrect && (
                        <Check className="w-5 h-5 text-green-600" />
                      )}
                      {isComplete && !isCorrect && (
                        <X className="w-5 h-5 text-red-600" />
                      )}
                      <div className="text-xs text-gray-500">
                        {userAnswer.length} / {clue.answer.length}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600 text-center">
                {question.clues.filter(clue => {
                  const userAnswer = userAnswers[clue.id] || '';
                  return userAnswer.toUpperCase() === clue.answer.toUpperCase();
                }).length} av {question.clues.length} ord rätt
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sentence Completion Exercise Component
function SentenceCompletionExercise({
  question,
  currentAnswer,
  setCurrentAnswer,
  onSubmitAnswer,
  disabled
}: {
  question: SentenceCompletionQuestion,
  currentAnswer: string,
  setCurrentAnswer: (answer: string) => void,
  onSubmitAnswer: (answer: string) => void,
  disabled: boolean
}) {
  const handleWordBankClick = (word: string) => {
    if (question.sentenceType === 'word_bank') {
      setCurrentAnswer(word);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4" data-testid="text-sentence-completion-title">
          Meningsifyllning
        </h3>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          {question.sentenceType === 'fill_blank' && 'Fyll i det saknade ordet'}
          {question.sentenceType === 'word_bank' && 'Välj rätt ord från ordbanken'}
          {question.sentenceType === 'create_sentence' && 'Skapa en mening med ordet'}
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Context */}
        {question.context && (
          <div className="bg-blue-50 p-4 rounded-lg text-center" data-testid="sentence-context">
            <p className="text-sm text-blue-800 font-medium">Ordets betydelse:</p>
            <p className="text-blue-700">{question.context}</p>
          </div>
        )}

        {/* Sentence */}
        <div className="text-center">
          <div className="text-xl font-medium mb-4 leading-relaxed" data-testid="sentence-prompt">
            {question.sentence}
          </div>
        </div>

        {/* Word Bank (if applicable) */}
        {question.sentenceType === 'word_bank' && question.wordBank.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-center" data-testid="wordbank-title">Ordbank</h4>
            <div className="flex flex-wrap gap-3 justify-center">
              {question.wordBank.map((word, index) => (
                <Button
                  key={index}
                  variant={currentAnswer === word ? "default" : "outline"}
                  size="lg"
                  onClick={() => handleWordBankClick(word)}
                  disabled={disabled}
                  className="min-w-24"
                  data-testid={`wordbank-option-${index}`}
                >
                  {word}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="space-y-4">
          {question.sentenceType === 'create_sentence' ? (
            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              placeholder={`Skriv en mening som använder ordet "${question.correctWord}"...`}
              disabled={disabled}
              rows={3}
              data-testid="input-sentence-creation"
              maxLength={200}
            />
          ) : (
            <input
              type="text"
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              className="w-full p-4 text-xl text-center border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              placeholder="Skriv ditt svar här..."
              disabled={disabled}
              data-testid="input-sentence-completion"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && currentAnswer.trim() && !disabled) {
                  onSubmitAnswer(currentAnswer.trim());
                }
              }}
            />
          )}
          
          <Button 
            onClick={() => onSubmitAnswer(currentAnswer.trim())}
            disabled={!currentAnswer.trim() || disabled}
            className="w-full"
            size="lg"
            data-testid="button-submit-sentence"
          >
            Svara
          </Button>
        </div>
      </div>
    </div>
  );
}

// Synonym/Antonym Exercise Component
function SynonymAntonymExercise({
  question,
  onAnswer,
  disabled
}: {
  question: SynonymAntonymQuestion,
  onAnswer: (answer: string) => void,
  disabled: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4" data-testid="text-synonym-antonym-title">
          {question.questionType === 'synonym' ? 'Synonymer' : 'Antonymer'}
        </h3>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          {question.questionType === 'synonym' 
            ? 'Välj ordet som betyder samma sak' 
            : 'Välj ordet som betyder motsatsen'}
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Target Word */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg mb-4">
            <div className="text-3xl font-bold mb-2" data-testid="target-word">
              {question.targetWord}
            </div>
            <div className="text-sm opacity-90">
              Hitta {question.questionType === 'synonym' ? 'synonym' : 'antonym'}
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {question.options.map((option, index) => (
            <Button
              key={index}
              variant="outline"
              size="lg"
              onClick={() => onAnswer(option)}
              disabled={disabled}
              className="p-6 text-lg font-medium h-auto hover:bg-blue-50 hover:border-blue-300"
              data-testid={`option-${index}`}
            >
              {option}
            </Button>
          ))}
        </div>

        {/* Explanation */}
        {question.explanation && (
          <div className="bg-gray-50 p-4 rounded-lg text-center text-sm text-gray-600" data-testid="explanation">
            💡 {question.explanation}
          </div>
        )}
      </div>
    </div>
  );
}

// Results Screen Component
function ResultsScreen({ 
  exerciseState, 
  selectedSet, 
  exerciseType, 
  rewardInfo,
  onTryAgain, 
  onBackToSelection 
}: {
  exerciseState: ExerciseState,
  selectedSet: VocabularySet,
  exerciseType: string,
  rewardInfo: {
    rewards: {
      coinsEarned: number;
      baseCoins: number;
      accuracyBonus: number;
      exerciseTypeBonus: number;
      streakBonusCoins: number;
      experienceEarned: number;
      totalReward: number;
    };
    streak: {
      current: number;
      previous: number;
      longest: number;
      isNewDay: boolean;
      continued: boolean;
      broken: boolean;
      nextMilestone: number;
    };
    achievement: {
      title: string;
      coinsAwarded: number;
      type: string;
    } | null;
    performance: {
      accuracy: number;
      correctAnswers: number;
      totalQuestions: number;
      exerciseType: string;
    };
  } | null,
  onTryAgain: () => void,
  onBackToSelection: () => void
}) {
  const correctAnswers = exerciseState.results.filter(r => r.isCorrect).length;
  const accuracy = Math.round((correctAnswers / exerciseState.totalQuestions) * 100);
  const totalTime = Math.round((Date.now() - exerciseState.timeStarted) / 1000);
  
  const getPerformanceMessage = () => {
    if (accuracy >= 90) return { message: "WOW! Du är en riktig ordhjälte! Du förstår orden perfekt! 🌟", emoji: "🏆", color: "text-yellow-600" };
    if (accuracy >= 75) return { message: "Superbra! Du är riktigt duktig på ord! Fortsätt så! 👏", emoji: "🎉", color: "text-green-600" };
    if (accuracy >= 60) return { message: "Bra jobbat! Du lär dig mer och mer! Kämpa på! 💪", emoji: "🚀", color: "text-blue-600" };
    return { message: "Bra försök! Varje gång du tränar blir du bättre! 🌱", emoji: "📚", color: "text-purple-600" };
  };

  const performance = getPerformanceMessage();

  const getStreakMessage = () => {
    if (!rewardInfo?.streak) return null;
    
    const { current, continued, isNewDay, broken, nextMilestone } = rewardInfo.streak;
    
    if (broken) return { message: "Ingen fara! Din streak börjar på nytt idag! 🌱", emoji: "🔄", color: "text-blue-500" };
    if (isNewDay && continued) return { message: `Fantastiskt! Du fortsätter din ${current}-dagars streak! 🔥`, emoji: "🔥", color: "text-orange-500" };
    if (isNewDay) return { message: "Du började din streak idag! Håll igång! 💪", emoji: "⭐", color: "text-green-500" };
    if (current > 0) return { message: `Du har en ${current}-dagars streak! Kom tillbaka imorgon! 📅`, emoji: "📅", color: "text-blue-500" };
    
    return null;
  };

  const streakInfo = getStreakMessage();

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-center">
      <div className="space-y-4">
        <div className="text-6xl animate-bounce">{performance.emoji}</div>
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100" data-testid="text-results-title">
          Övning klar!
        </h2>
        <p className={`text-xl font-semibold ${performance.color}`} data-testid="text-performance-message">
          {performance.message}
        </p>
        
        {/* Coin Rewards Display */}
        {rewardInfo?.rewards && (
          <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-800 dark:to-yellow-700 rounded-2xl p-6 border-2 border-yellow-300 dark:border-yellow-600">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="text-4xl animate-spin">🪙</div>
              <h3 className="text-2xl font-bold text-yellow-800 dark:text-yellow-100" data-testid="text-coins-earned">
                +{rewardInfo.rewards.coinsEarned} mynt!
              </h3>
              <div className="text-4xl animate-spin">🪙</div>
            </div>
            
            <div className="space-y-2 text-sm text-yellow-700 dark:text-yellow-200">
              {rewardInfo.rewards.baseCoins > 0 && (
                <div className="flex justify-between">
                  <span>Grundbelöning:</span>
                  <span className="font-semibold">+{rewardInfo.rewards.baseCoins} mynt</span>
                </div>
              )}
              {rewardInfo.rewards.accuracyBonus > 0 && (
                <div className="flex justify-between">
                  <span>Träffsäkerhetsbonus:</span>
                  <span className="font-semibold">+{rewardInfo.rewards.accuracyBonus} mynt</span>
                </div>
              )}
              {rewardInfo.rewards.exerciseTypeBonus > 0 && (
                <div className="flex justify-between">
                  <span>Övningstypsbonus:</span>
                  <span className="font-semibold">+{rewardInfo.rewards.exerciseTypeBonus} mynt</span>
                </div>
              )}
              {rewardInfo.rewards.streakBonusCoins > 0 && (
                <div className="flex justify-between">
                  <span>🔥 Streak-bonus:</span>
                  <span className="font-semibold">+{rewardInfo.rewards.streakBonusCoins} mynt</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Streak Information */}
        {streakInfo && (
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-800 dark:to-purple-800 rounded-xl p-4 border border-blue-300 dark:border-blue-600">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="text-2xl">{streakInfo.emoji}</div>
              <p className={`text-lg font-semibold ${streakInfo.color}`} data-testid="text-streak-message">
                {streakInfo.message}
              </p>
            </div>
            
            {rewardInfo?.streak && (
              <div className="text-center text-sm text-gray-600 dark:text-gray-300">
                Nästa mål: {rewardInfo.streak.nextMilestone} dagar i rad
              </div>
            )}
          </div>
        )}

        {/* Achievement Unlock */}
        {rewardInfo?.achievement && (
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-800 dark:to-pink-800 rounded-xl p-6 border-2 border-purple-300 dark:border-purple-600 animate-pulse">
            <div className="text-center space-y-2">
              <div className="text-4xl">🏆</div>
              <h3 className="text-xl font-bold text-purple-800 dark:text-purple-100" data-testid="text-achievement-title">
                Prestation upplåst!
              </h3>
              <p className="text-lg font-semibold text-purple-700 dark:text-purple-200" data-testid="text-achievement-name">
                {rewardInfo.achievement.title}
              </p>
              <p className="text-sm text-purple-600 dark:text-purple-300">
                +{rewardInfo.achievement.coinsAwarded} extra mynt!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Results Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-final-score">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2" data-testid="text-final-score">
              {exerciseState.score}
            </div>
            <div className="text-sm text-gray-600">Totala poäng</div>
          </CardContent>
        </Card>
        
        <Card data-testid="card-accuracy">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2" data-testid="text-accuracy">
              {accuracy}%
            </div>
            <div className="text-sm text-gray-600">Träffsäkerhet</div>
          </CardContent>
        </Card>
        
        <Card data-testid="card-max-streak">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2" data-testid="text-max-streak">
              {exerciseState.maxStreak}
            </div>
            <div className="text-sm text-gray-600">Längsta svarsrad</div>
          </CardContent>
        </Card>
        
        <Card data-testid="card-total-time">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2" data-testid="text-total-time">
              {totalTime}s
            </div>
            <div className="text-sm text-gray-600">Total tid</div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card data-testid="card-achievements">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Prestationer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap justify-center gap-4">
            {accuracy === 100 && (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300" data-testid="badge-perfect-score">
                🏆 Perfekt poäng!
              </Badge>
            )}
            {exerciseState.maxStreak >= 5 && (
              <Badge className="bg-orange-100 text-orange-800 border-orange-300" data-testid="badge-streak-master">
                🔥 Svarsradens mästare!
              </Badge>
            )}
            {totalTime <= 60 && (
              <Badge className="bg-blue-100 text-blue-800 border-blue-300" data-testid="badge-speed-demon">
                ⚡ Snabbtänkare!
              </Badge>
            )}
            {accuracy >= 80 && (
              <Badge className="bg-green-100 text-green-800 border-green-300" data-testid="badge-word-master">
                📚 Ordmästare!
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Button 
          onClick={onTryAgain}
          size="lg"
          className="min-w-32"
          data-testid="button-try-again"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Försök igen
        </Button>
        <Button 
          onClick={onBackToSelection}
          variant="outline"
          size="lg"
          className="min-w-32"
          data-testid="button-back-to-selection"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Välj ny övning
        </Button>
      </div>
    </div>
  );
}