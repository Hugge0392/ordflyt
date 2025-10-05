import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { BlogHero } from "@/components/blog/BlogHero";
import { CategoryTabs } from "@/components/blog/CategoryTabs";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { BlogSidebar } from "@/components/blog/BlogSidebar";
import { getBlogPostUrl } from "@/lib/blogCategories";
import { useEffect } from "react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  heroImageUrl?: string;
  publishedAt: string;
  authorName: string;
  category?: string;
  focusKeyphrase?: string;
}

export default function Blogg() {
  const { data: response, isLoading } = useQuery<{
    posts: BlogPost[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: ["/api/blog/posts"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const posts = response?.posts || [];

  // Update SEO meta
  useEffect(() => {
    document.title = "Blogg - Lektionsmaterial & Inspiration | Ordflyt";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'SEO-optimerade tips, färdiga lektioner och praktiska resurser för svenska språket. Utforska hundratals artiklar om läsförståelse, grammatik och mer.');
    }
  }, []);

  // Count posts per category
  const postCounts = posts.reduce((acc, post) => {
    const cat = post.category || 'allmant';
    acc[cat] = (acc[cat] || 0) + 1;
    acc.all = (acc.all || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Popular posts for sidebar (top 5 by views - mock for now)
  const popularPosts = posts.slice(0, 5).map(post => ({
    title: post.title,
    href: getBlogPostUrl(post.slug, post.category)
  }));

  // Extract unique tags
  const allTags = ['texttyper', 'lässtrategier', 'åk 6', 'grammatik', 'ordklasser'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <BlogHero />

      {/* Category Navigation */}
      <CategoryTabs activeCategory="all" postCounts={postCounts} />

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12">
          {/* Blog Posts Grid */}
          <section id="blog-index">
            {isLoading ? (
              <div className="post-grid grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-white rounded-lg overflow-hidden">
                      <div className="h-48 bg-gray-200" />
                      <div className="p-6 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-1/4" />
                        <div className="h-6 bg-gray-200 rounded w-3/4" />
                        <div className="h-4 bg-gray-200 rounded w-full" />
                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16">
                <h2 className="text-2xl font-bold text-gray-700 mb-3">
                  Inga blogginlägg ännu
                </h2>
                <p className="text-gray-500">
                  Vi arbetar på att publicera spännande innehåll. Kom tillbaka snart!
                </p>
              </div>
            ) : (
              <ul
                className="post-grid grid grid-cols-1 md:grid-cols-2 gap-6"
                style={{
                  animation: 'fadeInGrid 300ms ease-out'
                }}
              >
                {posts.map((post) => (
                  <BlogPostCard
                    key={post.id}
                    {...post}
                    href={getBlogPostUrl(post.slug, post.category)}
                  />
                ))}
              </ul>
            )}
          </section>

          {/* Sidebar (Desktop only) */}
          <div className="hidden lg:block">
            <BlogSidebar popularPosts={popularPosts} tags={allTags} />
          </div>
        </div>

        {/* Mobile Sidebar Sections */}
        <div className="lg:hidden mt-12">
          <BlogSidebar popularPosts={popularPosts} tags={allTags} />
        </div>
      </div>

      <style>{`
        @keyframes fadeInGrid {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .post-grid {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
