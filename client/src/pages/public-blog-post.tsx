import { useQuery } from '@tantml:query/react-query';
import { useParams, Link } from 'wouter';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  User,
  Eye,
  Tag,
  Download,
  Share2,
  Facebook,
  Twitter,
  Link as LinkIcon,
  ArrowLeft,
  Youtube,
} from 'lucide-react';
import RichDocRenderer from '@/components/rich-editor/RichDocRenderer';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: any;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  galleryImages: Array<{ url: string; alt: string; caption?: string }>;
  downloadFiles: Array<{ url: string; name: string; type: string; size: number }>;
  videoEmbeds: Array<{ type: 'youtube' | 'vimeo'; videoId: string; title?: string }>;
  tags: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  socialImageUrl: string | null;
  viewCount: number;
  publishedAt: string;
  authorName: string;
}

export default function PublicBlogPostPage() {
  const params = useParams();
  const { toast } = useToast();
  const slug = params.slug || '';
  const [shareMenuOpen, setShareMenuOpen] = useState(false);

  const { data: post, isLoading, error } = useQuery<BlogPost>({
    queryKey: ['/api/blog/public/posts', slug],
    queryFn: async () => {
      const res = await fetch(`/api/blog/public/posts/${slug}`);
      if (!res.ok) throw new Error('Post not found');
      return res.json();
    },
    enabled: !!slug,
  });

  const handleShare = async (platform: 'facebook' | 'twitter' | 'copy') => {
    const url = window.location.href;
    const title = post?.title || '';

    if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
    } else if (platform === 'copy') {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Länk kopierad!',
        description: 'Länken har kopierats till urklipp.',
      });
      setShareMenuOpen(false);
    }
  };

  const getYouTubeEmbedUrl = (videoId: string) => {
    return `https://www.youtube.com/embed/${videoId}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-12">
        <div className="text-center">Laddar...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <h1 className="text-2xl font-bold mb-4">Bloggpost hittades inte</h1>
            <p className="text-muted-foreground mb-6">
              Den bloggpost du söker efter existerar inte eller har tagits bort.
            </p>
            <Link href="/lektionsmaterial">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tillbaka till blogg
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.metaDescription,
    image: post.socialImageUrl || post.heroImageUrl,
    datePublished: post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Ordflyt',
      logo: {
        '@type': 'ImageObject',
        url: 'https://dinapp.se/logo.png',
      },
    },
  };

  return (
    <>
      <Helmet>
        <title>{post.metaTitle || post.title}</title>
        <meta name="description" content={post.metaDescription || post.excerpt || ''} />
        {post.focusKeyword && <meta name="keywords" content={post.focusKeyword} />}

        {/* Open Graph */}
        <meta property="og:title" content={post.metaTitle || post.title} />
        <meta property="og:description" content={post.metaDescription || post.excerpt || ''} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={post.socialImageUrl || post.heroImageUrl || ''} />
        <meta property="article:published_time" content={post.publishedAt} />
        <meta property="article:author" content={post.authorName} />
        {post.tags?.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.metaTitle || post.title} />
        <meta name="twitter:description" content={post.metaDescription || post.excerpt || ''} />
        <meta name="twitter:image" content={post.socialImageUrl || post.heroImageUrl || ''} />

        {/* Structured Data */}
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>

        <link rel="canonical" href={`https://dinapp.se/lektionsmaterial/${post.slug}`} />
      </Helmet>

      <article className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        {post.heroImageUrl && (
          <div className="relative w-full h-[60vh] bg-black">
            <img
              src={post.heroImageUrl}
              alt={post.heroImageAlt || post.title}
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0">
              <div className="container mx-auto px-4 pb-12">
                <div className="max-w-4xl">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="bg-white/20 backdrop-blur text-white">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Title */}
                  <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
                    {post.title}
                  </h1>

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-6 text-white/90">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      <span>{post.authorName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      <span>
                        {new Date(post.publishedAt).toLocaleDateString('sv-SE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      <span>{post.viewCount} visningar</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <Link href="/lektionsmaterial">
              <Button variant="ghost" className="mb-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tillbaka till blogg
              </Button>
            </Link>

            {/* No Hero Image Title */}
            {!post.heroImageUrl && (
              <div className="mb-8">
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags?.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <h1 className="text-5xl font-bold mb-4">{post.title}</h1>
                <div className="flex flex-wrap items-center gap-6 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    <span>{post.authorName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    <span>
                      {new Date(post.publishedAt).toLocaleDateString('sv-SE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    <span>{post.viewCount} visningar</span>
                  </div>
                </div>
              </div>
            )}

            {/* Excerpt */}
            {post.excerpt && (
              <Card className="mb-8 bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <p className="text-lg text-blue-900 leading-relaxed">{post.excerpt}</p>
                </CardContent>
              </Card>
            )}

            {/* Main Content */}
            <Card className="mb-8">
              <CardContent className="pt-6 prose prose-lg max-w-none">
                <RichDocRenderer content={post.content} />
              </CardContent>
            </Card>

            {/* Video Embeds */}
            {post.videoEmbeds && post.videoEmbeds.length > 0 && (
              <Card className="mb-8">
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Youtube className="h-6 w-6 text-red-600" />
                    Videor
                  </h2>
                  <div className="space-y-6">
                    {post.videoEmbeds.map((video, index) => (
                      <div key={index} className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                        <iframe
                          src={getYouTubeEmbedUrl(video.videoId)}
                          title={video.title || `Video ${index + 1}`}
                          className="absolute top-0 left-0 w-full h-full rounded-lg"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gallery */}
            {post.galleryImages && post.galleryImages.length > 0 && (
              <Card className="mb-8">
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-bold mb-4">Bildgalleri</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {post.galleryImages.map((image, index) => (
                      <div key={index} className="space-y-2">
                        <img
                          src={image.url}
                          alt={image.alt}
                          className="w-full h-auto rounded-lg"
                        />
                        {image.caption && (
                          <p className="text-sm text-muted-foreground italic">{image.caption}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Downloadable Files */}
            {post.downloadFiles && post.downloadFiles.length > 0 && (
              <Card className="mb-8 bg-green-50 border-green-200">
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-green-900">
                    <Download className="h-6 w-6" />
                    Nedladdningsbara filer
                  </h2>
                  <div className="space-y-3">
                    {post.downloadFiles.map((file, index) => (
                      <a
                        key={index}
                        href={file.url}
                        download
                        className="flex items-center justify-between p-4 bg-white rounded-lg hover:shadow-md transition-shadow border border-green-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded">
                            <Download className="h-5 w-5 text-green-700" />
                          </div>
                          <div>
                            <div className="font-semibold">{file.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {file.type.toUpperCase()} • {formatFileSize(file.size)}
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Ladda ner
                        </Button>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator className="my-8" />

            {/* Share Section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-muted-foreground" />
                <div className="flex flex-wrap gap-2">
                  {post.tags?.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground mr-2">Dela:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare('facebook')}
                >
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare('twitter')}
                >
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare('copy')}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Back to Blog */}
            <div className="mt-12 pt-8 border-t">
              <Link href="/lektionsmaterial">
                <Button variant="outline" size="lg">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Tillbaka till alla bloggposter
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
