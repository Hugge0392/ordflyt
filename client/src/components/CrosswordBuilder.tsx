import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ArrowLeftRight,
  ArrowUpDown,
  Eraser,
  Grid3X3,
  Loader2,
  Save,
  Plus,
  Trash2,
  Edit2,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/*****
 * CrosswordBuilder – förbättrad version
 *
 * Nyckelfunktioner:
 * - Stabil intern datastruktur (Map) för O(1) cellåtkomst
 * - Enkel ordhantering: lägg till ord + ledtråd direkt
 * - Placering med riktning (across/down) och tangentbordsnavigation i ordet
 * - Kollisionskontroll: tillåter korsningar bara om bokstav matchar
 * - Automatisk numrering av startceller (1, 2, 3 ...)
 * - Markering av valt ord, förhandsvisning vid drag-över/drop
 * - Högersnitts‑toggle: blockera/avblockera (svarta rutor) med Alt+Klick
 * - Förbättrad auto‑placering med backtracking
 * - Export/Import av grid som JSON och återställning
 * - onGridUpdate får en plan lista av celler (kompatibel med din signatur)
 *****/

export type Direction = "across" | "down";

export interface CrosswordCell {
  x: number;
  y: number;
  letter: string;
  number?: number;
  isStart?: boolean;
  direction?: Direction; // startcellens riktning
  clueIndex?: number; // index till ledtråd i props
  isBlocked?: boolean; // svart ruta
}

export interface CrosswordClue {
  id: string;
  question: string;
  answer: string;
}

export interface CrosswordBuilderProps {
  clues?: CrosswordClue[]; // optional now, can be managed internally
  onCluesUpdate?: (clues: CrosswordClue[]) => void;
  onGridUpdate?: (grid: CrosswordCell[]) => void;
  initialGrid?: CrosswordCell[];
  gridSize?: number; // default 15
}

// Intern representation
interface CellKeyed extends CrosswordCell {
  key: string; // "x-y"
}

function k(x: number, y: number) {
  return `${x}-${y}`;
}

function inBounds(x: number, y: number, n: number) {
  return x >= 0 && y >= 0 && x < n && y < n;
}

function* iterWord(
  x: number,
  y: number,
  len: number,
  dir: Direction,
): Generator<[number, number, number]> {
  for (let i = 0; i < len; i++) {
    const cx = dir === "across" ? x + i : x;
    const cy = dir === "down" ? y + i : y;
    yield [cx, cy, i];
  }
}

function computeNumbers(
  gridMap: Map<string, CellKeyed>,
  size: number,
): Map<string, number> {
  // Nummer sätts på celler som är start för across eller down
  const numbers = new Map<string, number>();
  let counter = 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const key = k(x, y);
      const cell = gridMap.get(key);
      if (!cell || cell.isBlocked) continue;
      const leftBlocked =
        x === 0 ||
        gridMap.get(k(x - 1, y))?.isBlocked ||
        !gridMap.has(k(x - 1, y));
      const upBlocked =
        y === 0 ||
        gridMap.get(k(x, y - 1))?.isBlocked ||
        !gridMap.has(k(x, y - 1));
      const beginsAcross = leftBlocked && x + 1 < size;
      const beginsDown = upBlocked && y + 1 < size;
      if (beginsAcross || beginsDown) {
        numbers.set(key, counter++);
      }
    }
  }
  return numbers;
}

function normalizeAnswer(s: string) {
  return s
    .toUpperCase()
    .replaceAll("Å", "A")
    .replaceAll("Ä", "A")
    .replaceAll("Ö", "O")
    .replace(/[^A-Z]/g, "");
}

export function CrosswordBuilder({
  clues: propClues = [],
  onCluesUpdate,
  onGridUpdate,
  initialGrid = [],
  gridSize = 15,
}: CrosswordBuilderProps) {
  // State för ord/ledtrådar
  const [clues, setClues] = useState<CrosswordClue[]>(propClues);
  const [editingClue, setEditingClue] = useState<string | null>(null);
  const [newClue, setNewClue] = useState({ question: "", answer: "" });

  // Map för celler som faktiskt har innehåll eller är blockerade
  const [gridMap, setGridMap] = useState<Map<string, CellKeyed>>(() => {
    const m = new Map<string, CellKeyed>();
    for (const c of initialGrid) {
      const key = k(c.x, c.y);
      m.set(key, { ...c, key });
    }
    return m;
  });

  const [selectedClue, setSelectedClue] = useState<number | null>(null);
  const [direction, setDirection] = useState<Direction>("across");
  const [hoverPreview, setHoverPreview] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [activeWord, setActiveWord] = useState<{ positions: string[] } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [autoPlaceProgress, setAutoPlaceProgress] = useState<string>("");
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  // Synka clues uppåt
  useEffect(() => {
    onCluesUpdate?.(clues);
  }, [clues, onCluesUpdate]);

  // Clue management functions
  const addClue = () => {
    if (!newClue.question.trim() || !newClue.answer.trim()) return;
    
    const clue: CrosswordClue = {
      id: `clue-${Date.now()}`,
      question: newClue.question.trim(),
      answer: newClue.answer.trim(),
    };
    
    setClues([...clues, clue]);
    setNewClue({ question: "", answer: "" });
  };

  const updateClue = (id: string, updates: Partial<CrosswordClue>) => {
    setClues(clues.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteClue = (id: string) => {
    setClues(clues.filter(c => c.id !== id));
    // Also remove from grid
    setGridMap((prev) => {
      const next = new Map(prev);
      const clueIndex = clues.findIndex(c => c.id === id);
      for (const [key, cell] of next.entries()) {
        if (cell.clueIndex === clueIndex) {
          next.delete(key);
        }
      }
      return next;
    });
  };

  // Hjälpfunktion: lägg till / uppdatera cell
  const upsertCell = useCallback(
    (x: number, y: number, partial: Partial<CellKeyed>) => {
      setGridMap((prev) => {
        const key = k(x, y);
        const existing = prev.get(key);
        const next = new Map(prev);
        next.set(key, {
          x,
          y,
          letter: "",
          ...existing,
          ...partial,
          key,
        });
        return next;
      });
    },
    [],
  );

  // Ta bort cell (rensa)
  const deleteCell = useCallback((x: number, y: number) => {
    setGridMap((prev) => {
      const next = new Map(prev);
      next.delete(k(x, y));
      return next;
    });
  }, []);

  // Konvertera till platt lista + numrering
  const flatGrid = useMemo(() => {
    const numbers = computeNumbers(gridMap, gridSize);
    const arr: CrosswordCell[] = [];
    for (const c of Array.from(gridMap.values())) {
      const number = numbers.get(k(c.x, c.y));
      arr.push({ ...c, number, isStart: number !== undefined });
    }
    return arr;
  }, [gridMap, gridSize]);

  // Synka uppåt
  useEffect(() => {
    onGridUpdate?.(flatGrid);
  }, [flatGrid, onGridUpdate]);

  const placeClue = useCallback(
    (clueIndex: number, startX: number, startY: number, dir: Direction) => {
      const answer = normalizeAnswer(clues[clueIndex].answer);
      if (!answer) return { ok: false, reason: "Tomt svar" } as const;

      // Bounds check i förväg
      const endX = dir === "across" ? startX + answer.length - 1 : startX;
      const endY = dir === "down" ? startY + answer.length - 1 : startY;
      if (
        !inBounds(startX, startY, gridSize) ||
        !inBounds(endX, endY, gridSize)
      ) {
        return { ok: false, reason: "Utanför grid" } as const;
      }

      // Kolla konflikter och räkna korsningar
      let crossings = 0;
      for (const [cx, cy, i] of Array.from(iterWord(startX, startY, answer.length, dir))) {
        const key = k(cx, cy);
        const existing = gridMap.get(key);
        if (existing?.isBlocked)
          return { ok: false, reason: "Blockerad ruta" } as const;
        const ch = answer[i];
        if (existing && existing.letter && existing.letter !== ch) {
          return { ok: false, reason: "Krock: annan bokstav" } as const;
        }
        if (existing && existing.letter === ch) crossings++;
      }

      // Skriv in
      setGridMap((prev) => {
        const next = new Map(prev);
        for (const [cx, cy, i] of Array.from(iterWord(
          startX,
          startY,
          answer.length,
          dir,
        ))) {
          const key = k(cx, cy);
          const prevCell = next.get(key);
          next.set(key, {
            x: cx,
            y: cy,
            key,
            letter: answer[i],
            clueIndex,
            direction: dir,
          });
        }
        return next;
      });

      // Markera aktivt ord
      setActiveWord({
        positions: Array.from(iterWord(startX, startY, answer.length, dir)).map(
          ([cx, cy]) => k(cx, cy),
        ),
      });
      setSelectedClue(null);
      return { ok: true, crossings } as const;
    },
    [clues, gridMap, gridSize],
  );

  const handleCellClick = (x: number, y: number, e?: React.MouseEvent) => {
    if (e?.altKey) {
      // Toggle block
      const key = k(x, y);
      const existing = gridMap.get(key);
      if (existing?.isBlocked) {
        // Avblockera
        deleteCell(x, y);
      } else {
        upsertCell(x, y, { isBlocked: true, letter: "" });
      }
      return;
    }

    if (selectedClue !== null) {
      const res = placeClue(selectedClue, x, y, direction);
      if ((res as any)?.ok) focusFirstOfActiveWord();
    } else {
      // Klick i grid utan vald ledtråd: sätt aktivt ord kring cellen beroende på riktning
      const positions: string[] = [];
      let startX = x,
        startY = y;
      // gå bakåt tills start
      if (direction === "across") {
        while (
          startX - 1 >= 0 &&
          gridMap.get(k(startX - 1, y))?.letter &&
          !gridMap.get(k(startX - 1, y))?.isBlocked
        ) {
          startX--;
        }
        // samla framåt
        let cx = startX;
        while (
          cx < gridSize &&
          gridMap.get(k(cx, y))?.letter &&
          !gridMap.get(k(cx, y))?.isBlocked
        ) {
          positions.push(k(cx, y));
          cx++;
        }
      } else {
        while (
          startY - 1 >= 0 &&
          gridMap.get(k(x, startY - 1))?.letter &&
          !gridMap.get(k(x, startY - 1))?.isBlocked
        ) {
          startY--;
        }
        let cy = startY;
        while (
          cy < gridSize &&
          gridMap.get(k(x, cy))?.letter &&
          !gridMap.get(k(x, cy))?.isBlocked
        ) {
          positions.push(k(x, cy));
          cy++;
        }
      }
      if (positions.length) setActiveWord({ positions });
      // Fokusera klickad cell om den finns i inputsRef
      const ref = inputsRef.current[k(x, y)];
      ref?.focus();
    }
  };

  // Drag & drop för ledtrådar
  const [draggedClue, setDraggedClue] = useState<number | null>(null);
  const handleDragStart = (clueIndex: number) => setDraggedClue(clueIndex);
  const handleDragOver = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    setHoverPreview({ x, y });
  };
  const handleDrop = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    if (draggedClue !== null) {
      placeClue(draggedClue, x, y, direction);
      setDraggedClue(null);
      setHoverPreview(null);
    }
  };

  // Inputhantering
  const handleInputChange = (x: number, y: number, value: string) => {
    const v = normalizeAnswer(value).slice(0, 1);
    if (!v) return; // ignorera tom
    upsertCell(x, y, { letter: v, isBlocked: false });

    // flytta fokus vidare i aktivt ord
    if (activeWord?.positions) {
      const idx = activeWord.positions.indexOf(k(x, y));
      const nextKey = activeWord.positions[idx + 1];
      if (nextKey) inputsRef.current[nextKey]?.focus();
    }
  };

  const handleKeyDown = (
    x: number,
    y: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    const keyName = e.key;
    const move = (dx: number, dy: number) => {
      const nk = k(x + dx, y + dy);
      inputsRef.current[nk]?.focus();
    };
    if (keyName === "Backspace") {
      upsertCell(x, y, { letter: "" });
      // gå bakåt i ordet
      if (activeWord) {
        const idx = activeWord.positions.indexOf(k(x, y));
        const prevKey = activeWord.positions[idx - 1];
        if (prevKey) inputsRef.current[prevKey]?.focus();
      }
    } else if (keyName === "ArrowRight") move(1, 0);
    else if (keyName === "ArrowLeft") move(-1, 0);
    else if (keyName === "ArrowDown") move(0, 1);
    else if (keyName === "ArrowUp") move(0, -1);
  };

  const clearGrid = () => setGridMap(new Map());

  const focusFirstOfActiveWord = () => {
    const fk = activeWord?.positions?.[0];
    if (fk) inputsRef.current[fk]?.focus();
  };

  // Förbättrad auto-placering med backtracking
  const autoPlace = async () => {
    setBusy(true);
    setAutoPlaceProgress("Förbereder...");
    
    try {
      const size = gridSize;
      let bestSolution: Map<string, CellKeyed> | null = null;
      let bestScore = -Infinity;
      
      // Sortera ord: längre ord först för bättre resultat
      const sortedClues = clues
        .map((clue, idx) => ({ clue, idx, length: normalizeAnswer(clue.answer).length }))
        .filter(item => item.length > 0)
        .sort((a, b) => b.length - a.length);

      if (sortedClues.length === 0) {
        setAutoPlaceProgress("");
        return;
      }

      setAutoPlaceProgress(`Placerar ${sortedClues.length} ord...`);

      // Backtracking-funktion
      const tryPlace = (
        currentMap: Map<string, CellKeyed>,
        clueIdx: number,
        attempts: number = 0
      ): boolean => {
        if (clueIdx >= sortedClues.length) {
          // Alla ord placerade!
          const score = calculateGridScore(currentMap);
          if (score > bestScore) {
            bestScore = score;
            bestSolution = new Map(currentMap);
          }
          return true;
        }

        if (attempts > 3) return false; // Begränsa försök per ord

        const { clue, idx } = sortedClues[clueIdx];
        const ans = normalizeAnswer(clue.answer);
        const positions = findBestPositions(currentMap, ans, idx, size);

        for (const pos of positions.slice(0, 5)) { // Prova top 5 positioner
          const newMap = placeWordInMap(currentMap, ans, pos.x, pos.y, pos.dir, idx);
          if (newMap) {
            setAutoPlaceProgress(`Placerar ord ${clueIdx + 1}/${sortedClues.length}...`);
            if (tryPlace(newMap, clueIdx + 1, 0)) {
              return true;
            }
          }
        }

        return tryPlace(currentMap, clueIdx + 1, attempts + 1);
      };

      // Starta med tomt grid eller befintligt
      const startMap = gridMap.size > 0 ? new Map(gridMap) : new Map<string, CellKeyed>();
      tryPlace(startMap, 0);

      if (bestSolution) {
        setGridMap(bestSolution);
        setAutoPlaceProgress("Klar! ✓");
        setTimeout(() => setAutoPlaceProgress(""), 2000);
      } else {
        setAutoPlaceProgress("Kunde inte placera alla ord");
        setTimeout(() => setAutoPlaceProgress(""), 3000);
      }
    } finally {
      setBusy(false);
    }
  };

  // Hjälpfunktioner för auto-placering
  const findBestPositions = (
    currentMap: Map<string, CellKeyed>,
    word: string,
    clueIdx: number,
    size: number
  ) => {
    const positions: Array<{ x: number; y: number; dir: Direction; score: number }> = [];
    const tryDir = ["across", "down"] as const;

    for (const dir of tryDir) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const endX = dir === "across" ? x + word.length - 1 : x;
          const endY = dir === "down" ? y + word.length - 1 : y;
          
          if (!inBounds(x, y, size) || !inBounds(endX, endY, size)) continue;

          let score = 0;
          let crossings = 0;
          let ok = true;

          for (const [cx, cy, i] of Array.from(iterWord(x, y, word.length, dir))) {
            const key = k(cx, cy);
            const ex = currentMap.get(key);
            
            if (ex?.isBlocked) {
              ok = false;
              break;
            }
            if (ex && ex.letter && ex.letter !== word[i]) {
              ok = false;
              break;
            }
            if (ex && ex.letter === word[i]) {
              crossings++;
              score += 10; // Belöna korsningar högt
            }
            if (!ex) score += 0.1;
          }

          if (!ok) continue;

          // Bonus för centrering
          const centerX = size / 2;
          const centerY = size / 2;
          const distFromCenter = Math.abs(x - centerX) + Math.abs(y - centerY);
          score -= distFromCenter * 0.1;

          // Extra bonus om det första ordet (behöver någonstans att börja)
          if (currentMap.size === 0) {
            score += 20;
          }

          positions.push({ x, y, dir, score });
        }
      }
    }

    return positions.sort((a, b) => b.score - a.score);
  };

  const placeWordInMap = (
    currentMap: Map<string, CellKeyed>,
    word: string,
    x: number,
    y: number,
    dir: Direction,
    clueIdx: number
  ): Map<string, CellKeyed> | null => {
    const newMap = new Map(currentMap);
    
    for (const [cx, cy, i] of Array.from(iterWord(x, y, word.length, dir))) {
      const key = k(cx, cy);
      const existing = newMap.get(key);
      
      if (existing?.isBlocked) return null;
      if (existing && existing.letter && existing.letter !== word[i]) return null;
      
      newMap.set(key, {
        x: cx,
        y: cy,
        key,
        letter: word[i],
        direction: dir,
        clueIndex: clueIdx,
      });
    }
    
    return newMap;
  };

  const calculateGridScore = (gridMap: Map<string, CellKeyed>): number => {
    if (gridMap.size === 0) return -Infinity;
    
    // Räkna ut grid-dimensioner
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const cell of gridMap.values()) {
      if (cell.isBlocked) continue;
      minX = Math.min(minX, cell.x);
      maxX = Math.max(maxX, cell.x);
      minY = Math.min(minY, cell.y);
      maxY = Math.max(maxY, cell.y);
    }
    
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const area = width * height;
    
    // Mindre area är bättre (mer kompakt)
    return -area + gridMap.size * 0.5;
  };


  // Render
  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header with actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Korsords-redigerare</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <HelpCircle className="h-4 w-4 text-gray-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Lägg till ord och ledtrådar, placera dem i gridet manuellt eller använd auto-placering. Alt+Klick för att blockera rutor.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Toggle
              pressed={direction === "across"}
              onPressedChange={() =>
                setDirection(direction === "across" ? "down" : "across")
              }
              className="gap-2"
              aria-label="Växla riktning"
            >
              {direction === "across" ? (
                <ArrowLeftRight className="h-4 w-4" />
              ) : (
                <ArrowUpDown className="h-4 w-4" />
              )}
              {direction === "across" ? "Vågrät" : "Lodrät"}
            </Toggle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={autoPlace}
                  disabled={busy || clues.length === 0}
                >
                  {busy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Auto-placera
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Placera alla ord automatiskt med smart algoritm</p>
              </TooltipContent>
            </Tooltip>
            <Button variant="outline" size="sm" onClick={clearGrid}>
              <Eraser className="mr-2 h-4 w-4" /> Rensa grid
            </Button>
          </div>
        </div>

        {/* Progress indicator */}
        {autoPlaceProgress && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-center gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{autoPlaceProgress}</span>
          </div>
        )}

        {/* Add new word section */}
        <Card className="border-2 border-dashed border-gray-300">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Lägg till ord och ledtråd
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="new-answer">Ord (svar)</Label>
                <Input
                  id="new-answer"
                  value={newClue.answer}
                  onChange={(e) => setNewClue({ ...newClue, answer: e.target.value })}
                  placeholder="T.ex. KATT"
                  className="uppercase"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newClue.question && newClue.answer) {
                      addClue();
                    }
                  }}
                />
              </div>
              <div>
                <Label htmlFor="new-question">Ledtråd (fråga)</Label>
                <Input
                  id="new-question"
                  value={newClue.question}
                  onChange={(e) => setNewClue({ ...newClue, question: e.target.value })}
                  placeholder="T.ex. Djur som säger mjau"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newClue.question && newClue.answer) {
                      addClue();
                    }
                  }}
                />
              </div>
            </div>
            <Button 
              onClick={addClue} 
              disabled={!newClue.question.trim() || !newClue.answer.trim()}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Lägg till ord
            </Button>
          </CardContent>
        </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Korsordsgrid</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="grid gap-0.5 mx-auto"
              style={{ gridTemplateColumns: `repeat(${gridSize}, 2rem)` }}
            >
              {Array.from({ length: gridSize * gridSize }).map((_, index) => {
                const x = index % gridSize;
                const y = Math.floor(index / gridSize);
                const key = k(x, y);
                const cell = gridMap.get(key);
                const active = activeWord?.positions?.includes(key);

                const showPreview =
                  hoverPreview &&
                  selectedClue !== null &&
                  (() => {
                    const ans = normalizeAnswer(clues[selectedClue].answer);
                    const endX =
                      direction === "across"
                        ? hoverPreview.x + ans.length - 1
                        : hoverPreview.x;
                    const endY =
                      direction === "down"
                        ? hoverPreview.y + ans.length - 1
                        : hoverPreview.y;
                    const inRect =
                      x >= hoverPreview.x &&
                      y >= hoverPreview.y &&
                      x <= endX &&
                      y <= endY;
                    if (!inRect) return false;
                    // beräkna exakt position i ordet
                    const i =
                      direction === "across"
                        ? x - hoverPreview.x
                        : y - hoverPreview.y;
                    return i >= 0 && i < ans.length;
                  })();

                return (
                  <div
                    key={key}
                    className={cn(
                      "relative w-8 h-8 border text-xs flex items-center justify-center cursor-pointer select-none",
                      cell?.isBlocked
                        ? "bg-black border-gray-600"
                        : "bg-white border-gray-300",
                      active && !cell?.isBlocked && "ring-2 ring-blue-500",
                      showPreview &&
                        "outline outline-2 outline-dashed outline-blue-400",
                    )}
                    onClick={(e) => handleCellClick(x, y, e)}
                    onDragOver={(e) => handleDragOver(e, x, y)}
                    onDrop={(e) => handleDrop(e, x, y)}
                  >
                    {!cell?.isBlocked && (
                      <Input
                        ref={(el) => (inputsRef.current[key] = el)}
                        className={cn(
                          "absolute inset-0 p-0 text-center text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:border-0",
                          cell?.letter ? "font-semibold" : "",
                        )}
                        value={cell?.letter ?? ""}
                        onChange={(e) =>
                          handleInputChange(x, y, e.target.value)
                        }
                        onKeyDown={(e) => handleKeyDown(x, y, e)}
                        maxLength={1}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    {/* Nummer (autonumrerat) */}
                    {(() => {
                      const numbers = computeNumbers(gridMap, gridSize);
                      const num = numbers.get(key);
                      if (!cell?.isBlocked && num) {
                        return (
                          <div className="absolute top-0.5 left-0.5 text-[10px] font-bold text-blue-700 pointer-events-none">
                            {num}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Tips: Alt+Klick på en ruta för att växla block (svart). Dra en
              ledtråd till en start‑ruta för att placera. Klicka utan vald
              ledtråd för att välja ord och skriva in direkt.
            </div>
          </CardContent>
        </Card>

        {/* Clues */}
        <Card>
          <CardHeader className="flex flex-col gap-3">
            <CardTitle>Ord och ledtrådar ({clues.length})</CardTitle>
            <div className="flex items-center gap-3">
              <Switch
                id="dir"
                checked={direction === "down"}
                onCheckedChange={(v) => setDirection(v ? "down" : "across")}
              />
              <label htmlFor="dir" className="text-sm">
                {direction === "across"
                  ? "Placera vågrätt"
                  : "Placera lodrätt"}
              </label>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {clues.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Inga ord tillagda ännu</p>
                <p className="text-sm mt-1">Lägg till ord ovan för att komma igång</p>
              </div>
            ) : (
              clues.map((clue, index) => (
                <div
                  key={clue.id}
                  className={cn(
                    "group border rounded-lg transition-all",
                    selectedClue === index && "bg-blue-50 border-blue-300 shadow-sm",
                    selectedClue !== index && "hover:bg-gray-50 hover:border-gray-400"
                  )}
                >
                  {editingClue === clue.id ? (
                    <div className="p-3 space-y-2">
                      <Input
                        value={clue.answer}
                        onChange={(e) => updateClue(clue.id, { answer: e.target.value })}
                        placeholder="Ord"
                        className="uppercase"
                      />
                      <Input
                        value={clue.question}
                        onChange={(e) => updateClue(clue.id, { question: e.target.value })}
                        placeholder="Ledtråd"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setEditingClue(null)}>
                          Klar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingClue(null)}>
                          Avbryt
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onClick={() =>
                        setSelectedClue(selectedClue === index ? null : index)
                      }
                      className="p-3 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">
                            {index + 1}. {clue.question}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Svar: {normalizeAnswer(clue.answer).toUpperCase()} (
                            {normalizeAnswer(clue.answer).length} bokstäver)
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingClue(clue.id);
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Redigera</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Ta bort "${clue.answer}"?`)) {
                                    deleteClue(clue.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ta bort</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      {selectedClue === index && (
                        <div className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                          <span>↓</span>
                          <span>Klicka i gridet för att placera</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tips section */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="text-sm text-gray-600 space-y-2">
            <p className="font-semibold text-gray-800">Tips för att skapa bra korsord:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Lägg till 5-10 ord för ett bra korsord</li>
              <li>Använd ord av olika längder</li>
              <li>Klicka på en ledtråd och sedan i gridet för att placera manuellt</li>
              <li>Eller använd "Auto-placera" för automatisk placering</li>
              <li>Alt+Klick på en ruta för att blockera den (svart ruta)</li>
              <li>Skriv tydliga och pedagogiska ledtrådar</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}
