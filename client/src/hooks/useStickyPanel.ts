import { useEffect, useLayoutEffect, useState } from 'react';

interface StickyPanelHook {
  isSticky: boolean;
  panelHeight: number;
}

function useStickyPanel(
  containerRef: React.RefObject<HTMLElement>,
  panelRef: React.RefObject<HTMLElement>
): StickyPanelHook {
  const [isSticky, setIsSticky] = useState(false);
  const [panelHeight, setPanelHeight] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const panel = panelRef.current;
    if (!container || !panel) return;

    // Beräkna initial offset för panelen och tröskel för när den ska bli "sticky"
    const initialOffset = panel.offsetTop;
    const stickyThreshold = Math.max(initialOffset - 24, 0);
    // Spara initial panelhöjd
    setPanelHeight(panel.offsetHeight);

    // Håll reda på senaste sticky-status för att undvika onödiga state-uppdateringar
    let lastSticky = false;

    const onScroll = () => {
      const scrollTop = container.scrollTop;
      const shouldStick = scrollTop > stickyThreshold;
      if (shouldStick !== lastSticky) {
        setIsSticky(shouldStick);
        lastSticky = shouldStick;
      }
    };

    container.addEventListener('scroll', onScroll);

    // Observera panelens storlek (höjd/bredd) ifall innehållet ändras
    const resizeObserver = new ResizeObserver(() => {
      if (panelRef.current) {
        setPanelHeight(panelRef.current.offsetHeight);
      }
    });
    resizeObserver.observe(panel);

    return () => {
      container.removeEventListener('scroll', onScroll);
      resizeObserver.disconnect();
    };
  }, [containerRef, panelRef]);

  // Justera panelens position och bredd när den blir sticky (för att behålla rätt placering)
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    
    // Kontrollera att vi är på desktop först
    if (window.innerWidth < 1024) {
      return;
    }

    if (isSticky) {
      // Sätt fix läge på panelen: behåll horisontell position och bredd
      const rect = panel.getBoundingClientRect();
      panel.style.position = 'fixed';
      panel.style.top = '24px';
      panel.style.left = `${rect.left}px`;
      panel.style.width = `${rect.width}px`;
      panel.style.zIndex = '100'; // Lägg ovanför ev. innehåll
    } else {
      // Återställ panelens positionering när den inte är sticky
      panel.style.position = '';
      panel.style.top = '';
      panel.style.left = '';
      panel.style.width = '';
      panel.style.zIndex = '';
    }
  }, [isSticky, panelRef]);

  return { isSticky, panelHeight };
}

export default useStickyPanel;