import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WelcomeGuide } from "@/components/ui/welcome-guide";
import { KidsHelpTooltip } from "@/components/ui/help-tooltip";
import { HelpMenu, commonGuides } from "@/components/ui/help-menu";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
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
  Gem,
  Heart,
  Zap,
  GamepadIcon,
  Gift,
  Target
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
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setLocation('/elev/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

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

            {/* Navigation buttons with help and logout */}
            <div className="flex items-center gap-3">
              <HelpMenu
                availableGuides={commonGuides.student}
                userRole="student"
                userId={user?.id || mockStudent.id}
                forChildren={true}
                testId="student-help-menu"
              />
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
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-red-200 hover:bg-red-50 hover:border-red-300 text-red-700 hover:text-red-800"
                data-testid="button-logout"
              >
                <User className="w-4 h-4" />
                Logga ut
              </Button>
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

        {/* Kids Welcome Guide */}
        <WelcomeGuide
          guideId="student-home"
          userRole="student"
          userId={user?.id || mockStudent.id}
          title="Hej! 🌟"
          description="Här gör du roliga lektioner. Du kan också tjäna mynt!"
          badge="Superelev"
          icon={<Sparkles className="h-5 w-5" />}
          forChildren={true}
          className="mb-8"
          steps={[
            {
              icon: <BookOpen className="h-5 w-5" />,
              title: "Kul lektioner väntar! 📚",
              description: "Välj roliga lektioner som hjälper dig bli duktigare på svenska. Det är som att spela spel fast du lär dig massa!"
            },
            {
              icon: <Coins className="h-5 w-5" />,
              title: "Samla glänsande mynt! 💰",
              description: "När du klarar uppgifter får du coola mynt som du kan använda i butiken för att köpa häftiga saker!"
            },
            {
              icon: <ShoppingCart className="h-5 w-5" />,
              title: "Shoppa i butiken! 🛍️",
              description: "Använd dina mynt för att köpa nya kläder och accessoarer till din avatar. Gör dig unik och cool!"
            },
            {
              icon: <User className="h-5 w-5" />,
              title: "Piffa upp din avatar! 👤",
              description: "Gå till din profil och ändra hur din avatar ser ut. Välj kläder, frisyr och allt möjligt kul!"
            },
            {
              icon: <Trophy className="h-5 w-5" />,
              title: "Bli en stjärna! 🏆",
              description: "Ju mer du lär dig, desto fler nivåer klarar du! Visa alla hur duktig du är!"
            }
          ]}
          data-testid="student-welcome-guide"
        />

        {/* Quick stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-100 dark:from-blue-900 to-blue-200 dark:to-blue-800 border-blue-200 dark:border-blue-700">
            <CardContent className="p-4 text-center relative">
              <div className="absolute top-2 right-2">
                <KidsHelpTooltip 
                  content="Det här visar hur många lektioner du har klarat! Varje gång du slutför en lektion räknas den här. Ju fler du gör, desto smartare blir du! 🧠"
                  type="info"
                  testId="help-completed-lessons"
                />
              </div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300" data-testid="text-completed-lessons">12</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Genomförda lektioner</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-100 dark:from-purple-900 to-purple-200 dark:to-purple-800 border-purple-200 dark:border-purple-700">
            <CardContent className="p-4 text-center relative">
              <div className="absolute top-2 right-2">
                <KidsHelpTooltip 
                  content="Wow! Det här är alla mynt du har tjänat genom att vara duktig! Du kan använda mynten för att köpa coola saker i butiken! 🛍️"
                  type="tip"
                  testId="help-earned-coins"
                />
              </div>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300" data-testid="text-earned-coins">
                {currency?.totalEarned || 580}
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">Intjänade mynt</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-100 dark:from-green-900 to-green-200 dark:to-green-800 border-green-200 dark:border-green-700">
            <CardContent className="p-4 text-center relative">
              <div className="absolute top-2 right-2">
                <KidsHelpTooltip 
                  content="En streak betyder att du har gjort lektioner flera dagar i rad! Det är som att hålla elden brinnande - ju längre streak, desto mer fantastisk är du! 🔥"
                  type="help"
                  testId="help-active-streak"
                />
              </div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300" data-testid="text-active-streak">7</div>
              <div className="text-sm text-green-600 dark:text-green-400">Dagars streak</div>
            </CardContent>
          </Card>
        </div>

        {/* Featured: Vocabulary Exercises */}
        <div className="mb-8">
          <Card className="bg-gradient-to-br from-purple-100 dark:from-purple-900 to-pink-200 dark:to-pink-800 border-purple-200 dark:border-purple-700 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white shadow-lg">
                    <Type className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-purple-800 dark:text-purple-200 mb-2">
                      🎯 Ordförrådsövningar
                    </h3>
                    <p className="text-purple-700 dark:text-purple-300 mb-2">
                      Träna ord med roliga övningar! Sant/falskt, lucktext och matchning.
                    </p>
                    <div className="flex items-center gap-4 text-sm text-purple-600 dark:text-purple-400">
                      <span className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        3 övningstyper
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy className="w-4 h-4" />
                        Poäng & achievements
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-4 h-4" />
                        Kul för alla nivåer
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <Link href="/elev/ordforrad">
                    <Button 
                      size="lg" 
                      className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transition-all min-w-32"
                      data-testid="button-vocabulary-exercises"
                    >
                      <BookOpen className="w-5 h-5 mr-2" />
                      Börja träna!
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lesson Categories */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Välj en kategori
          </h2>
          
          {categories.length === 0 ? (
            <Card className="border-2 border-dashed border-purple-200 bg-purple-50/50 col-span-full">
              <CardContent className="p-12 text-center">
                <BookOpen className="h-20 w-20 text-purple-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-purple-700 mb-3">Inga lektioner ännu! 📚</h3>
                <div className="max-w-md mx-auto">
                  <p className="text-purple-600 mb-4">
                    Oj då! Det verkar som att dina lärare inte har lagt till några roliga lektioner än.
                  </p>
                  <div className="bg-white p-4 rounded-lg border border-purple-200 mb-4">
                    <h4 className="font-medium text-purple-800 mb-2 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Medan du väntar kan du:
                    </h4>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>🛍️ Kolla in butiken och se vad som finns</li>
                      <li>👤 Fixa till din profil och avatar</li>
                      <li>⭐ Utforska dina framsteg och achievements</li>
                    </ul>
                  </div>
                  <p className="text-sm text-purple-500">
                    Kom tillbaka snart så kanske det finns nya äventyr att upptäcka! ✨
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
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
                      <div className="text-center text-purple-500 text-sm py-4 bg-purple-50 rounded-lg border border-purple-200">
                        <Sparkles className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                        <h4 className="font-medium text-purple-700 mb-1">Inga äventyr här än! 🎈</h4>
                        <p className="text-xs text-purple-600">
                          Dina lärare jobbar säkert på att lägga till roliga lektioner här!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            </div>
          )}
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