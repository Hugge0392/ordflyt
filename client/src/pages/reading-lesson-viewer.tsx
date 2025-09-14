import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, ArrowLeft, User, Target } from "lucide-react";
import type { ReadingLesson, WordDefinition, RichPage, LegacyPage } from "@shared/schema";
import NormalMode from "@/components/NormalMode";
import FocusMode from "@/components/FocusMode";
import { COLOR_SCHEMES, FONT_FAMILY_CSS } from "@/lib/accessibility-constants";
import { RichDocRenderer } from "@/components/rich-editor";
import { isLegacyContent, migrateLegacyPage, richDocToHtml, richDocToText, blocksToRichDoc } from "@/lib/content-converter";
import type { Block } from "@/components/blocks/types";

interface HoveredWord {
  word: string;
  definition: string;
  x: number;
  y: number;
}

export default function ReadingLessonViewer() {
  const { id } = useParams<{ id: string }>();
  const [currentPage, setCurrentPage] = useState(0);
  const [readingAnswers, setReadingAnswers] = useState<Record<number, Record<number, string>>>({});
  const [generalAnswers, setGeneralAnswers] = useState<Record<number, string>>({});
  const [hoveredWord, setHoveredWord] = useState<HoveredWord | null>(null);
  const [showQuestions, setShowQuestions] = useState(true);

  // Questions panel state
  const [questionsPanel12Answers, setQuestionsPanel12Answers] = useState<Record<number, string>>({});
  const [showQuestionsPanel12, setShowQuestionsPanel12] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Reader settings type
  type ReaderSettings = {
    fontSize: number;
    lineHeight: number;
    backgroundColor: "black-on-white" | "light-gray-on-gray" | "white-on-black" | "black-on-light-yellow" | "black-on-light-blue" | "light-yellow-on-blue" | "black-on-light-red";
    fontFamily: "standard" | "dyslexia-friendly";
  };

  // Normal mode settings
  const [normalSettings, setNormalSettings] = useState<ReaderSettings>(() => {
    try {
      const saved = localStorage.getItem("reading-normal-settings");
      return saved ? JSON.parse(saved) : { fontSize: 22, lineHeight: 1.5, backgroundColor: "black-on-white", fontFamily: "standard" };
    } catch {
      return { fontSize: 22, lineHeight: 1.5, backgroundColor: "black-on-white", fontFamily: "standard" };
    }
  });

  // Focus mode settings
  const [focusSettings, setFocusSettings] = useState<ReaderSettings>(() => {
    try {
      const saved = localStorage.getItem("reading-focus-settings");
      return saved ? JSON.parse(saved) : { fontSize: 32, lineHeight: 1.5, backgroundColor: "black-on-white", fontFamily: "standard" };
    } catch {
      return { fontSize: 32, lineHeight: 1.5, backgroundColor: "black-on-white", fontFamily: "standard" };
    }
  });

  // Reading Focus Mode states
  const [readingFocusMode, setReadingFocusMode] = useState(false);
  const [focusAnimationState, setFocusAnimationState] = useState<'inactive' | 'entering' | 'active' | 'exiting'>('inactive');
  const [readingFocusLines, setReadingFocusLines] = useState(1);
  const [currentReadingLine, setCurrentReadingLine] = useState(0);

  // Focus mode questions popup states
  const [showFocusQuestionsPopup, setShowFocusQuestionsPopup] = useState(false);

  // Active settings based on current mode
  const activeSettings = readingFocusMode ? focusSettings : normalSettings;
  const setActiveSettings = readingFocusMode ? setFocusSettings : setNormalSettings;

  // Fetch lesson data
  const { data: lesson, isLoading, error } = useQuery<ReadingLesson>({
    queryKey: [`/api/reading-lessons/${id}`],
    enabled: !!id,
  });

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem("reading-normal-settings", JSON.stringify(normalSettings));
  }, [normalSettings]);

  useEffect(() => {
    localStorage.setItem("reading-focus-settings", JSON.stringify(focusSettings));
  }, [focusSettings]);

  // Listen for page change events from NormalMode component
  useEffect(() => {
    const handlePageChange = (e: CustomEvent) => {
      if (typeof e.detail === 'number') {
        setCurrentPage(e.detail);
      }
    };
    
    window.addEventListener('changePage', handlePageChange as EventListener);
    return () => window.removeEventListener('changePage', handlePageChange as EventListener);
  }, []);

  // CSS variables for accessibility
  useEffect(() => {
    const root = document.documentElement;
    const settings = activeSettings;

    // Set color scheme using shared constants
    const colors = COLOR_SCHEMES[settings.backgroundColor] || COLOR_SCHEMES["black-on-white"];
    root.style.setProperty("--accessibility-bg-color", colors.bg);
    root.style.setProperty("--accessibility-text-color", colors.text);

    // Set font size and line height
    root.style.setProperty("--accessibility-font-size", `${settings.fontSize}px`);
    root.style.setProperty("--accessibility-line-height", settings.lineHeight.toString());

    // Set font family using shared constants
    const fontFamily = FONT_FAMILY_CSS[settings.fontFamily] || FONT_FAMILY_CSS["standard"];
    root.style.setProperty("--accessibility-font-family", fontFamily);
    
    if (readingFocusMode) {
      root.style.setProperty("--focus-font-family", fontFamily);
    } else {
      root.style.setProperty("--normal-font-family", fontFamily);
    }
  }, [activeSettings, readingFocusMode]);

  // Handle word hover for definitions
  const handleContentMouseOver = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("defined-word")) {
      const word = target.getAttribute("data-word");
      const definition = target.getAttribute("data-definition");
      if (word && definition) {
        const rect = target.getBoundingClientRect();
        setHoveredWord({
          word,
          definition,
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
        });
      }
    }
  };

  const handleContentMouseOut = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("defined-word")) {
      setHoveredWord(null);
    }
  };

  // Create interactive content with word definitions
  const processContentWithDefinitions = (content: string, definitions: WordDefinition[] = []) => {
    let processedContent = content;

    // Clean up content
    processedContent = processedContent
      .replace(/<hr[^>]*>/gi, "")
      .replace(/<div[^>]+role=["']separator["'][^>]*><\/div>/gi, "")
      .replace(/<div[^>]*class=["'][^"']*(?:divider|separator|ql-divider)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "")
      .replace(/<input[^>]*>/gi, "")
      .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, "")
      .replace(/<textarea[^>]*>[\s\S]*?<\/textarea>/gi, "");

    // Remove inline styles
    processedContent = processedContent.replace(
      /\sstyle=(["'])(?:(?!\1).)*(background(?:-color)?\s*:\s*(?:#fff(?:fff)?|white|rgb\s*\(\s*255\s*,\s*255\s*,\s*255\s*\))(?:[^;>]*)?);?(?:(?!\1).)*\1/gi,
      (m) => m.replace(/background(?:-color)?\s*:[^;>]+;?/gi, "")
    );

    processedContent = processedContent.replace(
      /\sstyle=(["'])(?:(?!\1).)*\1/gi,
      (m) =>
        m
          .replace(/font-size\s*:\s*[^;>]+;?/gi, "")
          .replace(/line-height\s*:\s*[^;>]+;?/gi, "")
          .replace(/\sstyle=(["'])\s*\1/gi, "")
    );

    if (!definitions.length) return processedContent;

    // Add word definitions
    definitions.forEach(({ word, definition }) => {
      const regex = new RegExp(
        `\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b`,
        "gi",
      );
      processedContent = processedContent.replace(
        regex,
        `<span class="defined-word" data-word="${word}" data-definition="${definition}">$1</span>`,
      );
    });

    return processedContent;
  };
  
  // Process rich doc with definitions (new approach for rich content)
  const processRichDocWithDefinitions = (richDoc: any, definitions: WordDefinition[] = []) => {
    if (!definitions.length) return richDoc;
    
    // For rich docs, we'll handle word definitions through CSS classes
    // This is a simplified approach - in production you might want to
    // traverse the doc tree and add marks to specific text nodes
    return richDoc;
  };

  // Normalize all page formats to RichPage for consistent rendering
  const pages = useMemo(() => {
    if (!lesson) return [];
    
    // Handle block pages first (newest format with separate TextBlock and ImageBlock components)
    if (lesson.blockPages && lesson.blockPages.length > 0) {
      // Normalize to RichPage format for compatibility with RichDocRenderer
      return (lesson.blockPages as any[]).map(p => {
        // If page has blocks array, convert to RichDoc format
        if (p.blocks && Array.isArray(p.blocks)) {
          const richDoc = blocksToRichDoc(p.blocks as Block[]);
          return {
            ...p,
            doc: richDoc
          } as RichPage;
        }
        // If page already has doc property, use as-is
        if (p.doc) {
          return p as RichPage;
        }
        // If page has legacy content, migrate it
        if (p.content) {
          return migrateLegacyPage(p) as RichPage;
        }
        // Default to empty doc
        return {
          ...p,
          doc: { type: 'doc', content: [{ type: 'paragraph', content: [] }] }
        } as RichPage;
      });
    }
    
    // Handle rich pages (new format)
    if (lesson.richPages && lesson.richPages.length > 0) {
      return lesson.richPages;
    }
    
    // Handle pages array (mixed format)
    if (lesson.pages && lesson.pages.length > 0) {
      return lesson.pages.map(page => {
        // Check if it's already a rich page
        if ('doc' in page) {
          return page as RichPage;
        }
        // Convert legacy page to rich format
        return migrateLegacyPage(page as LegacyPage) as RichPage;
      });
    }
    
    // Fallback to legacy content field
    if (lesson.content) {
      const contentPages = lesson.content.split('<!-- PAGE_BREAK -->').map(page => page.trim());
      return contentPages.map((content, index) => 
        migrateLegacyPage({
          id: `page-${index}`,
          content
        } as LegacyPage) as RichPage
      );
    }
    
    return [];
  }, [lesson]);
  
  // Helper function to get content for TTS and text-based functionality
  const getPageContentForDefinitions = (page: RichPage | LegacyPage) => {
    if ('doc' in page) {
      // Extract plain text from rich doc for TTS and other text-based functionality
      return richDocToText(page.doc);
    }
    return (page as LegacyPage).content?.replace(/<[^>]+>/g, '') || '';
  };
  
  // Check if we have rich pages
  const isRichContent = pages.length > 0 && 'doc' in pages[0];

  // Handle answer changes
  const handleAnswerChange = (pageIndex: number, questionIndex: number, answer: string) => {
    setReadingAnswers((prev) => ({
      ...prev,
      [pageIndex]: {
        ...prev[pageIndex],
        [questionIndex]: answer,
      },
    }));
  };

  const handleGeneralAnswerChange = (questionIndex: number, answer: string) => {
    setGeneralAnswers((prev) => ({ ...prev, [questionIndex]: answer }));
  };

  const handleQuestionsPanel12Change = (questionIndex: number, answer: string) => {
    setQuestionsPanel12Answers((prev) => ({
      ...prev,
      [questionIndex]: answer,
    }));
  };

  // Type guards for different page types and question handling
  const isRichPage = (p: any): p is RichPage => !!p && 'doc' in p;
  const hasPageQuestions = (p: any): p is { questions: any[] } => !!p && Array.isArray(p.questions);

  // Get all questions for the questions panel
  const getAllQuestions = () => {
    const allQuestions: Array<{
      question: any;
      type: "general" | "page";
      pageIndex?: number;
      originalIndex: number;
      globalIndex: number;
    }> = [];

    // Add general questions (lesson-level questions)
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

    // Add page-specific questions only for legacy format
    // Skip if using blockPages or richPages (new formats with lesson-level questions only)
    if (!lesson?.blockPages?.length && !lesson?.richPages?.length && lesson?.pages) {
      lesson.pages.forEach((page, pageIndex) => {
        if (hasPageQuestions(page)) {
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

  // Navigation functions
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

  // Check if current question is answered
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

  // Focus mode helper functions
  const getTotalQuestionsCount = () => {
    if (!lesson) return 0;
    let count = 0;
    if (lesson.questions && lesson.questions.length > 0) {
      count += lesson.questions.length;
    }
    
    // Only count page-specific questions for legacy format
    if (!lesson?.blockPages?.length && !lesson?.richPages?.length && lesson.pages?.[currentPage]) {
      const currentPageData = lesson.pages[currentPage];
      if (hasPageQuestions(currentPageData)) {
        count += currentPageData.questions.length;
      }
    }
    
    return count;
  };

  const getShowFocusQuestionsButton = () => {
    try {
      const saved = localStorage.getItem('accessibility-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        return settings.showFocusQuestionsButton !== false;
      }
    } catch (error) {
      console.error('Failed to read accessibility settings:', error);
    }
    return true;
  };

  const hasNextPage = () => {
    return currentPage < pages.length - 1;
  };

  const hasPreviousPage = () => {
    return currentPage > 0;
  };

  const goToNextPageFromFocus = () => {
    setCurrentPage(Math.min(pages.length - 1, currentPage + 1));
    setCurrentReadingLine(0);
  };

  const goToPreviousPageFromFocus = () => {
    setCurrentPage(Math.max(0, currentPage - 1));
    setCurrentReadingLine(0);
  };

  // Focus mode toggle functions
  const handleToggleFocusMode = () => {
    if (!readingFocusMode) {
      setFocusAnimationState('entering');
      setReadingFocusMode(true);
      setTimeout(() => setFocusAnimationState('active'), 50);
    } else {
      setReadingFocusMode(false);
      setFocusAnimationState('inactive');
    }
  };

  const handleExitFocusMode = () => {
    setReadingFocusMode(false);
    setFocusAnimationState('inactive');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6">
          {/* Loading Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            </div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96"></div>
          </div>

          <div className="lg:grid lg:grid-cols-3 lg:gap-8 space-y-6 lg:space-y-0">
            {/* Loading Reading Content */}
            <div className="lg:col-span-2">
              <div className="shadow-lg bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl p-6 lg:p-8">
                {/* Loading Header */}
                <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: "color-mix(in srgb, var(--accessibility-text-color) 5%, transparent)", border: "1px solid", borderColor: "color-mix(in srgb, var(--accessibility-text-color) 15%, transparent)" } as React.CSSProperties}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: "color-mix(in srgb, var(--accessibility-text-color) 15%, transparent)" } as React.CSSProperties}>
                      <div className="w-5 h-5 rounded" style={{ backgroundColor: "color-mix(in srgb, var(--accessibility-text-color) 25%, transparent)" } as React.CSSProperties}></div>
                    </div>
                    <div>
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                    </div>
                  </div>
                </div>

                {/* Loading Text Container */}
                <div className="bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6 lg:p-8 space-y-4">
                  <div className="space-y-3">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Loading Accessibility Panel */}
              <div className="shadow-lg bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                </div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>

              {/* Loading Questions Panel */}
              <div className="shadow-lg bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-28"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Loading Indicator with Spinner */}
          <div className="fixed bottom-6 right-6 bg-white dark:bg-gray-800 shadow-lg rounded-full p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="animate-spin w-5 h-5 border-2 rounded-full" style={{ borderColor: "color-mix(in srgb, var(--accessibility-text-color) 60%, transparent)", borderTopColor: "transparent" } as React.CSSProperties}></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Laddar läsförståelseövning...
              </span>
            </div>
          </div>
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
    <div 
      className="min-h-screen bg-background relative"
      style={{
        backgroundColor: readingFocusMode ? "#242424" : undefined,
      }}
    >
      <div className={`max-w-7xl mx-auto ${readingFocusMode ? 'p-2 pt-6' : 'p-6'}`}>
        {/* Header */}
        {!readingFocusMode && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <Link href="/lasforstaelse">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Tillbaka
                </Button>
              </Link>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>~15 min</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>Gymnasiet</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  <span>Nivå 3</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <h1 className="text-3xl font-bold mb-4">{lesson.title}</h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {lesson.description}
              </p>
            </div>
          </div>
        )}

        {/* Pre-reading Questions */}
        {!readingFocusMode && lesson.preReadingQuestions &&
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

        {/* Main Content - Choose between Normal and Focus Mode */}
        {readingFocusMode ? (
          <FocusMode
            lesson={lesson}
            currentPage={currentPage}
            pages={pages}
            focusSettings={focusSettings}
            setFocusSettings={setFocusSettings}
            processContentWithDefinitions={processContentWithDefinitions}
            processRichDocWithDefinitions={processRichDocWithDefinitions}
            isRichContent={isRichContent}
            getPageContentForDefinitions={getPageContentForDefinitions}
            readingFocusLines={readingFocusLines}
            setReadingFocusLines={setReadingFocusLines}
            currentReadingLine={currentReadingLine}
            setCurrentReadingLine={setCurrentReadingLine}
            focusAnimationState={focusAnimationState}
            setFocusAnimationState={(state: string) => setFocusAnimationState(state as 'inactive' | 'entering' | 'active' | 'exiting')}
            onExitFocusMode={handleExitFocusMode}
            showFocusQuestionsPopup={showFocusQuestionsPopup}
            setShowFocusQuestionsPopup={setShowFocusQuestionsPopup}
            getTotalQuestionsCount={getTotalQuestionsCount}
            getShowFocusQuestionsButton={getShowFocusQuestionsButton}
            generalAnswers={generalAnswers}
            setGeneralAnswers={setGeneralAnswers}
            questionsPanel12Answers={questionsPanel12Answers}
            setQuestionsPanel12Answers={setQuestionsPanel12Answers}
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            goToNextPageFromFocus={goToNextPageFromFocus}
            goToPreviousPageFromFocus={goToPreviousPageFromFocus}
          />
        ) : (
          <NormalMode
            lesson={lesson}
            currentPage={currentPage}
            pages={pages}
            activeSettings={activeSettings}
            setActiveSettings={setActiveSettings}
            processContentWithDefinitions={processContentWithDefinitions}
            processRichDocWithDefinitions={processRichDocWithDefinitions}
            isRichContent={isRichContent}
            getPageContentForDefinitions={getPageContentForDefinitions}
            handleContentMouseOver={handleContentMouseOver}
            handleContentMouseOut={handleContentMouseOut}
            onToggleFocusMode={handleToggleFocusMode}
            totalQuestions={totalQuestions}
            currentQuestionIndex={currentQuestionIndex}
            currentQuestionData={currentQuestionData}
            currentAnswer={currentAnswer}
            isCurrentQuestionAnswered={isCurrentQuestionAnswered}
            progressPercentage={progressPercentage}
            handleQuestionsPanel12Change={handleQuestionsPanel12Change}
            goToPreviousQuestion={goToPreviousQuestion}
            goToNextQuestion={goToNextQuestion}
            isFirstQuestion={isFirstQuestion}
            isLastQuestion={isLastQuestion}
            showQuestionsPanel12={showQuestionsPanel12}
          />
        )}

        {/* Word Definition Tooltip */}
        {!readingFocusMode && hoveredWord && (
          <div
            className="fixed z-50 max-w-xs p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg pointer-events-none"
            style={{
              left: `${hoveredWord.x}px`,
              top: `${hoveredWord.y}px`,
              transform: 'translateX(-50%) translateY(-100%)',
            }}
          >
            <div className="font-semibold">{hoveredWord.word}</div>
            <div className="mt-1">{hoveredWord.definition}</div>
          </div>
        )}
      </div>
    </div>
  );
}