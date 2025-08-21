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
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, rowIndex: number, cellIndex: number) => {
    e.preventDefault();
    
    if (!draggedWord) return;

    // Check if cell already has a word
    const existingWord = droppedWords.find(
      dropped => dropped.rowIndex === rowIndex && dropped.cellIndex === cellIndex
    );

    let newWordBank = [...wordBank];
    let newDroppedWords = [...droppedWords];

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

    // Add new word to cell
    newDroppedWords.push({ 
      word: draggedWord.word, 
      rowIndex, 
      cellIndex,
      id: draggedWord.id
    });

    // Remove dragged word from word bank
    newWordBank = newWordBank.filter(item => item.id !== draggedWord.id);
    
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

    console.log('Expected mapping:', expectedMapping);
    console.log('Dropped words:', droppedWords);
    console.log('Columns:', moment?.config?.columns);

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
      
      console.log(`Word: "${normalizedWord}", Expected column: ${expectedColumnIndex}, Actual column: ${actualColumnIndex}, Match: ${expectedColumnIndex === actualColumnIndex}`);
      
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

    console.log(`Correct: ${correct}, Total: ${total}`);

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
      setFeedback({ type: 'success', message: `Perfekt! Du fick alla ${correct} rätt! (${columnFeedback})` });
      setIsComplete(true);
    } else if (percentage >= 70) {
      setFeedback({ type: 'success', message: `Bra jobbat! Du fick ${correct} av ${total} rätt. (${columnFeedback})` });
    } else {
      setFeedback({ type: 'error', message: `Du fick ${correct} av ${total} rätt. (${columnFeedback}) Försök igen!` });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          📋 {moment?.config?.tableTitle || 'Tabellspel'}
        </h2>
        
        {moment?.config?.instruction && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
            <p className="text-blue-800">{moment.config.instruction}</p>
          </div>
        )}

        {score > 0 && (
          <div className="mb-4">
            <div className="text-2xl font-bold text-green-600">Poäng: {score}%</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Word Bank */}
        <div className="lg:col-span-1">
          <h3 className="font-semibold mb-4 text-gray-700 text-lg">Ordbank</h3>
          <div className="space-y-3">
            {!isInitialized ? (
              <p className="text-gray-500 text-center italic py-8">
                Laddar ord...
              </p>
            ) : wordBank.length > 0 ? (
              wordBank.map((wordItem) => (
                <div
                  key={wordItem.id}
                  className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-yellow-200 transition-colors text-center font-medium shadow-sm"
                  draggable
                  onDragStart={(e) => handleDragStart(e, wordItem)}
                >
                  {wordItem.word}
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center italic py-8">
                Alla ord är placerade!
              </p>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="lg:col-span-3">
          <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {(moment?.config?.columns || ['Kolumn 1', 'Kolumn 2']).map((column: string, index: number) => (
                    <th 
                      key={index} 
                      className="border-b-2 border-gray-300 p-4 text-left font-semibold text-gray-700 text-lg"
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
                          className="border-r border-gray-200 p-4 min-h-[80px] bg-gray-50 hover:bg-gray-100 transition-colors relative"
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, rowIndex, cellIndex)}
                        >
                          {droppedWord ? (
                            <div 
                              className="bg-blue-100 border-2 border-blue-300 rounded-lg p-3 text-center font-medium cursor-pointer hover:bg-blue-200 transition-colors"
                              onClick={() => returnWordToBank(droppedWord)}
                              title="Klicka för att flytta tillbaka till ordbanken"
                            >
                              {droppedWord.word}
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 min-h-[50px] flex items-center justify-center text-gray-400 text-sm italic">
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
          <div className={`inline-block px-6 py-3 rounded-lg mb-6 text-lg font-medium ${
            feedback.type === 'success' 
              ? 'bg-green-100 border border-green-300 text-green-800' 
              : 'bg-red-100 border border-red-300 text-red-800'
          }`}>
            {feedback.message}
          </div>
        )}

        <div className="space-x-4">
          <Button onClick={checkAnswer} variant="default" size="lg" className="bg-blue-600 hover:bg-blue-700">
            Kontrollera svar
          </Button>
          
          <Button onClick={resetGame} variant="outline" size="lg">
            Börja om
          </Button>

          {score === 100 && onNext && (
            <Button onClick={onNext} variant="default" size="lg" className="bg-green-600 hover:bg-green-700">
              Fortsätt till nästa moment
            </Button>
          )}
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <p><strong>Instruktioner:</strong></p>
          <p>• Dra ord från ordbanken till rätt plats i tabellen</p>
          <p>• Klicka på placerade ord för att flytta dem tillbaka till ordbanken</p>
          <p>• Tryck "Kontrollera svar" för att se ditt resultat</p>
        </div>
      </div>
    </div>
  );
}

export default TabellenGame;