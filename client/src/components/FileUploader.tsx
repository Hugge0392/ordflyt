import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  X,
  Loader2,
  Check,
  FileText,
  File,
  Download,
} from 'lucide-react';

interface DownloadableFile {
  url: string;
  name: string;
  type: string;
  size: number;
}

interface FileUploaderProps {
  files: DownloadableFile[];
  onFilesChange: (files: DownloadableFile[]) => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

export default function FileUploader({
  files,
  onFilesChange,
  maxSizeMB = 10,
  acceptedTypes = ['.pdf', '.docx', '.pptx', '.xlsx', '.zip'],
}: FileUploaderProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-5 w-5 text-red-600" />;
    if (type.includes('word') || type.includes('document')) return <FileText className="h-5 w-5 text-blue-600" />;
    if (type.includes('sheet') || type.includes('excel')) return <FileText className="h-5 w-5 text-green-600" />;
    if (type.includes('presentation') || type.includes('powerpoint')) return <FileText className="h-5 w-5 text-orange-600" />;
    return <File className="h-5 w-5 text-gray-600" />;
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Validate file size
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        throw new Error(`Filen är för stor. Max ${maxSizeMB} MB.`);
      }

      // Get upload URL
      setUploadProgress(30);
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
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
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

      // Add to files array
      const newFile: DownloadableFile = {
        url: finalUrl,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
      };

      setUploadProgress(100);
      onFilesChange([...files, newFile]);

      toast({
        title: 'Fil uppladdad!',
        description: `${file.name} har laddats upp.`,
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
      uploadFile(file);
    }
    // Reset input
    e.target.value = '';
  };

  const handleRemove = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="border-2 border-dashed rounded-lg p-6">
        <input
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
          disabled={isUploading}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-3">
            {isUploading ? (
              <>
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <div className="w-full max-w-xs">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Laddar upp... {uploadProgress}%
                  </p>
                </div>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">Klicka för att ladda upp fil</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {acceptedTypes.join(', ').toUpperCase()} (max {maxSizeMB} MB)
                  </p>
                </div>
              </>
            )}
          </div>
        </label>
      </div>

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <Label>Uppladdade filer ({files.length})</Label>
          {files.map((file, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(file.type)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{file.name}</div>
                      <div className="text-sm text-muted-foreground">
                        <Badge variant="outline" className="mr-2">
                          {file.type.split('/').pop()?.toUpperCase()}
                        </Badge>
                        {formatFileSize(file.size)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(file.url, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(index)}
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
    </div>
  );
}
