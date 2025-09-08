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

  // Reader settings type for both normal and focus modes
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

  // Focus mode settings - separate defaults
  const [focusSettings, setFocusSettings] = useState<ReaderSettings>(() => {
    try {
      const saved = localStorage.getItem("reading-focus-settings");
      return saved ? JSON.parse(saved) : { fontSize: 32, lineHeight: 1.5, backgroundColor: "black-on-white", fontFamily: "standard" };
    } catch {
      return { fontSize: 32, lineHeight: 1.5, backgroundColor: "black-on-white", fontFamily: "standard" };
    }
  });

  // Reading Focus Mode states - using "readingFocus" prefix to avoid conflicts
  const [readingFocusMode, setReadingFocusMode] = useState(false);
  const [focusAnimationState, setFocusAnimationState] = useState<'inactive' | 'entering' | 'active' | 'exiting'>('inactive');

  // Active settings based on current mode (after readingFocusMode is declared)
  const activeSettings = readingFocusMode ? focusSettings : normalSettings;
  const setActiveSettings = readingFocusMode ? setFocusSettings : setNormalSettings;
  const [readingFocusLines, setReadingFocusLines] = useState(1); // 1, 3, or 5 lines
  const [currentReadingLine, setCurrentReadingLine] = useState(0);

  // New DOM-based reading focus states
  const contentRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const [lineRects, setLineRects] = useState<DOMRect[]>([]);

  // Focus mode questions popup states
  const [showFocusQuestionsPopup, setShowFocusQuestionsPopup] = useState(false);
  
  // Get show questions button setting from accessibility settings
  const getShowFocusQuestionsButton = () => {
    try {
      const saved = localStorage.getItem('accessibility-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        return settings.showFocusQuestionsButton !== false; // Default to true if not set
      }
    } catch (error) {
      console.error('Failed to read accessibility settings:', error);
    }
    return true; // Default to true
  };

  // Check if user is on the last line in focus mode
  const isOnLastLine = () => {
    if (!readingFocusMode || !lineRects.length) return false;
    const maxLine = Math.max(0, lineRects.length - readingFocusLines);
    return currentReadingLine >= maxLine;
  };

  // Check if there's a next page available
  const hasNextPage = () => {
    return currentPage < pages.length - 1;
  };

  // Navigate to next page from focus mode
  const goToNextPageFromFocus = () => {
    setCurrentPage(Math.min(pages.length - 1, currentPage + 1));
    setCurrentReadingLine(0); // Reset to first line of new page
  };

  // Check if there's a previous page available
  const hasPreviousPage = () => {
    return currentPage > 0;
  };

  // Navigate to previous page from focus mode
  const goToPreviousPageFromFocus = () => {
    setCurrentPage(Math.max(0, currentPage - 1));
    setCurrentReadingLine(0); // Reset to first line of new page
  };

  const handleContentMouseOver = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('word-with-definition')) {
      const word = target.textContent || '';
      const definition = target.getAttribute('data-definition') || '';
      const rect = target.getBoundingClientRect();
      
      setHoveredWord({
        word,
        definition,
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
    }
  };

  const handleContentMouseOut = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('word-with-definition')) {
      setHoveredWord(null);
    }
  };

  function getTextNodeAt(element: HTMLElement, charIndex: number): [Text | null, number] {
    let walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let currentNode;
    let currentIndex = 0;
    
    while (currentNode = walker.nextNode()) {
      const textNode = currentNode as Text;
      const nodeLength = textNode.textContent?.length || 0;
      
      if (currentIndex + nodeLength > charIndex) {
        return [textNode, charIndex - currentIndex];
      }
      
      currentIndex += nodeLength;
    }
    
    return [null, 0];
  }

  function measureLineRects(textElement: HTMLElement, container: HTMLElement): DOMRect[] {
    if (!textElement || !container) return [];
    
    const range = document.createRange();
    const containerRect = container.getBoundingClientRect();
    
    // Get all text nodes
    const walker = document.createTreeWalker(
      textElement,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    const allRects: DOMRect[] = [];
    let currentNode;
    
    while (currentNode = walker.nextNode()) {
      const textNode = currentNode as Text;
      const text = textNode.textContent || '';
      
      for (let i = 0; i < text.length; i++) {
        // Create range for each character
        range.setStart(textNode, i);
        range.setEnd(textNode, i + 1);
        
        const rects = range.getClientRects();
        for (let j = 0; j < rects.length; j++) {
          const rect = rects[j];
          allRects.push(
            new DOMRect(
              rect.left - containerRect.left,
              rect.top - containerRect.top,
              rect.width,
              rect.height
            )
          );
        }
      }
    }
    
    // Normalize coordinates relative to container and merge lines
    const normalized = allRects
      .filter(r => r.width > 0 && r.height > 0)
      .map(r => 
        new DOMRect(
          r.left,
          r.top,
          r.width,
          r.height
        )
      );
    
    // Merge rects that are on the same line
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

  // Save settings separately to localStorage
  useEffect(() => {
    try { localStorage.setItem("reading-normal-settings", JSON.stringify(normalSettings)); } catch {}
  }, [normalSettings]);

  useEffect(() => {
    try { localStorage.setItem("reading-focus-settings", JSON.stringify(focusSettings)); } catch {}
  }, [focusSettings]);

  // Update CSS variables for both normal and focus modes
  useEffect(() => {
    const bgColorMap = {
      "black-on-white": { bg: "#FFFFFF", text: "#000000" },
      "light-gray-on-gray": { bg: "#595959", text: "#D9D9D9" },
      "white-on-black": { bg: "#000000", text: "#FFFFFF" },
      "black-on-light-yellow": { bg: "#FFFFCC", text: "#000000" },
      "black-on-light-blue": { bg: "#CCFFFF", text: "#000000" },
      "light-yellow-on-blue": { bg: "#003399", text: "#FFFFCC" },
      "black-on-light-red": { bg: "#FFCCCC", text: "#000000" },
    } as const;

    const root = document.documentElement;

    // Helper function to apply a profile
    const applyProfile = (prefix: string, s: ReaderSettings) => {
      const colors = bgColorMap[s.backgroundColor];
      root.style.setProperty(`${prefix}-bg-color`, colors.bg);
      root.style.setProperty(`${prefix}-text-color`, colors.text);

      // failsafe: invertera om lika
      const bg = colors.bg.toLowerCase();
      const tx = colors.text.toLowerCase();
      root.style.setProperty(
        `${prefix}-text-color`,
        bg === tx ? (bg === "#000000" ? "#ffffff" : "#000000") : colors.text
      );

      root.style.setProperty(`${prefix}-font-size`, `${s.fontSize}px`);
      root.style.setProperty(`${prefix}-line-height`, s.lineHeight.toString());

      const fontFamily =
        s.fontFamily === "dyslexia-friendly"
          ? '"OpenDyslexic", "Comic Sans MS", cursive, sans-serif'
          : "system-ui, -apple-system, sans-serif";
      root.style.setProperty(`${prefix}-font-family`, fontFamily);
    };

    applyProfile("--normal", normalSettings);
    applyProfile("--focus", focusSettings);
    
    // Keep legacy variables for backwards compatibility
    root.style.setProperty("--accessibility-bg-color", readingFocusMode ? bgColorMap[focusSettings.backgroundColor].bg : bgColorMap[normalSettings.backgroundColor].bg);
    root.style.setProperty("--accessibility-text-color", readingFocusMode ? bgColorMap[focusSettings.backgroundColor].text : bgColorMap[normalSettings.backgroundColor].text);
    root.style.setProperty("--accessibility-font-size", `${activeSettings.fontSize}px`);
    root.style.setProperty("--accessibility-line-height", activeSettings.lineHeight.toString());
    root.style.setProperty("--accessibility-font-family", activeSettings.fontFamily === "dyslexia-friendly" ? '"OpenDyslexic", "Comic Sans MS", cursive, sans-serif' : "system-ui, -apple-system, sans-serif");
  }, [normalSettings, focusSettings, readingFocusMode, activeSettings]);

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
    activeSettings.fontSize,
    activeSettings.lineHeight,
    activeSettings.fontFamily,
    readingFocusMode
  ]);

  const pages = useMemo(() => {
    if (!lesson) return [];
    return lesson.pages?.map(page => page.content) || [lesson.content || ""];
  }, [lesson]);

  const processTextWithDefinitions = (text: string): string => {
    if (!lesson?.wordDefinitions || lesson.wordDefinitions.length === 0) {
      return text;
    }

    let processedText = text;
    lesson.wordDefinitions.forEach((def: WordDefinition) => {
      const regex = new RegExp(`\\b${def.word}\\b`, 'gi');
      processedText = processedText.replace(regex, (match) => {
        return `<span class="word-with-definition" data-definition="${def.definition}">${match}</span>`;
      });
    });

    return processedText;
  };

  // Keyboard event handling for reading focus
  useEffect(() => {
    if (!readingFocusMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
        case 'Enter':
        case 'ArrowDown':
          e.preventDefault();
          if (isOnLastLine() && hasNextPage()) {
            goToNextPageFromFocus();
          } else {
            setCurrentReadingLine(prev => Math.min(lineRects.length - readingFocusLines, prev + 1));
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (currentReadingLine === 0 && hasPreviousPage()) {
            goToPreviousPageFromFocus();
          } else {
            setCurrentReadingLine(prev => Math.max(0, prev - 1));
          }
          break;
        case 'Escape':
          setReadingFocusMode(false);
          setFocusAnimationState('inactive');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [readingFocusMode, lineRects, currentReadingLine, readingFocusLines, currentPage]);

  // Scroll handling for reading focus
  useEffect(() => {
    if (!readingFocusMode || !contentRef.current) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      if (e.deltaY > 0) {
        // Scrolling down
        if (isOnLastLine() && hasNextPage()) {
          goToNextPageFromFocus();
        } else {
          setCurrentReadingLine(prev => Math.min(lineRects.length - readingFocusLines, prev + 1));
        }
      } else {
        // Scrolling up
        if (currentReadingLine === 0 && hasPreviousPage()) {
          goToPreviousPageFromFocus();
        } else {
          setCurrentReadingLine(prev => Math.max(0, prev - 1));
        }
      }
    };

    const container = contentRef.current;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [readingFocusMode, lineRects, currentReadingLine, readingFocusLines, currentPage]);

  // Calculate all questions for panel navigation
  const allQuestions = useMemo(() => {
    if (!lesson) return [];
    
    const questions: Array<{
      question: any;
      source: 'general' | 'page';
      pageIndex?: number;
      generalIndex?: number;
    }> = [];
    
    // Add general questions
    if (lesson.questions) {
      lesson.questions.forEach((q, index) => {
        questions.push({ 
          question: q, 
          source: 'general', 
          generalIndex: index 
        });
      });
    }
    
    // Add page-specific questions
    if (lesson.pages) {
      lesson.pages.forEach((page, pageIndex) => {
        if (page.questions) {
          page.questions.forEach(q => {
            questions.push({ 
              question: q, 
              source: 'page', 
              pageIndex 
            });
          });
        }
      });
    }
    
    return questions;
  }, [lesson]);

  const totalQuestions = allQuestions.length;

  const currentQuestionData = useMemo(() => {
    if (currentQuestionIndex >= allQuestions.length) return null;
    return allQuestions[currentQuestionIndex];
  }, [allQuestions, currentQuestionIndex]);

  const progressPercentage = useMemo(() => {
    if (totalQuestions === 0) return 0;
    return Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100);
  }, [currentQuestionIndex, totalQuestions]);

  // Helper functions for question navigation
  const goToNextQuestion = () => {
    setCurrentQuestionIndex(prev => Math.min(totalQuestions - 1, prev + 1));
  };

  const goToPreviousQuestion = () => {
    setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
  };

  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  // Current answer getter/setter
  const currentAnswer = useMemo(() => {
    if (!currentQuestionData) return '';
    
    if (currentQuestionData.source === 'general' && currentQuestionData.generalIndex !== undefined) {
      return generalAnswers[currentQuestionData.generalIndex] || '';
    } else {
      return questionsPanel12Answers[currentQuestionIndex] || '';
    }
  }, [currentQuestionData, generalAnswers, questionsPanel12Answers, currentQuestionIndex]);

  const isCurrentQuestionAnswered = currentAnswer.trim() !== '';

  const handleQuestionsPanel12Change = (questionIndex: number, answer: string) => {
    const questionData = allQuestions[questionIndex];
    if (!questionData) return;
    
    if (questionData.source === 'general' && questionData.generalIndex !== undefined) {
      setGeneralAnswers(prev => ({ ...prev, [questionData.generalIndex!]: answer }));
    } else {
      setQuestionsPanel12Answers(prev => ({ ...prev, [questionIndex]: answer }));
    }
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
    <div 
      className="min-h-screen bg-background relative"
      style={{
        backgroundColor: readingFocusMode ? "#242424" : undefined,
        overflow: 'visible', // Allow sticky positioning
      }}
    >
      <div className={`max-w-7xl mx-auto ${readingFocusMode ? 'p-2 pt-6' : 'p-6'}`}>
        {/* Header */}
        {!readingFocusMode && (
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

        {/* Main Content */}
        <div className={`${readingFocusMode ? 'flex justify-center items-start' : 'flex flex-col lg:flex-row gap-6'} mb-6`}>
          {/* Main Content - Left Column (takes 2/3 of space in normal mode, centered in focus mode) */}
          <Card
            className="reading-content mb-6 md:landscape:mb-0 lg:mb-0 lg:w-2/3"
            style={
              {
                backgroundColor: "var(--accessibility-bg-color)",
                color: "var(--accessibility-text-color)",
                borderColor: readingFocusMode ? "transparent" : "var(--accessibility-text-color)",
                borderWidth: readingFocusMode ? "0" : "0.5px",
                "--card-text-color": "var(--accessibility-text-color)",
                overflow: readingFocusMode ? "hidden" : undefined,
                boxShadow: readingFocusMode ? "none" : undefined,
              } as React.CSSProperties
            }
          >
            <CardHeader 
              className="relative"
              style={{
                backgroundColor: readingFocusMode ? "#242424" : undefined,
                borderTopLeftRadius: readingFocusMode ? "0.5rem" : undefined,
                borderTopRightRadius: readingFocusMode ? "0.5rem" : undefined,
                margin: readingFocusMode ? "0" : undefined,
              }}
            >
              <div className="flex items-center justify-between">
                {!readingFocusMode && (
                <CardTitle className="text-lg mt-2">
                  <span>Läs texten</span>
                </CardTitle>
                )}
                {!readingFocusMode && (
                  <div className="flex gap-2">
                    {/* Focus Mode Toggle Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReadingFocusMode(!readingFocusMode)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Fokusläge
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
                            value={[activeSettings.fontSize]}
                            onValueChange={(value) =>
                              setActiveSettings((prev) => ({
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
                            {activeSettings.fontSize}px
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">
                            Radavstånd
                          </Label>
                          <Slider
                            value={[activeSettings.lineHeight]}
                            onValueChange={(value) =>
                              setActiveSettings((prev) => ({
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
                            {activeSettings.lineHeight.toFixed(1)}
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">
                            Bakgrundsfärg
                          </Label>
                          <Select
                            value={activeSettings.backgroundColor}
                            onValueChange={(value) =>
                              setActiveSettings((prev) => ({
                                ...prev,
                                backgroundColor: value as ReaderSettings["backgroundColor"],
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
                            value={activeSettings.fontFamily}
                            onValueChange={(value) =>
                              setActiveSettings((prev) => ({
                                ...prev,
                                fontFamily: value as ReaderSettings["fontFamily"],
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
                                onClick={() => {
                                  if (!readingFocusMode) {
                                    setFocusAnimationState('entering');
                                    setReadingFocusMode(true);
                                    setTimeout(() => setFocusAnimationState('active'), 50);
                                  } else {
                                    setReadingFocusMode(false);
                                    setFocusAnimationState('inactive');
                                  }
                                }}
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
                                  💡 Använd Space/Enter/pilar eller scrolla för att
                                  navigera rad för rad
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
              {!readingFocusMode && lesson.wordDefinitions && lesson.wordDefinitions.length > 0 && (
                <CardDescription>
                  💡 Ord med prickad understrykning har förklaringar - håll
                  musen över dem
                </CardDescription>
              )}
            </CardHeader>
            <CardContent 
              className="relative"
              style={{
                backgroundColor: readingFocusMode ? "#242424" : undefined,
                borderBottomLeftRadius: readingFocusMode ? "0.5rem" : undefined,
                borderBottomRightRadius: readingFocusMode ? "0.5rem" : undefined,
                margin: readingFocusMode ? "0" : undefined,
              }}
            >
              <div className="space-y-6">
                {/* Bilder ovanför texten för denna sida */}
                {!readingFocusMode && lesson.pages &&
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
                    fontSize: "16px", // stable measuring font for ch units
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                    backgroundColor: readingFocusMode ? "#242424" : "var(--accessibility-bg-color)",
                    color: "var(--accessibility-text-color)",
                    display: "flow-root", // 💡 bryt margin-collapsing från första barnet
                    width: readingFocusMode ? "100%" : undefined,
                    maxWidth: readingFocusMode ? "none" : undefined,
                    fontFamily: readingFocusMode ? "var(--focus-font-family)" : "var(--normal-font-family)",
                  }}
                  onMouseOver={handleContentMouseOver}
                  onMouseOut={handleContentMouseOut}
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
                      background-color: var(--accessibility-bg-color) !important;
                      color: var(--accessibility-text-color) !important;
                    }
                    .reading-content * {
                      color: var(--accessibility-text-color) !important;
                      /* Ta bort -webkit-text-fill-color – kan göra att text inte ritas korrekt över/under halvtransparenta lager */
                      -webkit-text-fill-color: unset !important;
                    }

                    .reading-content p {
                      font-size: var(--accessibility-font-size) !important;
                      line-height: var(--accessibility-line-height) !important;
                      color: var(--accessibility-text-color) !important;
                      font-family: var(--accessibility-font-family) !important;
                    }

                    .reading-content h1,
                    .reading-content h2,
                    .reading-content h3,
                    .reading-content h4,
                    .reading-content h5,
                    .reading-content h6 {
                      font-size: calc(var(--accessibility-font-size) * 1.2) !important;
                      line-height: var(--accessibility-line-height) !important;
                      color: var(--accessibility-text-color) !important;
                      font-family: var(--accessibility-font-family) !important;
                    }

                    .reading-content strong,
                    .reading-content b {
                      color: var(--accessibility-text-color) !important;
                      font-family: var(--accessibility-font-family) !important;
                    }

                    .reading-content em,
                    .reading-content i {
                      color: var(--accessibility-text-color) !important;
                      font-family: var(--accessibility-font-family) !important;
                    }

                    /* Style for words with definitions */
                    .reading-content .word-with-definition {
                      position: relative;
                      border-bottom: 2px dotted var(--accessibility-text-color);
                      cursor: help;
                      transition: background-color 0.2s ease;
                    }

                    .reading-content .word-with-definition:hover {
                      background-color: rgba(var(--accessibility-text-color), 0.1);
                    }

                    /* Word definition tooltip */
                    .word-definition-tooltip {
                      position: fixed;
                      background: var(--accessibility-bg-color);
                      color: var(--accessibility-text-color);
                      border: 2px solid var(--accessibility-text-color);
                      border-radius: 8px;
                      padding: 12px;
                      font-family: var(--accessibility-font-family);
                      font-size: 14px;
                      line-height: 1.4;
                      max-width: 300px;
                      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                      z-index: 1000;
                      pointer-events: none;
                    }

                    .word-definition-tooltip strong {
                      color: var(--accessibility-text-color);
                      font-family: var(--accessibility-font-family);
                    }
                  `}</style>

                  {/* Reading focus overlay */}
                  {readingFocusMode && lineRects.length > 0 && (
                    <div className="focus-overlay-container focus-active">
                      {/* Top scrim */}
                      <div
                        className="rf-scrim"
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          top: 0,
                          height: Math.max(
                            0,
                            lineRects[currentReadingLine]?.top || 0,
                          ),
                          zIndex: 20,
                        }}
                      />

                      {/* Bottom scrim */}
                      <div
                        className="rf-scrim"
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          top:
                            (lineRects[currentReadingLine + readingFocusLines - 1]
                              ?.bottom || 0) + 4,
                          bottom: 0,
                          zIndex: 20,
                        }}
                      />

                      {/* Focus frame around visible lines */}
                      <div
                        className="rf-frame"
                        style={{
                          position: "absolute",
                          left: Math.min(
                            ...lineRects
                              .slice(
                                currentReadingLine,
                                currentReadingLine + readingFocusLines,
                              )
                              .map((r) => r.left),
                          ) - 8,
                          top: (lineRects[currentReadingLine]?.top || 0) - 4,
                          width:
                            Math.max(
                              ...lineRects
                                .slice(
                                  currentReadingLine,
                                  currentReadingLine + readingFocusLines,
                                )
                                .map((r) => r.right),
                            ) -
                            Math.min(
                              ...lineRects
                                .slice(
                                  currentReadingLine,
                                  currentReadingLine + readingFocusLines,
                                )
                                .map((r) => r.left),
                            ) +
                            16,
                          height:
                            ((lineRects[currentReadingLine + readingFocusLines - 1]
                              ?.bottom || 0) -
                              (lineRects[currentReadingLine]?.top || 0)) + 8,
                          borderRadius: "8px",
                          zIndex: 15,
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                  )}

                  {/* Text content */}
                  <div
                    ref={textRef}
                    dangerouslySetInnerHTML={{ __html: pages[currentPage] ? processTextWithDefinitions(pages[currentPage]) : "" }}
                  />

                  {/* Navigation buttons in focus mode */}
                  {readingFocusMode && (
                    <div className="fixed top-1 right-8 z-40 flex items-center gap-2">
                      {/* Focus questions button */}
                      {getShowFocusQuestionsButton() && (
                        <button
                          onClick={() => setShowFocusQuestionsPopup(true)}
                          className="focus-ui-button p-3 bg-gray-800 text-white rounded-full shadow-lg transition-all duration-300 hover:bg-gray-700"
                          title="Visa frågor"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}

                      {/* Focus settings button */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className="focus-ui-button p-3 bg-gray-800 text-white rounded-full shadow-lg transition-all duration-300 hover:bg-gray-700"
                            title="Inställningar"
                          >
                            <Settings className="w-5 h-5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" align="end">
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium">
                                Textstorlek
                              </Label>
                              <Slider
                                value={[activeSettings.fontSize]}
                                onValueChange={(value) =>
                                  setActiveSettings((prev) => ({
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
                                {activeSettings.fontSize}px
                              </div>
                            </div>

                            <div>
                              <Label className="text-sm font-medium">
                                Radavstånd
                              </Label>
                              <Slider
                                value={[activeSettings.lineHeight]}
                                onValueChange={(value) =>
                                  setActiveSettings((prev) => ({
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
                                {activeSettings.lineHeight.toFixed(1)}
                              </div>
                            </div>

                            <div>
                              <Label className="text-sm font-medium">
                                Bakgrundsfärg
                              </Label>
                              <Select
                                value={activeSettings.backgroundColor}
                                onValueChange={(value) =>
                                  setActiveSettings((prev) => ({
                                    ...prev,
                                    backgroundColor: value as ReaderSettings["backgroundColor"],
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
                                value={activeSettings.fontFamily}
                                onValueChange={(value) =>
                                  setActiveSettings((prev) => ({
                                    ...prev,
                                    fontFamily: value as ReaderSettings["fontFamily"],
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
                                    onClick={() => {
                                      if (!readingFocusMode) {
                                        setFocusAnimationState('entering');
                                        setReadingFocusMode(true);
                                        setTimeout(() => setFocusAnimationState('active'), 50);
                                      } else {
                                        setReadingFocusMode(false);
                                        setFocusAnimationState('inactive');
                                      }
                                    }}
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
                                      💡 Använd Space/Enter/pilar eller scrolla för att
                                      navigera rad för rad
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Exit focus button */}
                      <button
                        onClick={() => {
                          setReadingFocusMode(false);
                          setFocusAnimationState('inactive');
                        }}
                        className="focus-ui-button p-3 bg-gray-800 text-white rounded-full shadow-lg transition-all duration-300 hover:bg-gray-700"
                        title="Avsluta fokusläge"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Previous page button in focus mode */}
                  {readingFocusMode && isOnLastLine() && hasPreviousPage() && (
                    <button
                      onClick={goToPreviousPageFromFocus}
                      className="fixed bottom-4 left-4 z-40 p-3 bg-gray-800 text-white rounded-full shadow-lg transition-all duration-300 hover:bg-gray-700"
                      title="Föregående sida"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
                      onClick={() => setShowFocusQuestionsPopup(false)}
                    >
                      <div 
                        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontFamily: "var(--focus-font-family)" }}
                      >
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-4">
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
                          
                          <div className="space-y-6">
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

                {/* Page navigation - only in normal mode */}
                {!readingFocusMode && pages.length > 1 && (
                  <div 
                    className={`fade-on-focus ${readingFocusMode ? 'focus-hidden' : ''} flex items-center justify-between mt-6 pt-4 border-t`}
                    style={{
                      borderColor: "var(--accessibility-text-color)",
                      borderTopWidth: "0.5px",
                    }}
                  >
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Föregående sida
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Sida {currentPage + 1} av {pages.length}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setCurrentPage(Math.min(pages.length - 1, currentPage + 1))
                      }
                      disabled={currentPage === pages.length - 1}
                      className="flex items-center gap-2"
                    >
                      Nästa sida
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Images below text for this page */}
                {!readingFocusMode && lesson.pages &&
                  lesson.pages[currentPage]?.imagesBelow &&
                  lesson.pages[currentPage]?.imagesBelow!.length > 0 && (
                    <div className="space-y-4 mt-6">
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
            </CardContent>
          </Card>

          {/* New Questions Panel - One Question at a Time - ON THE RIGHT */}
          {!readingFocusMode && showQuestionsPanel12 && lesson && totalQuestions > 0 && (
            <div className="w-full lg:w-1/3">
              <aside className="sticky top-4">
                <div
                  className="border rounded-lg p-6"
                  style={
                    {
                      backgroundColor: "var(--accessibility-bg-color)",
                      color: "var(--accessibility-text-color)",
                      borderColor: "var(--accessibility-text-color)",
                      borderWidth: "0.5px",
                      maxWidth: "720px",
                      fontFamily: "var(--normal-font-family)",
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
                    <label 
                      className="block text-lg font-medium leading-relaxed"
                      style={{ fontFamily: "var(--normal-font-family)" }}
                    >
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
                                  <span 
                                    className="flex-1 text-base"
                                    style={{ fontFamily: "var(--normal-font-family)" }}
                                  >
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
                              <span 
                                className="flex-1 text-base"
                                style={{ fontFamily: "var(--normal-font-family)" }}
                              >
                                {option}
                              </span>
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
                          className="w-full min-h-[100px] p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                          style={{
                            backgroundColor: "var(--accessibility-bg-color)",
                            color: "var(--accessibility-text-color)",
                            borderColor: "var(--accessibility-text-color)",
                            borderWidth: "0.5px",
                            fontSize: "16px",
                            lineHeight: "1.5",
                            fontFamily: "var(--normal-font-family)",
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
              </aside>
            </div>
          )}
        </div>

        {/* General Questions */}
        {!readingFocusMode && lesson.questions && lesson.questions.length > 0 && !showQuestionsPanel12 && (
          <Card className={`fade-on-focus ${readingFocusMode ? 'focus-hidden' : ''}`}>
            <CardHeader>
              <CardTitle className="text-lg">Allmänna frågor</CardTitle>
              <CardDescription>
                Svara på frågorna baserat på texten du har läst
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {lesson.questions.map((question, index) => (
                  <div key={index} className="p-4 bg-muted rounded-lg space-y-3">
                    <h3 className="font-medium text-base">
                      {index + 1}. {question.question}
                    </h3>
                    
                    {question.type === 'multiple_choice' && question.options && (
                      <div className="space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <label key={optionIndex} className="flex items-center space-x-3">
                            <input
                              type="radio"
                              name={`general-${index}`}
                              value={option}
                              checked={generalAnswers[index] === option}
                              onChange={(e) => setGeneralAnswers(prev => ({ ...prev, [index]: e.target.value }))}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    
                    {question.type === 'true_false' && (
                      <div className="space-y-2">
                        {['Sant', 'Falskt'].map((option) => (
                          <label key={option} className="flex items-center space-x-3">
                            <input
                              type="radio"
                              name={`general-${index}`}
                              value={option}
                              checked={generalAnswers[index] === option}
                              onChange={(e) => setGeneralAnswers(prev => ({ ...prev, [index]: e.target.value }))}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    
                    {(question.type === 'open_ended' || question.type === 'open') && (
                      <textarea
                        value={generalAnswers[index] || ''}
                        onChange={(e) => setGeneralAnswers(prev => ({ ...prev, [index]: e.target.value }))}
                        className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Skriv ditt svar här..."
                      />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Page-specific Questions */}
        {!readingFocusMode && lesson.pages && lesson.pages[currentPage]?.questions && lesson.pages[currentPage]?.questions!.length > 0 && !showQuestionsPanel12 && (
          <Card className={`fade-on-focus ${readingFocusMode ? 'focus-hidden' : ''}`}>
            <CardHeader>
              <CardTitle className="text-lg">Frågor för denna sida</CardTitle>
              <CardDescription>
                Svara på frågorna baserat på texten du precis läst
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {lesson.pages[currentPage]?.questions!.map((question, index) => (
                  <div key={index} className="p-4 bg-muted rounded-lg space-y-3">
                    <h3 className="font-medium text-base">
                      {index + 1}. {question.question}
                    </h3>
                    
                    {question.type === 'multiple_choice' && question.options && (
                      <div className="space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <label key={optionIndex} className="flex items-center space-x-3">
                            <input
                              type="radio"
                              name={`page-${currentPage}-${index}`}
                              value={option}
                              checked={readingAnswers[currentPage]?.[index] === option}
                              onChange={(e) => {
                                const newAnswers = { ...readingAnswers };
                                if (!newAnswers[currentPage]) newAnswers[currentPage] = {};
                                newAnswers[currentPage][index] = e.target.value;
                                setReadingAnswers(newAnswers);
                              }}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    
                    {question.type === 'true_false' && (
                      <div className="space-y-2">
                        {['Sant', 'Falskt'].map((option) => (
                          <label key={option} className="flex items-center space-x-3">
                            <input
                              type="radio"
                              name={`page-${currentPage}-${index}`}
                              value={option}
                              checked={readingAnswers[currentPage]?.[index] === option}
                              onChange={(e) => {
                                const newAnswers = { ...readingAnswers };
                                if (!newAnswers[currentPage]) newAnswers[currentPage] = {};
                                newAnswers[currentPage][index] = e.target.value;
                                setReadingAnswers(newAnswers);
                              }}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    
                    {(question.type === 'open_ended' || question.type === 'open') && (
                      <textarea
                        value={readingAnswers[currentPage]?.[index] || ''}
                        onChange={(e) => {
                          const newAnswers = { ...readingAnswers };
                          if (!newAnswers[currentPage]) newAnswers[currentPage] = {};
                          newAnswers[currentPage][index] = e.target.value;
                          setReadingAnswers(newAnswers);
                        }}
                        className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Skriv ditt svar här..."
                      />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Word definition tooltip */}
      {hoveredWord && (
        <div
          className="word-definition-tooltip"
          style={{
            left: hoveredWord.x,
            top: hoveredWord.y,
            transform: 'translateX(-50%)',
          }}
        >
          <strong>{hoveredWord.word}</strong>
          <br />
          {hoveredWord.definition}
        </div>
      )}
    </div>
  );
}