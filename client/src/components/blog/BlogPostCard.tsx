import { Link } from "wouter";
import { Calendar, ArrowRight, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { BLOG_CONFIG, getCategoryConfig, getCategoryIcon } from "@/lib/blogConfig";

interface BlogPostCardProps {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  heroImageUrl?: string;
  publishedAt: string;
  authorName: string;
  category?: string;
  href: string;
}

// Calculate reading time based on word count
function calculateReadingTime(excerpt?: string): number {
  if (!excerpt) return 3;
  const words = excerpt.split(/\s+/).length;
  const wordsPerMinute = 200;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function BlogPostCard({
  title,
  excerpt,
  heroImageUrl,
  publishedAt,
  authorName,
  category = "allmant",
  href
}: BlogPostCardProps) {
  const categoryConfig = getCategoryConfig(category);
  const borderColor = categoryConfig?.color || BLOG_CONFIG.categories.allmant.color;
  const readingTime = calculateReadingTime(excerpt);

  return (
    <li className="post-card group">
      <Link href={href}>
        <article
          className="h-full flex flex-col bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 border-l-[6px] relative backdrop-blur-sm"
          style={{ borderLeftColor: borderColor }}
        >
          {/* Multi-layer gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-gray-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none"
            style={{ background: `radial-gradient(circle at top right, ${borderColor}, transparent 70%)` }}
          />
          {heroImageUrl && (
            <div className="w-full h-48 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 relative">
              <img
                src={heroImageUrl}
                alt={`Omslagsbild för: ${title}`}
                loading="lazy"
                width="400"
                height="300"
                className="w-full h-full object-cover group-hover:scale-125 group-hover:rotate-1 transition-all duration-700 ease-out"
              />
              {/* Enhanced image overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700 mix-blend-multiply"
                style={{ background: `linear-gradient(135deg, ${borderColor}, transparent)` }}
              />
            </div>
          )}

          <div className="flex-1 flex flex-col p-4 sm:p-6 relative z-10">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-all duration-300 leading-tight">
              {title}
            </h2>

            {excerpt && (
              <p className="excerpt text-gray-600 mb-4 line-clamp-3 leading-relaxed text-base group-hover:text-gray-700 transition-colors duration-300">
                {excerpt}
              </p>
            )}

            <div className="meta mt-auto pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                {/* Category Icon - Large and prominent */}
                <div 
                  className="flex items-center justify-center w-12 h-12 rounded-full shadow-md transition-all duration-300 group-hover:scale-110"
                  style={{
                    backgroundColor: `${borderColor}15`,
                    color: borderColor
                  }}
                >
                  {getCategoryIcon(category, borderColor)}
                </div>

                {/* Meta info */}
                <div className="flex flex-col items-end gap-1 text-xs text-gray-500">
                  <time dateTime={publishedAt} className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {formatDistanceToNow(new Date(publishedAt), {
                        addSuffix: true,
                        locale: sv
                      })}
                    </span>
                  </time>
                  <span className="flex items-center gap-1 text-gray-400">
                    <Clock className="w-3 h-3" />
                    {readingTime} min läsning
                  </span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </Link>
    </li>
  );
}
