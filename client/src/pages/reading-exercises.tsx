import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BookOpen, Clock, Target, Award, User, Search, Filter } from "lucide-react";
import { Link } from "wouter";
import { AccessibilityControls } from "@/components/ui/accessibility-controls";
import type { ReadingLesson } from "@shared/schema";

export default function ReadingExercises() {
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { data: lessons, isLoading, error } = useQuery<ReadingLesson[]>({
    queryKey: ["/api/reading-lessons"],
  });

  const filteredLessons = lessons?.filter(lesson => {
    const matchesLevel = selectedLevel === "all" || lesson.gradeLevel === selectedLevel;
    const matchesSearch = !searchQuery || 
      lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lesson.description && lesson.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lesson.subject && lesson.subject.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesLevel && matchesSearch && lesson.isPublished === 1;
  }) || [];

  const levels = ["1-3", "4-6", "7-9"];

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
          <div className="max-w-6xl mx-auto p-4">
            <div className="flex items-center gap-3">
              <Link href="/lasforstaelse" className="text-sm text-muted-foreground hover:text-foreground">
                ← Tillbaka till läsförståelse
              </Link>
              <div className="w-px h-6 bg-border"></div>
              <BookOpen className="w-6 h-6" />
              <div>
                <h1 className="text-2xl font-bold">Läsförståelseövningar</h1>
                <p className="text-sm text-muted-foreground">Laddar lektioner...</p>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background">
          <div className="max-w-6xl mx-auto p-4">
            <div className="flex items-center gap-3">
              <Link href="/lasforstaelse" className="text-sm text-muted-foreground hover:text-foreground">
                ← Tillbaka till läsförståelse
              </Link>
              <div className="w-px h-6 bg-border"></div>
              <BookOpen className="w-6 h-6" />
              <div>
                <h1 className="text-2xl font-bold">Läsförståelseövningar</h1>
                <p className="text-sm text-muted-foreground">Ett fel uppstod</p>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto p-6">
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-4">Kunde inte ladda lektioner. Kontrollera att servern körs.</p>
              <Button onClick={() => window.location.reload()}>Försök igen</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Accessibility Controls */}
      <AccessibilityControls />
      {/* Header */}
      <div className="border-b bg-background">
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/lasforstaelse" className="text-sm text-muted-foreground hover:text-foreground">
                ← Tillbaka till läsförståelse
              </Link>
              <div className="w-px h-6 bg-border"></div>
              <BookOpen className="w-6 h-6" />
              <div>
                <h1 className="text-2xl font-bold">Läsförståelseövningar</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredLessons.length} tillgängliga lektioner
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Sök lektioner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-lessons"
            />
          </div>

          {/* Level Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedLevel === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedLevel("all")}
              data-testid="button-filter-all"
            >
              <Filter className="w-4 h-4 mr-2" />
              Alla nivåer
            </Button>
            {levels.map(level => (
              <Button
                key={level}
                variant={selectedLevel === level ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedLevel(level)}
                data-testid={`button-filter-${level}`}
              >
                Årskurs {level}
              </Button>
            ))}
          </div>
        </div>

        {/* Lessons Grid */}
        {filteredLessons.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Inga lektioner hittades</h3>
              <p className="text-muted-foreground mb-4">
                {lessons?.length === 0 
                  ? "Det finns inga publicerade lektioner än."
                  : "Inga lektioner matchar dina sökkriterier."
                }
              </p>
              {lessons?.length === 0 && (
                <Button asChild>
                  <Link href="/lasforstaelse/admin">Skapa första lektionen</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLessons.map(lesson => (
              <Card 
                key={lesson.id} 
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => window.open(`/lasforstaelse/lektion/${lesson.id}`, '_blank')}
                data-testid={`card-lesson-${lesson.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge className={getDifficultyColor(lesson.gradeLevel)}>
                      {getDifficultyText(lesson.gradeLevel)}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {lesson.readingTime} min
                    </div>
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {lesson.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {lesson.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {lesson.featuredImage && (
                      <div className="w-full h-32 bg-muted rounded-lg overflow-hidden">
                        <img 
                          src={lesson.featuredImage} 
                          alt={lesson.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Årskurs {lesson.gradeLevel}
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {lesson.subject}
                      </div>
                    </div>

                    {lesson.preReadingQuestions && lesson.preReadingQuestions.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Award className="w-3 h-3" />
                        Förberedelseaktivitet inkluderad
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold mb-3">Så fungerar läsförståelseövningarna</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Klicka på en lektion för att börja läsa. Varje lektion innehåller en text med tillhörande frågor 
              som hjälper dig att förstå innehållet bättre. Vissa lektioner har även förberedelseaktiviteter 
              som aktiverar dina förkunskaper innan du börjar läsa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}