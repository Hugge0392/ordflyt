import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Youtube,
  Video,
  Plus,
  X,
  ExternalLink,
} from 'lucide-react';

interface VideoEmbed {
  type: 'youtube' | 'vimeo';
  videoId: string;
  title?: string;
}

interface VideoEmbedManagerProps {
  videos: VideoEmbed[];
  onVideosChange: (videos: VideoEmbed[]) => void;
}

export default function VideoEmbedManager({
  videos,
  onVideosChange,
}: VideoEmbedManagerProps) {
  const { toast } = useToast();
  const [videoType, setVideoType] = useState<'youtube' | 'vimeo'>('youtube');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');

  const extractVideoId = (url: string, type: 'youtube' | 'vimeo'): string | null => {
    if (type === 'youtube') {
      // Support multiple YouTube URL formats
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/, // Direct ID
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
      }
    } else if (type === 'vimeo') {
      const match = url.match(/vimeo\.com\/(\d+)/);
      if (match) return match[1];
      // Direct ID
      if (/^\d+$/.test(url)) return url;
    }
    return null;
  };

  const getYouTubeEmbedUrl = (videoId: string) => {
    return `https://www.youtube.com/embed/${videoId}`;
  };

  const getVimeoEmbedUrl = (videoId: string) => {
    return `https://player.vimeo.com/video/${videoId}`;
  };

  const getYouTubeThumbnail = (videoId: string) => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  const handleAddVideo = () => {
    const videoId = extractVideoId(videoUrl, videoType);

    if (!videoId) {
      toast({
        title: 'Ogiltig video-URL',
        description: `Ange en giltig ${videoType === 'youtube' ? 'YouTube' : 'Vimeo'}-URL eller video-ID`,
        variant: 'destructive',
      });
      return;
    }

    const newVideo: VideoEmbed = {
      type: videoType,
      videoId,
      title: videoTitle || undefined,
    };

    onVideosChange([...videos, newVideo]);

    toast({
      title: 'Video tillagd!',
      description: `${videoType === 'youtube' ? 'YouTube' : 'Vimeo'}-video har lagts till.`,
    });

    // Reset form
    setVideoUrl('');
    setVideoTitle('');
  };

  const handleRemove = (index: number) => {
    const newVideos = videos.filter((_, i) => i !== index);
    onVideosChange(newVideos);
  };

  return (
    <div className="space-y-4">
      {/* Add Video Form */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Video-plattform</Label>
            <Select value={videoType} onValueChange={(value: any) => setVideoType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">
                  <div className="flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-red-600" />
                    YouTube
                  </div>
                </SelectItem>
                <SelectItem value="vimeo">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-blue-600" />
                    Vimeo
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="video-url">Video-URL eller ID</Label>
            <Input
              id="video-url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder={
                videoType === 'youtube'
                  ? 'https://youtube.com/watch?v=... eller dQw4w9WgXcQ'
                  : 'https://vimeo.com/123456789 eller 123456789'
              }
              onKeyPress={(e) => e.key === 'Enter' && handleAddVideo()}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Klistra in länken från {videoType === 'youtube' ? 'YouTube' : 'Vimeo'} eller bara video-ID:t
            </p>
          </div>

          <div>
            <Label htmlFor="video-title">Titel (valfritt)</Label>
            <Input
              id="video-title"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              placeholder="Beskrivande titel för videon"
            />
          </div>

          <Button onClick={handleAddVideo} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Lägg till video
          </Button>
        </CardContent>
      </Card>

      {/* Video List */}
      {videos.length > 0 && (
        <div className="space-y-3">
          <Label>Tillagda videor ({videos.length})</Label>
          {videos.map((video, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Video Preview */}
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

                  {/* Video Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {video.type === 'youtube' ? (
                        <Youtube className="h-5 w-5 text-red-600 flex-shrink-0" />
                      ) : (
                        <Video className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        {video.title && (
                          <div className="font-medium truncate">{video.title}</div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          <Badge variant="outline" className="mr-2">
                            {video.type === 'youtube' ? 'YouTube' : 'Vimeo'}
                          </Badge>
                          <code className="text-xs">{video.videoId}</code>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const url =
                            video.type === 'youtube'
                              ? `https://youtube.com/watch?v=${video.videoId}`
                              : `https://vimeo.com/${video.videoId}`;
                          window.open(url, '_blank');
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {videos.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Inga videor tillagda ännu</p>
          <p className="text-sm">Lägg till YouTube- eller Vimeo-videor ovan</p>
        </div>
      )}
    </div>
  );
}
