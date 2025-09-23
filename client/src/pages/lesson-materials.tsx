import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, 
  Calendar, 
  Eye, 
  Search,
  BookOpen,
  Filter,
  Mail,
  ArrowRight,
  FileText,
  GraduationCap
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import type { BlogPost, LessonCategory } from "@shared/schema";


interface BlogResponse {
  posts: BlogPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function LessonMaterials() {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // Set page title and meta description
  useEffect(() => {
    document.title = "Gratis Lektionsmaterial | Ordflyt";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Ladda ner gratis lektionsmaterial varje vecka! PDF-filer, PowerPoint-presentationer och undervisningsmaterial för svenska språket.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Ladda ner gratis lektionsmaterial varje vecka! PDF-filer, PowerPoint-presentationer och undervisningsmaterial för svenska språket.';
      document.head.appendChild(meta);
    }
  }, []);

  // Fetch blog posts
  const { data: blogData, isLoading: postsLoading } = useQuery<BlogResponse>({
    queryKey: ["/api/blog/posts", page, selectedCategory],
  });

  // Fetch categories
  const { data: categories = [] } = useQuery<LessonCategory[]>({
    queryKey: ["/api/lesson-categories"],
  });

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setPage(1); // Reset to first page when changing category
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
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'pptx': case 'ppt': return <GraduationCap className="h-4 w-4" />;
      default: return <Download className="h-4 w-4" />;
    }
  };

  if (postsLoading && !blogData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center py-12">
            <div className="text-lg">Laddar lektionsmaterial...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Hero Section */}
      <div className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium mb-4">
              <BookOpen className="h-4 w-4" />
              Uppdateras varje vecka
            </div>
            <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Gratis Lektionsmaterial
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-3xl mx-auto">
              Ladda ner professionellt lektionsmaterial för svenska språket. Nya material läggs till varje vecka 
              med PDF-filer, PowerPoint-presentationer och färdiga undervisningsupplägg.
            </p>
            
            {/* Newsletter Subscription CTA */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white mb-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-4">🎉 Missa aldrig nya material!</h2>
              <p className="mb-6">Få ett mejl varje gång vi publicerar nytt lektionsmaterial.</p>
              <div className="flex gap-3 max-w-md mx-auto">
                <Input 
                  placeholder="Din e-postadress" 
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/70"
                  data-testid="input-newsletter-email"
                />
                <Button 
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
                  data-testid="button-subscribe"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Prenumerera
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Filters */}
        <div className="mb-8">
          <Tabs defaultValue="all" className="w-full">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
              <TabsList className="grid grid-cols-2 lg:grid-cols-4 h-auto p-1">
                <TabsTrigger 
                  value="all" 
                  onClick={() => handleCategoryChange("")}
                  className="px-6 py-3"
                  data-testid="tab-all"
                >
                  Alla material
                </TabsTrigger>
                {categories.slice(0, 3).map(category => (
                  <TabsTrigger 
                    key={category.id}
                    value={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className="px-6 py-3"
                    data-testid={`tab-${category.id}`}
                  >
                    {category.swedishName}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Sök material..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                    data-testid="input-search"
                  />
                </div>
              </div>
            </div>
          </Tabs>
        </div>

        {/* Blog Posts Grid */}
        {!blogData?.posts?.length ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Inga material än</h3>
            <p className="text-gray-600 mb-6">
              Vi arbetar på att lägga till det första materialet. Kom tillbaka snart!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {blogData.posts.map((post) => (
              <Card key={post.id} className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
                {/* Hero Image */}
                {post.heroImageUrl && (
                  <div className="aspect-video overflow-hidden">
                    <img 
                      src={post.heroImageUrl} 
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    {post.downloadFileName && (
                      <Badge variant="secondary" className="text-xs">
                        {getFileIcon(post.downloadFileType)}
                        <span className="ml-1">{formatFileType(post.downloadFileType)}</span>
                      </Badge>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      {post.viewCount}
                    </div>
                  </div>
                  
                  <CardTitle className="group-hover:text-blue-600 transition-colors line-clamp-2">
                    {post.title}
                  </CardTitle>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(post.publishedAt), 'dd MMM yyyy', { locale: sv })}
                  </div>
                </CardHeader>

                <CardContent>
                  <CardDescription className="mb-4 line-clamp-3">
                    {post.excerpt}
                  </CardDescription>

                  {/* Tags */}
                  {post.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {post.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Link href={`/lektionsmaterial/${post.slug}`}>
                      <Button variant="default" size="sm" className="flex-1" data-testid={`button-view-${post.slug}`}>
                        Läs mer
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                    
                    {post.downloadFileName && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        asChild
                        data-testid={`button-download-${post.slug}`}
                      >
                        <a href={`/api/blog/download/${post.slug}`} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {blogData && blogData.pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              data-testid="button-prev-page"
            >
              Föregående
            </Button>
            
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, blogData.pagination.totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    data-testid={`button-page-${pageNum}`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.min(blogData.pagination.totalPages, p + 1))}
              disabled={page === blogData.pagination.totalPages}
              data-testid="button-next-page"
            >
              Nästa
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}