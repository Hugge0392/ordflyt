// Blog category configuration with colors and icons
export const BLOG_CONFIG = {
  categories: {
    lasforstaelse: {
      color: "#3B82F6",
      icon: "📘",
      name: "Läsförståelse",
      slug: "lasforstaelse"
    },
    grammatik: {
      color: "#16A34A",
      icon: "🔤",
      name: "Grammatik",
      slug: "grammatik"
    },
    skrivande: {
      color: "#F59E0B",
      icon: "✍️",
      name: "Skrivande",
      slug: "skrivande"
    },
    kallkritik: {
      color: "#8B5CF6",
      icon: "💬",
      name: "Källkritik",
      slug: "kallkritik"
    },
    pedagogik: {
      color: "#14B8A6",
      icon: "💡",
      name: "Pedagogik",
      slug: "pedagogik"
    },
    allmant: {
      color: "#64748B",
      icon: "•",
      name: "Allmänt",
      slug: "allmant"
    }
  }
};

// Get category config from slug
export function getCategoryConfig(slug: string) {
  return BLOG_CONFIG.categories[slug as keyof typeof BLOG_CONFIG.categories];
}

// Get CSS variable for category color
export function getCategoryColorVar(slug: string): string {
  const config = getCategoryConfig(slug);
  return config?.color || BLOG_CONFIG.categories.allmant.color;
}
