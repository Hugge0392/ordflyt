import { Link } from "wouter";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowRight, Sparkles } from "lucide-react";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const subscribeMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Kunde inte registrera e-post");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Tack för din anmälan!",
        description: "Du kommer få nyheter och uppdateringar från Ordflyt.",
      });
      setEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "Något gick fel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes("@")) {
      subscribeMutation.mutate(email);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .landing-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .landing-container::before {
          content: '';
          position: absolute;
          width: 150%;
          height: 150%;
          background:
            radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
          animation: float 20s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -30px) rotate(5deg); }
          66% { transform: translate(-20px, 20px) rotate(-5deg); }
        }

        .landing-nav {
          position: relative;
          z-index: 10;
          padding: 1.5rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.1);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }

        .landing-logo {
          font-size: 1.75rem;
          font-weight: 800;
          color: white;
          text-decoration: none;
          letter-spacing: -0.5px;
          transition: transform 0.3s ease;
        }

        .landing-logo:hover {
          transform: scale(1.05);
        }

        .landing-nav-buttons {
          display: flex;
          gap: 0.75rem;
        }

        .landing-nav-btn {
          padding: 0.625rem 1.5rem;
          border-radius: 100px;
          font-weight: 600;
          font-size: 0.9375rem;
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .landing-nav-btn-blogg {
          background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(251, 146, 60, 0.4);
        }

        .landing-nav-btn-blogg:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(251, 146, 60, 0.5);
        }

        .landing-nav-btn-login {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(10px);
        }

        .landing-nav-btn-login:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        .landing-hero {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          margin: 0 auto;
          padding: 4rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .landing-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 100px;
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 2rem;
          backdrop-filter: blur(10px);
        }

        .landing-title {
          font-size: clamp(2.5rem, 8vw, 5rem);
          font-weight: 800;
          color: white;
          margin-bottom: 1.5rem;
          line-height: 1.1;
          letter-spacing: -2px;
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .landing-subtitle {
          font-size: clamp(1.125rem, 3vw, 1.5rem);
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 3rem;
          line-height: 1.6;
          max-width: 800px;
          font-weight: 500;
        }

        .landing-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 3rem;
          max-width: 700px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.5);
        }

        .landing-card-content h2 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 1rem;
          line-height: 1.3;
        }

        .landing-card-content p {
          font-size: 1.0625rem;
          color: #4b5563;
          line-height: 1.7;
          margin-bottom: 1.5rem;
        }

        .landing-card-content strong {
          color: #667eea;
          font-weight: 600;
        }

        .newsletter-section {
          margin-top: 2.5rem;
          padding-top: 2.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .newsletter-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          justify-content: center;
        }

        .newsletter-desc {
          font-size: 0.9375rem;
          color: #6b7280;
          margin-bottom: 1.5rem;
        }

        .newsletter-form {
          display: flex;
          gap: 0.75rem;
          flex-direction: column;
        }

        .newsletter-input {
          padding: 1rem 1.25rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.3s ease;
          background: white;
          font-family: inherit;
        }

        .newsletter-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .newsletter-btn {
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .newsletter-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
        }

        .newsletter-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .construction-badge {
          margin-top: 2rem;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(249, 115, 22, 0.1) 100%);
          border: 1px solid rgba(251, 146, 60, 0.3);
          border-radius: 12px;
          color: #92400e;
          font-size: 0.9375rem;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        @media (max-width: 768px) {
          .landing-nav {
            flex-direction: column;
            gap: 1rem;
            padding: 1rem;
          }

          .landing-nav-buttons {
            width: 100%;
            justify-content: center;
          }

          .landing-hero {
            padding: 2rem 1rem;
          }

          .landing-card {
            padding: 2rem 1.5rem;
          }

          .landing-title {
            letter-spacing: -1px;
          }
        }

        @media (min-width: 640px) {
          .newsletter-form {
            flex-direction: row;
          }

          .newsletter-input {
            flex: 1;
          }

          .newsletter-btn {
            white-space: nowrap;
          }
        }
      `}</style>

      <div className="landing-container">
        <nav className="landing-nav">
          <Link href="/" className="landing-logo">
            Ordflyt.se
          </Link>
          <div className="landing-nav-buttons">
            <Link href="/blogg" className="landing-nav-btn landing-nav-btn-blogg">
              Blogg
            </Link>
            <Link href="/login" className="landing-nav-btn landing-nav-btn-login">
              Logga in
            </Link>
          </div>
        </nav>

        <main className="landing-hero">
          <div className="landing-badge">
            <Sparkles size={16} />
            <span>Digitalt läromedel för svenska</span>
          </div>

          <h1 className="landing-title">Välkommen till FFFFF</h1>

          <p className="landing-subtitle">
            Ett modernt digitalt läromedel och lektionsbank för lärare i svenska och svenska som andraspråk i årskurs 4–6
          </p>

          <div className="landing-card">
            <div className="landing-card-content">
              <h2>Allt du behöver på ett ställe</h2>
              <p>
                Ordflyt är ett <strong>digitalt läromedel</strong> och en <strong>lektionsbank</strong> för lärare i svenska och svenska som andraspråk i årskurs 4–6.
              </p>
              <p>
                Här hittar du färdiga digitala övningar, texter och lektioner som hjälper dina elever att utveckla sin <strong>läsförståelse</strong>, <strong>grammatik</strong>, <strong>ordförråd</strong>, <strong>källkritik</strong> och <strong>skrivförmåga</strong>.
              </p>
              <p style={{ marginBottom: 0 }}>
                Ordflyt gör undervisningen enklare, roligare och mer effektiv – både för dig och dina elever.
              </p>

              <div className="newsletter-section">
                <h3 className="newsletter-title">
                  <Mail size={20} />
                  Bli pilotklass
                </h3>
                <p className="newsletter-desc">
                  Vill du få nyheter, uppdateringar eller chansen att bli pilotklass när vi lanserar nytt material? Fyll i din e-post och få exklusiv förhandsinformation.
                </p>
                <form onSubmit={handleSubmit} className="newsletter-form">
                  <input
                    type="email"
                    placeholder="din@email.se"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="newsletter-input"
                    required
                  />
                  <button
                    type="submit"
                    className="newsletter-btn"
                    disabled={subscribeMutation.isPending}
                  >
                    {subscribeMutation.isPending ? "Registrerar..." : (
                      <>
                        Prenumerera
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="construction-badge">
            <span>🚧</span>
            <span>Sidan är under utveckling – mer innehåll kommer snart!</span>
          </div>
        </main>
      </div>
    </>
  );
}
