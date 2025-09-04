import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BookOpen, Clock, ArrowLeft, User, Target, ChevronLeft, ChevronRight, Focus, Eye, EyeOff, Settings } from "lucide-react";
import { AccessibilitySidebar } from "@/components/ui/accessibility-sidebar";
import type { ReadingLesson, WordDefinition } from "@shared/schema";

// Simple markdown-to-HTML converter for displaying lesson content
function formatMarkdownToHTML(text: string): string {
  let html = text;
  
  // Convert headings - only at start of line followed by space
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Convert bold (**text**) - must have content between
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Convert italic (*text*) - must have content between and not interfere with bold
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  
  // Don't convert line breaks - let CSS handle with pre-wrap
  
  // Convert bullet points - only at start of line
  html = html.replace(/^- (.+)$/gm, '<ul><li>$1</li></ul>');
  
  // Clean up consecutive ul tags
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  
  return html;
}

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
  const [hoveredWord, setHoveredWord] = useState<HoveredWord | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showQuestionsInFocus, setShowQuestionsInFocus] = useState(false);
  
  // Accessibility settings state for focus mode
  const [accessibilitySettings, setAccessibilitySettings] = useState({
    fontSize: 16,
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

  // Apply focus mode accessibility settings
  useEffect(() => {
    if (isFocusMode) {
      const root = document.documentElement;
      
      // Apply font size
      root.style.setProperty('--accessibility-font-size', `${accessibilitySettings.fontSize}px`);
      
      // Apply color scheme
      const colorSchemes = {
        'black-on-white': { bg: '#FFFFFF', text: '#000000' },
        'white-on-black': { bg: '#000000', text: '#FFFFFF' },
        'black-on-light-yellow': { bg: '#FFFFCC', text: '#000000' },
        'black-on-light-blue': { bg: '#CCFFFF', text: '#000000' }
      };
      const scheme = colorSchemes[accessibilitySettings.backgroundColor] || colorSchemes['black-on-white'];
      root.style.setProperty('--accessibility-bg-color', scheme.bg);
      root.style.setProperty('--accessibility-text-color', scheme.text);
      
      // Apply font family
      const fontFamily = accessibilitySettings.fontFamily === 'dyslexia-friendly' 
        ? '"OpenDyslexic", "Comic Sans MS", cursive, sans-serif'
        : 'system-ui, -apple-system, sans-serif';
      root.style.setProperty('--accessibility-font-family', fontFamily);
      
      // Add accessibility class to reading content
      const readingContent = document.querySelector('.reading-content');
      if (readingContent) {
        readingContent.classList.add('accessibility-enhanced');
      }
      
      // Update accessibility colors state
      setAccessibilityColors({
        backgroundColor: scheme.bg,
        textColor: scheme.text
      });
    }
  }, [isFocusMode, accessibilitySettings]);

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
    <TooltipProvider>
      <div className="min-h-screen bg-background relative">
        {!isFocusMode && <AccessibilitySidebar />}
        
        {/* Focus Mode Backdrop */}
        {isFocusMode && (
          <div 
            className="fixed inset-0 bg-black/60 z-10 transition-opacity duration-300"
            onClick={() => setIsFocusMode(false)}
          />
        )}
        
        <div className={`${isFocusMode ? 'relative z-20 max-w-7xl mx-auto p-6' : 'max-w-7xl mx-auto p-6 lg:ml-80 lg:mr-4'}`}>
          {/* Header */}
          <Card className={`mb-6 focus-mode-transition ${isFocusMode ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant={isFocusMode ? "default" : "outline"} 
                        size="sm"
                        onClick={() => {
                          setIsFocusMode(!isFocusMode);
                          setShowQuestionsInFocus(false); // Reset questions visibility when toggling focus mode
                        }}
                      >
                        <Focus className="w-4 h-4 mr-2" />
                        {isFocusMode ? "Avsluta fokus" : "Fokusläge"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isFocusMode ? "Lämna fokusläge för att se alla element" : "Aktivera fokusläge för ostörd läsning"}</p>
                    </TooltipContent>
                  </Tooltip>
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
          {lesson.preReadingQuestions && lesson.preReadingQuestions.length > 0 && !isFocusMode && (
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
          <div className={`${isFocusMode ? 'flex justify-center' : 'grid grid-cols-1 md:landscape:grid-cols-3 lg:grid-cols-3 gap-6 lg:items-start'} mb-6`}>
            {/* Main Content - Left Column (takes 2/3 of space in normal mode, centered in focus mode) */}
            <Card 
              className={`${isFocusMode 
                ? 'w-full max-w-3xl transition-all duration-300' 
                : 'mb-6 md:landscape:mb-0 lg:mb-0 md:landscape:col-span-2 lg:col-span-2'} reading-content`}
              style={{ 
                backgroundColor: accessibilityColors.backgroundColor,
                color: accessibilityColors.textColor,
                '--card-text-color': accessibilityColors.textColor
              } as React.CSSProperties}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    <span>Läs texten</span>
                  </CardTitle>
                  {isFocusMode && (
                    <div className="flex gap-2">
                      {((lesson.pages && lesson.pages[currentPage]?.questions && lesson.pages[currentPage]?.questions!.length > 0) || 
                        (lesson.questions && lesson.questions.length > 0)) && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowQuestionsInFocus(!showQuestionsInFocus)}
                        >
                          {showQuestionsInFocus ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                          {showQuestionsInFocus ? "Dölj frågor" : "Visa frågor"}
                        </Button>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Settings className="w-4 h-4 mr-1" />
                            Inställningar
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-80 p-4" align="end">
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium">Textstorlek</Label>
                              <Slider
                                value={[accessibilitySettings.fontSize]}
                                onValueChange={(value) => setAccessibilitySettings(prev => ({ ...prev, fontSize: value[0] }))}
                                min={12}
                                max={24}
                                step={1}
                                className="mt-2"
                              />
                              <div className="text-xs text-muted-foreground mt-1">{accessibilitySettings.fontSize}px</div>
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
                                  <SelectItem value="white-on-black">Vit på svart</SelectItem>
                                  <SelectItem value="black-on-light-yellow">Svart på ljusgul</SelectItem>
                                  <SelectItem value="black-on-light-blue">Svart på ljusblå</SelectItem>
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
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
                    className="prose dark:prose-invert max-w-none min-h-[400px] prose-lg reading-content"
                    style={{ fontSize: '1.25rem', lineHeight: '1.8', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
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

            {/* Questions - Right Column */}
            {((lesson.pages && lesson.pages[currentPage]?.questions && lesson.pages[currentPage]?.questions!.length > 0) || 
              (lesson.questions && lesson.questions.length > 0)) && 
              (!isFocusMode || showQuestionsInFocus) && (
              <Card 
                className={`${isFocusMode 
                  ? 'fixed right-6 top-20 w-96 max-h-[80vh] z-30 transition-all duration-300 transform slide-in-right shadow-2xl' 
                  : 'md:landscape:sticky md:landscape:top-6 lg:sticky lg:top-6'}`}
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
                          
                          {question.type === 'multiple-choice' && question.alternatives && (
                            <div className="space-y-2">
                              {question.alternatives.map((option, optionIndex) => {
                                const optionValue = String.fromCharCode(65 + optionIndex);
                                const isSelected = readingAnswers[currentPage]?.[index] === optionValue;
                                
                                return (
                                  <button
                                    key={optionIndex}
                                    onClick={() => handleAnswerChange(currentPage, index, optionValue)}
                                    className={`w-full flex items-start gap-2 p-2 rounded ${
                                      isSelected 
                                        ? 'ring-2 ring-blue-500 font-medium' 
                                        : ''
                                    }`}
                                  >
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs flex-shrink-0  ${
                                      isSelected 
                                        ? 'border-blue-500 bg-blue-500 text-white' 
                                        : 'border-gray-400 bg-white text-black'
                                    }`}>
                                      {optionValue}
                                    </div>
                                    <span className="text-left">{option}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          
                          {question.type === 'true-false' && (
                            <div className="space-y-2">
                              {['Sant', 'Falskt'].map((option, optionIndex) => {
                                const optionValue = option;
                                const isSelected = readingAnswers[currentPage]?.[index] === optionValue;
                                
                                return (
                                  <button
                                    key={optionIndex}
                                    onClick={() => handleAnswerChange(currentPage, index, optionValue)}
                                    className={`w-full flex items-start gap-2 p-2 rounded ${
                                      isSelected 
                                        ? 'ring-2 ring-blue-500 font-medium' 
                                        : ''
                                    }`}
                                  >
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs flex-shrink-0  ${
                                      isSelected 
                                        ? 'border-blue-500 bg-blue-500 text-white' 
                                        : 'border-gray-400 bg-white text-black'
                                    }`}>
                                      {option.charAt(0)}
                                    </div>
                                    <span className="text-left">{option}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          
                          {question.type === 'open' && (
                            <div className="space-y-2">
                              <textarea
                                value={readingAnswers[currentPage]?.[index] || ''}
                                onChange={(e) => handleAnswerChange(currentPage, index, e.target.value)}
                                placeholder="Skriv ditt svar här..."
                                className="w-full p-3 border rounded-lg resize-none h-20"
                                rows={3}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Show general questions only if no reading questions for current page */}
                    {!(lesson.pages && lesson.pages[currentPage]?.questions && lesson.pages[currentPage]?.questions!.length > 0) && 
                     lesson.questions && lesson.questions.map((question, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-3">
                          {index + 1}. {question.question}
                        </h4>
                        
                        {question.type === 'multiple_choice' && question.options && (
                          <div className="space-y-2">
                            {question.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full border-2 border-muted-foreground flex items-center justify-center text-xs">
                                  {String.fromCharCode(65 + optionIndex)}
                                </div>
                                <span>{option}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {question.type === 'true_false' && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full border-2 border-muted-foreground flex items-center justify-center text-xs">
                                S
                              </div>
                              <span>Sant</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full border-2 border-muted-foreground flex items-center justify-center text-xs">
                                F
                              </div>
                              <span>Falskt</span>
                            </div>
                          </div>
                        )}
                        
                        {question.type === 'open_ended' && (
                          <div className="p-3 bg-muted rounded border-2 border-dashed border-muted-foreground/30">
                            <p className="text-sm text-muted-foreground">
                              Skriv ditt svar här...
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
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
    </TooltipProvider>
  );
}