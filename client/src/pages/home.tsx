import { Link } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BlogPost } from "@shared/schema";
import { Calendar, Download, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { getQueryFn } from "@/lib/queryClient";

// Component to display recent blog posts
function RecentBlogPosts() {
  const { data: blogData, isLoading, error } = useQuery<{ posts: BlogPost[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>({
    queryKey: ['/api/blog/posts?limit=3&page=1'],
    queryFn: getQueryFn({ on401: "returnNull" }), // Public endpoint, no auth required
  });

  // Always show section, handle loading and empty states
  if (isLoading) {
    return (
      <section className="recent-blog-posts" data-testid="section-recent-material">
        <h2 className="section-title">📚 Senaste Lektionsmaterial</h2>
        <p className="section-description">
          Nya gratis material för din undervisning - uppdateras varje vecka!
        </p>
        <div className="blog-cards">
          {[1, 2, 3].map(i => (
            <div key={i} className="blog-card blog-card-skeleton">
              <div className="blog-card-image-skeleton"></div>
              <div className="blog-card-content">
                <div className="blog-card-title-skeleton"></div>
                <div className="blog-card-excerpt-skeleton"></div>
                <div className="blog-card-meta-skeleton"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return null; // Gracefully hide section on error
  }

  if (!blogData?.posts?.length) {
    return (
      <section className="recent-blog-posts" data-testid="section-recent-material">
        <h2 className="section-title">📚 Senaste Lektionsmaterial</h2>
        <p className="section-description">
          Nya gratis material för din undervisning - uppdateras varje vecka!
        </p>
        <div className="blog-empty-state">
          <div className="blog-empty-icon">📄</div>
          <h3 className="blog-empty-title">Inga material än</h3>
          <p className="blog-empty-description">
            Vi arbetar på att lägga till det första materialet. Kom tillbaka snart!
          </p>
          <Link href="/lektionsmaterial" className="view-all-link" data-testid="link-view-all-materials">
            Besök materialsidan
            <ArrowRight className="blog-icon" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="recent-blog-posts">
      <h2 className="section-title">📚 Senaste Lektionsmaterial</h2>
      <p className="section-description">
        Nya gratis material för din undervisning - uppdateras varje vecka!
      </p>
      <div className="blog-cards">
        {blogData.posts.map((post) => (
          <Link 
            key={post.id} 
            href={`/lektionsmaterial/${post.slug}`} 
            className="blog-card"
            data-testid={`card-material-${post.id}`}
          >
            {post.heroImageUrl && (
              <div className="blog-card-image">
                <img src={post.heroImageUrl} alt={post.title} />
              </div>
            )}
            <div className="blog-card-content">
              <h3 className="blog-card-title">{post.title}</h3>
              <p className="blog-card-excerpt">{post.excerpt}</p>
              <div className="blog-card-meta">
                <span className="blog-card-date">
                  <Calendar className="blog-icon" />
                  {format(new Date(post.publishedAt), 'dd MMM', { locale: sv })}
                </span>
                {post.downloadFileName && (
                  <span className="blog-card-download">
                    <Download className="blog-icon" />
                    {post.downloadFileType?.toUpperCase() || 'Fil'}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="blog-section-footer">
        <Link href="/lektionsmaterial" className="view-all-link" data-testid="link-view-all-materials">
          Se alla material
          <ArrowRight className="blog-icon" />
        </Link>
      </div>
    </section>
  );
}

export default function Home() {
  useEffect(() => {
    const tiles = document.querySelectorAll('.tile');
    
    const handleTileClick = (tile: Element) => (e: Event) => {
      const mouseEvent = e as MouseEvent;
      tile.classList.remove('clicked');
      void (tile as HTMLElement).offsetWidth;
      tile.classList.add('clicked');
      
      const r = document.createElement('span');
      r.className = 'ripple';
      const rect = tile.getBoundingClientRect();
      r.style.left = (mouseEvent.clientX - rect.left) + 'px';
      r.style.top = (mouseEvent.clientY - rect.top) + 'px';
      tile.appendChild(r);
      setTimeout(() => r.remove(), 500);
    };

    const handleTileKeydown = (tile: Element) => (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      if (keyEvent.key === ' ' || keyEvent.key === 'Enter') {
        keyEvent.preventDefault();
        (tile as HTMLElement).click();
      }
    };

    tiles.forEach(tile => {
      const clickHandler = handleTileClick(tile);
      const keydownHandler = handleTileKeydown(tile);
      
      tile.addEventListener('click', clickHandler);
      tile.addEventListener('keydown', keydownHandler);
    });

    return () => {
      tiles.forEach(tile => {
        tile.removeEventListener('click', handleTileClick(tile));
        tile.removeEventListener('keydown', handleTileKeydown(tile));
      });
    };
  }, []);

  return (
    <>
      <style>{`
        :root{
          --bg:#f7fafc;
          --ink:#0b2940;
          --sub:#2c3e50;
          --tile-radius:22px;
          --shadow:0 8px 20px rgba(22, 46, 77, .12);
          --puzzle:#4aa0e6;
          --read:#3eb5a5;
          --write:#f5b638;
          --speak:#7e6be6;
          --nordic:#15a8a8;
          --source:#f0722a;
          --materials:#e879f9;
          --tile-ink:#ffffff;
        }

        .home-body {
          margin:0; 
          background:linear-gradient(180deg, #ffc2e1 0%, #f8c8dc 80%); 
          color:var(--ink);
          font-family:Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
          display:flex; 
          align-items:flex-start; 
          justify-content:center;
          position:relative; 
          overflow-x:hidden;
          padding-top:30px;
          min-height:100vh;
        }

        .wrap{
          width:min(1100px, 92vw); 
          margin:auto; 
          text-align:center; 
          position:relative; 
          z-index:1;
        }

        .home-title {
          font-size: clamp(36px, 6vw, 64px); 
          letter-spacing:.3px; 
          margin:0 0 10px; 
          font-weight:800; 
          background:linear-gradient(90deg,#2563eb,#10b981,#f59e0b,#ef4444); 
          -webkit-background-clip:text; 
          background-clip:text; 
          color:transparent;
        }

        .home-title .dot{color:#1b4b9b}

        .home-subtitle {
          font-size: clamp(20px, 3.5vw, 36px); 
          font-weight:700; 
          color:var(--sub); 
          margin:0 0 26px;
        }

        .grid{
          display:grid; 
          gap:24px; 
          grid-template-columns:repeat(3, 1fr); 
          max-width: 900px;
          margin: 0 auto;
          align-items:stretch;
        }
        
        @media (max-width: 768px) {
          .grid {
            grid-template-columns: 1fr;
            max-width: 400px;
          }
        }
        
        @media (max-width: 900px) {
          .grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .tile{
          position:relative; 
          border-radius:var(--tile-radius); 
          color:var(--tile-ink); 
          padding:26px 20px 20px; 
          box-shadow:var(--shadow);
          display:flex; 
          flex-direction:column; 
          align-items:center; 
          justify-content:flex-end; 
          text-decoration:none; 
          isolation:isolate;
          background-image: radial-gradient(circle at 30% 20%, rgba(255,255,255,.20), transparent 40%), radial-gradient(circle at 70% 80%, rgba(255,255,255,.14), transparent 46%);
          transition: transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .18s ease, filter .18s ease;
        }

        .tile:focus{outline:3px solid rgba(255,255,255,.8); outline-offset:-3px}
        .tile:hover{transform:translateY(-3px) rotate(-0.5deg) scale(1.01); box-shadow:0 14px 30px rgba(22,46,77,.20)}
        .tile:active{transform:translateY(0) scale(.98)}

        .icon{
          font-size: 64px; 
          margin: 6px auto 14px; 
          filter: drop-shadow(0 6px 10px rgba(0,0,0,.15));
          display: block;
        }
        .label{font-size:22px; font-weight:700; letter-spacing:.3px;}

        @keyframes pop {
          0%{transform:scale(1)}
          50%{transform:scale(1.04)}
          100%{transform:scale(1)}
        }
        .clicked{animation: pop .22s ease-out}
        .tile::after{content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none; opacity:0}
        .ripple{position:absolute; border-radius:50%; transform:translate(-50%,-50%); pointer-events:none; width:10px; height:10px; background:rgba(255,255,255,.55); animation:ripple .5s ease-out forwards}
        @keyframes ripple{to{opacity:0; transform:translate(-50%,-50%) scale(22)}}

        .puzzle{background:var(--puzzle)}
        .read{background:var(--read)}
        .write{background:var(--write)}
        .speak{background:var(--speak)}
        .nordic{background:var(--nordic)}
        .source{background:var(--source)}
        .materials{background:var(--materials)}

        .footer{margin-top:26px; color:#5c6b7a; font-size:14px}
        .footer a{color:#4b6cb7; text-underline-offset:3px}
        
        /* Recent Blog Posts Section */
        .recent-blog-posts {
          margin-top: 60px;
          padding: 40px 20px;
          background: rgba(255, 255, 255, 0.8);
          border-radius: var(--tile-radius);
          box-shadow: var(--shadow);
          backdrop-filter: blur(10px);
        }
        
        .section-title {
          font-size: 32px;
          font-weight: 800;
          color: var(--ink);
          margin-bottom: 10px;
          text-align: center;
        }
        
        .section-description {
          font-size: 18px;
          color: var(--sub);
          text-align: center;
          margin-bottom: 30px;
        }
        
        .blog-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .blog-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(22, 46, 77, 0.08);
          transition: all 0.3s ease;
          text-decoration: none;
          color: inherit;
        }
        
        .blog-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(22, 46, 77, 0.15);
        }
        
        .blog-card-image {
          aspect-ratio: 16/9;
          overflow: hidden;
        }
        
        .blog-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .blog-card-content {
          padding: 20px;
        }
        
        .blog-card-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--ink);
          margin-bottom: 8px;
          line-height: 1.3;
        }
        
        .blog-card-excerpt {
          font-size: 14px;
          color: var(--sub);
          margin-bottom: 12px;
          line-height: 1.4;
        }
        
        .blog-card-meta {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: #8a9ba8;
        }
        
        .blog-card-date,
        .blog-card-download {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .blog-icon {
          width: 12px;
          height: 12px;
        }
        
        .blog-section-footer {
          text-align: center;
        }
        
        .view-all-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, var(--materials), #c355f0);
          color: white;
          text-decoration: none;
          border-radius: 25px;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.3s ease;
        }
        
        .view-all-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(227, 121, 249, 0.4);
        }
        
        /* Loading States */
        .blog-card-skeleton {
          animation: pulse 2s ease-in-out infinite;
        }
        
        .blog-card-image-skeleton {
          aspect-ratio: 16/9;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        
        .blog-card-title-skeleton {
          height: 16px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
          margin-bottom: 8px;
        }
        
        .blog-card-excerpt-skeleton {
          height: 12px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
          margin-bottom: 12px;
          width: 80%;
        }
        
        .blog-card-meta-skeleton {
          height: 10px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
          width: 60%;
        }
        
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        
        /* Empty State */
        .blog-empty-state {
          text-align: center;
          padding: 40px 20px;
        }
        
        .blog-empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        
        .blog-empty-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--ink);
          margin-bottom: 8px;
        }
        
        .blog-empty-description {
          font-size: 14px;
          color: var(--sub);
          margin-bottom: 20px;
        }
        
        @media (max-width: 768px) {
          .recent-blog-posts {
            margin-top: 40px;
            padding: 30px 15px;
          }
          
          .section-title {
            font-size: 28px;
          }
          
          .blog-cards {
            grid-template-columns: 1fr;
          }
          
          .blog-empty-state {
            padding: 30px 15px;
          }
        }
        
        /* Top buttons container */
        .top-buttons {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10;
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        /* Login button */
        .login-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 24px;
          border-radius: 25px;
          text-decoration: none;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
          background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
        }
        
        .login-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 10px rgba(102, 126, 234, 0.4);
        }

        /* Register button */
        .register-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 12px 24px;
          border-radius: 25px;
          text-decoration: none;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .register-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.6);
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
        }
        
        .register-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 10px rgba(16, 185, 129, 0.4);
        }
        
        /* Student login button */
        .student-login-btn {
          background: linear-gradient(135deg, #10b981 0%, #047857 100%);
          color: white;
          padding: 12px 24px;
          border-radius: 25px;
          text-decoration: none;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .student-login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.6);
          background: linear-gradient(135deg, #059669 0%, #065f46 100%);
        }
        
        .student-login-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 10px rgba(16, 185, 129, 0.4);
        }

        .login-icon, .register-icon, .student-icon {
          font-size: 18px;
        }

        /* Berg i bakgrunden */
        .bg-mountains{position:fixed; inset:0; z-index:-1; display:block; width:100%; height:100%; opacity: 0.8;}
        .layer.green{fill:url(#gradGreen)}
        .layer.gray{fill:url(#gradGray)}
        .layer.white{fill:url(#gradWhite)}
        
        /* Extra bakgrundslager för mer djup */
        .bg-landscape{position:fixed; bottom:0; left:0; right:0; height:60%; z-index:-2;}
        .grass-layer{
          position:absolute; bottom:0; left:0; right:0; height:35%; 
          background:linear-gradient(180deg, #4ade80 0%, #22c55e 50%, #16a34a 100%);
          box-shadow: inset 0 10px 20px rgba(0,0,0,0.1);
        }
        .mountain-back{
          position:absolute; bottom:25%; left:0; right:0; height:65%; 
          background:linear-gradient(180deg, #cbd5e1 0%, #94a3b8 50%, #64748b 100%); 
          clip-path: polygon(0% 100%, 10% 45%, 20% 65%, 35% 25%, 50% 55%, 65% 35%, 80% 70%, 95% 50%, 100% 100%);
          opacity: 0.8;
        }
        .mountain-mid{
          position:absolute; bottom:30%; left:0; right:0; height:50%; 
          background:linear-gradient(180deg, #9ca3af 0%, #6b7280 50%, #4b5563 100%); 
          clip-path: polygon(0% 100%, 15% 65%, 30% 35%, 45% 75%, 60% 30%, 75% 60%, 90% 45%, 100% 100%);
          opacity: 0.9;
        }
        .mountain-front{
          position:absolute; bottom:32%; left:0; right:0; height:40%; 
          background:linear-gradient(180deg, #6b7280 0%, #374151 50%, #1f2937 100%); 
          clip-path: polygon(0% 100%, 20% 55%, 40% 85%, 55% 40%, 70% 70%, 85% 45%, 100% 65%, 100% 100%);
        }
        
        /* Träd silhuetter */
        .trees{
          position: absolute; bottom:35%; left:0; right:0; height:15%;
          background-image: 
            radial-gradient(circle at 15% 100%, #064e3b 0%, transparent 8%),
            radial-gradient(circle at 25% 100%, #065f46 0%, transparent 6%),
            radial-gradient(circle at 45% 100%, #064e3b 0%, transparent 10%),
            radial-gradient(circle at 65% 100%, #065f46 0%, transparent 7%),
            radial-gradient(circle at 85% 100%, #064e3b 0%, transparent 9%);
          opacity: 0.6;
        }

        @media (prefers-color-scheme: dark){
          .home-body{background:linear-gradient(180deg, #0f1b2d 0%, #182538 70%)}
        }

        /* Moln */
        .clouds{position:fixed; top:40px; left:0; width:100%; height:140px; pointer-events:none; z-index:-1; opacity:.5}
        .cloud{position:absolute; width:180px; height:60px; background:#fff; border-radius:40px; filter:blur(0.4px); box-shadow:40px 10px 0 10px #fff,80px 0 0 0 #fff,120px 12px 0 6px #fff; animation:drift 55s linear infinite}
        .cloud:nth-child(2){top:40px; left:-20%; transform:scale(1.2); animation-duration:65s; animation-delay:-10s}
        .cloud:nth-child(3){top:80px; left:-30%; transform:scale(.9); animation-duration:75s; animation-delay:-25s}
        @keyframes drift{from{transform:translateX(-20%) scale(var(--s,1))} to{transform:translateX(120%) scale(var(--s,1))}}

        /* Sprinkles */
        .sprinkles{position:fixed; inset:0; pointer-events:none; z-index:-1}
        .sprinkles span{position:absolute; width:10px; height:10px; border-radius:50%; opacity:.55; animation:float 8s ease-in-out infinite}
        .sprinkles span:nth-child(3n){width:8px; height:8px; border-radius:2px; transform:rotate(45deg)}
        .sprinkles span:nth-child(5n){width:12px; height:12px}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}

        .s1{left:6%; top:80%; background:#ff8fab}
        .s2{left:90%; top:82%; background:#60a5fa}
        .s3{left:14%; top:86%; background:#34d399}
        .s4{left:74%; top:88%; background:#fbbf24}
        .s5{left:40%; top:84%; background:#f472b6}
        .s6{left:58%; top:90%; background:#22d3ee}
      `}</style>

      <div className="home-body">
        {/* Top buttons */}
        <div className="top-buttons">
          <Link href="/registrera-larare" className="register-btn" data-testid="button-register">
            <span className="register-icon">👥</span>
            Registrera
          </Link>
          <Link href="/elev/login" className="student-login-btn" data-testid="button-student-login">
            <span className="student-icon">🎓</span>
            Elev
          </Link>
          <Link href="/login" className="login-btn" data-testid="button-login">
            <span className="login-icon">👤</span>
            Lärare
          </Link>
        </div>
        
        {/* Extra bakgrundslager */}
        <div className="bg-landscape" aria-hidden="true">
          <div className="grass-layer"></div>
          <div className="mountain-back"></div>
          <div className="mountain-mid"></div>
          <div className="mountain-front"></div>
          <div className="trees"></div>
        </div>
        
        {/* Dekorativ bakgrund med berg */}
        <svg className="bg-mountains" viewBox="0 0 1440 1100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#66bb6a"/>
              <stop offset="100%" stopColor="#388e3c"/>
            </linearGradient>
            <linearGradient id="gradGray" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bdbdbd"/>
              <stop offset="100%" stopColor="#757575"/>
            </linearGradient>
            <linearGradient id="gradWhite" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff"/>
              <stop offset="100%" stopColor="#e0e0e0"/>
            </linearGradient>
          </defs>
          {/* Snötoppar 10% */}
          <path className="layer white" d="M0 300 L200 280 400 300 600 250 800 290 1000 270 1200 300 1440 280 1440 370 0 370Z"/>
          {/* Grå berg 25% */}
          <path className="layer gray" d="M0 370 L180 350 360 370 540 340 720 370 900 350 1080 370 1260 340 1440 370 1440 600 0 600Z"/>
          {/* Grön förgrund 65% */}
          <path className="layer green" d="M0 600 L160 560 320 600 480 560 640 600 800 560 960 600 1120 560 1280 600 1440 560 1440 1100 0 1100Z"/>
        </svg>

        {/* Moln och sprinkles */}
        <div className="clouds" aria-hidden="true">
          <div className="cloud" style={{"--s": "1"} as any}></div>
          <div className="cloud" style={{"--s": "1.2"} as any}></div>
          <div className="cloud" style={{"--s": ".9"} as any}></div>
        </div>
        <div className="sprinkles" aria-hidden="true">
          <span className="s1"></span>
          <span className="s2"></span>
          <span className="s3"></span>
          <span className="s4"></span>
          <span className="s5"></span>
          <span className="s6"></span>
        </div>

        <main className="wrap" role="main">
          <h1 className="home-title">ordflyt<span className="dot">.se</span></h1>
          <h2 className="home-subtitle">Välj en kategori</h2>

          <section className="grid" aria-label="Kategorier">
            <Link className="tile puzzle" href="/grammatik">
              <div className="icon">📚</div>
              <div className="label">Grammatik</div>
            </Link>
            <Link className="tile read" href="/lasforstaelse">
              <div className="icon">📖</div>
              <div className="label">Läsförståelse</div>
            </Link>
            <Link className="tile read" href="/laslogg">
              <div className="icon">📚</div>
              <div className="label">Läslogg</div>
            </Link>
            <Link className="tile write" href="/skrivande">
              <div className="icon">✏️</div>
              <div className="label">Skrivande</div>
            </Link>
            <Link className="tile speak" href="/muntligt">
              <div className="icon">🎤</div>
              <div className="label">Muntligt framförande</div>
            </Link>
            <Link className="tile nordic" href="/nordiska-sprak">
              <div className="icon">🌍</div>
              <div className="label">Nordiska språk</div>
            </Link>
            <Link className="tile source" href="/kallkritik">
              <div className="icon">🔍</div>
              <div className="label">Källkritik</div>
            </Link>
            <Link className="tile materials" href="/lektionsmaterial">
              <div className="icon">📄</div>
              <div className="label">Gratis Lektioner</div>
            </Link>
          </section>

          <p className="footer">
            Klicka på <strong>Grammatik</strong> för att komma till ordklasser och lektioner.
          </p>

          {/* Recent Blog Posts Section */}
          <RecentBlogPosts />
        </main>
      </div>
    </>
  );
}