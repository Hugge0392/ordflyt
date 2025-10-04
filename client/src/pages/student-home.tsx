import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Target,
  CheckCircle,
  Clock
} from "lucide-react";
import StudentNavigation from "@/components/StudentNavigation";
import { 
  type LessonCategory, 
  type LessonTemplate, 
  type StudentCurrency,
  type VocabularySet
} from "@shared/schema";

export default function StudentHome() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeAssignmentTab, setActiveAssignmentTab] = useState<'new' | 'completed'>('new');
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
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

  // Get student ID from authenticated user
  const studentId = user?.id;
  const studentName = user?.username || 'Elev';

  // Fetch student currency - only if authenticated
  const { data: currency, isLoading: currencyLoading, error: currencyError } = useQuery<StudentCurrency>({
    queryKey: [`/api/students/${studentId}/currency`],
    enabled: isAuthenticated && !!studentId,
  });

  // Fetch student assignments (replaces lesson templates for the new design)
  const { data: assignments = [], isLoading: assignmentsLoading, error: assignmentsError } = useQuery({
    queryKey: [`/api/students/${studentId}/assignments`],
    enabled: true,
    retry: isAuthenticated ? 3 : 1, // Fewer retries if not authenticated
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fallback: Create demo assignments from published reading lessons when not authenticated
  const { data: readingLessons = [], isLoading: readingLessonsLoading } = useQuery({
    queryKey: ['/api/reading-lessons/published'],
    enabled: !isAuthenticated || assignments.length === 0,
  });

  // Create mock assignments from reading lessons for non-authenticated users
  const mockAssignments = readingLessons.slice(0, 5).map(lesson => ({
    id: lesson.id,
    title: lesson.title,
    description: lesson.description || 'En spännande läslektion att utforska!',
    assignmentType: 'reading_lesson' as const,
    timeLimit: lesson.readingTime || 15,
    teacherId: 'demo',
    classId: 'demo',
    createdAt: lesson.createdAt,
    isCompleted: false,
    dueDate: null,
    lessonId: lesson.id
  }));

  // Use real assignments if authenticated and available, otherwise use mock assignments
  const displayAssignments = isAuthenticated && assignments.length > 0 ? assignments : mockAssignments;

  // Fetch completed assignments from API
  const { data: completedAssignments = [] } = useQuery({
    queryKey: [`/api/students/${studentId}/completed-assignments`],
    enabled: true, // Enable for both authenticated and unauthenticated users
    retry: 1,
  });

  // Mock completed assignments for non-authenticated users
  const mockCompletedAssignments = [
    {
      id: "completed-1",
      title: "Grundläggande grammatik",
      description: "Lär dig om substantiv, verb och adjektiv",
      assignmentType: 'published_lesson' as const,
      timeLimit: 20,
      completedAt: new Date('2024-09-20'),
      score: 85,
      timeSpent: 1200
    },
    {
      id: "completed-2",
      title: "Ordklasser",
      description: "Identifiera olika ordklasser i texter",
      assignmentType: 'word_class_practice' as const,
      timeLimit: 15,
      completedAt: new Date('2024-09-18'),
      score: 92,
      timeSpent: 900
    }
  ];

  const displayCompletedAssignments = completedAssignments.length > 0 ? completedAssignments : mockCompletedAssignments;

  // Debug logging
  console.log('Student Home Debug:', {
    isAuthenticated,
    studentId,
    assignmentsLength: assignments.length,
    mockAssignmentsLength: mockAssignments.length,
    displayAssignmentsLength: displayAssignments.length,
    assignmentsError,
    readingLessonsLength: readingLessons.length,
    assignmentsLoading,
    readingLessonsLoading
  });

  // Show loading state while essential data is being fetched
  const isEssentialDataLoading = assignmentsLoading || (!isAuthenticated && readingLessonsLoading);

  // Fetch lesson templates for fallback (if assignments API doesn't exist yet)
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery<LessonTemplate[]>({
    queryKey: ["/api/lesson-templates"],
  });

  // Fetch vocabulary sets
  const { data: vocabularySets = [], isLoading: vocabularySetsLoading } = useQuery<VocabularySet[]>({
    queryKey: ["/api/vocabulary/sets/published"],
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

  const getVocabularySetsForCategory = (categoryId: string) => {
    const vocabularyCategory = categories.find(c => c.name === 'vocabulary');
    if (categoryId === vocabularyCategory?.id) {
      return vocabularySets;
    }
    return [];
  };

  const getTotalLessonsForCategory = (categoryId: string) => {
    return getLessonsForCategory(categoryId).length + getVocabularySetsForCategory(categoryId).length;
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

  if (categoriesLoading || lessonsLoading || vocabularySetsLoading || isEssentialDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 dark:from-blue-950 to-purple-100 dark:to-purple-900">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🎯</div>
          <div className="text-lg text-gray-600 dark:text-gray-300">
            {isEssentialDataLoading ? 'Laddar dina uppdrag...' : 'Laddar dina lektioner...'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {!isAuthenticated && readingLessonsLoading && 'Hämtar tillgängliga lektioner...'}
          </div>
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
                <AvatarImage src={undefined} />
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white font-bold">
                  {studentName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100" data-testid="text-student-name">
                  Hej, {studentName.split(' ')[0]}! 👋
                </h2>
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span data-testid="text-student-level">Nivå {currency?.level || 1}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-yellow-500" />
                    <span data-testid="text-student-coins">{currency?.currentCoins || 0} mynt</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation buttons with help and logout */}
            <div className="flex items-center gap-3">
              <HelpMenu
                availableGuides={commonGuides.student}
                userRole="student"
                userId={user?.id || ''}
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
              <span>Nivå {currency?.level || 1} framsteg</span>
              <span>{currency?.experience || 0}/{currency?.experienceToNext || 100} XP</span>
            </div>
            <Progress
              value={((currency?.experience || 0) / (currency?.experienceToNext || 100)) * 100}
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
            <CardContent className="p-4 text-center relative">
              <div className="absolute top-2 right-2">
                <KidsHelpTooltip
                  content="Det här visar hur många lektioner du har klarat! Varje gång du slutför en lektion räknas den här. Ju fler du gör, desto smartare blir du! 🧠"
                  type="info"
                  testId="help-completed-lessons"
                />
              </div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300" data-testid="text-completed-lessons">
                {displayCompletedAssignments.length}
              </div>
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
                {currency?.totalEarned || 0}
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
              <div className="text-2xl font-bold text-green-700 dark:text-green-300" data-testid="text-active-streak">
                {currency?.streak || 0}
              </div>
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

        {/* Mina Uppdrag */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Mina uppdrag
          </h2>

          {/* Tab navigation */}
          <div className="flex mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveAssignmentTab('new')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeAssignmentTab === 'new'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Clock className="w-4 h-4" />
              Nya uppdrag ({displayAssignments.length})
            </button>
            <button
              onClick={() => setActiveAssignmentTab('completed')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeAssignmentTab === 'completed'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              Slutförda ({displayCompletedAssignments.length})
            </button>
          </div>

          {/* Tab content */}
          {activeAssignmentTab === 'new' ? (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-500" />
                Nya uppdrag att göra
              </h3>

            {displayAssignments.length === 0 ? (
              <Card className="border-2 border-dashed border-green-200 bg-green-50/50">
                <CardContent className="p-8 text-center">
                  <Target className="h-16 w-16 text-green-400 mx-auto mb-4" />
                  <h4 className="text-lg font-bold text-green-700 mb-3">Inga nya uppdrag ännu! ✨</h4>
                  <p className="text-green-600 max-w-md mx-auto">
                    Dina lärare har inte gett dig några nya uppdrag än. Kom tillbaka snart för nya äventyr!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {displayAssignments.slice(0, 5).map(assignment => (
                  <Card key={assignment.id} className="hover:shadow-lg transition-all duration-300 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-green-200 dark:border-green-700 hover:border-green-300">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">Nytt uppdrag</span>
                          </div>
                          <h4 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-1">{assignment.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{assignment.description || 'En rolig lektion att utforska!'}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              {assignment.timeLimit || 15} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Coins className="w-3 h-3 text-yellow-500" />
                              10 mynt
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            className="text-xs bg-blue-100 text-blue-700 border-blue-200"
                            data-testid={`badge-assignment-${assignment.id}`}
                          >
                            {assignment.assignmentType === 'reading_lesson' ? 'Läsning' :
                             assignment.assignmentType === 'word_class_practice' ? 'Ordklass' :
                             assignment.assignmentType === 'published_lesson' ? 'Lektion' : 'Uppgift'}
                          </Badge>
                          <Link href={`/assignment/${assignment.id}`}>
                            <Button
                              className="bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all"
                              data-testid={`button-start-assignment-${assignment.id}`}
                            >
                              <Target className="w-4 h-4 mr-2" />
                              Starta uppdrag
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {assignments.length > 5 && (
                  <Card className="border-dashed border-gray-300">
                    <CardContent className="p-4 text-center">
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                        +{assignments.length - 5} fler uppdrag väntar på dig!
                      </p>
                      <Button variant="outline" className="bg-white/70 dark:bg-gray-800/70">
                        Visa alla uppdrag
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            </div>
          ) : (
            // Completed assignments tab
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Slutförda uppdrag
              </h3>

              {displayCompletedAssignments.length === 0 ? (
                <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50">
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-bold text-gray-700 mb-3">Inga slutförda uppdrag än! 📚</h4>
                    <p className="text-gray-600 max-w-md mx-auto">
                      När du slutför uppdrag kommer de att synas här så du kan se dina framsteg!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {displayCompletedAssignments.map(assignment => (
                    <Card key={assignment.id} className="bg-green-50/50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
                                Slutförd {new Date(assignment.completedAt).toLocaleDateString('sv-SE')}
                              </span>
                            </div>
                            <h4 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-1">{assignment.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{assignment.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                {assignment.timeLimit} min
                              </span>
                              <span className="flex items-center gap-1">
                                <Trophy className="w-3 h-3 text-yellow-500" />
                                {assignment.score}%
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge
                              className="text-xs bg-green-100 text-green-700 border-green-200"
                            >
                              {assignment.assignmentType === 'reading_lesson' ? 'Läsning' :
                               assignment.assignmentType === 'word_class_practice' ? 'Ordklass' :
                               assignment.assignmentType === 'published_lesson' ? 'Lektion' : 'Uppgift'}
                            </Badge>
                            <div className="text-2xl font-bold text-green-600">
                              {assignment.score >= 90 ? '🌟' : assignment.score >= 75 ? '⭐' : '✅'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Påbörjade uppdrag */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              Påbörjade uppdrag
            </h3>

            {/* Mock data för påbörjade uppdrag - detta kommer från riktig progress tracking */}
            <div className="space-y-4">
              <Card className="hover:shadow-lg transition-all duration-300 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-orange-200 dark:border-orange-700 hover:border-orange-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                        <span className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide">Påbörjad</span>
                      </div>
                      <h4 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-1">Berättelser och karaktärer</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Fortsätt där du slutade!</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          5 min kvar
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-yellow-500" />
                          65% klart
                        </span>
                      </div>
                      <Progress value={65} className="h-2" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                        Pågående
                      </Badge>
                      <Link href="/lesson/mock-lesson-1">
                        <Button
                          variant="outline"
                          className="border-orange-300 text-orange-700 hover:bg-orange-50"
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          Fortsätt
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tom state för påbörjade uppdrag */}
              <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50">
                <CardContent className="p-6 text-center">
                  <Zap className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Inga fler påbörjade uppdrag</h4>
                  <p className="text-xs text-gray-500">När du startar ett uppdrag utan att slutföra det syns det här.</p>
                </CardContent>
              </Card>
            </div>
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
                {assignments.length > 0 && (
                  <Link href={`/assignment/${assignments[0].id}`}>
                    <Button
                      size="lg"
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                      data-testid="button-start-first-assignment"
                    >
                      <Star className="w-5 h-5 mr-2" />
                      Börja med första uppdraget
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