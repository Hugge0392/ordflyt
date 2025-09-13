import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { ImageExtension } from './extensions/ImageExtension';
import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { EditorToolbar } from './EditorToolbar.tsx';
import { SlashMenu } from './SlashMenu.tsx';
import { RichDocEditorProps } from './types.ts';
import { Button } from '@/components/ui/button';
import { useImageUpload } from './components/ImageUploadHandler';
// Icons imported from lucide-react for future use

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

        <EditorContent
          editor={editor}
          className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none p-6 min-h-[400px] focus-within:outline-none rich-doc-editor"
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