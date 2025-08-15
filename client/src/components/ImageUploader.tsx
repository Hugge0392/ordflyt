import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImageUploaderProps {
  onImageUploaded: (url: string) => void;
  currentImage?: string;
  placeholder?: string;
}

export function ImageUploader({ onImageUploaded, currentImage = "", placeholder = "Lägg till bild" }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(currentImage);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Get upload URL from backend
      const response = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadURL } = await response.json();

      // Upload file directly to object storage
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      // Extract object path from upload URL
      const url = new URL(uploadURL);
      const objectPath = url.pathname;
      const finalUrl = `/objects${objectPath}`;

      // Update backend with ACL policy
      await fetch('/api/lesson-images', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageURL: uploadURL })
      });

      onImageUploaded(finalUrl);
      setUrlInput(finalUrl);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Uppladdning misslyckades. Försök igen.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlChange = () => {
    onImageUploaded(urlInput);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Ladda upp från dator</Label>
        <Input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="cursor-pointer"
        />
        {isUploading && (
          <p className="text-sm text-blue-600 mt-1">Laddar upp bild...</p>
        )}
      </div>
      
      <div className="text-center text-sm text-gray-500">eller</div>
      
      <div className="space-y-2">
        <Label>URL till bild eller emoji</Label>
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://... eller 👨‍🏫"
          />
          <Button onClick={handleUrlChange} size="sm">
            Använd
          </Button>
        </div>
      </div>

      {(currentImage || urlInput) && (
        <div className="mt-4">
          <Label>Förhandsvisning:</Label>
          <div className="mt-2 p-4 border rounded-lg bg-gray-50">
            {(currentImage || urlInput).startsWith('http') ? (
              <img 
                src={currentImage || urlInput} 
                alt="Preview" 
                className="max-w-32 max-h-32 object-contain mx-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className="text-6xl text-center">
                {currentImage || urlInput || '🖼️'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}