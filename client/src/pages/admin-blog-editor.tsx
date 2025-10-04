import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  ArrowLeft,
  Save,
  Eye,
  Send,
  Calendar,
  Image as ImageIcon,
  FileText,
  Video,
  Download,
  Tag,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Link } from 'wouter';
import RichDocEditor from '@/components/rich-editor/RichDocEditor';
import BlogImageUploader from '@/components/BlogImageUploader';
import FileUploader from '@/components/FileUploader';
import VideoEmbedManager from '@/components/VideoEmbedManager';
import BlogPreviewModal from '@/components/BlogPreviewModal';
import BlogCategorySelector from '@/components/BlogCategorySelector';
import ImageGalleryManager from '@/components/ImageGalleryManager';
import TableOfContentsGenerator from '@/components/TableOfContentsGenerator';
import RelatedPostsSelector from '@/components/RelatedPostsSelector';
import SocialMediaPreview from '@/components/SocialMediaPreview';
import CommentSettings from '@/components/CommentSettings';
import BlogAnalytics from '@/components/BlogAnalytics';
import RevisionHistory from '@/components/RevisionHistory';

interface BlogPost {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: any;
  heroImageUrl?: string;
  heroImageAlt?: string;
  galleryImages: Array<{ url: string; alt: string; caption?: string }>;
  downloadFiles: Array<{ url: string; name: string; type: string; size: number }>;
  videoEmbeds: Array<{ type: 'youtube' | 'vimeo'; videoId: string; title?: string }>;
  categoryId?: string;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  seoScore: number;
  readabilityScore: number;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  scheduledFor?: string;
  enableTableOfContents: boolean;
  relatedPostIds: string[];
  socialImageUrl?: string;
  enableComments: boolean;
  commentCount?: number;
  viewCount?: number;
  shareCount?: number;
  downloadCount?: number;
  averageTimeOnPage?: number;
  publishedAt?: string | null;
  updatedAt?: string;
  revisionCount?: number;
}

export default function AdminBlogEditor() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = params.id === 'new';

  const [post, setPost] = useState<BlogPost>({
    title: '',
    slug: '',
    excerpt: '',
    content: {},
    galleryImages: [],
    downloadFiles: [],
    videoEmbeds: [],
    tags: [],
    metaTitle: '',
    metaDescription: '',
    focusKeyword: '',
    seoScore: 0,
    readabilityScore: 0,
    status: 'draft',
    enableTableOfContents: false,
    relatedPostIds: [],
    enableComments: true,
  });

  const [tagInput, setTagInput] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [slugConflict, setSlugConflict] = useState<string | null>(null);

  // Fetch existing post if editing
  const { data: existingPost, isLoading } = useQuery({
    queryKey: ['/api/blog/posts', params.id],
    queryFn: () => apiRequest('GET', `/api/blog/posts/${params.id}`),
    enabled: !isNew,
  });

  useEffect(() => {
    if (existingPost) {
      setPost(existingPost);
      setLastSaved(new Date(existingPost.updatedAt));
    }
  }, [existingPost]);

  // Track changes
  useEffect(() => {
    if (!isNew || post.title || post.excerpt || Object.keys(post.content || {}).length > 0) {
      setHasUnsavedChanges(true);
    }
  }, [post, isNew]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!hasUnsavedChanges || !post.title) return;

    const autoSaveTimer = setTimeout(() => {
      handleSave('draft');
    }, 30000); // 30 seconds

    return () => clearTimeout(autoSaveTimer);
  }, [post, hasUnsavedChanges]);

  // Auto-generate slug from title
  useEffect(() => {
    if (isNew && post.title && !post.slug) {
      const slug = post.title
        .toLowerCase()
        .replace(/å/g, 'a')
        .replace(/ä/g, 'a')
        .replace(/ö/g, 'o')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setPost(prev => ({ ...prev, slug }));
    }
  }, [post.title, isNew]);

  // Check for slug conflicts
  useEffect(() => {
    if (!post.slug) {
      setSlugConflict(null);
      return;
    }

    const checkSlugTimeout = setTimeout(async () => {
      try {
        const response = await apiRequest('GET', `/api/blog/posts/slug/${post.slug}`);
        if (response && response.id !== params.id) {
          setSlugConflict(response.title);
        } else {
          setSlugConflict(null);
        }
      } catch (error) {
        // No conflict (404 error means slug is available)
        setSlugConflict(null);
      }
    }, 500);

    return () => clearTimeout(checkSlugTimeout);
  }, [post.slug, params.id]);

  // Auto-generate meta title from title
  useEffect(() => {
    if (post.title && !post.metaTitle) {
      setPost(prev => ({
        ...prev,
        metaTitle: post.title.slice(0, 60),
      }));
    }
  }, [post.title]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: BlogPost) => {
      if (isNew) {
        return apiRequest('POST', '/api/blog/posts', data);
      } else {
        return apiRequest('PUT', `/api/blog/posts/${params.id}`, data);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/blog/posts'] });
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      toast({
        title: 'Sparat!',
        description: 'Bloggposten har sparats.',
      });
      if (isNew) {
        setLocation(`/admin/blog/edit/${data.id}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Fel',
        description: error.message || 'Kunde inte spara bloggposten.',
        variant: 'destructive',
      });
    },
  });

  const handleSave = (status?: 'draft' | 'published' | 'scheduled') => {
    const postData = status ? { ...post, status } : post;

    if (status === 'published') {
      postData.isPublished = true;
      postData.publishedAt = new Date().toISOString();
    }

    saveMutation.mutate(postData);
  };

  const addTag = () => {
    if (tagInput.trim() && !post.tags.includes(tagInput.trim())) {
      setPost(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setPost(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const addVideoEmbed = (type: 'youtube' | 'vimeo', videoId: string) => {
    setPost(prev => ({
      ...prev,
      videoEmbeds: [...prev.videoEmbeds, { type, videoId }],
    }));
  };

  const calculateSEOScore = () => {
    let score = 0;

    // Title checks
    if (post.metaTitle.length >= 30 && post.metaTitle.length <= 60) score += 20;
    else if (post.metaTitle.length > 0) score += 10;

    // Description checks
    if (post.metaDescription.length >= 120 && post.metaDescription.length <= 160) score += 20;
    else if (post.metaDescription.length > 0) score += 10;

    // Keyword checks
    if (post.focusKeyword) {
      if (post.metaTitle.toLowerCase().includes(post.focusKeyword.toLowerCase())) score += 15;
      if (post.metaDescription.toLowerCase().includes(post.focusKeyword.toLowerCase())) score += 15;
    }

    // Content checks
    if (post.excerpt && post.excerpt.length > 100) score += 10;
    if (post.heroImageUrl && post.heroImageAlt) score += 10;
    if (post.tags.length > 0) score += 10;

    return score;
  };

  useEffect(() => {
    const score = calculateSEOScore();
    if (score !== post.seoScore) {
      setPost(prev => ({ ...prev, seoScore: score }));
    }
  }, [post.metaTitle, post.metaDescription, post.focusKeyword, post.excerpt, post.heroImageUrl, post.heroImageAlt, post.tags]);

  const getSEOScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSEOScoreLabel = (score: number) => {
    if (score >= 80) return 'Utmärkt';
    if (score >= 50) return 'Bra';
    return 'Behöver förbättring';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Laddar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/blog">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Tillbaka
                </Button>
              </Link>
              <div>
                <h1 className="font-semibold">
                  {isNew ? 'Ny bloggpost' : 'Redigera bloggpost'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {hasUnsavedChanges && '● Ej sparade ändringar • '}
                  {lastSaved && `Senast sparad ${new Date(lastSaved).toLocaleTimeString('sv-SE')} • `}
                  {post.status === 'draft' ? 'Utkast' : 'Publicerad'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Förhandsgranska
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave('draft')}
                disabled={saveMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Spara utkast
              </Button>

              {post.status !== 'published' && (
                <Button
                  size="sm"
                  onClick={() => handleSave('published')}
                  disabled={saveMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Publicera
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <Input
                      placeholder="Skriv din titel här..."
                      value={post.title}
                      onChange={(e) => setPost({ ...post, title: e.target.value })}
                      className="text-2xl font-bold border-0 px-0 focus-visible:ring-0 placeholder:text-muted-foreground/50"
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug" className="text-sm text-muted-foreground">
                      URL-slug
                    </Label>
                    <Input
                      id="slug"
                      value={post.slug}
                      onChange={(e) => setPost({ ...post, slug: e.target.value })}
                      placeholder="url-slug-for-bloggen"
                      className={`font-mono text-sm ${slugConflict ? 'border-red-500' : ''}`}
                    />
                    {slugConflict ? (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Slug används redan av: "{slugConflict}"
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">
                        https://dinapp.se/lektionsmaterial/{post.slug || 'din-slug'}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content Editor */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Innehåll
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RichDocEditor
                  initialContent={post.content}
                  onChange={(content) => setPost({ ...post, content })}
                  placeholder="Börja skriva ditt innehåll här..."
                />
              </CardContent>
            </Card>

            {/* Excerpt */}
            <Card>
              <CardHeader>
                <CardTitle>Utdrag</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Kort sammanfattning som visas i listningar (max 200 tecken)
                </p>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={post.excerpt}
                  onChange={(e) => setPost({ ...post, excerpt: e.target.value })}
                  placeholder="Skriv en kort sammanfattning..."
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {post.excerpt.length}/200 tecken
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Analytics */}
            {!isNew && post.id && (
              <BlogAnalytics
                viewCount={post.viewCount || 0}
                shareCount={post.shareCount || 0}
                downloadCount={post.downloadCount || 0}
                commentCount={post.commentCount || 0}
                averageTimeOnPage={post.averageTimeOnPage || 0}
                publishedAt={post.publishedAt}
                lastUpdated={post.updatedAt}
              />
            )}

            {/* SEO Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  SEO-poäng
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-2">
                  <div className={`text-5xl font-bold ${getSEOScoreColor(post.seoScore)}`}>
                    {post.seoScore}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getSEOScoreLabel(post.seoScore)}
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-2 text-left text-sm">
                    <div className="flex items-start gap-2">
                      {post.metaTitle.length >= 30 && post.metaTitle.length <= 60 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                      )}
                      <span>Meta-titel: {post.metaTitle.length}/60 tecken</span>
                    </div>

                    <div className="flex items-start gap-2">
                      {post.metaDescription.length >= 120 && post.metaDescription.length <= 160 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                      )}
                      <span>Meta-beskrivning: {post.metaDescription.length}/160 tecken</span>
                    </div>

                    <div className="flex items-start gap-2">
                      {post.focusKeyword && post.metaTitle.toLowerCase().includes(post.focusKeyword.toLowerCase()) ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                      )}
                      <span>Nyckelord i titel</span>
                    </div>

                    <div className="flex items-start gap-2">
                      {post.heroImageUrl && post.heroImageAlt ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                      )}
                      <span>Bild med alt-text</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SEO Settings */}
            <Card>
              <CardHeader>
                <CardTitle>SEO & Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="metaTitle">Meta-titel</Label>
                  <Input
                    id="metaTitle"
                    value={post.metaTitle}
                    onChange={(e) => setPost({ ...post, metaTitle: e.target.value })}
                    placeholder="SEO-titel (max 60 tecken)"
                    maxLength={70}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {post.metaTitle.length}/60 tecken
                  </p>
                </div>

                <div>
                  <Label htmlFor="metaDescription">Meta-beskrivning</Label>
                  <Textarea
                    id="metaDescription"
                    value={post.metaDescription}
                    onChange={(e) => setPost({ ...post, metaDescription: e.target.value })}
                    placeholder="SEO-beskrivning (max 160 tecken)"
                    maxLength={160}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {post.metaDescription.length}/160 tecken
                  </p>
                </div>

                <div>
                  <Label htmlFor="focusKeyword">Fokus-nyckelord</Label>
                  <Input
                    id="focusKeyword"
                    value={post.focusKeyword}
                    onChange={(e) => setPost({ ...post, focusKeyword: e.target.value })}
                    placeholder="t.ex. läsförståelse"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Featured Image */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Utvald bild
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Bilden visas överst på bloggposten och i förhandsvisningar
                </p>
              </CardHeader>
              <CardContent>
                <BlogImageUploader
                  currentImage={post.heroImageUrl}
                  currentAlt={post.heroImageAlt}
                  onUploadComplete={(url, alt) => setPost({
                    ...post,
                    heroImageUrl: url,
                    heroImageAlt: alt
                  })}
                  maxSizeMB={5}
                />
              </CardContent>
            </Card>

            {/* Image Gallery */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Bildgalleri
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Skapa ett bildgalleri som visas i bloggposten
                </p>
              </CardHeader>
              <CardContent>
                <ImageGalleryManager
                  images={post.galleryImages}
                  onImagesChange={(images) => setPost({ ...post, galleryImages: images })}
                />
              </CardContent>
            </Card>

            {/* Video Embeds */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Video className="h-5 w-5 mr-2" />
                  Videor
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Bädda in YouTube- eller Vimeo-videor i bloggposten
                </p>
              </CardHeader>
              <CardContent>
                <VideoEmbedManager
                  videos={post.videoEmbeds}
                  onVideosChange={(videos) => setPost({ ...post, videoEmbeds: videos })}
                />
              </CardContent>
            </Card>

            {/* Downloadable Files */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Download className="h-5 w-5 mr-2" />
                  Nedladdningsbara filer
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Lägg till PDF:er, dokument eller andra filer som läsare kan ladda ner
                </p>
              </CardHeader>
              <CardContent>
                <FileUploader
                  files={post.downloadFiles}
                  onFilesChange={(files) => setPost({ ...post, downloadFiles: files })}
                  maxSizeMB={10}
                  acceptedTypes={['.pdf', '.docx', '.pptx', '.xlsx', '.zip', '.doc', '.ppt']}
                />
              </CardContent>
            </Card>

            {/* Category */}
            <Card>
              <CardHeader>
                <CardTitle>Kategori & Taggar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <BlogCategorySelector
                  selectedCategoryId={post.categoryId}
                  onCategoryChange={(categoryId) => setPost({ ...post, categoryId })}
                />

                <Separator />

                <div>
                  <Label className="flex items-center">
                    <Tag className="h-4 w-4 mr-2" />
                    Taggar
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lägg till taggar för att förbättra sökbarhet och organisering
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Lägg till tagg..."
                  />
                  <Button onClick={addTag} size="sm">
                    Lägg till
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Table of Contents */}
            <TableOfContentsGenerator
              content={post.content}
              enabled={post.enableTableOfContents}
              onToggle={(enabled) => setPost({ ...post, enableTableOfContents: enabled })}
            />

            {/* Related Posts */}
            <RelatedPostsSelector
              currentPostId={post.id}
              selectedPostIds={post.relatedPostIds}
              onPostsChange={(relatedPostIds) => setPost({ ...post, relatedPostIds })}
              categoryId={post.categoryId}
              tags={post.tags}
            />

            {/* Social Media Preview */}
            <SocialMediaPreview
              title={post.title}
              metaTitle={post.metaTitle}
              metaDescription={post.metaDescription}
              heroImageUrl={post.heroImageUrl}
              socialImageUrl={post.socialImageUrl}
              slug={post.slug}
            />

            {/* Comment Settings */}
            <CommentSettings
              enabled={post.enableComments}
              onToggle={(enabled) => setPost({ ...post, enableComments: enabled })}
              commentCount={post.commentCount}
            />

            {/* Revision History */}
            <RevisionHistory
              postId={post.id}
              currentRevision={post.revisionCount || 0}
              onRestore={(revision) => {
                setPost({
                  ...post,
                  title: revision.title,
                  content: revision.content,
                  excerpt: revision.excerpt || '',
                });
                toast({
                  title: 'Version återställd',
                  description: `Innehållet har återställts till version ${revision.revisionNumber}`,
                });
              }}
            />

            {/* Publishing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Publicering
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Status</Label>
                  <div className="mt-2">
                    <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                      {post.status === 'published' ? 'Publicerad' : 'Utkast'}
                    </Badge>
                  </div>
                </div>

                {post.publishedAt && (
                  <div>
                    <Label>Publicerad</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(post.publishedAt).toLocaleString('sv-SE')}
                    </p>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => handleSave('draft')}
                    disabled={saveMutation.isPending}
                    variant="outline"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Spara utkast
                  </Button>

                  {post.status !== 'published' && (
                    <Button
                      className="w-full"
                      onClick={() => handleSave('published')}
                      disabled={saveMutation.isPending}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Publicera nu
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <BlogPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        post={post}
      />
    </div>
  );
}
