import { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import imageCompression from 'browser-image-compression';
import { Loader2 } from 'lucide-react';

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

interface ImageCropDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onCropComplete: (croppedImageUrl: string) => void;
}

const ASPECT_RATIOS = [
  { label: 'Fri beskärning', value: null },
  { label: 'Kvadrat (1:1)', value: 1 },
  { label: 'Liggande (16:9)', value: 16 / 9 },
  { label: 'Liggande (4:3)', value: 4 / 3 },
  { label: 'Stående (3:4)', value: 3 / 4 },
  { label: 'Stående (9:16)', value: 9 / 16 },
];

export function ImageCropDialog({ isOpen, onClose, imageUrl, onCropComplete }: ImageCropDialogProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const onCropChange = useCallback((crop: Point) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropCompleteCallback = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  // Helper function to create image from canvas
  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  // Helper function to get cropped image
  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Set canvas size to cropped area
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Draw the cropped image
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas toBlob failed'));
          }
        },
        'image/jpeg',
        0.9
      );
    });
  };

  const handleCropSave = async () => {
    if (!croppedAreaPixels) {
      toast({
        title: 'Fel',
        description: 'Ingen beskärning vald',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Get cropped image blob
      const croppedImageBlob = await getCroppedImg(imageUrl, croppedAreaPixels);

      // Compress the cropped image
      const compressedFile = await imageCompression(croppedImageBlob as File, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      // Upload the cropped and compressed image
      const formData = new FormData();
      formData.append('file', compressedFile, 'cropped-image.jpg');

      const response = await fetch('/api/upload-direct', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.objectPath) {
        onCropComplete(result.objectPath);
        onClose();
        toast({
          title: 'Beskärning klar!',
          description: 'Bilden har beskurits och sparats',
        });
      } else {
        throw new Error('No object path returned');
      }
    } catch (error) {
      console.error('Crop and upload error:', error);
      toast({
        title: 'Beskärning misslyckades',
        description: 'Kunde inte beskära och spara bilden. Försök igen.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAspectChange = (value: string) => {
    if (value === 'free') {
      setAspect(null);
    } else {
      setAspect(parseFloat(value));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Beskär bild</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Aspect Ratio Selector */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium">Proportioner:</label>
            <Select value={aspect?.toString() || 'free'} onValueChange={handleAspectChange}>
              <SelectTrigger className="w-48" data-testid="aspect-ratio-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_RATIOS.map((ratio) => (
                  <SelectItem 
                    key={ratio.value?.toString() || 'free'} 
                    value={ratio.value?.toString() || 'free'}
                  >
                    {ratio.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Zoom Slider */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium">Zoom:</label>
            <div className="flex-1 max-w-xs">
              <Slider
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
                min={1}
                max={3}
                step={0.1}
                className="w-full"
                data-testid="zoom-slider"
              />
            </div>
            <span className="text-sm text-gray-500 min-w-[3rem]">{zoom.toFixed(1)}x</span>
          </div>

          {/* Cropper */}
          <div className="relative h-96 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspect || undefined}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropCompleteCallback}
              showGrid={true}
              cropShape="rect"
              data-testid="image-cropper"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            data-testid="crop-cancel"
          >
            Avbryt
          </Button>
          <Button
            onClick={handleCropSave}
            disabled={isProcessing || !croppedAreaPixels}
            data-testid="crop-save"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Beskär...
              </>
            ) : (
              'Beskär och spara'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}