import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Bold, Italic, List, ListOrdered, Image, Type, Quote, Trash2, Minus, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { UploadResult } from "@uppy/core";

// Simple markdown-to-HTML converter for preview
function formatMarkdownToHTML(text: string): string {
  let html = text;
  
  // Convert headings - only at start of line followed by space
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Convert bold (**text**) - must have content between
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Convert italic (*text*) - must have content between and not interfere with bold
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  
  // Convert line breaks
  html = html.replace(/\n/g, '<br>');
  
  // Convert bullet points - only at start of line
  html = html.replace(/^• (.+)$/gm, '<li>$1</li>');
  
  // Group consecutive list items into ul tags
  html = html.replace(/(<li>.*?<\/li>)(<br>)*(<li>.*?<\/li>)*/g, function(match) {
    // Remove br tags between list items and wrap in ul
    const cleanedMatch = match.replace(/<br>/g, '');
    return `<ul>${cleanedMatch}</ul>`;
  });
  
  return html;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'heading' | 'quote' | 'list' | 'page-break';
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
  if (!html) return [{ id: '1', type: 'text', content: '' }];
  
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
      case 'img':
        const img = element as HTMLImageElement;
        blocks.push({
          id: getId(),
          type: 'image',
          content: img.src,
          metadata: { alt: img.alt }
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
          // Treat as text
          const htmlContent = element.innerHTML || '';
          const textContent = element.textContent || '';
          if (textContent.trim()) {
            blocks.push({
              id: getId(),
              type: 'text',
              content: htmlContent || textContent
            });
          }
        }
        break;
      case 'p':
      default:
        const htmlContent = element.innerHTML || '';
        const textContent = element.textContent || '';
        if (textContent.trim()) {
          blocks.push({
            id: getId(),
            type: 'text',
            content: htmlContent || textContent
          });
        }
        break;
    }
  });
  
  // If no blocks were created, create a default text block
  if (blocks.length === 0) {
    return [{ id: '1', type: 'text', content: html }];
  }
  
  return blocks;
};

export function RichTextEditor({ value, onChange, placeholder = "Skriv din text här...", className }: RichTextEditorProps) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => {
    return parseHTMLToBlocks(value || '');
  });
  
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const { toast } = useToast();

  // Re-parse when the value prop changes (e.g., when loading existing content)
  useEffect(() => {
    if (value !== undefined) {
      const newBlocks = parseHTMLToBlocks(value);
      setBlocks(newBlocks);
    }
  }, [value]);

  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    const newBlocks = blocks.map(block => 
      block.id === id ? { ...block, ...updates } : block
    );
    setBlocks(newBlocks);
    
    // Convert blocks back to HTML/text for the parent component
    const htmlContent = newBlocks.map(block => {
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
        case 'image':
          return `<img src="${block.content}" alt="${block.metadata?.alt || ''}" />`;
        case 'page-break':
          return `<div class="page-break" data-page-break="true">--- Sidbrytning ---</div>`;
        case 'text':
        default:
          // Convert markdown to HTML before saving
          const content = block.content.trim();
          if (content.includes('<') && content.includes('>')) {
            return content;
          } else {
            // Convert markdown formatting to HTML
            const htmlContent = formatMarkdownToHTML(content);
            return htmlContent.startsWith('<h') || htmlContent.includes('<strong>') || htmlContent.includes('<em>') || htmlContent.includes('<ul>') 
              ? htmlContent 
              : `<p>${htmlContent}</p>`;
          }
      }
    }).join('\n');
    
    onChange(htmlContent);
  };

  const addBlock = (type: ContentBlock['type'], afterId?: string) => {
    const newBlock: ContentBlock = {
      id: Date.now().toString(),
      type,
      content: '',
      metadata: type === 'heading' ? { level: 2 } : 
                type === 'list' ? { listType: 'unordered' } : undefined
    };

    if (afterId) {
      const index = blocks.findIndex(b => b.id === afterId);
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      setBlocks(newBlocks);
    } else {
      setBlocks([...blocks, newBlock]);
    }
    
    setActiveBlockId(newBlock.id);
  };

  const removeBlock = (id: string) => {
    if (blocks.length === 1) return; // Don't remove the last block
    
    setBlocks(blocks.filter(block => block.id !== id));
    setActiveBlockId(null);
  };

  const handleImageUpload = (blockId: string) => {
    return async () => {
      try {
        const response = await fetch("/api/objects/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return {
          method: "PUT" as const,
          url: data.uploadURL,
        };
      } catch (error) {
        console.error("Upload error:", error);
        toast({
          title: "Fel",
          description: "Kunde inte förbereda bilduppladdning",
          variant: "destructive",
        });
        throw error;
      }
    };
  };

  const handleImageUploadComplete = (blockId: string) => {
    return (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
      if (result.successful && result.successful.length > 0) {
        const uploadURL = result.successful?.[0]?.uploadURL;
        if (uploadURL) {
          // Process the upload URL to get the object path
          fetch("/api/lesson-images", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ imageURL: uploadURL }),
          })
          .then(response => response.json())
          .then(data => {
            const imagePath = `/objects${data.objectPath.split('/objects')[1]}`;
            updateBlock(blockId, { content: imagePath });
            toast({
              title: "Bild uppladdad!",
              description: "Bilden har lagts till i din text.",
            });
          })
          .catch(error => {
            console.error("Error processing image:", error);
            toast({
              title: "Fel",
              description: "Kunde inte bearbeta bilden",
              variant: "destructive",
            });
          });
        }
      }
    };
  };

  const renderBlock = (block: ContentBlock) => {
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
              onClick={() => addBlock('image', block.id)}
              className="h-6 w-6 p-0"
              title="Lägg till bild"
            >
              <Image className="h-3 w-3" />
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addBlock('page-break', block.id)}
              className="h-6 w-6 p-0"
              title="Lägg till ny sida"
            >
              <FileText className="h-3 w-3" />
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
                  const textarea = document.querySelector(`[data-testid="textarea-block-${block.id}"]`) as HTMLTextAreaElement;
                  if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const selectedText = textarea.value.substring(start, end);
                    if (selectedText) {
                      const beforeText = textarea.value.substring(0, start);
                      const afterText = textarea.value.substring(end);
                      const newText = beforeText + `**${selectedText}**` + afterText;
                      textarea.value = newText;
                      updateBlock(block.id, { content: newText.replace(/\n/g, '<br>') });
                      // Keep focus and update cursor position
                      const newCursorPos = start + 4 + selectedText.length;
                      textarea.setSelectionRange(newCursorPos, newCursorPos);
                      textarea.focus();
                    } else {
                      // No text selected, insert bold markers at cursor
                      const cursorPos = start;
                      const beforeText = textarea.value.substring(0, cursorPos);
                      const afterText = textarea.value.substring(cursorPos);
                      const newText = beforeText + '****' + afterText;
                      textarea.value = newText;
                      updateBlock(block.id, { content: newText.replace(/\n/g, '<br>') });
                      // Position cursor between the markers
                      textarea.setSelectionRange(cursorPos + 2, cursorPos + 2);
                      textarea.focus();
                    }
                  }
                }}
                title="Fetstil - använd **text** för att fetstila"
              >
                <Bold className="h-4 w-4 mr-1" />
                <span className="text-xs">**Fet**</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => {
                  const textarea = document.querySelector(`[data-testid="textarea-block-${block.id}"]`) as HTMLTextAreaElement;
                  if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const selectedText = textarea.value.substring(start, end);
                    if (selectedText) {
                      const beforeText = textarea.value.substring(0, start);
                      const afterText = textarea.value.substring(end);
                      const newText = beforeText + `*${selectedText}*` + afterText;
                      textarea.value = newText;
                      updateBlock(block.id, { content: newText.replace(/\n/g, '<br>') });
                      // Keep focus and update cursor position
                      const newCursorPos = start + 2 + selectedText.length;
                      textarea.setSelectionRange(newCursorPos, newCursorPos);
                      textarea.focus();
                    } else {
                      // No text selected, insert italic markers at cursor
                      const cursorPos = start;
                      const beforeText = textarea.value.substring(0, cursorPos);
                      const afterText = textarea.value.substring(cursorPos);
                      const newText = beforeText + '**' + afterText;
                      textarea.value = newText;
                      updateBlock(block.id, { content: newText.replace(/\n/g, '<br>') });
                      // Position cursor between the markers
                      textarea.setSelectionRange(cursorPos + 1, cursorPos + 1);
                      textarea.focus();
                    }
                  }
                }}
                title="Kursiv - använd *text* för att kursivera"
              >
                <Italic className="h-4 w-4 mr-1" />
                <span className="text-xs">*Kursiv*</span>
              </Button>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 my-1" />
              <select
                className="h-8 px-2 text-xs border rounded bg-white dark:bg-gray-700"
                onChange={(e) => {
                  const textarea = document.querySelector(`[data-testid="textarea-block-${block.id}"]`) as HTMLTextAreaElement;
                  if (textarea && e.target.value) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const selectedText = textarea.value.substring(start, end);
                    const level = e.target.value;
                    const hashes = '#'.repeat(parseInt(level));
                    
                    if (selectedText) {
                      const beforeText = textarea.value.substring(0, start);
                      const afterText = textarea.value.substring(end);
                      const newText = beforeText + `${hashes} ${selectedText}` + afterText;
                      textarea.value = newText;
                      updateBlock(block.id, { content: newText.replace(/\n/g, '<br>') });
                      // Keep focus and update cursor position
                      const newCursorPos = start + hashes.length + 1 + selectedText.length;
                      textarea.setSelectionRange(newCursorPos, newCursorPos);
                      textarea.focus();
                    } else {
                      // No text selected, insert heading markers at cursor
                      const cursorPos = start;
                      const beforeText = textarea.value.substring(0, cursorPos);
                      const afterText = textarea.value.substring(cursorPos);
                      const newText = beforeText + `${hashes} ` + afterText;
                      textarea.value = newText;
                      updateBlock(block.id, { content: newText.replace(/\n/g, '<br>') });
                      // Position cursor after the markers
                      textarea.setSelectionRange(cursorPos + hashes.length + 1, cursorPos + hashes.length + 1);
                      textarea.focus();
                    }
                  }
                  e.target.value = ''; // Reset selection
                }}
                title="Gör markerad text till rubrik - använd # för H1, ## för H2, ### för H3"
              >
                <option value="">Rubrik</option>
                <option value="1"># H1 - Stor</option>
                <option value="2">## H2 - Medium</option>
                <option value="3">### H3 - Liten</option>
              </select>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => {
                  const textarea = document.querySelector(`[data-testid="textarea-block-${block.id}"]`) as HTMLTextAreaElement;
                  if (textarea) {
                    const cursorPos = textarea.selectionStart;
                    const beforeText = textarea.value.substring(0, cursorPos);
                    const afterText = textarea.value.substring(cursorPos);
                    const newText = beforeText + '\n• ' + afterText;
                    textarea.value = newText;
                    updateBlock(block.id, { content: newText.replace(/\n/g, '<br>') });
                    // Position cursor after the bullet
                    const newCursorPos = cursorPos + 3;
                    textarea.setSelectionRange(newCursorPos, newCursorPos);
                    textarea.focus();
                  }
                }}
                title="Lägg till punktlista"
              >
                <List className="h-4 w-4 mr-1" />
                <span className="text-xs">Lista</span>
              </Button>
            </div>
            
            {/* Rich text editor - always visible */}
            <div className="border rounded-md bg-white dark:bg-gray-900">
              <Textarea
                value={block.content.replace(/<br\s*\/?>/gi, '\n')}
                onChange={(e) => {
                  const newContent = e.target.value.replace(/\n/g, '<br>');
                  updateBlock(block.id, { content: newContent });
                }}
                placeholder={placeholder}
                className="border-none p-4 resize-y min-h-[200px] max-h-[400px] focus-visible:ring-0 text-base leading-relaxed"
                data-testid={`textarea-block-${block.id}`}
              />
            </div>
            
            {/* Preview area (shows formatted result) */}
            {block.content && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border">
                <div className="text-xs text-gray-500 mb-2">Förhandsgranskning:</div>
                <div 
                  className="prose max-w-none text-sm"
                  dangerouslySetInnerHTML={{ 
                    __html: formatMarkdownToHTML(block.content.replace(/<br\s*\/?>/gi, '\n'))
                  }}
                />
              </div>
            )}
            <div className="flex justify-between text-xs text-muted-foreground">
              <div>Tips: Använd **fetstil**, *kursiv*, # rubriker och • listor</div>
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
                block.metadata?.level === 1 ? 'text-2xl font-bold' :
                block.metadata?.level === 3 ? 'text-lg font-bold' :
                'text-xl font-bold'
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

        {block.type === 'image' && (
          <div className="space-y-3">
            {!block.content ? (
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={5 * 1024 * 1024} // 5MB
                onGetUploadParameters={handleImageUpload(block.id)}
                onComplete={handleImageUploadComplete(block.id)}
                buttonClassName="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
              >
                <div className="flex flex-col items-center gap-2 text-gray-500">
                  <Image className="h-8 w-8" />
                  <span>Klicka för att ladda upp bild</span>
                  <span className="text-xs">JPG, PNG eller GIF (max 5MB)</span>
                </div>
              </ObjectUploader>
            ) : (
              <div className="space-y-2">
                <img
                  src={block.content}
                  alt={block.metadata?.alt || ''}
                  className="max-w-full h-auto rounded-lg"
                />
                <Input
                  value={block.metadata?.alt || ''}
                  onChange={(e) => updateBlock(block.id, { 
                    metadata: { ...block.metadata, alt: e.target.value }
                  })}
                  placeholder="Bildtext/alt-text..."
                  className="text-sm"
                  data-testid={`input-image-alt-${block.id}`}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateBlock(block.id, { content: '', metadata: { ...block.metadata, alt: '' } })}
                >
                  Byt bild
                </Button>
              </div>
            )}
          </div>
        )}

        {block.type === 'page-break' && (
          <div className="py-4 text-center">
            <div className="flex items-center gap-3 justify-center">
              <div className="h-px bg-gray-300 dark:bg-gray-600 flex-1 max-w-20"></div>
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                <FileText className="h-4 w-4" />
                <span>Ny sida</span>
              </div>
              <div className="h-px bg-gray-300 dark:bg-gray-600 flex-1 max-w-20"></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Läsarna kommer att bläddra till nästa sida här
            </p>
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
            onClick={() => addBlock('image')}
            data-testid="button-add-image-block"
          >
            <Image className="h-4 w-4 mr-2" />
            Bild
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
        </div>
      </div>

      <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
        {blocks.map(renderBlock)}
      </div>

      <div className="text-xs text-muted-foreground">
        Tips: Klicka på ett block för att redigera det. Använd knapparna ovanför för att lägga till nya block.
      </div>
    </div>
  );
}