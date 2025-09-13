import { Button } from '@/components/ui/button';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BlockDragHandleProps } from '../types';

interface BlockDragHandlePropsExtended extends BlockDragHandleProps {
  blockId?: string;
  onDragEnd?: (e: React.DragEvent) => void;
}

export function BlockDragHandle({ 
  position, 
  show, 
  onDragStart,
  onDragEnd,
  blockId 
}: BlockDragHandlePropsExtended) {
  
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', blockId || '');
    
    // Create a custom drag image with reduced opacity
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = '0.5';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
    
    onDragStart(e);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    onDragEnd?.(e);
  };

  if (!show) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      draggable
      className={cn(
        "absolute z-40 w-6 h-6 p-0 rounded cursor-grab active:cursor-grabbing",
        "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
        "shadow-sm hover:shadow-md transition-all duration-200",
        "hover:bg-gray-50 dark:hover:bg-gray-700",
        "focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      data-testid="block-drag-handle"
    >
      <GripVertical className="h-3 w-3 text-gray-500 dark:text-gray-400" />
    </Button>
  );
}