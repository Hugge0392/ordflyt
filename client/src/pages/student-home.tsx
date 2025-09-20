import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  BookOpen, 
  Type, 
  FileText, 
  PenTool, 
  Hash, 
  ShoppingCart, 
  Trophy, 
  Star,
  Coins,
  User,
  Settings,
  HandHeart,
  Sparkles,
  Store,
  Home,
  Gem
} from "lucide-react";
import StudentNavigation from "@/components/StudentNavigation";
import { 
  type LessonCategory, 
  type LessonTemplate, 
  type StudentCurrency 
} from "@shared/schema";

// Mock student data - denna kommer senare från auth context
const mockStudent = {
  id: "student123",
  name: "Anna Andersson",
  avatarUrl: null,
  level: 3,
  experience: 750,
  experienceToNext: 1000
};

export default function StudentHome() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch lesson categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<LessonCategory[]>({
    queryKey: ["/api/lesson-categories"],
  });

  // Fetch student currency - enabled for exploration
  const { data: currency, isLoading: currencyLoading, error: currencyError } = useQuery<StudentCurrency>({
    queryKey: [`/api/students/${mockStudent.id}/currency`],
    enabled: true, // Enabled for exploration - will be controlled by auth context later
  });

  // Fetch lesson templates
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery<LessonTemplate[]>({
    queryKey: ["/api/lesson-templates"],
  });

  // Get icon component from string
  const getIconComponent = (iconName: string, className: string = "w-6 h-6") => {
    const iconMap = {
      BookOpen: <BookOpen className={className} />,
      Type: <Type className={className} />,
      FileText: <FileText className={className} />,
      PenTool: <PenTool className={className} />,
      Hash: <Hash className={className} />,
    };
    return iconMap[iconName as keyof typeof iconMap] || <BookOpen className={className} />;
  };

  const getLessonsForCategory = (categoryId: string) => {
    return lessons.filter(lesson => lesson.categoryId === categoryId);
  };

  const getCompletedLessonsCount = (categoryId: string) => {
    // Mock data baserat på category ID - detta kommer från riktig progress tracking
    const mockCompletions: Record<string, number> = {
      '1': 3,  // grammar
      '2': 5,  // wordclasses 
      '3': 2,  // reading
      '4': 1,  // writing
      '5': 4   // vocabulary
    };
    return mockCompletions[categoryId] || 0;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
      case 'hard': return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Lätt';
      case 'medium': return 'Medel';
      case 'hard': return 'Svår';
      default: return difficulty;
    }
  };

  // Set page title and meta description
  useEffect(() => {
    document.title = "Mina Lektioner | KlassKamp";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Utforska svensklektioner anpassade för dig. Tjäna mynt, lås upp belöningar och utveckla dina språkkunskaper på ett roligt sätt.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Utforska svensklektioner anpassade för dig. Tjäna mynt, lås upp belöningar och utveckla dina språkkunskaper på ett roligt sätt.';
      document.head.appendChild(meta);
    }
  }, []);

  if (categoriesLoading || lessonsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 dark:from-blue-950 to-purple-100 dark:to-purple-900">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🎯</div>
          <div className="text-lg text-gray-600 dark:text-gray-300">Laddar dina lektioner...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 dark:from-blue-950 via-purple-50 dark:via-purple-950 to-pink-50 dark:to-pink-950">
      {/* Header med studentinfo */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-white/20 dark:border-gray-700/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Student profile */}
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12 ring-4 ring-blue-200" data-testid="avatar-student">
                <AvatarImage src={mockStudent.avatarUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white font-bold">
                  {mockStudent.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100" data-testid="text-student-name">
                  Hej, {mockStudent.name.split(' ')[0]}! 👋
                </h2>
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span data-testid="text-student-level">Nivå {mockStudent.level}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-yellow-500" />
                    <span data-testid="text-student-coins">{currency?.currentCoins || 150} mynt</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-3">
              <Link href="/elev/butik">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-white/70 dark:bg-gray-800/70 border-gray-200 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-800"
                  data-testid="button-shop"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Butik
                </Button>
              </Link>
              <Link href="/elev/profil">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-white/70 dark:bg-gray-800/70 border-gray-200 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-800"
                  data-testid="button-profile"
                >
                  <User className="w-4 h-4 mr-2" />
                  Min Profil
                </Button>
              </Link>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 max-w-md">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Nivå {mockStudent.level} framsteg</span>
              <span>{mockStudent.experience}/{mockStudent.experienceToNext} XP</span>
            </div>
            <Progress 
              value={(mockStudent.experience / mockStudent.experienceToNext) * 100} 
              className="h-2"
              data-testid="progress-student-level"
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Välkommen till dina lektioner! ✨
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Utforska roliga lektioner, tjäna mynt och anpassa din avatar
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-100 dark:from-blue-900 to-blue-200 dark:to-blue-800 border-blue-200 dark:border-blue-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300" data-testid="text-completed-lessons">12</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Genomförda lektioner</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-100 dark:from-purple-900 to-purple-200 dark:to-purple-800 border-purple-200 dark:border-purple-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300" data-testid="text-earned-coins">
                {currency?.totalEarned || 580}
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">Intjänade mynt</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-100 dark:from-green-900 to-green-200 dark:to-green-800 border-green-200 dark:border-green-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-700 dark:text-green-300" data-testid="text-active-streak">7</div>
              <div className="text-sm text-green-600 dark:text-green-400">Dagars streak</div>
            </CardContent>
          </Card>
        </div>

        {/* Lesson Categories */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Välj en kategori
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map(category => {
              const lessonsInCategory = getLessonsForCategory(category.id);
              const completedCount = getCompletedLessonsCount(category.id);
              const totalLessons = lessonsInCategory.length;
              
              return (
                <Card 
                  key={category.id}
                  className="group hover:shadow-lg dark:hover:shadow-gray-800/50 transition-all duration-300 cursor-pointer bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-white/20 dark:border-gray-700/20"
                  onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                  data-testid={`card-category-${category.name}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: category.color || '#3B82F6' }}
                      >
                        {getIconComponent(category.icon || 'BookOpen')}
                      </div>
                      {completedCount > 0 && (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          {completedCount} klara
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl dark:text-gray-100">{category.swedishName}</CardTitle>
                    <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                      {category.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span>{totalLessons} lektioner</span>
                      {totalLessons > 0 && (
                        <span>{Math.min(100, Math.round((completedCount / totalLessons) * 100))}% klar</span>
                      )}
                    </div>
                    
                    {totalLessons > 0 && (
                      <Progress value={(completedCount / totalLessons) * 100} className="h-2 mb-3" />
                    )}

                    {/* Show lessons when category is selected */}
                    {selectedCategory === category.id && (
                      <div className="mt-4 space-y-3 border-t dark:border-gray-700 pt-4">
                        {lessonsInCategory.slice(0, 3).map(lesson => (
                          <div key={lesson.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-800 dark:text-gray-200">{lesson.title}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {lesson.estimatedDuration} min • {lesson.rewardCoins || 0} mynt
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                className={`text-xs ${getDifficultyColor(lesson.difficulty || 'medium')}`}
                                data-testid={`badge-difficulty-${lesson.id}`}
                              >
                                {getDifficultyText(lesson.difficulty || 'medium')}
                              </Badge>
                              <Link href={`/lesson/${lesson.id}`}>
                                <Button 
                                  size="sm" 
                                  className="bg-blue-500 hover:bg-blue-600 text-white"
                                  data-testid={`button-start-lesson-${lesson.id}`}
                                >
                                  Starta
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ))}
                        
                        {lessonsInCategory.length > 3 && (
                          <Button variant="outline" size="sm" className="w-full mt-2 dark:border-gray-600 dark:hover:bg-gray-700">
                            Visa alla {lessonsInCategory.length} lektioner
                          </Button>
                        )}
                      </div>
                    )}

                    {totalLessons === 0 && (
                      <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
                        <Sparkles className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                        Lektioner kommer snart!
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Call-to-action section */}
        <div className="mt-12 text-center">
          <Card className="bg-gradient-to-br from-yellow-100 dark:from-yellow-900 to-orange-200 dark:to-orange-800 border-yellow-200 dark:border-yellow-700 max-w-2xl mx-auto">
            <CardContent className="p-8">
              <div className="text-4xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
                Börja ditt lärande-äventyr!
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Genomför lektioner, tjäna mynt och lås upp coola saker för din avatar och ditt rum.
              </p>
              <div className="flex gap-4 justify-center">
                {lessons.length > 0 && (
                  <Link href={`/lesson/${lessons[0].id}`}>
                    <Button 
                      size="lg" 
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                      data-testid="button-start-first-lesson"
                    >
                      <Star className="w-5 h-5 mr-2" />
                      Börja med första lektionen
                    </Button>
                  </Link>
                )}
                <Link href="/elev/butik">
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="bg-white/70 dark:bg-gray-800/70 dark:border-gray-600 dark:hover:bg-gray-700"
                    data-testid="button-visit-shop"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Besök butiken
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}