import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  X,
  Loader2,
  Check,
  Image as ImageIcon,
  FolderOpen,
} from 'lucide-react';
import MediaLibrary from './MediaLibrary';

interface BlogImageUploaderProps {
  onUploadComplete: (url: string, altText?: string) => void;
  currentImage?: string;
  currentAlt?: string;
  maxSizeMB?: number;
}

export default function BlogImageUploader({
  onUploadComplete,
  currentImage,
  currentAlt,
  maxSizeMB = 5,
}: BlogImageUploaderProps) {
  const { toast } = useToast();
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [altText, setAltText] = useState(currentAlt || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  // Compress image before upload
  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimensions
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1080;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Canvas to Blob conversion failed'));
              }
            },
            'image/jpeg',
            0.85 // Quality 85%
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Validate file size
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        toast({
          title: 'Filen är för stor',
          description: `Maximal filstorlek är ${maxSizeMB} MB. Bilden kommer komprimeras automatiskt.`,
        });
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Endast bildfiler är tillåtna');
      }

      // Compress image
      setUploadProgress(25);
      const compressedBlob = await compressImage(file);

      // Get upload URL
      setUploadProgress(40);
      const response = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadURL } = await response.json();

      // Upload to object storage
      setUploadProgress(60);
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: compressedBlob,
        headers: {
          'Content-Type': 'image/jpeg',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      // Extract object path
      setUploadProgress(80);
      const url = new URL(uploadURL);
      const objectPath = url.pathname;
      const finalUrl = `/objects${objectPath}`;

      // Update ACL
      await fetch('/api/lesson-images', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageURL: uploadURL }),
      });

      setUploadProgress(100);
      setPreview(finalUrl);
      onUploadComplete(finalUrl, altText);

      toast({
        title: 'Bild uppladdad!',
        description: 'Bilden har laddats upp och komprimerats.',
      });
    } catch (error: any) {
      toast({
        title: 'Uppladdning misslyckades',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      uploadFile(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      uploadFile(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setAltText('');
    onUploadComplete('', '');
  };

  const handleAltTextChange = (newAltText: string) => {
    setAltText(newAltText);
    if (preview) {
      onUploadComplete(preview, newAltText);
    }
  };

  const handleSelectFromLibrary = (url: string, alt?: string) => {
    setPreview(url);
    setAltText(alt || '');
    onUploadComplete(url, alt);
  };

  return (
    <div className="space-y-4">
      {!preview ? (
        <>
          <div className="flex gap-2 mb-2">
            <Button
              variant="outline"
              onClick={() => setShowMediaLibrary(true)}
              className="flex-1"
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Välj från bibliotek
            </Button>
          </div>
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
            ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}
            ${isUploading ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="blog-image-upload"
            disabled={isUploading}
          />
          <label htmlFor="blog-image-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-4">
              {isUploading ? (
                <>
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  <div className="w-full max-w-xs">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-sm text-muted-foreground mt-2">
                      {uploadProgress < 40 && 'Komprimerar bild...'}
                      {uploadProgress >= 40 && uploadProgress < 80 && 'Laddar upp...'}
                      {uploadProgress >= 80 && 'Slutför...'}
                      {' '}{uploadProgress}%
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">
                      {isDragging
                        ? 'Släpp bilden här...'
                        : 'Dra och släpp en bild här'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      eller klicka för att välja en fil
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      PNG, JPG, GIF eller WebP (max {maxSizeMB} MB)
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Bilden komprimeras automatiskt för snabbare laddning
                    </p>
                  </div>
                </>
              )}
            </div>
          </label>
        </div>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Image Preview */}
              <div className="relative rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={preview}
                  alt={altText || 'Preview'}
                  className="w-full h-auto"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleRemove}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4 mr-1" />
                  Ta bort
                </Button>
              </div>

              {/* Upload Success */}
              {!isUploading && preview && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  <span>Bild uppladdad och komprimerad</span>
                </div>
              )}

              {/* Alt Text Input */}
              <div>
                <Label htmlFor="alt-text">
                  Alt-text <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="alt-text"
                  value={altText}
                  onChange={(e) => handleAltTextChange(e.target.value)}
                  placeholder="Beskriv vad bilden visar..."
                  className="mt-1"
                  disabled={isUploading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Viktigt för SEO:</strong> Beskriv bilden tydligt för sökmotorer och synskadade användare
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Media Library Modal */}
      <MediaLibrary
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelectImage={handleSelectFromLibrary}
        mediaType="image"
      />
    </div>
  );
}
