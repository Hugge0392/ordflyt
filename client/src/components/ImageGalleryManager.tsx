import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Images,
  X,
  Plus,
  GripVertical,
  FolderOpen,
} from 'lucide-react';
import BlogImageUploader from './BlogImageUploader';
import MediaLibrary from './MediaLibrary';

interface GalleryImage {
  url: string;
  alt: string;
  caption?: string;
}

interface ImageGalleryManagerProps {
  images: GalleryImage[];
  onImagesChange: (images: GalleryImage[]) => void;
}

export default function ImageGalleryManager({
  images,
  onImagesChange,
}: ImageGalleryManagerProps) {
  const { toast } = useToast();
  const [showUploader, setShowUploader] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleAddImage = (url: string, alt?: string) => {
    const newImage: GalleryImage = {
      url,
      alt: alt || '',
      caption: '',
    };
    onImagesChange([...images, newImage]);
    setShowUploader(false);
    setShowMediaLibrary(false);

    toast({
      title: 'Bild tillagd!',
      description: 'Bilden har lagts till i galleriet.',
    });
  };

  const handleRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);

    toast({
      title: 'Bild borttagen',
      description: 'Bilden har tagits bort från galleriet.',
    });
  };

  const handleUpdateCaption = (index: number, caption: string) => {
    const newImages = [...images];
    newImages[index].caption = caption;
    onImagesChange(newImages);
  };

  const handleUpdateAlt = (index: number, alt: string) => {
    const newImages = [...images];
    newImages[index].alt = alt;
    onImagesChange(newImages);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    onImagesChange(newImages);
  };

  const handleMoveDown = (index: number) => {
    if (index === images.length - 1) return;
    const newImages = [...images];
    [newImages[index + 1], newImages[index]] = [newImages[index], newImages[index + 1]];
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      {/* Add Image Buttons */}
      {!showUploader && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowMediaLibrary(true)}
            className="flex-1"
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Välj från bibliotek
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowUploader(true)}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ladda upp ny bild
          </Button>
        </div>
      )}

      {/* Image Uploader */}
      {showUploader && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Ladda upp bild till galleriet</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUploader(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <BlogImageUploader
                onUploadComplete={handleAddImage}
                maxSizeMB={5}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gallery Images */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Galleribilder ({images.length})</Label>
            <Badge variant="outline">
              <Images className="h-3 w-3 mr-1" />
              {images.length} {images.length === 1 ? 'bild' : 'bilder'}
            </Badge>
          </div>

          {images.map((image, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Image Preview */}
                  <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={image.url}
                      alt={image.alt}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Image Info */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label htmlFor={`alt-${index}`}>Alt-text *</Label>
                      <Input
                        id={`alt-${index}`}
                        value={image.alt}
                        onChange={(e) => handleUpdateAlt(index, e.target.value)}
                        placeholder="Beskrivning av bilden..."
                      />
                    </div>

                    <div>
                      <Label htmlFor={`caption-${index}`}>Bildtext (valfritt)</Label>
                      <Input
                        id={`caption-${index}`}
                        value={image.caption || ''}
                        onChange={(e) => handleUpdateCaption(index, e.target.value)}
                        placeholder="Visas under bilden i galleriet..."
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      title="Flytta upp"
                    >
                      <GripVertical className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === images.length - 1}
                      title="Flytta ner"
                    >
                      <GripVertical className="h-4 w-4 rotate-180" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(index)}
                      title="Ta bort"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {images.length === 0 && !showUploader && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <Images className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Inget bildgalleri ännu</p>
          <p className="text-sm">Lägg till bilder för att skapa ett galleri</p>
        </div>
      )}

      {/* Media Library Modal */}
      <MediaLibrary
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelectImage={handleAddImage}
        mediaType="image"
      />
    </div>
  );
}
