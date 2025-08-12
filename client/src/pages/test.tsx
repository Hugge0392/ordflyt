import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Sentence, type WordClass, type GameProgress } from "@shared/schema";
import GameHeader from "@/components/ui/game-header";
import SentenceDisplay from "@/components/ui/sentence-display";
import TimerDisplay from "@/components/ui/timer-display";
import WordClassGuide from "@/components/ui/word-class-guide";

export default function Test() {
  const [match, params] = useRoute("/test/:testType");
  const testType = params?.testType; // 'complete' or specific word class
  
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [targetWordClass, setTargetWordClass] = useState<string>("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
    actualWordClass?: string;
  }>({ type: null, message: "" });
  const [clickedWords, setClickedWords] = useState<Set<number>>(new Set());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [timePenalty, setTimePenalty] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [testScore, setTestScore] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout>();

  // Fetch game data
  const { data: allSentences = [], isLoading: sentencesLoading } = useQuery<Sentence[]>({
    queryKey: ["/api/sentences"],
  });

  const { data: wordClasses = [], isLoading: wordClassesLoading } = useQuery<WordClass[]>({
    queryKey: ["/api/word-classes"],
  });

  const { data: gameProgress, isLoading: progressLoading } = useQuery<GameProgress>({
    queryKey: ["/api/game-progress"],
  });

  // Filter sentences based on test type
  const sentences = testType === 'complete' 
    ? allSentences
    : allSentences.filter(sentence => 
        sentence.words.some(word => word.wordClass === testType && !word.isPunctuation)
      );

  const updateProgressMutation = useMutation({
    mutationFn: async (updates: Partial<GameProgress>) => {
      const response = await apiRequest("PATCH", "/api/game-progress", updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/game-progress"] });
    },
  });

  const currentSentence = sentences[currentSentenceIndex];
  const currentWordClassData = wordClasses.find(wc => wc.name === targetWordClass);

  // Timer effect
  useEffect(() => {
    if (isTestRunning) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTestRunning]);

  // Generate target word class for current sentence
  useEffect(() => {
    if (currentSentence && wordClasses.length > 0) {
      if (testType !== 'complete') {
        setTargetWordClass(testType || "");
      } else {
        const availableWordClasses = Array.from(
          new Set(
            currentSentence.words
              .filter(word => !word.isPunctuation)
              .map(word => word.wordClass)
          )
        );
        
        if (availableWordClasses.length > 0) {
          const randomClass = availableWordClasses[Math.floor(Math.random() * availableWordClasses.length)];
          setTargetWordClass(randomClass);
        }
      }
    }
  }, [currentSentenceIndex, currentSentence, wordClasses, testType]);

  const startTest = () => {
    setTestStarted(true);
    setIsTestRunning(true);
    setTimeElapsed(0);
    setTimePenalty(0);
    setCorrectAnswers(0);
    setWrongAnswers(0);
    setTestScore(0);
  };

  const calculateScore = () => {
    const baseScore = correctAnswers * 100;
    const timeBonusMultiplier = Math.max(0, 300 - timeElapsed) / 300; // Bonus decreases over 5 minutes
    const timeBonus = baseScore * timeBonusMultiplier * 0.5; // Up to 50% bonus
    const penalties = wrongAnswers * 25 + timePenalty; // 25 points per wrong answer + time penalties
    
    return Math.max(0, Math.round(baseScore + timeBonus - penalties));
  };

  const handleWordClick = (wordIndex: number, wordClass: string) => {
    if (clickedWords.has(wordIndex) || !isTestRunning) return;

    setClickedWords(prev => new Set(prev).add(wordIndex));

    const isCorrect = wordClass === targetWordClass;

    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      setFeedback({
        type: "success",
        message: "Rätt svar!",
      });
    } else {
      setWrongAnswers(prev => prev + 1);
      const actualWordClassData = wordClasses.find(wc => wc.name === wordClass);
      
      // Add exponential time penalty for wrong answers
      const penalty = Math.pow(2, wrongAnswers) * 5; // 5, 10, 20, 40 seconds...
      setTimePenalty(prev => prev + penalty);
      
      setFeedback({
        type: "error",
        message: `Fel svar (+${penalty}s tidstillägg)`,
        actualWordClass: actualWordClassData?.swedishName || wordClass,
      });
    }

    // Auto-advance after 2 seconds
    setTimeout(() => {
      handleNextQuestion();
    }, 2000);
  };

  const handleNextQuestion = () => {
    if (currentSentenceIndex < sentences.length - 1) {
      setCurrentSentenceIndex(prev => prev + 1);
      setFeedback({ type: null, message: "" });
      setClickedWords(new Set());
    } else {
      // Test completed
      setIsTestRunning(false);
      setTestCompleted(true);
      const finalScore = calculateScore();
      setTestScore(finalScore);
      
      // Update game progress
      if (gameProgress) {
        updateProgressMutation.mutate({
          score: gameProgress.score + finalScore,
          correctAnswers: gameProgress.correctAnswers + correctAnswers,
          wrongAnswers: gameProgress.wrongAnswers + wrongAnswers,
        });
      }
    }
  };

  const getGrade = (score: number, totalPossible: number) => {
    const percentage = (score / totalPossible) * 100;
    if (percentage >= 90) return { grade: "A", color: "text-green-600", description: "Utmärkt!" };
    if (percentage >= 80) return { grade: "B", color: "text-blue-600", description: "Mycket bra!" };
    if (percentage >= 70) return { grade: "C", color: "text-yellow-600", description: "Bra!" };
    if (percentage >= 60) return { grade: "D", color: "text-orange-600", description: "Godkänt" };
    return { grade: "F", color: "text-red-600", description: "Ej godkänt" };
  };

  if (sentencesLoading || wordClassesLoading || progressLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Laddar test...</div>
      </div>
    );
  }

  if (!currentSentence && !testCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col space-y-4">
        <div className="text-lg text-gray-600">
          Inga meningar tillgängliga för detta test
        </div>
        <Link href="/">
          <button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90">
            Tillbaka till meny
          </button>
        </Link>
      </div>
    );
  }

  // Test completion screen
  if (testCompleted) {
    const totalPossible = correctAnswers * 100;
    const gradeInfo = getGrade(testScore, totalPossible);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <GameHeader 
          score={gameProgress?.score || 0}
          level={gameProgress?.level || 1}
        />

        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
            <div className="mb-8">
              <div className="bg-green-100 text-green-600 p-4 rounded-xl inline-block mb-4">
                <i className="fas fa-flag-checkered text-3xl"></i>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Test genomfört!</h1>
              <p className="text-gray-600">
                {testType === 'complete' 
                  ? 'Komplett ordklassprov' 
                  : `${wordClasses.find(wc => wc.name === testType)?.swedishName} test`
                }
              </p>
            </div>

            {/* Results */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="text-3xl font-bold text-gray-800">{testScore}</div>
                <div className="text-sm text-gray-600">Slutpoäng</div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="text-3xl font-bold text-gray-800">
                  {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-sm text-gray-600">Total tid</div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-6">
                <div className={`text-3xl font-bold ${gradeInfo.color}`}>{gradeInfo.grade}</div>
                <div className="text-sm text-gray-600">{gradeInfo.description}</div>
              </div>
            </div>

            {/* Detailed stats */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
                <div className="text-sm text-green-700">Rätt svar</div>
              </div>
              
              <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                <div className="text-2xl font-bold text-red-600">{wrongAnswers}</div>
                <div className="text-sm text-red-700">Fel svar</div>
                {timePenalty > 0 && (
                  <div className="text-xs text-red-600 mt-1">
                    +{timePenalty}s tidstillägg
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-center space-x-4">
              <Link href="/">
                <button className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors">
                  Tillbaka till meny
                </button>
              </Link>
              
              <button 
                onClick={() => window.location.reload()} 
                className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Gör om test
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Pre-test screen
  if (!testStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <GameHeader 
          score={gameProgress?.score || 0}
          level={gameProgress?.level || 1}
        />

        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-6">
            <Link href="/">
              <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors">
                <i className="fas fa-arrow-left"></i>
                <span>Tillbaka till meny</span>
              </button>
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
            <div className="mb-8">
              <div className="bg-orange-100 text-orange-600 p-4 rounded-xl inline-block mb-4">
                <i className="fas fa-stopwatch text-3xl"></i>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Tidsprov</h1>
              <p className="text-gray-600">
                {testType === 'complete' 
                  ? 'Komplett ordklassprov med alla ordklasser' 
                  : `${wordClasses.find(wc => wc.name === testType)?.swedishName} test`
                }
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-yellow-800 mb-3">Regler för testet:</h3>
              <ul className="text-sm text-yellow-700 space-y-2 text-left max-w-md mx-auto">
                <li>• Tiden börjar när du klickar "Starta test"</li>
                <li>• Du får poäng baserat på hastighet och korrekthet</li>
                <li>• Fel svar ger tidstillägg (5s, 10s, 20s, 40s...)</li>
                <li>• Snabbare genomförande ger bonuspoäng</li>
                <li>• {sentences.length} meningar att analysera</li>
              </ul>
            </div>

            <button 
              onClick={startTest}
              className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              data-testid="start-test-btn"
            >
              <i className="fas fa-play mr-2"></i>
              Starta test
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Test in progress
  const progressPercentage = sentences.length > 0 ? (currentSentenceIndex / sentences.length) * 100 : 0;

  return (
    <div className="min-h-screen">
      <GameHeader 
        score={gameProgress?.score || 0}
        level={gameProgress?.level || 1}
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Test header with timer */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-orange-100 text-orange-600 p-3 rounded-lg">
                <i className="fas fa-stopwatch"></i>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {testType === 'complete' ? 'Komplett prov' : `${currentWordClassData?.swedishName} test`}
                </h2>
                <p className="text-gray-600">
                  Fråga {currentSentenceIndex + 1} av {sentences.length}
                </p>
              </div>
            </div>
            
            <TimerDisplay 
              timeElapsed={timeElapsed + timePenalty}
              isRunning={isTestRunning}
            />
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-orange-500 to-red-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Word class guide */}
        {currentWordClassData && (
          <WordClassGuide 
            wordClass={currentWordClassData}
            isCorrect={feedback.type === "success"}
            isWrong={feedback.type === "error"}
          />
        )}

        {/* Current target */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
          <div className="text-center">
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-6 py-3 rounded-full border border-purple-200 inline-block">
              <span className="text-purple-700 font-medium">Hitta: </span>
              <span className="text-purple-900 font-bold text-lg">
                {currentWordClassData?.swedishName.toUpperCase() || targetWordClass.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Sentence */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <SentenceDisplay
            sentence={currentSentence}
            targetWordClass={targetWordClass}
            onWordClick={handleWordClick}
            clickedWords={clickedWords}
            feedback={feedback}
          />

          {/* Feedback */}
          {feedback.type && (
            <div className="mt-6">
              {feedback.type === "success" && (
                <div className="bg-gradient-to-r from-green-500 to-emerald-400 text-white p-4 rounded-xl animate-celebration">
                  <div className="flex items-center justify-center space-x-3">
                    <i className="fas fa-check text-xl"></i>
                    <span className="font-semibold">{feedback.message}</span>
                  </div>
                </div>
              )}

              {feedback.type === "error" && (
                <div className="bg-gradient-to-r from-red-500 to-red-400 text-white p-4 rounded-xl">
                  <div className="flex items-center justify-center space-x-3">
                    <i className="fas fa-times text-xl"></i>
                    <div className="text-center">
                      <p className="font-semibold">{feedback.message}</p>
                      {feedback.actualWordClass && (
                        <p className="text-sm opacity-90">
                          Det ordet är ett <span className="font-bold">{feedback.actualWordClass}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats sidebar */}
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-2xl font-bold text-green-500">{correctAnswers}</div>
            <div className="text-sm text-gray-600">Rätt svar</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-2xl font-bold text-red-500">{wrongAnswers}</div>
            <div className="text-sm text-gray-600">Fel svar</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-2xl font-bold text-orange-500">{timePenalty}s</div>
            <div className="text-sm text-gray-600">Tidstillägg</div>
          </div>
        </div>
      </main>
    </div>
  );
}