import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Bold, Italic, List, ListOrdered, Image, Type, Quote, Trash2, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { UploadResult } from "@uppy/core";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'heading' | 'quote' | 'list';
  content: string;
  metadata?: {
    level?: 1 | 2 | 3; // for headings
    listType?: 'ordered' | 'unordered'; // for lists
    alt?: string; // for images
    caption?: string; // for images
  };
}

export function RichTextEditor({ value, onChange, placeholder = "Skriv din text här...", className }: RichTextEditorProps) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => {
    if (!value) return [{ id: '1', type: 'text', content: '' }];
    
    // Parse existing content to blocks (simplified - in real implementation would parse HTML)
    return [{ id: '1', type: 'text', content: value }];
  });
  
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const { toast } = useToast();

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
        case 'text':
        default:
          return `<p>${block.content}</p>`;
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
        const response = await apiRequest("/api/objects/upload", {
          method: "POST",
        });
        const data = await response.json();
        return {
          method: "PUT" as const,
          url: data.uploadURL,
        };
      } catch (error) {
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
      if (result.successful.length > 0) {
        const uploadURL = result.successful[0].uploadURL;
        if (uploadURL) {
          // Process the upload URL to get the object path
          apiRequest("/api/lesson-images", {
            method: "PUT",
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
          <Textarea
            value={block.content}
            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
            placeholder={placeholder}
            className="border-none p-0 resize-none min-h-[100px] focus-visible:ring-0"
            data-testid={`textarea-block-${block.id}`}
          />
        )}

        {block.type === 'heading' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={block.metadata?.level || 2}
                onChange={(e) => updateBlock(block.id, { 
                  metadata: { ...block.metadata, level: parseInt(e.target.value) as 1 | 2 | 3 }
                })}
                className="text-sm border rounded px-2 py-1"
              >
                <option value={1}>H1</option>
                <option value={2}>H2</option>
                <option value={3}>H3</option>
              </select>
            </div>
            <Input
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder="Rubrik..."
              className="border-none p-0 text-xl font-bold focus-visible:ring-0"
              data-testid={`input-heading-${block.id}`}
            />
          </div>
        )}

        {block.type === 'quote' && (
          <Textarea
            value={block.content}
            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
            placeholder="Skriv ett citat eller viktigt stycke..."
            className="border-none p-0 italic text-gray-700 dark:text-gray-300 focus-visible:ring-0"
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
              className="border-none p-0 focus-visible:ring-0"
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
        </div>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {blocks.map(renderBlock)}
      </div>

      <div className="text-xs text-muted-foreground">
        Tips: Klicka på ett block för att redigera det. Använd knapparna ovanför för att lägga till nya block.
      </div>
    </div>
  );
}