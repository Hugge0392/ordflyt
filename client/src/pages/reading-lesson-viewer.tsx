import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReadingLesson } from "@shared/schema";

export default function ReadingLessonViewer() {
  const [match, params] = useRoute("/lasforstaelse/lektion/:id");
  const lessonId = params?.id;
  const [currentPage, setCurrentPage] = useState(0);
  const [readingFocusMode, setReadingFocusMode] = useState(false);
  const [currentReadingLine, setCurrentReadingLine] = useState(0);
  const [lineRects, setLineRects] = useState<any[]>([]);
  const [hoveredWord, setHoveredWord] = useState<any>(null);
  const [answers, setAnswers] = useState<{[key: string]: string}>({});

  const { data: lesson, isLoading } = useQuery<ReadingLesson>({
    queryKey: [`/api/reading-lessons/${lessonId}`],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laddar lektion...</p>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Lektion hittades inte</h1>
          <Link href="/lasforstaelse/ovningar">
            <Button>Tillbaka till lektioner</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Split content into pages if there are page breaks
  const pages = lesson.content ? lesson.content.split('<!-- PAGE_BREAK -->') : [''];

  // Function to process content with word definitions
  const processContentWithDefinitions = (content: string, definitions: any[]) => {
    if (!definitions || definitions.length === 0) return content;
    
    let processedContent = content;
    definitions.forEach((def) => {
      const regex = new RegExp(`\\b(${def.word})\\b`, 'gi');
      processedContent = processedContent.replace(regex, 
        `<span class="definition-word cursor-pointer underline decoration-dotted" data-word="${def.word}" data-definition="${def.definition}">$1</span>`
      );
    });
    return processedContent;
  };

  // Check if all questions for current page are answered
  const areAllCurrentPageQuestionsAnswered = () => {
    const currentPageQuestions = lesson.questions?.filter(q => q.pageNumber === currentPage) || [];
    return currentPageQuestions.every(q => answers[q.id]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/lasforstaelse/ovningar">
            <Button variant="outline" size="sm" data-testid="button-back-lessons">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Tillbaka till lektioner
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lesson.title}</h1>
            <p className="text-gray-600">{lesson.description}</p>
          </div>
        </div>

        {/* Main Reading Content */}
        <Card className="mb-6">
          <CardContent className="p-8">
            <div
              className="prose prose-lg max-w-none reading-content"
              style={{
                lineHeight: "1.8",
                fontSize: "18px",
                fontFamily: "Georgia, serif",
                color: "#333",
                overflow: "auto",
                transform: "translateZ(0)" // eget compositing-lager
              }}
              dangerouslySetInnerHTML={{
                __html: processContentWithDefinitions(
                  pages[currentPage] || "",
                  lesson.wordDefinitions,
                ),
              }}
            />

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
                  className="fixed top-4 right-4 focus-close-btn bg-black bg-opacity-60 text-white p-3 rounded-full hover:bg-opacity-80 transition-all"
                  title="Avsluta läsfokus (Esc)"
                  style={{ zIndex: 2147483648 }}
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
                    (imageUrl: string, index: number) => (
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
          </CardContent>

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
        </Card>

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
                {lesson.wordDefinitions.map((definition: any, index: number) => (
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