import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  OrdracetPreview, 
  MeningPusselPreview, 
  GissaOrdetPreview, 
  QuizPreview, 
  RimSpelPreview, 
  BeratttelsePreview,
  OrdklassdrakPreview
} from "@/components/GamePreviews";
import Piratgrav from "@/components/Piratgrav";
import { Slutdiplom } from "@/components/Slutdiplom";
import { FyllMeningPreview } from "@/components/FyllMeningPreview";
import { CrosswordPlayer, type CrosswordPlayerClue } from "@/components/CrosswordPlayer";
import { CrosswordCell } from "@/components/CrosswordBuilder";
import beachBackground from "@assets/backgrounds/beach.webp";
import TabellenGame from "@/components/TabellenGame";

interface MemoryCard {
  id: string;
  content: string;
  pair: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface InteractivePreviewProps {
  moment: any;
  onNext?: () => void;
  lesson?: any;
}

export function InteractivePreview({ moment, onNext, lesson }: InteractivePreviewProps) {
  if (!moment) {
    return (
      <div className="text-center text-gray-500 py-12">
        <div className="text-4xl mb-4">⚠️</div>
        <p>Inget moment att visa</p>
      </div>
    );
  }
  const [currentText, setCurrentText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [selectedWords, setSelectedWords] = useState<number[]>([]);
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const [categories, setCategories] = useState<{[key: string]: string[]}>({});
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [itemCompleted, setItemCompleted] = useState(false);

  // Reset when moment changes
  useEffect(() => {
    if (moment.type === 'pratbubbla') {
      setCurrentItemIndex(0);
      setItemCompleted(false);
      setTextIndex(0);
      setCurrentText('');
      setShowFeedback(false);
      setSelectedAnswer(null);
    }
  }, [moment]);

  // Get current item based on index
  const getCurrentItem = () => {
    if (moment.type === 'pratbubbla' && moment.config.items && moment.config.items.length > 0) {
      const sortedItems = [...moment.config.items].sort((a: any, b: any) => a.order - b.order);
      return sortedItems[currentItemIndex] || null;
    }
    return null;
  };

  // Typewriter effect for pratbubbla
  useEffect(() => {
    if (moment.type === 'pratbubbla') {
      const currentItem = getCurrentItem();
      let text = '';
      
      if (currentItem && (currentItem.type === 'text' || currentItem.type === 'question')) {
        text = currentItem.content || '';
      } else if (!moment.config.items) {
        // Fall back to old text field for backward compatibility
        text = moment.config.text || '';
      }
      
      if (text && textIndex < text.length) {
        const timeout = setTimeout(() => {
          setCurrentText(text.slice(0, textIndex + 1));
          setTextIndex(textIndex + 1);
        }, moment.config.animationSpeed || 50);
        return () => clearTimeout(timeout);
      } else if (text && textIndex >= text.length) {
        setItemCompleted(true);
      }
    }
  }, [textIndex, moment, currentItemIndex]);

  // Initialize memory cards
  useEffect(() => {
    if (moment.type === 'memory' && moment.config.wordPairs) {
      const pairs = moment.config.wordPairs.map((pair: string) => {
        const [word1, word2] = pair.split('|');
        return { word1: word1?.trim(), word2: word2?.trim() };
      }).filter((pair: any) => pair.word1 && pair.word2);

      const cards: MemoryCard[] = [];
      pairs.forEach((pair: any, index: number) => {
        cards.push({
          id: `${index}-1`,
          content: pair.word1,
          pair: `${index}-2`,
          isFlipped: false,
          isMatched: false
        });
        cards.push({
          id: `${index}-2`,
          content: pair.word2,
          pair: `${index}-1`,
          isFlipped: false,
          isMatched: false
        });
      });

      // Shuffle cards
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }

      setMemoryCards(cards);
    }
  }, [moment]);

  // Initialize categories for sortera-korgar
  useEffect(() => {
    if (moment.type === 'sortera-korgar' && moment.config.categories) {
      const initialCategories: {[key: string]: string[]} = {};
      moment.config.categories.forEach((category: string) => {
        initialCategories[category] = [];
      });
      setCategories(initialCategories);
    }
  }, [moment]);

  const handleMemoryCardClick = (cardId: string) => {
    if (selectedCards.length >= 2) return;

    const newCards = memoryCards.map(card => 
      card.id === cardId ? { ...card, isFlipped: true } : card
    );
    setMemoryCards(newCards);

    const newSelected = [...selectedCards, cardId];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      const [card1Id, card2Id] = newSelected;
      const card1 = newCards.find(c => c.id === card1Id);
      const card2 = newCards.find(c => c.id === card2Id);

      setTimeout(() => {
        if (card1?.pair === card2Id && card2?.pair === card1Id) {
          // Match found
          setMemoryCards(prev => prev.map(card => 
            card.id === card1Id || card.id === card2Id 
              ? { ...card, isMatched: true }
              : card
          ));
        } else {
          // No match, flip back
          setMemoryCards(prev => prev.map(card => 
            card.id === card1Id || card.id === card2Id 
              ? { ...card, isFlipped: false }
              : card
          ));
        }
        setSelectedCards([]);
      }, 1000);
    }
  };

  const handleWordClick = (wordIndex: number) => {
    if (moment.type === 'finns-ordklass') {
      setSelectedWords(prev => 
        prev.includes(wordIndex)
          ? prev.filter(i => i !== wordIndex)
          : [...prev, wordIndex]
      );
    }
  };

  const handleDragStart = (word: string) => {
    setDraggedWord(word);
  };

  const handleDrop = (category: string) => {
    if (draggedWord) {
      setCategories(prev => ({
        ...prev,
        [category]: [...prev[category], draggedWord]
      }));
      setDraggedWord(null);
    }
  };

  const removeWordFromCategory = (category: string, wordIndex: number) => {
    setCategories(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== wordIndex)
    }));
  };

  const handleAnswerSelect = (answer: string, isCorrect: boolean) => {
    setSelectedAnswer(answer);
    setShowFeedback(true);
    
    if (isCorrect) {
      setFeedbackText(moment.config.correctFeedback || 'Rätt! Bra jobbat!');
    } else {
      setFeedbackText(moment.config.incorrectFeedback || 'Fel svar. Försök igen!');
    }
    
    // Auto-continue after correct answer ONLY for old structure (no items)
    if (isCorrect && onNext && !moment.config.items) {
      setTimeout(() => {
        onNext();
      }, 2000);
    }
  };

  const resetQuestion = () => {
    setSelectedAnswer(null);
    setShowFeedback(false);
    setFeedbackText('');
  };

  const goToNextItem = () => {
    if (moment.config.items && moment.config.items.length > 0) {
      const sortedItems = [...moment.config.items].sort((a: any, b: any) => a.order - b.order);
      if (currentItemIndex < sortedItems.length - 1) {
        setCurrentItemIndex(currentItemIndex + 1);
        setTextIndex(0);
        setCurrentText('');
        setItemCompleted(false);
        setShowFeedback(false);
        setSelectedAnswer(null);
      } else {
        // All items completed, show test button instead of automatically progressing
        // The test button will handle calling onNext()
      }
    } else {
      // Old structure, just go to next moment
      if (onNext) onNext();
    }
  }

  const isLastItem = () => {
    if (moment.type === 'pratbubbla' && moment.config.items && moment.config.items.length > 0) {
      const sortedItems = [...moment.config.items].sort((a: any, b: any) => a.order - b.order);
      return currentItemIndex === sortedItems.length - 1;
    }
    return false;
  };

  // Slutprov Component
  const SlutprovComponent = ({ moment, onNext }: { moment: any; onNext?: () => void }) => {
    const [timeLeft, setTimeLeft] = useState(moment.config.timeLimit || 60);
    const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
    const [correctAnswers, setCorrectAnswers] = useState(0);
    const [wrongAnswers, setWrongAnswers] = useState(0);
    const [selectedWords, setSelectedWords] = useState<number[]>([]);
    const [isGameActive, setIsGameActive] = useState(true);
    const [showResult, setShowResult] = useState(false);
    const [grade, setGrade] = useState('');

    const sentences = moment.config.sentences || [];
    const requiredCorrect = moment.config.requiredCorrect || 5;
    const penaltySeconds = moment.config.penaltySeconds || 5;

    // Timer effect
    useEffect(() => {
      if (!isGameActive || timeLeft <= 0) return;
      
      const timer = setInterval(() => {
        setTimeLeft((prev: number) => {
          if (prev <= 1) {
            setIsGameActive(false);
            setShowResult(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }, [isGameActive, timeLeft]);

    // Calculate grade
    useEffect(() => {
      if (showResult) {
        const total = correctAnswers + wrongAnswers;
        const percentage = total > 0 ? (correctAnswers / total) * 100 : 0;
        
        if (percentage >= 90) setGrade('A');
        else if (percentage >= 80) setGrade('B');
        else if (percentage >= 70) setGrade('C');
        else if (percentage >= 60) setGrade('D');
        else if (percentage >= 50) setGrade('E');
        else setGrade('F');
      }
    }, [showResult, correctAnswers, wrongAnswers]);

    const currentSentence = sentences[currentSentenceIndex];
    
    // Parse sentence into words
    const parseWords = (sentence: string) => {
      if (!sentence) return [];
      const words = sentence.split(/(\s+|[.,!?;:])/).filter(part => part.trim().length > 0);
      return words.map((word, index) => ({
        text: word,
        index,
        isWord: /^[a-öA-Ö]+$/.test(word.trim())
      }));
    };

    const words = parseWords(currentSentence || '');

    const handleWordClick = (wordIndex: number) => {
      if (!isGameActive || showResult) return;
      
      const word = words[wordIndex];
      if (!word?.isWord) return;

      setSelectedWords(prev => 
        prev.includes(wordIndex) 
          ? prev.filter(i => i !== wordIndex)
          : [...prev, wordIndex]
      );
    };

    const handleSubmit = () => {
      if (!isGameActive || showResult) return;
      
      // Get target words for current sentence
      const targetWordsString = (moment.config.targetWords || [])[currentSentenceIndex] || '';
      const targetWords = targetWordsString
        .split(',')
        .map((word: string) => word.trim().toLowerCase())
        .filter((word: string) => word.length > 0);
      
      // Get selected words
      const selectedWordsText = selectedWords
        .map(index => words[index]?.text?.trim().toLowerCase())
        .filter(text => text);
      
      // Check if selection matches target words exactly
      const isCorrect = targetWords.length > 0 && 
        targetWords.length === selectedWordsText.length &&
        targetWords.every((target: string) => selectedWordsText.includes(target));
      
      if (isCorrect) {
        setCorrectAnswers(prev => prev + 1);
        
        // Check if passed
        if (correctAnswers + 1 >= requiredCorrect) {
          setIsGameActive(false);
          setShowResult(true);
          return;
        }
      } else {
        setWrongAnswers((prev: number) => prev + 1);
        // Add penalty time
        setTimeLeft((prev: number) => Math.max(0, prev - penaltySeconds));
      }

      // Move to next sentence
      if (currentSentenceIndex < sentences.length - 1) {
        setCurrentSentenceIndex(prev => prev + 1);
        setSelectedWords([]);
      } else {
        // No more sentences
        setIsGameActive(false);
        setShowResult(true);
      }
    };

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (showResult) {
      const passed = correctAnswers >= requiredCorrect;
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-2xl w-full text-center">
            <div className="text-6xl mb-4">
              {passed ? '🎉' : '⏰'}
            </div>
            <h2 className="text-3xl font-bold mb-4">
              {passed ? 'Grattis!' : 'Tiden är slut!'}
            </h2>
            <div className="text-xl mb-6">
              <p>Betyg: <span className="text-4xl font-bold text-yellow-300">{grade}</span></p>
              <p className="mt-2">Rätt svar: {correctAnswers}</p>
              <p>Fel svar: {wrongAnswers}</p>
              <p className="text-sm mt-2 opacity-75">
                {passed ? `Du klarade kravet på ${requiredCorrect} rätt svar!` : `Du behövde ${requiredCorrect} rätt svar för att klara provet.`}
              </p>
            </div>
            <button
              onClick={onNext}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-full font-bold text-lg transition-all transform hover:scale-105"
            >
              Fortsätt
            </button>
          </div>
        </div>
      );
    }

    if (!currentSentence) {
      return (
        <div className="text-center text-gray-500 py-12">
          <div className="text-4xl mb-4">⚠️</div>
          <p>Inga meningar konfigurerade för slutprovet</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white">
        {/* Header */}
        <div className="p-6 border-b border-white/20">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold">Slutprov</h1>
              <div className="text-lg">
                📝 {currentSentenceIndex + 1}/{sentences.length}
              </div>
            </div>
            <div className="flex items-center gap-6 text-lg">
              <div className="flex items-center gap-2">
                <span>✅</span>
                <span>{correctAnswers}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>❌</span>
                <span>{wrongAnswers}</span>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                timeLeft <= 10 ? 'bg-red-500/30 text-red-300' : 'bg-white/20'
              }`}>
                <span>⏰</span>
                <span className="font-mono text-xl">{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8">
            <h2 className="text-xl mb-6 text-center opacity-90">
              {moment.config.instruction || 'Klicka på ord av rätt ordklass'}
            </h2>
            
            {/* Show target words hint */}
            {(() => {
              const targetWordsString = (moment.config.targetWords || [])[currentSentenceIndex] || '';
              const targetWords = targetWordsString
                .split(',')
                .map((word: string) => word.trim())
                .filter((word: string) => word.length > 0);
              
              if (targetWords.length > 0) {
                return (
                  <div className="text-center mb-4 opacity-75">
                    <p className="text-sm">Klicka på: {targetWords.join(', ')}</p>
                  </div>
                );
              }
              return null;
            })()}
            
            <div className="bg-white/20 rounded-2xl p-6 mb-6">
              <p className="text-xl leading-relaxed text-center">
                {words.map((word, index) => (
                  <span key={index}>
                    {word.isWord ? (
                      <span
                        onClick={() => handleWordClick(index)}
                        className={`cursor-pointer px-1 py-0.5 rounded transition-all ${
                          selectedWords.includes(index)
                            ? 'bg-yellow-400 text-black'
                            : 'hover:bg-white/20'
                        }`}
                      >
                        {word.text}
                      </span>
                    ) : (
                      <span>{word.text}</span>
                    )}
                  </span>
                ))}
              </p>
            </div>

            <div className="text-center">
              <button
                onClick={handleSubmit}
                disabled={!isGameActive}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600 rounded-full font-bold text-lg transition-all transform hover:scale-105 disabled:scale-100"
              >
                Nästa mening
              </button>
            </div>

            <div className="mt-6 text-center text-sm opacity-75">
              <p>Mål: {requiredCorrect} rätt svar för godkänt</p>
              <p>Strafftid vid fel: {penaltySeconds} sekunder</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Get background style based on lesson settings
  const getBackgroundStyle = () => {
    if (lesson?.background === 'beach') {
      return {
        backgroundImage: `url(${beachBackground})`,
        backgroundSize: '140%', // Större bakgrund för att kapa bort mer
        backgroundPosition: 'center right', // Fokus på höger sida där piraten är
        backgroundRepeat: 'no-repeat'
      };
    }
    return {};
  };

  const renderMoment = () => {
    if (!moment || !moment.type) {
      return (
        <div className="text-center text-gray-500 py-12">
          <div className="text-4xl mb-4">⚠️</div>
          <p>Moment saknas eller är felaktigt konfigurerat</p>
        </div>
      );
    }

    switch(moment.type) {
      case 'textruta':
        return (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
              <p className="text-lg mb-6 leading-relaxed">{moment.config.text || 'Här kommer texten...'}</p>
              <Button onClick={onNext} className="bg-blue-500 hover:bg-blue-600">
                {moment.config.buttonText || 'Nästa'}
              </Button>
            </div>
          </div>
        );

      case 'pratbubbla':
        const currentItem = getCurrentItem();
        const isCurrentItemQuestion = currentItem?.type === 'question';
        const isCurrentItemText = currentItem?.type === 'text';
        
        // Check for questions in current item or old structure
        let hasQuestion = false;
        let currentAlternatives = [];
        
        if (isCurrentItemQuestion) {
          hasQuestion = true;
          currentAlternatives = currentItem?.alternatives || [];
        } else if (!moment.config.items && moment.config.question && moment.config.alternatives) {
          hasQuestion = true;
          currentAlternatives = moment.config.alternatives || [];
        }
        
        // For text and question items, check if typewriter animation is complete
        const textComplete = (isCurrentItemText || isCurrentItemQuestion) ? itemCompleted : true;
        
        return (
          <div className="w-full h-screen flex" style={getBackgroundStyle()}>
            {/* Text area - flyttad närmare höger */}
            <div className="w-3/5 flex items-start justify-end pt-16 pr-4 pl-16" style={lesson?.background ? { margin: '20px', borderRadius: '20px' } : {}}>
              <div className="bg-white rounded-2xl border-4 border-blue-300 p-8 shadow-lg max-w-2xl w-full">
                <div className="bg-gray-100 rounded-lg p-6 relative">
                  <div className="absolute -right-2 top-6 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-gray-100"></div>
                  
                  {/* Text content */}
                  <p className="whitespace-pre-wrap font-mono font-semibold text-[26px]">
                    {showFeedback ? feedbackText : currentText}
                    {!showFeedback && (isCurrentItemText || isCurrentItemQuestion) && !itemCompleted && (
                      <span className="animate-pulse">|</span>
                    )}
                  </p>
                  
                  {/* Question and alternatives */}
                  {hasQuestion && isCurrentItemQuestion && textComplete && !showFeedback && (
                    <div className="mt-6">
                      <div className="space-y-3">
                        {currentAlternatives.map((alt: any, index: number) => (
                          <Button
                            key={index}
                            variant="outline"
                            className="w-full text-left justify-start p-4 h-auto"
                            onClick={() => {
                              handleAnswerSelect(alt.text, alt.correct);
                              // Use current item's feedback
                              if (alt.correct) {
                                setFeedbackText(currentItem?.correctFeedback || 'Rätt! Bra jobbat!');
                              } else {
                                setFeedbackText(currentItem?.incorrectFeedback || 'Fel svar. Försök igen!');
                              }
                            }}
                            disabled={selectedAnswer !== null}
                          >
                            {alt.text}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Feedback actions */}
                  {showFeedback && (
                    <div className="mt-4 space-x-3">
                      {!currentAlternatives.find((alt: any) => alt.text === selectedAnswer)?.correct ? (
                        <Button variant="outline" onClick={resetQuestion}>
                          Försök igen
                        </Button>
                      ) : isLastItem() ? (
                        <Button onClick={onNext} className="bg-green-600 hover:bg-green-700">
                          Gör test
                        </Button>
                      ) : (
                        <Button onClick={goToNextItem}>
                          Fortsätt
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {/* Default continue button for text-only or completed questions */}
                  {!hasQuestion && textComplete && (
                    <div className="mt-4">
                      {isLastItem() ? (
                        <Button onClick={onNext} className="bg-green-600 hover:bg-green-700">
                          Gör test
                        </Button>
                      ) : (
                        <Button onClick={goToNextItem}>
                          Fortsätt
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Character area - större yta för piraten */}
            <div className="w-2/5 flex items-center justify-start pl-4">
              <div className="flex-shrink-0">
                {moment.config.characterImage?.startsWith('/') || moment.config.characterImage?.startsWith('http') || moment.config.characterImage?.includes('blob:') ? (
                  <img 
                    src={moment.config.characterImage} 
                    alt="Character" 
                    className="w-full h-auto max-h-96 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const emojiDiv = document.createElement('div');
                      emojiDiv.className = 'text-9xl flex items-center justify-center h-96';
                      emojiDiv.textContent = '👨‍🏫';
                      target.parentNode?.appendChild(emojiDiv);
                    }}
                  />
                ) : moment.config.characterImage?.includes('data:') ? (
                  <img 
                    src={moment.config.characterImage} 
                    alt="Character" 
                    className="w-full h-auto max-h-96 object-contain" 
                  />
                ) : (
                  <div className="text-9xl flex items-center justify-center h-96">
                    {moment.config.characterImage || '👨‍🏫'}
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
            <div className={`grid gap-4 ${
              moment.config.difficulty === 'easy' ? 'grid-cols-4' : 
              moment.config.difficulty === 'medium' ? 'grid-cols-4' : 'grid-cols-4'
            }`}>
              {memoryCards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => !card.isFlipped && !card.isMatched && handleMemoryCardClick(card.id)}
                  className={`h-20 rounded-lg flex items-center justify-center text-white font-bold cursor-pointer transition-all duration-300 ${
                    card.isMatched 
                      ? 'bg-green-500' 
                      : card.isFlipped 
                        ? 'bg-blue-500' 
                        : 'bg-gray-500 hover:bg-gray-400'
                  }`}
                >
                  {card.isFlipped || card.isMatched ? card.content : '?'}
                </div>
              ))}
            </div>
            {memoryCards.every(card => card.isMatched) && memoryCards.length > 0 && (
              <div className="mt-6">
                <p className="text-green-600 font-bold mb-4">Bra jobbat! Du hittade alla par!</p>
                <Button onClick={onNext}>Fortsätt</Button>
              </div>
            )}
          </div>
        );

      case 'finns-ordklass':
        const targetWords = moment.config.targetWords || [];
        const fullText = moment.config.text || 'Här kommer texten...';
        
        // Split text into words and punctuation
        const textParts = fullText.split(/(\s+)/).filter((part: string) => part.length > 0);
        let wordIndex = 0;
        
        return (
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-xl font-bold mb-4">{moment.config.instruction || 'Klicka på orden'}</h3>
            <div className="bg-gray-50 border rounded-lg p-6 mb-6">
              <p className="text-lg leading-relaxed">
                {textParts.map((part: string, i: number) => {
                  // Skip whitespace parts
                  if (/^\s+$/.test(part)) {
                    return <span key={i}>{part}</span>;
                  }
                  
                  const cleanWord = part.replace(/[.,!?;:]*$/, ''); // Remove trailing punctuation
                  const punctuation = part.slice(cleanWord.length); // Get the punctuation
                  const isTarget = targetWords.includes(cleanWord);
                  const isSelected = selectedWords.includes(wordIndex);
                  const currentWordIndex = wordIndex;
                  wordIndex++;
                  
                  return (
                    <span key={i}>
                      <span 
                        onClick={() => handleWordClick(currentWordIndex)}
                        className={`cursor-pointer px-1 py-0.5 rounded transition-colors ${
                          isSelected 
                            ? (isTarget ? 'bg-green-300' : 'bg-red-300')
                            : (isTarget ? 'hover:bg-green-100' : 'hover:bg-yellow-100')
                        }`}
                        title={isTarget ? 'Rätt ord att klicka på' : ''}
                      >
                        {cleanWord}
                      </span>
                      {punctuation && <span className="text-gray-600">{punctuation}</span>}
                    </span>
                  );
                })}
              </p>
            </div>
            {targetWords.length > 0 && (
              <div className="mb-4 text-sm text-gray-600">
                <p>Hittat: {selectedWords.filter(i => {
                  // Rebuild word array for counting
                  const words = fullText.split(/(\s+)/)
                    .filter((part: string) => part.length > 0 && !/^\s+$/.test(part))
                    .map((word: string) => word.replace(/[.,!?;:]*$/, ''));
                  return targetWords.includes(words[i]);
                }).length} / {targetWords.length}</p>
              </div>
            )}
            <Button onClick={onNext}>Fortsätt</Button>
          </div>
        );

      case 'sortera-korgar':
        const availableWords = (moment.config.words || [])
          .filter((word: string) => !Object.values(categories).flat().includes(word));

        return (
          <div className="max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-center mb-6">{moment.config.instruction || 'Sortera orden'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold mb-4">Ord att sortera:</h4>
                <div className="flex flex-wrap gap-2 min-h-[100px] p-4 border rounded-lg bg-gray-50">
                  {availableWords.map((word: string, i: number) => (
                    <div
                      key={`word-${i}`}
                      draggable
                      onDragStart={() => handleDragStart(word)}
                      className="bg-blue-500 text-white px-3 py-2 rounded cursor-move hover:bg-blue-600 transition-colors select-none"
                    >
                      {word}
                    </div>
                  ))}
                  {availableWords.length === 0 && (
                    <div className="text-gray-400 italic w-full text-center py-8">
                      Alla ord är sorterade!
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Korgar:</h4>
                <div className="space-y-3">
                  {(moment.config.categories || []).map((category: string, i: number) => (
                    <div
                      key={`category-${i}`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDrop(category);
                      }}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[80px] hover:border-blue-300 transition-colors bg-white"
                    >
                      <div className="font-medium text-gray-600 mb-2">{category}</div>
                      <div className="flex flex-wrap gap-1">
                        {categories[category]?.map((word: string, wordIndex: number) => (
                          <span
                            key={`sorted-${wordIndex}`}
                            onClick={() => removeWordFromCategory(category, wordIndex)}
                            className="bg-green-500 text-white text-sm px-2 py-1 rounded cursor-pointer hover:bg-green-600 transition-colors"
                            title="Klicka för att ta bort"
                          >
                            {word} ×
                          </span>
                        ))}
                        {(!categories[category] || categories[category].length === 0) && (
                          <div className="text-gray-400 italic text-sm">
                            Dra ord hit
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-center mt-6">
              <Button onClick={onNext}>Fortsätt</Button>
            </div>
          </div>
        );

      case 'korsord':
        const crosswordGrid = moment.config.grid || [];
        const gridSize = 15;
        
        return (
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-xl font-bold mb-6">Korsord</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Grid */}
              <div className="flex justify-center">
                <div className="grid gap-0.5 max-w-md" style={{gridTemplateColumns: 'repeat(15, 1fr)'}}>
                  {Array.from({ length: gridSize * gridSize }).map((_, index) => {
                    const x = index % gridSize;
                    const y = Math.floor(index / gridSize);
                    const cell = crosswordGrid.find((c: any) => c.x === x && c.y === y);
                    
                    return (
                      <div
                        key={`${x}-${y}`}
                        className={`w-6 h-6 border border-gray-300 text-xs flex items-center justify-center relative ${
                          cell ? 'bg-white font-bold' : 'bg-gray-200'
                        }`}
                      >
                        {cell?.letter}
                        {cell?.number && (
                          <div className="absolute top-0 left-0 text-xs font-bold text-blue-600 leading-none">
                            {cell.number}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Clues */}
              <div className="text-left">
                <h4 className="font-semibold mb-4">Ledtrådar:</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {(moment.config.clues || []).map((clue: any, i: number) => (
                    <div key={i} className="p-2 border rounded">
                      <div className="font-medium">
                        {i + 1}. {clue.question}
                      </div>
                      <div className="text-sm text-gray-600">
                        ({clue.answer.length} bokstäver)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <Button onClick={onNext} className="mt-6">Fortsätt</Button>
          </div>
        );

      case 'ordracet':
        return <OrdracetPreview moment={moment} onNext={onNext} />;

      case 'mening-pussel':
        return <MeningPusselPreview moment={moment} onNext={onNext} />;

      case 'gissa-ordet':
        return <GissaOrdetPreview moment={moment} onNext={onNext} />;

      case 'quiz':
        return <QuizPreview moment={moment} onNext={onNext} />;

      case 'rim-spel':
        return <RimSpelPreview moment={moment} onNext={onNext} />;

      case 'berattelse':
        return <BeratttelsePreview moment={moment} onNext={onNext} />;

      case 'ordklassdrak':
        return <OrdklassdrakPreview moment={moment} onNext={onNext} />;

      case 'tabellen':
        return <TabellenGame moment={moment} onNext={onNext} />;

      case 'piratgrav':
        return <Piratgrav moment={moment} onNext={onNext} />;

      case 'slutdiplom':
        return <Slutdiplom moment={moment} onNext={onNext} />;

      case 'slutprov':
        return (
          <SlutprovComponent 
            moment={moment} 
            onNext={onNext}
          />
        );

      case 'synonymer':
      case 'motsatser':
        return (
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-xl font-bold mb-6">
              {moment.type === 'synonymer' ? '🔄 Synonymer' : '⚖️ Motsatser'}
            </h3>
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <p className="mb-4">{moment.config.instruction}</p>
              <div className="grid grid-cols-2 gap-4">
                {(moment.config.wordPairs || []).slice(0, 4).map((pair: any, i: number) => (
                  <div key={i} className="space-y-2">
                    <Button variant="outline" className="w-full">
                      {pair.word1 || 'ord1'}
                    </Button>
                    <Button variant="outline" className="w-full">
                      {pair.word2 || 'ord2'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={onNext}>Fortsätt</Button>
          </div>
        );

      case 'stavning':
        return (
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-xl font-bold mb-6">🔤 Stavning</h3>
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <p className="text-lg mb-4">Stava ordet:</p>
              <div className="text-2xl font-bold mb-4 text-blue-600">
                {moment.config.words?.[0] || 'EXEMPEL'}
              </div>
              <input 
                type="text" 
                className="border-2 border-gray-300 rounded-lg p-3 text-xl text-center w-64"
                placeholder="Skriv ordet här..."
              />
              {moment.config.allowHints && (
                <div className="mt-4">
                  <Button variant="outline" size="sm">💡 Ledtråd</Button>
                </div>
              )}
            </div>
            <Button onClick={onNext}>Fortsätt</Button>
          </div>
        );

      case 'fyll-mening':
        return <FyllMeningPreview moment={moment} onNext={onNext} />;

      case 'korsord':
        // Transform clues to the format CrosswordPlayer expects
        const transformedClues: CrosswordPlayerClue[] = (moment.config.clues || []).map((clue: any, index: number) => {
          // Find the first cell of this word in the grid
          const wordCells = (moment.config.grid || []).filter((cell: CrosswordCell) => cell.clueIndex === index);
          if (wordCells.length === 0) {
            return null;
          }
          
          // Sort cells to find start position
          const sortedCells = wordCells.sort((a: CrosswordCell, b: CrosswordCell) => {
            if (a.y === b.y) return a.x - b.x; // Same row, sort by x
            return a.y - b.y; // Sort by y
          });
          
          const startCell = sortedCells[0];
          const direction = startCell.direction || 'across';
          
          return {
            id: clue.id,
            number: startCell.number || index + 1,
            question: clue.question,
            answer: clue.answer,
            direction,
            startX: startCell.x,
            startY: startCell.y,
          } as CrosswordPlayerClue;
        }).filter((clue: CrosswordPlayerClue | null) => clue !== null);

        return (
          <CrosswordPlayer 
            clues={transformedClues}
            grid={moment.config.grid || []}
            onComplete={() => onNext?.()}
          />
        );

      default:
        return (
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-4">🚧</div>
            <p>Interaktiv förhandsvisning för {moment.title} kommer snart</p>
            <Button onClick={onNext} className="mt-4">Fortsätt</Button>
          </div>
        );
    }
  };

  return renderMoment();
}