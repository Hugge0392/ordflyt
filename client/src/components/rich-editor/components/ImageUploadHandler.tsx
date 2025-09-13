import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import imageCompression from 'browser-image-compression';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface ImageUploadHandlerProps {
  editor: any;
  onImageInsert?: (imageUrl: string) => void;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'compressing' | 'completed' | 'error';
}

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_MB = 10;

export function ImageUploadHandler({ editor, onImageInsert }: ImageUploadHandlerProps) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const { toast } = useToast();

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return 'Endast PNG, JPG, WebP och GIF-filer är tillåtna.';
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `Filen är för stor. Maxstorlek är ${MAX_FILE_SIZE_MB}MB.`;
    }
    return null;
  };

  const compressImage = async (file: File, onProgress?: (progress: number) => void): Promise<File> => {
    return new Promise((resolve, reject) => {
      const options = {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        onProgress: (progress: number) => {
          onProgress?.(Math.round(progress));
        },
      };

      imageCompression(file, options)
        .then(resolve)
        .catch(reject);
    });
  };

  const uploadImageFile = async (file: File): Promise<string> => {
    setUploadProgress({
      fileName: file.name,
      progress: 0,
      status: 'compressing',
    });

    try {
      // Compress the image
      const compressedFile = await compressImage(file, (progress) => {
        setUploadProgress(prev => prev ? { ...prev, progress } : null);
      });

      setUploadProgress(prev => prev ? { ...prev, status: 'uploading', progress: 0 } : null);

      // Upload the compressed image
      const formData = new FormData();
      formData.append('file', compressedFile, file.name);

      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(prev => prev ? { ...prev, progress } : null);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            if (response.objectPath) {
              setUploadProgress(prev => prev ? { ...prev, status: 'completed', progress: 100 } : null);
              resolve(response.objectPath);
            } else {
              reject(new Error('No object path returned'));
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', '/api/upload-direct');
        xhr.send(formData);
      });

    } catch (error) {
      setUploadProgress(prev => prev ? { ...prev, status: 'error' } : null);
      throw error;
    }
  };

  const handleFileUpload = useCallback(async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      toast({
        title: 'Ogiltig fil',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    setShowUploadDialog(true);

    try {
      const imageUrl = await uploadImageFile(file);
      
      // Insert image into editor using insertImageBlock for smooth text navigation
      if (editor) {
        editor.chain().focus().insertImageBlock({
          src: imageUrl,
          alt: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension for alt text
        }).run();
      }

      onImageInsert?.(imageUrl);

      toast({
        title: 'Bild uppladdad!',
        description: 'Bilden har lagts till i dokumentet',
      });

      // Close dialog after a short delay
      setTimeout(() => {
        setShowUploadDialog(false);
        setUploadProgress(null);
      }, 1000);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Uppladdning misslyckades',
        description: 'Kunde inte ladda upp bilden. Försök igen.',
        variant: 'destructive',
      });
      setShowUploadDialog(false);
      setUploadProgress(null);
    }
  }, [editor, onImageInsert, toast]);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const files = event.dataTransfer?.files;
      if (files && files.length > 0) {
        handleFileUpload(files);
      }
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const openFileDialog = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ALLOWED_IMAGE_TYPES.join(',');
    input.multiple = false;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        handleFileUpload(files);
      }
    };
    input.click();
  };

  // Return handlers for external use
  const dragHandlers = {
    onDrop: handleDrop,
    onDragOver: handleDragOver,
    onDragEnter: handleDragEnter,
  };

  return {
    dragHandlers,
    openFileDialog,
    isUploading: uploadProgress?.status === 'uploading' || uploadProgress?.status === 'compressing',
    UploadDialog: () => (
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Laddar upp bild
            </DialogTitle>
          </DialogHeader>
          
          {uploadProgress && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <ImageIcon className="h-8 w-8 text-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {uploadProgress.fileName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {uploadProgress.status === 'compressing' && 'Komprimerar...'}
                    {uploadProgress.status === 'uploading' && 'Laddar upp...'}
                    {uploadProgress.status === 'completed' && 'Klar!'}
                    {uploadProgress.status === 'error' && 'Fel uppstod'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{uploadProgress.status === 'compressing' ? 'Komprimering' : 'Uppladdning'}</span>
                  <span>{uploadProgress.progress}%</span>
                </div>
                <Progress 
                  value={uploadProgress.progress} 
                  className="w-full h-2"
                  data-testid="upload-progress"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    ),
  };
}

// Hook for easy integration
export function useImageUpload(editor: any) {
  const { dragHandlers, openFileDialog, isUploading, UploadDialog } = ImageUploadHandler({ editor });

  return {
    dragHandlers,
    openFileDialog,
    isUploading,
    UploadDialog,
  };
}