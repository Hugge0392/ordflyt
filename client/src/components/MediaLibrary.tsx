import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import {
  Image as ImageIcon,
  Search,
  Upload,
  Check,
  Calendar,
  File,
} from 'lucide-react';
import BlogImageUploader from './BlogImageUploader';

interface MediaItem {
  id: string;
  url: string;
  alt?: string;
  type: 'image' | 'file';
  name: string;
  size: number;
  uploadedAt: string;
  blogPostId?: string;
  blogPostTitle?: string;
}

interface MediaLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (url: string, alt?: string) => void;
  mediaType?: 'image' | 'file' | 'all';
}

export default function MediaLibrary({
  isOpen,
  onClose,
  onSelectImage,
  mediaType = 'image',
}: MediaLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');

  // Fetch media from all blog posts
  const { data: blogPosts, isLoading } = useQuery({
    queryKey: ['/api/blog/posts'],
    queryFn: () => apiRequest('GET', '/api/blog/posts?status=all'),
    enabled: isOpen,
  });

  // Extract all media items from blog posts
  const mediaItems: MediaItem[] = [];

  blogPosts?.forEach((post: any) => {
    // Hero images
    if (post.heroImageUrl) {
      mediaItems.push({
        id: `${post.id}-hero`,
        url: post.heroImageUrl,
        alt: post.heroImageAlt,
        type: 'image',
        name: post.heroImageAlt || 'Hero Image',
        size: 0,
        uploadedAt: post.createdAt,
        blogPostId: post.id,
        blogPostTitle: post.title,
      });
    }

    // Gallery images
    post.galleryImages?.forEach((img: any, idx: number) => {
      mediaItems.push({
        id: `${post.id}-gallery-${idx}`,
        url: img.url,
        alt: img.alt,
        type: 'image',
        name: img.alt || `Gallery Image ${idx + 1}`,
        size: 0,
        uploadedAt: post.createdAt,
        blogPostId: post.id,
        blogPostTitle: post.title,
      });
    });

    // Downloadable files
    if (mediaType === 'file' || mediaType === 'all') {
      post.downloadFiles?.forEach((file: any, idx: number) => {
        mediaItems.push({
          id: `${post.id}-file-${idx}`,
          url: file.url,
          type: 'file',
          name: file.name,
          size: file.size,
          uploadedAt: post.createdAt,
          blogPostId: post.id,
          blogPostTitle: post.title,
        });
      });
    }
  });

  // Filter media items
  const filteredMedia = mediaItems.filter(item => {
    if (mediaType !== 'all' && item.type !== mediaType) return false;
    if (searchTerm) {
      return (
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.alt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.blogPostTitle?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return true;
  });

  const handleSelect = () => {
    if (selectedUrl) {
      const selected = mediaItems.find(m => m.url === selectedUrl);
      onSelectImage(selectedUrl, selected?.alt);
      onClose();
    }
  };

  const handleUploadComplete = (url: string, alt?: string) => {
    onSelectImage(url, alt);
    onClose();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Mediabibliotek
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library">
              <File className="h-4 w-4 mr-2" />
              Bibliotek ({filteredMedia.length})
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Ladda upp ny
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-4 mt-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sök media..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Media Grid */}
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Laddar media...
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Inga mediafiler hittades</p>
                <p className="text-sm">Ladda upp din första bild eller fil</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 max-h-[500px] overflow-y-auto p-1">
                {filteredMedia.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedUrl(item.url)}
                    className={`
                      relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all
                      ${selectedUrl === item.url ? 'border-primary ring-2 ring-primary' : 'border-gray-200 hover:border-gray-300'}
                    `}
                  >
                    {/* Selection Indicator */}
                    {selectedUrl === item.url && (
                      <div className="absolute top-2 right-2 z-10 bg-primary text-white rounded-full p-1">
                        <Check className="h-4 w-4" />
                      </div>
                    )}

                    {/* Image/File Preview */}
                    {item.type === 'image' ? (
                      <div className="aspect-square bg-gray-100">
                        <img
                          src={item.url}
                          alt={item.alt || item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square bg-gray-100 flex flex-col items-center justify-center p-4">
                        <File className="h-12 w-12 text-gray-400 mb-2" />
                        <span className="text-xs text-center text-gray-600 truncate w-full">
                          {item.name}
                        </span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="p-2 bg-white">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {item.type}
                        </Badge>
                        {item.size > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(item.size)}
                          </span>
                        )}
                      </div>
                      {item.blogPostTitle && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          Från: {item.blogPostTitle}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(item.uploadedAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Avbryt
              </Button>
              <Button onClick={handleSelect} disabled={!selectedUrl}>
                Välj media
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <BlogImageUploader
              onUploadComplete={handleUploadComplete}
              maxSizeMB={5}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
