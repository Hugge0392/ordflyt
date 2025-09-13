import { useEffect, useState, useCallback } from 'react';
import { JSONContent } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { BlockManager } from '@/components/blocks';
import { 
  Block, 
  richDocToBlocks, 
  blocksToRichDoc, 
  createTextBlock 
} from '@/components/blocks';
import { RichDocEditorProps } from './types';

export function RichDocEditor({
  content,
  onChange,
  placeholder = 'Börja skriva...',
  className,
  editable = true,
  autoFocus = false,
}: RichDocEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);

  // Convert content to blocks on mount or when content changes
  useEffect(() => {
    if (content) {
      const convertedBlocks = richDocToBlocks(content);
      setBlocks(convertedBlocks);
    } else {
      // Initialize with empty text block if no content
      setBlocks([createTextBlock()]);
    }
  }, [content]);

  // Handle blocks changes and convert back to RichDoc format
  const handleBlocksChange = useCallback((newBlocks: Block[]) => {
    setBlocks(newBlocks);
    
    if (onChange) {
      const richDoc = blocksToRichDoc(newBlocks);
      onChange(richDoc);
    }
  }, [onChange]);

  return (
    <div 
      className={cn(
        "w-full",
        className
      )}
      data-testid="rich-doc-editor"
    >
      <BlockManager
        blocks={blocks}
        onChange={handleBlocksChange}
        readonly={!editable}
        className="min-h-[200px]"
      />
    </div>
  );
}