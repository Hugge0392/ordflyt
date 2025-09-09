import { useEffect, useLayoutEffect, useRef, useState } from "react";

type MaybeEl = HTMLElement | null;

export default function useStickyPanel(
  scrollContainerRef: React.RefObject<HTMLElement>, // får vara null: vi lyssnar alltid på window också
  panelRef: React.RefObject<HTMLElement>,
  topPx: number = 24,
  minWidth: number = 1024
) {
  const [isSticky, setIsSticky] = useState(false);
  const [panelHeight, setPanelHeight] = useState(0);

  // wrapper = panelens förälder (<div class="questions-panel-wrapper"> ...)
  const wrapperRef = useRef<MaybeEl>(null);
  
  // Anti-flicker: debounce tillståndsbyten
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useLayoutEffect(() => {
    const p = panelRef.current as MaybeEl;
    if (!p) return;
    wrapperRef.current = p.parentElement as MaybeEl;
  }, [panelRef]);

  useLayoutEffect(() => {
    const p = panelRef.current as MaybeEl;
    const w = wrapperRef.current as MaybeEl;
    // Vi lyssnar alltid på window; PLUS ev. intern scroll-container
    const scroller: (Window | HTMLElement)[] = [window];
    if (scrollContainerRef.current) scroller.push(scrollContainerRef.current);

    if (!p || !w) return;

    // Se till att wrappern är en stabil referens i flow
    if (getComputedStyle(w).position === "static") {
      w.style.position = "relative";
    }

    let raf = 0;

    const measure = () => {
      raf = 0;

      const vw = window.innerWidth;
      const wr = w.getBoundingClientRect();
      const ph = p.offsetHeight;

      setPanelHeight(ph);

      if (vw < minWidth) {
        // Mobil: normal-läge
        if (isSticky) setIsSticky(false);
        // Nollställ inline-stilar
        p.style.position = "";
        p.style.top = "";
        p.style.left = "";
        p.style.width = "";
        p.style.maxHeight = "";
        p.style.overflowY = "";
        p.style.zIndex = "";
        w.style.minHeight = "";
        return;
      }

      // Förstärkt hysteresis: större buffertzon och debounce
      const enterStickyThreshold = topPx;
      const exitStickyThreshold = topPx + 20; // större buffert
      
      let shouldStick = isSticky; // behåll nuvarande tillstånd som default
      
      if (!isSticky && wr.top <= enterStickyThreshold) {
        shouldStick = true; // gå in i sticky-mode
      } else if (isSticky && wr.top > exitStickyThreshold) {
        shouldStick = false; // gå ur sticky-mode
      }
      
      // Debounce tillståndsbyten för extra stabilitet
      if (shouldStick !== isSticky) {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
          setIsSticky(shouldStick);
        }, 16); // ~1 frame delay
      }
      if (shouldStick) {
        // Lås bredd + vänsterkant från wrappern varje gång (robust vid resize)
        p.style.position = "fixed";
        p.style.top = `${topPx}px`;
        p.style.left = `${Math.round(wr.left)}px`;
        p.style.width = `${Math.round(wr.width)}px`;
        p.style.maxHeight = `calc(100vh - ${topPx + 8}px)`;
        p.style.overflowY = "auto";
        p.style.zIndex = "1000";
        // Reservplats i layouten så inget hoppar
        w.style.minHeight = `${ph}px`;
      } else {
        // Tillbaka till flow
        p.style.position = "";
        p.style.top = "";
        p.style.left = "";
        p.style.width = "";
        p.style.maxHeight = "";
        p.style.overflowY = "";
        p.style.zIndex = "";
        w.style.minHeight = "";
      }
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    // Lyssna på window + ev. intern scrollcontainer
    scroller.forEach(s => s.addEventListener("scroll", schedule, { passive: true }));
    window.addEventListener("resize", schedule);

    // Reagera på storleksförändringar
    const ro = new ResizeObserver(schedule);
    ro.observe(w);
    ro.observe(p);

    // Och DOM-innehållet i panelen
    const mo = new MutationObserver(schedule);
    mo.observe(p, { childList: true, subtree: true });

    // Init
    schedule();

    return () => {
      scroller.forEach(s => s.removeEventListener("scroll", schedule));
      window.removeEventListener("resize", schedule);
      ro.disconnect();
      mo.disconnect();
      if (raf) cancelAnimationFrame(raf);
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [panelRef, scrollContainerRef, topPx, minWidth, isSticky]);

  return { isSticky, panelHeight };
}