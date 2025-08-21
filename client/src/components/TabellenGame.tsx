import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface TabellenGameProps {
  moment: any;
  onNext?: () => void;
}

interface DroppedWord {
  word: string;
  rowIndex: number;
  cellIndex: number;
  id: string; // Unique ID to handle duplicates
}

interface WordBankItem {
  word: string;
  id: string;
  expectedColumn: string; // Which column this word should be in
}

export function TabellenGame({ moment, onNext }: TabellenGameProps) {
  const [wordBank, setWordBank] = useState<WordBankItem[]>([]);
  const [droppedWords, setDroppedWords] = useState<DroppedWord[]>([]);
  const [draggedWord, setDraggedWord] = useState<WordBankItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize word bank from table cells (facit), only once
  useEffect(() => {
    if (moment?.config?.rows && moment?.config?.columns && !isInitialized) {
      const bankItems: WordBankItem[] = [];
      
      // Extract all non-empty words from table cells with their expected column
      moment.config.rows.forEach((row: any) => {
        if (row.cells && Array.isArray(row.cells)) {
          row.cells.forEach((cell: string, cellIndex: number) => {
            if (cell && cell.trim()) {
              const expectedColumn = moment.config.columns[cellIndex]?.trim().toLowerCase() || `kolumn-${cellIndex}`;
              bankItems.push({
                word: cell.trim(),
                id: `word-${bankItems.length}-${Date.now()}`,
                expectedColumn: expectedColumn
              });
            }
          });
        }
      });

      setWordBank(bankItems);
      setIsInitialized(true);
    }
  }, [moment?.config?.rows, moment?.config?.columns, isInitialized]);

  const handleDragStart = (e: React.DragEvent, wordItem: WordBankItem) => {
    setDraggedWord(wordItem);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", wordItem.word);
    e.dataTransfer.setData("word-id", wordItem.id);
    e.dataTransfer.setData("source-type", "bank");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, rowIndex: number, cellIndex: number) => {
    e.preventDefault();
    
    const word = e.dataTransfer.getData('text/plain');
    const wordId = e.dataTransfer.getData('word-id');
    const sourceType = e.dataTransfer.getData('source-type');
    const sourceRow = parseInt(e.dataTransfer.getData('source-row'));
    const sourceCell = parseInt(e.dataTransfer.getData('source-cell'));

    if (!word || !wordId) return;

    // Check if cell already has a word
    const existingWord = droppedWords.find(
      dropped => dropped.rowIndex === rowIndex && dropped.cellIndex === cellIndex
    );

    let newWordBank = [...wordBank];
    let newDroppedWords = [...droppedWords];

    // If dropping into the same cell, do nothing
    if (sourceType === 'cell' && sourceRow === rowIndex && sourceCell === cellIndex) {
      setDraggedWord(null);
      return;
    }

    if (existingWord) {
      // Find the original word data to preserve expectedColumn
      const originalWords: WordBankItem[] = [];
      if (moment?.config?.rows && moment?.config?.columns) {
        moment.config.rows.forEach((row: any) => {
          if (row.cells && Array.isArray(row.cells)) {
            row.cells.forEach((cell: string, cellIndex: number) => {
              if (cell && cell.trim()) {
                const expectedColumn = moment.config.columns[cellIndex]?.trim().toLowerCase() || `kolumn-${cellIndex}`;
                originalWords.push({
                  word: cell.trim(),
                  id: `original-${originalWords.length}`,
                  expectedColumn: expectedColumn
                });
              }
            });
          }
        });
      }
      
      const originalWord = originalWords.find(orig => 
        orig.word.trim().toLowerCase() === existingWord.word.trim().toLowerCase()
      );
      
      // Return existing word to word bank with correct expected column
      newWordBank.push({ 
        word: existingWord.word, 
        id: `returned-${Date.now()}`,
        expectedColumn: originalWord?.expectedColumn || 'unknown'
      });
      
      // Remove existing word from dropped words
      newDroppedWords = newDroppedWords.filter(
        dropped => !(dropped.rowIndex === rowIndex && dropped.cellIndex === cellIndex)
      );
    }

    // If word came from a cell, remove it from its original position
    if (sourceType === 'cell' && !isNaN(sourceRow) && !isNaN(sourceCell)) {
      newDroppedWords = newDroppedWords.filter(
        dropped => !(dropped.rowIndex === sourceRow && dropped.cellIndex === sourceCell)
      );
    }

    // Add new word to cell
    newDroppedWords.push({ 
      word: word, 
      rowIndex, 
      cellIndex,
      id: wordId
    });

    // Remove dragged word from word bank only if it came from word bank
    if (sourceType !== 'cell') {
      newWordBank = newWordBank.filter(item => item.id !== wordId);
    }
    
    setWordBank(newWordBank);
    setDroppedWords(newDroppedWords);
    setDraggedWord(null);
  };

  const returnWordToBank = (droppedWord: DroppedWord) => {
    // Find the original word data to preserve expectedColumn
    const originalWords: WordBankItem[] = [];
    if (moment?.config?.rows && moment?.config?.columns) {
      moment.config.rows.forEach((row: any) => {
        if (row.cells && Array.isArray(row.cells)) {
          row.cells.forEach((cell: string, cellIndex: number) => {
            if (cell && cell.trim()) {
              const expectedColumn = moment.config.columns[cellIndex]?.trim().toLowerCase() || `kolumn-${cellIndex}`;
              originalWords.push({
                word: cell.trim(),
                id: `original-${originalWords.length}`,
                expectedColumn: expectedColumn
              });
            }
          });
        }
      });
    }
    
    const originalWord = originalWords.find(orig => 
      orig.word.trim().toLowerCase() === droppedWord.word.trim().toLowerCase()
    );
    
    // Return word to bank with correct expected column
    setWordBank(prev => [...prev, { 
      word: droppedWord.word, 
      id: `returned-${Date.now()}`,
      expectedColumn: originalWord?.expectedColumn || 'unknown'
    }]);
    
    // Remove from dropped words
    setDroppedWords(prev => prev.filter(
      dropped => !(dropped.rowIndex === droppedWord.rowIndex && dropped.cellIndex === droppedWord.cellIndex)
    ));
  };

  // Check completion when dropped words or word bank changes
  useEffect(() => {
    if (!isInitialized) return;
    
    const rows = moment?.config?.rows || [];
    const columns = moment?.config?.columns || [];
    
    if (rows.length === 0 || columns.length === 0) return;
    
    // Count total words to be sorted (not cells)
    let totalWordsToSort = 0;
    rows.forEach((row: any) => {
      if (row.cells && Array.isArray(row.cells)) {
        row.cells.forEach((cell: string) => {
          if (cell && cell.trim()) {
            totalWordsToSort++;
          }
        });
      }
    });
    
    // Auto-complete when all words from word bank are placed
    if (wordBank.length === 0 && droppedWords.length === totalWordsToSort && totalWordsToSort > 0) {
      setIsComplete(true);
      // Don't auto-set score here, let user check their answers
    } else {
      setIsComplete(false);
    }
  }, [droppedWords, wordBank, isInitialized, moment?.config?.rows, moment?.config?.columns]);

  const resetGame = () => {
    // Reinitialize from table cells
    if (moment?.config?.rows && moment?.config?.columns) {
      const bankItems: WordBankItem[] = [];
      
      moment.config.rows.forEach((row: any) => {
        if (row.cells && Array.isArray(row.cells)) {
          row.cells.forEach((cell: string, cellIndex: number) => {
            if (cell && cell.trim()) {
              const expectedColumn = moment.config.columns[cellIndex]?.trim().toLowerCase() || `kolumn-${cellIndex}`;
              bankItems.push({
                word: cell.trim(),
                id: `reset-word-${bankItems.length}-${Date.now()}`,
                expectedColumn: expectedColumn
              });
            }
          });
        }
      });

      setWordBank(bankItems);
    }
    
    setDroppedWords([]);
    setFeedback({ type: null, message: '' });
    setIsComplete(false);
    setScore(0);
  };

  const getWordInCell = (rowIndex: number, cellIndex: number) => {
    return droppedWords.find(
      dropped => dropped.rowIndex === rowIndex && dropped.cellIndex === cellIndex
    );
  };

  const checkAnswer = () => {
    // Get the original word-to-expected-column mapping from config
    const expectedMapping: {[word: string]: number} = {};
    
    if (moment?.config?.rows && moment?.config?.columns) {
      moment.config.rows.forEach((row: any) => {
        if (row.cells && Array.isArray(row.cells)) {
          row.cells.forEach((cell: string, cellIndex: number) => {
            if (cell && cell.trim()) {
              const normalizedWord = cell.trim().toLowerCase();
              expectedMapping[normalizedWord] = cellIndex;
            }
          });
        }
      });
    }



    let correct = 0;
    const total = droppedWords.length;
    const columnResults: {[key: string]: {correct: number, total: number}} = {};

    // Initialize column results
    (moment?.config?.columns || []).forEach((column: string) => {
      const normalizedColumn = column.trim().toLowerCase();
      columnResults[normalizedColumn] = { correct: 0, total: 0 };
    });

    // Check each dropped word
    droppedWords.forEach(droppedWord => {
      const normalizedWord = droppedWord.word.trim().toLowerCase();
      const actualColumnIndex = droppedWord.cellIndex;
      const expectedColumnIndex = expectedMapping[normalizedWord];
      const actualColumn = moment?.config?.columns[actualColumnIndex]?.trim().toLowerCase();
      

      
      // Count for column stats
      if (actualColumn && columnResults[actualColumn] !== undefined) {
        columnResults[actualColumn].total++;
      }
      
      // Check if word is in correct column
      if (expectedColumnIndex !== undefined && actualColumnIndex === expectedColumnIndex) {
        correct++;
        if (actualColumn && columnResults[actualColumn] !== undefined) {
          columnResults[actualColumn].correct++;
        }
      }
    });



    const percentage = total > 0 ? (correct / total) * 100 : 0;
    setScore(Math.round(percentage));
    
    // Build detailed feedback
    const columnFeedback = Object.entries(columnResults)
      .filter(([_, stats]) => stats.total > 0)
      .map(([column, stats]) => {
        const displayName = moment?.config?.columns?.find((col: string) => 
          col.trim().toLowerCase() === column
        ) || column;
        return `${displayName}: ${stats.correct}/${stats.total}`;
      })
      .join(', ');
    
    if (percentage === 100) {
      setFeedback({ type: 'success', message: `FANTASTISKT! Du fick alla ${correct} rätt! Du är en riktig ordmästare! (${columnFeedback})` });
      setIsComplete(true);
    } else if (percentage >= 80) {
      setFeedback({ type: 'success', message: `Superbt jobbat! Du fick ${correct} av ${total} rätt! Du är nästan där! (${columnFeedback})` });
    } else if (percentage >= 60) {
      setFeedback({ type: 'success', message: `Bra jobbat! Du fick ${correct} av ${total} rätt! Fortsätt så! (${columnFeedback})` });
    } else {
      setFeedback({ type: 'error', message: `Du fick ${correct} av ${total} rätt. Kämpa på, du kan det här! (${columnFeedback})` });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-purple-700 mb-2 animate-bounce">
          {moment?.config?.tableTitle || 'Magiska Tabellspelet'}
        </h2>
        
        {moment?.config?.instruction && (
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-purple-300 rounded-xl p-5 mb-6 max-w-2xl mx-auto shadow-lg">
            <p className="text-purple-800 font-medium text-lg">{moment.config.instruction}</p>
          </div>
        )}

        {score > 0 && (
          <div className="mb-4">
            <div className="text-3xl font-bold text-green-600 animate-pulse">
              Poäng: {score}%
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Word Bank */}
        <div 
          className="lg:col-span-1"
          onDragOver={handleDragOver}
          onDrop={(e) => {
            e.preventDefault();
            const word = e.dataTransfer.getData('text/plain');
            const wordId = e.dataTransfer.getData('word-id');
            const sourceType = e.dataTransfer.getData('source-type');
            const sourceRow = parseInt(e.dataTransfer.getData('source-row'));
            const sourceCell = parseInt(e.dataTransfer.getData('source-cell'));
            
            if (!word || !wordId) return;

            // Only proceed if dropping from a cell
            if (sourceType === 'cell' && !isNaN(sourceRow) && !isNaN(sourceCell)) {
              // Remove from original cell position
              setDroppedWords(prev => prev.filter(
                item => !(item.rowIndex === sourceRow && item.cellIndex === sourceCell)
              ));
              
              // Add back to word bank if not already there
              setWordBank(prev => {
                const exists = prev.some(item => item.id === wordId);
                if (!exists) {
                  return [...prev, { word, id: wordId, expectedColumn: 'unknown' }];
                }
                return prev;
              });
            }
          }}
        >
          <h3 className="font-bold mb-4 text-purple-700 text-xl">Ordbank</h3>
          <div className="space-y-3">
            {!isInitialized ? (
              <p className="text-purple-500 text-center italic py-8 text-lg">
                Laddar magiska ord...
              </p>
            ) : wordBank.length > 0 ? (
              wordBank.map((wordItem) => (
                <div
                  key={wordItem.id}
                  className="bg-gradient-to-r from-yellow-200 to-orange-200 border-3 border-orange-400 rounded-xl p-3 cursor-grab active:cursor-grabbing hover:from-yellow-300 hover:to-orange-300 hover:scale-105 transform transition-all duration-200 text-center font-bold shadow-lg hover:shadow-xl"
                  draggable
                  onDragStart={(e) => handleDragStart(e, wordItem)}
                >
                  {wordItem.word}
                </div>
              ))
            ) : (
              <div className="border-3 border-dashed border-purple-400 rounded-xl p-8 text-center bg-gradient-to-br from-purple-50 to-pink-50">
                <p className="text-purple-600 font-bold text-lg">Alla ord är placerade!</p>
                <p className="text-sm text-purple-500 mt-2">Dra ord hit för att flytta tillbaka</p>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="lg:col-span-3">
          <div className="bg-gradient-to-br from-white to-blue-50 border-3 border-blue-300 rounded-xl overflow-hidden shadow-2xl">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-200 to-blue-200">
                <tr>
                  {(moment?.config?.columns || ['Kolumn 1', 'Kolumn 2']).map((column: string, index: number) => (
                    <th 
                      key={index} 
                      className="border-b-3 border-purple-400 p-4 text-center font-bold text-purple-800 text-xl"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(moment?.config?.rows || []).map((row: any, rowIndex: number) => (
                  <tr key={row.id || rowIndex} className="border-b border-gray-200">
                    {row.cells.map((cell: string, cellIndex: number) => {
                      const droppedWord = getWordInCell(rowIndex, cellIndex);
                      
                      return (
                        <td
                          key={cellIndex}
                          className="border-r-2 border-purple-200 p-4 min-h-[80px] bg-gradient-to-br from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 transition-all duration-300 relative"
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, rowIndex, cellIndex)}
                        >
                          {droppedWord ? (
                            <div 
                              className="bg-gradient-to-r from-green-200 to-blue-200 border-3 border-green-400 rounded-xl p-3 text-center font-bold cursor-grab active:cursor-grabbing hover:from-green-300 hover:to-blue-300 hover:scale-105 transform transition-all duration-200 shadow-lg hover:shadow-xl"
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData("text/plain", droppedWord.word);
                                e.dataTransfer.setData("word-id", droppedWord.id);
                                e.dataTransfer.setData("source-type", "cell");
                                e.dataTransfer.setData("source-row", droppedWord.rowIndex.toString());
                                e.dataTransfer.setData("source-cell", droppedWord.cellIndex.toString());
                                
                                setDraggedWord({ 
                                  word: droppedWord.word, 
                                  id: droppedWord.id, 
                                  expectedColumn: 'unknown' 
                                });
                              }}
                              onClick={() => returnWordToBank(droppedWord)}
                              title="Dra för att flytta eller klicka för att flytta tillbaka till ordbanken"
                            >
                              {droppedWord.word}
                            </div>
                          ) : (
                            <div className="border-3 border-dashed border-purple-300 rounded-xl p-3 min-h-[50px] flex items-center justify-center text-purple-400 text-sm font-medium bg-gradient-to-br from-purple-25 to-pink-25 hover:from-purple-50 hover:to-pink-50 transition-all duration-200">
                              Dra ett ord hit
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Feedback and Controls */}
      <div className="mt-8 text-center">
        {feedback.message && (
          <div className={`inline-block px-8 py-4 rounded-xl mb-6 text-xl font-bold shadow-lg animate-pulse ${
            feedback.type === 'success' 
              ? 'bg-gradient-to-r from-green-200 to-emerald-200 border-3 border-green-400 text-green-900' 
              : 'bg-gradient-to-r from-orange-200 to-red-200 border-3 border-orange-400 text-orange-900'
          }`}>
            {feedback.message}
          </div>
        )}

        <div className="space-x-4">
          <Button onClick={checkAnswer} variant="default" size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
            Kontrollera svar
          </Button>
          
          <Button onClick={resetGame} variant="outline" size="lg" className="border-3 border-purple-400 text-purple-700 hover:bg-purple-100 font-bold px-6 py-3 rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200">
            Börja om
          </Button>

          {score === 100 && onNext && (
            <Button onClick={onNext} variant="default" size="lg" className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 animate-bounce">
              Fortsätt till nästa moment!
            </Button>
          )}
        </div>

        <div className="mt-8 p-6 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl border-3 border-yellow-400 shadow-lg">
          <p className="text-lg font-bold text-orange-800 mb-3">Så här spelar du:</p>
          <div className="text-orange-700 font-medium space-y-2">
            <p>• Dra ord från ordbanken till rätt plats i tabellen</p>
            <p>• Dra placerade ord mellan celler eller tillbaka till ordbanken</p>
            <p>• Alternativt: klicka på placerade ord för att flytta dem tillbaka</p>
            <p>• Tryck "Kontrollera svar" för att se ditt fantastiska resultat!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TabellenGame;