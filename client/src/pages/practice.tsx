import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Sentence, type WordClass, type GameProgress } from "@shared/schema";
import MultipleChoiceSentence from "@/components/ui/multiple-choice-sentence";
import WordClassGuide from "@/components/ui/word-class-guide";

export default function Practice() {
  const [matchLevel, paramsLevel] = useRoute("/practice/:wordClass/level/:level");
  const [matchGeneral, paramsGeneral] = useRoute("/practice/:wordClass?");
  
  const specificWordClass = paramsLevel?.wordClass || paramsGeneral?.wordClass;
  const practiceLevel = paramsLevel?.level ? parseInt(paramsLevel.level) : null;
  
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [selectedWords, setSelectedWords] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'incorrect'; message: string } | null>(null);
  const [currentTargetClass, setCurrentTargetClass] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [guideWordClass, setGuideWordClass] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [correctWords, setCorrectWords] = useState<Set<number>>(new Set());
  const [incorrectWords, setIncorrectWords] = useState<Set<number>>(new Set());
  const [hasNoWords, setHasNoWords] = useState(false);
  const [levelCompleted, setLevelCompleted] = useState(false);

  // Fetch appropriate sentences based on level
  const { data: sentences = [], isLoading: sentencesLoading } = useQuery<Sentence[]>({
    queryKey: practiceLevel 
      ? [`/api/sentences/wordclass/${specificWordClass}/level/${practiceLevel}`]
      : ["/api/sentences"],
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
  const currentWordClass = wordClasses.find(wc => wc.name === currentTargetClass);

  // Set target word class for the current sentence
  useEffect(() => {
    if (specificWordClass) {
      setCurrentTargetClass(specificWordClass);
    } else if (currentSentence) {
      // For general practice, pick a random word class from the sentence
      const availableClasses = [...new Set(
        currentSentence.words
          .filter(word => !word.isPunctuation)
          .map(word => word.wordClass)
      )];
      if (availableClasses.length > 0) {
        setCurrentTargetClass(availableClasses[Math.floor(Math.random() * availableClasses.length)]);
      }
    }
  }, [currentSentence, specificWordClass]);

  const handleWordClick = (wordIndex: number, wordClass: string) => {
    if (isSubmitted) return;
    
    const newSelected = new Set(selectedWords);
    if (newSelected.has(wordIndex)) {
      newSelected.delete(wordIndex);
    } else {
      newSelected.add(wordIndex);
    }
    setSelectedWords(newSelected);
    setFeedback(null);
  };

  const handleNoWords = () => {
    if (isSubmitted) return;
    setHasNoWords(true);
    checkAnswer(new Set(), true);
  };

  const handleSubmit = () => {
    if (isSubmitted) return;
    checkAnswer(selectedWords, hasNoWords);
  };

  const checkAnswer = (selected: Set<number>, noWords: boolean) => {
    if (!currentSentence || !currentTargetClass) return;

    const correctIndices = new Set<number>();
    const incorrectIndices = new Set<number>();

    // Find all words that match the target class
    currentSentence.words.forEach((word, index) => {
      if (!word.isPunctuation && word.wordClass === currentTargetClass) {
        correctIndices.add(index);
      }
    });

    const hasCorrectWords = correctIndices.size > 0;
    let isCorrect = false;

    if (noWords && !hasCorrectWords) {
      // Correctly identified that there are no words of this class
      isCorrect = true;
      setFeedback({
        type: 'correct',
        message: `Rätt! Det finns inga ${currentWordClass?.swedishName || currentTargetClass} i denna mening.`
      });
    } else if (noWords && hasCorrectWords) {
      // Incorrectly said there are no words
      isCorrect = false;
      setFeedback({
        type: 'incorrect',
        message: `Fel! Det finns ${currentWordClass?.swedishName || currentTargetClass} i denna mening.`
      });
    } else {
      // Check if selected words match correct words
      const selectedArray = Array.from(selected);
      const correctArray = Array.from(correctIndices);
      
      // Mark incorrect selections
      selectedArray.forEach(index => {
        if (!correctIndices.has(index)) {
          incorrectIndices.add(index);
        }
      });

      isCorrect = selectedArray.length === correctArray.length && 
                 selectedArray.every(index => correctIndices.has(index));

      if (isCorrect) {
        setFeedback({
          type: 'correct',
          message: correctArray.length === 1 
            ? `Rätt! Du hittade ${currentWordClass?.swedishName || currentTargetClass}.`
            : `Rätt! Du hittade alla ${correctArray.length} ${currentWordClass?.swedishName || currentTargetClass}.`
        });
      } else {
        setFeedback({
          type: 'incorrect',
          message: `Inte riktigt. ${correctArray.length === 1 
            ? `Det finns ${correctArray.length} ${currentWordClass?.swedishName || currentTargetClass} i meningen.`
            : `Det finns ${correctArray.length} ${currentWordClass?.swedishName || currentTargetClass} i meningen.`
          }`
        });
      }
    }

    setIsSubmitted(true);
    setCorrectWords(correctIndices);
    setIncorrectWords(incorrectIndices);

    // Update progress
    if (gameProgress) {
      updateProgressMutation.mutate({
        score: gameProgress.score + (isCorrect ? 10 : 0),
        correctAnswers: gameProgress.correctAnswers + (isCorrect ? 1 : 0),
        wrongAnswers: gameProgress.wrongAnswers + (isCorrect ? 0 : 1),
      });
    }
  };

  const handleNext = () => {
    if (currentSentenceIndex >= sentences.length - 1) {
      // Level completed
      if (practiceLevel && specificWordClass && gameProgress) {
        const newCompletedLevels = { ...gameProgress.completedLevels };
        newCompletedLevels[specificWordClass] = Math.max(
          newCompletedLevels[specificWordClass] || 0,
          practiceLevel
        );
        
        updateProgressMutation.mutate({
          completedLevels: newCompletedLevels
        });
        
        setLevelCompleted(true);
      }
      return;
    }

    // Reset for next sentence
    setCurrentSentenceIndex(currentSentenceIndex + 1);
    setSelectedWords(new Set());
    setFeedback(null);
    setIsSubmitted(false);
    setCorrectWords(new Set());
    setIncorrectWords(new Set());
    setHasNoWords(false);
  };

  const openGuide = (wordClass: string) => {
    setGuideWordClass(wordClass);
    setShowGuide(true);
  };

  if (sentencesLoading || wordClassesLoading || progressLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Laddar...</div>
      </div>
    );
  }

  if (sentences.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col space-y-4">
        <div className="text-lg text-gray-600">Inga meningar hittades för denna nivå</div>
        <Link href={practiceLevel ? `/wordclass/${specificWordClass}` : "/"}>
          <button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90">
            Tillbaka
          </button>
        </Link>
      </div>
    );
  }

  if (levelCompleted) {
    const nextLevel = practiceLevel ? practiceLevel + 1 : null;
    const canContinue = nextLevel && nextLevel <= 4;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Bra jobbat!</h1>
          <p className="text-gray-600 mb-8">
            Du har klarat nivå {practiceLevel} för {currentWordClass?.swedishName || specificWordClass}!
          </p>
          
          <div className="space-y-4">
            {canContinue ? (
              <Link href={`/practice/${specificWordClass}/level/${nextLevel}`}>
                <button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all">
                  Fortsätt till Nivå {nextLevel}
                </button>
              </Link>
            ) : nextLevel === 5 ? (
              <Link href={`/test/${specificWordClass}`}>
                <button className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all">
                  Gör Slutprovet
                </button>
              </Link>
            ) : null}
            
            <Link href={`/wordclass/${specificWordClass}`}>
              <button className="w-full bg-gray-500 text-white py-3 rounded-xl font-semibold hover:bg-gray-600 transition-colors">
                Tillbaka till nivåer
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!currentSentence) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Laddar mening...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-primary/10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href={practiceLevel ? `/wordclass/${specificWordClass}` : "/"}>
              <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors">
                <i className="fas fa-arrow-left"></i>
                <span>Tillbaka</span>
              </button>
            </Link>
            
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">
                {practiceLevel ? `Nivå ${practiceLevel}` : "Fri träning"}
                {specificWordClass && ` - ${currentWordClass?.swedishName || specificWordClass}`}
              </h1>
              <p className="text-gray-600">
                Mening {currentSentenceIndex + 1} av {sentences.length}
              </p>
            </div>

            <div className="text-right">
              <div className="text-lg font-bold text-primary">
                Poäng: {gameProgress?.score || 0}
              </div>
              <div className="text-sm text-gray-600">
                {gameProgress?.correctAnswers || 0} rätt, {gameProgress?.wrongAnswers || 0} fel
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Instructions */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Hitta alla: {currentWordClass?.swedishName || currentTargetClass}
              </h2>
              <p className="text-gray-600">
                {currentWordClass?.description || "Klicka på orden som tillhör denna ordklass"}
              </p>
            </div>
            
            <button
              onClick={() => currentTargetClass && openGuide(currentTargetClass)}
              className="bg-secondary text-white px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors"
            >
              <i className="fas fa-question-circle mr-2"></i>
              Hjälp
            </button>
          </div>
        </div>

        {/* Sentence */}
        <MultipleChoiceSentence
          sentence={currentSentence}
          targetWordClass={currentWordClass?.swedishName || currentTargetClass || ""}
          selectedWords={selectedWords}
          onWordClick={handleWordClick}
          showNoWordsButton={!isSubmitted}
          onNoWords={handleNoWords}
          isSubmitted={isSubmitted}
          correctWords={correctWords}
          incorrectWords={incorrectWords}
        />

        {/* Controls */}
        <div className="text-center space-y-4">
          {!isSubmitted && selectedWords.size > 0 && !hasNoWords && (
            <button
              onClick={handleSubmit}
              className="bg-primary text-white px-8 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors text-lg"
              data-testid="submit-button"
            >
              <i className="fas fa-check mr-2"></i>
              Kontrollera svar ({selectedWords.size} vald{selectedWords.size > 1 ? 'a' : ''})
            </button>
          )}

          {feedback && (
            <div className={`p-4 rounded-xl ${
              feedback.type === 'correct' 
                ? 'bg-green-100 border border-green-200 text-green-700' 
                : 'bg-red-100 border border-red-200 text-red-700'
            }`}>
              <p className="font-medium">{feedback.message}</p>
            </div>
          )}

          {isSubmitted && (
            <button
              onClick={handleNext}
              className="bg-secondary text-white px-8 py-3 rounded-xl font-semibold hover:bg-secondary/90 transition-colors text-lg"
              data-testid="next-button"
            >
              {currentSentenceIndex >= sentences.length - 1 ? (
                <>
                  <i className="fas fa-flag-checkered mr-2"></i>
                  Avsluta nivå
                </>
              ) : (
                <>
                  <i className="fas fa-arrow-right mr-2"></i>
                  Nästa mening
                </>
              )}
            </button>
          )}
        </div>
      </main>

      {/* Guide */}
      {showGuide && guideWordClass && (
        <WordClassGuide
          wordClass={guideWordClass}
          onClose={() => setShowGuide(false)}
        />
      )}
    </div>
  );
}