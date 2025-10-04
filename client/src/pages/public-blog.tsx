import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Calendar,
  Clock,
  Eye,
  Tag,
  Search,
  TrendingUp,
  Book
} from 'lucide-react';
import { useState } from 'react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  tags: string[];
  viewCount: number;
  publishedAt: string;
  authorName: string;
}

export default function PublicBlogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ posts: BlogPost[]; pagination: any }>({
    queryKey: ['/api/blog/public/posts'],
    queryFn: async () => {
      const res = await fetch('/api/blog/public/posts');
      if (!res.ok) throw new Error('Failed to fetch posts');
      return res.json();
    },
  });

  const posts = data?.posts || [];

  // Get all unique tags
  const allTags = Array.from(
    new Set(posts.flatMap((post) => post.tags || []))
  ).sort();

  // Filter posts
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      !searchTerm ||
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !selectedTag || post.tags?.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-12">
        <div className="text-center">Laddar bloggposter...</div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Lektionsmaterial & Blogg | Ordflyt</title>
        <meta
          name="description"
          content="Upptäck vårt lektionsmaterial, pedagogiska tips och resurser för läsförståelse och språkutveckling. Perfekt för lärare och elever."
        />
        <meta property="og:title" content="Lektionsmaterial & Blogg | Ordflyt" />
        <meta
          property="og:description"
          content="Upptäck vårt lektionsmaterial, pedagogiska tips och resurser för läsförståelse och språkutveckling."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://dinapp.se/lektionsmaterial" />
      </Helmet>

      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="inline-block">
              <Badge variant="outline" className="mb-4">
                <Book className="h-3 w-3 mr-1" />
                Lektionsmaterial & Blogg
              </Badge>
            </div>
            <h1 className="text-5xl font-bold tracking-tight">
              Pedagogiska Resurser för Lärare
            </h1>
            <p className="text-xl text-muted-foreground">
              Upptäck lektionsmaterial, tips och inspiration för att utveckla elevernas läsförståelse
            </p>

            {/* Search */}
            <div className="relative max-w-xl mx-auto mt-8">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Sök efter lektionsmaterial..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 text-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Tags Filter */}
        {allTags.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              Filtrera efter kategori:
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedTag === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTag(null)}
              >
                Alla
              </Button>
              {allTags.map((tag) => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Posts Grid */}
        {filteredPosts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              {searchTerm || selectedTag
                ? 'Inga bloggposter hittades för din sökning'
                : 'Inga bloggposter ännu'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <Link key={post.id} href={`/lektionsmaterial/${post.slug}`}>
                <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col group">
                  {post.heroImageUrl && (
                    <div className="relative overflow-hidden rounded-t-lg">
                      <img
                        src={post.heroImageUrl}
                        alt={post.heroImageAlt || post.title}
                        className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-4 right-4">
                        {post.tags?.slice(0, 1).map((tag) => (
                          <Badge key={tag} variant="secondary" className="bg-white/90 backdrop-blur">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <CardHeader className="flex-1">
                    <h3 className="text-xl font-bold line-clamp-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-muted-foreground line-clamp-3 mt-2">
                        {post.excerpt}
                      </p>
                    )}
                  </CardHeader>

                  <CardFooter className="border-t pt-4">
                    <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(post.publishedAt).toLocaleDateString('sv-SE', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          <span>{post.viewCount}</span>
                        </div>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Featured/Trending Section */}
        {posts.length > 3 && (
          <div className="mt-16 pt-16 border-t">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Mest populära</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...posts]
                .sort((a, b) => b.viewCount - a.viewCount)
                .slice(0, 3)
                .map((post) => (
                  <Link key={post.id} href={`/lektionsmaterial/${post.slug}`}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardHeader>
                        <h4 className="font-semibold line-clamp-2">{post.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                          <Eye className="h-4 w-4" />
                          <span>{post.viewCount} visningar</span>
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
