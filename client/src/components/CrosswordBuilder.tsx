import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CrosswordCell {
  x: number;
  y: number;
  letter: string;
  number?: number;
  isStart?: boolean;
  direction?: 'across' | 'down';
  clueIndex?: number;
}

interface CrosswordBuilderProps {
  clues: Array<{ question: string; answer: string }>;
  onGridUpdate: (grid: CrosswordCell[]) => void;
  initialGrid?: CrosswordCell[];
}

export function CrosswordBuilder({ clues, onGridUpdate, initialGrid = [] }: CrosswordBuilderProps) {
  const [grid, setGrid] = useState<CrosswordCell[]>(initialGrid);
  const [selectedClue, setSelectedClue] = useState<number | null>(null);
  const [draggedClue, setDraggedClue] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

  const gridSize = 15;

  const handleCellClick = (x: number, y: number) => {
    if (selectedClue !== null && clues[selectedClue]) {
      const clue = clues[selectedClue];
      const answer = clue.answer.toUpperCase();
      
      // Remove old placement of this clue
      const newGrid = grid.filter(cell => cell.clueIndex !== selectedClue);
      
      // Add new placement
      const direction = Math.random() > 0.5 ? 'across' : 'down';
      for (let i = 0; i < answer.length; i++) {
        const cellX = direction === 'across' ? x + i : x;
        const cellY = direction === 'down' ? y + i : y;
        
        if (cellX < gridSize && cellY < gridSize) {
          newGrid.push({
            x: cellX,
            y: cellY,
            letter: answer[i],
            number: i === 0 ? selectedClue + 1 : undefined,
            isStart: i === 0,
            direction: direction,
            clueIndex: selectedClue
          });
        }
      }
      
      setGrid(newGrid);
      onGridUpdate(newGrid);
      setSelectedClue(null);
    }
  };

  const handleDragStart = (clueIndex: number) => {
    setDraggedClue(clueIndex);
  };

  const handleDragOver = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    setDragPosition({ x, y });
  };

  const handleDrop = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    if (draggedClue !== null && clues[draggedClue]) {
      const clue = clues[draggedClue];
      const answer = clue.answer.toUpperCase();
      
      // Remove old placement
      const newGrid = grid.filter(cell => cell.clueIndex !== draggedClue);
      
      // Add new placement horizontally
      for (let i = 0; i < answer.length; i++) {
        if (x + i < gridSize) {
          newGrid.push({
            x: x + i,
            y: y,
            letter: answer[i],
            number: i === 0 ? draggedClue + 1 : undefined,
            isStart: i === 0,
            direction: 'across',
            clueIndex: draggedClue
          });
        }
      }
      
      setGrid(newGrid);
      onGridUpdate(newGrid);
      setDraggedClue(null);
      setDragPosition(null);
    }
  };

  const getCellContent = (x: number, y: number) => {
    const cell = grid.find(c => c.x === x && c.y === y);
    return cell;
  };

  const clearGrid = () => {
    setGrid([]);
    onGridUpdate([]);
  };

  const autoGenerate = () => {
    const newGrid: CrosswordCell[] = [];
    clues.forEach((clue, index) => {
      const answer = clue.answer.toUpperCase();
      const startX = Math.floor(Math.random() * (gridSize - answer.length));
      const startY = Math.floor(Math.random() * gridSize);
      const direction = Math.random() > 0.5 ? 'across' : 'down';
      
      for (let i = 0; i < answer.length; i++) {
        const cellX = direction === 'across' ? startX + i : startX;
        const cellY = direction === 'down' ? startY + i : startY;
        
        if (cellX < gridSize && cellY < gridSize) {
          newGrid.push({
            x: cellX,
            y: cellY,
            letter: answer[i],
            number: i === 0 ? index + 1 : undefined,
            isStart: i === 0,
            direction: direction,
            clueIndex: index
          });
        }
      }
    });
    
    setGrid(newGrid);
    onGridUpdate(newGrid);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Korsords-redigerare</h3>
        <div className="space-x-2">
          <Button onClick={autoGenerate} size="sm" variant="outline">
            Auto-generera
          </Button>
          <Button onClick={clearGrid} size="sm" variant="outline">
            Rensa
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
            <div className="grid grid-cols-15 gap-0.5 max-w-md mx-auto">
              {Array.from({ length: gridSize * gridSize }).map((_, index) => {
                const x = index % gridSize;
                const y = Math.floor(index / gridSize);
                const cell = getCellContent(x, y);
                
                return (
                  <div
                    key={`${x}-${y}`}
                    className={`w-6 h-6 border border-gray-300 text-xs flex items-center justify-center cursor-pointer relative ${
                      cell ? 'bg-white' : 'bg-gray-100'
                    } ${
                      dragPosition?.x === x && dragPosition?.y === y ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => handleCellClick(x, y)}
                    onDragOver={(e) => handleDragOver(e, x, y)}
                    onDrop={(e) => handleDrop(e, x, y)}
                  >
                    {cell?.letter}
                    {cell?.number && (
                      <div className="absolute top-0 left-0 text-xs font-bold text-blue-600">
                        {cell.number}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Clues */}
        <Card>
          <CardHeader>
            <CardTitle>Ledtrådar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {clues.map((clue, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                  selectedClue === index ? 'bg-blue-50 border-blue-300' : ''
                }`}
                onClick={() => setSelectedClue(selectedClue === index ? null : index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {index + 1}. {clue.question}
                    </div>
                    <div className="text-xs text-gray-600">
                      Svar: {clue.answer} ({clue.answer.length} bokstäver)
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    Drag eller klicka
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}