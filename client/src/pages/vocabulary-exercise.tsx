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
  TrendingUp
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

type Question = TrueFalseQuestion | FillInBlankQuestion | MatchingQuestion;

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

  // Save attempt to backend
  const saveAttemptMutation = useMutation({
    mutationFn: async (attemptData: typeof insertVocabularyAttemptSchema._input) => {
      if (!exerciseId) {
        throw new Error('No exercise ID available');
      }
      return apiRequest('POST', `/api/vocabulary/exercises/${exerciseId}/attempts`, attemptData);
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/vocabulary/exercises', exerciseId, 'attempts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vocabulary/sets', 'published'] });
      toast({
        title: "Bra jobbat! 🎉",
        description: "Ditt resultat har sparats och du kan se det i dina framsteg."
      });
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
    
    const attemptData = {
      exerciseId: exerciseId,
      studentId: user?.id || 'anonymous', // Use authenticated user ID if available
      status: 'completed' as const,
      score: exerciseState.score,
      maxScore: exerciseState.totalQuestions * 10,
      timeSpent: Math.floor((Date.now() - exerciseState.timeStarted) / 1000), // in seconds
      answersData: exerciseState.results,
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

// Results Screen Component
function ResultsScreen({ 
  exerciseState, 
  selectedSet, 
  exerciseType, 
  onTryAgain, 
  onBackToSelection 
}: {
  exerciseState: ExerciseState,
  selectedSet: VocabularySet,
  exerciseType: string,
  onTryAgain: () => void,
  onBackToSelection: () => void
}) {
  const correctAnswers = exerciseState.results.filter(r => r.isCorrect).length;
  const accuracy = Math.round((correctAnswers / exerciseState.totalQuestions) * 100);
  const totalTime = Math.round((Date.now() - exerciseState.timeStarted) / 1000);
  
  const getPerformanceMessage = () => {
    if (accuracy >= 90) return { message: "Fantastiskt! Du är en ordförrådsexpert! 🌟", emoji: "🏆", color: "text-yellow-600" };
    if (accuracy >= 75) return { message: "Bra jobbat! Du förstår orden mycket bra! 👏", emoji: "🎉", color: "text-green-600" };
    if (accuracy >= 60) return { message: "Inte dåligt! Fortsätt träna så blir du ännu bättre! 💪", emoji: "🚀", color: "text-blue-600" };
    return { message: "Bra försök! Träna mer så kommer du att förbättras! 🌱", emoji: "📚", color: "text-purple-600" };
  };

  const performance = getPerformanceMessage();

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