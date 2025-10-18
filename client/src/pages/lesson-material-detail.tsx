import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Download, 
  Calendar, 
  Eye, 
  ArrowLeft,
  Share2,
  Copy,
  Facebook,
  Twitter,
  Mail,
  CheckCircle,
  FileText,
  GraduationCap,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  heroImageUrl: string;
  downloadFileUrl: string;
  downloadFileName: string;
  downloadFileType: string;
  categoryId: string;
  tags: string[];
  publishedAt: string;
  authorName: string;
  viewCount: number;
  downloadCount: number;
  metaDescription: string;
  socialImageUrl: string;
}

interface LessonCategory {
  id: string;
  name: string;
  swedishName: string;
  description: string;
  color: string;
  icon: string;
}

export default function LessonMaterialDetail() {
  const { slug } = useParams();
  const { toast } = useToast();
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Fetch blog post
  const { data: post, isLoading: postLoading, error } = useQuery<BlogPost>({
    queryKey: ["/api/blog/posts", slug],
    queryFn: async () => {
      const response = await fetch(`/api/blog/posts/${slug}`);
      if (!response.ok) {
        throw new Error('Post not found');
      }
      return response.json();
    },
    enabled: !!slug,
  });

  // Fetch categories
  const { data: categories = [] } = useQuery<LessonCategory[]>({
    queryKey: ["/api/lesson-categories"],
  });

  // Set page title and meta description
  useEffect(() => {
    if (post) {
      document.title = `${post.title} | Ordflyt`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', post.metaDescription || post.excerpt || '');
      } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = post.metaDescription || post.excerpt || '';
        document.head.appendChild(meta);
      }
    }
  }, [post]);

  const handleShare = async (platform: string) => {
    const url = window.location.href;
    const title = post?.title || "";
    const text = post?.excerpt || "";

    switch (platform) {
      case 'copy':
        try {
          await navigator.clipboard.writeText(url);
          toast({
            title: "Länk kopierad!",
            description: "Länken har kopierats till urklipp"
          });
        } catch (error) {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = url;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          toast({
            title: "Länk kopierad!",
            description: "Länken har kopierats till urklipp"
          });
        }
        break;
      
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + '\n\n' + url)}`, '_blank');
        break;
    }
    setShowShareMenu(false);
  };

  const handleNewsletterSubscribe = async () => {
    if (!newsletterEmail) return;
    
    console.log('📧 Newsletter subscribe clicked:', newsletterEmail);
    setIsSubscribing(true);
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newsletterEmail,
          categories: post?.categoryId ? [post.categoryId] : [],
          source: 'blog_page'
        }),
      });

      console.log('📬 Newsletter response status:', response.status);
      const data = await response.json().catch(() => ({ message: "Ett fel uppstod" }));
      console.log('📬 Newsletter response data:', data);
      
      if (response.ok) {
        console.log('✅ Newsletter subscription successful, showing toast');
        toast({
          title: "Tack!",
          description: data.message || "Du har prenumererat på nyhetsbrev!"
        });
        setNewsletterEmail("");
      } else {
        console.log('❌ Newsletter subscription failed, showing error toast');
        toast({
          title: "Ett fel uppstod",
          description: data.message || "Kunde inte prenumerera",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Newsletter subscription error:', error);
      toast({
        title: "Ett fel uppstod",
        description: "Kunde inte prenumerera på nyhetsbrev",
        variant: "destructive"
      });
    } finally {
      setIsSubscribing(false);
      console.log('📧 Newsletter subscribe finished');
    }
  };

  const formatFileType = (fileType: string) => {
    switch (fileType?.toLowerCase()) {
      case 'pdf': return 'PDF';
      case 'pptx': case 'ppt': return 'PowerPoint';
      case 'docx': case 'doc': return 'Word';
      case 'xlsx': case 'xls': return 'Excel';
      default: return fileType?.toUpperCase() || 'Fil';
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType?.toLowerCase()) {
      case 'pdf': return <FileText className="h-5 w-5" />;
      case 'pptx': case 'ppt': return <GraduationCap className="h-5 w-5" />;
      default: return <Download className="h-5 w-5" />;
    }
  };

  const getCategoryForPost = () => {
    return categories.find(cat => cat.id === post?.categoryId);
  };

  if (postLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center py-12">
            <div className="text-lg">Laddar lektionsmaterial...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Materialet hittades inte</h1>
            <p className="text-gray-600 mb-8">Detta lektionsmaterial finns inte eller har blivit flyttat.</p>
            <Link href="/lektionsmaterial">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tillbaka till material
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const category = getCategoryForPost();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <Link href="/lektionsmaterial">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tillbaka till material
              </Button>
            </Link>
            
            <div className="relative">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowShareMenu(!showShareMenu)}
                data-testid="button-share"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Dela
              </Button>
              
              {showShareMenu && (
                <div className="absolute right-0 top-12 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-10 w-48">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => handleShare('copy')}
                    data-testid="button-share-copy"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Kopiera länk
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => handleShare('facebook')}
                    data-testid="button-share-facebook"
                  >
                    <Facebook className="h-4 w-4 mr-2" />
                    Facebook
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => handleShare('twitter')}
                    data-testid="button-share-twitter"
                  >
                    <Twitter className="h-4 w-4 mr-2" />
                    Twitter
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => handleShare('email')}
                    data-testid="button-share-email"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    E-post
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Post Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              {category && (
                <Badge 
                  variant="secondary"
                  className="text-sm"
                  style={{ backgroundColor: `${category.color}20`, color: category.color }}
                >
                  {category.swedishName}
                </Badge>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(post.publishedAt), 'dd MMMM yyyy', { locale: sv })}
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {post.viewCount} visningar
                </div>
                {post.downloadCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    {post.downloadCount} nedladdningar
                  </div>
                )}
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              {post.title}
            </h1>
            
            {post.excerpt && (
              <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
                {post.excerpt}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Article Content */}
          <div className="lg:col-span-2">
            {/* Hero Image */}
            {post.heroImageUrl && (
              <div className="aspect-video overflow-hidden rounded-lg mb-8">
                <img 
                  src={post.heroImageUrl} 
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Content */}
            <div className="prose prose-slate max-w-none dark:prose-invert">
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </div>

            <style>{`
              /* File download link styling */
              .prose a[download],
              .prose a[download]:link,
              .prose a[download]:visited {
                display: inline-flex !important;
                align-items: center !important;
                gap: 0.5rem !important;
                padding: 0.75rem 1.5rem !important;
                background-color: #2563eb !important;
                color: #ffffff !important;
                border-radius: 0.5rem !important;
                text-decoration: none !important;
                transition: all 0.2s !important;
                margin: 1rem 0 !important;
                font-weight: 500 !important;
                box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1) !important;
              }
              
              .prose a[download]:hover {
                background-color: #1d4ed8 !important;
                color: #ffffff !important;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
                transform: translateY(-1px);
                text-decoration: none !important;
              }
              
              .prose a[download] svg {
                color: #ffffff !important;
                stroke: #ffffff !important;
              }
            `}</style>

            {/* Tags */}
            {post.tags?.length > 0 && (
              <div className="mt-8">
                <Separator className="mb-4" />
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Etiketter</h3>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              
              {/* Download Card */}
              {post.downloadFileUrl && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getFileIcon(post.downloadFileType)}
                      Ladda ner material
                    </CardTitle>
                    <CardDescription>
                      Gratis {formatFileType(post.downloadFileType)}-fil redo att använda
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        <strong>Filnamn:</strong> {post.downloadFileName}
                      </div>
                      <Button 
                        className="w-full"
                        asChild
                        data-testid="button-download-main"
                      >
                        <a href={`/api/blog/download/${post.slug}`} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Ladda ner {formatFileType(post.downloadFileType)}
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </a>
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Nedladdningen öppnas i ny flik
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Newsletter Subscription */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Nyhetsbrev
                  </CardTitle>
                  <CardDescription>
                    Få nya lektionsmaterial direkt till din inkorg
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Input
                      type="email"
                      placeholder="Din e-postadress"
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      data-testid="input-newsletter-email-sidebar"
                    />
                    <Button 
                      onClick={handleNewsletterSubscribe}
                      disabled={!newsletterEmail || isSubscribing}
                      className="w-full"
                      data-testid="button-subscribe-sidebar"
                    >
                      {isSubscribing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Prenumererar...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Prenumerera gratis
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Author */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Författare</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <strong>{post.authorName}</strong>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}