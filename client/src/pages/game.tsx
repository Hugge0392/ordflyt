import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { type Sentence, type WordClass, type GameProgress } from "@shared/schema";
import GameHeader from "@/components/game-header";
import GameInstructions from "@/components/game-instructions";
import SentenceDisplay from "@/components/sentence-display";
import GameSidebar from "@/components/game-sidebar";
import FeedbackDisplay from "@/components/feedback-display";

export default function Game() {
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [targetWordClass, setTargetWordClass] = useState<string>("verb");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
    actualWordClass?: string;
  }>({ type: null, message: "" });
  const [showNextButton, setShowNextButton] = useState(false);
  const [clickedWords, setClickedWords] = useState<Set<number>>(new Set());

  // Fetch game data
  const { data: sentences = [], isLoading: sentencesLoading } = useQuery<Sentence[]>({
    queryKey: ["/api/sentences"],
  });

  const { data: wordClasses = [], isLoading: wordClassesLoading } = useQuery<WordClass[]>({
    queryKey: ["/api/word-classes"],
  });

  const { data: gameProgress, isLoading: progressLoading } = useQuery<GameProgress>({
    queryKey: ["/api/game-progress"],
  });

  // Update game progress mutation
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

  // Generate random target word class for current sentence
  useEffect(() => {
    if (currentSentence && wordClasses.length > 0) {
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
  }, [currentSentenceIndex, currentSentence, wordClasses]);

  const handleWordClick = (wordIndex: number, wordClass: string) => {
    if (clickedWords.has(wordIndex) || showNextButton) return;

    setClickedWords(prev => new Set(prev).add(wordIndex));

    const isCorrect = wordClass === targetWordClass;
    const targetWordClassData = wordClasses.find(wc => wc.name === targetWordClass);

    if (isCorrect) {
      setFeedback({
        type: "success",
        message: "Rätt svar!",
      });

      // Update score and correct answers
      if (gameProgress) {
        updateProgressMutation.mutate({
          score: gameProgress.score + 10,
          correctAnswers: gameProgress.correctAnswers + 1,
        });
      }
    } else {
      const actualWordClassData = wordClasses.find(wc => wc.name === wordClass);
      setFeedback({
        type: "error",
        message: "Fel svar",
        actualWordClass: actualWordClassData?.swedishName || wordClass,
      });

      // Update wrong answers
      if (gameProgress) {
        updateProgressMutation.mutate({
          wrongAnswers: gameProgress.wrongAnswers + 1,
        });
      }
    }

    setShowNextButton(true);
  };

  const handleNextQuestion = () => {
    if (currentSentenceIndex < sentences.length - 1) {
      setCurrentSentenceIndex(prev => prev + 1);
      setFeedback({ type: null, message: "" });
      setShowNextButton(false);
      setClickedWords(new Set());

      // Update current sentence index in progress
      if (gameProgress) {
        updateProgressMutation.mutate({
          currentSentenceIndex: currentSentenceIndex + 1,
          completedSentences: [...gameProgress.completedSentences, currentSentence?.id || ""],
        });
      }
    }
  };

  if (sentencesLoading || wordClassesLoading || progressLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Laddar spelet...</div>
      </div>
    );
  }

  if (!currentSentence) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Inga meningar tillgängliga</div>
      </div>
    );
  }

  const targetWordClassData = wordClasses.find(wc => wc.name === targetWordClass);
  const progressPercentage = sentences.length > 0 ? (currentSentenceIndex / sentences.length) * 100 : 0;

  return (
    <div className="min-h-screen">
      <GameHeader 
        score={gameProgress?.score || 0}
        level={gameProgress?.level || 1}
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <GameInstructions 
          targetWordClass={targetWordClassData?.swedishName || targetWordClass}
          targetWordClassDescription={targetWordClassData?.description || ""}
        />

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Mening att analysera</h3>
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full">
                  <i className="fas fa-clock text-gray-500 text-sm"></i>
                  <span className="text-sm text-gray-600">
                    Fråga {currentSentenceIndex + 1} av {sentences.length}
                  </span>
                </div>
              </div>

              <SentenceDisplay
                sentence={currentSentence}
                targetWordClass={targetWordClass}
                onWordClick={handleWordClick}
                clickedWords={clickedWords}
                feedback={feedback}
                data-testid="sentence-display"
              />

              <FeedbackDisplay
                feedback={feedback}
                onNextQuestion={handleNextQuestion}
                showNextButton={showNextButton}
                isLastQuestion={currentSentenceIndex >= sentences.length - 1}
              />
            </div>
          </div>

          <GameSidebar
            currentProgress={currentSentenceIndex + 1}
            totalQuestions={sentences.length}
            progressPercentage={progressPercentage}
            correctAnswers={gameProgress?.correctAnswers || 0}
            wrongAnswers={gameProgress?.wrongAnswers || 0}
            wordClasses={wordClasses}
          />
        </div>
      </main>
    </div>
  );
}
