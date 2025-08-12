import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Sentence, type WordClass, type GameProgress } from "@shared/schema";
import GameHeader from "@/components/ui/game-header";
import GameInstructions from "@/components/ui/game-instructions";
import MultipleChoiceSentence from "@/components/ui/multiple-choice-sentence";
import GameSidebar from "@/components/ui/game-sidebar";
import FeedbackDisplay from "@/components/ui/feedback-display";
import WordClassGuide from "@/components/ui/word-class-guide";

export default function Practice() {
  const [matchLevel, paramsLevel] = useRoute("/practice/:wordClass/level/:level");
  const [matchGeneral, paramsGeneral] = useRoute("/practice/:wordClass?");
  
  const specificWordClass = paramsLevel?.wordClass || paramsGeneral?.wordClass;
  const practiceLevel = paramsLevel?.level ? parseInt(paramsLevel.level) : null;
  
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [targetWordClass, setTargetWordClass] = useState<string>("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
    actualWordClass?: string;
  }>({ type: null, message: "" });
  const [showNextButton, setShowNextButton] = useState(false);
  const [clickedWords, setClickedWords] = useState<Set<number>>(new Set());

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

  // Filter sentences based on specific word class if practicing individual class
  const sentences = specificWordClass 
    ? allSentences.filter(sentence => 
        sentence.words.some(word => word.wordClass === specificWordClass && !word.isPunctuation)
      )
    : allSentences;

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
  const currentWordClassData = wordClasses.find(wc => wc.name === targetWordClass);

  // Generate target word class for current sentence
  useEffect(() => {
    if (currentSentence && wordClasses.length > 0) {
      if (specificWordClass) {
        // For specific word class practice, always target that class
        setTargetWordClass(specificWordClass);
      } else {
        // For general practice, pick randomly from available classes in sentence
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
  }, [currentSentenceIndex, currentSentence, wordClasses, specificWordClass]);

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
      <div className="min-h-screen flex items-center justify-center flex-col space-y-4">
        <div className="text-lg text-gray-600">
          {specificWordClass 
            ? `Inga meningar tillgängliga för ${specificWordClass}`
            : "Inga meningar tillgängliga"
          }
        </div>
        <Link href="/">
          <button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90">
            Tillbaka till meny
          </button>
        </Link>
      </div>
    );
  }

  const progressPercentage = sentences.length > 0 ? (currentSentenceIndex / sentences.length) * 100 : 0;

  return (
    <div className="min-h-screen">
      <GameHeader 
        score={gameProgress?.score || 0}
        level={gameProgress?.level || 1}
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Back to menu button */}
        <div className="mb-6">
          <Link href="/">
            <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors">
              <i className="fas fa-arrow-left"></i>
              <span>Tillbaka till meny</span>
            </button>
          </Link>
        </div>

        {/* Show practice mode info */}
        {specificWordClass && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="bg-primary/10 text-primary p-3 rounded-lg">
                <i className="fas fa-target"></i>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Tränar: {wordClasses.find(wc => wc.name === specificWordClass)?.swedishName}
                </h2>
                <p className="text-gray-600">
                  Fokusträning på {wordClasses.find(wc => wc.name === specificWordClass)?.description}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Word class guide */}
        {currentWordClassData && (
          <WordClassGuide 
            wordClass={currentWordClassData}
            isCorrect={feedback.type === "success"}
            isWrong={feedback.type === "error"}
          />
        )}

        <GameInstructions 
          targetWordClass={currentWordClassData?.swedishName || targetWordClass}
          targetWordClassDescription={currentWordClassData?.description || ""}
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