import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchIcon, BookOpen, GraduationCap, Clock, Target, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Lesson {
  id: string;
  title: string;
  description?: string;
  type: 'published_lesson' | 'reading_lesson' | 'word_class_practice' | 'custom_exercise';
  lessonType: string;
  category: string;
  wordClass?: string;
  gradeLevel?: string;
  difficulty?: string;
  subject?: string;
  estimatedDuration?: number;
  thumbnailUrl?: string;
  createdAt?: string;
}

interface LessonBrowserProps {
  onLessonSelect: (lesson: Lesson) => void;
  selectedLessons?: Lesson[];
  multiSelect?: boolean;
}

const LESSON_TYPE_LABELS = {
  'published_lesson': 'Interaktiv lektion',
  'reading_lesson': 'Läsförståelse',
  'word_class_practice': 'Ordklass övning',
  'custom_exercise': 'Anpassad övning'
};

const DIFFICULTY_LABELS = {
  'easy': 'Lätt',
  'medium': 'Medel',
  'hard': 'Svår'
};

export function LessonBrowser({ onLessonSelect, selectedLessons = [], multiSelect = false }: LessonBrowserProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedWordClass, setSelectedWordClass] = useState<string>('all');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('all');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Fetch available lessons
  const { data: lessons = [], isLoading, error } = useQuery<Lesson[]>({
    queryKey: ['/api/assignments/lessons', 
      selectedType !== 'all' ? selectedType : undefined,
      selectedWordClass !== 'all' ? selectedWordClass : undefined, 
      selectedDifficulty !== 'all' ? selectedDifficulty : undefined,
      selectedGradeLevel !== 'all' ? selectedGradeLevel : undefined,
      searchTerm || undefined
    ],
  });

  // Filter lessons by active category
  const filteredLessons = lessons?.filter(lesson => {
    if (activeCategory === 'all') return true;
    
    // Map categories to lesson types and attributes
    switch (activeCategory) {
      case 'grammar':
        return lesson.type === 'published_lesson' || lesson.type === 'word_class_practice';
      case 'reading':
        return lesson.type === 'reading_lesson';
      case 'interactive':
        return lesson.type === 'published_lesson';
      case 'custom':
        return lesson.type === 'custom_exercise';
      default:
        return true;
    }
  }) || [];

  // Get unique values for filters
  const uniqueWordClasses = Array.from(new Set(lessons?.map(l => l.wordClass).filter(Boolean))) as string[];
  const uniqueGradeLevels = Array.from(new Set(lessons?.map(l => l.gradeLevel).filter(Boolean))) as string[];

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('all');
    setSelectedDifficulty('all');
    setSelectedWordClass('all');
    setSelectedGradeLevel('all');
    setActiveCategory('all');
  };

  const hasActiveFilters = searchTerm || selectedType !== 'all' || selectedDifficulty !== 'all' || 
                         selectedWordClass !== 'all' || selectedGradeLevel !== 'all' || activeCategory !== 'all';

  const isLessonSelected = (lesson: Lesson) => {
    return selectedLessons.some(selected => selected.id === lesson.id);
  };

  const handleLessonClick = (lesson: Lesson) => {
    onLessonSelect(lesson);
  };

  if (error) {
    return (
      <div className="text-center py-8" data-testid="error-message">
        <p className="text-red-600">Kunde inte ladda lektioner. Försök igen senare.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="lesson-browser">
      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök efter lektioner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>

        {/* Category Tabs with Icons */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" data-testid="tab-all" className="flex flex-col gap-1 h-auto py-3">
              <span className="text-base">📋</span>
              <span className="text-xs">Alla</span>
            </TabsTrigger>
            <TabsTrigger value="grammar" data-testid="tab-grammar" className="flex flex-col gap-1 h-auto py-3">
              <span className="text-base">📚</span>
              <span className="text-xs">Grammatik</span>
            </TabsTrigger>
            <TabsTrigger value="reading" data-testid="tab-reading" className="flex flex-col gap-1 h-auto py-3">
              <span className="text-base">📖</span>
              <span className="text-xs">Läsförståelse</span>
            </TabsTrigger>
            <TabsTrigger value="interactive" data-testid="tab-interactive" className="flex flex-col gap-1 h-auto py-3">
              <span className="text-base">🎮</span>
              <span className="text-xs">Interaktiva</span>
            </TabsTrigger>
            <TabsTrigger value="custom" data-testid="tab-custom" className="flex flex-col gap-1 h-auto py-3">
              <span className="text-base">⚙️</span>
              <span className="text-xs">Anpassade</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-3">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-48" data-testid="select-type">
              <SelectValue placeholder="Välj lektionstyp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla typer</SelectItem>
              <SelectItem value="published_lesson">Interaktiva lektioner</SelectItem>
              <SelectItem value="reading_lesson">Läsförståelse</SelectItem>
              <SelectItem value="word_class_practice">Ordklass övningar</SelectItem>
              <SelectItem value="custom_exercise">Anpassade övningar</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
            <SelectTrigger className="w-32" data-testid="select-difficulty">
              <SelectValue placeholder="Svårighetsgrad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla nivåer</SelectItem>
              <SelectItem value="easy">Lätt</SelectItem>
              <SelectItem value="medium">Medel</SelectItem>
              <SelectItem value="hard">Svår</SelectItem>
            </SelectContent>
          </Select>

          {uniqueWordClasses.length > 0 && (
            <Select value={selectedWordClass} onValueChange={setSelectedWordClass}>
              <SelectTrigger className="w-40" data-testid="select-wordclass">
                <SelectValue placeholder="Ordklass" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla ordklasser</SelectItem>
                {uniqueWordClasses.map(wordClass => (
                  <SelectItem key={wordClass} value={wordClass}>{wordClass}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {uniqueGradeLevels.length > 0 && (
            <Select value={selectedGradeLevel} onValueChange={setSelectedGradeLevel}>
              <SelectTrigger className="w-32" data-testid="select-grade">
                <SelectValue placeholder="Årskurs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla årskurser</SelectItem>
                {uniqueGradeLevels.map(grade => (
                  <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasActiveFilters && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearFilters}
              data-testid="button-clear-filters"
            >
              <X className="h-4 w-4 mr-2" />
              Rensa filter
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8" data-testid="loading-message">
            <p>Laddar lektioner...</p>
          </div>
        ) : filteredLessons.length === 0 ? (
          <div className="text-center py-8" data-testid="no-results">
            <p className="text-muted-foreground">
              {hasActiveFilters 
                ? 'Inga lektioner matchar dina filterkriterier.' 
                : 'Inga lektioner tillgängliga.'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground" data-testid="text-results-count">
                {filteredLessons.length} {filteredLessons.length === 1 ? 'lektion' : 'lektioner'} hittade
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLessons.map((lesson) => (
                <Card 
                  key={lesson.id} 
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    isLessonSelected(lesson) && "ring-2 ring-primary border-primary"
                  )}
                  onClick={() => handleLessonClick(lesson)}
                  data-testid={`card-lesson-${lesson.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-base line-clamp-2" data-testid={`text-lesson-title-${lesson.id}`}>
                          {lesson.title}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {LESSON_TYPE_LABELS[lesson.type] || lesson.lessonType}
                          </Badge>
                        </CardDescription>
                      </div>
                      {isLessonSelected(lesson) && (
                        <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {lesson.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {lesson.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {lesson.category && (
                        <Badge variant="outline" className="text-xs">
                          {lesson.category}
                        </Badge>
                      )}
                      {lesson.difficulty && (
                        <Badge variant="outline" className="text-xs">
                          <Target className="h-3 w-3 mr-1" />
                          {DIFFICULTY_LABELS[lesson.difficulty as keyof typeof DIFFICULTY_LABELS] || lesson.difficulty}
                        </Badge>
                      )}
                      {lesson.gradeLevel && (
                        <Badge variant="outline" className="text-xs">
                          <GraduationCap className="h-3 w-3 mr-1" />
                          {lesson.gradeLevel}
                        </Badge>
                      )}
                    </div>
                    
                    {lesson.estimatedDuration && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {lesson.estimatedDuration} min
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}