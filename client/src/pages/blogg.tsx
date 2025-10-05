import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, Eye, ArrowRight, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { getQueryFn } from "@/lib/queryClient";
import { BLOG_CATEGORIES, PARENT_CATEGORIES, getCategoryDisplayName, getBlogPostUrl } from "@/lib/blogCategories";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  heroImageUrl?: string;
  publishedAt: string;
  authorName: string;
  viewCount: number;
  tags?: string[];
  category?: string;
  focusKeyphrase?: string;
}

export default function Blogg() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedParent, setSelectedParent] = useState<string>("all");

  const { data: response, isLoading } = useQuery<{
    posts: BlogPost[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: ["/api/blog/posts"],
    queryFn: getQueryFn({ on401: "returnNull" }), // Public endpoint, no auth required
  });

  const allPosts = response?.posts || [];

  // Filter posts by category
  const filteredPosts = selectedCategory === "all"
    ? allPosts
    : allPosts.filter(post => post.category === selectedCategory);

  // Group posts by parent category
  const postsByParent = PARENT_CATEGORIES.reduce((acc, parent) => {
    const parentPosts = allPosts.filter(post => {
      const category = BLOG_CATEGORIES[post.category || 'allmant'];
      return category?.parentCategory === parent.name;
    });
    acc[parent.id] = parentPosts;
    return acc;
  }, {} as Record<string, BlogPost[]>);

  // Update SEO meta tags
  useEffect(() => {
    if (selectedCategory !== "all") {
      const category = BLOG_CATEGORIES[selectedCategory];
      if (category) {
        document.title = `${category.parentCategory} - ${category.displayName} | Ordflyt`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
          metaDesc.setAttribute('content', category.description);
        }
      }
    } else {
      document.title = 'Blogg - Tips och resurser för svenska språket | Ordflyt';
    }
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-10 h-10" />
            <h1 className="text-4xl md:text-5xl font-bold">Lektionsmaterial & Inspiration</h1>
          </div>
          <p className="text-xl text-blue-100 max-w-3xl">
            SEO-optimerade tips, färdiga lektioner och praktiska resurser för svenska språket
          </p>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6">
          <Tabs value={selectedParent} onValueChange={setSelectedParent} className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap bg-transparent border-b-0 h-auto p-0">
              <TabsTrigger
                value="all"
                className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-4 py-3"
              >
                Alla kategorier
              </TabsTrigger>
              {PARENT_CATEGORIES.map(parent => (
                <TabsTrigger
                  key={parent.id}
                  value={parent.id}
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-4 py-3 whitespace-nowrap"
                >
                  {parent.emoji} {parent.name} {postsByParent[parent.id]?.length ? `(${postsByParent[parent.id].length})` : ''}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Blog Posts */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-48 bg-gray-200 rounded mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (selectedParent !== "all" ? postsByParent[selectedParent] : allPosts).length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <FileText className="w-20 h-20 mx-auto text-gray-400 mb-6" />
              <h2 className="text-2xl font-semibold text-gray-700 mb-3">
                {selectedParent !== "all"
                  ? `Inga inlägg i ${PARENT_CATEGORIES.find(p => p.id === selectedParent)?.name} ännu`
                  : "Inga blogginlägg ännu"}
              </h2>
              <p className="text-gray-500 mb-6">
                Vi arbetar på att publicera spännande innehåll. Kom tillbaka snart!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(selectedParent !== "all" ? postsByParent[selectedParent] : allPosts).map((post) => (
              <Link key={post.id} href={getBlogPostUrl(post.slug, post.category)}>
                <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group h-full flex flex-col">
                  {post.heroImageUrl && (
                    <div className="w-full h-48 overflow-hidden rounded-t-lg">
                      <img
                        src={post.heroImageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <CardHeader className="flex-grow">
                    {post.category && BLOG_CATEGORIES[post.category] && (
                      <Badge variant="secondary" className="w-fit mb-2 text-xs">
                        {BLOG_CATEGORIES[post.category].iconEmoji} {getCategoryDisplayName(post.category)}
                      </Badge>
                    )}
                    <CardTitle className="text-xl group-hover:text-blue-600 transition-colors line-clamp-2">
                      {post.title}
                    </CardTitle>
                    {post.excerpt && (
                      <CardDescription className="line-clamp-3 mt-2">
                        {post.excerpt}
                      </CardDescription>
                    )}
                    {post.focusKeyphrase && (
                      <div className="mt-2 text-xs text-gray-500 italic">
                        🎯 {post.focusKeyphrase}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {formatDistanceToNow(new Date(post.publishedAt), {
                            addSuffix: true,
                            locale: sv
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{post.viewCount}</span>
                      </div>
                    </div>

                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {post.tags.slice(0, 3).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        av {post.authorName}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="group-hover:text-blue-600"
                      >
                        Läs mer
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination could be added here if needed */}
      </div>
    </div>
  );
}
