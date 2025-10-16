import { useEffect } from "react";

interface BlogPostingStructuredDataProps {
  title: string;
  description: string;
  image?: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  url: string;
  category?: string;
}

export function BlogPostingStructuredData({
  title,
  description,
  image,
  publishedAt,
  updatedAt,
  author,
  url,
  category
}: BlogPostingStructuredDataProps) {
  useEffect(() => {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": title,
      "description": description,
      "image": image || "https://ordflyt.se/default-blog-image.jpg",
      "datePublished": publishedAt,
      "dateModified": updatedAt || publishedAt,
      "author": {
        "@type": "Person",
        "name": author
      },
      "publisher": {
        "@type": "Organization",
        "name": "Ordflyt",
        "logo": {
          "@type": "ImageObject",
          "url": "https://ordflyt.se/logo.png"
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": url
      },
      "articleSection": category || "Utbildning"
    };

    // Create or update script tag
    let script = document.querySelector('script[type="application/ld+json"][data-type="blogposting"]') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-type', 'blogposting');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);

    return () => {
      // Cleanup on unmount
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [title, description, image, publishedAt, updatedAt, author, url, category]);

  return null;
}

interface OrganizationStructuredDataProps {
  url?: string;
}

export function OrganizationStructuredData({ url }: OrganizationStructuredDataProps) {
  useEffect(() => {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Ordflyt",
      "url": url || "https://ordflyt.se",
      "logo": "https://ordflyt.se/logo.png",
      "description": "Läsförståelseapp för elever 9-12 år - Pedagogiskt innehåll för svenska språket",
      "sameAs": [
        // Add social media profiles here when available
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "Customer Support",
        "email": "support@ordflyt.se"
      }
    };

    // Create or update script tag
    let script = document.querySelector('script[type="application/ld+json"][data-type="organization"]') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-type', 'organization');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);

    return () => {
      // Don't remove organization schema on unmount as it's site-wide
    };
  }, [url]);

  return null;
}

interface BreadcrumbStructuredDataProps {
  items: Array<{ name: string; url?: string }>;
}

export function BreadcrumbStructuredData({ items }: BreadcrumbStructuredDataProps) {
  useEffect(() => {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": item.name,
        "item": item.url
      }))
    };

    // Create or update script tag
    let script = document.querySelector('script[type="application/ld+json"][data-type="breadcrumb"]') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-type', 'breadcrumb');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);

    return () => {
      // Cleanup on unmount
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [items]);

  return null;
}
