import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Maximize, 
  Crop, 
  Edit3, 
  Upload, 
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageCropDialog } from './ImageCropDialog';
import { useToast } from '@/hooks/use-toast';
import imageCompression from 'browser-image-compression';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

interface ImageToolbarProps {
  node: any;
  updateAttributes: (attributes: any) => void;
  deleteNode: () => void;
  editor: any;
  onEditCaption: () => void;
}

export function ImageToolbar({ 
  node, 
  updateAttributes, 
  deleteNode, 
  editor,
  onEditCaption
}: ImageToolbarProps) {
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  
  const { align = 'center', src } = node.attrs;

  const handleAlignChange = (newAlign: 'left' | 'center' | 'right' | 'full') => {
    updateAttributes({ align: newAlign });
  };

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    
    try {
      // Compress the image
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      // Upload the image
      const formData = new FormData();
      formData.append('file', compressedFile);

      const response = await fetch('/api/upload-direct', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.objectPath) {
        // Reset dimensions to let the new image set its natural size
        updateAttributes({ 
          src: result.objectPath,
          width: null,
          height: null,
        });
        
        toast({
          title: 'Bild ersatt!',
          description: 'Den nya bilden har laddats upp'
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Uppladdning misslyckades',
        description: 'Kunde inte ladda upp bilden. Försök igen.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReplaceImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleImageUpload(file);
      }
    };
    input.click();
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    // Reset dimensions to let the cropped image set its natural size
    updateAttributes({ 
      src: croppedImageUrl,
      width: null,
      height: null,
    });
  };

  const alignmentButtons = [
    { align: 'left', icon: AlignLeft, label: 'Vänster' },
    { align: 'center', icon: AlignCenter, label: 'Centrerad' },
    { align: 'right', icon: AlignRight, label: 'Höger' },
    { align: 'full', icon: Maximize, label: 'Full bredd' },
  ] as const;

  return (
    <>
      {/* Main Toolbar */}
      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-2 py-1 flex items-center space-x-1">
        
        {/* Alignment Buttons */}
        {alignmentButtons.map(({ align: buttonAlign, icon: Icon, label }) => (
          <Button
            key={buttonAlign}
            variant="ghost"
            size="sm"
            onClick={() => handleAlignChange(buttonAlign)}
            className={cn(
              "h-8 w-8 p-0",
              align === buttonAlign && "bg-gray-100 dark:bg-gray-700"
            )}
            title={label}
            data-testid={`align-${buttonAlign}`}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

        {/* Edit Actions */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCropDialog(true)}
          className="h-8 w-8 p-0"
          title="Beskär bild"
          data-testid="crop-image"
        >
          <Crop className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onEditCaption}
          className="h-8 w-8 p-0"
          title="Redigera bildtext"
          data-testid="edit-caption"
        >
          <Edit3 className="h-4 w-4" />
        </Button>

        {/* More Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              data-testid="image-more-actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={handleReplaceImage}
              disabled={isUploading}
              data-testid="replace-image"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Laddar upp...' : 'Ersätt bild'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={deleteNode}
              className="text-red-600 dark:text-red-400"
              data-testid="delete-image"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Ta bort bild
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Crop Dialog */}
      <ImageCropDialog
        isOpen={showCropDialog}
        onClose={() => setShowCropDialog(false)}
        imageUrl={src}
        onCropComplete={handleCropComplete}
      />
    </>
  );
}