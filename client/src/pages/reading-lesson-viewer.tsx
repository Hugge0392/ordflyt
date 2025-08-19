import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useState, useMemo } from "react";
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
  
  // Convert line breaks
  html = html.replace(/\n/g, '<br>');
  
  // Convert bullet points - only at start of line
  html = html.replace(/^• (.+)$/gm, '<li>$1</li>');
  
  // Group consecutive list items into ul tags
  html = html.replace(/(<li>.*?<\/li>)(<br>)*(<li>.*?<\/li>)*/g, function(match) {
    // Remove br tags between list items and wrap in ul
    const cleanedMatch = match.replace(/<br>/g, '');
    return `<ul>${cleanedMatch}</ul>`;
  });
  
  return html;
}

export default function ReadingLessonViewer() {
  const { id } = useParams<{ id: string }>();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const { data: lesson, isLoading, error } = useQuery<ReadingLesson>({
    queryKey: [`/api/reading-lessons/${id}`],
    enabled: !!id,
  });

  // Create interactive content with word definitions
  const processContentWithDefinitions = (content: string, definitions: WordDefinition[] = []) => {
    // First convert markdown to HTML
    let processedContent = formatMarkdownToHTML(content);
    
    if (!definitions.length) return processedContent;

    // Create a map of words to definitions for quick lookup
    const defMap = new Map(definitions.map(def => [def.word.toLowerCase(), def.definition]));
    
    // Process the HTML content to add tooltips to defined words
    definitions.forEach(({ word, definition }) => {
      // Create a regex that matches the word as a whole word (case insensitive)
      const regex = new RegExp(`\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
      
      // Replace with tooltip-wrapped version
      processedContent = processedContent.replace(regex, (match) => {
        return `<span class="defined-word" data-word="${word}" data-definition="${definition.replace(/"/g, '&quot;')}" style="color: #3b82f6; text-decoration: underline; text-decoration-style: dotted; cursor: help;">${match}</span>`;
      });
    });
    
    return processedContent;
  };

  const [hoveredWord, setHoveredWord] = useState<{word: string, definition: string, x: number, y: number} | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Split content into pages based on page break markers
  const pages = useMemo(() => {
    if (!lesson?.content) return [];
    
    const pageBreakMarker = '<div class="page-break" data-page-break="true">--- Sidbrytning ---</div>';
    const contentParts = lesson.content.split(pageBreakMarker);
    
    if (contentParts.length === 1) {
      // No page breaks, return single page
      return [contentParts[0]];
    }
    
    return contentParts.filter(part => part.trim().length > 0);
  }, [lesson?.content]);

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
        y: rect.top - 10
      });
    }
  };

  const handleContentMouseOut = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('defined-word')) {
      setHoveredWord(null);
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "1-3": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "4-6": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "7-9": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getDifficultyText = (level: string) => {
    switch (level) {
      case "1-3": return "Lätt";
      case "4-6": return "Medel";
      case "7-9": return "Svår";
      default: return "Okänd";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background">
          <div className="max-w-4xl mx-auto p-4">
            <Link href="/lasforstaelse/ovningar" className="text-sm text-muted-foreground hover:text-foreground">
              ← Tillbaka till övningar
            </Link>
          </div>
        </div>
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background">
          <div className="max-w-4xl mx-auto p-4">
            <Link href="/lasforstaelse/ovningar" className="text-sm text-muted-foreground hover:text-foreground">
              ← Tillbaka till övningar
            </Link>
          </div>
        </div>
        <div className="max-w-4xl mx-auto p-6">
          <Card>
            <CardContent className="text-center py-12">
              <h2 className="text-xl font-semibold mb-2">Lektion hittades inte</h2>
              <p className="text-muted-foreground mb-4">Den begärda lektionen kunde inte laddas.</p>
              <Button asChild>
                <Link href="/lasforstaelse/ovningar">Tillbaka till övningar</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
      {/* Accessibility Sidebar */}
      <AccessibilitySidebar onToggle={setSidebarOpen} />
      {/* Header */}
      <div className="border-b bg-background">
        <div className="max-w-7xl mx-auto p-4 lg:ml-80 lg:mr-4">
          <div className="flex items-center gap-3">
            <Link href="/lasforstaelse/ovningar" className="text-sm text-muted-foreground hover:text-foreground">
              ← Tillbaka till övningar
            </Link>
            <div className="w-px h-6 bg-border"></div>
            <BookOpen className="w-6 h-6" />
            <div>
              <h1 className="text-2xl font-bold">{lesson.title}</h1>
              <p className="text-sm text-muted-foreground">Läsförståelseövning</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6 lg:ml-80 lg:mr-4">
        {/* Lesson Info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={getDifficultyColor(lesson.gradeLevel)}>
                    {getDifficultyText(lesson.gradeLevel)}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {lesson.readingTime} min läsning
                  </div>
                </div>
                <CardTitle className="text-xl">{lesson.title}</CardTitle>
                {lesson.description && (
                  <CardDescription className="mt-2">{lesson.description}</CardDescription>
                )}
              </div>
              {lesson.featuredImage && (
                <div className="w-32 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                  <img 
                    src={lesson.featuredImage} 
                    alt={lesson.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
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

        {/* Two-Column Layout for Desktop/Tablet - Text takes 2/3, questions take 1/3 */}
        {/* Uses lg: for desktop (1024px+) and md: for tablet landscape (768px+) but only when orientation is landscape */}
        <div className="md:landscape:grid md:landscape:grid-cols-3 lg:grid lg:grid-cols-3 lg:gap-6 md:landscape:gap-6 lg:items-start mb-6">
          {/* Main Content - Left Column (takes 2/3 of space) */}
          <Card className="mb-6 md:landscape:mb-0 lg:mb-0 md:landscape:col-span-2 lg:col-span-2">
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
              <div 
                className="prose dark:prose-invert max-w-none min-h-[400px] prose-lg"
                style={{ fontSize: '1.25rem', lineHeight: '1.8' }}
                dangerouslySetInnerHTML={{ __html: processContentWithDefinitions(pages[currentPage] || '', lesson.wordDefinitions) }}
                onMouseOver={handleContentMouseOver}
                onMouseOut={handleContentMouseOut}
              />
              
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
                    disabled={currentPage === pages.length - 1}
                    className="flex items-center gap-2"
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
          {lesson.questions && lesson.questions.length > 0 && (
            <Card className="md:landscape:sticky md:landscape:top-6 lg:sticky lg:top-6">
              <CardHeader>
                <CardTitle className="text-lg">Förståelsefrågor</CardTitle>
                <CardDescription>
                  Svara på frågorna för att kontrollera din förståelse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 max-h-[70vh] overflow-y-auto">
                  {lesson.questions.map((question, index) => (
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