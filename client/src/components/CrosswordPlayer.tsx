import React, { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, X, ArrowRight } from "lucide-react";
import { CrosswordCell } from "./CrosswordBuilder";

/*****
 * CrosswordPlayer – Interaktivt korsord för elever
 *
 * Funktioner:
 * - Visuellt grid med klickbara rutor
 * - Numrering på startrutor
 * - Markering av aktivt ord
 * - Tangentbordsnavigation
 * - Ledtrådar-panel
 * - Validering i slutet (ingen direkt feedback)
 * - Måste ha alla rätt för att fortsätta
 *****/

export interface CrosswordPlayerClue {
  id: string;
  number: number;
  question: string;
  answer: string;
  direction: "across" | "down";
  startX: number;
  startY: number;
}

interface CrosswordPlayerProps {
  clues: CrosswordPlayerClue[];
  grid: CrosswordCell[];
  onComplete: () => void;
}

interface UserCell {
  x: number;
  y: number;
  letter: string;
  number?: number;
  isBlocked?: boolean;
}

function k(x: number, y: number) {
  return `${x}-${y}`;
}

function normalizeAnswer(s: string) {
  return s
    .toUpperCase()
    .replaceAll("Å", "A")
    .replaceAll("Ä", "A")
    .replaceAll("Ö", "O")
    .replace(/[^A-Z]/g, "");
}

export function CrosswordPlayer({ clues, grid, onComplete }: CrosswordPlayerProps) {
  // Beräkna grid-dimensioner
  const gridBounds = useMemo(() => {
    if (grid.length === 0) return { minX: 0, maxX: 14, minY: 0, maxY: 14 };
    
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    for (const cell of grid) {
      if (cell.isBlocked) continue;
      minX = Math.min(minX, cell.x);
      maxX = Math.max(maxX, cell.x);
      minY = Math.min(minY, cell.y);
      maxY = Math.max(maxY, cell.y);
    }

    return { minX, maxX, minY, maxY };
  }, [grid]);

  const gridWidth = gridBounds.maxX - gridBounds.minX + 1;
  const gridHeight = gridBounds.maxY - gridBounds.minY + 1;

  // Skapa en map av grid-celler
  const gridMap = useMemo(() => {
    const map = new Map<string, CrosswordCell>();
    for (const cell of grid) {
      map.set(k(cell.x, cell.y), cell);
    }
    return map;
  }, [grid]);

  // User input state
  const [userAnswers, setUserAnswers] = useState<Map<string, string>>(new Map());
  const [selectedClue, setSelectedClue] = useState<string | null>(null);
  const [activeWord, setActiveWord] = useState<{
    positions: string[];
    direction: "across" | "down";
  } | null>(null);
  const [checked, setChecked] = useState(false);
  const [allCorrect, setAllCorrect] = useState(false);

  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  // Hitta vilket ord en cell tillhör
  const findWordAtPosition = (x: number, y: number, direction: "across" | "down") => {
    for (const clue of clues) {
      if (clue.direction !== direction) continue;
      
      const wordLength = normalizeAnswer(clue.answer).length;
      const dx = clue.direction === "across" ? 1 : 0;
      const dy = clue.direction === "down" ? 1 : 0;

      for (let i = 0; i < wordLength; i++) {
        const cx = clue.startX + i * dx;
        const cy = clue.startY + i * dy;
        if (cx === x && cy === y) {
          // Vi har hittat ordet!
          const positions: string[] = [];
          for (let j = 0; j < wordLength; j++) {
            positions.push(k(clue.startX + j * dx, clue.startY + j * dy));
          }
          return { clue, positions };
        }
      }
    }
    return null;
  };

  // Hantera klick på cell
  const handleCellClick = (x: number, y: number) => {
    const cell = gridMap.get(k(x, y));
    if (!cell || cell.isBlocked) return;

    // Om vi redan har ett aktivt ord och klickar inom det, byt inte
    if (activeWord && activeWord.positions.includes(k(x, y))) {
      // Fokusera bara på cellen
      inputsRef.current[k(x, y)]?.focus();
      return;
    }

    // Försök hitta ett ord (prioritera across)
    let word = findWordAtPosition(x, y, "across");
    if (!word) {
      word = findWordAtPosition(x, y, "down");
    }

    if (word) {
      setActiveWord({
        positions: word.positions,
        direction: word.clue.direction,
      });
      setSelectedClue(word.clue.id);
      inputsRef.current[k(x, y)]?.focus();
    }
  };

  // Hantera input-ändring
  const handleInputChange = (x: number, y: number, value: string) => {
    const normalized = normalizeAnswer(value).slice(0, 1);
    const key = k(x, y);
    
    setUserAnswers((prev) => {
      const next = new Map(prev);
      if (normalized) {
        next.set(key, normalized);
      } else {
        next.delete(key);
      }
      return next;
    });

    // Flytta till nästa cell i ordet
    if (normalized && activeWord) {
      const idx = activeWord.positions.indexOf(key);
      if (idx >= 0 && idx < activeWord.positions.length - 1) {
        const nextKey = activeWord.positions[idx + 1];
        inputsRef.current[nextKey]?.focus();
      }
    }
  };

  // Hantera tangentbordsnavigation
  const handleKeyDown = (x: number, y: number, e: React.KeyboardEvent) => {
    const key = k(x, y);

    if (e.key === "Backspace") {
      if (!userAnswers.get(key)) {
        // Om cellen är tom, gå bakåt i ordet
        if (activeWord) {
          const idx = activeWord.positions.indexOf(key);
          if (idx > 0) {
            const prevKey = activeWord.positions[idx - 1];
            inputsRef.current[prevKey]?.focus();
          }
        }
      } else {
        // Radera nuvarande cell
        setUserAnswers((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      }
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      const nextKey = k(x + 1, y);
      if (gridMap.has(nextKey) && !gridMap.get(nextKey)?.isBlocked) {
        inputsRef.current[nextKey]?.focus();
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      const prevKey = k(x - 1, y);
      if (gridMap.has(prevKey) && !gridMap.get(prevKey)?.isBlocked) {
        inputsRef.current[prevKey]?.focus();
      }
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      const nextKey = k(x, y + 1);
      if (gridMap.has(nextKey) && !gridMap.get(nextKey)?.isBlocked) {
        inputsRef.current[nextKey]?.focus();
      }
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      const prevKey = k(x, y - 1);
      if (gridMap.has(prevKey) && !gridMap.get(prevKey)?.isBlocked) {
        inputsRef.current[prevKey]?.focus();
      }
      e.preventDefault();
    }
  };

  // Hantera klick på ledtråd
  const handleClueClick = (clue: CrosswordPlayerClue) => {
    setSelectedClue(clue.id);
    
    // Skapa positioner för ordet
    const positions: string[] = [];
    const wordLength = normalizeAnswer(clue.answer).length;
    const dx = clue.direction === "across" ? 1 : 0;
    const dy = clue.direction === "down" ? 1 : 0;

    for (let i = 0; i < wordLength; i++) {
      positions.push(k(clue.startX + i * dx, clue.startY + i * dy));
    }

    setActiveWord({
      positions,
      direction: clue.direction,
    });

    // Fokusera på första cellen
    inputsRef.current[positions[0]]?.focus();
  };

  // Validera svar
  const handleCheck = () => {
    setChecked(true);
    
    // Kontrollera alla ord
    let correct = true;
    for (const clue of clues) {
      const wordLength = normalizeAnswer(clue.answer).length;
      const correctAnswer = normalizeAnswer(clue.answer);
      const dx = clue.direction === "across" ? 1 : 0;
      const dy = clue.direction === "down" ? 1 : 0;

      for (let i = 0; i < wordLength; i++) {
        const key = k(clue.startX + i * dx, clue.startY + i * dy);
        const userLetter = userAnswers.get(key) || "";
        if (userLetter !== correctAnswer[i]) {
          correct = false;
          break;
        }
      }
      
      if (!correct) break;
    }

    setAllCorrect(correct);
  };

  // Räkna ifyllda celler
  const filledCount = useMemo(() => {
    let count = 0;
    for (const cell of grid) {
      if (cell.isBlocked) continue;
      if (userAnswers.get(k(cell.x, cell.y))) {
        count++;
      }
    }
    return count;
  }, [userAnswers, grid]);

  const totalCells = useMemo(() => {
    return grid.filter((c) => !c.isBlocked).length;
  }, [grid]);

  const allFilled = filledCount === totalCells;

  // Kontrollera om ett ord är rätt (efter check)
  const isWordCorrect = (clue: CrosswordPlayerClue) => {
    if (!checked) return null;
    
    const wordLength = normalizeAnswer(clue.answer).length;
    const correctAnswer = normalizeAnswer(clue.answer);
    const dx = clue.direction === "across" ? 1 : 0;
    const dy = clue.direction === "down" ? 1 : 0;

    for (let i = 0; i < wordLength; i++) {
      const key = k(clue.startX + i * dx, clue.startY + i * dy);
      const userLetter = userAnswers.get(key) || "";
      if (userLetter !== correctAnswer[i]) {
        return false;
      }
    }
    return true;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">🔤 Korsord</h2>
        <p className="text-gray-600">
          Klicka på en ruta och fyll i bokstäverna. Använd piltangenterna för att navigera.
        </p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Framsteg</p>
              <p className="text-2xl font-bold text-gray-800">
                {filledCount} / {totalCells} bokstäver
              </p>
            </div>
            <div>
              <Button
                onClick={handleCheck}
                disabled={!allFilled || checked}
                size="lg"
              >
                {checked ? "Kontrollerat ✓" : "Kontrollera svar"}
              </Button>
            </div>
          </div>
          {checked && (
            <div className="mt-4">
              {allCorrect ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <Check className="h-5 w-5" />
                    <p className="font-semibold">🎉 Perfekt! Alla ord är rätt!</p>
                  </div>
                  <Button onClick={onComplete} className="mt-4 w-full" size="lg">
                    Fortsätt <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <X className="h-5 w-5" />
                    <p className="font-semibold">Några ord är inte rätt än</p>
                  </div>
                  <p className="text-sm text-red-700 mt-2">
                    Kontrollera de röda orden och försök igen.
                  </p>
                  <Button
                    onClick={() => setChecked(false)}
                    variant="outline"
                    className="mt-3"
                  >
                    Fortsätt redigera
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Korsord</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto pb-4">
                <div
                  className="grid gap-0 mx-auto"
                  style={{
                    gridTemplateColumns: `repeat(${gridWidth}, minmax(2.5rem, 3rem))`,
                    gridTemplateRows: `repeat(${gridHeight}, minmax(2.5rem, 3rem))`,
                  }}
                >
                  {Array.from({ length: gridWidth * gridHeight }).map((_, index) => {
                    const localX = index % gridWidth;
                    const localY = Math.floor(index / gridWidth);
                    const x = gridBounds.minX + localX;
                    const y = gridBounds.minY + localY;
                    const key = k(x, y);
                    const cell = gridMap.get(key);
                    const isActive = activeWord?.positions?.includes(key);
                    const userLetter = userAnswers.get(key) || "";

                    if (!cell) {
                      return (
                        <div
                          key={key}
                          className="border-0 bg-transparent"
                        />
                      );
                    }

                    if (cell.isBlocked) {
                      return (
                        <div
                          key={key}
                          className="bg-black border border-gray-600"
                        />
                      );
                    }

                    // Kontrollera om cellen är rätt/fel (efter check)
                    let cellStatus: "correct" | "incorrect" | null = null;
                    if (checked) {
                      for (const clue of clues) {
                        const wordLength = normalizeAnswer(clue.answer).length;
                        const correctAnswer = normalizeAnswer(clue.answer);
                        const dx = clue.direction === "across" ? 1 : 0;
                        const dy = clue.direction === "down" ? 1 : 0;

                        for (let i = 0; i < wordLength; i++) {
                          const cellKey = k(
                            clue.startX + i * dx,
                            clue.startY + i * dy
                          );
                          if (cellKey === key) {
                            const correctLetter = correctAnswer[i];
                            if (userLetter === correctLetter) {
                              cellStatus = "correct";
                            } else if (userLetter) {
                              cellStatus = "incorrect";
                            }
                            break;
                          }
                        }
                      }
                    }

                    return (
                      <div
                        key={key}
                        className={cn(
                          "relative border border-gray-400 bg-white cursor-pointer transition-all",
                          isActive && "ring-2 ring-blue-400 bg-blue-50",
                          !isActive && "hover:bg-gray-50",
                          checked && cellStatus === "correct" && "bg-green-50 border-green-300",
                          checked && cellStatus === "incorrect" && "bg-red-50 border-red-300"
                        )}
                        onClick={() => handleCellClick(x, y)}
                      >
                        {/* Number */}
                        {cell.number && (
                          <div className="absolute top-0.5 left-0.5 text-[9px] font-bold text-gray-600 pointer-events-none leading-none">
                            {cell.number}
                          </div>
                        )}
                        
                        {/* Input */}
                        <input
                          ref={(el) => (inputsRef.current[key] = el)}
                          type="text"
                          value={userLetter}
                          onChange={(e) => handleInputChange(x, y, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(x, y, e)}
                          maxLength={1}
                          className={cn(
                            "absolute inset-0 w-full h-full text-center uppercase font-bold text-lg bg-transparent border-0 focus:outline-none focus:ring-0",
                            checked && cellStatus === "correct" && "text-green-800",
                            checked && cellStatus === "incorrect" && "text-red-800"
                          )}
                          disabled={checked && allCorrect}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Clues */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Ledtrådar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
              {/* Across */}
              <div>
                <h4 className="font-semibold text-sm mb-2 text-gray-700">Vågrätt →</h4>
                <div className="space-y-2">
                  {clues
                    .filter((c) => c.direction === "across")
                    .sort((a, b) => a.number - b.number)
                    .map((clue) => {
                      const isSelected = selectedClue === clue.id;
                      const status = isWordCorrect(clue);
                      
                      return (
                        <div
                          key={clue.id}
                          onClick={() => handleClueClick(clue)}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-all",
                            isSelected && "bg-blue-50 border-blue-300",
                            !isSelected && "hover:bg-gray-50 border-gray-200",
                            checked && status === true && "bg-green-50 border-green-300",
                            checked && status === false && "bg-red-50 border-red-300"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-sm text-gray-700 flex-shrink-0">
                              {clue.number}.
                            </span>
                            <div className="flex-1">
                              <p className="text-sm">{clue.question}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {normalizeAnswer(clue.answer).length} bokstäver
                              </p>
                            </div>
                            {checked && status === true && (
                              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                            )}
                            {checked && status === false && (
                              <X className="h-4 w-4 text-red-600 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Down */}
              <div>
                <h4 className="font-semibold text-sm mb-2 text-gray-700">Lodrätt ↓</h4>
                <div className="space-y-2">
                  {clues
                    .filter((c) => c.direction === "down")
                    .sort((a, b) => a.number - b.number)
                    .map((clue) => {
                      const isSelected = selectedClue === clue.id;
                      const status = isWordCorrect(clue);
                      
                      return (
                        <div
                          key={clue.id}
                          onClick={() => handleClueClick(clue)}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-all",
                            isSelected && "bg-blue-50 border-blue-300",
                            !isSelected && "hover:bg-gray-50 border-gray-200",
                            checked && status === true && "bg-green-50 border-green-300",
                            checked && status === false && "bg-red-50 border-red-300"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-sm text-gray-700 flex-shrink-0">
                              {clue.number}.
                            </span>
                            <div className="flex-1">
                              <p className="text-sm">{clue.question}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {normalizeAnswer(clue.answer).length} bokstäver
                              </p>
                            </div>
                            {checked && status === true && (
                              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                            )}
                            {checked && status === false && (
                              <X className="h-4 w-4 text-red-600 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}



