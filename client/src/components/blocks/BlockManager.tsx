import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { TextBlock } from './TextBlock';
import { ImageBlock } from './ImageBlock';
import { BlockTypeSelector } from './BlockTypeSelector';
import { 
  createTextBlock, 
  createImageBlock, 
  type Block, 
  type BlockManagerProps,
  type TextBlock as TextBlockType,
  type ImageBlock as ImageBlockType
} from './types';

export function BlockManager({ 
  blocks, 
  onChange, 
  readonly = false, 
  className 
}: BlockManagerProps) {
  const [showBlockSelector, setShowBlockSelector] = useState(false);
  const [selectorPosition, setSelectorPosition] = useState({ x: 0, y: 0 });
  const [insertPosition, setInsertPosition] = useState(0);

  // Sort blocks by order for consistent rendering (non-mutating copy)
  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);

  const addBlock = useCallback((blockType: string, position?: number) => {
    const insertPos = position ?? blocks.length;
    
    let newBlock: Block;
    
    if (blockType === 'image') {
      newBlock = createImageBlock({ src: '' }, insertPos);
    } else {
      // Handle different text block types
      let initialContent;
      
      switch (blockType) {
        case 'heading1':
          initialContent = {
            type: 'doc',
            content: [{ type: 'heading', attrs: { level: 1 }, content: [] }]
          };
          break;
        case 'heading2':
          initialContent = {
            type: 'doc',
            content: [{ type: 'heading', attrs: { level: 2 }, content: [] }]
          };
          break;
        case 'heading3':
          initialContent = {
            type: 'doc',
            content: [{ type: 'heading', attrs: { level: 3 }, content: [] }]
          };
          break;
        case 'list':
          initialContent = {
            type: 'doc',
            content: [{ type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [] }] }] }]
          };
          break;
        case 'ordered-list':
          initialContent = {
            type: 'doc',
            content: [{ type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [] }] }] }]
          };
          break;
        case 'quote':
          initialContent = {
            type: 'doc',
            content: [{ type: 'blockquote', content: [{ type: 'paragraph', content: [] }] }]
          };
          break;
        case 'code':
          initialContent = {
            type: 'doc',
            content: [{ type: 'codeBlock', content: [] }]
          };
          break;
        case 'divider':
          initialContent = {
            type: 'doc',
            content: [{ type: 'horizontalRule' }]
          };
          break;
        default: // 'text' or any other
          initialContent = {
            type: 'doc',
            content: [{ type: 'paragraph', content: [] }]
          };
      }
      
      newBlock = createTextBlock({ content: initialContent }, insertPos);
    }

    // Update order for blocks after insert position
    const updatedBlocks = blocks.map(block => 
      block.order >= insertPos 
        ? { ...block, order: block.order + 1 }
        : block
    );

    onChange([...updatedBlocks, newBlock]);
  }, [blocks, onChange]);

  const deleteBlock = useCallback((blockId: string) => {
    const blockToDelete = blocks.find(b => b.id === blockId);
    if (!blockToDelete) return;

    // Remove the block and update order for subsequent blocks
    const updatedBlocks = blocks
      .filter(b => b.id !== blockId)
      .map(block => 
        block.order > blockToDelete.order 
          ? { ...block, order: block.order - 1 }
          : block
      );

    onChange(updatedBlocks);
  }, [blocks, onChange]);

  const updateBlock = useCallback((updatedBlock: Block) => {
    const updatedBlocks = blocks.map(block =>
      block.id === updatedBlock.id ? updatedBlock : block
    );
    onChange(updatedBlocks);
  }, [blocks, onChange]);

  const moveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    const currentOrder = block.order;
    const targetOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;
    
    // Find the block at target position
    const targetBlock = blocks.find(b => b.order === targetOrder);
    if (!targetBlock) return;

    // Swap orders
    const updatedBlocks = blocks.map(b => {
      if (b.id === blockId) return { ...b, order: targetOrder };
      if (b.id === targetBlock.id) return { ...b, order: currentOrder };
      return b;
    });

    onChange(updatedBlocks);
  }, [blocks, onChange]);

  const handleAddBlockBetween = useCallback((event: React.MouseEvent, afterOrder: number) => {
    if (readonly) return;
    
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setSelectorPosition({ x: rect.left, y: rect.bottom + 5 });
    setInsertPosition(afterOrder + 1);
    setShowBlockSelector(true);
  }, [readonly]);

  const handleAddBlockAtEnd = useCallback((event: React.MouseEvent) => {
    if (readonly) return;
    
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setSelectorPosition({ x: rect.left, y: rect.top });
    setInsertPosition(blocks.length);
    setShowBlockSelector(true);
  }, [readonly, blocks.length]);

  const handleBlockTypeSelect = useCallback((blockType: string) => {
    addBlock(blockType, insertPosition);
    setShowBlockSelector(false);
  }, [addBlock, insertPosition]);

  // Initialize with one empty text block if no blocks exist
  useEffect(() => {
    if (blocks.length === 0 && !readonly) {
      onChange([createTextBlock()]);
    }
  }, [blocks.length, onChange, readonly]);

  return (
    <div className={cn("space-y-4", className)} data-testid="block-manager">
      {/* Blocks */}
      {sortedBlocks.map((block, index) => (
        <div key={block.id} className="relative">
          {/* Block Content */}
          {block.type === 'text' ? (
            <TextBlock
              block={block as TextBlockType}
              onChange={updateBlock}
              onDelete={() => deleteBlock(block.id)}
              onMoveUp={index > 0 ? () => moveBlock(block.id, 'up') : undefined}
              onMoveDown={index < sortedBlocks.length - 1 ? () => moveBlock(block.id, 'down') : undefined}
              readonly={readonly}
              autoFocus={index === sortedBlocks.length - 1} // Auto-focus last added block
            />
          ) : block.type === 'image' ? (
            <ImageBlock
              block={block as ImageBlockType}
              onChange={updateBlock}
              onDelete={() => deleteBlock(block.id)}
              onMoveUp={index > 0 ? () => moveBlock(block.id, 'up') : undefined}
              onMoveDown={index < sortedBlocks.length - 1 ? () => moveBlock(block.id, 'down') : undefined}
              readonly={readonly}
            />
          ) : null}

          {/* Add Block Button Between Blocks */}
          {!readonly && index < sortedBlocks.length - 1 && (
            <div className="flex justify-center my-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleAddBlockBetween(e, block.order)}
                className="h-8 w-8 p-0 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-400 hover:text-gray-600"
                title="Lägg till block"
                data-testid={`add-block-after-${block.id}`}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ))}

      {/* Add Block at End */}
      {!readonly && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleAddBlockAtEnd}
            className="flex items-center gap-2"
            data-testid="add-block-end"
          >
            <Plus className="h-4 w-4" />
            Lägg till block
          </Button>
        </div>
      )}

      {/* Empty State */}
      {blocks.length === 0 && readonly && (
        <div className="text-center py-12 text-gray-500">
          <p>Inget innehåll att visa</p>
        </div>
      )}

      {/* Block Type Selector */}
      <BlockTypeSelector
        show={showBlockSelector}
        position={selectorPosition}
        onSelect={handleBlockTypeSelect}
        onClose={() => setShowBlockSelector(false)}
      />
    </div>
  );
}