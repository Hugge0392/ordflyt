import { Link } from "wouter";
import { Calendar, User, ArrowRight, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { BLOG_CONFIG, getCategoryConfig } from "@/lib/blogConfig";

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
            <div className="flex items-center gap-2 mb-3">
              <span
                className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300"
                style={{
                  backgroundColor: borderColor,
                  boxShadow: `0 4px 14px -2px ${borderColor}40`
                }}
              >
                {categoryConfig?.icon} {categoryConfig?.name}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-all duration-300 leading-tight group-hover:tracking-tight">
              {title}
            </h2>

            {excerpt && (
              <p className="excerpt text-gray-600 mb-4 line-clamp-3 leading-relaxed text-base group-hover:text-gray-700 transition-colors duration-300">
                {excerpt}
              </p>
            )}

            <div className="meta mt-auto flex items-center justify-between text-xs sm:text-sm text-gray-500 border-t pt-3 sm:pt-4">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <time dateTime={publishedAt} className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">
                    {formatDistanceToNow(new Date(publishedAt), {
                      addSuffix: true,
                      locale: sv
                    })}
                  </span>
                  <span className="sm:hidden">
                    {formatDistanceToNow(new Date(publishedAt), {
                      addSuffix: true,
                      locale: sv
                    }).replace(' sedan', '')}
                  </span>
                </time>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 sm:w-4 sm:h-4" />
                  {authorName}
                </span>
                <span className="flex items-center gap-1 text-gray-400">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  {readingTime} min
                </span>
              </div>
            </div>

            <div className="readmore mt-4 flex items-center gap-2 text-blue-600 font-bold group-hover:gap-4 transition-all duration-300 group-hover:text-blue-700">
              Läs mer
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </div>
        </article>
      </Link>
    </li>
  );
}
