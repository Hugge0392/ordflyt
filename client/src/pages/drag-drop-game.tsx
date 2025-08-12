import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Sentence, type WordClass, type GameProgress } from "@shared/schema";

interface DroppedWord {
  text: string;
  originalIndex: number;
  wordClass: string;
}

export default function DragDropGame() {
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [draggedWord, setDraggedWord] = useState<{ text: string; index: number; wordClass: string } | null>(null);
  const [droppedWords, setDroppedWords] = useState<{ [key: string]: DroppedWord[] }>({});
  const [usedWords, setUsedWords] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'incorrect' | 'dragon'; message: string } | null>(null);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [draggedWordElement, setDraggedWordElement] = useState<HTMLElement | null>(null);

  // Fetch mixed sentences for the drag-drop game
  const { data: allSentences = [], isLoading: sentencesLoading } = useQuery<Sentence[]>({
    queryKey: ["/api/sentences"],
  });

  const { data: wordClasses = [], isLoading: wordClassesLoading } = useQuery<WordClass[]>({
    queryKey: ["/api/word-classes"],
  });

  const { data: gameProgress, isLoading: progressLoading } = useQuery<GameProgress>({
    queryKey: ["/api/game-progress"],
  });

  // Filter to sentences that have multiple word classes (good for drag-drop)
  const sentences = allSentences.filter(sentence => 
    !sentence.wordClassType && // Mixed sentences
    sentence.words.filter(w => !w.isPunctuation).length >= 4 // At least 4 words
  );

  const currentSentence = sentences[currentSentenceIndex];

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

  // Initialize dropped words for each word class
  useEffect(() => {
    if (wordClasses.length > 0) {
      const initialDropped: { [key: string]: DroppedWord[] } = {};
      wordClasses.forEach(wc => {
        initialDropped[wc.name] = [];
      });
      setDroppedWords(initialDropped);
    }
  }, [wordClasses]);

  const handleDragStart = (e: React.DragEvent, word: string, index: number, wordClass: string) => {
    if (usedWords.has(index)) return;
    
    setDraggedWord({ text: word, index, wordClass });
    setDraggedWordElement(e.target as HTMLElement);
    setFeedback(null);
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetWordClass: string) => {
    e.preventDefault();
    
    if (!draggedWord) return;

    const isCorrect = draggedWord.wordClass === targetWordClass;
    
    if (isCorrect) {
      // Correct drop
      setDroppedWords(prev => ({
        ...prev,
        [targetWordClass]: [...prev[targetWordClass], {
          text: draggedWord.text,
          originalIndex: draggedWord.index,
          wordClass: draggedWord.wordClass
        }]
      }));
      
      setUsedWords(prev => new Set([...prev, draggedWord.index]));
      
      setFeedback({
        type: 'correct',
        message: `Rätt! "${draggedWord.text}" är en ${wordClasses.find(wc => wc.name === targetWordClass)?.swedishName}.`
      });

      // Update score
      if (gameProgress) {
        updateProgressMutation.mutate({
          score: gameProgress.score + 15,
          correctAnswers: gameProgress.correctAnswers + 1,
        });
      }
    } else {
      // Incorrect drop - dragon spits it back
      setFeedback({
        type: 'dragon',
        message: `🐉 Nej nej! "${draggedWord.text}" tillhör inte ${wordClasses.find(wc => wc.name === targetWordClass)?.swedishName}. Draken spottar tillbaka ordet!`
      });

      // Animate word flying back
      if (draggedWordElement) {
        draggedWordElement.style.animation = 'flyBack 0.8s ease-in-out';
        setTimeout(() => {
          if (draggedWordElement) {
            draggedWordElement.style.animation = '';
          }
        }, 800);
      }

      // Update wrong answers
      if (gameProgress) {
        updateProgressMutation.mutate({
          wrongAnswers: gameProgress.wrongAnswers + 1,
        });
      }
    }

    setDraggedWord(null);
    setDraggedWordElement(null);
  };

  const handleNext = () => {
    if (currentSentenceIndex >= sentences.length - 1) {
      setGameCompleted(true);
      return;
    }

    // Reset for next sentence
    setCurrentSentenceIndex(currentSentenceIndex + 1);
    setUsedWords(new Set());
    setFeedback(null);
    
    // Reset dropped words
    const resetDropped: { [key: string]: DroppedWord[] } = {};
    wordClasses.forEach(wc => {
      resetDropped[wc.name] = [];
    });
    setDroppedWords(resetDropped);
  };

  const isLevelComplete = () => {
    if (!currentSentence) return false;
    
    const totalWords = currentSentence.words.filter(w => !w.isPunctuation);
    return usedWords.size === totalWords.length;
  };

  const getWordClassIcon = (wordClassName: string) => {
    const icons: { [key: string]: string } = {
      'noun': '📚',
      'verb': '🏃‍♂️',
      'adjective': '🎨',
      'adverb': '⚡',
      'pronoun': '👥',
      'preposition': '📍',
      'conjunction': '🔗',
      'interjection': '💬',
      'numeral': '🔢'
    };
    return icons[wordClassName] || '📝';
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
        <div className="text-lg text-gray-600">Inga meningar hittades för detta spel</div>
        <Link href="/">
          <button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90">
            Tillbaka till meny
          </button>
        </Link>
      </div>
    );
  }

  if (gameCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="text-6xl mb-6">🐉✨</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Fantastiskt!</h1>
          <p className="text-gray-600 mb-8">
            Du har klarat ordklassdraken! Alla ord är på rätt plats.
          </p>
          
          <div className="space-y-4">
            <Link href="/">
              <button className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors">
                Tillbaka till meny
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-primary/10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors">
                <i className="fas fa-arrow-left"></i>
                <span>Tillbaka</span>
              </button>
            </Link>
            
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">🐉 Ordklassdraken</h1>
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

      {/* Instructions */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              🐉 Dra orden till rätt ordklass
            </h2>
            <p className="text-gray-600">
              Draken hjälper dig genom att spotta tillbaka ord som hamnar fel!
            </p>
          </div>
        </div>

        {/* Sentence with draggable words */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 mb-8 border border-blue-100">
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Mening att dela upp:</h3>
            <div className="text-2xl leading-relaxed text-gray-800 font-medium">
              {currentSentence.words.map((word, index) => (
                word.isPunctuation ? (
                  <span key={index} className="inline-block mx-1">
                    {word.text}
                  </span>
                ) : (
                  <span
                    key={index}
                    draggable={!usedWords.has(index)}
                    onDragStart={(e) => handleDragStart(e, word.text, index, word.wordClass)}
                    className={`inline-block mx-2 my-1 px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                      usedWords.has(index)
                        ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                        : 'bg-white border-gray-300 cursor-grab hover:border-blue-400 hover:shadow-md active:cursor-grabbing'
                    }`}
                    data-testid={`draggable-word-${index}`}
                  >
                    {word.text}
                  </span>
                )
              ))}
            </div>
          </div>
        </div>

        {/* Word class drop zones - Compact grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {wordClasses.map((wordClass) => (
            <div
              key={wordClass.id}
              className="bg-white rounded-lg shadow-md border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors min-h-[140px]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, wordClass.name)}
              data-testid={`drop-zone-${wordClass.name}`}
            >
              <div className="p-3">
                <div className="text-center mb-2">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg mb-2 mx-auto"
                    style={{ backgroundColor: wordClass.color }}
                  >
                    {getWordClassIcon(wordClass.name)}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">{wordClass.swedishName}</h3>
                  <p className="text-xs text-gray-600">{wordClass.description}</p>
                </div>

                {/* Dropped words */}
                <div className="space-y-1">
                  {droppedWords[wordClass.name]?.map((word, index) => (
                    <div 
                      key={index}
                      className="bg-green-100 border border-green-300 rounded px-2 py-1 text-center text-green-700 font-medium text-xs"
                      data-testid={`dropped-word-${word.originalIndex}`}
                    >
                      {word.text} ✓
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`p-4 rounded-xl mb-6 ${
            feedback.type === 'correct' 
              ? 'bg-green-100 border border-green-200 text-green-700' 
              : feedback.type === 'dragon'
              ? 'bg-purple-100 border border-purple-200 text-purple-700'
              : 'bg-red-100 border border-red-200 text-red-700'
          }`}>
            <p className="font-medium text-center">{feedback.message}</p>
          </div>
        )}

        {/* Next button */}
        {isLevelComplete() && (
          <div className="text-center">
            <button
              onClick={handleNext}
              className="bg-secondary text-white px-8 py-3 rounded-xl font-semibold hover:bg-secondary/90 transition-colors text-lg"
              data-testid="next-sentence-button"
            >
              {currentSentenceIndex >= sentences.length - 1 ? (
                <>
                  <i className="fas fa-flag-checkered mr-2"></i>
                  Avsluta spel
                </>
              ) : (
                <>
                  <i className="fas fa-arrow-right mr-2"></i>
                  Nästa mening
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes flyBack {
          0% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(-100px) translateY(-50px) rotate(-15deg); }
          100% { transform: translateX(0) translateY(0) rotate(0deg); }
        }
      `}</style>
    </div>
  );
}