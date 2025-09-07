import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  BookOpen,
  Clock,
  ArrowLeft,
  User,
  Target,
  ChevronLeft,
  ChevronRight,
  Eye,
  Settings,
} from "lucide-react";
import type { ReadingLesson, WordDefinition } from "@shared/schema";

interface HoveredWord {
  word: string;
  definition: string;
  x: number;
  y: number;
}

export default function ReadingLessonViewer() {
  const { id } = useParams<{ id: string }>();
  const [currentPage, setCurrentPage] = useState(0);
  const [readingAnswers, setReadingAnswers] = useState<
    Record<number, Record<number, string>>
  >({});
  const [generalAnswers, setGeneralAnswers] = useState<Record<number, string>>(
    {},
  );
  const [hoveredWord, setHoveredWord] = useState<HoveredWord | null>(null);
  const [showQuestions, setShowQuestions] = useState(true);

  // New questions panel state with unique names
  const [questionsPanel12Answers, setQuestionsPanel12Answers] = useState<
    Record<number, string>
  >({});
  const [showQuestionsPanel12, setShowQuestionsPanel12] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Accessibility settings state
  const [accessibilitySettings, setAccessibilitySettings] = useState({
    fontSize: 30,
    lineHeight: 1.5,
    backgroundColor: "black-on-white" as const,
    fontFamily: "standard" as const,
  });

  // Accessibility colors are now handled via CSS variables

  // Reading Focus Mode states - using "readingFocus" prefix to avoid conflicts
  const [readingFocusMode, setReadingFocusMode] = useState(false);
  const [readingFocusLines, setReadingFocusLines] = useState(1); // 1, 3, or 5 lines
  const [currentReadingLine, setCurrentReadingLine] = useState(0);

  // New DOM-based reading focus states
  const contentRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const [lineRects, setLineRects] = useState<DOMRect[]>([]);

  // DOM measurement functions from ChatGPT's solution

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

    // normalisera till container koordinater
    const cont = containerEl.getBoundingClientRect();
    const normalized = rects
      .filter((r) => r.height > 0 && r.width > 0)
      .sort((a, b) => a.top - b.top)
      .map(
        (r) =>
          new DOMRect(
            r.left - cont.left,   // ⬅️ ingen scrollLeft här
            r.top - cont.top,     // ⬅️ ingen scrollTop här
            r.width,
            r.height
          )
      );

    // slå ihop delar som ligger på samma rad
    const merged: DOMRect[] = [];
    for (const r of normalized) {
      const last = merged[merged.length - 1];
      if (last && Math.abs(last.top - r.top) < 0.5) {
        const left = Math.min(last.left, r.left);
        const right = Math.max(last.left + last.width, r.left + r.width);
        merged[merged.length - 1] = new DOMRect(left, last.top, right - left, Math.max(last.height, r.height));
      } else {
        merged.push(r);
      }
    }
    return merged;
  }

  const {
    data: lesson,
    isLoading,
    error,
  } = useQuery<ReadingLesson>({
    queryKey: [`/api/reading-lessons/${id}`],
    enabled: !!id,
  });

  // Accessibility colors are handled in the main useEffect below

  // Update accessibility settings in CSS variables
  useEffect(() => {
    const bgColorMap = {
      "black-on-white": { bg: "#FFFFFF", text: "#000000" },
      "light-gray-on-gray": { bg: "#595959", text: "#D9D9D9" },
      "white-on-black": { bg: "#000000", text: "#FFFFFF" },
      "black-on-light-yellow": { bg: "#FFFFCC", text: "#000000" },
      "black-on-light-blue": { bg: "#CCFFFF", text: "#000000" },
      "light-yellow-on-blue": { bg: "#003399", text: "#FFFFCC" },
      "black-on-light-red": { bg: "#FFCCCC", text: "#000000" },
    };

    const colors = bgColorMap[accessibilitySettings.backgroundColor];

    const root = document.documentElement;
    root.style.setProperty("--accessibility-bg-color", colors.bg);
    root.style.setProperty("--accessibility-text-color", colors.text);
    
    // failsafe: om lika, invertera texten
    const cs = getComputedStyle(root);
    const bg = cs.getPropertyValue("--accessibility-bg-color").trim().toLowerCase();
    const tx = cs.getPropertyValue("--accessibility-text-color").trim().toLowerCase();
    if (bg && tx && bg === tx) {
      root.style.setProperty("--accessibility-text-color", bg === "#000000" ? "#ffffff" : "#000000");
    }

    // Update font size, line height, and font family CSS variables
    root.style.setProperty(
      "--accessibility-font-size",
      `${accessibilitySettings.fontSize}px`,
    );
    root.style.setProperty(
      "--accessibility-line-height",
      accessibilitySettings.lineHeight.toString(),
    );
    root.style.setProperty(
      "--reading-font-size",
      `${accessibilitySettings.fontSize}px`,
    );
    root.style.setProperty(
      "--reading-line-height",
      accessibilitySettings.lineHeight.toString(),
    );

    // Update font family
    const fontFamily =
      (accessibilitySettings.fontFamily as string) === "dyslexia-friendly"
        ? '"OpenDyslexic", "Comic Sans MS", cursive, sans-serif'
        : "system-ui, -apple-system, sans-serif";
    root.style.setProperty("--accessibility-font-family", fontFamily);
  }, [accessibilitySettings]);

  // DOM measurement effect - measure lines after render and when settings change
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
    accessibilitySettings.fontSize,
    accessibilitySettings.lineHeight,
    accessibilitySettings.fontFamily,
  ]);

  // Calculate focus rectangle (covers N lines)
  const focusRect = useMemo(() => {
    try {
      if (!lineRects.length) return null;

      const start = Math.min(currentReadingLine, Math.max(0, lineRects.length - 1));
      const end = Math.min(start + readingFocusLines - 1, lineRects.length - 1);

      const top = lineRects[start]?.top || 0;
      const bottom = (lineRects[end]?.top || 0) + (lineRects[end]?.height || 0);
      const height = bottom - top;

      if (!contentRef.current) return null;
      const width = contentRef.current.clientWidth; // bredden på fönstret där overlayn ligger

      return { top, height, left: 0, width };
    } catch (e) {
      console.warn("Error calculating focus rect:", e);
      return null;
    }
  }, [lineRects, currentReadingLine, readingFocusLines]);

  // Create interactive content with word definitions
  const processContentWithDefinitions = (
    content: string,
    definitions: WordDefinition[] = [],
  ) => {
    // Content is already HTML from RichTextEditor, don't convert markdown
    let processedContent = content;

    // a) Ta bort vanliga block som skapar vita fält
    processedContent = processedContent
      // horisontella linjer / editor-dividers
      .replace(/<hr[^>]*>/gi, "")
      .replace(/<div[^>]+role=["']separator["'][^>]*><\/div>/gi, "")
      .replace(/<div[^>]*class=["'][^"']*(?:divider|separator|ql-divider)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "")
      
      // inputs/knappar (ibland råkar sådant följa med)
      .replace(/<input[^>]*>/gi, "")
      .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, "")
      .replace(/<textarea[^>]*>[\s\S]*?<\/textarea>/gi, "");

    // b) Ta bort inline vita bakgrunder som satts via style=""
    processedContent = processedContent.replace(
      /\sstyle=(["'])(?:(?!\1).)*background[^;>]*?(?:#fff|#ffffff|white)[^>]*\1/gi,
      (m) => m.replace(/background[^;>]*;(?:\s*)?/gi, "")
    );

    if (!definitions.length) return processedContent;

    // Create a map of words to definitions for quick lookup
    const defMap = new Map(
      definitions.map((def) => [def.word.toLowerCase(), def.definition]),
    );

    // Process the HTML content to add tooltips to defined words
    definitions.forEach(({ word, definition }) => {
      // Create a regex that matches the word as a whole word (case insensitive)
      const regex = new RegExp(
        `\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b`,
        "gi",
      );

      // Replace with tooltip-wrapped version
      processedContent = processedContent.replace(
        regex,
        `<span class="defined-word" data-word="${word}" data-definition="${definition}">$1</span>`,
      );
    });

    return processedContent;
  };

  // Split content into pages based on page break markers or use lesson.pages if available
  const pages = useMemo(() => {
    // If lesson has pages data, use that (this supports per-page questions and images)
    if (lesson?.pages && lesson.pages.length > 0) {
      return lesson.pages.map((page) => page.content);
    }

    // Fallback: split content by page break markers
    if (!lesson?.content) return [];

    const pageBreakMarker = "--- SIDBRYTNING ---";
    const contentParts = lesson.content.split(pageBreakMarker);

    if (contentParts.length === 1) {
      // No page breaks, return single page
      return [contentParts[0]];
    }

    return contentParts.filter((part) => part.trim().length > 0);
  }, [lesson?.content, lesson?.pages]);

  // Handle mouse events for word definitions
  const handleContentMouseOver = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("defined-word")) {
      const word = target.getAttribute("data-word") || "";
      const definition = target.getAttribute("data-definition") || "";
      const rect = target.getBoundingClientRect();
      setHoveredWord({
        word,
        definition,
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
  };

  const handleContentMouseOut = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("defined-word")) {
      setHoveredWord(null);
    }
  };

  // Handle answer changes for reading questions
  const handleAnswerChange = (
    pageIndex: number,
    questionIndex: number,
    answer: string,
  ) => {
    setReadingAnswers((prev) => ({
      ...prev,
      [pageIndex]: {
        ...prev[pageIndex],
        [questionIndex]: answer,
      },
    }));
  };

  // Handle answer changes for general questions
  const handleGeneralAnswerChange = (questionIndex: number, answer: string) => {
    setGeneralAnswers((prev) => ({ ...prev, [questionIndex]: answer }));
  };

  // Handle answer changes for questions panel 12
  const handleQuestionsPanel12Change = (
    questionIndex: number,
    answer: string,
  ) => {
    setQuestionsPanel12Answers((prev) => ({
      ...prev,
      [questionIndex]: answer,
    }));
  };

  // Get all questions from lesson (both general and page-specific)
  const getAllQuestions = () => {
    const allQuestions: Array<{
      question: any;
      type: "general" | "page";
      pageIndex?: number;
      originalIndex: number;
      globalIndex: number;
    }> = [];

    // Add general questions
    if (lesson?.questions) {
      lesson.questions.forEach((question, index) => {
        allQuestions.push({
          question,
          type: "general",
          originalIndex: index,
          globalIndex: allQuestions.length,
        });
      });
    }

    // Add page-specific questions
    if (lesson?.pages) {
      lesson.pages.forEach((page, pageIndex) => {
        if (page.questions) {
          page.questions.forEach((question, questionIndex) => {
            allQuestions.push({
              question,
              type: "page",
              pageIndex,
              originalIndex: questionIndex,
              globalIndex: allQuestions.length,
            });
          });
        }
      });
    }

    return allQuestions;
  };

  const allQuestions = useMemo(() => getAllQuestions(), [lesson]);
  const totalQuestions = allQuestions.length;

  // Navigation functions for questions
  const goToPreviousQuestion = () => {
    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNextQuestion = () => {
    setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1));
  };

  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  // Get current question data
  const currentQuestionData = allQuestions[currentQuestionIndex];
  const currentAnswer = questionsPanel12Answers[currentQuestionIndex] || "";

  // Check if current question is answered (update reactively)
  const isCurrentQuestionAnswered = useMemo(() => {
    return currentAnswer.trim().length > 0;
  }, [currentAnswer]);

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    const answeredQuestions = Object.keys(questionsPanel12Answers).filter(
      (key) => questionsPanel12Answers[parseInt(key)]?.trim().length > 0,
    ).length;
    return (answeredQuestions / totalQuestions) * 100;
  }, [questionsPanel12Answers, totalQuestions]);

  // Keyboard navigation for reading focus mode
  useEffect(() => {
    if (!readingFocusMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowRight") {
        e.preventDefault();
        setCurrentReadingLine((prev) =>
          Math.min(prev + 1, Math.max(0, lineRects.length - readingFocusLines)),
        );
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        setCurrentReadingLine((prev) => Math.max(0, prev - 1));
      } else if (e.code === "Escape") {
        setReadingFocusMode(false);
      }
    };

    const handleScroll = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 0) {
        // Scroll down
        setCurrentReadingLine((prev) =>
          Math.min(prev + 1, Math.max(0, lineRects.length - readingFocusLines)),
        );
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
  }, [readingFocusMode, lineRects.length, readingFocusLines]);

  // Center focus window in container (smooth scroll)
  useEffect(() => {
    if (!readingFocusMode || !focusRect || !contentRef.current) return;
    const cont = contentRef.current;
    const targetScrollTop = Math.max(
      0,
      focusRect.top + focusRect.height / 2 - cont.clientHeight / 2,
    );
    cont.scrollTo({ top: targetScrollTop, behavior: "smooth" });
  }, [currentReadingLine, readingFocusMode, focusRect]);

  // Check if all questions for the current page are answered
  const areAllCurrentPageQuestionsAnswered = () => {
    const currentPageQuestions = lesson?.pages?.[currentPage]?.questions;
    if (!currentPageQuestions || currentPageQuestions.length === 0) return true;

    // Check page-specific questions in questionsPanel12Answers
    // Calculate unique index for each page question across all pages
    const generalQuestionsCount = lesson?.questions?.length || 0;
    const previousPagesQuestionsCount =
      lesson?.pages
        ?.slice(0, currentPage)
        .reduce((sum, page) => sum + (page.questions?.length || 0), 0) || 0;

    return currentPageQuestions.every((_, index) => {
      const questionIndex =
        generalQuestionsCount + previousPagesQuestionsCount + index;
      const answer = questionsPanel12Answers[questionIndex];
      return answer && answer.trim().length > 0;
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Laddar läsförståelseövning...</p>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">
            Läsförståelseövning hittades inte
          </h2>
          <p className="text-muted-foreground mb-4">
            Den begärda övningen kunde inte laddas eller existerar inte.
          </p>
          <Link href="/lasforstaelse">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka till läsförståelse
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <Link href="/lasforstaelse">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Tillbaka till läsförståelse
                  </Button>
                </Link>
              </div>
              <div></div>
            </div>
            <div className="mt-4">
              <CardTitle className="text-2xl">{lesson.title}</CardTitle>
              {lesson.description && (
                <CardDescription className="mt-2 text-base">
                  {lesson.description}
                </CardDescription>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {lesson.readingTime || 15} min läsning
              </div>
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                Årskurs {lesson.gradeLevel}
              </div>
              {lesson.subject && (
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  {lesson.subject}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pre-reading Questions */}
        {lesson.preReadingQuestions &&
          lesson.preReadingQuestions.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Innan du läser</CardTitle>
                <CardDescription>
                  Aktivera dina förkunskaper genom att fundera på dessa frågor
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lesson.preReadingQuestions.map((question, index) => (
                    <div key={index} className="p-3 bg-muted rounded-lg">
                      <p className="font-medium mb-1">{question.question}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Main Content */}
        <div className="grid grid-cols-1 md:landscape:grid-cols-6 lg:grid-cols-6 gap-6 lg:items-start mb-6">
          {/* New Questions Panel - One Question at a Time */}
          {showQuestionsPanel12 && lesson && totalQuestions > 0 && (
            <div className="order-1 lg:order-1 md:landscape:col-span-2 lg:col-span-2">
              <div
                className="border rounded-lg p-6"
                style={
                  {
                    backgroundColor: "var(--accessibility-bg-color)",
                    color: "var(--accessibility-text-color)",
                    borderColor: "var(--accessibility-text-color)",
                    borderWidth: "0.5px",
                    maxWidth: "720px",
                  } as React.CSSProperties
                }
              >
                <h3 className="text-lg font-semibold mb-4">Frågor</h3>

                {/* Progress indicator */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">
                      Fråga {currentQuestionIndex + 1} av {totalQuestions}
                    </p>
                    {isCurrentQuestionAnswered && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ Besvarad
                      </span>
                    )}
                  </div>
                  <div
                    className="w-full bg-gray-200 rounded-full h-2"
                    style={{
                      backgroundColor: "var(--accessibility-text-color)",
                      opacity: 0.2,
                    }}
                  >
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${progressPercentage}%`,
                        backgroundColor: "var(--accessibility-text-color)",
                        opacity: 0.8,
                      }}
                    />
                  </div>
                </div>

                {/* Current question */}
                {currentQuestionData && (
                  <div className="space-y-4">
                    <label className="block text-lg font-medium leading-relaxed">
                      {currentQuestionData.question.question}
                    </label>

                    {/* Multiple choice questions */}
                    {(currentQuestionData.question.type === "multiple_choice" ||
                      currentQuestionData.question.type ===
                        "multiple-choice") &&
                      (currentQuestionData.question.alternatives ||
                        currentQuestionData.question.options) && (
                        <div className="space-y-3">
                          {(currentQuestionData.question.alternatives ||
                            currentQuestionData.question.options)!.map(
                            (option: string, optionIndex: number) => {
                              const optionValue = String.fromCharCode(
                                65 + optionIndex,
                              );
                              const isSelected = currentAnswer === optionValue;

                              return (
                                <label
                                  key={optionIndex}
                                  className="flex items-center gap-3 cursor-pointer"
                                >
                                  <input
                                    type="radio"
                                    name={`question-${currentQuestionIndex}`}
                                    value={optionValue}
                                    checked={isSelected}
                                    onChange={() =>
                                      handleQuestionsPanel12Change(
                                        currentQuestionIndex,
                                        optionValue,
                                      )
                                    }
                                    className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                    style={{
                                      accentColor:
                                        "var(--accessibility-text-color)",
                                    }}
                                  />
                                  <span className="flex-1 text-base">
                                    {option}
                                  </span>
                                </label>
                              );
                            },
                          )}
                        </div>
                      )}

                    {/* True/False questions */}
                    {(currentQuestionData.question.type === "true_false" ||
                      currentQuestionData.question.type === "true-false") && (
                      <div className="space-y-3">
                        {["Sant", "Falskt"].map((option) => {
                          const isSelected = currentAnswer === option;

                          return (
                            <label
                              key={option}
                              className="flex items-center gap-3 cursor-pointer"
                            >
                              <input
                                type="radio"
                                name={`question-${currentQuestionIndex}`}
                                value={option}
                                checked={isSelected}
                                onChange={() =>
                                  handleQuestionsPanel12Change(
                                    currentQuestionIndex,
                                    option,
                                  )
                                }
                                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                style={{
                                  accentColor:
                                    "var(--accessibility-text-color)",
                                }}
                              />
                              <span className="flex-1 text-base">{option}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Open-ended questions */}
                    {(currentQuestionData.question.type === "open_ended" ||
                      currentQuestionData.question.type === "open") && (
                      <div className="space-y-2">
                        <textarea
                          id={`question-${currentQuestionIndex}`}
                          value={currentAnswer}
                          onChange={(e) =>
                            handleQuestionsPanel12Change(
                              currentQuestionIndex,
                              e.target.value,
                            )
                          }
                          placeholder="Skriv ditt svar här..."
                          className="w-full min-h-[100px] p-4 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                          style={{
                            backgroundColor: "var(--accessibility-bg-color)",
                            color: "var(--accessibility-text-color)",
                            borderColor: "var(--accessibility-text-color)",
                            fontSize: "16px",
                            lineHeight: "1.5",
                          }}
                          rows={4}
                        />
                        {currentAnswer && (
                          <p className="text-sm text-gray-600">
                            {currentAnswer.length} tecken
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation buttons */}
                <div
                  className="flex items-center justify-between mt-8 pt-4 border-t"
                  style={{
                    borderColor: "var(--accessibility-text-color)",
                    borderTopWidth: "0.5px",
                  }}
                >
                  <button
                    onClick={goToPreviousQuestion}
                    disabled={isFirstQuestion}
                    className="unique-prev-question-btn"
                    style={{
                      background: "#ffffff !important",
                      color: "#000000 !important",
                      border: "1px solid #000000 !important",
                      padding: "10px 16px !important",
                      borderRadius: "8px !important",
                      cursor: isFirstQuestion ? "not-allowed" : "pointer",
                      fontSize: "14px !important",
                      fontWeight: "500 !important",
                      display: "flex !important",
                      alignItems: "center !important",
                      gap: "8px !important",
                      fontFamily: "system-ui, sans-serif !important",
                      opacity: "1 !important",
                      filter: "none !important",
                      boxShadow: "none !important",
                      outline: "none !important",
                      position: "relative",
                      zIndex: 999,
                    }}
                  >
                    <ChevronLeft style={{ width: "16px", height: "16px" }} />
                    Tillbaka
                  </button>

                  <button
                    onClick={
                      isLastQuestion
                        ? () =>
                            alert("Bra jobbat! Du har svarat på alla frågor.")
                        : goToNextQuestion
                    }
                    className="unique-next-question-btn"
                    style={{
                      background: "#ffffff !important",
                      color: "#000000 !important",
                      border: "1px solid #000000 !important",
                      padding: "10px 16px !important",
                      borderRadius: "8px !important",
                      cursor: "pointer",
                      fontSize: "14px !important",
                      fontWeight: "500 !important",
                      display: "flex !important",
                      alignItems: "center !important",
                      gap: "8px !important",
                      fontFamily: "system-ui, sans-serif !important",
                      opacity: "1 !important",
                      filter: "none !important",
                      boxShadow: "none !important",
                      outline: "none !important",
                      position: "relative",
                      zIndex: 999,
                    }}
                  >
                    {isLastQuestion ? "Skicka in" : "Nästa"}
                    <ChevronRight style={{ width: "16px", height: "16px" }} />
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Main Content - Left Column (takes 2/3 of space in normal mode, centered in focus mode) */}
          <Card
            className="reading-content mb-6 md:landscape:mb-0 lg:mb-0 md:landscape:col-span-4 lg:col-span-4"
            style={
              {
                backgroundColor: "var(--accessibility-bg-color)",
                color: "var(--accessibility-text-color)",
                borderColor: "var(--accessibility-text-color)",
                borderWidth: "0.5px",
                "--card-text-color": "var(--accessibility-text-color)",
              } as React.CSSProperties
            }
          >
            <CardHeader className="relative">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  <span>Läs texten</span>
                </CardTitle>
                <div className="flex gap-2">
                  {/* Focus Mode Toggle Button */}
                  <Button
                    variant={readingFocusMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setReadingFocusMode(!readingFocusMode)}
                    className={
                      readingFocusMode ? "bg-blue-600 hover:bg-blue-700" : ""
                    }
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    {readingFocusMode ? "Avsluta fokus" : "Fokusläge"}
                  </Button>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4 mr-1" />
                        Inställningar
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4" align="end">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">
                            Textstorlek
                          </Label>
                          <Slider
                            value={[accessibilitySettings.fontSize]}
                            onValueChange={(value) =>
                              setAccessibilitySettings((prev) => ({
                                ...prev,
                                fontSize: value[0],
                              }))
                            }
                            min={16}
                            max={60}
                            step={2}
                            className="mt-2"
                          />
                          <div className="text-xs text-muted-foreground mt-1">
                            {accessibilitySettings.fontSize}px
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">
                            Radavstånd
                          </Label>
                          <Slider
                            value={[accessibilitySettings.lineHeight]}
                            onValueChange={(value) =>
                              setAccessibilitySettings((prev) => ({
                                ...prev,
                                lineHeight: value[0],
                              }))
                            }
                            min={1.0}
                            max={3.0}
                            step={0.1}
                            className="mt-2"
                          />
                          <div className="text-xs text-muted-foreground mt-1">
                            {accessibilitySettings.lineHeight.toFixed(1)}
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">
                            Bakgrundsfärg
                          </Label>
                          <Select
                            value={accessibilitySettings.backgroundColor}
                            onValueChange={(value) =>
                              setAccessibilitySettings((prev) => ({
                                ...prev,
                                backgroundColor: value as any,
                              }))
                            }
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="black-on-white">
                                Svart på vitt
                              </SelectItem>
                              <SelectItem value="light-gray-on-gray">
                                Ljusgrå på grå
                              </SelectItem>
                              <SelectItem value="white-on-black">
                                Vit på svart
                              </SelectItem>
                              <SelectItem value="black-on-light-yellow">
                                Svart på ljusgul
                              </SelectItem>
                              <SelectItem value="black-on-light-blue">
                                Svart på ljusblå
                              </SelectItem>
                              <SelectItem value="light-yellow-on-blue">
                                Ljusgul på blå
                              </SelectItem>
                              <SelectItem value="black-on-light-red">
                                Svart på ljusröd
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">
                            Teckensnitt
                          </Label>
                          <Select
                            value={accessibilitySettings.fontFamily}
                            onValueChange={(value) =>
                              setAccessibilitySettings((prev) => ({
                                ...prev,
                                fontFamily: value as any,
                              }))
                            }
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="standard">Standard</SelectItem>
                              <SelectItem value="dyslexia-friendly">
                                Dyslexi-vänligt
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="border-t pt-4">
                          <Label className="text-sm font-medium">
                            Läsfokus
                          </Label>
                          <div className="space-y-3 mt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Aktivera läsfokus</span>
                              <button
                                onClick={() =>
                                  setReadingFocusMode(!readingFocusMode)
                                }
                                className={`w-12 h-6 rounded-full transition-colors ${
                                  readingFocusMode
                                    ? "bg-blue-600"
                                    : "bg-gray-300"
                                }`}
                              >
                                <div
                                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                                    readingFocusMode
                                      ? "translate-x-6"
                                      : "translate-x-0.5"
                                  }`}
                                />
                              </button>
                            </div>

                            {readingFocusMode && (
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Antal rader samtidigt
                                </Label>
                                <Select
                                  value={readingFocusLines.toString()}
                                  onValueChange={(value) =>
                                    setReadingFocusLines(parseInt(value))
                                  }
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">1 rad</SelectItem>
                                    <SelectItem value="3">3 rader</SelectItem>
                                    <SelectItem value="5">5 rader</SelectItem>
                                  </SelectContent>
                                </Select>
                                <div className="text-xs text-muted-foreground mt-2">
                                  💡 Använd Space/pilar eller scrolla för att
                                  navigera
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              {lesson.wordDefinitions && lesson.wordDefinitions.length > 0 && (
                <CardDescription>
                  💡 Ord med prickad understrykning har förklaringar - håll
                  musen över dem
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-6">
                {/* Bilder ovanför texten för denna sida */}
                {lesson.pages &&
                  lesson.pages[currentPage]?.imagesAbove &&
                  lesson.pages[currentPage]?.imagesAbove!.length > 0 && (
                    <div className="space-y-4">
                      {lesson.pages[currentPage]?.imagesAbove!.map(
                        (imageUrl, index) => (
                          <img
                            key={index}
                            src={imageUrl}
                            alt={`Bild ovanför texten ${index + 1}`}
                            className="w-full max-w-3xl h-auto rounded-lg mx-auto"
                          />
                        ),
                      )}
                    </div>
                  )}

                <div
                  ref={contentRef}
                  className="max-w-none min-h-[400px] reading-content accessibility-enhanced relative overflow-auto"
                  style={{
                    fontSize: `${accessibilitySettings.fontSize}px`,
                    lineHeight: `${accessibilitySettings.lineHeight}`,
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                    backgroundColor: "var(--accessibility-bg-color)",
                    color: "var(--accessibility-text-color)",
                    display: "flow-root", // 💡 bryt margin-collapsing från första barnet
                    fontFamily:
                      (accessibilitySettings.fontFamily as string) ===
                      "dyslexia-friendly"
                        ? '"OpenDyslexic", "Comic Sans MS", cursive, sans-serif'
                        : "inherit",
                  }}
                  onMouseOver={handleContentMouseOver}
                  onMouseOut={handleContentMouseOut}
                >
                  <style>{`
                    .reading-content {
                      background-color: var(--accessibility-bg-color) !important;
                    }

                    /* döda ALL egen bakgrund i innehållet – men INTE spotlight-masken */
                    .reading-content *:not(.reading-spotlight-mask),
                    .reading-content *:not(.reading-spotlight-mask)::before,
                    .reading-content *:not(.reading-spotlight-mask)::after {
                      background: transparent !important;
                      background-color: transparent !important;
                      box-shadow: none !important;
                      text-shadow: none !important;
                      mix-blend-mode: normal !important;
                      opacity: 1 !important;
                    }

                    /* färg/kant */
                    .reading-content * {
                      border-color: var(--accessibility-text-color) !important;
                      color: var(--accessibility-text-color) !important;
                      -webkit-text-fill-color: var(--accessibility-text-color) !important;
                    }

                    /* ta bort dividers */
                    .reading-content hr,
                    .reading-content [role="separator"],
                    .reading-content .ql-divider,
                    .reading-content .divider {
                      display: none !important;
                    }
                  `}</style>

                  {/* TEXT-WRAPPER med textRef för exakt DOM-mätning */}
                  <div
                    ref={textRef}
                    style={{
                      position: "relative",
                      zIndex: 10,
                      mixBlendMode: "normal",
                      paddingTop: 1, // extra säkerhet mot margin-collaps
                    }}
                    dangerouslySetInnerHTML={{
                      __html: processContentWithDefinitions(
                        pages[currentPage] || "",
                        lesson.wordDefinitions,
                      ),
                    }}
                  />

                  {readingFocusMode && focusRect && (
                    <>
                      {/* toppgardin */}
                      <div
                        className="reading-spotlight-mask pointer-events-none absolute z-30"
                        style={{ top: 0, left: 0, right: 0, height: `${focusRect.top}px`,
                                 background: "rgba(0,0,0,0.85)" }}
                      />
                      {/* botten */}
                      <div
                        className="reading-spotlight-mask pointer-events-none absolute z-30"
                        style={{ top: `${focusRect.top + focusRect.height}px`, left: 0, right: 0, bottom: 0,
                                 background: "rgba(0,0,0,0.85)" }}
                      />
                      {/* vänster */}
                      <div
                        className="reading-spotlight-mask pointer-events-none absolute z-30"
                        style={{ top: `${focusRect.top}px`, left: 0, width: `${focusRect.left}px`,
                                 height: `${focusRect.height}px`, background: "rgba(0,0,0,0.85)" }}
                      />
                      {/* höger */}
                      <div
                        className="reading-spotlight-mask pointer-events-none absolute z-30"
                        style={{ top: `${focusRect.top}px`,
                                 left: `${focusRect.left + focusRect.width}px`, right: 0,
                                 height: `${focusRect.height}px`, background: "rgba(0,0,0,0.85)" }}
                      />
                      {/* bara en ram runt fokusfönstret */}
                      <div
                        className="pointer-events-none absolute z-30"
                        style={{
                          top: `${focusRect.top}px`,
                          left: `${focusRect.left}px`,
                          width: `${focusRect.width}px`,
                          height: `${focusRect.height}px`,
                          border: "2px solid var(--accessibility-text-color)",
                          borderRadius: "4px"
                        }}
                      />
                    </>
                  )}
                </div>

                {/* Reading focus UI when active */}
                {readingFocusMode && (
                  <>
                    {/* Progress indicator at bottom */}
                    <div
                      className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40 px-4 py-2 rounded-lg"
                      style={{
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        color: "white",
                      }}
                    >
                      <div className="text-sm text-center">
                        Rad {currentReadingLine + 1} av {lineRects.length}
                      </div>
                      <div className="w-32 bg-gray-600 rounded-full h-1 mt-2">
                        <div
                          className="h-1 bg-white rounded-full transition-all duration-300"
                          style={{
                            width: `${lineRects.length > 0 ? ((currentReadingLine + 1) / lineRects.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => setReadingFocusMode(false)}
                      className="fixed top-4 right-4 z-40 bg-black bg-opacity-60 text-white p-3 rounded-full hover:bg-opacity-80 transition-all"
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
                  </>
                )}

                {/* Bilder under texten för denna sida */}
                {lesson.pages &&
                  lesson.pages[currentPage]?.imagesBelow &&
                  lesson.pages[currentPage]?.imagesBelow!.length > 0 && (
                    <div className="space-y-4">
                      {lesson.pages[currentPage]?.imagesBelow!.map(
                        (imageUrl, index) => (
                          <img
                            key={index}
                            src={imageUrl}
                            alt={`Bild under texten ${index + 1}`}
                            className="w-full max-w-3xl h-auto rounded-lg mx-auto"
                          />
                        ),
                      )}
                    </div>
                  )}
              </div>

              {/* Page Navigation - Only buttons inside Card */}
              {pages.length > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  {/* Föregående sida-knapp - visas bara om det inte är första sidan */}
                  {currentPage > 0 ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        setCurrentPage(Math.max(0, currentPage - 1))
                      }
                      className="flex items-center gap-2 navigation-button
                                   bg-white text-black border-black
                                   hover:bg-white hover:text-black hover:border-black
                                   focus-visible:ring-0 focus-visible:outline-none
                                   shadow-none hover:shadow-none active:shadow-none"
                      style={{
                        backgroundColor: "#FFFFFF",
                        color: "#000000",
                        borderColor: "#000000",
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Föregående sida
                    </Button>
                  ) : (
                    <div className="w-32"></div>
                  )}

                  {/* Page counter - centered between buttons */}
                  <div
                    className="navigation-page-counter flex items-center justify-center h-10 px-2 py-1 rounded-md text-xs font-medium"
                    style={{
                      backgroundColor: "#FFFFFF !important",
                      color: "#000000 !important",
                      border: "1px solid #000000 !important",
                      fontFamily:
                        "system-ui, -apple-system, sans-serif !important",
                      textAlign: "center",
                      width: "auto",
                      minWidth: "60px",
                      maxWidth: "80px",
                    }}
                  >
                    Sida {currentPage + 1} av {pages.length}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => {
                      if (currentPage === pages.length - 1) {
                        // På sista sidan - lämna in
                        alert(
                          "Bra jobbat! Du har läst hela texten och svarat på frågorna.",
                        );
                      } else {
                        // Inte sista sidan - gå till nästa sida
                        setCurrentPage(
                          Math.min(pages.length - 1, currentPage + 1),
                        );
                      }
                    }}
                    disabled={!areAllCurrentPageQuestionsAnswered()}
                    className="flex items-center gap-2 navigation-button
                                 bg-white text-black border-black
                                 hover:bg-white hover:text-black hover:border-black
                                 focus-visible:ring-0 focus-visible:outline-none
                                 shadow-none hover:shadow-none active:shadow-none"
                    style={{
                      backgroundColor: "#FFFFFF",
                      color: "#000000",
                      borderColor: "#000000",
                    }}
                    title={
                      !areAllCurrentPageQuestionsAnswered()
                        ? "Svara på alla frågor innan du går vidare"
                        : ""
                    }
                  >
                    {currentPage === pages.length - 1
                      ? "Lämna in"
                      : "Nästa sida"}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Custom tooltip */}
              {hoveredWord && (
                <div
                  className="fixed z-50 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg max-w-xs pointer-events-none"
                  style={{
                    left: `${hoveredWord.x}px`,
                    top: `${hoveredWord.y}px`,
                    transform: "translate(-50%, -100%)",
                  }}
                >
                  <div className="font-semibold">{hoveredWord.word}</div>
                  <div className="text-gray-200">{hoveredWord.definition}</div>
                  {/* Arrow pointing down */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Word Definitions */}
        {lesson.wordDefinitions && lesson.wordDefinitions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ordförklaringar</CardTitle>
              <CardDescription>
                Svåra ord från texten förklarade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {lesson.wordDefinitions.map((definition, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-primary">
                      {definition.word}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {definition.definition}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
