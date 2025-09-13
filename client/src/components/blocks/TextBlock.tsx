import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extension-placeholder';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { TextBlockProps } from './types';

export function TextBlock({ 
  block, 
  onChange, 
  onDelete, 
  onMoveUp, 
  onMoveDown, 
  readonly = false,
  autoFocus = false 
}: TextBlockProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
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
          return 'Skriv något...';
        },
      }),
    ],
    content: block.data.content || {
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }]
    },
    editable: !readonly,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: 'focus:outline-none prose prose-sm max-w-none min-h-[40px] py-2',
        'data-testid': `text-block-${block.id}`,
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onChange({
        ...block,
        data: {
          ...block.data,
          content: json
        }
      });
    },
    onFocus: () => {
      setIsFocused(true);
      setShowToolbar(true);
    },
    onBlur: () => {
      setIsFocused(false);
      // Delay hiding toolbar to allow toolbar interactions
      setTimeout(() => setShowToolbar(false), 150);
    },
  });

  // Update editor content when block data changes
  useEffect(() => {
    if (editor && block.data.content && editor.getJSON() !== block.data.content) {
      editor.commands.setContent(block.data.content);
    }
  }, [editor, block.data.content]);

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    disabled = false, 
    children, 
    title 
  }: { 
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title?: string;
  }) => (
    <Button
      variant={isActive ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-8 w-8 p-0"
      data-testid={`toolbar-${title?.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {children}
    </Button>
  );

  if (!editor) {
    return <div className="h-12 bg-gray-100 animate-pulse rounded" />;
  }

  return (
    <div 
      className={cn(
        "relative group border rounded-lg transition-all duration-200",
        isFocused ? "border-blue-500 shadow-md" : "border-gray-200 hover:border-gray-300",
        readonly ? "bg-gray-50" : "bg-white"
      )}
      ref={editorRef}
      data-testid={`text-block-container-${block.id}`}
    >
      {/* Block Controls - shown on hover or focus */}
      {!readonly && (isFocused || showToolbar) && (
        <div className="absolute -left-12 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            title="Dra för att flytta"
            data-testid={`drag-handle-${block.id}`}
          >
            <GripVertical className="h-3 w-3" />
          </Button>
          {onMoveUp && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveUp}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              title="Flytta upp"
              data-testid={`move-up-${block.id}`}
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
          )}
          {onMoveDown && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveDown}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              title="Flytta ner"
              data-testid={`move-down-${block.id}`}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
            title="Ta bort block"
            data-testid={`delete-${block.id}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Formatting Toolbar - shown when focused */}
      {!readonly && showToolbar && (
        <div className="absolute -top-12 left-0 right-0 z-10 bg-white border rounded-lg shadow-lg p-2 flex items-center gap-1 flex-wrap">
          {/* Heading dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2" data-testid="heading-dropdown">
                {editor.isActive('heading', { level: 1 }) ? 'H1' :
                 editor.isActive('heading', { level: 2 }) ? 'H2' :
                 editor.isActive('heading', { level: 3 }) ? 'H3' : 'P'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem 
                onClick={() => editor.chain().focus().setParagraph().run()}
                data-testid="set-paragraph"
              >
                Paragraf
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                data-testid="set-heading1"
              >
                <Heading1 className="h-4 w-4 mr-2" /> Rubrik 1
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                data-testid="set-heading2"
              >
                <Heading2 className="h-4 w-4 mr-2" /> Rubrik 2
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                data-testid="set-heading3"
              >
                <Heading3 className="h-4 w-4 mr-2" /> Rubrik 3
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-6" />

          {/* Text formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Fet"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Kursiv"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive('highlight')}
            title="Markera"
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-6" />

          {/* Text alignment */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            title="Vänsterjustera"
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            title="Centrera"
          >
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            title="Högerjustera"
          >
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-6" />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Punktlista"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numrerad lista"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Citat"
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
        </div>
      )}

      {/* Editor Content */}
      <div className="p-3">
        <EditorContent 
          editor={editor} 
          className={cn(
            "min-h-[40px]",
            readonly && "pointer-events-none"
          )}
        />
      </div>
    </div>
  );
}