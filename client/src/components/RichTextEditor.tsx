import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Bold, Italic, List, Quote, Upload, Trash2, Eye, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Simple markdown-to-HTML converter for preview
function formatMarkdownToHTML(text: string): string {
  if (!text) return '';
  
  let html = text;
  
  // Convert headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Convert bold and italic
  html = html.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>');
  
  // Convert quotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  
  // Convert bullet points
  html = html.replace(/^• (.+)$/gm, '<li>$1</li>');
  
  // Group consecutive list items
  if (html.includes('<li>')) {
    const lines = html.split('\n');
    const grouped = [];
    let inList = false;
    
    for (const line of lines) {
      if (line.includes('<li>')) {
        if (!inList) {
          grouped.push('<ul>');
          inList = true;
        }
        grouped.push(line);
      } else {
        if (inList) {
          grouped.push('</ul>');
          inList = false;
        }
        grouped.push(line);
      }
    }
    if (inList) grouped.push('</ul>');
    
    html = grouped.join('\n');
  }
  
  // Handle page breaks in preview mode
  html = html.replace(/--- SIDBRYTNING ---/g, '<div style="margin: 2em 0; padding: 1em; background: #f0f0f0; border: 2px dashed #ccc; text-align: center; color: #666; border-radius: 4px;">📄 Sidbrytning - Ny sida börjar här</div>');
  
  // Keep line breaks as they are - let CSS handle whitespace with white-space: pre-wrap
  
  return html;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onPagesChange?: (pages: { id: string; content: string; imagesAbove?: string[]; imagesBelow?: string[] }[]) => void;
  initialPages?: { id: string; content: string; imagesAbove?: string[]; imagesBelow?: string[] }[];
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Skriv din text här...", 
  className,
  onPagesChange,
  initialPages 
}: RichTextEditorProps) {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Simplified state
  const [content, setContent] = useState(value || '');
  const [showPreview, setShowPreview] = useState(false);
  const [images, setImages] = useState<{above: string[], below: string[]}>({above: [], below: []});
  
  // Update content when value prop changes
  useEffect(() => {
    if (value !== undefined && value !== content) {
      setContent(value);
    }
  }, [value]);
  
  // Load images from initialPages
  useEffect(() => {
    if (initialPages && initialPages.length > 0) {
      const allImagesAbove = initialPages.flatMap(page => page.imagesAbove || []);
      const allImagesBelow = initialPages.flatMap(page => page.imagesBelow || []);
      setImages({above: allImagesAbove, below: allImagesBelow});
    }
  }, [initialPages]);
  
  // Call onChange when content changes
  const lastContentRef = useRef<string>('');
  useEffect(() => {
    if (onChange && content !== lastContentRef.current) {
      lastContentRef.current = content;
      const htmlContent = formatMarkdownToHTML(content);
      onChange(htmlContent);
    }
  }, [content, onChange]);
  
  // Call onPagesChange when content or images change
  const lastPagesRef = useRef<string>('');
  useEffect(() => {
    if (onPagesChange) {
      const pagesKey = `${content}-${images.above.join(',')}-${images.below.join(',')}`;
      if (pagesKey !== lastPagesRef.current) {
        lastPagesRef.current = pagesKey;
        
        // Split content by page breaks
        const pageBreakMarker = '--- SIDBRYTNING ---';
        const contentParts = content.split(pageBreakMarker);
        
        const pagesData = contentParts.map((pageContent, index) => ({
          id: `page-${index}`,
          content: formatMarkdownToHTML(pageContent.trim()),
          imagesAbove: index === 0 ? images.above : [], // Only first page gets images above
          imagesBelow: index === contentParts.length - 1 ? images.below : [], // Only last page gets images below
          questions: [] // Initialize empty questions array for each page
        }));
        
        onPagesChange(pagesData);
      }
    }
  }, [content, images, onPagesChange]);
  
  // Helper function for formatting
  const insertMarkdown = (prefix: string, suffix: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    let newText;
    let newCursorPos;
    
    if (selectedText) {
      // Text is selected - wrap it
      newText = textarea.value.substring(0, start) + prefix + selectedText + suffix + textarea.value.substring(end);
      newCursorPos = start + prefix.length + selectedText.length + suffix.length;
    } else {
      // No selection - insert placeholder
      const textToInsert = prefix + (placeholder || '') + suffix;
      newText = textarea.value.substring(0, start) + textToInsert + textarea.value.substring(start);
      newCursorPos = start + prefix.length + (placeholder ? placeholder.length : 0);
    }
    
    setContent(newText);
    textarea.value = newText;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    textarea.focus();
  };
  
  // Insert page break
  const insertPageBreak = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const pageBreakMarker = '\n\n--- SIDBRYTNING ---\n\n';
    
    const newText = textarea.value.substring(0, start) + pageBreakMarker + textarea.value.substring(start);
    const newCursorPos = start + pageBreakMarker.length;
    
    setContent(newText);
    textarea.value = newText;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    textarea.focus();
  };
  
  // Handle image upload
  const handleImageUpload = async (file: File, position: 'above' | 'below') => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload-direct', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.objectPath) {
        setImages(prev => ({
          ...prev,
          [position]: [...prev[position], result.objectPath]
        }));
        
        toast({
          title: "Bild uppladdad!",
          description: `Bilden har lagts till ${position === 'above' ? 'ovanför' : 'under'} texten`
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
  
  // Remove image
  const removeImage = (position: 'above' | 'below', index: number) => {
    setImages(prev => ({
      ...prev,
      [position]: prev[position].filter((_, i) => i !== index)
    }));
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Modern Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 border rounded-lg shadow-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => insertMarkdown('**', '**', 'fetstil')}
          className="h-8 px-3"
          title="Fetstil (Ctrl+B)"
        >
          <Bold className="h-4 w-4 mr-1" />
          <span className="text-xs">Fet</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => insertMarkdown('*', '*', 'kursiv')}
          className="h-8 px-3"
          title="Kursiv (Ctrl+I)"
        >
          <Italic className="h-4 w-4 mr-1" />
          <span className="text-xs">Kursiv</span>
        </Button>
        
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => insertMarkdown('# ', '', 'Stor rubrik')}
          className="h-8 px-3"
          title="Stor rubrik (H1)"
        >
          <span className="text-xs font-bold">H1</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => insertMarkdown('## ', '', 'Medium rubrik')}
          className="h-8 px-3"
          title="Medium rubrik (H2)"
        >
          <span className="text-xs font-bold">H2</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => insertMarkdown('### ', '', 'Liten rubrik')}
          className="h-8 px-3"
          title="Liten rubrik (H3)"
        >
          <span className="text-xs font-bold">H3</span>
        </Button>
        
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => insertMarkdown('• ', '', 'lista')}
          className="h-8 px-3"
          title="Punktlista"
        >
          <List className="h-4 w-4 mr-1" />
          <span className="text-xs">Lista</span>
        </Button>
        
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => insertPageBreak()}
          className="h-8 px-3"
          title="Sidbrytning - Dela upp texten i flera sidor"
        >
          <FileText className="h-4 w-4 mr-1" />
          <span className="text-xs">Ny sida</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => insertMarkdown('> ', '', 'citat')}
          className="h-8 px-3"
          title="Citat"
        >
          <Quote className="h-4 w-4 mr-1" />
          <span className="text-xs">Citat</span>
        </Button>
        
        <div className="flex-1" />
        
        <Button
          variant={showPreview ? "default" : "outline"}
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="h-8 px-3"
        >
          {showPreview ? (
            <>
              <Edit className="h-4 w-4 mr-1" />
              Redigera
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-1" />
              Förhandsgranska
            </>
          )}
        </Button>
      </div>
      
      {/* Image Upload Controls */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => document.getElementById('image-above-upload')?.click()}
          className="h-8"
        >
          <Upload className="h-4 w-4 mr-2" />
          Bild ovanför
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => document.getElementById('image-below-upload')?.click()}
          className="h-8"
        >
          <Upload className="h-4 w-4 mr-2" />
          Bild under
        </Button>
        
        <input
          id="image-above-upload"
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file, 'above');
          }}
        />
        <input
          id="image-below-upload" 
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file, 'below');
          }}
        />
      </div>
      
      {/* Images above content */}
      {images.above.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-blue-600">Bilder ovanför texten</h4>
          <div className="grid grid-cols-2 gap-2">
            {images.above.map((imagePath, index) => (
              <div key={index} className="relative group">
                <img 
                  src={imagePath} 
                  alt={`Bild ${index + 1} ovanför texten`}
                  className="w-full h-32 object-cover rounded border"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage('above', index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Main Editor */}
      <Card>
        <CardContent className="p-0">
          {showPreview ? (
            // Preview Mode
            <div 
              className="p-6 min-h-[400px] prose prose-sm max-w-none whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: formatMarkdownToHTML(content) }}
            />
          ) : (
            // Edit Mode
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              className="border-none p-6 resize-y min-h-[400px] focus-visible:ring-0 text-base leading-relaxed"
              onKeyDown={(e) => {
                // Add keyboard shortcuts
                if (e.ctrlKey || e.metaKey) {
                  if (e.key === 'b') {
                    e.preventDefault();
                    insertMarkdown('**', '**', 'fetstil');
                  } else if (e.key === 'i') {
                    e.preventDefault();
                    insertMarkdown('*', '*', 'kursiv');
                  }
                }
              }}
            />
          )}
        </CardContent>
      </Card>
      
      {/* Images below content */}
      {images.below.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-blue-600">Bilder under texten</h4>
          <div className="grid grid-cols-2 gap-2">
            {images.below.map((imagePath, index) => (
              <div key={index} className="relative group">
                <img 
                  src={imagePath} 
                  alt={`Bild ${index + 1} under texten`}
                  className="w-full h-32 object-cover rounded border"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage('below', index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Help text */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <div>
          Tips: Använd **fetstil**, *kursiv*, # rubriker, • listor och {'>'} citat
        </div>
        <div>
          Tecken: {content.length}
        </div>
      </div>
    </div>
  );
}