import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BookOpen, Clock, Target, Award, User, Search, Filter, Play, Sparkles, Zap, Brain } from "lucide-react";
import { Link, useLocation } from "wouter";

import type { VocabularySet, VocabularyStatsResponse } from "@shared/schema";

export default function VocabularyLessons() {
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [, setLocation] = useLocation();

  // Fetch published vocabulary sets
  const { data: vocabularySets, isLoading: setsLoading, error } = useQuery<VocabularySet[]>({
    queryKey: ["/api/vocabulary/sets/published"],
  });

  // Efficiently fetch vocabulary stats using the new bulk stats endpoint and default fetcher
  const vocabularySetIds = vocabularySets?.map(set => set.id).join(',') || '';
  const { data: vocabularyStats = [], isLoading: statsLoading } = useQuery<VocabularyStatsResponse>({
    queryKey: ['/api/vocabulary/sets/stats', { ids: vocabularySetIds }],
    enabled: vocabularySets && vocabularySets.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Transform stats array into convenient lookup objects
  const wordCounts = vocabularyStats.reduce<Record<string, number>>((acc, stat) => {
    acc[stat.setId] = stat.wordCount;
    return acc;
  }, {});

  const exerciseCounts = vocabularyStats.reduce<Record<string, number>>((acc, stat) => {
    acc[stat.setId] = stat.exerciseCount;
    return acc;
  }, {});

  // Combined loading states
  const countsLoading = statsLoading;
  const exerciseCountsLoading = statsLoading;

  const filteredSets = vocabularySets?.filter(set => {
    const matchesSearch = !searchQuery || 
      set.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (set.description && set.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // For now, we don't have difficulty levels on vocabulary sets, so show all
    const matchesDifficulty = selectedDifficulty === "all";
    
    return matchesSearch && matchesDifficulty && set.isPublished;
  }) || [];

  const isLoading = setsLoading || countsLoading || exerciseCountsLoading;

  const getThemeColor = (themeColor?: string) => {
    if (!themeColor) return "from-blue-500 to-indigo-600";
    
    // Convert hex to gradient classes - simplified mapping
    const colorMap: Record<string, string> = {
      "#3B82F6": "from-blue-500 to-blue-600",
      "#10B981": "from-green-500 to-green-600", 
      "#F59E0B": "from-yellow-500 to-yellow-600",
      "#EF4444": "from-red-500 to-red-600",
      "#8B5CF6": "from-purple-500 to-purple-600",
      "#EC4899": "from-pink-500 to-pink-600",
    };
    
    return colorMap[themeColor] || "from-blue-500 to-indigo-600";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background">
          <div className="max-w-6xl mx-auto p-4">
            <div className="flex items-center gap-3">
              <Link href="/elev" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-home">
                ← Tillbaka till hem
              </Link>
              <div className="w-px h-6 bg-border"></div>
              <BookOpen className="w-6 h-6" />
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-page-title">Ordförrådsövningar</h1>
                <p className="text-sm text-muted-foreground">Laddar ordförrådsset...</p>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse" data-testid={`skeleton-card-${i}`}>
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
              <Link href="/elev" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-home">
                ← Tillbaka till hem
              </Link>
              <div className="w-px h-6 bg-border"></div>
              <BookOpen className="w-6 h-6" />
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-page-title">Ordförrådsövningar</h1>
                <p className="text-sm text-muted-foreground">Ett fel uppstod</p>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto p-6">
          <Card data-testid="error-message">
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-4">Kunde inte ladda ordförrådsset. Kontrollera att servern körs.</p>
              <Button onClick={() => window.location.reload()} data-testid="button-retry">Försök igen</Button>
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
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/elev" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-home">
                ← Tillbaka till hem
              </Link>
              <div className="w-px h-6 bg-border"></div>
              <BookOpen className="w-6 h-6" />
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-page-title">Ordförrådsövningar</h1>
                <p className="text-sm text-muted-foreground" data-testid="text-sets-count">
                  {filteredSets.length} tillgängliga ordförrådsset
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
              placeholder="Sök ordförrådsset..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-sets"
            />
          </div>

          {/* Info about current filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedDifficulty === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDifficulty("all")}
              data-testid="button-filter-all"
            >
              <Filter className="w-4 h-4 mr-2" />
              Alla set
            </Button>
          </div>
        </div>

        {/* Vocabulary Sets Grid */}
        {filteredSets.length === 0 ? (
          <Card data-testid="empty-state">
            <CardContent className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Inga ordförrådsset hittades</h3>
              <p className="text-muted-foreground mb-4">
                {vocabularySets?.length === 0 
                  ? "Det finns inga publicerade ordförrådsset än."
                  : "Inga set matchar dina sökkriterier."
                }
              </p>
              {vocabularySets?.length === 0 && (
                <Button asChild data-testid="button-create-first-set">
                  <Link href="/admin/vocabulary">Skapa första setet</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSets.map(set => {
              const wordCount = wordCounts[set.id] || 0;
              const exerciseCount = exerciseCounts[set.id] || 0;
              
              return (
                <Card 
                  key={set.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => setLocation(`/elev/ordforrad?setId=${set.id || ''}`)}
                  data-testid={`card-vocabulary-set-${set.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700">
                        Ordförråd
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Target className="w-3 h-3" />
                        {wordCount} ord
                      </div>
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors" data-testid={`text-set-title-${set.id}`}>
                      {set.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2" data-testid={`text-set-description-${set.id}`}>
                      {set.description || "Träna ditt ordförråd med detta set"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {set.bannerImage && (
                        <div className="w-full h-32 bg-muted rounded-lg overflow-hidden">
                          <img 
                            src={set.bannerImage} 
                            alt={set.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            data-testid={`img-set-banner-${set.id}`}
                          />
                        </div>
                      )}
                      
                      {/* Theme color preview */}
                      <div className={`w-full h-2 rounded-full bg-gradient-to-r ${getThemeColor(set.themeColor || 'blue')}`} data-testid={`theme-preview-${set.id}`}></div>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          <span data-testid={`text-word-count-${set.id}`}>{wordCount} ord</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          <span data-testid={`text-exercise-count-${set.id}`}>{exerciseCount} övningar</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-4">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/elev/ordforrad?setId=${set.id || ''}`);
                          }}
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs"
                          data-testid={`button-exercises-${set.id}`}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Övningar
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/vocabulary/flashcards/${set.id}`);
                          }}
                          size="sm"
                          className="flex-1 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
                          data-testid={`button-flashcards-${set.id}`}
                        >
                          <Zap className="w-3 h-3 mr-1" />
                          Flashcards
                        </Button>
                      </div>

                      {wordCount > 0 && (
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <Sparkles className="w-3 h-3" />
                          <span data-testid={`text-ready-indicator-${set.id}`}>Redo att övas</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold mb-3">Så fungerar ordförrådsövningarna</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Klicka på ett ordförrådsset för att börja öva. Varje set innehåller ord med definitioner och 
              interaktiva övningar som sant/falskt, lucktext och matchningsuppgifter. Träna regelbundet 
              för att förbättra ditt ordförråd!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}