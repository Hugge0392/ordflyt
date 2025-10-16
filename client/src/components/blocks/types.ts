export interface BaseBlock {
  id: string;
  type: string;
  order: number;
}

export interface TextBlockData {
  content?: any; // Tiptap JSONContent
  htmlContent?: string; // Fallback HTML
}

export interface ImageBlockData {
  src?: string; // Make src optional to allow empty image blocks
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  alignment?: 'left' | 'center' | 'right';
  size?: 'small' | 'medium' | 'large' | 'original';
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  data: TextBlockData;
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  data: ImageBlockData;
}

export type Block = TextBlock | ImageBlock;

export interface BlockManagerProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  readonly?: boolean;
  className?: string;
}

export interface BlockTypeOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
}

export interface BlockTypeSelectorProps {
  onSelect: (blockType: string) => void;
  onClose: () => void;
  position?: { x: number; y: number };
  show: boolean;
}

export interface TextBlockProps {
  block: TextBlock;
  onChange: (block: TextBlock) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  readonly?: boolean;
  autoFocus?: boolean;
}

export interface ImageBlockProps {
  block: ImageBlock;
  onChange: (block: ImageBlock) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  readonly?: boolean;
}

// Utility types for creating new blocks
export type CreateTextBlockData = Partial<TextBlockData>;
export type CreateImageBlockData = Partial<ImageBlockData>;

// Helper functions
export const createTextBlock = (data: CreateTextBlockData = {}, order: number = 0): TextBlock => ({
  id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type: 'text',
  order,
  data: {
    content: data.content || {
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }]
    },
    htmlContent: data.htmlContent || '',
    ...data
  }
});

export const createImageBlock = (data: CreateImageBlockData, order: number = 0): ImageBlock => ({
  id: `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type: 'image',
  order,
  data: {
    alignment: 'center',
    size: 'medium',
    ...data
  }
});

// Note: Content conversion utilities are now in @/lib/content-converter.ts
// Import { blocksToRichDoc, richDocToBlocks } from '@/lib/content-converter'
// for actual conversion functions