import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Transaction } from '@tiptap/pm/state';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Gapcursor from '@tiptap/extension-gapcursor';
import Dropcursor from '@tiptap/extension-dropcursor';
import { ImageExtension } from './extensions/ImageExtension';
import { useEffect, useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { EditorToolbar } from './EditorToolbar.tsx';
import { SlashMenu } from './SlashMenu.tsx';
import { BlockInsertButton } from './components/BlockInsertButton';
import { BlockDragHandle } from './components/BlockDragHandle';
import { RichDocEditorProps } from './types.ts';
import { Button } from '@/components/ui/button';
import { useImageUpload } from './components/ImageUploadHandler';

export function RichDocEditor({
  content,
  onChange,
  placeholder = 'Börja skriva...',
  className,
  editable = true,
  autoFocus = false,
}: RichDocEditorProps) {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Block UI state
  const [hoveredBlock, setHoveredBlock] = useState<number | null>(null);
  const [showBlockInsert, setShowBlockInsert] = useState(false);
  const [insertPosition, setInsertPosition] = useState({ x: 0, y: 0, pos: 0 });
  const [showDragHandle, setShowDragHandle] = useState(false);
  const [dragHandlePosition, setDragHandlePosition] = useState({ x: 0, y: 0 });
  const editorRef = useRef<HTMLDivElement>(null);
  const [draggedBlockPos, setDraggedBlockPos] = useState<number | null>(null);
  const [dropZonePosition, setDropZonePosition] = useState<{ pos: number; y: number } | null>(null);
  const [isDraggingBlock, setIsDraggingBlock] = useState(false);

  // Block Normalization Extension - ensures paragraphs around images
  const BlockNormalization = Extension.create({
    name: 'blockNormalization',

    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey('blockNormalization'),
          appendTransaction(transactions: readonly Transaction[], oldState, newState) {
            // Skip if no transactions that could affect structure
            if (!transactions.some(tr => tr.docChanged)) return null;
            
            const tr = newState.tr;
            let modified = false;
            const addedPositions = new Set<number>();

            try {
              newState.doc.descendants((node, pos) => {
                // If we find an image node
                if (node.type.name === 'image') {
                  const $pos = newState.doc.resolve(pos);
                  
                  // Only add paragraphs if we're in a context that allows them
                  if ($pos.parent.type.name === 'doc' || $pos.parent.type.name === 'blockquote') {
                    // Check if there's a paragraph before
                    if ($pos.index() === 0 || $pos.nodeBefore?.type.name !== 'paragraph') {
                      if (!addedPositions.has(pos)) {
                        const paragraphBefore = newState.schema.nodes.paragraph.create();
                        tr.insert(pos, paragraphBefore);
                        addedPositions.add(pos);
                        modified = true;
                      }
                    }
                    
                    // Check if there's a paragraph after (with position adjustment)
                    const afterPos = pos + node.nodeSize;
                    if (afterPos <= newState.doc.content.size) {
                      const $afterPos = newState.doc.resolve(afterPos);
                      if ($afterPos.index() === $afterPos.parent.childCount || $afterPos.nodeAfter?.type.name !== 'paragraph') {
                        if (!addedPositions.has(afterPos)) {
                          const paragraphAfter = newState.schema.nodes.paragraph.create();
                          tr.insert(afterPos, paragraphAfter);
                          addedPositions.add(afterPos);
                          modified = true;
                        }
                      }
                    }
                  }
                }
              });
            } catch (error) {
              // If there's any error in the transformation, skip it to avoid schema violations
              console.warn('BlockNormalization: Skipping transformation due to error:', error);
              return null;
            }

            return modified ? tr : null;
          },
        }),
      ];
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'Rubrik...';
          }
          return placeholder;
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Gapcursor,
      Dropcursor.configure({
        color: '#3b82f6',
        width: 2,
        class: 'dropcursor',
      }),
      BlockNormalization,
      ImageExtension,
    ],
    content: content || {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [],
        },
      ],
    },
    editable,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: 'focus:outline-none prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none',
        'data-testid': 'rich-editor-content',
      },
    },
    parseOptions: {
      preserveWhitespace: 'full',
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        const json = editor.getJSON();
        onChange(json);
      }
    },
    onCreate: ({ editor }) => {
      // Handle slash command detection
      editor.on('selectionUpdate', () => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        
        // Check if user typed "/"
        const textBefore = $from.nodeBefore?.textContent || '';
        const currentText = state.doc.textBetween($from.pos - 10, $from.pos, '\n', ' ');
        
        if (currentText.includes('/') && currentText.slice(-1) !== ' ') {
          const coords = editor.view.coordsAtPos($from.pos);
          setSlashMenuPosition({ x: coords.left, y: coords.bottom });
          setShowSlashMenu(true);
        } else {
          setShowSlashMenu(false);
        }
      });
    },
  });

  // Update content when prop changes
  useEffect(() => {
    if (editor && content && editor.getJSON() !== content) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  const hideSlashMenu = useCallback(() => {
    setShowSlashMenu(false);
  }, []);

  // Block UI event handlers
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!editor || !editorRef.current || !editable) return;
    
    const editorElement = editorRef.current;
    const proseMirrorElement = editorElement.querySelector('.ProseMirror');
    if (!proseMirrorElement) return;
    
    const rect = editorElement.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const relativeX = e.clientX - rect.left;
    
    // Find block elements within the editor
    const blockElements = proseMirrorElement.querySelectorAll(':scope > *');
    let foundInsertPosition = false;
    let foundBlockPosition = false;
    
    // Check if hovering in gap before first block
    if (blockElements.length > 0) {
      const firstBlock = blockElements[0];
      const firstBlockRect = firstBlock.getBoundingClientRect();
      const firstBlockTop = firstBlockRect.top - rect.top;
      const firstBlockLeft = firstBlockRect.left - rect.left;
      const proseMirrorRect = proseMirrorElement.getBoundingClientRect();
      const proseMirrorTop = proseMirrorRect.top - rect.top;
      
      // Check for gap before first block (between proseMirror start and first block)
      if (relativeY >= proseMirrorTop && relativeY < firstBlockTop && firstBlockTop - proseMirrorTop > 5) {
        // Insert at document start
        const insertPos = 1; // Position after document node, before first child
        
        setShowBlockInsert(true);
        setInsertPosition({
          x: firstBlockLeft - 20,
          y: (proseMirrorTop + firstBlockTop) / 2 - 10,
          pos: insertPos
        });
        foundInsertPosition = true;
      }
    }
    
    blockElements.forEach((block, index) => {
      const blockRect = block.getBoundingClientRect();
      const blockTop = blockRect.top - rect.top;
      const blockBottom = blockRect.bottom - rect.top;
      const blockLeft = blockRect.left - rect.left;
      
      // Check if hovering over a block (for drag handle)
      if (relativeY >= blockTop && relativeY <= blockBottom && 
          relativeX >= blockLeft && relativeX <= blockLeft + blockRect.width) {
        // Get ProseMirror position for this block
        const blockPos = editor.view.posAtDOM(block, 0);
        setHoveredBlock(blockPos);
        setShowDragHandle(true);
        setDragHandlePosition({
          x: blockLeft - 30, // Position to the left of the block
          y: blockTop + 8
        });
        foundBlockPosition = true;
      }
      
      // Check if hovering in gap between blocks (for insert button)
      const nextBlock = blockElements[index + 1];
      if (nextBlock) {
        const nextBlockRect = nextBlock.getBoundingClientRect();
        const nextBlockTop = nextBlockRect.top - rect.top;
        const gapStart = blockBottom;
        const gapEnd = nextBlockTop;
        
        if (relativeY >= gapStart && relativeY <= gapEnd && gapEnd - gapStart > 5) {
          // Calculate the correct ProseMirror position for insertion
          // Position after current block = block start + block size
          const blockPos = editor.view.posAtDOM(block, 0);
          const resolvedPos = editor.state.doc.resolve(blockPos);
          const insertPos = resolvedPos.after();
          
          setShowBlockInsert(true);
          setInsertPosition({
            x: blockLeft - 20,
            y: (gapStart + gapEnd) / 2 - 10,
            pos: insertPos
          });
          foundInsertPosition = true;
        }
      } else if (index === blockElements.length - 1) {
        // Handle gap after the last block
        const gapStart = blockBottom;
        const editorBottom = proseMirrorElement.getBoundingClientRect().bottom - rect.top;
        
        if (relativeY >= gapStart && relativeY <= editorBottom) {
          // Insert at the end of the document
          const blockPos = editor.view.posAtDOM(block, 0);
          const resolvedPos = editor.state.doc.resolve(blockPos);
          const insertPos = resolvedPos.after();
          
          setShowBlockInsert(true);
          setInsertPosition({
            x: blockLeft - 20,
            y: gapStart + 10,
            pos: insertPos
          });
          foundInsertPosition = true;
        }
      }
    });
    
    // Hide controls if not hovering over relevant areas
    if (!foundInsertPosition) {
      setShowBlockInsert(false);
    }
    if (!foundBlockPosition) {
      setShowDragHandle(false);
      setHoveredBlock(null);
    }
  }, [editor, editable]);
  
  const handleMouseLeave = useCallback(() => {
    setShowBlockInsert(false);
    setShowDragHandle(false);
    setHoveredBlock(null);
  }, []);
  
  // Custom image insertion at specific position
  const insertImageAtPosition = useCallback(async (file: File, position: number) => {
    if (!editor) return;
    
    try {
      // Use the existing image upload functionality but with custom positioning
      const formData = new FormData();
      formData.append('file', file, file.name);
      
      const response = await fetch('/api/upload-direct', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const { objectPath } = await response.json();
      
      // Insert image at specific position
      editor.chain()
        .focus()
        .setTextSelection(position)
        .insertImageBlock({
          src: objectPath,
          alt: file.name.replace(/\.[^/.]+$/, ''),
        })
        .run();
        
    } catch (error) {
      console.error('Image upload error:', error);
    }
  }, [editor]);

  const handleInsertBlock = useCallback((blockType: string) => {
    if (!editor) return;
    
    // Get the position where to insert the new block
    const pos = insertPosition.pos;
    
    // Focus editor and set cursor position
    editor.view.focus();
    
    // Handle image insertion specially
    if (blockType === 'image') {
      // Open file dialog for image insertion at gap position
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpg,image/jpeg,image/webp,image/gif';
      input.multiple = false;
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files[0]) {
          insertImageAtPosition(files[0], pos);
        }
      };
      input.click();
      setShowBlockInsert(false);
      return;
    }
    
    // Insert different types of blocks based on selection
    switch (blockType) {
      case 'paragraph':
        editor.chain().focus().insertContentAt(pos, { type: 'paragraph' }).run();
        break;
      case 'heading1':
        editor.chain().focus().insertContentAt(pos, { type: 'heading', attrs: { level: 1 } }).run();
        break;
      case 'heading2':
        editor.chain().focus().insertContentAt(pos, { type: 'heading', attrs: { level: 2 } }).run();
        break;
      case 'heading3':
        editor.chain().focus().insertContentAt(pos, { type: 'heading', attrs: { level: 3 } }).run();
        break;
      case 'bulletList':
        editor.chain().focus().insertContentAt(pos, { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] }).run();
        break;
      case 'orderedList':
        editor.chain().focus().insertContentAt(pos, { type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] }).run();
        break;
      case 'blockquote':
        editor.chain().focus().insertContentAt(pos, { type: 'blockquote', content: [{ type: 'paragraph' }] }).run();
        break;
      case 'codeBlock':
        editor.chain().focus().insertContentAt(pos, { type: 'codeBlock' }).run();
        break;
      case 'table':
        editor.chain().focus().setTextSelection(pos).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        break;
      case 'divider':
        editor.chain().focus().insertContentAt(pos, { type: 'horizontalRule' }).run();
        break;
      default:
        editor.chain().focus().insertContentAt(pos, { type: 'paragraph' }).run();
    }
    
    setShowBlockInsert(false);
  }, [editor, insertPosition, insertImageAtPosition]);
  
  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (!editor || hoveredBlock === null) return;
    
    setDraggedBlockPos(hoveredBlock);
    setIsDraggingBlock(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', hoveredBlock.toString());
    
    // Store the block's ProseMirror position and content for the drop
    const resolvedPos = editor.state.doc.resolve(hoveredBlock);
    const blockNode = resolvedPos.parent;
    e.dataTransfer.setData('application/json', JSON.stringify({
      pos: hoveredBlock,
      content: blockNode.toJSON()
    }));
  }, [editor, hoveredBlock]);
  
  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedBlockPos(null);
    setIsDraggingBlock(false);
    setDropZonePosition(null);
  }, []);

  const handleBlockDragOver = useCallback((e: React.DragEvent) => {
    if (!editor || !isDraggingBlock) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const editorElement = editorRef.current;
    const proseMirrorElement = editorElement?.querySelector('.ProseMirror');
    if (!proseMirrorElement || !editorElement) return;
    
    const rect = editorElement.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    
    // Find drop zones between blocks
    const blockElements = proseMirrorElement.querySelectorAll(':scope > *');
    let foundDropZone = false;
    
    blockElements.forEach((block, index) => {
      const blockRect = block.getBoundingClientRect();
      const blockTop = blockRect.top - rect.top;
      const blockBottom = blockRect.bottom - rect.top;
      
      // Check gap before this block
      if (index === 0 && relativeY < blockTop) {
        // Drop at beginning of document
        const blockPos = editor.view.posAtDOM(block, 0);
        const resolvedPos = editor.state.doc.resolve(blockPos);
        setDropZonePosition({ pos: resolvedPos.before(), y: blockTop - 5 });
        foundDropZone = true;
      }
      
      // Check gap after this block
      const nextBlock = blockElements[index + 1];
      if (nextBlock) {
        const nextBlockRect = nextBlock.getBoundingClientRect();
        const nextBlockTop = nextBlockRect.top - rect.top;
        const gapStart = blockBottom;
        const gapEnd = nextBlockTop;
        
        if (relativeY >= gapStart && relativeY <= gapEnd) {
          const blockPos = editor.view.posAtDOM(block, 0);
          const resolvedPos = editor.state.doc.resolve(blockPos);
          setDropZonePosition({ pos: resolvedPos.after(), y: (gapStart + gapEnd) / 2 });
          foundDropZone = true;
        }
      } else if (index === blockElements.length - 1 && relativeY > blockBottom) {
        // Drop at end of document
        const blockPos = editor.view.posAtDOM(block, 0);
        const resolvedPos = editor.state.doc.resolve(blockPos);
        setDropZonePosition({ pos: resolvedPos.after(), y: blockBottom + 5 });
        foundDropZone = true;
      }
    });
    
    if (!foundDropZone) {
      setDropZonePosition(null);
    }
  }, [editor, isDraggingBlock]);

  const handleBlockDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    if (!editor || !dropZonePosition || !isDraggingBlock) {
      setDropZonePosition(null);
      setIsDraggingBlock(false);
      return;
    }
    
    try {
      const dragData = e.dataTransfer.getData('application/json');
      if (!dragData) return;
      
      const { pos: sourcePos } = JSON.parse(dragData);
      const targetPos = dropZonePosition.pos;
      
      // Don't move if dropping in the same position
      if (Math.abs(sourcePos - targetPos) < 2) {
        setDropZonePosition(null);
        setIsDraggingBlock(false);
        return;
      }
      
      // Get the source block node with error checking
      const sourceResolvedPos = editor.state.doc.resolve(sourcePos);
      const sourceNode = sourceResolvedPos.parent;
      const sourceStart = sourceResolvedPos.before();
      const sourceEnd = sourceResolvedPos.after();
      
      // Safeguards for edge cases
      if (sourceStart < 0 || sourceEnd > editor.state.doc.content.size) {
        console.warn('Invalid source position bounds');
        return;
      }
      
      if (targetPos < 0 || targetPos > editor.state.doc.content.size) {
        console.warn('Invalid target position bounds');  
        return;
      }
      
      // Don't allow dropping a block into itself or its immediate vicinity
      if (targetPos >= sourceStart && targetPos <= sourceEnd) {
        setDropZonePosition(null);
        setIsDraggingBlock(false);
        return;
      }
      
      // Calculate actual target position after source removal
      let actualTargetPos = targetPos;
      if (targetPos > sourceEnd) {
        actualTargetPos = targetPos - (sourceEnd - sourceStart);
      }
      
      // Perform the move transaction
      const tr = editor.state.tr;
      
      // Remove the source node
      tr.delete(sourceStart, sourceEnd);
      
      // Insert at target position
      if (actualTargetPos >= 0 && actualTargetPos <= tr.doc.content.size) {
        tr.insert(actualTargetPos, sourceNode);
        
        // Apply the transaction
        editor.view.dispatch(tr);
        
        // Focus the moved block
        setTimeout(() => {
          const newPos = actualTargetPos + 1;
          if (newPos < editor.state.doc.content.size) {
            editor.commands.setTextSelection(newPos);
          }
        }, 0);
      }
    } catch (error) {
      console.warn('Error during block drop:', error);
    } finally {
      setDropZonePosition(null);
      setIsDraggingBlock(false);
      setDraggedBlockPos(null);
    }
  }, [editor, dropZonePosition, isDraggingBlock]);

  // Image upload functionality
  const { dragHandlers } = useImageUpload(editor);

  // Enhanced drag handlers with visual feedback
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
    dragHandlers.onDragEnter(e.nativeEvent as DragEvent);
  }, [dragHandlers]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only hide overlay if we're leaving the editor completely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragHandlers.onDragOver(e.nativeEvent as DragEvent);
  }, [dragHandlers]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragHandlers.onDrop(e.nativeEvent as DragEvent);
  }, [dragHandlers]);

  if (!editor) {
    return (
      <div className={cn("border rounded-lg p-4", className)}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("border rounded-lg overflow-hidden bg-white dark:bg-gray-900", className)}>
      {/* Fixed Toolbar */}
      <EditorToolbar editor={editor} />
      
      {/* Editor Content with Drag & Drop */}
      <div 
        className="relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag Over Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-400 rounded-lg z-10 flex items-center justify-center">
            <div className="text-center">
              <div className="text-blue-600 dark:text-blue-400 font-medium mb-1">
                Släpp bilden här
              </div>
              <div className="text-sm text-blue-500 dark:text-blue-300">
                Bilden kommer att laddas upp och infogas
              </div>
            </div>
          </div>
        )}

        <div 
          ref={editorRef}
          className="relative block-editor-container"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onDragOver={handleBlockDragOver}
          onDrop={handleBlockDrop}
        >
          <EditorContent
            editor={editor}
            className="p-6 min-h-[400px] focus-within:outline-none rich-doc-editor block-editor"
            style={{
              '--tw-prose-body': 'rgb(55 65 81)',
              '--tw-prose-headings': 'rgb(17 24 39)',
              '--tw-prose-lead': 'rgb(75 85 99)',
              '--tw-prose-links': 'rgb(59 130 246)',
              '--tw-prose-bold': 'rgb(17 24 39)',
              '--tw-prose-counters': 'rgb(107 114 128)',
              '--tw-prose-bullets': 'rgb(209 213 219)',
              '--tw-prose-hr': 'rgb(229 231 235)',
              '--tw-prose-quotes': 'rgb(17 24 39)',
              '--tw-prose-quote-borders': 'rgb(229 231 235)',
              '--tw-prose-captions': 'rgb(107 114 128)',
              '--tw-prose-code': 'rgb(17 24 39)',
              '--tw-prose-pre-code': 'rgb(229 231 235)',
              '--tw-prose-pre-bg': 'rgb(55 65 81)',
              '--tw-prose-th-borders': 'rgb(209 213 219)',
              '--tw-prose-td-borders': 'rgb(229 231 235)',
            } as any}
          />
          
          {/* Drop Zone Indicator */}
          {dropZonePosition && isDraggingBlock && (
            <div
              className="absolute left-0 right-0 h-0.5 bg-blue-500 shadow-lg z-30 transition-all duration-150"
              style={{
                top: dropZonePosition.y,
                boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)',
              }}
            >
              <div className="absolute -left-1 -top-1 w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="absolute -right-1 -top-1 w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          )}
          
          {/* Block Insert Button */}
          {editable && (
            <BlockInsertButton
              editor={editor}
              position={insertPosition}
              show={showBlockInsert}
              onInsertBlock={handleInsertBlock}
            />
          )}
          
          {/* Block Drag Handle */}
          {editable && (
            <BlockDragHandle
              position={dragHandlePosition}
              show={showDragHandle}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              blockId={hoveredBlock?.toString()}
            />
          )}
        </div>

        {/* Note: BubbleMenu and FloatingMenu will be added in a future update */}

        {/* Slash Menu */}
        {showSlashMenu && (
          <SlashMenu
            editor={editor}
            show={showSlashMenu}
            position={slashMenuPosition}
            onHide={hideSlashMenu}
          />
        )}
      </div>
    </div>
  );
}