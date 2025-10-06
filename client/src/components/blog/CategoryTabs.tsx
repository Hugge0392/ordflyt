import { Link } from "wouter";
import { BLOG_CONFIG } from "@/lib/blogConfig";
import { useEffect, useState } from "react";

interface CategoryTabsProps {
  activeCategory?: string;
  postCounts?: Record<string, number>;
}

export function CategoryTabs({ activeCategory = "all", postCounts = {} }: CategoryTabsProps) {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const categories = Object.entries(BLOG_CONFIG.categories);

  return (
    <nav
      className={`tabs bg-white border-b transition-shadow duration-200 ${
        isSticky ? 'sticky top-0 z-40 shadow-md' : ''
      }`}
      role="tablist"
      aria-label="Bloggkategorier"
    >
      <div className="container max-w-6xl mx-auto px-6">
        <div className="flex overflow-x-auto scrollbar-hide gap-1">
          <Link
            href="/blogg"
            role="tab"
            aria-selected={activeCategory === "all"}
            className={`tab whitespace-nowrap px-6 py-4 font-semibold border-b-2 transition-all duration-200 hover:scale-105 ${
              activeCategory === "all"
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Alla kategorier
            {postCounts.all ? ` (${postCounts.all})` : ''}
          </Link>

          {categories.map(([key, config]) => (
            <Link
              key={key}
              href={`/blogg/${config.slug}`}
              role="tab"
              aria-selected={activeCategory === key}
              className={`tab whitespace-nowrap px-6 py-4 font-semibold border-b-2 transition-all duration-200 hover:scale-105 ${
                activeCategory === key
                  ? `text-[${config.color}]`
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
              style={{
                borderBottomColor: activeCategory === key ? config.color : undefined,
                color: activeCategory === key ? config.color : undefined
              }}
              data-nav="category-tab"
              data-category={key}
            >
              <span className="mr-2">{config.icon}</span>
              {config.name}
              {postCounts[key] ? ` (${postCounts[key]})` : ''}
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </nav>
  );
}
