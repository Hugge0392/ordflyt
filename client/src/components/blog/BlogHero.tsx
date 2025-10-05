import { ChevronDown } from "lucide-react";

export function BlogHero() {
  const scrollToContent = () => {
    document.getElementById('blog-index')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="hero relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white py-20 overflow-hidden">
      {/* Background pattern */}
      <div
        className="hero__bg absolute inset-0 opacity-10"
        aria-hidden="true"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          animation: 'fadeIn 200ms ease-out'
        }}
      />

      <div className="container max-w-6xl mx-auto px-6 relative z-10">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 animate-slideUp">
          Lektionsmaterial & Inspiration
        </h1>
        <p className="text-xl md:text-2xl text-blue-100 mb-6 max-w-3xl animate-slideUp" style={{ animationDelay: '100ms' }}>
          SEO-optimerade tips, färdiga lektioner och praktiska resurser för svenska språket
        </p>
        <button
          onClick={scrollToContent}
          className="hero__cta inline-flex items-center gap-2 text-lg font-semibold hover:text-blue-200 transition-colors animate-slideUp"
          style={{ animationDelay: '200ms' }}
          aria-label="Hoppa till artiklar"
        >
          Utforska hundratals lektioner och artiklar om svenska språket
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 0.1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideUp {
          animation: slideUp 300ms ease-out backwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-slideUp,
          .animate-bounce,
          .hero__bg {
            animation: none;
          }
        }
      `}</style>
    </header>
  );
}
