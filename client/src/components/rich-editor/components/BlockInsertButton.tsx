import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BlockInsertButtonProps } from '../types';
import { BlockTypeMenu } from './BlockTypeMenu';

interface BlockInsertButtonPropsExtended extends BlockInsertButtonProps {
  editor: any;
}

export function BlockInsertButton({ 
  position, 
  onInsertBlock, 
  show, 
  editor 
}: BlockInsertButtonPropsExtended) {
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Position the menu relative to the button
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      x: rect.left + rect.width + 8,
      y: rect.top
    });
    
    setShowBlockMenu(true);
  };

  const handleHideMenu = () => {
    setShowBlockMenu(false);
  };

  const handleSelectType = (blockType: string) => {
    onInsertBlock(blockType);
    setShowBlockMenu(false);
  };

  if (!show) {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "absolute z-40 w-6 h-6 p-0 rounded-full",
          "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
          "shadow-sm hover:shadow-md transition-all duration-200",
          "hover:bg-gray-50 dark:hover:bg-gray-700",
          "focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        )}
        style={{
          left: position.x,
          top: position.y,
        }}
        onClick={handleClick}
        data-testid="block-insert-button"
      >
        <Plus className="h-3 w-3 text-gray-500 dark:text-gray-400" />
      </Button>

      <BlockTypeMenu
        editor={editor}
        show={showBlockMenu}
        position={menuPosition}
        onHide={handleHideMenu}
        onSelectType={handleSelectType}
      />
    </>
  );
}