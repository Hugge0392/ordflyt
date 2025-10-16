import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Image as ImageIcon, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageInserterProps {
  onImageInserted: (imageUrl: string, position: 'above' | 'below') => void;
  children: React.ReactNode;
}

export function ImageInserter({ onImageInserted, children }: ImageInserterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Fel filtyp",
        description: "Vänligen välj en bildfil (JPG, PNG, GIF)",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: "Filen är för stor",
        description: "Bilden får vara max 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

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
        setUploadedImageUrl(result.objectPath);
        toast({
          title: "Bild uppladdad!",
          description: "Välj var du vill placera bilden"
        });
      } else {
        throw new Error('No object path in response');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Uppladdning misslyckades",
        description: "Kunde inte ladda upp bilden. Försök igen.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleInsertImage = (position: 'above' | 'below') => {
    if (uploadedImageUrl) {
      onImageInserted(uploadedImageUrl, position);
      setIsOpen(false);
      setUploadedImageUrl(null);
      toast({
        title: "Bild infogad!",
        description: `Bilden har lagts till ${position === 'above' ? 'ovanför' : 'under'} texten`
      });
    }
  };

  const resetUpload = () => {
    setUploadedImageUrl(null);
    setIsUploading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Infoga bild</DialogTitle>
          <DialogDescription>
            Ladda upp en bild från din dator och välj var den ska placeras
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {!uploadedImageUrl ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Välj en bild från din dator
                  </p>
                  <p className="text-xs text-gray-500">
                    JPG, PNG eller GIF (max 5MB)
                  </p>
                </div>
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                  id="image-upload-input"
                />
                
                <Button
                  onClick={() => document.getElementById('image-upload-input')?.click()}
                  disabled={isUploading}
                  className="mt-4"
                  data-testid="button-choose-image"
                >
                  {isUploading ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-spin" />
                      Laddar upp...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Välj bild
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <img 
                  src={uploadedImageUrl} 
                  alt="Uppladdad bild" 
                  className="max-w-full h-auto rounded"
                  data-testid="img-uploaded-preview"
                />
              </div>
              
              <div className="space-y-3">
                <p className="text-sm font-medium">Var vill du placera bilden?</p>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleInsertImage('above')}
                    className="flex-1"
                    data-testid="button-insert-above"
                  >
                    Ovanför texten
                  </Button>
                  <Button 
                    onClick={() => handleInsertImage('below')}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-insert-below"
                  >
                    Under texten
                  </Button>
                </div>
                <Button 
                  onClick={resetUpload}
                  variant="ghost"
                  className="w-full"
                  data-testid="button-reset-upload"
                >
                  Välj annan bild
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}