import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, ArrowLeft, User, Target } from "lucide-react";
import type { ReadingLesson } from "@shared/schema";

export default function ReadingLessonViewer() {
  const { id } = useParams<{ id: string }>();
  
  const { data: lesson, isLoading, error } = useQuery<ReadingLesson>({
    queryKey: [`/api/reading-lessons/${id}`],
    enabled: !!id,
  });

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="max-w-4xl mx-auto p-4">
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
      <div className="max-w-4xl mx-auto p-6">
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

        {/* Main Content */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Läs texten</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: lesson.content }}
            />
          </CardContent>
        </Card>

        {/* Questions */}
        {lesson.questions && lesson.questions.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Förståelsefrågor</CardTitle>
              <CardDescription>
                Svara på frågorna för att kontrollera din förståelse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
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