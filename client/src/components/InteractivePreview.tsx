import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

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
}

export function InteractivePreview({ moment, onNext }: InteractivePreviewProps) {
  const [currentText, setCurrentText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [selectedWords, setSelectedWords] = useState<number[]>([]);
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const [categories, setCategories] = useState<{[key: string]: string[]}>({});

  // Typewriter effect for pratbubbla
  useEffect(() => {
    if (moment.type === 'pratbubbla' && moment.config.text) {
      const text = moment.config.text;
      if (textIndex < text.length) {
        const timeout = setTimeout(() => {
          setCurrentText(text.slice(0, textIndex + 1));
          setTextIndex(textIndex + 1);
        }, moment.config.animationSpeed || 50);
        return () => clearTimeout(timeout);
      }
    }
  }, [textIndex, moment]);

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

  const renderMoment = () => {
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
        return (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="text-6xl">{moment.config.characterImage || '👨‍🏫'}</div>
              </div>
              <div className="bg-white border-2 border-gray-300 rounded-2xl p-6 relative">
                <div className="absolute -left-3 top-6 w-6 h-6 bg-white border-l-2 border-b-2 border-gray-300 transform rotate-45"></div>
                <p className="text-lg">
                  {currentText}
                  {textIndex < (moment.config.text || '').length && (
                    <span className="animate-pulse">|</span>
                  )}
                </p>
                {textIndex >= (moment.config.text || '').length && (
                  <Button onClick={onNext} className="mt-4">
                    Fortsätt
                  </Button>
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
        const textWords = (moment.config.text || 'Här kommer texten...').split(' ');
        
        return (
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-xl font-bold mb-4">{moment.config.instruction || 'Klicka på orden'}</h3>
            <div className="bg-gray-50 border rounded-lg p-6 mb-6">
              <p className="text-lg leading-relaxed">
                {textWords.map((word: string, i: number) => {
                  const cleanWord = word.replace(/[.,!?;:]$/, ''); // Remove punctuation for comparison
                  const isTarget = targetWords.includes(cleanWord);
                  const isSelected = selectedWords.includes(i);
                  
                  return (
                    <span 
                      key={i} 
                      onClick={() => handleWordClick(i)}
                      className={`cursor-pointer px-1 py-0.5 rounded transition-colors ${
                        isSelected 
                          ? (isTarget ? 'bg-green-300' : 'bg-red-300')
                          : (isTarget ? 'hover:bg-green-100' : 'hover:bg-yellow-100')
                      }`}
                      title={isTarget ? 'Rätt ord att klicka på' : ''}
                    >
                      {word}{' '}
                    </span>
                  );
                })}
              </p>
            </div>
            {targetWords.length > 0 && (
              <div className="mb-4 text-sm text-gray-600">
                <p>Hittat: {selectedWords.filter(i => {
                  const word = textWords[i]?.replace(/[.,!?;:]$/, '');
                  return targetWords.includes(word);
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