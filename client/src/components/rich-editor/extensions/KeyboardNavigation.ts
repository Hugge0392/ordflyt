import { Extension } from '@tiptap/core';
import { Editor } from '@tiptap/core';
import { TextSelection, NodeSelection } from '@tiptap/pm/state';
import { ResolvedPos, Node } from '@tiptap/pm/model';

export interface KeyboardNavigationOptions {
  // Enable/disable specific shortcuts
  enableArrowNavigation: boolean;
  enableEnterHandling: boolean;
  enableEscapeHandling: boolean;
  enableBlockShortcuts: boolean;
}

// Helper functions defined outside the extension context
const isBlockNode = (node: Node): boolean => {
  return node && node.isBlock && node.type.name !== 'doc';
};

const getTextPositionInBlock = (blockPos: number, blockNode: Node): number => {
  try {
    // For text blocks (paragraph, heading), position at start of text content
    if (blockNode.type.name === 'paragraph' || blockNode.type.name.startsWith('heading')) {
      return blockPos + 1; // Position after the opening tag
    }
    
    // For image nodes, position just after the node
    if (blockNode.type.name === 'image') {
      return blockPos + blockNode.nodeSize;
    }
    
    // For other block nodes, try to find first text content
    if (blockNode.content && blockNode.content.size > 0) {
      return blockPos + 1;
    }
    
    // Fallback: position at start of block
    return blockPos;
  } catch (error) {
    console.warn('Error calculating text position in block:', error);
    return blockPos;
  }
};

const findBlockPosition = (editor: Editor, currentPos: ResolvedPos, direction: 'up' | 'down'): number | null => {
  const { state } = editor;
  const doc = state.doc;
  
  // Start from current block - find the actual block depth
  let blockDepth = currentPos.depth;
  
  // Find the current block at the appropriate depth
  while (blockDepth > 0 && !isBlockNode(currentPos.node(blockDepth))) {
    blockDepth--;
  }
  
  // Fix: Handle the common case where text cursors live at depth 1, not 0
  if (blockDepth >= 1) {
    // Get the parent container and current block index within it
    const parentDepth = blockDepth - 1;
    const parent = currentPos.node(parentDepth);
    const currentBlockIndex = currentPos.index(parentDepth);
    
    if (direction === 'down') {
      // Look for next block at same level
      if (currentBlockIndex + 1 < parent.childCount) {
        const nextBlock = parent.child(currentBlockIndex + 1);
        // Calculate absolute position of next block
        const parentStart = currentPos.start(parentDepth);
        let nextBlockPos = parentStart;
        
        // Sum up sizes of all previous siblings
        for (let i = 0; i <= currentBlockIndex; i++) {
          nextBlockPos += parent.child(i).nodeSize;
        }
        
        return getTextPositionInBlock(nextBlockPos, nextBlock);
      }
    } else {
      // Look for previous block at same level
      if (currentBlockIndex > 0) {
        const prevBlock = parent.child(currentBlockIndex - 1);
        // Calculate absolute position of previous block
        const parentStart = currentPos.start(parentDepth);
        let prevBlockPos = parentStart;
        
        // Sum up sizes of all previous siblings
        for (let i = 0; i < currentBlockIndex - 1; i++) {
          prevBlockPos += parent.child(i).nodeSize;
        }
        
        return getTextPositionInBlock(prevBlockPos, prevBlock);
      }
    }
  } else if (blockDepth === 0) {
    // Fallback: We're at the document level, look for blocks directly
    const currentBlockIndex = currentPos.index(0);
    
    if (direction === 'down') {
      // Look for next block
      if (currentBlockIndex + 1 < doc.childCount) {
        const nextBlock = doc.child(currentBlockIndex + 1);
        let nextBlockPos = 1; // Start of document
        
        // Calculate position of next block
        for (let i = 0; i <= currentBlockIndex; i++) {
          nextBlockPos += doc.child(i).nodeSize;
        }
        
        return getTextPositionInBlock(nextBlockPos, nextBlock);
      }
    } else {
      // Look for previous block
      if (currentBlockIndex > 0) {
        const prevBlock = doc.child(currentBlockIndex - 1);
        let prevBlockPos = 1; // Start of document
        
        // Calculate position of previous block
        for (let i = 0; i < currentBlockIndex - 1; i++) {
          prevBlockPos += doc.child(i).nodeSize;
        }
        
        return getTextPositionInBlock(prevBlockPos, prevBlock);
      }
    }
  }
  
  return null;
};

const handleArrowNavigation = (editor: Editor, direction: 'up' | 'down'): boolean => {
  const { state, view } = editor;
  const { selection } = state;
  
  // Handle NodeSelection (e.g., images) first
  if (selection instanceof NodeSelection) {
    const selectedNode = selection.node;
    
    if (selectedNode.type.name === 'image') {
      // For images, use sibling navigation to find next/previous text block
      const $pos = state.doc.resolve(selection.from);
      const targetPos = findBlockPosition(editor, $pos, direction);
      
      if (targetPos !== null && targetPos >= 0 && targetPos <= state.doc.content.size) {
        try {
          const $targetPos = state.doc.resolve(targetPos);
          const newSelection = TextSelection.near($targetPos);
          const tr = state.tr.setSelection(newSelection);
          view.dispatch(tr);
          return true;
        } catch (error) {
          console.warn('Error during NodeSelection arrow navigation:', error);
          return false;
        }
      }
    }
    
    return false; // Let normal behavior handle other NodeSelections
  }
  
  // Handle TextSelection
  const { $from } = selection;
  
  // Only handle if we're at the beginning/end of current block
  const isAtBlockBoundary = direction === 'up' 
    ? $from.parentOffset === 0 
    : $from.parentOffset === $from.parent.content.size;
  
  if (!isAtBlockBoundary) {
    return false; // Let normal arrow behavior handle
  }
  
  const targetPos = findBlockPosition(editor, $from, direction);
  
  if (targetPos !== null && targetPos >= 0 && targetPos <= state.doc.content.size) {
    try {
      const $targetPos = state.doc.resolve(targetPos);
      const newSelection = TextSelection.near($targetPos);
      const tr = state.tr.setSelection(newSelection);
      view.dispatch(tr);
      return true;
    } catch (error) {
      console.warn('Error during arrow navigation:', error);
      return false;
    }
  }
  
  return false; // Let normal behavior handle
};

const handleEnterKey = (editor: Editor): boolean => {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;
  
  // Check if we're after an image node
  const beforePos = $from.pos - 1;
  if (beforePos >= 0) {
    const beforeNode = state.doc.nodeAt(beforePos);
    if (beforeNode && beforeNode.type.name === 'image') {
      // Harmonize with BlockNormalization: check if paragraph already exists
      const afterImagePos = beforePos + beforeNode.nodeSize;
      
      // Check if there's already a paragraph after the image
      const nodeAfter = state.doc.nodeAt(afterImagePos);
      if (nodeAfter && nodeAfter.type.name === 'paragraph') {
        // BlockNormalization already created a paragraph, just position cursor there
        const newSelection = TextSelection.near(state.doc.resolve(afterImagePos + 1));
        const tr = state.tr.setSelection(newSelection);
        editor.view.dispatch(tr);
        return true;
      } else {
        // Create a new paragraph after the image
        const newParagraph = state.schema.nodes.paragraph.create();
        const tr = state.tr.insert(afterImagePos, newParagraph);
        // Position cursor in the new paragraph
        const newSelection = TextSelection.near(tr.doc.resolve(afterImagePos + 1));
        tr.setSelection(newSelection);
        editor.view.dispatch(tr);
        return true;
      }
    }
  }
  
  // Check if we're in an empty paragraph at the end of document
  if ($from.parent.type.name === 'paragraph' && 
      $from.parent.content.size === 0 && 
      $from.after() === state.doc.content.size) {
    // Allow normal enter behavior to create new paragraph
    return false;
  }
  
  // Let normal Enter behavior handle other cases
  return false;
};

const handleEscapeKey = (editor: Editor): boolean => {
  const { state, view } = editor;
  const { selection } = state;
  
  // If we have a NodeSelection (e.g., image selected), deselect and move to next text
  if (selection instanceof NodeSelection) {
    const selectedNode = selection.node;
    
    if (selectedNode.type.name === 'image') {
      // Find the next paragraph after the image using our sibling navigation
      const $pos = state.doc.resolve(selection.from);
      const targetPos = findBlockPosition(editor, $pos, 'down');
      
      if (targetPos !== null) {
        try {
          const newSelection = TextSelection.near(state.doc.resolve(targetPos));
          const tr = state.tr.setSelection(newSelection);
          view.dispatch(tr);
          return true;
        } catch (error) {
          console.warn('Error handling escape from image:', error);
        }
      }
      
      // Fallback: position cursor after the image
      try {
        const afterImagePos = selection.to;
        const newSelection = TextSelection.near(state.doc.resolve(afterImagePos));
        const tr = state.tr.setSelection(newSelection);
        view.dispatch(tr);
        return true;
      } catch (error) {
        console.warn('Error handling escape fallback:', error);
      }
    }
    
    // For other node selections, just deselect
    const newSelection = TextSelection.near(state.doc.resolve(selection.to));
    const tr = state.tr.setSelection(newSelection);
    view.dispatch(tr);
    return true;
  }
  
  return false; // Let other escape handlers work
};

const handleModEnter = (editor: Editor): boolean => {
  const { state, view } = editor;
  const { selection } = state;
  const { $from } = selection;
  
  // Find the end of the current block
  const currentBlockEnd = $from.after($from.depth);
  
  // Create a new paragraph after the current block
  const newParagraph = state.schema.nodes.paragraph.create();
  const tr = state.tr.insert(currentBlockEnd, newParagraph);
  
  // Position cursor in the new paragraph
  const newSelection = TextSelection.near(tr.doc.resolve(currentBlockEnd + 1));
  tr.setSelection(newSelection);
  view.dispatch(tr);
  
  return true;
};

const handleBackspace = (editor: Editor): boolean => {
  const { state, view } = editor;
  const { selection } = state;
  const { $from } = selection;
  
  // Only handle if we're at the start of an empty paragraph
  if ($from.parentOffset !== 0 || 
      $from.parent.type.name !== 'paragraph' || 
      $from.parent.content.size !== 0) {
    return false; // Let normal backspace handle
  }
  
  // Don't delete the only paragraph in the document
  if (state.doc.childCount === 1) {
    return false;
  }
  
  // Find previous block to merge with or position cursor
  const prevBlockPos = findBlockPosition(editor, $from, 'up');
  
  if (prevBlockPos !== null) {
    // Delete the empty paragraph
    const blockStart = $from.before();
    const blockEnd = $from.after();
    const tr = state.tr.delete(blockStart, blockEnd);
    
    // Position cursor at the end of previous block
    const newSelection = TextSelection.near(tr.doc.resolve(prevBlockPos));
    tr.setSelection(newSelection);
    view.dispatch(tr);
    return true;
  }
  
  return false;
};

const handleDelete = (editor: Editor): boolean => {
  const { state, view } = editor;
  const { selection } = state;
  const { $from } = selection;
  
  // Only handle if we're at the start of an empty paragraph
  if ($from.parentOffset !== 0 || 
      $from.parent.type.name !== 'paragraph' || 
      $from.parent.content.size !== 0) {
    return false; // Let normal delete handle
  }
  
  // Don't delete the only paragraph in the document
  if (state.doc.childCount === 1) {
    return false;
  }
  
  // Find next block to position cursor
  const nextBlockPos = findBlockPosition(editor, $from, 'down');
  
  if (nextBlockPos !== null) {
    // Delete the empty paragraph
    const blockStart = $from.before();
    const blockEnd = $from.after();
    const tr = state.tr.delete(blockStart, blockEnd);
    
    // Position cursor at the start of next block
    const newSelection = TextSelection.near(tr.doc.resolve(nextBlockPos - (blockEnd - blockStart)));
    tr.setSelection(newSelection);
    view.dispatch(tr);
    return true;
  }
  
  return false;
};

export const KeyboardNavigation = Extension.create<KeyboardNavigationOptions>({
  name: 'keyboardNavigation',
  
  // Fix: Set high priority to ensure our handlers win over StarterKit defaults
  priority: 1000,

  addOptions() {
    return {
      enableArrowNavigation: true,
      enableEnterHandling: true,
      enableEscapeHandling: true,
      enableBlockShortcuts: true,
    };
  },

  addKeyboardShortcuts() {
    return {
      // Arrow navigation between blocks
      ...(this.options.enableArrowNavigation && {
        'ArrowUp': ({ editor }: { editor: Editor }) => {
          return handleArrowNavigation(editor, 'up');
        },
        'ArrowDown': ({ editor }: { editor: Editor }) => {
          return handleArrowNavigation(editor, 'down');
        },
      }),

      // Enter handling for block creation
      ...(this.options.enableEnterHandling && {
        'Enter': ({ editor }: { editor: Editor }) => {
          return handleEnterKey(editor);
        },
      }),

      // Escape handling for block selection
      ...(this.options.enableEscapeHandling && {
        'Escape': ({ editor }: { editor: Editor }) => {
          return handleEscapeKey(editor);
        },
      }),

      // Additional block shortcuts
      ...(this.options.enableBlockShortcuts && {
        'Mod-Enter': ({ editor }: { editor: Editor }) => {
          return handleModEnter(editor);
        },
        'Backspace': ({ editor }: { editor: Editor }) => {
          return handleBackspace(editor);
        },
        'Delete': ({ editor }: { editor: Editor }) => {
          return handleDelete(editor);
        },
      }),
    };
  },

  addCommands() {
    return {
      navigateToNextBlock:
        () =>
        ({ editor, tr, dispatch }: any) => {
          if (dispatch) {
            return handleArrowNavigation(editor, 'down');
          }
          return true;
        },
      navigateToPreviousBlock:
        () =>
        ({ editor, tr, dispatch }: any) => {
          if (dispatch) {
            return handleArrowNavigation(editor, 'up');
          }
          return true;
        },
      createBlockAfterCurrent:
        () =>
        ({ editor, tr, dispatch }: any) => {
          if (dispatch) {
            return handleModEnter(editor);
          }
          return true;
        },
    } as any;
  },
});