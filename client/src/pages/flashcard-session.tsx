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
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  Repeat,
  Volume2,
  Settings,
  Flame
} from "lucide-react";
import { 
  type VocabularySet, 
  type VocabularyWord,
  type FlashcardSession,
  type FlashcardProgress,
  type FlashcardStreak,
  type FlashcardSessionData,
  type FlashcardCardResult,
  insertFlashcardSessionSchema,
  insertFlashcardProgressSchema
} from "@shared/schema";

type LearningMode = 'study' | 'practice' | 'test' | 'mixed';
type MasteryLevel = 'learning' | 'familiar' | 'mastered';

interface FlashcardState {
  currentCardIndex: number;
  totalCards: number;
  cardsCompleted: number;
  cardsCorrect: number;
  cardsIncorrect: number;
  cardsSkipped: number;
  sessionStartTime: number;
  results: FlashcardCardResult[];
}

interface FlashcardConfig {
  mode: LearningMode;
  targetCards: number;
  shuffled: boolean;
  showDefinitionFirst: boolean;
  autoAdvance: boolean;
  timeLimit?: number;
}

// Learning mode configurations
const LEARNING_MODES = [
  {
    id: 'study' as LearningMode,
    title: 'Studera',
    description: 'Bläddra genom kort utan poängsättning',
    icon: <BookOpen className="w-6 h-6" />,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    difficulty: 'Lugnt tempo'
  },
  {
    id: 'practice' as LearningMode,
    title: 'Öva',
    description: 'Självbedömning med "Lätt/Svårt" feedback',
    icon: <Brain className="w-6 h-6" />,
    color: 'bg-green-100 text-green-800 border-green-200',
    difficulty: 'Interaktivt'
  },
  {
    id: 'test' as LearningMode,
    title: 'Testa',
    description: 'Formell bedömning med streak-spårning',
    icon: <Target className="w-6 h-6" />,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    difficulty: 'Utmanande'
  },
  {
    id: 'mixed' as LearningMode,
    title: 'Blandat',
    description: 'Slumpmässig ordning med spaced repetition',
    icon: <Shuffle className="w-6 h-6" />,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    difficulty: 'Anpassat'
  }
];

export default function FlashcardSession() {
  const { setId } = useParams<{ setId: string }>();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Session state
  const [config, setConfig] = useState<FlashcardConfig>({
    mode: 'study',
    targetCards: 10,
    shuffled: true,
    showDefinitionFirst: false,
    autoAdvance: false
  });
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  
  // Flashcard state
  const [flashcardState, setFlashcardState] = useState<FlashcardState>({
    currentCardIndex: 0,
    totalCards: 0,
    cardsCompleted: 0,
    cardsCorrect: 0,
    cardsIncorrect: 0,
    cardsSkipped: 0,
    sessionStartTime: Date.now(),
    results: []
  });

  // Card display state
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardStartTime, setCardStartTime] = useState(Date.now());
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [currentSession, setCurrentSession] = useState<FlashcardSession | null>(null);

  // Fetch vocabulary set and words
  const { data: vocabularySet, isLoading: setLoading } = useQuery<VocabularySet>({
    queryKey: ['/api/vocabulary/sets', setId],
    enabled: !!setId
  });

  const { data: vocabularyWords, isLoading: wordsLoading } = useQuery<VocabularyWord[]>({
    queryKey: ['/api/vocabulary/words', setId],
    enabled: !!setId
  });

  // Fetch current streak
  const { data: currentStreak } = useQuery<FlashcardStreak>({
    queryKey: ['/api/flashcard/streak', user?.id],
    enabled: !!user?.id
  });

  // Fetch existing progress for words
  const { data: existingProgress } = useQuery<FlashcardProgress[]>({
    queryKey: ['/api/flashcard/progress/by-set', user?.id, setId],
    enabled: !!user?.id && !!setId
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: (sessionData: any) => apiRequest('/api/flashcard/sessions', 'POST', sessionData),
    onSuccess: (session) => {
      setCurrentSession(session);
      queryClient.invalidateQueries({ queryKey: ['/api/flashcard/sessions'] });
    },
    onError: (error) => {
      toast({
        title: "Fel",
        description: "Kunde inte starta flashcard-session",
        variant: "destructive",
      });
    }
  });

  // Update session mutation - now handles server-calculated rewards
  const updateSessionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => 
      apiRequest(`/api/flashcard/sessions/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/flashcard/sessions'] });
    }
  });

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: (progressData: any) => apiRequest('/api/flashcard/progress', 'POST', progressData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/flashcard/progress/by-set'] });
      queryClient.invalidateQueries({ queryKey: ['/api/flashcard/progress/by-word'] });
    }
  });

  // Update streak mutation
  const updateStreakMutation = useMutation({
    mutationFn: (streakData: any) => apiRequest('/api/flashcard/streak', 'POST', streakData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/flashcard/streak'] });
    }
  });

  // Initialize words when data is loaded
  useEffect(() => {
    if (vocabularyWords && vocabularyWords.length > 0) {
      let processedWords = [...vocabularyWords];
      
      // Filter based on mode and existing progress
      if (config.mode === 'mixed' && existingProgress) {
        // Prioritize words that need review
        const progressMap = new Map(existingProgress.map(p => [p.wordId, p]));
        processedWords = processedWords.sort((a, b) => {
          const aProgress = progressMap.get(a.id);
          const bProgress = progressMap.get(b.id);
          
          // Words never reviewed come first
          if (!aProgress && bProgress) return -1;
          if (aProgress && !bProgress) return 1;
          if (!aProgress && !bProgress) return 0;
          
          // Then sort by review priority (next review date)
          const aReview = aProgress?.nextReviewDate ? new Date(aProgress.nextReviewDate).getTime() : Date.now();
          const bReview = bProgress?.nextReviewDate ? new Date(bProgress.nextReviewDate).getTime() : Date.now();
          return aReview - bReview;
        });
      }
      
      // Shuffle if requested
      if (config.shuffled) {
        processedWords = processedWords.sort(() => Math.random() - 0.5);
      }
      
      // Limit to target number
      const targetWords = processedWords.slice(0, config.targetCards);
      setWords(targetWords);
      
      setFlashcardState(prev => ({
        ...prev,
        totalCards: targetWords.length,
        sessionStartTime: Date.now()
      }));
    }
  }, [vocabularyWords, config, existingProgress]);

  // Start session
  const startSession = useCallback(async () => {
    if (!user?.id || !setId || words.length === 0) return;

    const sessionData = {
      studentId: user.id,
      setId: setId,
      mode: config.mode,
      totalCards: words.length,
      targetCards: config.targetCards,
      streakAtStart: currentStreak?.currentStreak || 0,
      startedAt: new Date(),
      sessionData: {
        cards: [],
        sessionConfig: {
          shuffled: config.shuffled,
          showDefinitionFirst: config.showDefinitionFirst,
          autoAdvance: config.autoAdvance,
          timeLimit: config.timeLimit
        }
      } as FlashcardSessionData
    };

    try {
      await createSessionMutation.mutateAsync(sessionData);
      setSessionStarted(true);
      setCardStartTime(Date.now());
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  }, [user?.id, setId, words, config, currentStreak, createSessionMutation]);

  // Handle card flip
  const handleCardFlip = useCallback(() => {
    setIsFlipped(!isFlipped);
  }, [isFlipped]);

  // Handle card response (for practice and test modes)
  const handleCardResponse = useCallback(async (response: 'easy' | 'hard' | 'again' | 'correct' | 'incorrect') => {
    if (!currentSession || !user?.id) return;

    const currentWord = words[flashcardState.currentCardIndex];
    if (!currentWord) return;

    const responseTime = Date.now() - cardStartTime;
    const isCorrect = response === 'easy' || response === 'correct';
    
    // Determine new mastery level
    const currentProgress = existingProgress?.find(p => p.wordId === currentWord.id);
    let newMasteryLevel: MasteryLevel = currentProgress?.masteryLevel || 'learning';
    
    if (config.mode === 'practice') {
      // Update mastery based on self-assessment
      if (response === 'easy') {
        newMasteryLevel = newMasteryLevel === 'learning' ? 'familiar' : 'mastered';
      } else if (response === 'hard' || response === 'again') {
        newMasteryLevel = 'learning';
      }
    } else if (config.mode === 'test') {
      // Update mastery based on correctness
      if (isCorrect) {
        newMasteryLevel = newMasteryLevel === 'learning' ? 'familiar' : 'mastered';
      } else {
        newMasteryLevel = 'learning';
      }
    }

    // Create card result
    const cardResult: FlashcardCardResult = {
      wordId: currentWord.id,
      term: currentWord.term,
      definition: currentWord.definition,
      userRating: config.mode === 'practice' ? response as 'easy' | 'hard' | 'again' : undefined,
      isCorrect: config.mode === 'test' ? isCorrect : undefined,
      responseTime,
      hintsUsed: 0,
      skipped: false,
      masteryLevelBefore: currentProgress?.masteryLevel || 'learning',
      masteryLevelAfter: newMasteryLevel,
      timestamp: new Date().toISOString()
    };

    // Update flashcard state
    setFlashcardState(prev => ({
      ...prev,
      currentCardIndex: prev.currentCardIndex + 1,
      cardsCompleted: prev.cardsCompleted + 1,
      cardsCorrect: isCorrect ? prev.cardsCorrect + 1 : prev.cardsCorrect,
      cardsIncorrect: !isCorrect ? prev.cardsIncorrect + 1 : prev.cardsIncorrect,
      results: [...prev.results, cardResult]
    }));

    // Update word progress
    const progressData = {
      studentId: user.id,
      wordId: currentWord.id,
      setId: setId!,
      masteryLevel: newMasteryLevel,
      timesReviewed: (currentProgress?.timesReviewed || 0) + 1,
      timesCorrect: isCorrect ? (currentProgress?.timesCorrect || 0) + 1 : (currentProgress?.timesCorrect || 0),
      timesIncorrect: !isCorrect ? (currentProgress?.timesIncorrect || 0) + 1 : (currentProgress?.timesIncorrect || 0),
      currentStreak: isCorrect ? (currentProgress?.currentStreak || 0) + 1 : 0,
      lastReviewDate: new Date(),
      averageResponseTime: Math.round(((currentProgress?.averageResponseTime || 0) + responseTime) / 2),
      lastResponseTime: responseTime
    };

    try {
      await updateProgressMutation.mutateAsync(progressData);
    } catch (error) {
      console.error('Failed to update progress:', error);
    }

    // Reset card state for next card
    setIsFlipped(false);
    setCardStartTime(Date.now());

    // Check if session is complete
    if (flashcardState.currentCardIndex + 1 >= words.length) {
      await completeSession();
    }
  }, [currentSession, user?.id, words, flashcardState, cardStartTime, config, existingProgress, setId, updateProgressMutation]);

  // Skip card
  const handleSkipCard = useCallback(async () => {
    if (!currentSession) return;

    const currentWord = words[flashcardState.currentCardIndex];
    if (!currentWord) return;

    const cardResult: FlashcardCardResult = {
      wordId: currentWord.id,
      term: currentWord.term,
      definition: currentWord.definition,
      responseTime: Date.now() - cardStartTime,
      hintsUsed: 0,
      skipped: true,
      masteryLevelBefore: existingProgress?.find(p => p.wordId === currentWord.id)?.masteryLevel || 'learning',
      masteryLevelAfter: existingProgress?.find(p => p.wordId === currentWord.id)?.masteryLevel || 'learning',
      timestamp: new Date().toISOString()
    };

    setFlashcardState(prev => ({
      ...prev,
      currentCardIndex: prev.currentCardIndex + 1,
      cardsSkipped: prev.cardsSkipped + 1,
      results: [...prev.results, cardResult]
    }));

    setIsFlipped(false);
    setCardStartTime(Date.now());

    // Check if session is complete
    if (flashcardState.currentCardIndex + 1 >= words.length) {
      await completeSession();
    }
  }, [currentSession, words, flashcardState, cardStartTime, existingProgress]);

  // Complete session - SECURE VERSION (server-calculated rewards)
  const completeSession = useCallback(async () => {
    if (!currentSession || !user?.id) return;

    const sessionEndTime = Date.now();
    const totalTime = sessionEndTime - flashcardState.sessionStartTime;
    const accuracy = flashcardState.cardsCorrect / Math.max(1, flashcardState.cardsCompleted) * 100;

    // Calculate new streak (client-side for UI, server will verify)
    let newStreak = currentStreak?.currentStreak || 0;
    if (config.mode !== 'study' && accuracy >= 60) {
      newStreak = newStreak + 1;
    }

    // Prepare session update data - DO NOT include reward amounts (server calculates them)
    const sessionUpdate = {
      cardsCompleted: flashcardState.cardsCompleted,
      cardsCorrect: flashcardState.cardsCorrect,
      cardsIncorrect: flashcardState.cardsIncorrect,
      cardsSkipped: flashcardState.cardsSkipped,
      totalTime,
      averageTimePerCard: Math.round(totalTime / Math.max(1, flashcardState.cardsCompleted)),
      accuracy,
      completedAt: new Date(),
      streakAtStart: currentStreak?.currentStreak || 0,
      streakAtEnd: newStreak,
      mode: config.mode,
      // DO NOT include coinsEarned or experienceEarned - server calculates these securely
      sessionData: {
        cards: flashcardState.results,
        sessionConfig: {
          shuffled: config.shuffled,
          showDefinitionFirst: config.showDefinitionFirst,
          autoAdvance: config.autoAdvance,
          timeLimit: config.timeLimit
        }
      } as FlashcardSessionData
    };

    try {
      // Update session and get server-calculated rewards
      const sessionResponse = await updateSessionMutation.mutateAsync({ 
        id: currentSession.id, 
        data: sessionUpdate 
      });
      
      // Update streak if it was a good session
      if (config.mode !== 'study' && accuracy >= 60) {
        const streakUpdate = {
          studentId: user.id,
          currentStreak: newStreak,
          lastStudyDate: new Date(),
          totalDaysStudied: (currentStreak?.totalDaysStudied || 0) + 1,
          totalCardsReviewed: (currentStreak?.totalCardsReviewed || 0) + flashcardState.cardsCompleted,
          totalCorrectAnswers: (currentStreak?.totalCorrectAnswers || 0) + flashcardState.cardsCorrect,
          totalSessionsCompleted: (currentStreak?.totalSessionsCompleted || 0) + 1
        };
        
        await updateStreakMutation.mutateAsync(streakUpdate);
      }

      // SECURITY: Currency is now awarded automatically by server on session completion
      // No client-side currency award calls - prevents manipulation
      
      // Refresh currency display (server has already awarded coins)
      queryClient.invalidateQueries({ queryKey: ['/api/students', user.id, 'currency'] });
      
      setSessionCompleted(true);
      
      // Show toast with server-calculated reward information
      const rewardInfo = sessionResponse.rewardInfo;
      let toastDescription = '';
      
      if (rewardInfo) {
        toastDescription = `Du tjänade ${rewardInfo.coinsEarned} mynt och ${rewardInfo.experienceEarned} XP!`;
        if (rewardInfo.streakBonusCoins > 0) {
          toastDescription += ` 🔥 Streak bonus: ${rewardInfo.streakBonusCoins} mynt!`;
        }
      } else {
        // Fallback if no reward info
        toastDescription = "Session avslutad! Dina framsteg har sparats.";
      }
      
      toast({
        title: newStreak > 0 ? `Session avslutad! ${newStreak} dagars streak! 🎉` : "Session avslutad! 🎉",
        description: toastDescription,
        variant: "default",
      });
    } catch (error) {
      console.error('Failed to complete session:', error);
      toast({
        title: "Fel",
        description: "Kunde inte spara session-resultatet",
        variant: "destructive",
      });
    }
  }, [currentSession, user?.id, flashcardState, config, currentStreak, updateSessionMutation, updateStreakMutation, toast, queryClient]);

  // Loading states
  if (authLoading || setLoading || wordsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-400">Laddar flashcards...</p>
        </div>
      </div>
    );
  }

  // Error states
  if (!vocabularySet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              Set hittades inte
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Det begärda ordförrådssetet kunde inte hittas.
            </p>
            <Button onClick={() => setLocation('/vocabulary')}>
              Tillbaka till ordförråd
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!vocabularyWords || vocabularyWords.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <BookOpen className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              Inga ord att öva
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Detta ordförrådsset innehåller inga ord att öva på.
            </p>
            <Button onClick={() => setLocation('/vocabulary')}>
              Välj ett annat set
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Session configuration screen
  if (!sessionStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => setLocation('/vocabulary')}
              className="mb-4"
              data-testid="button-back-to-vocabulary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka till ordförråd
            </Button>
            
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                Flashcards: {vocabularySet.title}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                {vocabularySet.description}
              </p>
              
              {/* Set stats */}
              <div className="flex justify-center gap-6 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{vocabularyWords.length}</div>
                  <div className="text-sm text-gray-500">Ord totalt</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {currentStreak?.currentStreak || 0}
                  </div>
                  <div className="text-sm text-gray-500">Daglig streak</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {existingProgress?.filter(p => p.masteryLevel === 'mastered').length || 0}
                  </div>
                  <div className="text-sm text-gray-500">Behärskade</div>
                </div>
              </div>
            </div>
          </div>

          {/* Learning mode selection */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-6 h-6" />
                Välj inlärningsläge
              </CardTitle>
              <CardDescription>
                Olika lägen hjälper dig att lära dig ord på olika sätt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {LEARNING_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setConfig(prev => ({ ...prev, mode: mode.id }))}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      config.mode === mode.id
                        ? `${mode.color} border-current shadow-md`
                        : 'border-gray-200 hover:border-gray-300 bg-white dark:bg-gray-800'
                    }`}
                    data-testid={`button-mode-${mode.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${mode.color}`}>
                        {mode.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">{mode.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {mode.description}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {mode.difficulty}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Session configuration */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-6 h-6" />
                Session-inställningar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Number of cards */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Antal kort att öva ({config.targetCards})
                </label>
                <input
                  type="range"
                  min="5"
                  max={Math.min(vocabularyWords.length, 50)}
                  value={config.targetCards}
                  onChange={(e) => setConfig(prev => ({ ...prev, targetCards: parseInt(e.target.value) }))}
                  className="w-full"
                  data-testid="input-target-cards"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5</span>
                  <span>{Math.min(vocabularyWords.length, 50)}</span>
                </div>
              </div>

              {/* Configuration toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={config.shuffled}
                    onChange={(e) => setConfig(prev => ({ ...prev, shuffled: e.target.checked }))}
                    className="form-checkbox h-5 w-5 text-blue-600"
                    data-testid="checkbox-shuffled"
                  />
                  <span className="text-sm font-medium">Blanda kort</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={config.showDefinitionFirst}
                    onChange={(e) => setConfig(prev => ({ ...prev, showDefinitionFirst: e.target.checked }))}
                    className="form-checkbox h-5 w-5 text-blue-600"
                    data-testid="checkbox-definition-first"
                  />
                  <span className="text-sm font-medium">Visa definition först</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={config.autoAdvance}
                    onChange={(e) => setConfig(prev => ({ ...prev, autoAdvance: e.target.checked }))}
                    className="form-checkbox h-5 w-5 text-blue-600"
                    data-testid="checkbox-auto-advance"
                  />
                  <span className="text-sm font-medium">Automatisk övergång</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Start session button */}
          <div className="text-center">
            <Button
              onClick={startSession}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg"
              disabled={createSessionMutation.isPending}
              data-testid="button-start-session"
            >
              {createSessionMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Startar...
                </>
              ) : (
                <>
                  <PlayCircle className="w-6 h-6 mr-2" />
                  Starta Flashcard-session
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Session completed screen
  if (sessionCompleted && currentSession) {
    return <SessionResults session={currentSession} flashcardState={flashcardState} onNewSession={() => {
      setSessionCompleted(false);
      setSessionStarted(false);
      setFlashcardState({
        currentCardIndex: 0,
        totalCards: 0,
        cardsCompleted: 0,
        cardsCorrect: 0,
        cardsIncorrect: 0,
        cardsSkipped: 0,
        sessionStartTime: Date.now(),
        results: []
      });
    }} onExit={() => setLocation('/vocabulary')} />;
  }

  // Active session screen
  const currentWord = words[flashcardState.currentCardIndex];
  const progress = (flashcardState.currentCardIndex / words.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Session header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => setShowExitDialog(true)}
              data-testid="button-exit-session"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Avsluta
            </Button>
            
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-sm font-medium">
                {LEARNING_MODES.find(m => m.id === config.mode)?.title}
              </Badge>
              
              {currentStreak && (currentStreak.currentStreak ?? 0) > 0 && (
                <div className="flex items-center gap-1 text-orange-600">
                  <Flame className="w-4 h-4" />
                  <span className="font-bold">{currentStreak.currentStreak ?? 0}</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Kort {flashcardState.currentCardIndex + 1} av {words.length}</span>
              <span>{Math.round(progress)}% klar</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
        </div>

        {/* Flashcard */}
        {currentWord && (
          <FlashcardComponent
            word={currentWord}
            isFlipped={isFlipped}
            onFlip={handleCardFlip}
            mode={config.mode}
            showDefinitionFirst={config.showDefinitionFirst}
            onResponse={handleCardResponse}
            onSkip={handleSkipCard}
            existingProgress={existingProgress?.find(p => p.wordId === currentWord.id)}
          />
        )}
      </div>

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avsluta session?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill avsluta denna flashcard-session? 
              Din framsteg kommer att sparas, men du kommer att förlora möjligheten att slutföra sessionen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fortsätt öva</AlertDialogCancel>
            <AlertDialogAction onClick={() => setLocation('/vocabulary')}>
              Ja, avsluta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Flashcard component with flip animation
function FlashcardComponent({ 
  word, 
  isFlipped, 
  onFlip, 
  mode, 
  showDefinitionFirst, 
  onResponse, 
  onSkip,
  existingProgress 
}: {
  word: VocabularyWord;
  isFlipped: boolean;
  onFlip: () => void;
  mode: LearningMode;
  showDefinitionFirst: boolean;
  onResponse: (response: 'easy' | 'hard' | 'again' | 'correct' | 'incorrect') => void;
  onSkip: () => void;
  existingProgress?: FlashcardProgress;
}) {
  const showFront = showDefinitionFirst ? !isFlipped : isFlipped;
  const frontContent = showDefinitionFirst ? word.definition : word.term;
  const backContent = showDefinitionFirst ? word.term : word.definition;

  return (
    <div className="mb-8">
      {/* Flashcard */}
      <div className="perspective-1000 mb-6">
        <div 
          className={`relative w-full h-80 transition-transform duration-700 transform-style-preserve-3d cursor-pointer ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          onClick={onFlip}
          data-testid="flashcard-container"
        >
          {/* Front of card */}
          <div className="absolute inset-0 w-full h-full backface-hidden">
            <Card className="h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-xl">
              <CardContent className="text-center p-8">
                <div className="text-3xl font-bold mb-4">{frontContent}</div>
                {existingProgress && (
                  <Badge 
                    variant="secondary" 
                    className={`${
                      existingProgress.masteryLevel === 'mastered' ? 'bg-green-100 text-green-800' :
                      existingProgress.masteryLevel === 'familiar' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}
                  >
                    {existingProgress.masteryLevel === 'mastered' ? 'Behärskad' :
                     existingProgress.masteryLevel === 'familiar' ? 'Bekant' : 'Lär mig'}
                  </Badge>
                )}
                <div className="text-sm opacity-75 mt-4">
                  Klicka för att vända
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Back of card */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180">
            <Card className="h-full flex items-center justify-center bg-gradient-to-br from-green-500 to-blue-600 text-white shadow-xl">
              <CardContent className="text-center p-8">
                <div className="text-3xl font-bold mb-4">{backContent}</div>
                {word.example && (
                  <div className="text-lg opacity-90 italic mb-4">
                    "{word.example}"
                  </div>
                )}
                <div className="text-sm opacity-75">
                  Klicka för att vända tillbaka
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Response buttons */}
      {isFlipped && (
        <div className="grid grid-cols-1 gap-4">
          {mode === 'study' && (
            <div className="flex gap-4">
              <Button
                onClick={onSkip}
                variant="outline"
                className="flex-1"
                data-testid="button-skip"
              >
                <ChevronRight className="w-4 h-4 mr-2" />
                Nästa kort
              </Button>
            </div>
          )}

          {mode === 'practice' && (
            <div className="grid grid-cols-3 gap-3">
              <Button
                onClick={() => onResponse('again')}
                variant="outline"
                className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                data-testid="button-again"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Igen
              </Button>
              <Button
                onClick={() => onResponse('hard')}
                variant="outline"
                className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                data-testid="button-hard"
              >
                <X className="w-4 h-4 mr-2" />
                Svårt
              </Button>
              <Button
                onClick={() => onResponse('easy')}
                variant="outline"
                className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                data-testid="button-easy"
              >
                <Check className="w-4 h-4 mr-2" />
                Lätt
              </Button>
            </div>
          )}

          {mode === 'test' && (
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => onResponse('incorrect')}
                variant="outline"
                className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 py-4"
                data-testid="button-incorrect"
              >
                <X className="w-5 h-5 mr-2" />
                Fel svar
              </Button>
              <Button
                onClick={() => onResponse('correct')}
                variant="outline"
                className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 py-4"
                data-testid="button-correct"
              >
                <Check className="w-5 h-5 mr-2" />
                Rätt svar
              </Button>
            </div>
          )}

          {mode === 'mixed' && (
            <div className="grid grid-cols-3 gap-3">
              <Button
                onClick={() => onResponse('again')}
                variant="outline"
                className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                data-testid="button-again"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Igen
              </Button>
              <Button
                onClick={() => onResponse('hard')}
                variant="outline"
                className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                data-testid="button-hard"
              >
                <X className="w-4 h-4 mr-2" />
                Svårt
              </Button>
              <Button
                onClick={() => onResponse('easy')}
                variant="outline"
                className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                data-testid="button-easy"
              >
                <Check className="w-4 h-4 mr-2" />
                Lätt
              </Button>
            </div>
          )}

          <Button
            onClick={onSkip}
            variant="ghost"
            className="mt-2 text-gray-500"
            data-testid="button-skip-card"
          >
            Hoppa över detta kort
          </Button>
        </div>
      )}
    </div>
  );
}

// Session results component
function SessionResults({ 
  session, 
  flashcardState, 
  onNewSession, 
  onExit 
}: {
  session: FlashcardSession;
  flashcardState: FlashcardState;
  onNewSession: () => void;
  onExit: () => void;
}) {
  const accuracy = flashcardState.cardsCorrect / Math.max(1, flashcardState.cardsCompleted) * 100;
  const totalTime = session.totalTime || 0;
  const avgTime = session.averageTimePerCard || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="text-center p-8">
          <CardContent>
            {/* Success animation */}
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Trophy className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                Bra jobbat! 🎉
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Du slutförde din flashcard-session
              </p>
            </div>

            {/* Results grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{flashcardState.cardsCompleted}</div>
                <div className="text-sm text-gray-600">Kort genomgångna</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{Math.round(accuracy)}%</div>
                <div className="text-sm text-gray-600">Noggrannhet</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{session.coinsEarned}</div>
                <div className="text-sm text-gray-600">Mynt tjänade</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{Math.round(avgTime / 1000)}s</div>
                <div className="text-sm text-gray-600">Snitt per kort</div>
              </div>
            </div>

            {/* Performance feedback */}
            <div className="mb-8 p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <h3 className="font-bold text-lg mb-2">Din prestation</h3>
              <div className="text-left space-y-2">
                {accuracy >= 90 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <Star className="w-4 h-4" />
                    <span>Utmärkt! Du behärskar dessa ord mycket bra.</span>
                  </div>
                )}
                {accuracy >= 75 && accuracy < 90 && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <TrendingUp className="w-4 h-4" />
                    <span>Bra arbete! Du är på rätt väg att behärska dessa ord.</span>
                  </div>
                )}
                {accuracy < 75 && (
                  <div className="flex items-center gap-2 text-orange-600">
                    <Target className="w-4 h-4" />
                    <span>Fortsätt öva! Repetition hjälper dig att komma ihåg bättre.</span>
                  </div>
                )}
                
                {flashcardState.cardsSkipped > 0 && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <ChevronRight className="w-4 h-4" />
                    <span>Du hoppade över {flashcardState.cardsSkipped} kort. Försök att öva på dem nästa gång!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-4 justify-center">
              <Button
                onClick={onNewSession}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                data-testid="button-new-session"
              >
                <Repeat className="w-5 h-5 mr-2" />
                Ny session
              </Button>
              <Button
                onClick={onExit}
                variant="outline"
                size="lg"
                data-testid="button-exit-to-vocabulary"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Tillbaka till ordförråd
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}