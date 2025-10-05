import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Eye, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { useEffect } from "react";
import { getQueryFn } from "@/lib/queryClient";
import { BLOG_CATEGORIES, getCategoryDisplayName, getBlogPostApiUrl } from "@/lib/blogCategories";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  heroImageUrl?: string;
  metaDescription?: string;
  publishedAt: string;
  authorName: string;
  viewCount: number;
  tags?: string[];
  category?: string;
  focusKeyphrase?: string;
}

// Helper function to render markdown-like content as HTML
function formatContentToHTML(text: string): string {
  if (!text) return '';

  let html = text;

  // Convert headings
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>');

  // Convert bold and italic
  html = html.replace(/\*\*([^*\n]+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  html = html.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em class="italic">$1</em>');

  // Convert quotes
  html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-700">$1</blockquote>');

  // Convert bullet points
  html = html.replace(/^• (.+)$/gm, '<li class="ml-4">$1</li>');

  // Group consecutive list items
  if (html.includes('<li')) {
    const lines = html.split('\n');
    const grouped = [];
    let inList = false;

    for (const line of lines) {
      if (line.includes('<li')) {
        if (!inList) {
          grouped.push('<ul class="list-disc list-inside my-4 space-y-2">');
          inList = true;
        }
        grouped.push(line);
      } else {
        if (inList) {
          grouped.push('</ul>');
          inList = false;
        }
        grouped.push(line);
      }
    }
    if (inList) grouped.push('</ul>');

    html = grouped.join('\n');
  }

  // Convert line breaks to paragraphs
  html = html.split('\n\n').map(para =>
    para.trim() && !para.startsWith('<') ? `<p class="my-4 leading-relaxed">${para}</p>` : para
  ).join('\n');

  return html;
}

export default function BloggSlug() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const slug = params.slug;
  const categoryParent = params.categoryParent;
  const categoryChild = params.categoryChild;

  // Determine API URL based on whether we have category params (SEO URL) or not (legacy URL)
  const apiUrl = categoryParent && categoryChild
    ? `/api/blog/${categoryParent}/${categoryChild}/${slug}`
    : `/api/blog/posts/${slug}`;

  const { data: post, isLoading, error } = useQuery<BlogPost>({
    queryKey: [apiUrl],
    queryFn: getQueryFn({ on401: "returnNull" }), // Public endpoint, no auth required
    enabled: !!slug,
  });

  // Update document title and meta description for SEO
  useEffect(() => {
    if (post) {
      document.title = `${post.title} | Ordflyt Blogg`;

      // Update meta description
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', post.metaDescription || post.excerpt || '');

      // Update Open Graph tags for social sharing
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (!ogTitle) {
        ogTitle = document.createElement('meta');
        ogTitle.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitle);
      }
      ogTitle.setAttribute('content', post.title);

      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (!ogDesc) {
        ogDesc = document.createElement('meta');
        ogDesc.setAttribute('property', 'og:description');
        document.head.appendChild(ogDesc);
      }
      ogDesc.setAttribute('content', post.metaDescription || post.excerpt || '');

      if (post.heroImageUrl) {
        let ogImage = document.querySelector('meta[property="og:image"]');
        if (!ogImage) {
          ogImage = document.createElement('meta');
          ogImage.setAttribute('property', 'og:image');
          document.head.appendChild(ogImage);
        }
        ogImage.setAttribute('content', post.heroImageUrl);
      }
    }

    // Cleanup on unmount
    return () => {
      document.title = 'Ordflyt';
    };
  }, [post]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <Card className="animate-pulse">
            <div className="h-96 bg-gray-200 rounded-t-lg"></div>
            <CardContent className="p-8">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <Card className="text-center py-16">
            <CardContent>
              <h2 className="text-2xl font-semibold text-gray-700 mb-3">
                Blogginlägg hittades inte
              </h2>
              <p className="text-gray-500 mb-6">
                Det här blogginlägget finns inte eller har tagits bort.
              </p>
              <Link href="/blogg">
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Tillbaka till bloggen
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Breadcrumbs for SEO */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600">
          <Link href="/" className="hover:text-blue-600">Hem</Link>
          <span>/</span>
          <Link href="/blogg" className="hover:text-blue-600">Blogg</Link>
          {post.category && BLOG_CATEGORIES[post.category] && (
            <>
              <span>/</span>
              <Link
                href={`/blogg?kategori=${BLOG_CATEGORIES[post.category].parentCategory.toLowerCase()}`}
                className="hover:text-blue-600"
              >
                {BLOG_CATEGORIES[post.category].parentCategory}
              </Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">{BLOG_CATEGORIES[post.category].displayName}</span>
            </>
          )}
        </nav>

        <Link href="/blogg">
          <Button variant="outline" size="sm" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tillbaka till bloggen
          </Button>
        </Link>

        <article>
          <Card className="overflow-hidden">
            {post.heroImageUrl && (
              <div className="w-full h-96 overflow-hidden">
                <img
                  src={post.heroImageUrl}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <CardContent className="p-8 md:p-12">
              {/* Header */}
              <header className="mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                  {post.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{post.authorName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {formatDistanceToNow(new Date(post.publishedAt), {
                        addSuffix: true,
                        locale: sv
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>{post.viewCount} visningar</span>
                  </div>
                </div>

                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {post.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {post.excerpt && (
                  <p className="text-xl text-gray-700 leading-relaxed border-l-4 border-blue-500 pl-4 italic">
                    {post.excerpt}
                  </p>
                )}
              </header>

              {/* Content */}
              <div
                className="prose prose-lg max-w-none
                  prose-headings:text-gray-900
                  prose-p:text-gray-700
                  prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-gray-900
                  prose-ul:text-gray-700
                  prose-ol:text-gray-700
                  prose-blockquote:text-gray-700
                  prose-code:text-blue-600
                  prose-pre:bg-gray-100"
                dangerouslySetInnerHTML={{ __html: formatContentToHTML(post.content) }}
              />

              {/* Footer */}
              <footer className="mt-12 pt-8 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <Link href="/blogg">
                    <Button variant="outline">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Fler artiklar
                    </Button>
                  </Link>
                </div>
              </footer>
            </CardContent>
          </Card>
        </article>
      </div>
    </div>
  );
}
