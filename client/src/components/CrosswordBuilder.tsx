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
import { cn } from "@/lib/utils";
import {
  ArrowLeftRight,
  ArrowUpDown,
  Eraser,
  Grid3X3,
  Loader2,
  Save,
} from "lucide-react";

/*****
 * CrosswordBuilder – förbättrad
 *
 * Nyckelfunktioner:
 * - Stabil intern datastruktur (Map) för O(1) cellåtkomst
 * - Placering med riktning (across/down) och tangentbordsnavigation i ordet
 * - Kollisionskontroll: tillåter korsningar bara om bokstav matchar
 * - Automatisk numrering av startceller (1, 2, 3 ...)
 * - Markering av valt ord, förhandsvisning vid drag-över/drop
 * - Högersnitts‑toggle: blockera/avblockera (svarta rutor) med Alt+Klick
 * - Auto‑placera (enkel greedy) med korsningspoäng
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

export interface CrosswordBuilderProps {
  clues: Array<{ question: string; answer: string }>; // svar utan mellanslag
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
  clues,
  onGridUpdate,
  initialGrid = [],
  gridSize = 15,
}: CrosswordBuilderProps) {
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
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});

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

  // Auto‑placera: enkel greedy – välj den position (across/down) med högst korsningspoäng som inte krockar
  const autoPlace = async () => {
    setBusy(true);
    try {
      const size = gridSize;
      const current = new Map(gridMap);
      const placeOne = (idx: number) => {
        const ans = normalizeAnswer(clues[idx].answer);
        if (!ans) return false;
        let best: {
          x: number;
          y: number;
          dir: Direction;
          score: number;
        } | null = null;
        const tryDir = ["across", "down"] as const;
        for (const dir of tryDir) {
          for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
              const endX = dir === "across" ? x + ans.length - 1 : x;
              const endY = dir === "down" ? y + ans.length - 1 : y;
              if (!inBounds(x, y, size) || !inBounds(endX, endY, size))
                continue;
              let score = 0;
              let ok = true;
              for (const [cx, cy, i] of Array.from(iterWord(x, y, ans.length, dir))) {
                const key = k(cx, cy);
                const ex = current.get(key);
                if (ex?.isBlocked) {
                  ok = false;
                  break;
                }
                if (ex && ex.letter && ex.letter !== ans[i]) {
                  ok = false;
                  break;
                }
                if (ex && ex.letter === ans[i]) score += 2; // belöna korsningar
                // lätt straff för nya celler så vi sprider oss mindre
                if (!ex) score += 0.2;
              }
              if (!ok) continue;
              if (!best || score > best.score) best = { x, y, dir, score };
            }
          }
        }
        if (best) {
          for (const [cx, cy, i] of Array.from(iterWord(
            best.x,
            best.y,
            ans.length,
            best.dir,
          ))) {
            const key = k(cx, cy);
            current.set(key, {
              x: cx,
              y: cy,
              key,
              letter: ans[i],
              direction: best.dir,
              clueIndex: idx,
            });
          }
          return true;
        }
        return false;
      };

      // Först lägg ord som delar bokstäver med redan lagda
      const order = clues.map((_, i) => i);
      // litet heuristiskt sorteringsgrepp: längre ord först
      order.sort(
        (a, b) =>
          normalizeAnswer(clues[b].answer).length -
          normalizeAnswer(clues[a].answer).length,
      );

      for (const idx of order) placeOne(idx);

      setGridMap(current);
    } finally {
      setBusy(false);
    }
  };

  // Export/Import
  const [exportText, setExportText] = useState("");
  useEffect(() => {
    const payload = JSON.stringify(
      Array.from(gridMap.values()).map(({ key, ...c }) => c),
    );
    setExportText(payload);
  }, [gridMap]);

  const importFromText = () => {
    try {
      const arr = JSON.parse(exportText) as CrosswordCell[];
      const m = new Map<string, CellKeyed>();
      for (const c of arr) {
        m.set(k(c.x, c.y), { ...c, key: k(c.x, c.y) });
      }
      setGridMap(m);
    } catch (e) {
      // noop, kunde lägga till toast
      console.error(e);
    }
  };

  // Render
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-lg font-semibold">Korsords‑redigerare</h3>
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
            {direction === "across" ? "Horisontellt" : "Vertikalt"}
          </Toggle>
          <Button
            variant="outline"
            size="sm"
            onClick={autoPlace}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Grid3X3 className="mr-2 h-4 w-4" />
            )}
            Auto‑placera
          </Button>
          <Button variant="outline" size="sm" onClick={clearGrid}>
            <Eraser className="mr-2 h-4 w-4" /> Rensa
          </Button>
        </div>
      </div>

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
            <CardTitle>Ledtrådar</CardTitle>
            <div className="flex items-center gap-3">
              <Switch
                id="dir"
                checked={direction === "down"}
                onCheckedChange={(v) => setDirection(v ? "down" : "across")}
              />
              <label htmlFor="dir" className="text-sm">
                {direction === "across"
                  ? "Placera horisontellt"
                  : "Placera vertikalt"}
              </label>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {clues.map((clue, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                className={cn(
                  "p-3 border rounded cursor-pointer hover:bg-gray-50",
                  selectedClue === index && "bg-blue-50 border-blue-300",
                )}
                onClick={() =>
                  setSelectedClue(selectedClue === index ? null : index)
                }
                title="Dra till griden eller klicka och välj start‑ruta"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {index + 1}. {clue.question}
                    </div>
                    <div className="text-xs text-gray-600">
                      Svar: {normalizeAnswer(clue.answer)} (
                      {normalizeAnswer(clue.answer).length} bokstäver)
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">Drag eller klicka</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Export/Import */}
      <Card>
        <CardHeader>
          <CardTitle>Export & Import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={exportText}
            onChange={(e) => setExportText(e.target.value)}
            className="font-mono text-xs min-h-[120px]"
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={importFromText}>
              <Save className="mr-2 h-4 w-4" />
              Importera från JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(exportText)}
            >
              Kopiera JSON
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
