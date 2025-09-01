import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BookOpen, Clock, ArrowLeft, User, Target, ChevronLeft, ChevronRight } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      <AccessibilitySidebar />
      
      <div className="max-w-7xl mx-auto p-6 lg:ml-80 lg:mr-4">
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

        {/* Main Content with Accessibility Colors */}
        <div 
          className="md:landscape:grid md:landscape:grid-cols-3 lg:grid lg:grid-cols-3 lg:gap-6 md:landscape:gap-6 lg:items-start mb-6"
          style={{ 
            backgroundColor: accessibilityColors.backgroundColor,
            color: accessibilityColors.textColor 
          }}
        >
          {/* Main Content - Left Column (takes 2/3 of space) */}
          <Card className="mb-6 md:landscape:mb-0 lg:mb-0 md:landscape:col-span-2 lg:col-span-2 reading-content">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Läs texten</span>
                {pages.length > 1 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Sida {currentPage + 1} av {pages.length}</span>
                  </div>
                )}
              </CardTitle>
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
                  className="prose dark:prose-invert max-w-none min-h-[400px] prose-lg"
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
              
              {/* Page Navigation */}
              {pages.length > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Föregående sida
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {pages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentPage(index)}
                        className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                          index === currentPage
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))}
                    disabled={currentPage === pages.length - 1 || !areAllCurrentPageQuestionsAnswered()}
                    className="flex items-center gap-2"
                    title={!areAllCurrentPageQuestionsAnswered() ? "Svara på alla frågor innan du går vidare" : ""}
                  >
                    Nästa sida
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
            (lesson.questions && lesson.questions.length > 0)) && (
            <Card className="md:landscape:sticky md:landscape:top-6 lg:sticky lg:top-6 reading-content">
              <CardHeader>
                <CardTitle className="text-lg">
                  {lesson.pages && lesson.pages[currentPage]?.questions && lesson.pages[currentPage]?.questions!.length > 0 
                    ? 'Frågor under läsning' 
                    : 'Förståelsefrågor'}
                </CardTitle>
                <CardDescription>
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
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">Under läsning</Badge>
                          {isAnswered && <Badge variant="default" className="text-xs bg-green-500">✓ Besvarad</Badge>}
                        </div>
                        <h4 className="font-medium mb-3">
                          {index + 1}. {question.question}
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
                                  className={`w-full flex items-center gap-2 p-2 rounded transition-colors ${
                                    isSelected 
                                      ? 'ring-2 ring-blue-500 font-medium' 
                                      : 'hover:opacity-80'
                                  }`}
                                >
                                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                                    isSelected 
                                      ? 'border-blue-500 bg-blue-500 text-white' 
                                      : 'border-gray-400'
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
                                  className={`w-full flex items-center gap-2 p-2 rounded transition-colors ${
                                    isSelected 
                                      ? 'ring-2 ring-blue-500 font-medium' 
                                      : 'hover:opacity-80'
                                  }`}
                                >
                                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                                    isSelected 
                                      ? 'border-blue-500 bg-blue-500 text-white' 
                                      : 'border-gray-400'
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