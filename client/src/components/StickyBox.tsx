import React, { useLayoutEffect, useRef } from "react";

type Props = {
  /** Pixelmarginal från toppen av viewport när panelen är "fast". */
  offsetTop?: number;
  /** Extra luft ovanför botten av behållaren när den "dockar" i botten. */
  bottomOffset?: number;
  /** Om du vill begränsa hur brett elementet är när det är fixed (t.ex. en grid-kolumn). */
  widthAlignRef?: React.RefObject<HTMLElement>;
  children: React.ReactNode;
};

/**
 * StickyBox: funkar även när CSS-sticky blockeras av overflow/transform/contain.
 * Den fixerar elementet när du scrollat förbi dess topp, och dokar det i botten
 * av sin egen wrapper när du når slutet.
 */
export default function StickyBox({
  offsetTop = 24,
  bottomOffset = 24,
  widthAlignRef,
  children,
}: Props) {
  const holderRef = useRef<HTMLDivElement>(null); // "boundary" (relativ)
  const boxRef = useRef<HTMLDivElement>(null);    // själva boxen vi flyttar

  useLayoutEffect(() => {
    const el = boxRef.current!;
    const holder = holderRef.current!;
    if (!el || !holder) return;

    // gör boundary relativ så "absolute" har en referens
    if (getComputedStyle(holder).position === "static") {
      holder.style.position = "relative";
    }

    const onScrollOrResize = () => {
      const holderRect = holder.getBoundingClientRect();
      const pageY = window.scrollY || window.pageYOffset;

      const holderTop = pageY + holderRect.top;
      const holderBottom = holderTop + holder.offsetHeight;

      const elHeight = el.offsetHeight;
      const topLine = pageY + offsetTop; // var panelen ska ligga när den är "fixed"

      // 1) Bottenkoll: om panelens nederkant (topLine + höjd) skulle gå förbi holderBottom - bottomOffset
      if (topLine + elHeight >= holderBottom - bottomOffset) {
        const topInside = holder.offsetHeight - elHeight - bottomOffset;
        // docka mot botten i boundary
        Object.assign(el.style, {
          position: "absolute",
          top: `${Math.max(0, topInside)}px`,
          left: "0px",
          right: "0px",
          width: "auto",
        } as CSSStyleDeclaration);
        return;
      }

      // 2) Toppkoll: om vi scrollat nedanför holderTop => "fixed" läge
      if (topLine > holderTop) {
        const alignRect = (widthAlignRef?.current || holder).getBoundingClientRect();
        Object.assign(el.style, {
          position: "fixed",
          top: `${offsetTop}px`,
          left: `${alignRect.left}px`,
          width: `${alignRect.width}px`,
          right: "auto",
        } as CSSStyleDeclaration);
        return;
      }

      // 3) Annars: normal (ej fast)
      Object.assign(el.style, {
        position: "static",
        top: "",
        left: "",
        right: "",
        width: "",
      } as CSSStyleDeclaration);
    };

    // initial och lyssnare
    onScrollOrResize();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [offsetTop, bottomOffset, widthAlignRef]);

  return (
    <div ref={holderRef}>
      <div ref={boxRef} style={{ willChange: "transform" }}>
        {children}
      </div>
    </div>
  );
}