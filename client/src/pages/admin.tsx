import { Link } from "wouter";
import { useEffect } from "react";

export default function Admin() {
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
          --admin-primary:#e74c3c;
          --admin-secondary:#c0392b;
          --admin-accent:#f39c12;
          --tile-ink:#ffffff;
        }

        .admin-body {
          margin:0; 
          background:linear-gradient(180deg, #ffeee6 0%, #f7fafc 80%); 
          color:var(--ink);
          font-family:Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
          display:flex; 
          align-items:flex-start; 
          justify-content:center;
          position:relative; 
          overflow-x:hidden;
          padding-top:30px;
          min-height:100vh;
          width:100%;
        }
        
        .logout-btn {
          position: fixed;
          top: 20px;
          right: 20px;
          background: rgba(231, 76, 60, 0.9);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          z-index: 1000;
        }
        
        .logout-btn:hover {
          background: rgba(192, 57, 43, 0.95);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
        }

        .admin-container {
          max-width:1200px;
          width:100%;
          padding:0 24px;
          display:flex;
          flex-direction:column;
          align-items:center;
        }

        .admin-header {
          text-align:center;
          margin-bottom:60px;
        }

        .admin-title {
          font-size:3.5rem;
          font-weight:800;
          color:var(--ink);
          margin:0 0 12px 0;
          text-shadow:0 2px 4px rgba(11, 41, 64, .1);
          background:linear-gradient(135deg, var(--admin-primary), var(--admin-accent));
          background-clip:text;
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
        }

        .admin-subtitle {
          font-size:1.25rem;
          color:var(--sub);
          margin:0 0 32px 0;
          font-weight:500;
        }

        .admin-grid {
          display:grid;
          grid-template-columns:repeat(auto-fit, minmax(350px, 1fr));
          gap:32px;
          width:100%;
          max-width:1000px;
        }

        .tile {
          background:linear-gradient(135deg, var(--bg) 0%, #ffffff 100%);
          border-radius:var(--tile-radius);
          box-shadow:var(--shadow);
          padding:40px 32px;
          text-decoration:none;
          color:inherit;
          transition:all .4s cubic-bezier(.23,1,.32,1);
          position:relative;
          overflow:hidden;
          border:1px solid rgba(255,255,255,.5);
          backdrop-filter:blur(10px);
          cursor:pointer;
          display:block;
          min-height:200px;
        }

        .tile:hover {
          transform:translateY(-8px) scale(1.02);
          box-shadow:0 20px 40px rgba(22, 46, 77, .2);
          border-color:rgba(255,255,255,.8);
        }

        .tile.clicked {
          transform:translateY(-4px) scale(.98);
        }

        .tile-icon {
          width:64px;
          height:64px;
          border-radius:16px;
          display:flex;
          align-items:center;
          justify-content:center;
          margin:0 0 24px 0;
          font-size:28px;
          font-weight:bold;
          color:var(--tile-ink);
          text-shadow:0 2px 4px rgba(0,0,0,.2);
        }

        .tile-content {
          position:relative;
          z-index:2;
        }

        .tile-title {
          font-size:1.5rem;
          font-weight:700;
          margin:0 0 12px 0;
          color:var(--ink);
        }

        .tile-description {
          font-size:1rem;
          color:var(--sub);
          line-height:1.5;
          margin:0;
        }

        .admin-reading {
          background:linear-gradient(135deg, #3eb5a5, #2c9a8b);
        }

        .admin-lesson {
          background:linear-gradient(135deg, #f5b638, #e67e22);
        }

        .admin-accounts {
          background:linear-gradient(135deg, #e74c3c, #c0392b);
        }

        .ripple {
          position:absolute;
          border-radius:50%;
          background:rgba(255,255,255,.3);
          transform:scale(0);
          animation:ripple-effect .6s ease-out;
          pointer-events:none;
          width:40px;
          height:40px;
          margin-left:-20px;
          margin-top:-20px;
        }

        @keyframes ripple-effect {
          to {
            transform:scale(4);
            opacity:0;
          }
        }

        @media (max-width:768px) {
          .admin-container {
            padding:0 16px;
          }
          
          .admin-title {
            font-size:2.5rem;
          }
          
          .admin-grid {
            grid-template-columns:1fr;
            gap:24px;
          }
          
          .tile {
            padding:32px 24px;
            min-height:160px;
          }
        }
      `}</style>
      
      <div className="admin-body">
        <button 
          className="logout-btn"
          onClick={() => window.location.href = '/api/auth/logout'}
          data-testid="button-logout"
        >
          Logga ut
        </button>
        
        <div className="admin-container">
          <header className="admin-header">
            <h1 className="admin-title">Adminpanel</h1>
            <p className="admin-subtitle">Hantera innehåll och användarkonton</p>
          </header>
          
          <div className="admin-grid">
            <Link 
              href="/admin/reading" 
              className="tile" 
              data-testid="link-admin-reading"
              role="button" 
              tabIndex={0}
            >
              <div className="tile-content">
                <div className="tile-icon admin-reading">
                  📖
                </div>
                <h2 className="tile-title">Läsförståelse</h2>
                <p className="tile-description">
                  Skapa och hantera läsförståelsetexter med frågor och definitioner för eleverna
                </p>
              </div>
            </Link>
            
            <Link 
              href="/admin/grammatik" 
              className="tile"
              data-testid="link-admin-grammatik"
              role="button" 
              tabIndex={0}
            >
              <div className="tile-content">
                <div className="tile-icon admin-lesson">
                  ✏️
                </div>
                <h2 className="tile-title">Grammatik</h2>
                <p className="tile-description">
                  Hantera ordklasser, grammatikövningar och språkspel för eleverna
                </p>
              </div>
            </Link>
            
            <Link 
              href="/admin/accounts" 
              className="tile"
              data-testid="link-admin-accounts"
              role="button" 
              tabIndex={0}
            >
              <div className="tile-content">
                <div className="tile-icon admin-accounts">
                  👥
                </div>
                <h2 className="tile-title">Hantera konton</h2>
                <p className="tile-description">
                  Administrera användarkonton, behörigheter och systeminställningar
                </p>
              </div>
            </Link>
            
            <Link 
              href="/admin/email-test" 
              className="tile"
              data-testid="link-admin-email-test"
              role="button" 
              tabIndex={0}
            >
              <div className="tile-content">
                <div className="tile-icon admin-email">
                  📧
                </div>
                <h2 className="tile-title">Testa e-post</h2>
                <p className="tile-description">
                  Testa e-postfunktionalitet och verifiera Postmark-konfiguration
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}