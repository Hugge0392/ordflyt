import React, { useRef, useState, useEffect, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Settings, Volume2 } from "lucide-react";
import { TextToSpeechControls } from "./TextToSpeechControls";
import type { ReadingLesson } from "@shared/schema";

interface FocusModeProps {
  lesson: ReadingLesson;
  currentPage: number;
  pages: string[];
  focusSettings: {
    fontSize: number;
    lineHeight: number;
    backgroundColor: string;
    fontFamily: string;
  };
  setFocusSettings: (settings: any | ((prev: any) => any)) => void;
  processContentWithDefinitions: (content: string, definitions: any[]) => string;
  readingFocusLines: number;
  setReadingFocusLines: (lines: number) => void;
  currentReadingLine: number;
  setCurrentReadingLine: (line: number | ((prev: number) => number)) => void;
  focusAnimationState: string;
  setFocusAnimationState: (state: string) => void;
  onExitFocusMode: () => void;
  showFocusQuestionsPopup: boolean;
  setShowFocusQuestionsPopup: (show: boolean) => void;
  getTotalQuestionsCount: () => number;
  getShowFocusQuestionsButton: () => boolean;
  generalAnswers: Record<number, string>;
  setGeneralAnswers: (answers: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  questionsPanel12Answers: Record<number, string>;
  setQuestionsPanel12Answers: (answers: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  hasNextPage: () => boolean;
  hasPreviousPage: () => boolean;
  goToNextPageFromFocus: () => void;
  goToPreviousPageFromFocus: () => void;
}

// DOM measurement functions
function measureLineRects(textEl: HTMLElement, containerEl: HTMLElement): DOMRect[] {
  if (!textEl || !containerEl) return [];

  const getAllTextNodes = (root: Node): Text[] => {
    const out: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (/\S/.test(n.nodeValue || "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    let n: Node | null;
    while ((n = walker.nextNode())) out.push(n as Text);
    return out;
  };

  const rects: DOMRect[] = [];
  const textNodes = getAllTextNodes(textEl);
  if (!textNodes.length) return [];

  const range = document.createRange();
  for (const tn of textNodes) {
    let lastTop: number | null = null;
    for (let i = 0; i < tn.length; i++) {
      range.setStart(tn, i);
      range.setEnd(tn, i + 1);
      const r = range.getClientRects()[0];
      if (!r || r.width === 0 || r.height === 0) continue;

      if (lastTop === null || Math.abs(r.top - lastTop) > 0.5) {
        rects.push(r);
        lastTop = r.top;
      } else {
        const prev = rects[rects.length - 1];
        const left = Math.min(prev.left, r.left);
        const right = Math.max(prev.right, r.right);
        rects[rects.length - 1] = new DOMRect(left, prev.top, right - left, Math.max(prev.height, r.height));
      }
    }
  }

  return rects.map((r) => {
    const cont = containerEl.getBoundingClientRect();
    return new DOMRect(r.left - cont.left, r.top - cont.top, r.width, r.height);
  });
}

export default function FocusMode({
  lesson,
  currentPage,
  pages,
  focusSettings,
  setFocusSettings,
  processContentWithDefinitions,
  readingFocusLines,
  setReadingFocusLines,
  currentReadingLine,
  setCurrentReadingLine,
  focusAnimationState,
  setFocusAnimationState,
  onExitFocusMode,
  showFocusQuestionsPopup,
  setShowFocusQuestionsPopup,
  getTotalQuestionsCount,
  getShowFocusQuestionsButton,
  generalAnswers,
  setGeneralAnswers,
  questionsPanel12Answers,
  setQuestionsPanel12Answers,
  hasNextPage,
  hasPreviousPage,
  goToNextPageFromFocus,
  goToPreviousPageFromFocus,
}: FocusModeProps) {
  // DOM-based reading focus states
  const contentRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const [lineRects, setLineRects] = useState<DOMRect[]>([]);

  // Measure line rectangles when content changes
  useEffect(() => {
    const measure = () => {
      if (!textRef.current || !contentRef.current) return;
      try {
        const rects = measureLineRects(textRef.current, contentRef.current);
        setLineRects(rects);
        setCurrentReadingLine(0);
      } catch (err) {
        console.warn("Error measuring line rects:", err);
        setLineRects([]);
        setCurrentReadingLine(0);
      }
    };

    // mät på nästa tick
    const raf = requestAnimationFrame(measure);

    // reagera på resize för BÅDA
    const roText = new ResizeObserver(measure);
    const roCont = new ResizeObserver(measure);
    if (textRef.current) roText.observe(textRef.current);
    if (contentRef.current) roCont.observe(contentRef.current);

    // uppdatera på scroll i containern (viktigt vid fokusflytt)
    const onScroll = () => measure();
    contentRef.current?.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      roText.disconnect();
      roCont.disconnect();
      contentRef.current?.removeEventListener("scroll", onScroll);
    };
  }, [
    lesson,
    currentPage,
    focusSettings.fontSize,
    focusSettings.lineHeight,
    focusSettings.fontFamily,
  ]);

  // Calculate focus rectangle (covers N lines)
  const focusRect = useMemo(() => {
    try {
      if (!lineRects.length) return null;

      const start = Math.min(currentReadingLine, Math.max(0, lineRects.length - 1));
      const end = Math.min(start + readingFocusLines - 1, lineRects.length - 1);

      const top = lineRects[start]?.top || 0;
      const bottom = (lineRects[end]?.top || 0) + (lineRects[end]?.height || 0);
      const height = bottom - top + 3; // +3px för descenders (j, g, y, p)

      // Beräkna bredden baserat på den längsta raden i fokus-området
      let maxWidth = 0;
      let minLeft = Infinity;
      for (let i = start; i <= end; i++) {
        if (lineRects[i]) {
          const rect = lineRects[i];
          const lineRight = rect.left + rect.width;
          if (lineRight > maxWidth) {
            maxWidth = lineRight;
          }
          if (rect.left < minLeft) {
            minLeft = rect.left;
          }
        }
      }
      
      const width = maxWidth - minLeft + 20; // +20px padding för snyggare utseende
      const left = Math.max(0, minLeft - 10); // -10px för lite padding till vänster

      return { top, height, left, width };
    } catch (e) {
      console.warn("Error calculating focus rect:", e);
      return null;
    }
  }, [lineRects, currentReadingLine, readingFocusLines]);

  // Keyboard navigation for reading focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowRight" || e.code === "ArrowDown" || e.code === "Enter") {
        e.preventDefault();
        setCurrentReadingLine((prev) => {
          const maxLine = Math.max(0, lineRects.length - readingFocusLines);
          return Math.min(prev + 1, maxLine);
        });
      } else if (e.code === "ArrowLeft" || e.code === "ArrowUp") {
        e.preventDefault();
        setCurrentReadingLine((prev) => Math.max(0, prev - 1));
      } else if (e.code === "Escape") {
        onExitFocusMode();
      }
    };

    const handleScroll = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 0) {
        // Scroll down
        setCurrentReadingLine((prev) => {
          const maxLine = Math.max(0, lineRects.length - readingFocusLines);
          return Math.min(prev + 1, maxLine);
        });
      } else {
        // Scroll up
        setCurrentReadingLine((prev) => Math.max(0, prev - 1));
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("wheel", handleScroll, { passive: false });

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("wheel", handleScroll);
    };
  }, [lineRects.length, readingFocusLines, onExitFocusMode, setCurrentReadingLine]);

  // Center focus window in container and page (smooth scroll)
  useEffect(() => {
    if (!focusRect || !contentRef.current) return;
    const cont = contentRef.current;
    
    // Scroll within container
    const targetScrollTop = Math.max(
      0,
      focusRect.top + focusRect.height / 2 - cont.clientHeight / 2,
    );
    cont.scrollTo({ top: targetScrollTop, behavior: "smooth" });
    
    // Also scroll the entire page to keep focus rect visible in viewport
    const contRect = cont.getBoundingClientRect();
    const focusTopInViewport = contRect.top + focusRect.top;
    const focusBottomInViewport = focusTopInViewport + focusRect.height;
    
    // Check if focus rect is in the outer thirds of viewport
    const viewportHeight = window.innerHeight;
    const upperThird = viewportHeight / 3;
    const lowerThird = viewportHeight * 2 / 3;
    
    if (focusTopInViewport < upperThird) {
      // Focus is in upper third, scroll up to center it
      const targetY = window.scrollY + focusTopInViewport - (viewportHeight / 2) + (focusRect.height / 2);
      window.scrollTo({
        top: Math.max(0, targetY),
        behavior: "smooth"
      });
    } else if (focusBottomInViewport > lowerThird) {
      // Focus is in lower third, scroll down to center it
      const targetY = window.scrollY + focusBottomInViewport - (viewportHeight / 2) - (focusRect.height / 2);
      window.scrollTo({
        top: targetY,
        behavior: "smooth"
      });
    }
  }, [currentReadingLine, focusRect]);

  // Check if user is on the last line in focus mode
  const isOnLastLine = () => {
    if (!lineRects.length) return false;
    const maxLine = Math.max(0, lineRects.length - readingFocusLines);
    return currentReadingLine >= maxLine;
  };

  return (
    <div className="focus-mode-main-container flex justify-center items-start mb-6">
      <div
        className="focus-mode-content-wrapper w-full max-w-4xl mx-auto"
        style={{
          backgroundColor: "#242424",
          borderRadius: "0.5rem",
        }}
      >
        <div className="focus-mode-inner-wrapper space-y-6 p-8">
          <div
            ref={contentRef}
            className="focus-mode-reading-container max-w-none min-h-[400px] reading-content accessibility-enhanced relative overflow-auto"
            style={{
              fontSize: "16px", // stable measuring font for ch units
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              backgroundColor: "#242424",
              color: "var(--accessibility-text-color)",
              display: "flow-root", // 💡 bryt margin-collapsing från första barnet
              width: "100%",
              maxWidth: "none",
              fontFamily: "var(--focus-font-family)",
            }}
          >
            <style>{`
              /* Dölj bara divider/HR */
              .reading-content hr,
              .reading-content [role="separator"],
              .reading-content .ql-divider,
              .reading-content .divider {
                display: none !important;
              }

              /* Låt textfärgen vinna, men rör inte bakgrunder generellt */
              .reading-content {
                background-color: #242424 !important;
                color: var(--accessibility-text-color) !important;
              }
              .reading-content * {
                color: var(--accessibility-text-color) !important;
              }

              /* Bas: låt wrappen definiera typografi */
              .reading-content [data-reading-text] {
                font-size: ${focusSettings.fontSize}px !important;
                line-height: ${focusSettings.lineHeight} !important;
              }
              /* Alla barn ärver => slår inline font-size/line-height från editorn (utom rubriker) */
              .reading-content [data-reading-text] *:not(h1):not(h2):not(h3):not(h4):not(h5):not(h6) {
                font-size: inherit !important;
                line-height: inherit !important;
              }
              
              /* Specifik styling för rubriker - proportionell mot bastextstorlek */
              .reading-content [data-reading-text] h1 {
                font-size: calc(${focusSettings.fontSize}px * 1.8) !important;
                line-height: 1.2 !important;
                font-weight: bold !important;
                margin: 0 0 0.2em 0 !important;
              }
              .reading-content [data-reading-text] h2 {
                font-size: calc(${focusSettings.fontSize}px * 1.5) !important;
                line-height: 1.3 !important;
                font-weight: bold !important;
                margin: 0 0 0.15em 0 !important;
              }
              .reading-content [data-reading-text] h3 {
                font-size: calc(${focusSettings.fontSize}px * 1.3) !important;
                line-height: 1.3 !important;
                font-weight: bold !important;
                margin: 0 0 0.15em 0 !important;
              }
              
              /* Ordförklaringar styling */
              .defined-word {
                text-decoration: underline dotted;
                text-underline-offset: 2px;
                cursor: help;
              }

              /* Focus overlay styles */
              .focus-overlay-container {
                transition: opacity 0.3s ease;
                opacity: 0;
                pointer-events: none;
                position: absolute;
                inset: 0;
              }

              .focus-overlay-container.focus-entering,
              .focus-overlay-container.focus-active {
                opacity: 1;
              }

              /* Scrims måste vara SVARTA – hög specificitet inne i containern */
              .reading-content.accessibility-enhanced .rf-scrim {
                background: rgba(0,0,0,0.86) !important;
                pointer-events: none !important;
                z-index: 2147483646 !important;
              }

              /* Ramen runt fönstret */
              .reading-content.accessibility-enhanced .rf-frame {
                border: none !important;
                border-radius: 4px !important;
                background: transparent !important;
                pointer-events: none !important;
                z-index: 2147483647 !important;
              }

              .reading-content.accessibility-enhanced { 
                isolation: isolate !important; 
              }
            `}</style>

            <div
              ref={textRef}
              data-reading-text
              dangerouslySetInnerHTML={{
                __html: processContentWithDefinitions(
                  pages[currentPage] || "",
                  lesson.wordDefinitions,
                ),
              }}
            />

            {focusRect && (
              <div className={`focus-overlay-container focus-${focusAnimationState}`}>
                {/* TOP */}
                <div
                  className="focus-scrim-top rf-scrim"
                  aria-hidden
                  style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${focusRect.top}px` }}
                />
                {/* BOTTOM */}
                <div
                  className="focus-scrim-bottom rf-scrim"
                  aria-hidden
                  style={{ position: "absolute", top: `${focusRect.top + focusRect.height}px`, left: 0, right: 0, bottom: 0 }}
                />
                {/* LEFT */}
                <div
                  className="focus-scrim-left rf-scrim"
                  aria-hidden
                  style={{ position: "absolute", top: `${focusRect.top}px`, left: 0, width: `${focusRect.left}px`, height: `${focusRect.height}px` }}
                />
                {/* RIGHT */}
                <div
                  className="focus-scrim-right rf-scrim"
                  aria-hidden
                  style={{ position: "absolute", top: `${focusRect.top}px`, left: `${focusRect.left + focusRect.width}px`, right: 0, height: `${focusRect.height}px` }}
                />
                {/* FRAME */}
                <div
                  className="focus-window-frame rf-frame"
                  aria-hidden
                  style={{ position: "absolute", top: `${focusRect.top}px`, left: `${focusRect.left}px`, width: `${focusRect.width}px`, height: `${focusRect.height}px` }}
                />
              </div>
            )}
          </div>

          {/* Focus mode controls container */}
          <div className={`focus-mode-controls focus-ui-button focus-${focusAnimationState} fixed top-1 right-8 z-40 flex gap-2`}>
            {/* Questions button */}
            {getShowFocusQuestionsButton() && getTotalQuestionsCount() > 0 && (
              <button
                onClick={() => setShowFocusQuestionsPopup(true)}
                className="bg-background border-2 shadow-lg hover:shadow-xl transition-all text-foreground px-3 py-2 rounded-md flex items-center gap-2"
                title="Visa frågor"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-medium">Frågor ({getTotalQuestionsCount()})</span>
              </button>
            )}

            {/* Text-to-Speech button */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="bg-background border-2 shadow-lg hover:shadow-xl transition-all text-foreground px-3 py-2 rounded-md flex items-center gap-2"
                  title="Lyssna på texten"
                >
                  <Volume2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Uppläsning</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-96" align="end">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Uppläsning av text</h4>
                  <TextToSpeechControls
                    text={pages[currentPage] || ""}
                    variant="default"
                  />
                </div>
              </PopoverContent>
            </Popover>

            {/* Focus mode accessibility controls */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="bg-background border-2 shadow-lg hover:shadow-xl text-foreground p-3 rounded-md"
                  title="Anpassa textstorlek"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="focus-settings-wrapper space-y-4">
                  <div className="focus-settings-header space-y-2">
                    <h4 className="font-medium leading-none">Fokusläge - Textinställningar</h4>
                    <p className="text-sm text-muted-foreground">
                      Anpassa texten för fokusläget
                    </p>
                  </div>
                  
                  {/* Font Size Slider */}
                  <div className="focus-font-size-control space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Textstorlek</Label>
                      <span className="text-sm text-muted-foreground">{focusSettings.fontSize}px</span>
                    </div>
                    <Slider
                      value={[focusSettings.fontSize]}
                      onValueChange={(value) => setFocusSettings((prev: any) => ({ ...prev, fontSize: value[0] }))}
                      max={60}
                      min={12}
                      step={2}
                      className="w-full"
                    />
                  </div>

                  {/* Line Height Slider */}
                  <div className="focus-line-height-control space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Radavstånd</Label>
                      <span className="text-sm text-muted-foreground">{focusSettings.lineHeight}</span>
                    </div>
                    <Slider
                      value={[focusSettings.lineHeight]}
                      onValueChange={(value) => setFocusSettings((prev: any) => ({ ...prev, lineHeight: value[0] }))}
                      max={3}
                      min={1}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  {/* Number of lines control */}
                  <div className="focus-lines-count-control space-y-2">
                    <Label className="text-sm font-medium">Antal rader samtidigt</Label>
                    <Select
                      value={readingFocusLines.toString()}
                      onValueChange={(value) => setReadingFocusLines(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 rad</SelectItem>
                        <SelectItem value="3">3 rader</SelectItem>
                        <SelectItem value="5">5 rader</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Exit focus button */}
            <button
              onClick={onExitFocusMode}
              className="text-white p-3 rounded-full shadow-lg border-2 border-white bg-[#ffffff]"
              title="Avsluta läsfokus (Esc)"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Next page button when on last line */}
          {isOnLastLine() && hasNextPage() && (
            <button
              onClick={goToNextPageFromFocus}
              className="fixed bottom-6 right-6 z-40 bg-blue-600 bg-opacity-90 text-white px-6 py-3 rounded-lg hover:bg-opacity-100 transition-all shadow-lg flex items-center gap-2"
              title="Gå till nästa sida"
            >
              <span className="text-sm font-medium">Nästa sida</span>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          {/* Previous page button when on last line and not first page */}
          {isOnLastLine() && hasPreviousPage() && (
            <button
              onClick={goToPreviousPageFromFocus}
              className="fixed bottom-6 left-6 z-40 bg-gray-600 bg-opacity-90 text-white px-6 py-3 rounded-lg hover:bg-opacity-100 transition-all shadow-lg flex items-center gap-2"
              title="Gå till föregående sida"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="text-sm font-medium">Föregående sida</span>
            </button>
          )}

          {/* Questions popup overlay */}
          {showFocusQuestionsPopup && (
            <div 
              className="focus-questions-popup-overlay fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
              onClick={() => setShowFocusQuestionsPopup(false)}
            >
              <div 
                className="focus-questions-popup-container bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                style={{ fontFamily: "var(--focus-font-family)" }}
              >
                <div className="focus-questions-popup-content p-6">
                  <div className="focus-questions-popup-header flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Frågor</h3>
                    <button
                      onClick={() => setShowFocusQuestionsPopup(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Stäng"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="focus-questions-sections-wrapper space-y-6">
                    {/* General questions */}
                    {lesson.questions && lesson.questions.length > 0 && (
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-3">Allmänna frågor</h4>
                        <div className="space-y-4">
                          {lesson.questions.map((question, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <p 
                                className="text-gray-800 mb-3"
                                style={{ fontFamily: "var(--focus-font-family)" }}
                              >
                                {question.question}
                              </p>
                              {question.type === 'multiple_choice' && question.options ? (
                                <div className="space-y-2">
                                  {question.options.map((option, optionIndex) => (
                                    <label key={optionIndex} className="flex items-center">
                                      <input
                                        type="radio"
                                        name={`general-q-${index}`}
                                        value={option}
                                        checked={generalAnswers[index] === option}
                                        onChange={(e) => setGeneralAnswers(prev => ({ ...prev, [index]: e.target.value }))}
                                        className="mr-2"
                                      />
                                      <span 
                                        className="text-gray-700"
                                        style={{ fontFamily: "var(--focus-font-family)" }}
                                      >
                                        {option}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <textarea
                                  value={generalAnswers[index] || ''}
                                  onChange={(e) => setGeneralAnswers(prev => ({ ...prev, [index]: e.target.value }))}
                                  className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  rows={3}
                                  placeholder="Skriv ditt svar här..."
                                  style={{ fontFamily: "var(--focus-font-family)" }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Page-specific questions */}
                    {lesson.pages?.[currentPage]?.questions && lesson.pages[currentPage].questions!.length > 0 && (
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-3">Frågor för denna sida</h4>
                        <div className="space-y-4">
                          {lesson.pages[currentPage].questions!.map((question, index) => {
                            const generalQuestionsCount = lesson?.questions?.length || 0;
                            const previousPagesQuestionsCount = lesson?.pages?.slice(0, currentPage).reduce((sum, page) => sum + (page.questions?.length || 0), 0) || 0;
                            const questionIndex = generalQuestionsCount + previousPagesQuestionsCount + index;
                            
                            return (
                              <div key={index} className="border rounded-lg p-4">
                                <p 
                                  className="text-gray-800 mb-3"
                                  style={{ fontFamily: "var(--focus-font-family)" }}
                                >
                                  {question.question}
                                </p>
                                {question.type === 'multiple_choice' && question.options ? (
                                  <div className="space-y-2">
                                    {question.options.map((option, optionIndex) => (
                                      <label key={optionIndex} className="flex items-center">
                                        <input
                                          type="radio"
                                          name={`page-q-${index}`}
                                          value={option}
                                          checked={questionsPanel12Answers[questionIndex] === option}
                                          onChange={(e) => setQuestionsPanel12Answers(prev => ({ ...prev, [questionIndex]: e.target.value }))}
                                          className="mr-2"
                                        />
                                        <span 
                                          className="text-gray-700"
                                          style={{ fontFamily: "var(--focus-font-family)" }}
                                        >
                                          {option}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                ) : (
                                  <textarea
                                    value={questionsPanel12Answers[questionIndex] || ''}
                                    onChange={(e) => setQuestionsPanel12Answers(prev => ({ ...prev, [questionIndex]: e.target.value }))}
                                    className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={3}
                                    placeholder="Skriv ditt svar här..."
                                    style={{ fontFamily: "var(--focus-font-family)" }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}