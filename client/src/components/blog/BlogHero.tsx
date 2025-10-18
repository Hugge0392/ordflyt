import { ChevronDown } from "lucide-react";

export function BlogHero() {
  const scrollToContent = () => {
    document.getElementById('blog-index')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="hero relative bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 text-white py-20 overflow-hidden">
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 via-cyan-500/30 to-blue-400/30 animate-gradient-shift" />

      {/* Floating orbs */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-400/30 rounded-full blur-3xl animate-float-slow" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-400/30 rounded-full blur-3xl animate-float-slower" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl animate-pulse-slow" />

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
          Färdiga lektioner, tips och praktiska resurser för svenskundervisning
        </p>
        <button
          onClick={scrollToContent}
          className="hero__cta inline-flex items-center gap-2 text-lg font-semibold hover:text-blue-200 transition-colors animate-slideUp"
          style={{ animationDelay: '200ms' }}
          aria-label="Hoppa till artiklar"
        >
          Utforska material för svenska språket
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

        @keyframes gradient-shift {
          0%, 100% {
            opacity: 0.3;
            transform: translate(0, 0) scale(1);
          }
          50% {
            opacity: 0.5;
            transform: translate(10px, 10px) scale(1.05);
          }
        }

        @keyframes float-slow {
          0%, 100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(20px, 20px);
          }
        }

        @keyframes float-slower {
          0%, 100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(-30px, 15px);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.2;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.3;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }

        .animate-slideUp {
          animation: slideUp 300ms ease-out backwards;
        }

        .animate-gradient-shift {
          animation: gradient-shift 8s ease-in-out infinite;
        }

        .animate-float-slow {
          animation: float-slow 20s ease-in-out infinite;
        }

        .animate-float-slower {
          animation: float-slower 25s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 15s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-slideUp,
          .animate-bounce,
          .animate-gradient-shift,
          .animate-float-slow,
          .animate-float-slower,
          .animate-pulse-slow,
          .hero__bg {
            animation: none;
          }
        }
      `}</style>
    </header>
  );
}
