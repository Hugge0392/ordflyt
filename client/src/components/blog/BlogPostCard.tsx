import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { getCategoryConfig } from "@/lib/blogConfig";

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
  
  // Generate author initials for avatar placeholder
  const authorInitials = authorName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <article className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <Link href={href}>
        <a className="block">
          {/* Hero Image */}
          {heroImageUrl && (
            <div className="w-full aspect-[16/10] overflow-hidden bg-gray-100">
              <img
                src={heroImageUrl}
                alt={title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {/* Category Badge */}
            <div className="mb-3">
              <span 
                className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  color: categoryConfig?.color || '#6366f1',
                  backgroundColor: `${categoryConfig?.color || '#6366f1'}15`
                }}
              >
                {categoryConfig?.name || 'Allmänt'}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-indigo-600 transition-colors">
              {title}
            </h3>

            {/* Excerpt */}
            {excerpt && (
              <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                {excerpt}
              </p>
            )}

            {/* Footer: Author + Arrow */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              {/* Author */}
              <div className="flex items-center gap-3">
                {/* Avatar - placeholder circle with initials */}
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                  style={{ backgroundColor: categoryConfig?.color || '#6366f1' }}
                >
                  {authorInitials}
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-900">{authorName}</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(publishedAt), 'd MMM yyyy', { locale: sv })}
                  </p>
                </div>
              </div>

              {/* Arrow Icon */}
              <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
          </div>
        </a>
      </Link>
    </article>
  );
}
