// hooks/useStickyPanelIO.ts
import { useLayoutEffect, useRef } from "react";

type PinState = "static" | "fixed" | "abs";

function findScrollRoot(el: HTMLElement | null): HTMLElement | null {
  let n: HTMLElement | null = el;
  while (n && n.parentElement) {
    const cs = getComputedStyle(n);
    if (/(auto|scroll)/.test(cs.overflowY)) return n;
    n = n.parentElement as HTMLElement;
  }
  return null; // fall back till viewport
}

export default function useStickyPanelIO(opts: {
  columnRef: React.RefObject<HTMLElement>;
  panelRef: React.RefObject<HTMLElement>;
  topOffset?: number;   // px: samma som i CSS .pin-fixed { top: … }
  hysteresis?: number;  // px: tröskel-buffert
}) {
  const { columnRef, panelRef, topOffset = 24, hysteresis = 8 } = opts;
  const stateRef = useRef<PinState>("static");
  const rafRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const col = columnRef.current!;
    const panel = panelRef.current!;
    if (!col || !panel) return;

    // Skapa sentinels
    const topSent = document.createElement("div");
    const botSent = document.createElement("div");
    topSent.className = "pin-sentinel pin-sentinel--top";
    botSent.className = "pin-sentinel pin-sentinel--bottom";
    topSent.style.cssText = "position:relative;height:1px;width:100%;";
    botSent.style.cssText = "position:relative;height:1px;width:100%;";

    // placera dem runt panelen
    col.insertBefore(topSent, col.firstChild);
    col.appendChild(botSent);

    // Håll left/width i sync för fixed-läget (relativt viewport)
    const updateVars = () => {
      const r = col.getBoundingClientRect();
      col.style.setProperty("--pin-left", `${Math.round(r.left)}px`);
      col.style.setProperty("--pin-width", `${Math.round(r.width)}px`);
    };

    // Mät i nästa frame för att undvika reflow-thrash
    const scheduleVars = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        updateVars();
      });
    };

    updateVars();
    window.addEventListener("resize", scheduleVars);
    window.addEventListener("scroll", scheduleVars, { passive: true });

    const rootEl = findScrollRoot(col);
    const ioOptionsTop: IntersectionObserverInit = {
      root: rootEl ?? null,
      rootMargin: `${-(topOffset + hysteresis)}px 0px 0px 0px`,
      threshold: [0, 1],
    };
    const ioOptionsBottom: IntersectionObserverInit = {
      root: rootEl ?? null,
      rootMargin: `0px 0px ${-(topOffset + hysteresis)}px 0px`,
      threshold: [0, 1],
    };

    let topVisible = true;
    let bottomVisible = false;

    const apply = () => {
      // static: topp-sentinel synlig (panelen har inte nått "sticky")
      // fixed: topp-sentinel passerad, botten ej nådd
      // abs:   botten-sentinel når vyn → lås panelen i botten
      const next: PinState = bottomVisible ? "abs" : (topVisible ? "static" : "fixed");
      if (next === stateRef.current) return;
      stateRef.current = next;

      panel.classList.remove("pin-fixed", "pin-abs");
      if (next === "fixed") panel.classList.add("pin-fixed");
      if (next === "abs") panel.classList.add("pin-abs");
    };

    const ioTop = new IntersectionObserver((entries) => {
      topVisible = entries[0].isIntersecting && entries[0].intersectionRatio > 0;
      apply();
    }, ioOptionsTop);

    const ioBottom = new IntersectionObserver((entries) => {
      bottomVisible = entries[0].isIntersecting && entries[0].intersectionRatio > 0;
      apply();
    }, ioOptionsBottom);

    ioTop.observe(topSent);
    ioBottom.observe(botSent);

    // init i nästa frame (så CSS-variabler hinner sättas)
    requestAnimationFrame(apply);

    return () => {
      ioTop.disconnect();
      ioBottom.disconnect();
      window.removeEventListener("resize", scheduleVars);
      window.removeEventListener("scroll", scheduleVars);
      try { col.removeChild(topSent); } catch {}
      try { col.removeChild(botSent); } catch {}
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [columnRef, panelRef, topOffset, hysteresis]);
}