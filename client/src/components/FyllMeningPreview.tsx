import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";

interface FyllMeningPreviewProps {
  moment: any;
  onNext?: () => void;
}

interface SentenceState {
  id: string;
  parts: Array<{
    type: 'text' | 'blank';
    content: string; // For text parts, or correctAnswer for blank parts
    filled?: string; // The word that was dragged into this blank
    isCorrect?: boolean; // Whether the filled word is correct
  }>;
  isComplete: boolean;
  isAllCorrect: boolean;
}

export function FyllMeningPreview({ moment, onNext }: FyllMeningPreviewProps) {
  const [sentenceStates, setSentenceStates] = useState<SentenceState[]>([]);
  const [wordBank, setWordBank] = useState<string[]>([]);
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<{ sentenceId: string; blankIndex: number } | null>(null);
  const [hoveredBlank, setHoveredBlank] = useState<{ sentenceId: string; blankIndex: number } | null>(null);
  const [completedAll, setCompletedAll] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  // Initialize sentences and word bank
  useEffect(() => {
    if (!moment?.config?.sentences) return;

    const sentences = moment.config.sentences || [];
    const distractors = moment.config.distractors || [];
    const showImmediateFeedback = moment.config.showImmediateFeedback !== false;

    // Parse sentences and extract blanks
    const parsedSentences: SentenceState[] = sentences.map((sentence: any) => {
      const parts: SentenceState['parts'] = [];
      const text = sentence.text || '';
      let totalBlanks = 0;

      // Split by [...] brackets
      const regex = /\[([^\]]+)\]/g;
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(text)) !== null) {
        // Add text before the bracket
        if (match.index > lastIndex) {
          parts.push({
            type: 'text',
            content: text.slice(lastIndex, match.index)
          });
        }

        // Add blank
        parts.push({
          type: 'blank',
          content: match[1].trim(), // This is the correct answer
          filled: undefined,
          isCorrect: undefined
        });
        totalBlanks++;

        lastIndex = regex.lastIndex;
      }

      // Add remaining text
      if (lastIndex < text.length) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex)
        });
      }

      return {
        id: sentence.id,
        parts,
        isComplete: false,
        isAllCorrect: false
      };
    });

    setSentenceStates(parsedSentences);

    // Build word bank
    const correctWords: string[] = [];
    parsedSentences.forEach(sentence => {
      sentence.parts.forEach(part => {
        if (part.type === 'blank' && !correctWords.includes(part.content)) {
          correctWords.push(part.content);
        }
      });
    });

    const allWords = [...correctWords, ...distractors];
    // Shuffle the word bank
    const shuffled = allWords.sort(() => Math.random() - 0.5);
    setWordBank(shuffled);

    // Calculate total blanks for score
    const totalBlanks = parsedSentences.reduce((sum, s) => 
      sum + s.parts.filter(p => p.type === 'blank').length, 0
    );
    setScore({ correct: 0, total: totalBlanks });

  }, [moment]);

  // Check if all sentences are completed AND all correct
  useEffect(() => {
    const allComplete = sentenceStates.every(s => s.isComplete);
    const allCorrect = sentenceStates.every(s => s.isAllCorrect);
    
    // Only allow continuing when EVERYTHING is correct
    setCompletedAll(allComplete && allCorrect);

    // Update score
    let correctCount = 0;
    sentenceStates.forEach(sentence => {
      sentence.parts.forEach(part => {
        if (part.type === 'blank' && part.isCorrect) {
          correctCount++;
        }
      });
    });
    setScore(prev => ({ ...prev, correct: correctCount }));

  }, [sentenceStates]);

  const handleDragStart = (word: string, fromSentenceId?: string, fromBlankIndex?: number) => {
    setDraggedWord(word);
    
    // Save where the drag started from (but DON'T remove the word yet)
    if (fromSentenceId !== undefined && fromBlankIndex !== undefined) {
      setDragSource({ sentenceId: fromSentenceId, blankIndex: fromBlankIndex });
    } else {
      setDragSource(null); // Dragging from word bank
    }
  };

  const handleDragEnd = () => {
    // Clean up
    setDraggedWord(null);
    setHoveredBlank(null);
    setDragSource(null);
  };

  const handleDropToBlank = (sentenceId: string, blankIndex: number) => {
    if (!draggedWord) return;

    // First, check what word is in the target blank (if any)
    let targetWord: string | undefined = undefined;
    const targetSentence = sentenceStates.find(s => s.id === sentenceId);
    if (targetSentence) {
      let counter = 0;
      for (const part of targetSentence.parts) {
        if (part.type === 'blank') {
          if (counter === blankIndex) {
            targetWord = part.filled;
            break;
          }
          counter++;
        }
      }
    }

    // Update all sentences in one go
    setSentenceStates(prev => prev.map(sentence => {
      const newParts = [...sentence.parts];
      let actualBlankIndex = 0;

      for (let i = 0; i < newParts.length; i++) {
        if (newParts[i].type === 'blank') {
          // If this is the target blank, place draggedWord here
          if (sentence.id === sentenceId && actualBlankIndex === blankIndex) {
            const part = newParts[i];
            const isCorrect = part.content === draggedWord;
            
            newParts[i] = {
              ...part,
              filled: draggedWord,
              isCorrect
            };
          }
          // If this is the source blank (where draggedWord came from)
          else if (dragSource && sentence.id === dragSource.sentenceId && actualBlankIndex === dragSource.blankIndex) {
            const part = newParts[i];
            
            if (targetWord) {
              // SWAP: Place the target word here
              const isCorrect = part.content === targetWord;
              newParts[i] = {
                ...part,
                filled: targetWord,
                isCorrect
              };
            } else {
              // No swap, just empty the source
              newParts[i] = {
                ...part,
                filled: undefined,
                isCorrect: undefined
              };
            }
          }
          
          actualBlankIndex++;
        }
      }

      const blanks = newParts.filter(p => p.type === 'blank');
      const isComplete = blanks.every(b => b.filled !== undefined);
      const isAllCorrect = blanks.every(b => b.isCorrect === true);

      return {
        ...sentence,
        parts: newParts,
        isComplete,
        isAllCorrect
      };
    }));

    // If dragging from word bank (not from a blank), remove from word bank
    if (!dragSource) {
      setWordBank(prev => {
        const index = prev.indexOf(draggedWord);
        if (index > -1) {
          const newBank = [...prev];
          newBank.splice(index, 1);
          
          // If target had a word, add it to word bank
          if (targetWord) {
            newBank.push(targetWord);
          }
          
          return newBank;
        }
        return prev;
      });
    }
  };

  const handleDropToWordBank = () => {
    if (!draggedWord) return;
    
    // Only allow dropping back to word bank if it came from a blank
    if (!dragSource) return; // Already in word bank
    
    // Remove word from the blank it came from
    setSentenceStates(prev => prev.map(sentence => {
      if (sentence.id !== dragSource.sentenceId) return sentence;

      const newParts = [...sentence.parts];
      let actualBlankIndex = 0;

      for (let i = 0; i < newParts.length; i++) {
        if (newParts[i].type === 'blank') {
          if (actualBlankIndex === dragSource.blankIndex) {
            newParts[i] = {
              ...newParts[i],
              filled: undefined,
              isCorrect: undefined
            };
            break;
          }
          actualBlankIndex++;
        }
      }

      const blanks = newParts.filter(p => p.type === 'blank');
      const isComplete = blanks.every(b => b.filled !== undefined);
      const isAllCorrect = blanks.every(b => b.isCorrect === true);

      return {
        ...sentence,
        parts: newParts,
        isComplete,
        isAllCorrect
      };
    }));
    
    // Add word back to word bank
    setWordBank(prev => [...prev, draggedWord]);
  };

  const handleRemoveWord = (sentenceId: string, blankIndex: number) => {
    setSentenceStates(prev => prev.map(sentence => {
      if (sentence.id !== sentenceId) return sentence;

      const newParts = [...sentence.parts];
      let actualBlankIndex = 0;
      let removedWord: string | undefined;

      for (let i = 0; i < newParts.length; i++) {
        if (newParts[i].type === 'blank') {
          if (actualBlankIndex === blankIndex) {
            removedWord = newParts[i].filled;
            newParts[i] = {
              ...newParts[i],
              filled: undefined,
              isCorrect: undefined
            };
            break;
          }
          actualBlankIndex++;
        }
      }

      // Add word back to word bank
      if (removedWord) {
        setWordBank(prev => [...prev, removedWord]);
      }

      const blanks = newParts.filter(p => p.type === 'blank');
      const isComplete = blanks.every(b => b.filled !== undefined);
      const isAllCorrect = blanks.every(b => b.isCorrect === true);

      return {
        ...sentence,
        parts: newParts,
        isComplete,
        isAllCorrect
      };
    }));
  };

  // Only show feedback when ALL words are placed
  const allWordsPlaced = sentenceStates.length > 0 && sentenceStates.every(s => s.isComplete);

  if (!moment?.config?.sentences || moment.config.sentences.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        <div className="text-4xl mb-4">📝</div>
        <p>Ingen övning konfigurerad ännu</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-3">
          {moment.title || 'Fyll i rätt ord'}
        </h2>
        <p className="text-lg text-gray-600 mb-4">
          {moment.config.instruction || 'Dra rätt ord till luckan i meningen'}
        </p>
        
        {/* Score - only show when all words are placed */}
        {allWordsPlaced && (
          <div className="flex items-center justify-center gap-3">
            <Badge variant="outline" className="text-lg px-4 py-2">
              <span className="font-bold text-green-600">{score.correct}</span>
              <span className="text-gray-500 mx-1">/</span>
              <span className="text-gray-700">{score.total}</span>
            </Badge>
          </div>
        )}
      </div>

      {/* Word Bank */}
      <div 
        className="mb-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200 p-6"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropToWordBank}
      >
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-purple-800 inline-flex items-center gap-2">
            <span>📚</span> Ordbank
          </h3>
        </div>
        
        <div className="flex flex-wrap gap-3 justify-center min-h-[60px]">
          {wordBank.length > 0 ? (
            wordBank.map((word, index) => (
              <div
                key={`${word}-${index}`}
                draggable
                onDragStart={() => handleDragStart(word)}
                onDragEnd={handleDragEnd}
                className={`
                  px-4 py-3 bg-white border-2 border-purple-300 rounded-lg
                  font-medium text-gray-800 shadow-md cursor-move
                  hover:bg-purple-100 hover:border-purple-400 hover:scale-105
                  transition-all duration-200
                  ${draggedWord === word ? 'opacity-50 scale-95' : ''}
                `}
              >
                {word}
              </div>
            ))
          ) : (
            <p className="text-gray-500 italic py-2">
              {completedAll ? '🎉 Alla ord använda!' : 'Inga ord kvar...'}
            </p>
          )}
        </div>
      </div>

      {/* Sentences */}
      <div className="space-y-6">
        {sentenceStates.map((sentence, sentenceIndex) => {
          let blankCounter = 0;
          
          return (
            <Card key={sentence.id} className="p-6 bg-white hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <Badge variant="outline" className="mt-1">
                  {sentenceIndex + 1}
                </Badge>
                
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-lg leading-relaxed">
                    {sentence.parts.map((part, partIndex) => {
                      if (part.type === 'text') {
                        return (
                          <span key={partIndex} className="text-gray-800">
                            {part.content}
                          </span>
                        );
                      } else {
                        const currentBlankIndex = blankCounter++;
                        const isFilled = part.filled !== undefined;
                        const isHovered = hoveredBlank?.sentenceId === sentence.id && hoveredBlank?.blankIndex === currentBlankIndex;
                        const showPreview = isHovered && draggedWord && !isFilled;

                        return (
                          <div
                            key={partIndex}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (draggedWord) {
                                setHoveredBlank({ sentenceId: sentence.id, blankIndex: currentBlankIndex });
                              }
                            }}
                            onDragLeave={(e) => {
                              // Only clear if we're actually leaving the element (not entering a child)
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = e.clientX;
                              const y = e.clientY;
                              
                              if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                                setHoveredBlank(null);
                              }
                            }}
                            onDrop={() => {
                              handleDropToBlank(sentence.id, currentBlankIndex);
                              setHoveredBlank(null);
                            }}
                            className={`
                              relative inline-flex items-center justify-center
                              min-w-[120px] px-4 py-2 rounded-lg
                              border-2
                              transition-all duration-200
                              ${isHovered && draggedWord
                                ? 'bg-yellow-100 border-yellow-500 border-solid shadow-lg scale-105 ring-2 ring-yellow-300'
                                : isFilled 
                                  ? allWordsPlaced
                                    ? part.isCorrect
                                      ? 'bg-green-50 border-green-400 border-solid'
                                      : 'bg-red-50 border-red-400 border-solid'
                                    : 'bg-blue-50 border-blue-400 border-solid'
                                  : 'bg-gray-50 border-gray-300 border-dashed hover:border-purple-400 hover:bg-purple-50'
                              }
                            `}
                          >
                            {isFilled ? (
                              <div 
                                draggable
                                onDragStart={() => handleDragStart(part.filled!, sentence.id, currentBlankIndex)}
                                onDragEnd={handleDragEnd}
                                className="flex items-center gap-2 cursor-move hover:scale-105 transition-transform"
                              >
                                <span className="font-medium text-gray-800">
                                  {part.filled}
                                </span>
                                {allWordsPlaced && (
                                  part.isCorrect ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                  ) : (
                                    <XCircle className="w-5 h-5 text-red-600" />
                                  )
                                )}
                                <span className="text-xs text-gray-400 ml-1">↔️</span>
                              </div>
                            ) : showPreview ? (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-purple-700 animate-pulse">
                                  {draggedWord}
                                </span>
                                <span className="text-xs text-purple-600">↓ Släpp här</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">
                                Dra hit ord
                              </span>
                            )}
                          </div>
                        );
                      }
                    })}
                  </div>

                  {/* Sentence feedback - only show when ALL words are placed */}
                  {allWordsPlaced && sentence.isComplete && (
                    <div className={`
                      mt-4 p-3 rounded-lg border-l-4
                      ${sentence.isAllCorrect 
                        ? 'bg-green-50 border-green-500 text-green-800' 
                        : 'bg-orange-50 border-orange-500 text-orange-800'
                      }
                    `}>
                      {sentence.isAllCorrect ? (
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5" />
                          Perfekt! Rätt ord i alla luckor! 🎉
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <XCircle className="w-5 h-5" />
                          Inte helt rätt. Försök igen!
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Feedback Messages */}
      {sentenceStates.length > 0 && sentenceStates.every(s => s.isComplete) && (
        <div className="mt-8 text-center">
          {completedAll ? (
            // All correct - show success message and continue button
            <>
              <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border-2 border-green-300">
                <h3 className="text-2xl font-bold text-green-700 mb-2">
                  🎉 Perfekt! Alla rätt!
                </h3>
                <p className="text-lg text-gray-700">
                  Du fick <span className="font-bold text-green-600">{score.correct}</span> av{' '}
                  <span className="font-bold">{score.total}</span> rätt!
                </p>
                <p className="text-xl font-bold text-green-600 mt-2">
                  ⭐ Du kan gå vidare! ⭐
                </p>
              </div>
              
              {onNext && (
                <Button 
                  onClick={onNext}
                  size="lg"
                  className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-8 py-6 text-lg"
                >
                  Fortsätt <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              )}
            </>
          ) : (
            // Some wrong - show error message
            <div className="mb-6 p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border-2 border-orange-300">
              <h3 className="text-2xl font-bold text-orange-700 mb-2">
                😅 Nästan där!
              </h3>
              <p className="text-lg text-gray-700">
                Du fick <span className="font-bold text-orange-600">{score.correct}</span> av{' '}
                <span className="font-bold">{score.total}</span> rätt.
              </p>
              <p className="text-md text-orange-800 mt-3 font-medium">
                ❌ Du måste ha alla rätt för att gå vidare!
              </p>
              <p className="text-sm text-gray-600 mt-2">
                💡 Tips: Klicka på ✕ vid de röda orden och försök igen
              </p>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>💡 Tips: Dra ord från ordbanken till luckorna i meningarna</p>
        <p>🔄 Dra ett ord till en fylld ruta för att byta plats på orden</p>
        <p>↔️ Dra tillbaka till ordbanken för att ta bort ett ord från en ruta</p>
      </div>
    </div>
  );
}

