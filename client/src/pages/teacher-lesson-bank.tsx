import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { 
  BookOpen, 
  Users, 
  Eye, 
  Settings, 
  Copy,
  Clock, 
  Target,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
  Filter,
  Search,
  Star,
  Download,
  Plus,
  X,
  Send
} from 'lucide-react';
import type { LessonTemplate, LessonCategory, TeacherLessonCustomization, VocabularySet, VocabularyStatsResponse } from '@shared/schema';
import { AssignmentModal } from '@/components/lesson-assignment/AssignmentModal';
import { AssignmentManager } from '@/components/lesson-assignment/AssignmentManager';

interface SelectedTemplate {
  template: LessonTemplate;
  customizations?: Partial<TeacherLessonCustomization>;
}

interface SelectedVocabularySet {
  vocabularySet: VocabularySet;
  wordCount?: number;
  exerciseCount?: number;
}

type SelectedItem = SelectedTemplate | SelectedVocabularySet;

function isVocabularySet(item: SelectedItem): item is SelectedVocabularySet {
  return 'vocabularySet' in item;
}

// Adapter to convert selected items to AssignmentModal format
interface AssignmentModalLesson {
  id: string;
  title: string;
  type: string;
  lessonType: string;
  category?: string;
  difficulty?: string;
  estimatedDuration?: number;
}

function adaptSelectedItemsToLessons(templates: SelectedTemplate[], vocabularySets: SelectedVocabularySet[]): AssignmentModalLesson[] {
  const lessons: AssignmentModalLesson[] = [];
  
  // Add templates
  templates.forEach(item => {
    lessons.push({
      id: item.template.id,
      title: item.template.title,
      type: 'published_lesson',
      lessonType: 'Interaktiv lektion',
      category: item.template.categoryId || 'Allmänt',
      difficulty: item.template.difficulty || 'medium',
      estimatedDuration: item.template.estimatedDuration || 15
    });
  });
  
  // Add vocabulary sets
  vocabularySets.forEach(item => {
    lessons.push({
      id: item.vocabularySet.id,
      title: item.vocabularySet.title,
      type: 'vocabulary',
      lessonType: 'Ordkunskap',
      category: 'Ordkunskap',
      difficulty: 'medium',
      estimatedDuration: 15
    });
  });
  
  return lessons;
}

export default function TeacherLessonBank() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  
  const [activeTab, setActiveTab] = useState('browse');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [selectedTemplates, setSelectedTemplates] = useState<SelectedTemplate[]>([]);
  const [selectedVocabularySets, setSelectedVocabularySets] = useState<SelectedVocabularySet[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<LessonTemplate | null>(null);
  const [customizeTemplate, setCustomizeTemplate] = useState<LessonTemplate | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  
  // Get total selected count and adapted lessons
  const totalSelectedCount = selectedTemplates.length + selectedVocabularySets.length;
  const selectedLessonsForAssignment = adaptSelectedItemsToLessons(selectedTemplates, selectedVocabularySets);
  
  // Clear all selections
  const clearAllSelections = () => {
    setSelectedTemplates([]);
    setSelectedVocabularySets([]);
  };
  
  // Handle assignment modal open
  const handleOpenAssignmentModal = () => {
    if (totalSelectedCount === 0) {
      toast({
        title: 'Inga lektioner valda',
        description: 'Välj minst en lektion för att tilldela.',
        variant: 'destructive'
      });
      return;
    }
    setShowAssignmentModal(true);
  };
  
  // Handle successful assignment
  const handleAssignmentSuccess = () => {
    clearAllSelections();
    setShowAssignmentModal(false);
    toast({
      title: 'Uppgift tilldelad',
      description: 'Lektionerna har tilldelats framgångsrikt.',
    });
  };
  
  // Fetch lesson categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<LessonCategory[]>({
    queryKey: ['/api/lesson-categories'],
  });

  // Fetch lesson templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery<LessonTemplate[]>({
    queryKey: ['/api/lesson-templates'],
  });

  // Fetch vocabulary sets
  const { data: vocabularySets = [], isLoading: vocabularySetsLoading } = useQuery<VocabularySet[]>({
    queryKey: ['/api/vocabulary/sets/published'],
  });

  // Temporarily disabled vocabulary stats to debug React error
  // const vocabularySetIds = vocabularySets.map(s => s.id).join(',');
  // const { data: vocabularyStats = [], isLoading: vocabularyStatsLoading } = useQuery<VocabularyStatsResponse>({
  //   queryKey: ['/api/vocabulary/sets/stats', { ids: vocabularySetIds }],
  //   enabled: vocabularySets.length > 0,
  //   staleTime: 5 * 60 * 1000, // 5 minutes
  // });

  // // Transform stats array into convenient lookup objects
  // const vocabularyWordCounts = vocabularyStats.reduce<Record<string, number>>((acc, stat) => {
  //   acc[stat.setId] = stat.wordCount;
  //   return acc;
  // }, {});

  // const vocabularyExerciseCounts = vocabularyStats.reduce<Record<string, number>>((acc, stat) => {
  //   acc[stat.setId] = stat.exerciseCount;
  //   return acc;
  // }, {});

  // // Combined loading state
  // const wordCountsLoading = vocabularyStatsLoading;
  // const exerciseCountsLoading = vocabularyStatsLoading;

  // Temporary simple placeholders
  const vocabularyWordCounts: Record<string, number> = {};
  const vocabularyExerciseCounts: Record<string, number> = {};
  const wordCountsLoading = false;
  const exerciseCountsLoading = false;

  // Fetch teacher's existing customizations
  const { data: teacherCustomizations = [], isLoading: customizationsLoading } = useQuery<TeacherLessonCustomization[]>({
    queryKey: ['/api/teacher-lesson-customizations'],
  });

  // Get the vocabulary category ID
  const vocabularyCategoryId = categories.find(c => c.name === 'vocabulary')?.id;

  // Filter templates based on search and filters
  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = selectedCategory === 'all' || template.categoryId === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDifficulty = difficultyFilter === 'all' || template.difficulty === difficultyFilter;
    const isPublished = template.isPublished;
    
    return matchesCategory && matchesSearch && matchesDifficulty && isPublished;
  });

  // Filter vocabulary sets based on search and filters  
  const filteredVocabularySets = vocabularySets.filter((set) => {
    const matchesCategory = selectedCategory === 'all' || selectedCategory === vocabularyCategoryId;
    const matchesSearch = searchQuery === '' || 
      set.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (set.description && set.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const isPublished = set.isPublished;
    
    return matchesCategory && matchesSearch && isPublished;
  });

  // Combine both types for unified display
  const allFilteredItems = [
    ...filteredTemplates,
    ...filteredVocabularySets
  ];

  // Get category name helper
  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.swedishName || category?.name || 'Okänd kategori';
  };

  // Get difficulty text helper
  const getDifficultyText = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'Lätt';
      case 'medium': return 'Medium';
      case 'hard': return 'Svår';
      // Handle Swedish values from database
      case 'lätt': return 'Lätt';
      case 'medel': return 'Medium';
      case 'svår': return 'Svår';
      default: return difficulty || 'Medium';
    }
  };

  // Get difficulty color helper
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 border-red-200';
      // Handle Swedish values from database
      case 'lätt': return 'bg-green-100 text-green-800 border-green-200';
      case 'medel': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'svår': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Handle template selection
  const handleTemplateSelect = (template: LessonTemplate) => {
    const isSelected = selectedTemplates.some(item => item.template.id === template.id);
    
    if (isSelected) {
      setSelectedTemplates(prev => prev.filter(item => item.template.id !== template.id));
    } else {
      setSelectedTemplates(prev => [...prev, { template }]);
    }
  };

  // Handle vocabulary set selection
  const handleVocabularySetSelect = (vocabularySet: VocabularySet) => {
    const isSelected = selectedVocabularySets.some(item => item.vocabularySet.id === vocabularySet.id);
    
    if (isSelected) {
      setSelectedVocabularySets(prev => prev.filter(item => item.vocabularySet.id !== vocabularySet.id));
    } else {
      setSelectedVocabularySets(prev => [...prev, { 
        vocabularySet, 
        wordCount: vocabularyWordCounts[vocabularySet.id] || 0,
        exerciseCount: vocabularyExerciseCounts[vocabularySet.id] || 0
      }]);
    }
  };

  // Handle template customization
  const handleCustomizeTemplate = (template: LessonTemplate) => {
    setCustomizeTemplate(template);
  };

  // Save customization mutation
  const saveCustomizationMutation = useMutation({
    mutationFn: async (customization: Partial<TeacherLessonCustomization>) => {
      return apiRequest('/api/teacher-lesson-customizations', 'POST', customization);
    },
    onSuccess: () => {
      toast({
        title: "Anpassning sparad",
        description: "Din lektionsanpassning har sparats framgångsrikt.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/teacher-lesson-customizations'] });
      setCustomizeTemplate(null);
    },
    onError: (error: any) => {
      console.error('Error saving customization:', error);
      toast({
        title: "Fel",
        description: "Kunde inte spara anpassningen. Försök igen.",
        variant: "destructive",
      });
    },
  });

  // Clear selection
  const clearSelection = () => {
    setSelectedTemplates([]);
    setSelectedVocabularySets([]);
  };

  // Calculate total estimated time
  const totalEstimatedTime = selectedTemplates.reduce((sum, item) => sum + (item.template.estimatedDuration || 0), 0) +
    selectedVocabularySets.reduce((sum, item) => sum + 15, 0); // Assume 15 min per vocabulary set

  // Get unique difficulties
  const availableDifficulties = Array.from(new Set(templates.map((t) => t.difficulty).filter(Boolean)));

  // Get total selected items count
  const totalSelectedItems = selectedTemplates.length + selectedVocabularySets.length;

  if (!user || (user.role !== 'LARARE' && user.role !== 'ADMIN')) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="p-6 text-center">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Åtkomst nekad</h2>
            <p className="text-gray-600 mb-4">Du behöver vara inloggad som lärare för att komma åt lektionsbanken.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl" data-testid="page-teacher-lesson-bank">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="heading-main">
          Lektionsbank för lärare
        </h1>
        <p className="text-muted-foreground text-lg">
          Utforska lektionsmallar, anpassa dem för dina klasser och skapa engagerande lektioner
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
                <p className="text-2xl font-bold">{totalSelectedItems}</p>
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
                <p className="text-sm text-muted-foreground">Tillgängliga lektioner</p>
                <p className="text-2xl font-bold">{filteredTemplates.length + filteredVocabularySets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Anpassningar</p>
                <p className="text-2xl font-bold">{teacherCustomizations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Items Bar */}
      {totalSelectedCount > 0 && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {totalSelectedCount} lektion{totalSelectedCount !== 1 ? 'er' : ''} vald{totalSelectedCount !== 1 ? 'a' : ''}
                  </span>
                </div>
                <div className="flex gap-2">
                  {selectedTemplates.map((item) => (
                    <Badge key={item.template.id} variant="secondary" className="text-xs">
                      {item.template.title}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-3 w-3 ml-1 p-0 hover:bg-transparent"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTemplateSelect(item.template);
                        }}
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    </Badge>
                  ))}
                  {selectedVocabularySets.map((item) => (
                    <Badge key={item.vocabularySet.id} variant="secondary" className="text-xs">
                      {item.vocabularySet.title}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-3 w-3 ml-1 p-0 hover:bg-transparent"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVocabularySetSelect(item.vocabularySet);
                        }}
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllSelections}
                  data-testid="button-clear-selection"
                >
                  Rensa alla
                </Button>
                <Button
                  onClick={handleOpenAssignmentModal}
                  className="bg-primary hover:bg-primary/90"
                  data-testid="button-assign-lessons"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Tilldela lektioner
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="browse" data-testid="tab-browse">
            <BookOpen className="h-4 w-4 mr-2" />
            Bläddra mallar
          </TabsTrigger>
          <TabsTrigger value="assignments" data-testid="tab-assignments">
            <Users className="h-4 w-4 mr-2" />
            Hantera uppgifter
          </TabsTrigger>
          <TabsTrigger value="customizations" data-testid="tab-customizations">
            <Settings className="h-4 w-4 mr-2" />
            Mina anpassningar
          </TabsTrigger>
          <TabsTrigger value="favorites" data-testid="tab-favorites">
            <Star className="h-4 w-4 mr-2" />
            Favoriter
          </TabsTrigger>
        </TabsList>

        {/* Browse Templates Tab */}
        <TabsContent value="browse" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter och sök
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Sök mallar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="search"
                      placeholder="Sök efter titel eller beskrivning..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Kategori</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Välj kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alla kategorier</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.swedishName || category.name || ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Svårighetsgrad</Label>
                  <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                    <SelectTrigger data-testid="select-difficulty">
                      <SelectValue placeholder="Välj svårighetsgrad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alla nivåer</SelectItem>
                      {availableDifficulties.map((difficulty) => (
                        <SelectItem key={difficulty || 'none'} value={difficulty || 'none'}>
                          {getDifficultyText(difficulty || undefined)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setDifficultyFilter('all');
                    }}
                    data-testid="button-clear-filters"
                  >
                    Rensa filter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Items Bar */}
          {totalSelectedItems > 0 && (
            <Card className="border-primary bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <span className="font-medium">
                        {totalSelectedItems} lektion{totalSelectedItems !== 1 ? 'er' : ''} valda
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedTemplates.length > 0 && (
                        <Badge variant="secondary">
                          {selectedTemplates.length} mall{selectedTemplates.length !== 1 ? 'ar' : ''}
                        </Badge>
                      )}
                      {selectedVocabularySets.length > 0 && (
                        <Badge variant="secondary">
                          {selectedVocabularySets.length} ordkunskap{selectedVocabularySets.length !== 1 ? 'sset' : 'sset'}
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        {totalEstimatedTime} min total
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                      data-testid="button-clear-selection"
                    >
                      Rensa urval
                    </Button>
                    <Button
                      size="sm"
                      data-testid="button-create-from-templates"
                    >
                      Tilldela lektioner
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lesson Items Grid */}
          {(templatesLoading || vocabularySetsLoading || categoriesLoading) ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Laddar lektioner...</p>
            </div>
          ) : (filteredTemplates.length === 0 && filteredVocabularySets.length === 0) ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Inga lektioner hittades</h3>
                <p className="text-gray-600">
                  Prova att justera dina filter eller sök efter något annat.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Lesson Templates */}
              {filteredTemplates.map((template) => {
                const isSelected = selectedTemplates.some(item => item.template.id === template.id);
                const hasCustomization = teacherCustomizations.some(
                  (custom) => custom.templateId === template.id
                );

                return (
                  <Card 
                    key={`template-${template.id}`} 
                    className={`relative cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                    data-testid={`card-template-${template.id}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <BookOpen className="h-4 w-4 text-primary" />
                            <span className="text-xs text-muted-foreground font-medium">LEKTIONSMALL</span>
                          </div>
                          <CardTitle className="text-lg line-clamp-2">
                            {template.title}
                          </CardTitle>
                          <CardDescription className="line-clamp-2 mt-1">
                            {template.description || 'Ingen beskrivning'}
                          </CardDescription>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {getCategoryName(template.categoryId)}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={getDifficultyColor(template.difficulty || undefined)}
                        >
                          {getDifficultyText(template.difficulty || undefined)}
                        </Badge>
                        {hasCustomization && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            Anpassad
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {template.estimatedDuration || 0} min
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewTemplate(template);
                          }}
                          data-testid={`button-preview-${template.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Förhandsgranska
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCustomizeTemplate(template);
                          }}
                          data-testid={`button-customize-${template.id}`}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Anpassa
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {/* Vocabulary Sets */}
              {filteredVocabularySets.map((vocabularySet) => {
                const isSelected = selectedVocabularySets.some(item => item.vocabularySet.id === vocabularySet.id);
                const wordCount = vocabularyWordCounts[vocabularySet.id] || 0;
                const exerciseCount = vocabularyExerciseCounts[vocabularySet.id] || 0;

                return (
                  <Card 
                    key={`vocabulary-${vocabularySet.id}`} 
                    className={`relative cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleVocabularySetSelect(vocabularySet)}
                    data-testid={`card-vocabulary-${vocabularySet.id}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Target className="h-4 w-4 text-purple-600" />
                            <span className="text-xs text-muted-foreground font-medium">ORDKUNSKAP</span>
                          </div>
                          <CardTitle className="text-lg line-clamp-2">
                            {vocabularySet.title}
                          </CardTitle>
                          <CardDescription className="line-clamp-2 mt-1">
                            {vocabularySet.description || 'Ordkunskapsset'}
                          </CardDescription>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          Ordkunskap
                        </Badge>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {wordCount} ord
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {exerciseCount} övningar
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          15 min
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          Nivå 1-3
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Add vocabulary set preview
                          }}
                          data-testid={`button-preview-vocabulary-${vocabularySet.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Förhandsgranska
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Add vocabulary customization
                          }}
                          data-testid={`button-customize-vocabulary-${vocabularySet.id}`}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Anpassa
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Customizations Tab */}
        <TabsContent value="customizations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mina anpassningar</CardTitle>
              <CardDescription>
                Hantera dina anpassade lektionsmallar och inställningar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customizationsLoading ? (
                <p className="text-center text-muted-foreground py-8">Laddar anpassningar...</p>
              ) : teacherCustomizations.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Inga anpassningar än</h3>
                  <p className="text-gray-600 mb-4">
                    Börja anpassa lektionsmallar för att skapa personliga versioner.
                  </p>
                  <Button onClick={() => setActiveTab('browse')}>
                    Utforska mallar
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {teacherCustomizations.map((customization) => {
                    const template = templates.find((t) => t.id === customization.templateId);
                    if (!template) return null;

                    return (
                      <Card key={customization.id} className="border-l-4 border-l-primary">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold">{customization.title || template.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                Baserad på: {template.title}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline">
                                  {getCategoryName(template.categoryId)}
                                </Badge>
                                {customization.customSettings?.difficulty && (
                                  <Badge variant="outline">
                                    {getDifficultyText(customization.customSettings.difficulty)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                Visa
                              </Button>
                              <Button variant="outline" size="sm">
                                <Settings className="h-4 w-4 mr-1" />
                                Redigera
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Favorites Tab */}
        <TabsContent value="favorites" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Favoritmall ar</CardTitle>
              <CardDescription>
                Dina sparade favoriter för snabb åtkomst
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Inga favoriter än</h3>
                <p className="text-gray-600 mb-4">
                  Markera mallar som favoriter för att komma åt dem snabbt här.
                </p>
                <Button onClick={() => setActiveTab('browse')}>
                  Utforska mallar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-6">
          <AssignmentManager />
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Förhandsgranska: {previewTemplate.title}</DialogTitle>
              <DialogDescription>
                {previewTemplate.description || 'Ingen beskrivning tillgänglig'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {getCategoryName(previewTemplate.categoryId)}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={getDifficultyColor(previewTemplate.difficulty || undefined)}
                >
                  {getDifficultyText(previewTemplate.difficulty || undefined)}
                </Badge>
                <Badge variant="outline">
                  {previewTemplate.estimatedDuration || 0} min
                </Badge>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Mall innehåll</h4>
                <p className="text-sm text-gray-600">
                  Detaljerad förhandsvisning av lektionsinnehållet kommer att visas här.
                </p>
                {previewTemplate.templateData && (
                  <div className="mt-2 text-xs text-gray-500">
                    Komponenter: {Object.keys(previewTemplate.templateData.components || {}).length}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                Stäng
              </Button>
              <Button onClick={() => {
                handleTemplateSelect(previewTemplate);
                setPreviewTemplate(null);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Lägg till i urval
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Customize Modal */}
      {customizeTemplate && (
        <Dialog open={!!customizeTemplate} onOpenChange={() => setCustomizeTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Anpassa mall: {customizeTemplate.title}</DialogTitle>
              <DialogDescription>
                Skapa en personlig version av denna mall för dina klasser
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom-title">Anpassad titel</Label>
                <Input
                  id="custom-title"
                  placeholder={customizeTemplate.title}
                  data-testid="input-custom-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-description">Anpassad beskrivning</Label>
                <Textarea
                  id="custom-description"
                  placeholder={customizeTemplate.description || "Skriv en beskrivning..."}
                  rows={3}
                  data-testid="textarea-custom-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-difficulty">Anpassad svårighetsgrad</Label>
                <Select defaultValue={customizeTemplate.difficulty || 'medium'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Lätt</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Svår</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-duration">Anpassad tidsåtgång (minuter)</Label>
                <Input
                  id="custom-duration"
                  type="number"
                  defaultValue={customizeTemplate.estimatedDuration || 15}
                  min="5"
                  max="120"
                  data-testid="input-custom-duration"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="allow-student-choice">Tillåt elevval</Label>
                <Switch
                  id="allow-student-choice"
                  defaultChecked={true}
                  data-testid="switch-allow-student-choice"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCustomizeTemplate(null)}>
                Avbryt
              </Button>
              <Button
                onClick={() => {
                  // TODO: Implement save customization
                  setCustomizeTemplate(null);
                }}
                data-testid="button-save-customization"
              >
                Spara anpassning
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Assignment Modal */}
      <AssignmentModal 
        open={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        lessons={selectedLessonsForAssignment}
        onAssignmentSuccess={handleAssignmentSuccess}
      />
    </div>
  );
}