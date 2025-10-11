import { useRef, useEffect } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useToast } from "@/hooks/use-toast";

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function QuillEditor({ 
  value, 
  onChange, 
  placeholder = "Skriv din text här...", 
  className = ""
}: QuillEditorProps) {
  const { toast } = useToast();
  const quillRef = useRef<ReactQuill>(null);

  // Image upload handler
  const imageHandler = async () => {
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

        if (result.objectPath) {
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', result.objectPath);
            quill.setSelection(range.index + 1, 0);
          }

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

  // Quill modules configuration with Swedish toolbar
  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        [{ 'color': [] }, { 'background': [] }],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    },
    clipboard: {
      matchVisual: false
    }
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'align',
    'blockquote', 'code-block',
    'link', 'image',
    'color', 'background'
  ];

  return (
    <div className={`quill-editor-wrapper ${className}`}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className="bg-white dark:bg-gray-800"
      />
      <style>{`
        .quill-editor-wrapper .ql-container {
          font-size: 16px;
          min-height: 400px;
        }
        
        .quill-editor-wrapper .ql-editor {
          min-height: 400px;
        }
        
        .quill-editor-wrapper .ql-toolbar {
          background: white;
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
        }
        
        .quill-editor-wrapper .ql-container {
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
        }
        
        /* Dark mode support */
        .dark .quill-editor-wrapper .ql-toolbar {
          background: #1f2937;
          border-color: #374151;
        }
        
        .dark .quill-editor-wrapper .ql-container {
          border-color: #374151;
          background: #1f2937;
        }
        
        .dark .quill-editor-wrapper .ql-editor {
          color: #f3f4f6;
        }
        
        .dark .quill-editor-wrapper .ql-stroke {
          stroke: #9ca3af;
        }
        
        .dark .quill-editor-wrapper .ql-fill {
          fill: #9ca3af;
        }
        
        .dark .quill-editor-wrapper .ql-picker-label {
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}
