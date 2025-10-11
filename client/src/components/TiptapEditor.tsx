import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon,
  List, 
  ListOrdered, 
  Quote, 
  Heading1, 
  Heading2, 
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  Link as LinkIcon,
  Undo,
  Redo
} from "lucide-react";

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function TiptapEditor({ 
  value, 
  onChange, 
  placeholder = "Skriv din text här...",
  className = ""
}: TiptapEditorProps) {
  const { toast } = useToast();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  // Sync value prop changes to editor content
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  // Image upload handler
  const addImage = async () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        // Get CSRF token
        const csrfToken = localStorage.getItem('csrfToken');
        if (!csrfToken) {
          const authRes = await fetch('/api/auth/me', { credentials: 'include' });
          if (authRes.ok) {
            const authData = await authRes.json();
            if (authData.csrfToken) {
              localStorage.setItem('csrfToken', authData.csrfToken);
            }
          }
        }

        const formData = new FormData();
        formData.append('file', file);

        const headers: Record<string, string> = {};
        const token = localStorage.getItem('csrfToken');
        if (token) {
          headers['X-CSRF-Token'] = token;
        }

        const response = await fetch('/api/upload-direct', {
          method: 'POST',
          credentials: 'include',
          headers,
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status}`);
        }

        const result = await response.json();

        if (result.objectPath && editor) {
          editor.chain().focus().setImage({ src: result.objectPath }).run();

          toast({
            title: "Bild uppladdad!",
            description: "Bilden har lagts till i texten"
          });
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: "Uppladdning misslyckades",
          description: "Kunde inte ladda upp bilden. Försök igen.",
          variant: "destructive"
        });
      }
    };
  };

  const addLink = () => {
    const url = window.prompt('Ange URL:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className={`border rounded-lg ${className}`}>
      {/* Toolbar */}
      <div className="border-b p-2 flex flex-wrap gap-1 bg-gray-50 dark:bg-gray-800">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700' : ''}
          data-testid="button-bold"
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700' : ''}
          data-testid="button-italic"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'bg-gray-200 dark:bg-gray-700' : ''}
          data-testid="button-underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 dark:bg-gray-700' : ''}
          data-testid="button-h1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 dark:bg-gray-700' : ''}
          data-testid="button-h2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'bg-gray-200 dark:bg-gray-700' : ''}
          data-testid="button-h3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-700' : ''}
          data-testid="button-bullet-list"
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-gray-200 dark:bg-gray-700' : ''}
          data-testid="button-ordered-list"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'bg-gray-200 dark:bg-gray-700' : ''}
          data-testid="button-blockquote"
        >
          <Quote className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200 dark:bg-gray-700' : ''}
          data-testid="button-align-left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200 dark:bg-gray-700' : ''}
          data-testid="button-align-center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200 dark:bg-gray-700' : ''}
          data-testid="button-align-right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addImage}
          data-testid="button-add-image"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addLink}
          data-testid="button-add-link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          data-testid="button-undo"
        >
          <Undo className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          data-testid="button-redo"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <EditorContent 
        editor={editor} 
        className="bg-white dark:bg-gray-900 min-h-[400px]"
      />

      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
}
