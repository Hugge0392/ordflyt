// SEO-optimized blog category metadata

export interface BlogCategoryMetadata {
  id: string;
  slug: string;
  displayName: string;
  parentCategory: string;
  description: string;
  seoKeywords: string[];
  urlPattern: string;
  iconEmoji: string;
}

export const BLOG_CATEGORIES: Record<string, BlogCategoryMetadata> = {
  // Läsförståelse (Highest SEO priority)
  'lasforstaelse-strategier': {
    id: 'lasforstaelse-strategier',
    slug: 'lasforstaelse/strategier',
    displayName: 'Strategier',
    parentCategory: 'Läsförståelse',
    description: 'Beprövade strategier för att förbättra läsförståelse',
    seoKeywords: ['läsförståelse strategier', 'läsförståelse metoder', 'läsförståelse övningar åk 4-6'],
    urlPattern: '/blogg/lasforstaelse/strategier',
    iconEmoji: '🎯'
  },
  'lasforstaelse-ovningar': {
    id: 'lasforstaelse-ovningar',
    slug: 'lasforstaelse/ovningar',
    displayName: 'Övningar',
    parentCategory: 'Läsförståelse',
    description: 'Praktiska övningar för läsförståelse',
    seoKeywords: ['läsförståelse övningar', 'läsförståelse uppgifter', 'läsförståelse träning'],
    urlPattern: '/blogg/lasforstaelse/ovningar',
    iconEmoji: '✍️'
  },
  'lasforstaelse-texttyper': {
    id: 'lasforstaelse-texttyper',
    slug: 'lasforstaelse/texttyper',
    displayName: 'Texttyper',
    parentCategory: 'Läsförståelse',
    description: 'Olika texttyper och hur man läser dem',
    seoKeywords: ['texttyper', 'berättande text', 'beskrivande text', 'instruerande text'],
    urlPattern: '/blogg/lasforstaelse/texttyper',
    iconEmoji: '📄'
  },
  'lasforstaelse-aldersanpassat': {
    id: 'lasforstaelse-aldersanpassat',
    slug: 'lasforstaelse/aldersanpassat',
    displayName: 'Åldersanpassat',
    parentCategory: 'Läsförståelse',
    description: 'Läsförståelse anpassat för olika åldrar',
    seoKeywords: ['läsförståelse åk 4', 'läsförståelse åk 5', 'läsförståelse åk 6'],
    urlPattern: '/blogg/lasforstaelse/aldersanpassat',
    iconEmoji: '👶'
  },

  // Grammatik
  'grammatik-ordklasser': {
    id: 'grammatik-ordklasser',
    slug: 'grammatik/ordklasser',
    displayName: 'Ordklasser',
    parentCategory: 'Grammatik',
    description: 'Allt om ordklasser i svenska',
    seoKeywords: ['ordklasser', 'substantiv', 'verb', 'adjektiv', 'grammatik övningar'],
    urlPattern: '/blogg/grammatik/ordklasser',
    iconEmoji: '📚'
  },
  'grammatik-meningsbyggnad': {
    id: 'grammatik-meningsbyggnad',
    slug: 'grammatik/meningsbyggnad',
    displayName: 'Meningsbyggnad',
    parentCategory: 'Grammatik',
    description: 'Hur man bygger korrekta meningar',
    seoKeywords: ['meningsbyggnad', 'satslära', 'bisats', 'huvudsats'],
    urlPattern: '/blogg/grammatik/meningsbyggnad',
    iconEmoji: '🏗️'
  },
  'grammatik-interpunktion': {
    id: 'grammatik-interpunktion',
    slug: 'grammatik/interpunktion',
    displayName: 'Interpunktion',
    parentCategory: 'Grammatik',
    description: 'Skiljetecken och interpunktion',
    seoKeywords: ['interpunktion', 'komma', 'punkt', 'skiljetecken'],
    urlPattern: '/blogg/grammatik/interpunktion',
    iconEmoji: '.'
  },

  // Skrivande
  'skrivande-genrer': {
    id: 'skrivande-genrer',
    slug: 'skrivande/genrer',
    displayName: 'Genrer',
    parentCategory: 'Skrivande',
    description: 'Olika skrivgenrer och texttyper',
    seoKeywords: ['skriva berättelse', 'skriva uppsats', 'skriva argumenterande text'],
    urlPattern: '/blogg/skrivande/genrer',
    iconEmoji: '📝'
  },
  'skrivande-process': {
    id: 'skrivande-process',
    slug: 'skrivande/process',
    displayName: 'Process',
    parentCategory: 'Skrivande',
    description: 'Skrivprocessen från idé till färdig text',
    seoKeywords: ['skrivprocess', 'planera text', 'skriva utkast', 'redigera text'],
    urlPattern: '/blogg/skrivande/process',
    iconEmoji: '🔄'
  },
  'skrivande-verktyg': {
    id: 'skrivande-verktyg',
    slug: 'skrivande/verktyg',
    displayName: 'Verktyg',
    parentCategory: 'Skrivande',
    description: 'Digitala verktyg för skrivande',
    seoKeywords: ['skrivverktyg', 'digitalt skrivande', 'skrivprogram'],
    urlPattern: '/blogg/skrivande/verktyg',
    iconEmoji: '🛠️'
  },

  // Källkritik
  'kallkritik-metoder': {
    id: 'kallkritik-metoder',
    slug: 'kallkritik/metoder',
    displayName: 'Metoder',
    parentCategory: 'Källkritik',
    description: 'Metoder för källkritisk granskning',
    seoKeywords: ['källkritik', 'källkritiska frågor', 'källkritik för barn'],
    urlPattern: '/blogg/kallkritik/metoder',
    iconEmoji: '🔍'
  },
  'kallkritik-digitala-kallor': {
    id: 'kallkritik-digitala-kallor',
    slug: 'kallkritik/digitala-kallor',
    displayName: 'Digitala källor',
    parentCategory: 'Källkritik',
    description: 'Källkritik i den digitala världen',
    seoKeywords: ['digitala källor', 'källkritik internet', 'fake news'],
    urlPattern: '/blogg/kallkritik/digitala-kallor',
    iconEmoji: '💻'
  },
  'kallkritik-faktagranskning': {
    id: 'kallkritik-faktagranskning',
    slug: 'kallkritik/faktagranskning',
    displayName: 'Faktagranskning',
    parentCategory: 'Källkritik',
    description: 'Hur man granskar fakta',
    seoKeywords: ['faktagranskning', 'faktakoll', 'verifiera information'],
    urlPattern: '/blogg/kallkritik/faktagranskning',
    iconEmoji: '✓'
  },

  // Pedagogik (För lärare)
  'pedagogik-metodik': {
    id: 'pedagogik-metodik',
    slug: 'pedagogik/metodik',
    displayName: 'Metodik',
    parentCategory: 'Pedagogik',
    description: 'Pedagogiska metoder och strategier',
    seoKeywords: ['pedagogik', 'undervisningsmetoder', 'didaktik svenska'],
    urlPattern: '/blogg/pedagogik/metodik',
    iconEmoji: '👨‍🏫'
  },
  'pedagogik-digitala-verktyg': {
    id: 'pedagogik-digitala-verktyg',
    slug: 'pedagogik/digitala-verktyg',
    displayName: 'Digitala verktyg',
    parentCategory: 'Pedagogik',
    description: 'Digitala verktyg för undervisning',
    seoKeywords: ['digitala verktyg skola', 'edtech', 'digitalisering i skolan'],
    urlPattern: '/blogg/pedagogik/digitala-verktyg',
    iconEmoji: '💡'
  },
  'pedagogik-bedomning': {
    id: 'pedagogik-bedomning',
    slug: 'pedagogik/bedomning',
    displayName: 'Bedömning',
    parentCategory: 'Pedagogik',
    description: 'Bedömning och formativ utvärdering',
    seoKeywords: ['bedömning svenska', 'formativ bedömning', 'betygssättning'],
    urlPattern: '/blogg/pedagogik/bedomning',
    iconEmoji: '📊'
  },

  // Allmänt
  'allmant': {
    id: 'allmant',
    slug: 'allmant',
    displayName: 'Allmänt',
    parentCategory: 'Allmänt',
    description: 'Allmänna artiklar om svenska språket',
    seoKeywords: ['svenska', 'språk', 'undervisning'],
    urlPattern: '/blogg/allmant',
    iconEmoji: '📰'
  }
};

// Get parent categories
export const PARENT_CATEGORIES = [
  { id: 'lasforstaelse', name: 'Läsförståelse', emoji: '📖', priority: 1 },
  { id: 'grammatik', name: 'Grammatik', emoji: '📚', priority: 2 },
  { id: 'skrivande', name: 'Skrivande', emoji: '✍️', priority: 3 },
  { id: 'kallkritik', name: 'Källkritik', emoji: '🔍', priority: 4 },
  { id: 'pedagogik', name: 'Pedagogik', emoji: '👨‍🏫', priority: 5 },
  { id: 'allmant', name: 'Allmänt', emoji: '📰', priority: 6 }
];

// Get categories by parent
export function getCategoriesByParent(parentId: string): BlogCategoryMetadata[] {
  return Object.values(BLOG_CATEGORIES).filter(
    cat => cat.parentCategory.toLowerCase() === parentId.toLowerCase()
  );
}

// Get category display name
export function getCategoryDisplayName(categoryId: string): string {
  const category = BLOG_CATEGORIES[categoryId];
  if (!category) return 'Allmänt';
  return `${category.parentCategory} → ${category.displayName}`;
}

// Get category URL
export function getCategoryUrl(categoryId: string): string {
  const category = BLOG_CATEGORIES[categoryId];
  return category?.urlPattern || '/blogg';
}

// Get SEO-optimized blog post URL with category path
export function getBlogPostUrl(slug: string, categoryId?: string): string {
  if (!categoryId || !BLOG_CATEGORIES[categoryId]) {
    return `/blogg/${slug}`;
  }

  const category = BLOG_CATEGORIES[categoryId];
  const [parent, child] = category.slug.split('/');

  return `/blogg/${parent}/${child}/${slug}`;
}

// Get API URL for blog post (with category path for SEO)
export function getBlogPostApiUrl(slug: string, categoryId?: string): string {
  if (!categoryId || !BLOG_CATEGORIES[categoryId]) {
    return `/api/blog/posts/${slug}`;
  }

  const category = BLOG_CATEGORIES[categoryId];
  const [parent, child] = category.slug.split('/');

  return `/api/blog/${parent}/${child}/${slug}`;
}
