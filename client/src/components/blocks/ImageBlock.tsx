import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Upload, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  GripVertical, 
  Settings, 
  Image as ImageIcon,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ImageBlockProps } from './types';

export function ImageBlock({ 
  block, 
  onChange, 
  onDelete, 
  onMoveUp, 
  onMoveDown, 
  readonly = false 
}: ImageBlockProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Endast bildfiler är tillåtna');
      return;
    }
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Filen är för stor. Maxstorlek är 10MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file, file.name);

      const response = await fetch('/api/upload-direct', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed (${response.status}): ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }

      const result = await response.json();
      
      if (!result.objectPath) {
        throw new Error('Server did not return an object path');
      }

      const { objectPath } = result;

      // Update block with new image
      onChange({
        ...block,
        data: {
          ...block.data,
          src: objectPath,
          alt: block.data.alt || file.name.replace(/\.[^/.]+$/, ''),
        }
      });

      toast({
        title: "Bild uppladdad",
        description: "Bilden har laddats upp framgångsrikt",
      });

    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Uppladdning misslyckades');
      toast({
        title: "Uppladdningsfel",
        description: "Kunde inte ladda upp bilden",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const updateImageData = (updates: Partial<typeof block.data>) => {
    onChange({
      ...block,
      data: {
        ...block.data,
        ...updates
      }
    });
  };

  const getSizeClass = () => {
    switch (block.data.size) {
      case 'small': return 'max-w-sm';
      case 'medium': return 'max-w-md';
      case 'large': return 'max-w-lg';
      case 'original': return 'max-w-full';
      default: return 'max-w-md';
    }
  };

  const getAlignmentClass = () => {
    switch (block.data.alignment) {
      case 'left': return 'mr-auto';
      case 'center': return 'mx-auto';
      case 'right': return 'ml-auto';
      default: return 'mx-auto';
    }
  };

  return (
    <div 
      className={cn(
        "relative group border-2 rounded-lg transition-all duration-200 p-4",
        isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300",
        readonly ? "bg-gray-50" : "bg-white"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      data-testid={`image-block-container-${block.id}`}
    >
      {/* Block Controls - shown on hover */}
      {!readonly && (
        <div className="absolute -left-12 top-4 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
            onClick={() => setShowSettings(true)}
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            title="Inställningar"
            data-testid={`settings-${block.id}`}
          >
            <Settings className="h-3 w-3" />
          </Button>
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

      {/* Upload Error */}
      {uploadError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{uploadError}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUploadError(null)}
            className="ml-auto h-auto p-1"
          >
            ×
          </Button>
        </div>
      )}

      {/* Image Content */}
      {block.data.src ? (
        <div className={cn("flex flex-col", getAlignmentClass())}>
          <div className={cn("relative", getSizeClass())}>
            <img
              src={block.data.src}
              alt={block.data.alt || ''}
              className="w-full h-auto rounded-lg shadow-sm"
              loading="lazy"
              data-testid={`image-${block.id}`}
            />
            
            {/* Upload overlay - shown when uploading */}
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                <div className="flex flex-col items-center gap-2 text-white">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="text-sm">Laddar upp...</span>
                </div>
              </div>
            )}

            {/* Replace button overlay - shown on hover */}
            {!readonly && !isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white text-gray-900 hover:bg-gray-100"
                  data-testid={`replace-image-${block.id}`}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Byt bild
                </Button>
              </div>
            )}
          </div>

          {/* Caption */}
          {block.data.caption && (
            <p className="mt-2 text-sm text-gray-600 text-center italic">
              {block.data.caption}
            </p>
          )}
        </div>
      ) : (
        /* Upload Area */
        <div className="min-h-[200px] flex flex-col items-center justify-center text-gray-500">
          <div className="text-center">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-sm">Laddar upp bild...</p>
              </div>
            ) : (
              <>
                <p className="text-lg font-medium mb-2">Lägg till bild</p>
                <p className="text-sm text-gray-400 mb-4">
                  Dra och släpp en bild här eller klicka för att välja
                </p>
                
                {!readonly && (
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    data-testid={`upload-button-${block.id}`}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Välj bild
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpg,image/jpeg,image/webp,image/gif"
        onChange={handleFileInputChange}
        className="hidden"
        data-testid={`file-input-${block.id}`}
      />

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[500px]" data-testid={`settings-dialog-${block.id}`}>
          <DialogHeader>
            <DialogTitle>Bildinställningar</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="alt-text">Alt-text</Label>
              <Input
                id="alt-text"
                value={block.data.alt || ''}
                onChange={(e) => updateImageData({ alt: e.target.value })}
                placeholder="Beskriv bilden för tillgänglighet"
                data-testid={`alt-input-${block.id}`}
              />
            </div>

            <div>
              <Label htmlFor="caption">Bildtext</Label>
              <Textarea
                id="caption"
                value={block.data.caption || ''}
                onChange={(e) => updateImageData({ caption: e.target.value })}
                placeholder="Valfri bildtext som visas under bilden"
                data-testid={`caption-input-${block.id}`}
              />
            </div>

            <div>
              <Label htmlFor="size">Storlek</Label>
              <Select 
                value={block.data.size || 'medium'} 
                onValueChange={(value) => updateImageData({ size: value as any })}
              >
                <SelectTrigger data-testid={`size-select-${block.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Liten</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Stor</SelectItem>
                  <SelectItem value="original">Original</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="alignment">Justering</Label>
              <Select 
                value={block.data.alignment || 'center'} 
                onValueChange={(value) => updateImageData({ alignment: value as any })}
              >
                <SelectTrigger data-testid={`alignment-select-${block.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Vänster</SelectItem>
                  <SelectItem value="center">Centrerad</SelectItem>
                  <SelectItem value="right">Höger</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Stäng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}