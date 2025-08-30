import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

import { Bold, Italic, List, ListOrdered, Type, Quote, Trash2, Minus, FileText, ChevronLeft, ChevronRight, Image, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";


// Simple markdown-to-HTML converter for preview
function formatMarkdownToHTML(text: string): string {
  if (!text) return '';
  
  let html = text;
  
  // Convert headings - only at start of line followed by space
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Convert bold (**text**) - must have content between, non-greedy
  html = html.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  
  // Convert italic (*text*) - must have content between, avoid bold conflicts
  html = html.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>');
  
  // Convert bullet points - only at start of line
  html = html.replace(/^• (.+)$/gm, '<li>$1</li>');
  
  // Group consecutive list items - simple approach
  if (html.includes('<li>')) {
    // Split by lines, group li elements
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
  
  // Don't convert line breaks to HTML - let CSS handle with pre-wrap
  // The white-space: pre-wrap will preserve all line breaks and spacing
  
  return html;
}

// Convert HTML back to markdown for editing
function convertHTMLToMarkdown(html: string): string {
  if (!html || typeof html !== 'string') return '';
  
  let markdown = html;
  
  // Handle simple cases first - if already markdown, return as is
  if (!markdown.includes('<') || !markdown.includes('>')) {
    return markdown;
  }
  
  // Convert headings
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1');
  
  // Convert bold and italic - be more careful about nesting
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  
  // Convert line breaks
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
  
  // Convert lists
  markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gi, (match, content) => {
    const items = content.replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1');
    return items;
  });
  
  // Remove paragraph tags but preserve content
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n');
  
  // Remove any remaining HTML tags
  markdown = markdown.replace(/<[^>]*>/g, '');
  
  // Clean up extra newlines
  markdown = markdown.replace(/\n\n+/g, '\n\n');
  
  // Decode HTML entities
  markdown = markdown.replace(/&lt;/g, '<')
                   .replace(/&gt;/g, '>')
                   .replace(/&amp;/g, '&')
                   .replace(/&quot;/g, '"')
                   .replace(/&#39;/g, "'");
  
  return markdown.trim();
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onPagesChange?: (pages: { id: string; content: string; imagesAbove?: string[]; imagesBelow?: string[] }[]) => void;
  initialPages?: { id: string; content: string; imagesAbove?: string[]; imagesBelow?: string[] }[];
}

interface ContentBlock {
  id: string;
  type: 'text' | 'heading' | 'quote' | 'list' | 'page-break';
  content: string;
  metadata?: {
    level?: 1 | 2 | 3; // for headings
    listType?: 'ordered' | 'unordered'; // for lists
    alt?: string; // for images
    caption?: string; // for images
  };
}

// Function to parse HTML content back to blocks
const parseHTMLToBlocks = (html: string): ContentBlock[] => {
  if (!html || html.trim() === '') return [{ id: '1', type: 'text', content: '' }];
  
  const blocks: ContentBlock[] = [];
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  let blockId = 1;
  
  // Helper function to generate unique IDs
  const getId = () => (blockId++).toString();
  
  // Process each child element
  Array.from(tempDiv.children).forEach((element) => {
    const tag = element.tagName.toLowerCase();
    
    switch (tag) {
      case 'h1':
        blocks.push({
          id: getId(),
          type: 'heading',
          content: element.textContent || '',
          metadata: { level: 1 }
        });
        break;
      case 'h2':
        blocks.push({
          id: getId(),
          type: 'heading',
          content: element.textContent || '',
          metadata: { level: 2 }
        });
        break;
      case 'h3':
        blocks.push({
          id: getId(),
          type: 'heading',
          content: element.textContent || '',
          metadata: { level: 3 }
        });
        break;
      case 'blockquote':
        blocks.push({
          id: getId(),
          type: 'quote',
          content: element.textContent || ''
        });
        break;
      case 'ol':
        const orderedItems = Array.from(element.querySelectorAll('li')).map(li => li.textContent || '').join('\n');
        blocks.push({
          id: getId(),
          type: 'list',
          content: orderedItems,
          metadata: { listType: 'ordered' }
        });
        break;
      case 'ul':
        const unorderedItems = Array.from(element.querySelectorAll('li')).map(li => li.textContent || '').join('\n');
        blocks.push({
          id: getId(),
          type: 'list',
          content: unorderedItems,
          metadata: { listType: 'unordered' }
        });
        break;

      case 'div':
        // Check if it's a page break
        if (element.classList.contains('page-break') || element.hasAttribute('data-page-break')) {
          blocks.push({
            id: getId(),
            type: 'page-break',
            content: ''
          });
        } else {
          // Treat as text - preserve HTML formatting
          const htmlContent = element.innerHTML || '';
          if (htmlContent.trim()) {
            blocks.push({
              id: getId(),
              type: 'text',
              content: htmlContent
            });
          }
        }
        break;
      case 'p':
      default:
        // Preserve HTML formatting for text blocks
        const htmlContent = (element as HTMLElement).innerHTML || '';
        if (htmlContent.trim()) {
          blocks.push({
            id: getId(),
            type: 'text',
            content: htmlContent
          });
        }
        break;
    }
  });
  
  // If no blocks were created, create a default text block with the original content
  if (blocks.length === 0) {
    // Use plain text content to avoid formatting issues
    const textContent = tempDiv.textContent || html;
    return [{ id: '1', type: 'text', content: textContent }];
  }
  
  return blocks;
};

export function RichTextEditor({ value, onChange, placeholder = "Skriv din text här...", className, onPagesChange, initialPages }: RichTextEditorProps) {
  // Helper function to generate IDs
  const generateId = () => crypto.randomUUID();
  
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const { toast } = useToast();

  // Store pages as separate arrays of blocks instead of splitting from one array
  const [pages, setPages] = useState<ContentBlock[][]>([
    [{ id: generateId(), type: 'text' as const, content: '', metadata: {} }]
  ]);
  
  // Store images per page
  const [pageImages, setPageImages] = useState<Record<number, { above: string[], below: string[] }>>({});

  // Re-parse when the value prop changes (e.g., when loading existing content)
  const lastValueRef = useRef<string>('');
  useEffect(() => {
    if (value !== undefined && value !== '' && value !== lastValueRef.current) {
      lastValueRef.current = value;
      const parsedBlocks = parseHTMLToBlocks(value);
      const newPages = splitIntoPages(parsedBlocks);
      setPages(newPages);
    }
  }, [value]);

  // Load images from initialPages when they're provided
  useEffect(() => {
    if (initialPages && initialPages.length > 0) {
      const newPageImages: Record<number, { above: string[], below: string[] }> = {};
      initialPages.forEach((page, index) => {
        newPageImages[index] = {
          above: page.imagesAbove || [],
          below: page.imagesBelow || []
        };
      });
      setPageImages(newPageImages);
    }
  }, [initialPages]);

  // Split content blocks into pages when they contain page breaks
  const splitIntoPages = (allBlocks: ContentBlock[]): ContentBlock[][] => {
    const pagesList: ContentBlock[][] = [];
    let currentPageBlocks: ContentBlock[] = [];
    
    allBlocks.forEach(block => {
      if (block.type === 'page-break') {
        // Save current page and start new one
        pagesList.push(currentPageBlocks.length > 0 ? currentPageBlocks : [{ id: generateId(), type: 'text' as const, content: '', metadata: {} }]);
        currentPageBlocks = [];
      } else {
        currentPageBlocks.push(block);
      }
    });
    
    // Add final page
    pagesList.push(currentPageBlocks.length > 0 ? currentPageBlocks : [{ id: generateId(), type: 'text' as const, content: '', metadata: {} }]);
    
    return pagesList.length > 0 ? pagesList : [[{ id: generateId(), type: 'text' as const, content: '', metadata: {} }]];
  };

  // Convert all pages back to a single HTML string for saving AND notify about pages with images
  const lastContentRef = useRef<string>('');
  const lastCallbackRef = useRef<{ onChange?: Function; onPagesChange?: Function }>({});
  
  useEffect(() => {
    // Store callbacks in ref to avoid dependency issues
    lastCallbackRef.current = { onChange, onPagesChange };
  });

  useEffect(() => {
    const allBlocks: ContentBlock[] = [];
    pages.forEach((pageBlocks, index) => {
      allBlocks.push(...pageBlocks);
      if (index < pages.length - 1) {
        // Add page break between pages (except after last page)
        allBlocks.push({ id: generateId(), type: 'page-break' as const, content: '', metadata: {} });
      }
    });

    const htmlContent = allBlocks.map(block => {
      switch (block.type) {
        case 'heading':
          const level = block.metadata?.level || 2;
          return `<h${level}>${block.content}</h${level}>`;
        case 'quote':
          return `<blockquote>${block.content}</blockquote>`;
        case 'list':
          const tag = block.metadata?.listType === 'ordered' ? 'ol' : 'ul';
          const items = block.content.split('\n').filter(item => item.trim())
            .map(item => `<li>${item.trim()}</li>`).join('');
          return `<${tag}>${items}</${tag}>`;
        case 'page-break':
          return `<div class="page-break" data-page-break="true">--- Sidbrytning ---</div>`;
        case 'text':
        default:
          const content = block.content.trim();
          if (!content) return '';
          
          if (content.includes('<') && content.includes('>')) {
            return content;
          } else {
            const htmlContent = formatMarkdownToHTML(content);
            if (htmlContent.startsWith('<h') || htmlContent.startsWith('<ul>') || htmlContent.includes('</h') || htmlContent.includes('<p>')) {
              return htmlContent;
            } else {
              return `<p>${htmlContent}</p>`;
            }
          }
      }
    }).join('\n');
    
    // Only call onChange if content actually changed to prevent infinite loops
    if (htmlContent !== value && htmlContent !== lastContentRef.current) {
      lastContentRef.current = htmlContent;
      lastCallbackRef.current.onChange?.(htmlContent);
    }

    // Also notify about pages structure with images if callback is provided
    if (lastCallbackRef.current.onPagesChange) {
      const pagesData = pages.map((pageBlocks, index) => {
        const pageContent = pageBlocks.map(block => {
          switch (block.type) {
            case 'heading':
              const level = block.metadata?.level || 2;
              return `<h${level}>${block.content}</h${level}>`;
            case 'quote':
              return `<blockquote>${block.content}</blockquote>`;
            case 'list':
              const tag = block.metadata?.listType === 'ordered' ? 'ol' : 'ul';
              const items = block.content.split('\n').filter(item => item.trim())
                .map(item => `<li>${item.trim()}</li>`).join('');
              return `<${tag}>${items}</${tag}>`;
            case 'text':
            default:
              const content = block.content.trim();
              if (!content) return '';
              
              if (content.includes('<') && content.includes('>')) {
                return content;
              } else {
                const htmlContent = formatMarkdownToHTML(content);
                if (htmlContent.startsWith('<h') || htmlContent.startsWith('<ul>') || htmlContent.includes('</h') || htmlContent.includes('<p>')) {
                  return htmlContent;
                } else {
                  return `<p>${htmlContent}</p>`;
                }
              }
          }
        }).join('\n');

        const currentPageImages = pageImages[index] || { above: [], below: [] };
        
        return {
          id: `page-${index}`,
          content: pageContent,
          imagesAbove: currentPageImages.above,
          imagesBelow: currentPageImages.below
        };
      });
      
      lastCallbackRef.current.onPagesChange?.(pagesData);
    }
  }, [pages, pageImages]);

  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    const newPages = pages.map(pageBlocks => 
      pageBlocks.map(block => 
        block.id === id ? { ...block, ...updates } : block
      )
    );
    setPages(newPages);
  };

  const addBlock = (type: ContentBlock['type'], afterId?: string) => {
    const newBlock: ContentBlock = {
      id: generateId(),
      type,
      content: '',
      metadata: type === 'heading' ? { level: 2 } : 
                type === 'list' ? { listType: 'unordered' } : undefined
    };

    if (type === 'page-break') {
      // Create a new page
      const newPages = [...pages];
      newPages.push([{ id: generateId(), type: 'text' as const, content: '', metadata: {} }]);
      setPages(newPages);
      setCurrentPage(newPages.length - 1);
    } else if (afterId) {
      // Find which page contains the target block and insert after it
      const newPages = pages.map(pageBlocks => {
        const index = pageBlocks.findIndex(b => b.id === afterId);
        if (index !== -1) {
          const newPageBlocks = [...pageBlocks];
          newPageBlocks.splice(index + 1, 0, newBlock);
          return newPageBlocks;
        }
        return pageBlocks;
      });
      setPages(newPages);
    } else {
      // Add to current page
      const newPages = [...pages];
      if (newPages[safePage]) {
        newPages[safePage] = [...newPages[safePage], newBlock];
      } else {
        newPages[safePage] = [newBlock];
      }
      setPages(newPages);
    }
    
    setActiveBlockId(newBlock.id);
  };

  const removeBlock = (id: string) => {
    const newPages = pages.map(pageBlocks => {
      const filtered = pageBlocks.filter(block => block.id !== id);
      // Don't let a page become completely empty - add default text block
      return filtered.length === 0 ? [{ id: generateId(), type: 'text' as const, content: '', metadata: {} }] : filtered;
    });
    setPages(newPages);
    setActiveBlockId(null);
  };

  const totalPages = pages.length;
  const safePage = Math.max(0, Math.min(currentPage, totalPages - 1));
  const currentPageBlocks = pages[safePage] || [];
  const currentPageImageData = pageImages[safePage] || { above: [], below: [] };

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
        setPageImages(prev => ({
          ...prev,
          [safePage]: {
            above: prev[safePage]?.above || [],
            below: prev[safePage]?.below || [],
            [position]: [...(prev[safePage]?.[position] || []), result.objectPath]
          }
        }));
        
        toast({
          title: "Bild uppladdad!",
          description: `Bilden har lagts till ${position === 'above' ? 'ovanför' : 'under'} texten på sida ${safePage + 1}`
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

  // Remove image from page
  const removeImage = (position: 'above' | 'below', index: number) => {
    setPageImages(prev => ({
      ...prev,
      [safePage]: {
        above: prev[safePage]?.above || [],
        below: prev[safePage]?.below || [],
        [position]: (prev[safePage]?.[position] || []).filter((_, i) => i !== index)
      }
    }));
  };





  const renderBlock = (block: ContentBlock) => {
    if (!block || !block.id) {
      return null;
    }
    const isActive = activeBlockId === block.id;
    
    return (
      <div
        key={block.id}
        className={`group relative border rounded-lg p-4 transition-all ${
          isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-gray-700'
        }`}
        onClick={() => setActiveBlockId(block.id)}
      >
        {/* Block Controls */}
        {isActive && (
          <div className="absolute -top-3 left-4 flex gap-1 bg-white dark:bg-gray-800 border rounded-md p-1 shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addBlock('text', block.id)}
              className="h-6 w-6 p-0"
              title="Lägg till text"
            >
              <Type className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addBlock('heading', block.id)}
              className="h-6 w-6 p-0"
              title="Lägg till rubrik"
            >
              <Bold className="h-3 w-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => addBlock('page-break', block.id)}
              className="h-6 w-6 p-0"
              title="Ny sida"
            >
              <div className="h-3 w-3 border-t-2 border-dashed border-gray-500"></div>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addBlock('quote', block.id)}
              className="h-6 w-6 p-0"
              title="Lägg till citat"
            >
              <Quote className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addBlock('list', block.id)}
              className="h-6 w-6 p-0"
              title="Lägg till lista"
            >
              <List className="h-3 w-3" />
            </Button>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 my-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeBlock(block.id)}
              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
              title="Ta bort block"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Block Content */}
        {block.type === 'text' && (
          <div className="space-y-3">
            {/* Formatting toolbar */}
            <div className="flex gap-1 p-2 bg-gray-50 dark:bg-gray-800 rounded-md border">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => {
                  document.execCommand('bold');
                }}
                title="Fetstil"
              >
                <Bold className="h-4 w-4 mr-1" />
                <span className="text-xs">Fet</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => {
                  document.execCommand('italic');
                }}
                title="Kursiv"
              >
                <Italic className="h-4 w-4 mr-1" />
                <span className="text-xs">Kursiv</span>
              </Button>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 my-1" />
              <select
                className="h-8 px-2 text-xs border rounded bg-white dark:bg-gray-700"
                onChange={(e) => {
                  const level = parseInt(e.target.value, 10) as 1|2|3;
                  if (!level) return;
                  
                  const textarea = document.querySelector(`[data-testid="textarea-block-${block.id}"]`) as HTMLTextAreaElement;
                  const value = textarea?.value ?? block.content;
                  
                  updateBlock(block.id, {
                    type: 'heading',
                    content: value.trim(),
                    metadata: { level }
                  });
                  setActiveBlockId(block.id);
                  e.target.value = '';
                }}
                title="Gör textblocket till rubrik"
              >
                <option value="">Rubrik</option>
                <option value="1">H1 – Stor</option>
                <option value="2">H2 – Medium</option>
                <option value="3">H3 – Liten</option>
              </select>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => {
                  const textarea = document.querySelector(`[data-testid="textarea-block-${block.id}"]`) as HTMLTextAreaElement;
                  const value = textarea?.value ?? block.content;
                  
                  updateBlock(block.id, {
                    type: 'list',
                    content: value
                  });
                  setActiveBlockId(block.id);
                }}
                title="Gör textblocket till punktlista"
              >
                <List className="h-4 w-4 mr-1" />
                <span className="text-xs">Lista</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => {
                  document.execCommand('insertUnorderedList');
                }}
                title="Punktlista direkt"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => {
                  document.execCommand('insertOrderedList');
                }}
                title="Numrerad lista direkt"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => {
                  document.execCommand('formatBlock', false, 'blockquote');
                }}
                title="Citat"
              >
                <Quote className="h-4 w-4" />
              </Button>
            </div>
            
            {/* WYSIWYG text editor with contentEditable */}
            <div
              contentEditable
              suppressContentEditableWarning
              className="border rounded-md bg-white dark:bg-gray-900 p-4 min-h-[200px] max-h-[400px] overflow-auto focus:outline-none leading-relaxed"
              onInput={(e) => {
                const html = (e.currentTarget as HTMLDivElement).innerHTML;
                updateBlock(block.id, { content: html, type: 'text' });
              }}
              onPaste={(e) => {
                // Paste as plain text to avoid formatting issues
                e.preventDefault();
                const text = e.clipboardData.getData('text/plain');
                document.execCommand('insertText', false, text);
              }}
              onKeyDown={(e) => {
                // Add keyboard shortcuts
                if (e.ctrlKey || e.metaKey) {
                  if (e.key === 'b') {
                    e.preventDefault();
                    document.execCommand('bold');
                  } else if (e.key === 'i') {
                    e.preventDefault();
                    document.execCommand('italic');
                  } else if (e.altKey && ['1', '2', '3'].includes(e.key)) {
                    e.preventDefault();
                    const level = parseInt(e.key) as 1|2|3;
                    const value = (e.currentTarget as HTMLDivElement).textContent || '';
                    updateBlock(block.id, {
                      type: 'heading',
                      content: value.trim(),
                      metadata: { level }
                    });
                  }
                }
              }}
              dangerouslySetInnerHTML={{ __html: block.content || '' }}
              data-testid={`contenteditable-block-${block.id}`}
            />
            {!block.content && (
              <div className="absolute inset-0 p-4 text-gray-400 pointer-events-none">
                {placeholder}
              </div>
            )}
            

            <div className="flex justify-between text-xs text-muted-foreground">
              <div>Tips: Markera text och klicka Fet/Kursiv, eller använd Ctrl+B/Ctrl+I</div>
              <div>Tecken: {block.content.replace(/<[^>]*>/g, '').length}</div>
            </div>
          </div>
        )}

        {block.type === 'heading' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={block.metadata?.level || 2}
                onChange={(e) => updateBlock(block.id, { 
                  metadata: { ...block.metadata, level: parseInt(e.target.value) as 1 | 2 | 3 }
                })}
                className="text-sm border rounded px-2 py-1 bg-white dark:bg-gray-800"
              >
                <option value={1}>H1 - Stor rubrik</option>
                <option value={2}>H2 - Mellanrubrik</option>
                <option value={3}>H3 - Liten rubrik</option>
              </select>
            </div>
            <Input
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder="Skriv din rubrik här..."
              className={`border-none p-4 focus-visible:ring-0 bg-gray-50 dark:bg-gray-800 rounded-md ${
                block.metadata?.level === 1 ? 'text-4xl font-bold' :
                block.metadata?.level === 3 ? 'text-2xl font-bold' :
                'text-3xl font-bold'
              }`}
              data-testid={`input-heading-${block.id}`}
            />
          </div>
        )}

        {block.type === 'quote' && (
          <Textarea
            value={block.content}
            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
            placeholder="Skriv ett citat eller viktigt stycke..."
            className="border-none p-4 italic text-gray-700 dark:text-gray-300 focus-visible:ring-0 min-h-[120px] bg-gray-50 dark:bg-gray-800 rounded-md border-l-4 border-l-blue-500"
            data-testid={`textarea-quote-${block.id}`}
          />
        )}

        {block.type === 'list' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={block.metadata?.listType || 'unordered'}
                onChange={(e) => updateBlock(block.id, { 
                  metadata: { ...block.metadata, listType: e.target.value as 'ordered' | 'unordered' }
                })}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="unordered">Punktlista</option>
                <option value="ordered">Numrerad lista</option>
              </select>
            </div>
            <Textarea
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder="Skriv en punkt per rad..."
              className="border-none p-4 focus-visible:ring-0 min-h-[120px] bg-white dark:bg-gray-900 rounded-md border"
              data-testid={`textarea-list-${block.id}`}
            />
          </div>
        )}



        {block.type === 'page-break' && (
          <div className="relative flex items-center justify-center py-6 my-6 border-2 border-dashed border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <div className="text-center">
                <div className="text-blue-700 dark:text-blue-300 font-semibold">Ny sida</div>
                <div className="text-blue-600 dark:text-blue-400 text-sm">Läsarna bläddrar till nästa sida här</div>
              </div>
              <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                <FileText className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <Label className="text-lg font-semibold">Innehållsredigerare</Label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => addBlock('text')}
            data-testid="button-add-text-block"
          >
            <Type className="h-4 w-4 mr-2" />
            Text
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => addBlock('page-break')}
            data-testid="button-add-page-break"
          >
            <FileText className="h-4 w-4 mr-2" />
            Ny sida
          </Button>

          <div className="flex gap-2">
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              id="image-above-upload"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, 'above');
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('image-above-upload')?.click()}
              data-testid="button-add-image-above"
            >
              <Upload className="h-4 w-4 mr-2" />
              Bild ovanför
            </Button>

            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              id="image-below-upload"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, 'below');
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('image-below-upload')?.click()}
              data-testid="button-add-image-below"
            >
              <Upload className="h-4 w-4 mr-2" />
              Bild under
            </Button>
          </div>
        </div>
      </div>

      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
          >
            ← Föregående sida
          </Button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Sida {currentPage + 1} av {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
          >
            Nästa sida →
          </Button>
        </div>
      )}

      <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
        {/* Images above text */}
        {currentPageImageData.above && currentPageImageData.above.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-blue-600">Bilder ovanför texten (Sida {safePage + 1})</Label>
            <div className="grid grid-cols-2 gap-2">
              {currentPageImageData.above.map((imagePath, index) => (
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

        {/* Text content */}
        {currentPageBlocks && currentPageBlocks.length > 0 ? 
          currentPageBlocks.map((block, index) => {
            try {
              return renderBlock(block);
            } catch (error) {
              console.error('Error rendering block:', error, block);
              return <div key={index} className="text-red-500 p-2 border border-red-300 rounded">Fel vid rendering av block</div>;
            }
          }) : 
          <div className="text-gray-500 italic">Ingen text på denna sida</div>
        }

        {/* Images below text */}
        {currentPageImageData.below && currentPageImageData.below.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-blue-600">Bilder under texten (Sida {safePage + 1})</Label>
            <div className="grid grid-cols-2 gap-2">
              {currentPageImageData.below.map((imagePath, index) => (
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
        
        {/* Add "New Page" button at the end of current page */}
        {currentPage === totalPages - 1 && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={() => addBlock('page-break')}
              className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950"
            >
              <FileText className="h-4 w-4 mr-2" />
              Lägg till ny sida
            </Button>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Tips: Klicka på ett block för att redigera det. Använd knapparna ovanför för att lägga till nya block.
      </div>
    </div>
  );
}