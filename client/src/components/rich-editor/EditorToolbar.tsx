import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough,
  Code, 
  Link as LinkIcon,
  Quote,
  List,
  ListOrdered,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Table,
  Type,
  Minus,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolbarProps } from './types';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { useImageUpload } from './components/ImageUploadHandler';

export function EditorToolbar({ editor }: ToolbarProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const { openFileDialog, isUploading, UploadDialog } = useImageUpload(editor);

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt('Ange URL:', 'https://');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const isActive = (name: string, attributes?: any) => {
    return editor.isActive(name, attributes);
  };

  const canExecute = (name: string) => {
    return editor.can().chain().focus()[name]().run();
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800">
      <div className="flex items-center gap-1 flex-wrap">
        
        {/* Undo/Redo */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!canExecute('undo')}
          className="h-8 w-8 p-0"
          title="Ångra (Ctrl+Z)"
          data-testid="toolbar-undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!canExecute('redo')}
          className="h-8 w-8 p-0"
          title="Gör om (Ctrl+Y)"
          data-testid="toolbar-redo"
        >
          <Redo className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Text Styles */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 min-w-[80px] justify-start"
              data-testid="toolbar-text-style"
            >
              <Type className="h-4 w-4 mr-2" />
              {isActive('heading', { level: 1 }) ? 'H1' :
               isActive('heading', { level: 2 }) ? 'H2' :
               isActive('heading', { level: 3 }) ? 'H3' :
               isActive('heading', { level: 4 }) ? 'H4' :
               isActive('heading', { level: 5 }) ? 'H5' :
               isActive('heading', { level: 6 }) ? 'H6' :
               'Normal'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().setParagraph().run()}
              className={cn(isActive('paragraph') && "bg-gray-100 dark:bg-gray-700")}
            >
              Normal text
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={cn(isActive('heading', { level: 1 }) && "bg-gray-100 dark:bg-gray-700")}
            >
              <span className="text-2xl font-bold">Rubrik 1</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={cn(isActive('heading', { level: 2 }) && "bg-gray-100 dark:bg-gray-700")}
            >
              <span className="text-xl font-bold">Rubrik 2</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={cn(isActive('heading', { level: 3 }) && "bg-gray-100 dark:bg-gray-700")}
            >
              <span className="text-lg font-bold">Rubrik 3</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
              className={cn(isActive('heading', { level: 4 }) && "bg-gray-100 dark:bg-gray-700")}
            >
              <span className="text-base font-bold">Rubrik 4</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
              className={cn(isActive('heading', { level: 5 }) && "bg-gray-100 dark:bg-gray-700")}
            >
              <span className="text-sm font-bold">Rubrik 5</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
              className={cn(isActive('heading', { level: 6 }) && "bg-gray-100 dark:bg-gray-700")}
            >
              <span className="text-xs font-bold">Rubrik 6</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Text Formatting */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "h-8 w-8 p-0",
            isActive('bold') && "bg-gray-200 dark:bg-gray-600"
          )}
          title="Fetstil (Ctrl+B)"
          data-testid="toolbar-bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "h-8 w-8 p-0",
            isActive('italic') && "bg-gray-200 dark:bg-gray-600"
          )}
          title="Kursiv (Ctrl+I)"
          data-testid="toolbar-italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(
            "h-8 w-8 p-0",
            isActive('underline') && "bg-gray-200 dark:bg-gray-600"
          )}
          title="Understrykning (Ctrl+U)"
          data-testid="toolbar-underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={cn(
            "h-8 w-8 p-0",
            isActive('strike') && "bg-gray-200 dark:bg-gray-600"
          )}
          title="Genomstruken"
          data-testid="toolbar-strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={cn(
            "h-8 w-8 p-0",
            isActive('code') && "bg-gray-200 dark:bg-gray-600"
          )}
          title="Kod"
          data-testid="toolbar-code"
        >
          <Code className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={cn(
            "h-8 w-8 p-0",
            isActive('highlight') && "bg-gray-200 dark:bg-gray-600"
          )}
          title="Markering"
          data-testid="toolbar-highlight"
        >
          <Highlighter className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Text Alignment */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={cn(
            "h-8 w-8 p-0",
            isActive('paragraph', { textAlign: 'left' }) && "bg-gray-200 dark:bg-gray-600"
          )}
          title="Vänsterjustera"
          data-testid="toolbar-align-left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={cn(
            "h-8 w-8 p-0",
            isActive('paragraph', { textAlign: 'center' }) && "bg-gray-200 dark:bg-gray-600"
          )}
          title="Centrera"
          data-testid="toolbar-align-center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={cn(
            "h-8 w-8 p-0",
            isActive('paragraph', { textAlign: 'right' }) && "bg-gray-200 dark:bg-gray-600"
          )}
          title="Högerjustera"
          data-testid="toolbar-align-right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={cn(
            "h-8 w-8 p-0",
            isActive('paragraph', { textAlign: 'justify' }) && "bg-gray-200 dark:bg-gray-600"
          )}
          title="Marginaljustera"
          data-testid="toolbar-align-justify"
        >
          <AlignJustify className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Lists and Blocks */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "h-8 w-8 p-0",
            isActive('bulletList') && "bg-gray-200 dark:bg-gray-600"
          )}
          title="Punktlista"
          data-testid="toolbar-bullet-list"
        >
          <List className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "h-8 w-8 p-0",
            isActive('orderedList') && "bg-gray-200 dark:bg-gray-600"
          )}
          title="Numrerad lista"
          data-testid="toolbar-ordered-list"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn(
            "h-8 w-8 p-0",
            isActive('blockquote') && "bg-gray-200 dark:bg-gray-600"
          )}
          title="Citat"
          data-testid="toolbar-blockquote"
        >
          <Quote className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="h-8 w-8 p-0"
          title="Horisontell linje"
          data-testid="toolbar-horizontal-rule"
        >
          <Minus className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Links and Tables */}
        <Button
          variant="ghost"
          size="sm"
          onClick={isActive('link') ? removeLink : addLink}
          className={cn(
            "h-8 w-8 p-0",
            isActive('link') && "bg-gray-200 dark:bg-gray-600"
          )}
          title={isActive('link') ? "Ta bort länk" : "Lägg till länk"}
          data-testid="toolbar-link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={insertTable}
          className="h-8 w-8 p-0"
          title="Infoga tabell"
          data-testid="toolbar-table"
        >
          <Table className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={openFileDialog}
          className="h-8 w-8 p-0"
          title="Infoga bild"
          disabled={isUploading}
          data-testid="toolbar-image"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        
      </div>
      
      {/* Upload Dialog */}
      <UploadDialog />
    </div>
  );
}