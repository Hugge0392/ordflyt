import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ChevronDown, Settings } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AccessibilitySidebar, type AccessibilitySettings } from '@/components/accessibility-sidebar';

interface Question {
  question: string;
  type: 'multiple-choice' | 'true-false' | 'open';
  alternatives?: string[];
}

interface Page {
  content: string;
  questions?: Question[];
}

interface ReadingLesson {
  id: string;
  title: string;
  description?: string;
  pages: Page[];
  questions?: Question[]; // Final questions
  wordDefinitions?: {
    word: string;
    definition: string;
  }[];
}

export function ReadingLessonViewer() {
  const [location, setLocation] = useLocation();
  const pathParts = location.split('/');
  const lessonId = pathParts[pathParts.length - 1];
  
  // State for tracking active page based on scroll position
  const [activePage, setActivePage] = useState(0);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilitySettings>({
    backgroundColor: '#ffffff',
    textColor: '#000000',
    fontSize: 'text-base'
  });

  // Track all answers: readingAnswers[pageIndex][questionIndex] = answer
  const [readingAnswers, setReadingAnswers] = useState<{ [pageIndex: number]: { [questionIndex: number]: string } }>({});
  const [collapsedQuestions, setCollapsedQuestions] = useState(new Set<string>());
  const [animatingQuestions, setAnimatingQuestions] = useState(new Set<string>());
  const [activeTextQuestion, setActiveTextQuestion] = useState<string | null>(null);

  // Refs for page elements
  const pageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const { data: lesson } = useQuery<ReadingLesson>({
    queryKey: ['/api/reading-lessons', lessonId],
    enabled: !!lessonId
  });

  const accessibilityColors = {
    backgroundColor: accessibilitySettings.backgroundColor,
    textColor: accessibilitySettings.textColor
  };

  // Determine which page is currently visible based on scroll position
  const getCurrentActivePage = (): number => {
    if (!lesson?.pages) return 0;
    
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const currentPosition = scrollTop + windowHeight / 2;
    
    let currentPage = 0;
    for (let i = 0; i < lesson.pages.length; i++) {
      const pageElement = pageRefs.current[i];
      if (pageElement) {
        const pageTop = pageElement.offsetTop;
        const pageBottom = pageTop + pageElement.offsetHeight;
        
        if (currentPosition >= pageTop && currentPosition <= pageBottom) {
          currentPage = i;
          break;
        } else if (currentPosition > pageBottom) {
          currentPage = i + 1;
        }
      }
    }
    
    return Math.min(currentPage, lesson.pages.length - 1);
  };

  // Update active page on scroll
  useEffect(() => {
    const handleScroll = () => {
      setActivePage(getCurrentActivePage());
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lesson]);

  // Check if all questions for a specific page are answered
  const areAllQuestionsAnsweredForPage = (pageIndex: number): boolean => {
    const page = lesson?.pages[pageIndex];
    if (!page?.questions || page.questions.length === 0) return true;
    
    return page.questions.every((_, questionIndex) => {
      const answer = readingAnswers[pageIndex]?.[questionIndex];
      return answer && answer.trim().length > 0;
    });
  };

  // Check if all reading questions (all pages) are answered
  const areAllReadingQuestionsAnswered = (): boolean => {
    if (!lesson?.pages) return false;
    return lesson.pages.every((_, pageIndex) => areAllQuestionsAnsweredForPage(pageIndex));
  };

  // Handle answer changes
  const handleAnswerChange = (pageIndex: number, questionIndex: number, value: string, shouldCollapse: boolean = false) => {
    setReadingAnswers(prev => ({
      ...prev,
      [pageIndex]: {
        ...prev[pageIndex],
        [questionIndex]: value
      }
    }));

    if (shouldCollapse) {
      const questionKey = pageIndex === -1 ? `final-${questionIndex}` : `${pageIndex}-${questionIndex}`;
      
      // Trigger animation
      setAnimatingQuestions(prev => new Set([...prev, questionKey]));
      
      setTimeout(() => {
        setCollapsedQuestions(prev => new Set([...prev, questionKey]));
        setAnimatingQuestions(prev => {
          const newSet = new Set(prev);
          newSet.delete(questionKey);
          return newSet;
        });
      }, 600);
    }
  };

  // Handle text field focus
  const handleTextFieldFocus = (pageIndex: number, questionIndex: number) => {
    const questionKey = pageIndex === -1 ? `final-${questionIndex}` : `${pageIndex}-${questionIndex}`;
    setActiveTextQuestion(questionKey);
  };

  // Handle text answer completion
  const handleTextAnswerComplete = (pageIndex: number, questionIndex: number) => {
    const currentAnswer = readingAnswers[pageIndex]?.[questionIndex];
    if (currentAnswer && currentAnswer.trim().length > 0) {
      setActiveTextQuestion(null);
      handleAnswerChange(pageIndex, questionIndex, currentAnswer, true);
    }
  };

  // Expand a collapsed question
  const expandQuestion = (pageIndex: number, questionIndex: number) => {
    const questionKey = pageIndex === -1 ? `final-${questionIndex}` : `${pageIndex}-${questionIndex}`;
    setCollapsedQuestions(prev => {
      const newSet = new Set(prev);
      newSet.delete(questionKey);
      return newSet;
    });
  };

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Laddar lektion...</h2>
          <p className="text-gray-600">Vänligen vänta medan vi hämtar innehållet.</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen" style={{ backgroundColor: accessibilityColors.backgroundColor, color: accessibilityColors.textColor }}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setLocation('/reading')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Tillbaka
                </Button>
                <div>
                  <h1 className="text-xl font-bold">{lesson.title}</h1>
                  {lesson.description && (
                    <p className="text-sm text-gray-600">{lesson.description}</p>
                  )}
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAccessibility(!showAccessibility)}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Tillgänglighet
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Accessibility Sidebar */}
          <AccessibilitySidebar 
            isOpen={showAccessibility}
            onClose={() => setShowAccessibility(false)}
            settings={accessibilitySettings}
            onSettingsChange={setAccessibilitySettings}
          />

          {/* Main Content */}
          <div className="grid grid-cols-1 md:landscape:grid-cols-3 lg:grid-cols-3 gap-6 lg:items-start mb-6">
            {/* Main Content - Left Column (takes 2/3 of space) */}
            <Card className="mb-6 md:landscape:mb-0 lg:mb-0 md:landscape:col-span-2 lg:col-span-2 reading-content">
              <CardHeader>
                <CardTitle className="text-2xl">{lesson.title}</CardTitle>
                {lesson.description && (
                  <CardDescription className="text-lg">{lesson.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className={`space-y-8 ${accessibilitySettings.fontSize}`} style={{ color: accessibilityColors.textColor }}>
                  {lesson.pages.map((page, pageIndex) => (
                    <div 
                      key={pageIndex}
                      ref={el => pageRefs.current[pageIndex] = el}
                      className="page-content"
                    >
                      {/* Page Break - Only show if not first page */}
                      {pageIndex > 0 && (
                        <div className="flex items-center gap-4 my-8">
                          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                          <div className="px-4 py-2 bg-blue-50 rounded-full border border-blue-200">
                            <span className="text-sm font-medium text-blue-700">Sida {pageIndex + 1}</span>
                          </div>
                          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                        </div>
                      )}
                      
                      {/* Page Content */}
                      <div 
                        className="prose prose-lg max-w-none leading-relaxed"
                        style={{ color: accessibilityColors.textColor }}
                        dangerouslySetInnerHTML={{ __html: page.content }}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Questions - Right Column */}
            {((lesson.pages && lesson.pages.some(page => page?.questions && page.questions.length > 0)) || 
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
                    {areAllReadingQuestionsAnswered() 
                      ? 'Förståelsefrågor om hela texten' 
                      : `Frågor för Avsnitt ${activePage + 1}`}
                  </CardTitle>
                  <CardDescription style={{ color: accessibilityColors.textColor }}>
                    {areAllReadingQuestionsAnswered() 
                      ? 'Svara på frågorna för att kontrollera din förståelse av hela texten'
                      : 'Svara på frågorna för denna sida'}
                  </CardDescription>
                  
                  {/* Progress indicator */}
                  {!areAllReadingQuestionsAnswered() && lesson?.pages && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between text-sm text-blue-700 mb-2">
                        <span>Framsteg</span>
                        <span>{lesson.pages.filter((_, index) => areAllQuestionsAnsweredForPage(index)).length} av {lesson.pages.length} avsnitt klara</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2 relative progress-bar">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
                          style={{ 
                            width: `${(lesson.pages.filter((_, index) => areAllQuestionsAnsweredForPage(index)).length / lesson.pages.length) * 100}%` 
                          }}
                        />
                        <div className="absolute inset-0 overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Completion indicator */}
                  {areAllReadingQuestionsAnswered() && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <div className="text-green-600">✓</div>
                        <span>Läsning klar - Nu är det dags för slutfrågorna!</span>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Phase 1: Show reading questions for current active page only */}
                    {!areAllReadingQuestionsAnswered() && lesson.pages && (() => {
                      const page = lesson.pages[activePage];
                      
                      if (!page?.questions || page.questions.length === 0) {
                        return (
                          <div className="p-4 text-center text-gray-500">
                            <p>Inga frågor för detta avsnitt. Scrolla vidare för att fortsätta läsa.</p>
                          </div>
                        );
                      }
                      
                      return page.questions.map((question, questionIndex) => {
                        const isAnswered = !!(readingAnswers[activePage]?.[questionIndex]?.trim());
                        const questionKey = `${activePage}-${questionIndex}`;
                        const isCollapsed = collapsedQuestions.has(questionKey);
                        const isAnimating = animatingQuestions.has(questionKey);
                        
                        return (
                          <div 
                            key={`reading-${activePage}-${questionIndex}`} 
                            data-question-key={questionKey}
                            className={`border-b pb-4 last:border-b-0 transition-all duration-600 ease-in-out ${
                              isAnimating ? 'animate-pulse scale-95 ring-4 ring-green-300' : ''
                            } ${isCollapsed ? 'p-2' : 'p-4'}`}
                            style={{
                              maxHeight: isCollapsed ? '60px' : '1000px',
                              overflow: 'hidden'
                            }}
                          >
                            {isCollapsed ? (
                              // Collapsed view
                              <div 
                                className="flex items-center justify-between p-2 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                                onClick={() => expandQuestion(activePage, questionIndex)}
                              >
                                <div className="flex items-center gap-2">
                                  <Badge variant="default" className="text-xs bg-green-500">✓</Badge>
                                  <span className="text-sm font-medium text-green-700">
                                    Fråga {questionIndex + 1} - Ändra ditt svar
                                  </span>
                                </div>
                                <ChevronDown className="w-4 h-4 text-green-600" />
                              </div>
                            ) : (
                              // Expanded view
                              <>
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-bold text-lg">
                                    Uppgift {questionIndex + 1}
                                  </h3>
                                  {isAnswered && <Badge variant="default" className="text-xs bg-green-500">✓ Besvarad</Badge>}
                                </div>
                                <h4 className="font-medium mb-3">
                                  {question.question}
                                </h4>
                                
                                {question.type === 'multiple-choice' && question.alternatives && (
                                  <div className="space-y-2">
                                    {question.alternatives.map((option, optionIndex) => {
                                      const optionValue = String.fromCharCode(65 + optionIndex);
                                      const isSelected = readingAnswers[activePage]?.[questionIndex] === optionValue;
                                      
                                      return (
                                        <button
                                          key={optionIndex}
                                          onClick={() => {
                                            if (activeTextQuestion) {
                                              const [prevPageIndex, prevQuestionIndex] = activeTextQuestion.split('-').map(Number);
                                              const prevAnswer = readingAnswers[prevPageIndex]?.[prevQuestionIndex];
                                              if (prevAnswer && prevAnswer.trim().length > 0) {
                                                setActiveTextQuestion(null);
                                                handleAnswerChange(prevPageIndex, prevQuestionIndex, prevAnswer, true);
                                              }
                                            }
                                            handleAnswerChange(activePage, questionIndex, optionValue, true);
                                          }}
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
                                      const isSelected = readingAnswers[activePage]?.[questionIndex] === optionValue;
                                      
                                      return (
                                        <button
                                          key={optionIndex}
                                          onClick={() => {
                                            if (activeTextQuestion) {
                                              const [prevPageIndex, prevQuestionIndex] = activeTextQuestion.split('-').map(Number);
                                              const prevAnswer = readingAnswers[prevPageIndex]?.[prevQuestionIndex];
                                              if (prevAnswer && prevAnswer.trim().length > 0) {
                                                setActiveTextQuestion(null);
                                                handleAnswerChange(prevPageIndex, prevQuestionIndex, prevAnswer, true);
                                              }
                                            }
                                            handleAnswerChange(activePage, questionIndex, optionValue, true);
                                          }}
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
                                  <div className="space-y-3">
                                    <textarea
                                      value={readingAnswers[activePage]?.[questionIndex] || ''}
                                      onChange={(e) => handleAnswerChange(activePage, questionIndex, e.target.value, false)}
                                      onFocus={() => handleTextFieldFocus(activePage, questionIndex)}
                                      placeholder="Skriv ditt svar här..."
                                      className="w-full p-3 border rounded-lg resize-none h-20 focus:ring-2 focus:ring-blue-500"
                                      rows={3}
                                    />
                                    {readingAnswers[activePage]?.[questionIndex] && readingAnswers[activePage][questionIndex].trim().length > 0 && (
                                      <button
                                        onClick={() => handleTextAnswerComplete(activePage, questionIndex)}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                                      >
                                        Spara
                                      </button>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      });
                    })()}

                    {/* Phase 2: Show final questions when all reading questions are answered */}
                    {areAllReadingQuestionsAnswered() && lesson.questions && lesson.questions.length > 0 && (
                      <div className="space-y-4">
                        {lesson.questions.map((question, questionIndex) => {
                          const questionKey = `final-${questionIndex}`;
                          const isAnswered = !!(readingAnswers[-1]?.[questionIndex]?.trim());
                          const isCollapsed = collapsedQuestions.has(questionKey);
                          const isAnimating = animatingQuestions.has(questionKey);
                          
                          return (
                            <div 
                              key={`final-${questionIndex}`} 
                              data-question-key={questionKey}
                              className={`border-b pb-4 last:border-b-0 transition-all duration-600 ease-in-out ${
                                isAnimating ? 'animate-pulse scale-95 ring-4 ring-green-300' : ''
                              } ${isCollapsed ? 'p-2' : 'p-4'}`}
                              style={{
                                maxHeight: isCollapsed ? '60px' : '1000px',
                                overflow: 'hidden'
                              }}
                            >
                              {isCollapsed ? (
                                // Collapsed view
                                <div 
                                  className="flex items-center justify-between p-2 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                                  onClick={() => expandQuestion(-1, questionIndex)}
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge variant="default" className="text-xs bg-green-500">✓</Badge>
                                    <span className="text-sm font-medium text-green-700">
                                      Slutfråga {questionIndex + 1} - Ändra ditt svar
                                    </span>
                                  </div>
                                  <ChevronDown className="w-4 h-4 text-green-600" />
                                </div>
                              ) : (
                                // Expanded view
                                <>
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-lg text-green-800">
                                      Slutfråga {questionIndex + 1}
                                    </h3>
                                    {isAnswered && <Badge variant="default" className="text-xs bg-green-500">✓ Besvarad</Badge>}
                                  </div>
                                  <h4 className="font-medium mb-3">
                                    {question.question}
                                  </h4>
                                  
                                  {question.type === 'multiple-choice' && question.alternatives && (
                                    <div className="space-y-2">
                                      {question.alternatives.map((option, optionIndex) => {
                                        const optionValue = String.fromCharCode(65 + optionIndex);
                                        const isSelected = readingAnswers[-1]?.[questionIndex] === optionValue;
                                        
                                        return (
                                          <button
                                            key={optionIndex}
                                            onClick={() => {
                                              if (activeTextQuestion) {
                                                const [prevPageIndex, prevQuestionIndex] = activeTextQuestion.split('-').map(Number);
                                                const prevAnswer = readingAnswers[prevPageIndex]?.[prevQuestionIndex];
                                                if (prevAnswer && prevAnswer.trim().length > 0) {
                                                  setActiveTextQuestion(null);
                                                  handleAnswerChange(prevPageIndex, prevQuestionIndex, prevAnswer, true);
                                                }
                                              }
                                              handleAnswerChange(-1, questionIndex, optionValue, true);
                                            }}
                                            className={`w-full flex items-start gap-2 p-2 rounded ${
                                              isSelected 
                                                ? 'ring-2 ring-green-500 font-medium bg-green-50' 
                                                : ''
                                            }`}
                                          >
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs flex-shrink-0  ${
                                              isSelected 
                                                ? 'border-green-500 bg-green-500 text-white' 
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
                                        const isSelected = readingAnswers[-1]?.[questionIndex] === optionValue;
                                        
                                        return (
                                          <button
                                            key={optionIndex}
                                            onClick={() => {
                                              if (activeTextQuestion) {
                                                const [prevPageIndex, prevQuestionIndex] = activeTextQuestion.split('-').map(Number);
                                                const prevAnswer = readingAnswers[prevPageIndex]?.[prevQuestionIndex];
                                                if (prevAnswer && prevAnswer.trim().length > 0) {
                                                  setActiveTextQuestion(null);
                                                  handleAnswerChange(prevPageIndex, prevQuestionIndex, prevAnswer, true);
                                                }
                                              }
                                              handleAnswerChange(-1, questionIndex, optionValue, true);
                                            }}
                                            className={`w-full flex items-start gap-2 p-2 rounded ${
                                              isSelected 
                                                ? 'ring-2 ring-green-500 font-medium bg-green-50' 
                                                : ''
                                            }`}
                                          >
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs flex-shrink-0  ${
                                              isSelected 
                                                ? 'border-green-500 bg-green-500 text-white' 
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
                                    <div className="space-y-3">
                                      <textarea
                                        value={readingAnswers[-1]?.[questionIndex] || ''}
                                        onChange={(e) => handleAnswerChange(-1, questionIndex, e.target.value, false)}
                                        onFocus={() => handleTextFieldFocus(-1, questionIndex)}
                                        placeholder="Skriv ditt svar här..."
                                        className="w-full p-3 border rounded-lg resize-none h-20 focus:ring-2 focus:ring-green-500"
                                        rows={3}
                                      />
                                      {readingAnswers[-1]?.[questionIndex] && readingAnswers[-1][questionIndex].trim().length > 0 && (
                                        <button
                                          onClick={() => handleTextAnswerComplete(-1, questionIndex)}
                                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                                        >
                                          Spara
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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