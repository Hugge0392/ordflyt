import { Link } from "wouter";
import { Calendar, User, ArrowRight } from "lucide-react";
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

  return (
    <li className="post-card group">
      <Link href={href}>
        <article
          className="h-full flex flex-col bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-t-4"
          style={{ borderTopColor: borderColor }}
        >
          {heroImageUrl && (
            <div className="w-full h-48 overflow-hidden bg-gray-100">
              <img
                src={heroImageUrl}
                alt={title}
                loading="lazy"
                width="400"
                height="300"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}

          <div className="flex-1 flex flex-col p-6">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: borderColor }}
              >
                {categoryConfig?.icon} {categoryConfig?.name}
              </span>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
              {title}
            </h2>

            {excerpt && (
              <p className="excerpt text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                {excerpt}
              </p>
            )}

            <div className="meta mt-auto flex items-center justify-between text-sm text-gray-500 border-t pt-4">
              <div className="flex items-center gap-4">
                <time dateTime={publishedAt} className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDistanceToNow(new Date(publishedAt), {
                    addSuffix: true,
                    locale: sv
                  })}
                </time>
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {authorName}
                </span>
              </div>
            </div>

            <div className="readmore mt-4 flex items-center gap-2 text-blue-600 font-semibold group-hover:gap-3 transition-all">
              Läs mer
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </article>
      </Link>
    </li>
  );
}
