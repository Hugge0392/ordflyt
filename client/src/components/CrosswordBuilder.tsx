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
  Upload,
  Copy,
  Check,
  CheckCircle2,
  Circle,
  RotateCw,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

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

// Enkel placeringsstruktur - varje ord har explicit position
interface WordPlacement {
  startRow: string;    // "1"-"15" (synligt för användare)
  startCol: string;    // "A"-"O" (synligt för användare)
  direction: Direction;
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

// AI Crossword Import types
interface AICrosswordWord {
  word: string;
  clue: string;
  startX: number;
  startY: number;
  direction: "across" | "down";
}

interface AICrosswordData {
  gridSize?: number;
  words: AICrosswordWord[];
}

// Parser function for AI-generated crosswords
function parseAICrossword(input: string): { success: true; data: AICrosswordData } | { success: false; error: string } {
  try {
    // Try to extract JSON from markdown code blocks if present
    let jsonStr = input.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }
    
    const data = JSON.parse(jsonStr) as AICrosswordData;
    
    // Validate structure
    if (!data.words || !Array.isArray(data.words)) {
      return { success: false, error: "JSON måste innehålla en 'words' array" };
    }
    
    if (data.words.length === 0) {
      return { success: false, error: "Minst ett ord måste finnas i 'words' arrayen" };
    }
    
    // Validate each word
    for (let i = 0; i < data.words.length; i++) {
      const word = data.words[i];
      if (!word.word || typeof word.word !== 'string') {
        return { success: false, error: `Ord ${i + 1}: 'word' saknas eller är inte en sträng` };
      }
      if (!word.clue || typeof word.clue !== 'string') {
        return { success: false, error: `Ord ${i + 1}: 'clue' saknas eller är inte en sträng` };
      }
      if (typeof word.startX !== 'number' || word.startX < 0) {
        return { success: false, error: `Ord ${i + 1}: 'startX' måste vara ett positivt nummer` };
      }
      if (typeof word.startY !== 'number' || word.startY < 0) {
        return { success: false, error: `Ord ${i + 1}: 'startY' måste vara ett positivt nummer` };
      }
      if (word.direction !== 'across' && word.direction !== 'down') {
        return { success: false, error: `Ord ${i + 1}: 'direction' måste vara 'across' eller 'down'` };
      }
    }
    
    return { success: true, data };
  } catch (e) {
    if (e instanceof SyntaxError) {
      return { success: false, error: "Ogiltig JSON-format. Kontrollera att JSON är korrekt formaterad." };
    }
    return { success: false, error: `Fel vid parsing: ${(e as Error).message}` };
  }
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
  
  // Synka props till state när de ändras (viktigt för att behålla data när man navigerar tillbaka)
  const propCluesStr = useMemo(() => JSON.stringify(propClues), [propClues]);
  const cluesStr = useMemo(() => JSON.stringify(clues), [clues]);
  
  useEffect(() => {
    // Kolla om props faktiskt är olika (förhindra oändlig loop)
    if (propCluesStr !== cluesStr) {
      console.log('[CrosswordBuilder] Props changed, syncing clues from', clues.length, 'to', propClues.length);
      setClues(propClues);
    }
  }, [propCluesStr, cluesStr, propClues]);
  
  useEffect(() => {
    // Kolla om grid faktiskt är olika
    if (initialGrid.length > 0 && initialGrid.length !== gridMap.size) {
      console.log('[CrosswordBuilder] initialGrid changed, syncing grid:', initialGrid.length, 'cells');
      const m = new Map<string, CellKeyed>();
      for (const c of initialGrid) {
        const key = k(c.x, c.y);
        m.set(key, { ...c, key });
      }
      setGridMap(m);
    }
  }, [initialGrid, gridMap.size]);

  const [busy, setBusy] = useState(false);
  const [autoPlaceProgress, setAutoPlaceProgress] = useState<string>("");
  const [wordPlacements, setWordPlacements] = useState<Map<number, WordPlacement>>(new Map());
  
  // AI Import state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importInput, setImportInput] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Word input for generating custom prompt
  const [wordsInput, setWordsInput] = useState("");
  const [cluesInput, setCluesInput] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);

  // Reset import dialog state when opening
  useEffect(() => {
    if (showImportDialog) {
      setImportError(null);
      setImportSuccess(false);
      setCopied(false);
      setPromptCopied(false);
    }
  }, [showImportDialog]);

  // Synka clues uppåt
  useEffect(() => {
    onCluesUpdate?.(clues);
  }, [clues]);

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
    const clueIndex = clues.findIndex(c => c.id === id);
    
    setClues(clues.filter(c => c.id !== id));
    
    // Remove from wordPlacements
    if (clueIndex >= 0) {
      setWordPlacements(prev => {
        const next = new Map(prev);
        next.delete(clueIndex);
        return next;
      });
    }
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

  // Enkel funktion för att placera alla ord på gridet
  const placeAllWords = useCallback(() => {
    const newGridMap = new Map<string, CellKeyed>();
    
    wordPlacements.forEach((placement, clueIndex) => {
      if (!clues[clueIndex]) return; // Ord finns inte längre
      
      // Skippa om position inte är komplett
      if (!placement.startRow || !placement.startCol) return;
      
      const answer = normalizeAnswer(clues[clueIndex].answer);
      if (!answer) return;
      
      const startX = colToX(placement.startCol);
      const startY = rowToY(placement.startRow);
      
      // Validera position
      if (startX < 0 || startY < 0 || startX >= gridSize || startY >= gridSize) return;
      
      const endX = placement.direction === "across" ? startX + answer.length - 1 : startX;
      const endY = placement.direction === "down" ? startY + answer.length - 1 : startY;
      
      // Kolla bounds
      if (endX >= gridSize || endY >= gridSize) return;
      
      // Placera ordet
      for (const [cx, cy, i] of Array.from(iterWord(startX, startY, answer.length, placement.direction))) {
        const key = k(cx, cy);
        newGridMap.set(key, {
          x: cx,
          y: cy,
          key,
          letter: answer[i],
          clueIndex,
          direction: placement.direction,
        });
      }
    });
    
    setGridMap(newGridMap);
  }, [clues, wordPlacements, gridSize]);

  // Auto-uppdatera grid när wordPlacements ändras
  useEffect(() => {
    placeAllWords();
  }, [wordPlacements, placeAllWords]);

  // Funktion för att uppdatera placering för ett ord
  const updatePlacement = (clueIndex: number, field: 'row' | 'col' | 'dir', value: string) => {
    setWordPlacements(prev => {
      const next = new Map(prev);
      const current = next.get(clueIndex) || { startRow: '', startCol: '', direction: 'across' as Direction };
      
      if (field === 'row') {
        current.startRow = value;
      } else if (field === 'col') {
        current.startCol = value.toUpperCase();
      } else if (field === 'dir') {
        current.direction = value as Direction;
      }
      
      // Spara alltid (även om bara ett fält är ifyllt) så användaren kan se vad de skrivit
      if (current.startRow || current.startCol) {
        next.set(clueIndex, current);
      } else {
        // Ta bort bara om båda är tomma
        next.delete(clueIndex);
      }
      
      return next;
    });
  };

  const clearGrid = () => {
    setGridMap(new Map());
    setWordPlacements(new Map());
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
        
        // Extrahera wordPlacements från bestSolution
        const newPlacements = new Map<number, WordPlacement>();
        const processedClues = new Set<number>();
        const solution: Map<string, CellKeyed> = bestSolution;
        
        for (const cell of solution.values()) {
          if (cell.clueIndex !== undefined && !processedClues.has(cell.clueIndex)) {
            // Hitta startposition för detta ord
            const clueAnswer = normalizeAnswer(clues[cell.clueIndex].answer);
            let startX = cell.x;
            let startY = cell.y;
            const dir = cell.direction;
            
            // Hitta verklig startposition (första bokstaven)
            if (dir === "across") {
              // Gå bakåt tills vi hittar starten
              while (startX > 0) {
                const prevKey = k(startX - 1, startY);
                const prevCell = solution.get(prevKey);
                if (prevCell?.clueIndex === cell.clueIndex) {
                  startX--;
                } else {
                  break;
                }
              }
            } else if (dir === "down") {
              while (startY > 0) {
                const prevKey = k(startX, startY - 1);
                const prevCell = solution.get(prevKey);
                if (prevCell?.clueIndex === cell.clueIndex) {
                  startY--;
                } else {
                  break;
                }
              }
            }
            
            newPlacements.set(cell.clueIndex, {
              startRow: yToRow(startY),
              startCol: xToCol(startX),
              direction: dir || 'across',
            });
            
            processedClues.add(cell.clueIndex);
          }
        }
        
        setWordPlacements(newPlacements);
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

  // AI Import handler
  const handleImportAICrossword = () => {
    setImportError(null);
    setImportSuccess(false);
    
    const result = parseAICrossword(importInput);
    
    if (!result.success) {
      setImportError(result.error);
      return;
    }
    
    const { data } = result;
    
    // Create clues from imported data
    const newClues: CrosswordClue[] = data.words.map((word, idx) => ({
      id: `clue-${Date.now()}-${idx}`,
      question: word.clue,
      answer: word.word,
    }));
    
    // Create grid from imported data
    const newGridMap = new Map<string, CellKeyed>();
    
    data.words.forEach((word, clueIndex) => {
      const answer = normalizeAnswer(word.word);
      const dir = word.direction;
      
      for (const [cx, cy, i] of Array.from(iterWord(
        word.startX,
        word.startY,
        answer.length,
        dir,
      ))) {
        const key = k(cx, cy);
        newGridMap.set(key, {
          x: cx,
          y: cy,
          key,
          letter: answer[i],
          clueIndex,
          direction: dir,
        });
      }
    });
    
    // Update state
    setClues(newClues);
    setGridMap(newGridMap);
    
    // CRITICAL: Call onCluesUpdate immediately with newClues (not clues which is stale)
    // This ensures parent component gets the data before any re-renders
    if (onCluesUpdate) {
      onCluesUpdate(newClues);
    }
    if (onGridUpdate) {
      // Calculate numbers for the grid
      const numbers = computeNumbers(newGridMap, gridSize);
      
      // Convert Map to array for parent with computed numbers
      const gridArray = Array.from(newGridMap.values()).map(cell => {
        const number = numbers.get(k(cell.x, cell.y));
        return {
          x: cell.x,
          y: cell.y,
          letter: cell.letter,
          number,
          isStart: number !== undefined,
          direction: cell.direction,
          clueIndex: cell.clueIndex,
          isBlocked: cell.isBlocked,
        };
      });
      onGridUpdate(gridArray);
    }
    
    setImportSuccess(true);
    
    // Close dialog after a short delay
    setTimeout(() => {
      setShowImportDialog(false);
      setImportInput("");
      setImportSuccess(false);
    }, 1500);
  };

  const generateCustomPrompt = () => {
    // Parse words from input
    const words = wordsInput
      .split(/[,\n]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
    
    if (words.length === 0) {
      setImportError("Skriv in minst ett ord");
      return;
    }
    
    // Parse clues if provided (one per line or comma-separated)
    const cluesArray = cluesInput
      .split(/\n/)
      .map(c => c.trim())
      .filter(c => c.length > 0);
    
    // Build word list for prompt
    let wordList = "";
    if (cluesArray.length === words.length) {
      // We have clues for each word
      wordList = words.map((word, i) => `  - ${word}: ${cluesArray[i]}`).join('\n');
    } else {
      // No clues or mismatched, just list words
      wordList = words.map(w => `  - ${w}`).join('\n');
    }
    
    const prompt = `Skapa ett svenskt korsord med dessa ord:

${wordList}

Använd detta exakta JSON-format:
{
  "gridSize": 12,
  "words": [
    {
      "word": "ORD",
      "clue": "Förklaring av ordet",
      "startX": 0,
      "startY": 0,
      "direction": "across"
    }
  ]
}

Regler:
- Använd EXAKT de ord jag angett ovan
- Skapa pedagogiska ledtrådar för varje ord (om jag inte redan angett dem)
- Korsa minst 2-3 ord med varandra där samma bokstav finns
- startX och startY börjar från 0
- direction är antingen "across" eller "down"
- Placera orden så de bildar ett kompakt korsord
- Ge ENDAST JSON-svaret, ingen annan text före eller efter`;

    setGeneratedPrompt(prompt);
    setImportError(null);
  };

  const copyGeneratedPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    });
  };

  // Konverteringsfunktioner mellan användar-synliga positioner och grid-koordinater
  const colToX = (col: string): number => {
    if (!col) return -1;
    return col.toUpperCase().charCodeAt(0) - 65; // 'A' = 0, 'B' = 1, etc.
  };
  
  const rowToY = (row: string): number => {
    const num = parseInt(row);
    if (isNaN(num)) return -1;
    return num - 1; // Rad 1 = y:0, Rad 2 = y:1, etc.
  };
  
  const xToCol = (x: number): string => {
    return String.fromCharCode(65 + x); // 0 = 'A', 1 = 'B', etc.
  };
  
  const yToRow = (y: number): string => {
    return String(y + 1); // y:0 = "1", y:1 = "2", etc.
  };

  // Check if a word is placed in the grid
  const isWordPlaced = (clueIndex: number): boolean => {
    return wordPlacements.has(clueIndex);
  };

  // Get placement info for a word
  const getWordPlacement = (clueIndex: number) => {
    return wordPlacements.get(clueIndex) || null;
  };

  // Render
  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Compact header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Skapa korsord</h3>
          <div className="flex gap-2">
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
            <Button variant="outline" size="sm" onClick={clearGrid}>
              <Eraser className="mr-2 h-4 w-4" /> Rensa
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

        {/* Main 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          
          {/* LEFT COLUMN: Grid */}
          <Card className="h-fit">
          <CardHeader>
              <CardTitle className="text-base">Korsordsgrid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-0">
              {/* Kolumn-labels (A-O) */}
              <div className="flex flex-col">
                <div className="w-6 h-6"></div> {/* Tom cell för hörnet */}
                {Array.from({ length: gridSize }).map((_, i) => (
                  <div key={`row-${i}`} className="w-6 h-8 flex items-center justify-center text-xs font-medium text-gray-600">
                    {i + 1}
                  </div>
                ))}
              </div>
              
              <div>
                {/* Kolumn-labels topp */}
                <div className="flex gap-0.5 mb-0">
                  {Array.from({ length: gridSize }).map((_, i) => (
                    <div key={`col-${i}`} className="w-8 h-6 flex items-center justify-center text-xs font-medium text-gray-600">
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                
                {/* Grid */}
                <div
                  className="grid gap-0.5"
                  style={{ gridTemplateColumns: `repeat(${gridSize}, 2rem)` }}
                >
                  {Array.from({ length: gridSize * gridSize }).map((_, index) => {
                    const x = index % gridSize;
                    const y = Math.floor(index / gridSize);
                    const key = k(x, y);
                    const cell = gridMap.get(key);

                    return (
                      <div
                        key={key}
                        className={cn(
                          "relative w-8 h-8 border text-sm flex items-center justify-center select-none font-semibold",
                          cell?.isBlocked
                            ? "bg-black border-gray-600"
                            : cell?.letter 
                              ? "bg-blue-50 border-blue-300"
                              : "bg-gray-50 border-gray-300",
                        )}
                      >
                        {cell?.letter && !cell.isBlocked && (
                          <span className="text-gray-900">{cell.letter}</span>
                        )}
                        {(() => {
                          const numbers = computeNumbers(gridMap, gridSize);
                          const num = numbers.get(key);
                          if (!cell?.isBlocked && num) {
                            return (
                              <div className="absolute top-0.5 left-0.5 text-[9px] font-bold text-blue-600 pointer-events-none">
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
              </div>
            </div>
            
            <div className="text-xs text-gray-500 mt-3 space-y-1">
              <p><strong>Tips:</strong></p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Fyll i position (rad + kolumn) och riktning för varje ord till höger</li>
                <li>Gridet uppdateras automatiskt när du fyller i positioner</li>
                <li>Använd "Auto-placera" för automatisk placering</li>
              </ul>
            </div>
          </CardContent>
        </Card>

          {/* RIGHT COLUMN: Word list & controls */}
          <div className="space-y-4">
            
            {/* Add word section */}
            <Card className="border-2 border-blue-300 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Lägg till ord
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <Input
                    value={newClue.answer}
                    onChange={(e) => setNewClue({ ...newClue, answer: e.target.value })}
                    placeholder="Ord (t.ex. KATT)"
                    className="uppercase"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newClue.answer && newClue.question) {
                        addClue();
                      }
                    }}
                  />
            </div>
                <div>
                  <Input
                    value={newClue.question}
                    onChange={(e) => setNewClue({ ...newClue, question: e.target.value })}
                    placeholder="Ledtråd (t.ex. Djur som säger mjau)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newClue.answer && newClue.question) {
                        addClue();
                      }
                    }}
                  />
                </div>
                <Button 
                  onClick={addClue} 
                  disabled={!newClue.question.trim() || !newClue.answer.trim()}
                  className="w-full"
                  size="sm"
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Lägg till
                </Button>
              </CardContent>
            </Card>

            {/* AI Import - Collapsed */}
            <Card className="border-purple-300 bg-purple-50">
              <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowImportDialog(!showImportDialog)}>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    AI Import (ChatGPT)
                  </span>
                  <span className="text-xs text-purple-600">{showImportDialog ? "▲" : "▼"}</span>
                </CardTitle>
          </CardHeader>
              {showImportDialog && (
                <CardContent className="pt-0">
                  <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full border-purple-400 hover:bg-purple-100">
                        <Upload className="mr-2 h-3 w-3" />
                        Öppna Import-guide
                      </Button>
                    </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Importera korsord från AI</DialogTitle>
                  <DialogDescription>
                    Följ stegen nedan för att skapa ett korsord med hjälp av AI
                  </DialogDescription>
                </DialogHeader>
                
                <Tabs defaultValue="step1" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="step1">1. Ange Ord</TabsTrigger>
                    <TabsTrigger value="step2">2. Använd AI</TabsTrigger>
                    <TabsTrigger value="step3">3. Importera</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="step1" className="space-y-3">
                    <div>
                      <h3 className="font-semibold mb-2">Steg 1: Ange ord och ledtrådar</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Skriv in de ord som ska vara med i korsordet (ett per rad eller kommaseparerat)
                      </p>
                      
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="words-input">Ord (obligatoriskt)</Label>
                          <Textarea
                            id="words-input"
                            value={wordsInput}
                            onChange={(e) => setWordsInput(e.target.value)}
                            placeholder={"katt, hund, häst\neller\nkatt\nhund\nhäst"}
                            className="min-h-[100px]"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Skriv ett ord per rad, eller separera med komma
                          </p>
                        </div>
                        
                        <div>
                          <Label htmlFor="clues-input">Ledtrådar (valfritt)</Label>
                          <Textarea
                            id="clues-input"
                            value={cluesInput}
                            onChange={(e) => setCluesInput(e.target.value)}
                            placeholder={"Djur som säger mjau\nDjur som skäller\nDjur som galopperar"}
                            className="min-h-[100px]"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            En ledtråd per rad. Om du lämnar tomt kommer AI:n att skapa ledtrådar själv.
                          </p>
                        </div>
                        
                        <Button 
                          onClick={generateCustomPrompt}
                          disabled={!wordsInput.trim()}
                          className="w-full"
                          variant="default"
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generera Prompt
                        </Button>
                        
                        {generatedPrompt && (
                          <div className="space-y-2">
                            <Label>Din färdiga prompt:</Label>
                            <div className="bg-gray-100 p-3 rounded border text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                              {generatedPrompt}
                            </div>
                            <Button onClick={copyGeneratedPrompt} className="w-full" variant="outline">
                              {promptCopied ? (
                                <>
                                  <Check className="mr-2 h-4 w-4" />
                                  Kopierad!
                                </>
                              ) : (
                                <>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Kopiera Prompt
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="step2" className="space-y-3">
                    <div>
                      <h3 className="font-semibold mb-2">Steg 2: Använd AI</h3>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                        <li>Öppna ChatGPT (chatgpt.com), Claude (claude.ai) eller annan AI</li>
                        <li>Klistra in den genererade prompten från Steg 1</li>
                        <li>Skicka meddelandet till AI:n</li>
                        <li>AI:n kommer att generera ett JSON-svar med ditt korsord</li>
                        <li>Kopiera hela JSON-svaret (från {"{"} till {"}"})</li>
                      </ol>
                      <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-3 text-sm">
                        <strong>Tips:</strong> Om AI:n ger text innan eller efter JSON, kopiera bara JSON-delen (det som börjar med {"{"} och slutar med {"}"})
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded p-3 mt-3 text-sm">
                        <strong>Exempel på JSON-svar:</strong>
                        <pre className="mt-2 text-xs overflow-x-auto">
{`{
  "gridSize": 12,
  "words": [
    {
      "word": "KATT",
      "clue": "Djur som säger mjau",
      "startX": 0,
      "startY": 0,
      "direction": "across"
    }
  ]
}`}
                        </pre>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="step3" className="space-y-3">
                    <div>
                      <h3 className="font-semibold mb-2">Steg 3: Importera JSON</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Klistra in JSON-svaret från AI:n här:
                      </p>
                      <Textarea
                        value={importInput}
                        onChange={(e) => setImportInput(e.target.value)}
                        placeholder='{"gridSize": 10, "words": [...]}'
                        className="min-h-[200px] font-mono text-xs"
                      />
                      
                      {importError && (
                        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                          <strong>Fel:</strong> {importError}
                        </div>
                      )}
                      
                      {importSuccess && (
                        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800 flex items-center gap-2">
                          <Check className="h-4 w-4" />
                          <span>Korsord importerat! Stänger...</span>
                        </div>
                      )}
                      
                      <Button 
                        onClick={handleImportAICrossword}
                        disabled={!importInput.trim() || importSuccess}
                        className="w-full"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Importera Korsord
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
                </CardContent>
              )}
            </Card>

            {/* Word list */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Ord ({clues.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {clues.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Inga ord tillagda ännu</p>
                <p className="text-sm mt-1">Lägg till ord ovan för att komma igång</p>
              </div>
            ) : (
              clues.map((clue, index) => (
                <div
                  key={clue.id}
                  className="group border rounded-lg transition-all hover:bg-gray-50 hover:border-gray-400"
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
                    <div className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{clue.question}</div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            <span className="font-mono font-semibold">{normalizeAnswer(clue.answer).toUpperCase()}</span>
                            <span className="text-gray-400"> • </span>
                            <span>{normalizeAnswer(clue.answer).length} bokstäver</span>
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex gap-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
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
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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
                      
                      {/* Position inputs */}
                      <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2 rounded">
                        <div>
                          <Label className="text-[10px] text-gray-600">Rad (1-15)</Label>
                          <Input
                            type="text"
                            placeholder="5"
                            maxLength={2}
                            value={getWordPlacement(index)?.startRow || ''}
                            onChange={(e) => updatePlacement(index, 'row', e.target.value)}
                            className="h-8 text-center"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-gray-600">Kol (A-O)</Label>
                          <Input
                            type="text"
                            placeholder="A"
                            maxLength={1}
                            value={getWordPlacement(index)?.startCol || ''}
                            onChange={(e) => updatePlacement(index, 'col', e.target.value)}
                            className="h-8 text-center uppercase"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-gray-600">Riktning</Label>
                          <select
                            value={getWordPlacement(index)?.direction || 'across'}
                            onChange={(e) => updatePlacement(index, 'dir', e.target.value)}
                            className="h-8 w-full text-xs border rounded px-1"
                          >
                            <option value="across">→ Horisontell</option>
                            <option value="down">↓ Vertikal</option>
                          </select>
                        </div>
                      </div>
                      
                      {isWordPlaced(index) && (
                        <div className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Placerat i gridet</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
          
          </div> {/* End RIGHT COLUMN */}
        
        </div> {/* End 2-column layout */}
        
    </div>
    </TooltipProvider>
  );
}
