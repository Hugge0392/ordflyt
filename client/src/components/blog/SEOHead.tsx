import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  keywords?: string[];
}

export function SEOHead({
  title,
  description,
  image,
  url,
  type = "website",
  publishedTime,
  modifiedTime,
  author,
  keywords
}: SEOHeadProps) {
  useEffect(() => {
    // Update document title
    document.title = `${title} | Ordflyt`;

    // Update or create meta tags
    const updateMeta = (name: string, content: string, property?: boolean) => {
      const attr = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Basic meta
    updateMeta('description', description);
    if (keywords && keywords.length > 0) {
      updateMeta('keywords', keywords.join(', '));
    }

    // Open Graph
    updateMeta('og:title', `${title} | Ordflyt`, true);
    updateMeta('og:description', description, true);
    updateMeta('og:type', type, true);
    updateMeta('og:locale', 'sv_SE', true);
    if (url) updateMeta('og:url', url, true);
    if (image) {
      updateMeta('og:image', image, true);
      updateMeta('og:image:alt', title, true);
    }

    // Twitter Card
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', `${title} | Ordflyt`);
    updateMeta('twitter:description', description);
    if (image) {
      updateMeta('twitter:image', image);
      updateMeta('twitter:image:alt', title);
    }

    // Article specific
    if (type === 'article') {
      if (publishedTime) updateMeta('article:published_time', publishedTime, true);
      if (modifiedTime) updateMeta('article:modified_time', modifiedTime, true);
      if (author) updateMeta('article:author', author, true);
      updateMeta('article:section', 'Utbildning', true);
    }

    // Canonical URL
    if (url) {
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = url;
    }

    // Add language alternate links for international SEO (if needed in the future)
    let alternate = document.querySelector('link[rel="alternate"][hreflang="sv"]') as HTMLLinkElement;
    if (!alternate && url) {
      alternate = document.createElement('link');
      alternate.rel = 'alternate';
      alternate.hreflang = 'sv';
      alternate.href = url;
      document.head.appendChild(alternate);
    } else if (alternate && url) {
      alternate.href = url;
    }
  }, [title, description, image, url, type, publishedTime, modifiedTime, author, keywords]);

  return null;
}
