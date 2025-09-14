import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LessonBrowser } from '@/components/lesson-assignment/LessonBrowser';
import { AssignmentModal } from '@/components/lesson-assignment/AssignmentModal';
import { AssignmentManager } from '@/components/lesson-assignment/AssignmentManager';
import { 
  BookOpen, 
  Users, 
  Plus, 
  BarChart3, 
  Clock, 
  Target,
  CheckCircle2,
  ArrowRight,
  Lightbulb
} from 'lucide-react';

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

export default function AssignLessonsPage() {
  const [activeTab, setActiveTab] = useState('browse');
  const [selectedLessons, setSelectedLessons] = useState<Lesson[]>([]);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  const handleLessonSelect = (lesson: Lesson) => {
    const isAlreadySelected = selectedLessons.some(selected => selected.id === lesson.id);
    
    if (isAlreadySelected) {
      // Remove lesson from selection
      setSelectedLessons(prev => prev.filter(selected => selected.id !== lesson.id));
    } else {
      // Add lesson to selection
      setSelectedLessons(prev => [...prev, lesson]);
    }
  };

  const clearSelection = () => {
    setSelectedLessons([]);
  };

  const handleAssignLessons = () => {
    if (selectedLessons.length === 0) {
      return;
    }
    setShowAssignmentModal(true);
  };

  const totalEstimatedTime = selectedLessons.reduce((sum, lesson) => sum + (lesson.estimatedDuration || 0), 0);

  return (
    <div className="container mx-auto p-6 max-w-7xl" data-testid="page-assign-lessons">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="heading-main">
          Tilldela lektioner
        </h1>
        <p className="text-muted-foreground text-lg">
          Bläddra bland tillgängliga lektioner och tilldela dem till dina elever och klasser
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Valda lektioner</p>
                <p className="text-2xl font-bold">{selectedLessons.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total tid</p>
                <p className="text-2xl font-bold">{totalEstimatedTime} min</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Olika svårighetsgrad</p>
                <p className="text-2xl font-bold">
                  {new Set(selectedLessons.map(l => l.difficulty).filter(Boolean)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Kategorier</p>
                <p className="text-2xl font-bold">
                  {new Set(selectedLessons.map(l => l.category)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Lessons Bar */}
      {selectedLessons.length > 0 && (
        <Card className="mb-6 border-primary/20 bg-primary/5" data-testid="selected-lessons-bar">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {selectedLessons.length} {selectedLessons.length === 1 ? 'lektion vald' : 'lektioner valda'}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {selectedLessons.slice(0, 3).map((lesson, index) => (
                    <Badge key={lesson.id} variant="secondary" className="text-xs">
                      {lesson.title}
                    </Badge>
                  ))}
                  {selectedLessons.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{selectedLessons.length - 3} fler
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearSelection}
                  data-testid="button-clear-selection"
                >
                  Rensa val
                </Button>
                <Button 
                  onClick={handleAssignLessons}
                  data-testid="button-assign-lessons"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tilldela lektioner
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="browse" data-testid="tab-browse">
            <BookOpen className="h-4 w-4 mr-2" />
            Bläddra lektioner
          </TabsTrigger>
          <TabsTrigger value="manage" data-testid="tab-manage">
            <BarChart3 className="h-4 w-4 mr-2" />
            Hantera uppgifter
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          {/* Getting Started Help */}
          {selectedLessons.length === 0 && (
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Kom igång med att tilldela lektioner
                    </h3>
                    <p className="text-blue-800 dark:text-blue-200 text-sm mb-3">
                      Klicka på lektioner nedan för att välja dem, sedan klicka "Tilldela lektioner" för att tilldela dem till dina elever.
                    </p>
                    <ul className="text-blue-800 dark:text-blue-200 text-sm space-y-1">
                      <li>• Använd filtren för att hitta lektioner inom specifika ämnen eller svårighetsgrader</li>
                      <li>• Välj flera lektioner samtidigt för att skapa en sammanhängande uppgift</li>
                      <li>• Du kan tilldela till hela klasser eller individuella elever</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <LessonBrowser 
            onLessonSelect={handleLessonSelect}
            selectedLessons={selectedLessons}
            multiSelect={true}
          />
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <AssignmentManager />
        </TabsContent>
      </Tabs>

      {/* Assignment Modal */}
      <AssignmentModal 
        open={showAssignmentModal}
        onOpenChange={setShowAssignmentModal}
        lessons={selectedLessons}
      />
    </div>
  );
}