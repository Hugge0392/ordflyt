import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BookOpen, Clock, ArrowLeft, User, Target, ChevronLeft, ChevronRight, Eye, Settings } from "lucide-react";
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
  const [readingAnswers, setReadingAnswers] = useState<Record<number, Record<number, string>>>({});
  const [generalAnswers, setGeneralAnswers] = useState<Record<number, string>>({});
  const [hoveredWord, setHoveredWord] = useState<HoveredWord | null>(null);
  const [showQuestions, setShowQuestions] = useState(true);
  
  // Accessibility settings state
  const [accessibilitySettings, setAccessibilitySettings] = useState({
    fontSize: 34,
    lineHeight: 1.8,
    backgroundColor: 'black-on-white' as const,
    fontFamily: 'standard' as const
  });
  
  // State for accessibility colors
  const [accessibilityColors, setAccessibilityColors] = useState({
    backgroundColor: '#ffffff',
    textColor: '#000000'
  });

  const { data: lesson, isLoading, error } = useQuery<ReadingLesson>({
    queryKey: [`/api/reading-lessons/${id}`],
    enabled: !!id,
  });

  // Update accessibility colors based on CSS variables
  useEffect(() => {
    const updateColors = () => {
      const root = document.documentElement;
      const bgColor = root.style.getPropertyValue('--accessibility-bg-color') || '#ffffff';
      const textColor = root.style.getPropertyValue('--accessibility-text-color') || '#000000';
      setAccessibilityColors({
        backgroundColor: bgColor,
        textColor: textColor
      });
    };

    // Update on mount
    updateColors();
    
    // Listen for changes to CSS variables
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style']
    });

    return () => observer.disconnect();
  }, []);

  // Update accessibility settings in CSS variables
  useEffect(() => {
    const bgColorMap = {
      'black-on-white': { bg: '#FFFFFF', text: '#000000' },
      'light-gray-on-gray': { bg: '#595959', text: '#D9D9D9' },
      'white-on-black': { bg: '#000000', text: '#FFFFFF' },
      'black-on-light-yellow': { bg: '#FFFFCC', text: '#000000' },
      'black-on-light-blue': { bg: '#CCFFFF', text: '#000000' },
      'light-yellow-on-blue': { bg: '#003399', text: '#FFFFCC' },
      'black-on-light-red': { bg: '#FFCCCC', text: '#000000' }
    };
    
    const colors = bgColorMap[accessibilitySettings.backgroundColor];
    
    const root = document.documentElement;
    root.style.setProperty('--accessibility-bg-color', colors.bg);
    root.style.setProperty('--accessibility-text-color', colors.text);
    
    // Update font size and line height CSS variables
    root.style.setProperty('--reading-font-size', `${accessibilitySettings.fontSize}px`);
    root.style.setProperty('--reading-line-height', accessibilitySettings.lineHeight.toString());
  }, [accessibilitySettings]);



  // Create interactive content with word definitions
  const processContentWithDefinitions = (content: string, definitions: WordDefinition[] = []) => {
    // Content is already HTML from RichTextEditor, don't convert markdown
    let processedContent = content;
    
    if (!definitions.length) return processedContent;

    // Create a map of words to definitions for quick lookup
    const defMap = new Map(definitions.map(def => [def.word.toLowerCase(), def.definition]));
    
    // Process the HTML content to add tooltips to defined words
    definitions.forEach(({ word, definition }) => {
      // Create a regex that matches the word as a whole word (case insensitive)
      const regex = new RegExp(`\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
      
      // Replace with tooltip-wrapped version
      processedContent = processedContent.replace(regex, 
        `<span class="defined-word" data-word="${word}" data-definition="${definition}">$1</span>`
      );
    });
    
    return processedContent;
  };

  // Split content into pages based on page break markers or use lesson.pages if available
  const pages = useMemo(() => {
    // If lesson has pages data, use that (this supports per-page questions and images)
    if (lesson?.pages && lesson.pages.length > 0) {
      return lesson.pages.map(page => page.content);
    }
    
    // Fallback: split content by page break markers
    if (!lesson?.content) return [];
    
    const pageBreakMarker = '--- SIDBRYTNING ---';
    const contentParts = lesson.content.split(pageBreakMarker);
    
    if (contentParts.length === 1) {
      // No page breaks, return single page
      return [contentParts[0]];
    }
    
    return contentParts.filter(part => part.trim().length > 0);
  }, [lesson?.content, lesson?.pages]);

  // Handle mouse events for word definitions
  const handleContentMouseOver = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('defined-word')) {
      const word = target.getAttribute('data-word') || '';
      const definition = target.getAttribute('data-definition') || '';
      const rect = target.getBoundingClientRect();
      setHoveredWord({
        word,
        definition,
        x: rect.left + rect.width / 2,
        y: rect.top
      });
    }
  };

  const handleContentMouseOut = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('defined-word')) {
      setHoveredWord(null);
    }
  };


  // Handle answer changes for reading questions
  const handleAnswerChange = (pageIndex: number, questionIndex: number, answer: string) => {
    setReadingAnswers(prev => ({
      ...prev,
      [pageIndex]: {
        ...prev[pageIndex],
        [questionIndex]: answer
      }
    }));
  };

  // Handle answer changes for general questions
  const handleGeneralAnswerChange = (questionIndex: number, answer: string) => {
    setGeneralAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  // Check if all questions for the current page are answered
  const areAllCurrentPageQuestionsAnswered = () => {
    const currentPageQuestions = lesson?.pages?.[currentPage]?.questions;
    if (!currentPageQuestions || currentPageQuestions.length === 0) return true;
    
    const currentPageAnswers = readingAnswers[currentPage];
    if (!currentPageAnswers) return false;
    
    return currentPageQuestions.every((_, index) => {
      const answer = currentPageAnswers[index];
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
          <h2 className="text-xl font-semibold mb-2">Läsförståelseövning hittades inte</h2>
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
                <div>
                </div>
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
          {lesson.preReadingQuestions && lesson.preReadingQuestions.length > 0 && (
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
          <div className="grid grid-cols-1 md:landscape:grid-cols-3 lg:grid-cols-3 gap-6 lg:items-start mb-6">
            {/* Main Content - Left Column (takes 2/3 of space in normal mode, centered in focus mode) */}
            <Card 
              className="reading-content mb-6 md:landscape:mb-0 lg:mb-0 md:landscape:col-span-2 lg:col-span-2"
              style={{
                backgroundColor: accessibilityColors.backgroundColor,
                color: accessibilityColors.textColor,
                '--card-text-color': accessibilityColors.textColor
              } as React.CSSProperties}
            >
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    <span>Läs texten</span>
                  </CardTitle>
                  <div className="flex gap-2">
                      {((lesson.pages && lesson.pages[currentPage]?.questions && lesson.pages[currentPage]?.questions!.length > 0) || 
                        (lesson.questions && lesson.questions.length > 0)) && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowQuestions(v => !v)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          {showQuestions ? 'Dölj frågor' : 'Visa frågor'}
                        </Button>
                      )}
                      
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
                              <Label className="text-sm font-medium">Textstorlek</Label>
                              <Slider
                                value={[accessibilitySettings.fontSize]}
                                onValueChange={(value) => setAccessibilitySettings(prev => ({ ...prev, fontSize: value[0] }))}
                                min={16}
                                max={60}
                                step={2}
                                className="mt-2"
                              />
                              <div className="text-xs text-muted-foreground mt-1">{accessibilitySettings.fontSize}px</div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Radavstånd</Label>
                              <Slider
                                value={[accessibilitySettings.lineHeight]}
                                onValueChange={(value) => setAccessibilitySettings(prev => ({ ...prev, lineHeight: value[0] }))}
                                min={1.0}
                                max={3.0}
                                step={0.1}
                                className="mt-2"
                              />
                              <div className="text-xs text-muted-foreground mt-1">{accessibilitySettings.lineHeight.toFixed(1)}</div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Bakgrundsfärg</Label>
                              <Select
                                value={accessibilitySettings.backgroundColor}
                                onValueChange={(value) => setAccessibilitySettings(prev => ({ ...prev, backgroundColor: value as any }))}
                              >
                                <SelectTrigger className="mt-2">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="black-on-white">Svart på vitt</SelectItem>
                                  <SelectItem value="light-gray-on-gray">Ljusgrå på grå</SelectItem>
                                  <SelectItem value="white-on-black">Vit på svart</SelectItem>
                                  <SelectItem value="black-on-light-yellow">Svart på ljusgul</SelectItem>
                                  <SelectItem value="black-on-light-blue">Svart på ljusblå</SelectItem>
                                  <SelectItem value="light-yellow-on-blue">Ljusgul på blå</SelectItem>
                                  <SelectItem value="black-on-light-red">Svart på ljusröd</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Teckensnitt</Label>
                              <Select
                                value={accessibilitySettings.fontFamily}
                                onValueChange={(value) => setAccessibilitySettings(prev => ({ ...prev, fontFamily: value as any }))}
                              >
                                <SelectTrigger className="mt-2">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="standard">Standard</SelectItem>
                                  <SelectItem value="dyslexia-friendly">Dyslexi-vänligt</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                </div>
                {lesson.wordDefinitions && lesson.wordDefinitions.length > 0 && (
                  <CardDescription>
                    💡 Ord med prickad understrykning har förklaringar - håll musen över dem
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-6">
                  {/* Bilder ovanför texten för denna sida */}
                  {lesson.pages && lesson.pages[currentPage]?.imagesAbove && lesson.pages[currentPage]?.imagesAbove!.length > 0 && (
                    <div className="space-y-4">
                      {lesson.pages[currentPage]?.imagesAbove!.map((imageUrl, index) => (
                        <img 
                          key={index}
                          src={imageUrl} 
                          alt={`Bild ovanför texten ${index + 1}`}
                          className="w-full max-w-3xl h-auto rounded-lg mx-auto"
                        />
                      ))}
                    </div>
                  )}

                  <div 
                    className="prose dark:prose-invert max-w-none min-h-[400px] reading-content"
                    style={{ 
                      fontSize: `${accessibilitySettings.fontSize}px !important`,
                      lineHeight: `${accessibilitySettings.lineHeight} !important`,
                      whiteSpace: 'pre-wrap', 
                      wordWrap: 'break-word',
                      fontFamily: (accessibilitySettings.fontFamily as string) === 'dyslexia-friendly' 
                        ? '"OpenDyslexic", "Comic Sans MS", cursive, sans-serif'
                        : 'inherit'
                    }}
                    dangerouslySetInnerHTML={{ __html: processContentWithDefinitions(pages[currentPage] || '', lesson.wordDefinitions) }}
                    onMouseOver={handleContentMouseOver}
                    onMouseOut={handleContentMouseOut}
                  />

                  {/* Bilder under texten för denna sida */}
                  {lesson.pages && lesson.pages[currentPage]?.imagesBelow && lesson.pages[currentPage]?.imagesBelow!.length > 0 && (
                    <div className="space-y-4">
                      {lesson.pages[currentPage]?.imagesBelow!.map((imageUrl, index) => (
                        <img 
                          key={index}
                          src={imageUrl} 
                          alt={`Bild under texten ${index + 1}`}
                          className="w-full max-w-3xl h-auto rounded-lg mx-auto"
                        />
                      ))}
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
                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                        className="flex items-center gap-2 navigation-button
                                   bg-white text-black border-[#CCCCCC]
                                   hover:bg-white hover:text-black hover:border-[#CCCCCC]
                                   focus-visible:ring-0 focus-visible:outline-none
                                   shadow-none hover:shadow-none active:shadow-none"
                        style={{
                          backgroundColor: '#FFFFFF',
                          color: '#000000',
                          borderColor: '#CCCCCC'
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
                        backgroundColor: '#FFFFFF !important',
                        color: '#000000 !important',
                        border: '1px solid #CCCCCC !important',
                        fontFamily: 'system-ui, -apple-system, sans-serif !important',
                        textAlign: 'center',
                        width: 'auto',
                        minWidth: '60px',
                        maxWidth: '80px'
                      }}
                    >
                      Sida {currentPage + 1} av {pages.length}
                    </div>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (currentPage === pages.length - 1) {
                          // På sista sidan - lämna in 
                          alert("Bra jobbat! Du har läst hela texten och svarat på frågorna.");
                        } else {
                          // Inte sista sidan - gå till nästa sida
                          setCurrentPage(Math.min(pages.length - 1, currentPage + 1));
                        }
                      }}
                      disabled={!areAllCurrentPageQuestionsAnswered()}
                      className="flex items-center gap-2 navigation-button
                                 bg-white text-black border-[#CCCCCC]
                                 hover:bg-white hover:text-black hover:border-[#CCCCCC]
                                 focus-visible:ring-0 focus-visible:outline-none
                                 shadow-none hover:shadow-none active:shadow-none"
                      style={{
                        backgroundColor: '#FFFFFF',
                        color: '#000000',
                        borderColor: '#CCCCCC'
                      }}
                      title={!areAllCurrentPageQuestionsAnswered() ? "Svara på alla frågor innan du går vidare" : ""}
                    >
                      {currentPage === pages.length - 1 ? "Lämna in" : "Nästa sida"}
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
                      transform: 'translate(-50%, -100%)'
                    }}
                  >
                    <div className="font-semibold">{hoveredWord.word}</div>
                    <div className="text-gray-200">{hoveredWord.definition}</div>
                    {/* Arrow pointing down */}
                    <div 
                      className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Questions Panel */}
            {showQuestions && ((lesson.pages && lesson.pages[currentPage]?.questions && lesson.pages[currentPage]?.questions!.length > 0) || 
              (lesson.questions && lesson.questions.length > 0)) && (
              <Card 
                className="questions-card md:landscape:sticky md:landscape:top-6 lg:sticky lg:top-6"
                style={{ 
                  backgroundColor: accessibilityColors.backgroundColor,
                  color: accessibilityColors.textColor,
                  '--card-text-color': accessibilityColors.textColor
                } as React.CSSProperties}
              >
                <CardHeader className="border-b-2" style={{ borderBottomColor: '#e2eaef' }}>
                  <CardTitle className="text-lg">
                    {lesson.pages && lesson.pages[currentPage]?.questions && lesson.pages[currentPage]?.questions!.length > 0 
                      ? 'Frågor under läsning' 
                      : 'Förståelsefrågor'}
                  </CardTitle>
                  <CardDescription style={{ color: accessibilityColors.textColor }}>
                    {lesson.pages && lesson.pages[currentPage]?.questions && lesson.pages[currentPage]?.questions!.length > 0 
                      ? 'Svara på frågorna medan du läser för att hänga med i texten'
                      : 'Svara på frågorna för att kontrollera din förståelse'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Show reading questions for current page first */}
                    {lesson.pages && lesson.pages[currentPage]?.questions && lesson.pages[currentPage]?.questions!.map((question, index) => {
                      const isAnswered = !!(readingAnswers[currentPage]?.[index]?.trim());
                      
                      return (
                        <div 
                          key={`reading-${index}`} 
                          className="p-4 border-b pb-4 last:border-b-0"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-lg">Uppgift {index + 1}</h3>
                            {isAnswered && <Badge variant="default" className="text-xs bg-green-500">✓ Besvarad</Badge>}
                          </div>
                          <h4 className="font-medium mb-3">
                            {question.question}
                          </h4>
                          
                          {question.type === 'multiple_choice' && question.options && (
                            <div className="space-y-4">
                              <p className="text-sm font-medium text-gray-700 mb-3">Välj det rätta svaret:</p>
                              {question.options.map((option: string, optionIndex: number) => {
                                const optionValue = String.fromCharCode(65 + optionIndex);
                                const isSelected = readingAnswers[currentPage]?.[index] === optionValue;
                                
                                return (
                                  <div key={optionIndex} className="answer-option">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleAnswerChange(currentPage, index, optionValue);
                                      }}
                                      style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        padding: '16px 20px',
                                        backgroundColor: isSelected ? '#3b82f6' : '#f8fafc',
                                        color: isSelected ? '#ffffff' : '#1e293b',
                                        border: '3px solid ' + (isSelected ? '#3b82f6' : '#cbd5e1'),
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        fontSize: '18px',
                                        fontWeight: '500',
                                        transition: 'all 0.2s ease',
                                        boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                                        transform: isSelected ? 'translateY(-1px)' : 'none'
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!isSelected) {
                                          e.currentTarget.style.borderColor = '#94a3b8';
                                          e.currentTarget.style.backgroundColor = '#f1f5f9';
                                          e.currentTarget.style.transform = 'translateY(-1px)';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isSelected) {
                                          e.currentTarget.style.borderColor = '#cbd5e1';
                                          e.currentTarget.style.backgroundColor = '#f8fafc';
                                          e.currentTarget.style.transform = 'none';
                                        }
                                      }}
                                    >
                                      <span style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        backgroundColor: isSelected ? '#ffffff' : '#e2e8f0',
                                        color: isSelected ? '#3b82f6' : '#475569',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '18px',
                                        flexShrink: 0,
                                        border: '2px solid ' + (isSelected ? '#ffffff' : '#cbd5e1')
                                      }}>
                                        {optionValue}
                                      </span>
                                      <span style={{ flex: 1, textAlign: 'left' }}>{option}</span>
                                      {isSelected && (
                                        <span style={{
                                          color: '#ffffff',
                                          fontSize: '20px',
                                          fontWeight: 'bold'
                                        }}>✓</span>
                                      )}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          {question.type === 'true_false' && (
                            <div className="space-y-4">
                              <p className="text-sm font-medium text-gray-700 mb-3">Välj Sant eller Falskt:</p>
                              {['Sant', 'Falskt'].map((option, optionIndex) => {
                                const optionValue = option;
                                const isSelected = readingAnswers[currentPage]?.[index] === optionValue;
                                const isTrue = option === 'Sant';
                                
                                return (
                                  <div key={optionIndex} className="answer-option">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleAnswerChange(currentPage, index, optionValue);
                                      }}
                                      style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        padding: '16px 20px',
                                        backgroundColor: isSelected 
                                          ? (isTrue ? '#16a34a' : '#dc2626') 
                                          : '#f8fafc',
                                        color: isSelected ? '#ffffff' : '#1e293b',
                                        border: '3px solid ' + (isSelected 
                                          ? (isTrue ? '#16a34a' : '#dc2626')
                                          : '#cbd5e1'),
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        fontSize: '18px',
                                        fontWeight: '500',
                                        transition: 'all 0.2s ease',
                                        boxShadow: isSelected 
                                          ? (isTrue ? '0 4px 12px rgba(22, 163, 74, 0.3)' : '0 4px 12px rgba(220, 38, 38, 0.3)')
                                          : '0 2px 8px rgba(0, 0, 0, 0.1)',
                                        transform: isSelected ? 'translateY(-1px)' : 'none'
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!isSelected) {
                                          e.currentTarget.style.borderColor = isTrue ? '#22c55e' : '#ef4444';
                                          e.currentTarget.style.backgroundColor = '#f1f5f9';
                                          e.currentTarget.style.transform = 'translateY(-1px)';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isSelected) {
                                          e.currentTarget.style.borderColor = '#cbd5e1';
                                          e.currentTarget.style.backgroundColor = '#f8fafc';
                                          e.currentTarget.style.transform = 'none';
                                        }
                                      }}
                                    >
                                      <span style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        backgroundColor: isSelected ? '#ffffff' : '#e2e8f0',
                                        color: isSelected 
                                          ? (isTrue ? '#16a34a' : '#dc2626')
                                          : '#475569',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '16px',
                                        flexShrink: 0,
                                        border: '2px solid ' + (isSelected ? '#ffffff' : '#cbd5e1')
                                      }}>
                                        {isTrue ? '✓' : '✗'}
                                      </span>
                                      <span style={{ flex: 1, textAlign: 'left' }}>{option}</span>
                                      {isSelected && (
                                        <span style={{
                                          color: '#ffffff',
                                          fontSize: '20px',
                                          fontWeight: 'bold'
                                        }}>✓</span>
                                      )}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          {question.type === 'open_ended' && (
                            <div className="space-y-3">
                              <p className="text-sm font-medium text-gray-700 mb-3">Skriv ditt svar i rutan nedan:</p>
                              <div className="answer-textarea-wrapper">
                                <textarea
                                  value={readingAnswers[currentPage]?.[index] || ''}
                                  onChange={(e) => {
                                    handleAnswerChange(currentPage, index, e.target.value);
                                  }}
                                  placeholder="Skriv ditt svar här... Du kan skriva så mycket du vill."
                                  style={{
                                    width: '100%',
                                    minHeight: '120px',
                                    padding: '16px 20px',
                                    backgroundColor: '#ffffff',
                                    color: '#1e293b',
                                    border: '3px solid #cbd5e1',
                                    borderRadius: '12px',
                                    fontSize: '16px',
                                    lineHeight: '1.6',
                                    fontFamily: 'inherit',
                                    resize: 'vertical',
                                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                                  }}
                                  onFocus={(e) => {
                                    e.target.style.borderColor = '#3b82f6';
                                    e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.2)';
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = '#cbd5e1';
                                    e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                                  }}
                                  rows={4}
                                />
                                {readingAnswers[currentPage]?.[index] && (
                                  <div style={{
                                    marginTop: '8px',
                                    padding: '8px 12px',
                                    backgroundColor: '#f0f9ff',
                                    border: '1px solid #0ea5e9',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    color: '#0369a1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}>
                                    <span>✓</span>
                                    <span>Svar sparat: {readingAnswers[currentPage]?.[index]?.length || 0} tecken</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Show general questions only if no reading questions for current page */}
                    {!(lesson.pages && lesson.pages[currentPage]?.questions && lesson.pages[currentPage]?.questions!.length > 0) &&
                      lesson.questions && lesson.questions.map((question, index) => {
                        const isAnswered = !!(generalAnswers[index]?.trim());
                        return (
                          <div key={index} className="p-4 border-b pb-4 last:border-b-0">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-bold text-lg">Uppgift {index + 1}</h3>
                              {isAnswered && <Badge variant="default" className="text-xs bg-green-500">✓ Besvarad</Badge>}
                            </div>
                            <h4 className="font-medium mb-3">
                              {question.question}
                            </h4>

                            {question.type === 'multiple_choice' && question.options && (
                              <div className="space-y-3">
                                {question.options.map((option: string, optionIndex: number) => {
                                  const optionValue = String.fromCharCode(65 + optionIndex);
                                  const isSelected = generalAnswers[index] === optionValue;

                                  return (
                                    <div key={optionIndex}>
                                      <button
                                        type="button"
                                        onClick={() => handleGeneralAnswerChange(index, optionValue)}
                                        style={{
                                          width: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '12px',
                                          padding: '12px',
                                          backgroundColor: isSelected ? '#3b82f6' : '#ffffff',
                                          color: isSelected ? '#ffffff' : '#000000',
                                          border: '2px solid ' + (isSelected ? '#3b82f6' : '#d1d5db'),
                                          borderRadius: '8px',
                                          cursor: 'pointer',
                                          fontSize: '16px'
                                        }}
                                      >
                                        <span style={{
                                          width: '24px',
                                          height: '24px',
                                          borderRadius: '50%',
                                          backgroundColor: isSelected ? '#ffffff' : '#f3f4f6',
                                          color: isSelected ? '#3b82f6' : '#000000',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontWeight: 'bold',
                                          flexShrink: '0'
                                        }}>
                                          {optionValue}
                                        </span>
                                        <span>{option}</span>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {question.type === 'true_false' && (
                              <div className="space-y-3">
                                {['Sant', 'Falskt'].map((option, optionIndex) => {
                                  const optionValue = option;
                                  const isSelected = generalAnswers[index] === optionValue;

                                  return (
                                    <div key={optionIndex}>
                                      <button
                                        type="button"
                                        onClick={() => handleGeneralAnswerChange(index, optionValue)}
                                        style={{
                                          width: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '12px',
                                          padding: '12px',
                                          backgroundColor: isSelected ? '#3b82f6' : '#ffffff',
                                          color: isSelected ? '#ffffff' : '#000000',
                                          border: '2px solid ' + (isSelected ? '#3b82f6' : '#d1d5db'),
                                          borderRadius: '8px',
                                          cursor: 'pointer',
                                          fontSize: '16px'
                                        }}
                                      >
                                        <span style={{
                                          width: '24px',
                                          height: '24px',
                                          borderRadius: '50%',
                                          backgroundColor: isSelected ? '#ffffff' : '#f3f4f6',
                                          color: isSelected ? '#3b82f6' : '#000000',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontWeight: 'bold',
                                          flexShrink: '0'
                                        }}>
                                          {option.charAt(0)}
                                        </span>
                                        <span>{option}</span>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {question.type === 'open_ended' && (
                              <div className="space-y-2">
                                <textarea
                                  value={generalAnswers[index] || ''}
                                  onChange={(e) => handleGeneralAnswerChange(index, e.target.value)}
                                  placeholder="Skriv ditt svar här..."
                                  style={{
                                    width: '100%',
                                    height: '80px',
                                    padding: '12px',
                                    backgroundColor: '#ffffff',
                                    color: '#000000',
                                    border: '2px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontFamily: 'inherit',
                                    resize: 'vertical'
                                  }}
                                  rows={3}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    }
                  </div>
                </CardContent>
              </Card>
            )}

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
                      <p className="font-medium text-primary">{definition.word}</p>
                      <p className="text-sm text-muted-foreground mt-1">{definition.definition}</p>
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