import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, X, Calendar, Clock, User, Tag } from 'lucide-react';

interface BlogPost {
  title: string;
  excerpt: string;
  content: any;
  heroImageUrl?: string;
  heroImageAlt?: string;
  galleryImages?: Array<{ url: string; alt: string; caption?: string }>;
  downloadFiles?: Array<{ url: string; name: string; type: string; size: number }>;
  videoEmbeds?: Array<{ type: 'youtube' | 'vimeo'; videoId: string; title?: string }>;
  tags?: string[];
  authorName?: string;
  publishedAt?: string | Date;
  status?: string;
  readTime?: number;
}

interface BlogPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: BlogPost;
}

export default function BlogPreviewModal({
  isOpen,
  onClose,
  post,
}: BlogPreviewModalProps) {
  const getYouTubeEmbedUrl = (videoId: string) => {
    return `https://www.youtube.com/embed/${videoId}`;
  };

  const getVimeoEmbedUrl = (videoId: string) => {
    return `https://player.vimeo.com/video/${videoId}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderContent = (content: any) => {
    if (!content || typeof content !== 'object') {
      return <p className="text-gray-600">{String(content || '')}</p>;
    }

    return (
      <div className="prose prose-lg max-w-none">
        <div dangerouslySetInnerHTML={{ __html: content.html || '' }} />
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Förhandsvisning
            </DialogTitle>
            <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
              {post.status === 'draft' && 'Utkast'}
              {post.status === 'published' && 'Publicerad'}
              {post.status === 'scheduled' && 'Schemalagd'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Hero Image */}
          {post.heroImageUrl && (
            <div className="w-full rounded-lg overflow-hidden">
              <img
                src={post.heroImageUrl}
                alt={post.heroImageAlt || post.title}
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          {/* Title */}
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {post.title || 'Ingen titel'}
            </h1>

            {/* Meta Information */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {post.authorName && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{post.authorName}</span>
                </div>
              )}
              {post.publishedAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(post.publishedAt)}</span>
                </div>
              )}
              {post.readTime && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{post.readTime} min läsning</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {post.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Excerpt */}
          {post.excerpt && (
            <div className="text-xl text-gray-700 italic border-l-4 border-primary pl-4">
              {post.excerpt}
            </div>
          )}

          {/* Main Content */}
          <div className="mt-6">
            {renderContent(post.content)}
          </div>

          {/* Video Embeds */}
          {post.videoEmbeds && post.videoEmbeds.length > 0 && (
            <div className="space-y-4 mt-8">
              <h3 className="text-2xl font-semibold">Videor</h3>
              {post.videoEmbeds.map((video, index) => (
                <div key={index}>
                  {video.title && (
                    <h4 className="text-lg font-medium mb-2">{video.title}</h4>
                  )}
                  <div className="relative" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      src={
                        video.type === 'youtube'
                          ? getYouTubeEmbedUrl(video.videoId)
                          : getVimeoEmbedUrl(video.videoId)
                      }
                      title={video.title || `Video ${index + 1}`}
                      className="absolute top-0 left-0 w-full h-full rounded-lg"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Gallery Images */}
          {post.galleryImages && post.galleryImages.length > 0 && (
            <div className="space-y-4 mt-8">
              <h3 className="text-2xl font-semibold">Bildgalleri</h3>
              <div className="grid grid-cols-2 gap-4">
                {post.galleryImages.map((image, index) => (
                  <div key={index} className="space-y-2">
                    <img
                      src={image.url}
                      alt={image.alt}
                      className="w-full h-auto rounded-lg"
                    />
                    {image.caption && (
                      <p className="text-sm text-gray-600 italic">{image.caption}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Downloadable Files */}
          {post.downloadFiles && post.downloadFiles.length > 0 && (
            <div className="mt-8">
              <h3 className="text-2xl font-semibold mb-4">Nedladdningsbara filer</h3>
              <div className="space-y-2">
                {post.downloadFiles.map((file, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{file.name}</div>
                          <div className="text-sm text-muted-foreground">
                            <Badge variant="outline" className="mr-2">
                              {file.type.split('/').pop()?.toUpperCase()}
                            </Badge>
                            {formatFileSize(file.size)}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Ladda ned
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            <X className="h-4 w-4 mr-2" />
            Stäng förhandsgranskning
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
