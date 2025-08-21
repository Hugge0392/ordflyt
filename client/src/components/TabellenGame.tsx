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
}

export function TabellenGame({ moment, onNext }: TabellenGameProps) {
  const [wordBank, setWordBank] = useState<string[]>([]);
  const [droppedWords, setDroppedWords] = useState<DroppedWord[]>([]);
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState(0);

  // Initialize word bank from config
  useEffect(() => {
    if (moment?.config?.wordBank) {
      setWordBank([...moment.config.wordBank]);
    }
  }, [moment]);

  const handleDragStart = (word: string) => {
    setDraggedWord(word);
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

    if (existingWord) {
      // Return existing word to word bank
      setWordBank(prev => [...prev, existingWord.word]);
      // Remove existing word from dropped words
      setDroppedWords(prev => prev.filter(
        dropped => !(dropped.rowIndex === rowIndex && dropped.cellIndex === cellIndex)
      ));
    }

    // Add new word to cell
    setDroppedWords(prev => [
      ...prev,
      { word: draggedWord, rowIndex, cellIndex }
    ]);

    // Remove word from word bank
    setWordBank(prev => prev.filter(word => word !== draggedWord));
    
    setDraggedWord(null);
    checkCompletion();
  };

  const returnWordToBank = (droppedWord: DroppedWord) => {
    // Return word to bank
    setWordBank(prev => [...prev, droppedWord.word]);
    
    // Remove from dropped words
    setDroppedWords(prev => prev.filter(
      dropped => !(dropped.rowIndex === droppedWord.rowIndex && dropped.cellIndex === droppedWord.cellIndex)
    ));
  };

  const checkCompletion = () => {
    const totalCells = (moment?.config?.rows || []).length * (moment?.config?.columns || []).length;
    const filledCells = droppedWords.length;
    
    if (wordBank.length === 0 && filledCells === totalCells) {
      setIsComplete(true);
      setFeedback({ type: 'success', message: 'Bra jobbat! Du har fyllt alla celler korrekt!' });
      setScore(100);
    }
  };

  const resetGame = () => {
    setWordBank([...(moment?.config?.wordBank || [])]);
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
    let correct = 0;
    let total = 0;

    // Compare with correct answers if defined
    if (moment?.config?.rows) {
      moment.config.rows.forEach((row: any, rowIndex: number) => {
        row.cells.forEach((correctWord: string, cellIndex: number) => {
          if (correctWord) {
            total++;
            const droppedWord = getWordInCell(rowIndex, cellIndex);
            if (droppedWord && droppedWord.word === correctWord) {
              correct++;
            }
          }
        });
      });
    }

    const percentage = total > 0 ? (correct / total) * 100 : 100;
    setScore(Math.round(percentage));
    
    if (percentage === 100) {
      setFeedback({ type: 'success', message: `Perfekt! Du fick alla ${correct} rätt!` });
    } else if (percentage >= 70) {
      setFeedback({ type: 'success', message: `Bra jobbat! Du fick ${correct} av ${total} rätt.` });
    } else {
      setFeedback({ type: 'error', message: `Du fick ${correct} av ${total} rätt. Försök igen!` });
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
            {wordBank.map((word, index) => (
              <div
                key={`${word}-${index}`}
                className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-yellow-200 transition-colors text-center font-medium shadow-sm"
                draggable
                onDragStart={() => handleDragStart(word)}
              >
                {word}
              </div>
            ))}
            
            {wordBank.length === 0 && (
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
                              className="bg-green-100 border-2 border-green-300 rounded-lg p-3 text-center font-medium cursor-pointer hover:bg-green-200 transition-colors"
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

          {(isComplete || score > 0) && onNext && (
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