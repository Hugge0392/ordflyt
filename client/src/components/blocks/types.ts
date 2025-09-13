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

// Content conversion utilities
export const blocksToRichDoc = (blocks: Block[]) => {
  const content = [...blocks]
    .sort((a, b) => a.order - b.order)
    .map(block => {
      if (block.type === 'text' && block.data.content) {
        return block.data.content.content || [];
      }
      if (block.type === 'image') {
        return [{
          type: 'image',
          attrs: {
            src: block.data.src,
            alt: block.data.alt || '',
            title: block.data.caption || null
          }
        }];
      }
      return [];
    })
    .flat();

  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }]
  };
};

export const richDocToBlocks = (richDoc: any): Block[] => {
  if (!richDoc?.content) {
    return [createTextBlock()];
  }

  const blocks: Block[] = [];
  let currentTextContent: any[] = [];
  let order = 0;

  const flushTextBlock = () => {
    if (currentTextContent.length > 0) {
      blocks.push(createTextBlock({
        content: {
          type: 'doc',
          content: currentTextContent
        }
      }, order++));
      currentTextContent = [];
    }
  };

  richDoc.content.forEach((node: any) => {
    if (node.type === 'image') {
      // Flush any accumulated text content
      flushTextBlock();
      
      // Create image block
      blocks.push(createImageBlock({
        src: node.attrs.src,
        alt: node.attrs.alt || '',
        caption: node.attrs.title || ''
      }, order++));
    } else {
      // Accumulate text content
      currentTextContent.push(node);
    }
  });

  // Flush any remaining text content
  flushTextBlock();

  // Always have at least one block
  if (blocks.length === 0) {
    blocks.push(createTextBlock());
  }

  return blocks;
};

// Validation function to test conversion fidelity
export const validateConversionFidelity = () => {
  // Test case: mixed text and image blocks
  const testBlocks: Block[] = [
    createTextBlock({
      content: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Test Heading' }] }
        ]
      }
    }, 0),
    createImageBlock({
      src: '/test/image.jpg',
      alt: 'Test image',
      caption: 'Test caption'
    }, 1),
    createTextBlock({
      content: {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Test paragraph' }] }
        ]
      }
    }, 2)
  ];

  // Convert blocks to rich doc
  const richDoc = blocksToRichDoc(testBlocks);
  
  // Convert back to blocks
  const convertedBlocks = richDocToBlocks(richDoc);

  // Validation checks
  const validations = {
    blockCountPreserved: convertedBlocks.length === testBlocks.length,
    imageBlockSeparated: convertedBlocks.some(block => block.type === 'image'),
    textBlocksSeparated: convertedBlocks.filter(block => block.type === 'text').length === 2,
    imagePropertiesPreserved: (() => {
      const imageBlock = convertedBlocks.find(block => block.type === 'image') as ImageBlock;
      return imageBlock && 
             imageBlock.data.src === '/test/image.jpg' &&
             imageBlock.data.alt === 'Test image' &&
             imageBlock.data.caption === 'Test caption';
    })(),
    orderingPreserved: convertedBlocks.every((block, index) => block.order === index)
  };

  const allValid = Object.values(validations).every(v => v);
  
  if (!allValid) {
    console.warn('Conversion fidelity validation failed:', validations);
    console.log('Original blocks:', testBlocks);
    console.log('Rich doc:', richDoc);
    console.log('Converted blocks:', convertedBlocks);
  }

  return {
    valid: allValid,
    details: validations,
    testData: { testBlocks, richDoc, convertedBlocks }
  };
};