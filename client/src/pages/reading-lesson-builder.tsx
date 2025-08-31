import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { RichTextEditor } from "@/components/RichTextEditor";
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Plus, 
  Trash2, 
  BookOpen, 
  FileText, 
  MessageSquare, 
  Book, 
  Settings,
  Upload,
  Download,
  Copy,
  CheckCircle,
  Image,
  Globe,
  EyeOff
} from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { ReadingQuestion, ReadingLesson, WordDefinition as SchemaWordDefinition } from "@shared/schema";

interface WordDefinition {
  id: string;
  word: string;
  definition: string;
}

interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'open';
  question: string;
  alternatives?: string[];
  correctAnswer?: string | number;
  explanation?: string;
  pageNumber?: number;
}

interface PreReadingQuestion {
  id: string;
  question: string;
}

interface ReadingLesson {
  id: string;
  title: string;
  description: string;
  gradeLevel: string;
  subject: string;
  readingTime: number;
  content: string;
  featuredImage?: string;
  preReadingQuestions: PreReadingQuestion[];
  questions: Question[];
  wordDefinitions: WordDefinition[];
  isPublished: boolean;
  createdAt: string;
}

export default function ReadingLessonBuilder() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/lasforstaelse/skapa/:id");
  const lessonId = params?.id;
  
  // Main lesson state
  const [editingLesson, setEditingLesson] = useState<ReadingLesson | null>(null);
  const [localPages, setLocalPages] = useState<{ id: string; content: string; imagesAbove?: string[]; imagesBelow?: string[]; questions?: Question[] }[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  
  // UI state
  const [activeTab, setActiveTab] = useState("content");
  const [showPreview, setShowPreview] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  
  // Form states for dialogs
  const [newQuestionForm, setNewQuestionForm] = useState({
    type: 'multiple-choice' as Question['type'],
    question: '',
    alternatives: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    pageNumber: 1
  });
  
  const [newWordDefinition, setNewWordDefinition] = useState({ word: '', definition: '' });
  const [newPreReadingQuestion, setNewPreReadingQuestion] = useState('');
  
  const [newLessonForm, setNewLessonForm] = useState({
    title: '',
    description: '',
    gradeLevel: '6',
    subject: 'Svenska',
    readingTime: 10,
    featuredImage: '',
    isPublished: false,
    numberOfPages: 1
  });

  // Fetch the specific lesson based on URL parameter
  const { data: lesson, isLoading } = useQuery<ReadingLesson>({
    queryKey: ["/api/reading-lessons", lessonId],
    enabled: !!lessonId,
  });

  // Auto-load lesson when data arrives
  useEffect(() => {
    if (lesson) {
      // Extract all questions from pages and combine with global questions
      const questionsFromPages: Question[] = [];
      if ((lesson as any).pages && (lesson as any).pages.length > 0) {
        (lesson as any).pages.forEach((page: any, pageIndex: number) => {
          if (page.questions && page.questions.length > 0) {
            const pageQuestions = page.questions.map((q: any) => ({
              ...q,
              pageNumber: pageIndex + 1 // Ensure pageNumber is set correctly
            }));
            questionsFromPages.push(...pageQuestions);
          }
        });
      }
      
      // Combine questions from pages and global questions
      const allQuestions = [...questionsFromPages, ...(lesson.questions || [])];
      
      setEditingLesson({
        ...lesson,
        questions: allQuestions
      });
      
      const numberOfPages = (lesson as any)?.numberOfPages || 1;
      
      // Load pages with images if they exist, otherwise create empty pages
      if ((lesson as any).pages && (lesson as any).pages.length > 0) {
        setLocalPages((lesson as any).pages);
      } else {
        // Create empty pages based on numberOfPages
        const emptyPages = Array.from({ length: numberOfPages }, (_, index) => ({
          id: `page-${index + 1}`,
          content: '',
          imagesAbove: [],
          imagesBelow: [],
          questions: []
        }));
        setLocalPages(emptyPages);
      }
      
      // Update form with lesson data
      setNewLessonForm({
        title: lesson.title || '',
        description: lesson.description || '',
        gradeLevel: lesson.gradeLevel || '6',
        subject: lesson.subject || 'Svenska',
        readingTime: lesson.readingTime || 10,
        featuredImage: lesson.featuredImage || '',
        isPublished: lesson.isPublished === 1,
        numberOfPages: numberOfPages
      });
    }
  }, [lesson]);

  // Update pages when numberOfPages changes
  useEffect(() => {
    if (newLessonForm.numberOfPages !== localPages.length) {
      const currentPagesCount = localPages.length;
      const targetPagesCount = newLessonForm.numberOfPages;
      
      if (targetPagesCount > currentPagesCount) {
        // Add more pages
        const newPages = Array.from({ length: targetPagesCount - currentPagesCount }, (_, index) => ({
          id: `page-${currentPagesCount + index + 1}`,
          content: '',
          imagesAbove: [],
          imagesBelow: [],
          questions: []
        }));
        setLocalPages(prev => [...prev, ...newPages]);
      } else if (targetPagesCount < currentPagesCount) {
        // Remove excess pages
        setLocalPages(prev => prev.slice(0, targetPagesCount));
        // Reset page index if it's outside the new range
        if (currentPageIndex >= targetPagesCount) {
          setCurrentPageIndex(0);
        }
      }
    }
  }, [newLessonForm.numberOfPages]);

  // Update lesson mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, lesson }: { id: string, lesson: Partial<ReadingLesson> }) => {
      return apiRequest('PUT', `/api/reading-lessons/${id}`, lesson);
    },
    onSuccess: (updatedLesson) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-lessons", lessonId] });
      // Keep user in editor and sync back server truth:
      setEditingLesson(updatedLesson);
      // Update local pages if they exist in the updated lesson
      if ((updatedLesson as any).pages) {
        setLocalPages((updatedLesson as any).pages);
      }
      toast({ 
        title: "Lektion uppdaterad!", 
        description: "Ändringarna har sparats." 
      });
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera lektionen",
        variant: "destructive"
      });
    }
  });

  // Save content manually
  const handleSaveContent = async () => {
    if (!lesson || !editingLesson) return;
    
    if (localPages.length === 0 || localPages.every(page => !page.content?.trim())) {
      toast({
        title: "Ingen text att spara",
        description: "Skriv något innehåll först",
        variant: "destructive"
      });
      return;
    }

    // Combine all page content for the main content field
    const combinedContent = localPages.map(page => page.content).join('\n\n--- SIDBRYTNING ---\n\n');

    // Distribute questions to correct pages based on pageNumber
    const pagesWithQuestions = localPages.map((page, index) => {
      const pageNumber = index + 1;
      const questionsForThisPage = editingLesson.questions?.filter(q => q.pageNumber === pageNumber) || [];
      
      return {
        ...page,
        questions: questionsForThisPage
      };
    });

    await updateMutation.mutateAsync({
      id: lesson.id,
      lesson: {
        content: combinedContent,
        pages: pagesWithQuestions, // Include pages with questions distributed correctly!
        title: newLessonForm.title || lesson.title,
        gradeLevel: newLessonForm.gradeLevel || lesson.gradeLevel,
        description: newLessonForm.description || lesson.description,
        subject: newLessonForm.subject || lesson.subject,
        readingTime: newLessonForm.readingTime || lesson.readingTime,
        featuredImage: newLessonForm.featuredImage || lesson.featuredImage,
        preReadingQuestions: editingLesson.preReadingQuestions ?? [],
        questions: [], // Clear global questions since they're now distributed to pages
        wordDefinitions: editingLesson.wordDefinitions ?? [],
        isPublished: newLessonForm.isPublished ? 1 : 0, // Convert boolean to number
        numberOfPages: newLessonForm.numberOfPages
      } as Partial<ReadingLesson>
    });
  };

  // Add question
  const addQuestion = () => {
    if (!editingLesson) return;
    
    const question: Question = {
      id: Date.now().toString(),
      type: newQuestionForm.type,
      question: newQuestionForm.question,
      alternatives: newQuestionForm.type === 'multiple-choice' ? newQuestionForm.alternatives : undefined,
      correctAnswer: newQuestionForm.type === 'multiple-choice' ? newQuestionForm.correctAnswer : 
                    newQuestionForm.type === 'true-false' ? newQuestionForm.alternatives[0] : undefined,
      explanation: newQuestionForm.explanation || undefined,
      pageNumber: newQuestionForm.pageNumber
    };

    setEditingLesson({
      ...editingLesson,
      questions: [...editingLesson.questions, question]
    });

    // Reset form
    setNewQuestionForm({
      type: 'multiple-choice',
      question: '',
      alternatives: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      pageNumber: 1
    });
  };

  // Add word definition
  const addWordDefinition = () => {
    if (!editingLesson || !newWordDefinition.word.trim() || !newWordDefinition.definition.trim()) return;
    
    const definition: WordDefinition = {
      id: Date.now().toString(),
      word: newWordDefinition.word.trim(),
      definition: newWordDefinition.definition.trim()
    };

    setEditingLesson({
      ...editingLesson,
      wordDefinitions: [...editingLesson.wordDefinitions, definition]
    });

    setNewWordDefinition({ word: '', definition: '' });
  };

  // Add pre-reading question
  const addPreReadingQuestion = () => {
    if (!editingLesson || !newPreReadingQuestion.trim()) return;
    
    const question: PreReadingQuestion = {
      id: Date.now().toString(),
      question: newPreReadingQuestion.trim()
    };

    setEditingLesson({
      ...editingLesson,
      preReadingQuestions: [...editingLesson.preReadingQuestions, question]
    });

    setNewPreReadingQuestion('');
  };

  // Remove functions
  const removeQuestion = (id: string) => {
    if (!editingLesson) return;
    setEditingLesson({
      ...editingLesson,
      questions: editingLesson.questions.filter(q => q.id !== id)
    });
  };

  const removeWordDefinition = (id: string) => {
    if (!editingLesson) return;
    setEditingLesson({
      ...editingLesson,
      wordDefinitions: editingLesson.wordDefinitions.filter(w => w.id !== id)
    });
  };

  const removePreReadingQuestion = (id: string) => {
    if (!editingLesson) return;
    setEditingLesson({
      ...editingLesson,
      preReadingQuestions: editingLesson.preReadingQuestions.filter(q => q.id !== id)
    });
  };

  // Add reading question to current page
  const addReadingQuestion = () => {
    if (!newQuestionForm.question.trim() || localPages.length === 0) return;
    
    // Create the question object
    const question: Question = {
      id: Date.now().toString(),
      type: newQuestionForm.type,
      question: newQuestionForm.question.trim(),
      alternatives: newQuestionForm.type === 'multiple-choice' ? newQuestionForm.alternatives : undefined,
      correctAnswer: newQuestionForm.correctAnswer,
      explanation: newQuestionForm.explanation || undefined
    };

    // Add question to the first page (currently we only support single page)
    const updatedPages = [...localPages];
    if (updatedPages[0]) {
      updatedPages[0] = {
        ...updatedPages[0],
        questions: [...(updatedPages[0].questions || []), question]
      };
      setLocalPages(updatedPages);
    }

    // Reset form
    setNewQuestionForm({
      type: 'multiple-choice',
      question: '',
      alternatives: ['', '', '', ''],
      correctAnswer: 0,
      explanation: ''
    });
  };

  // Remove reading question from specific page
  const removeReadingQuestion = (pageId: string, questionId: string) => {
    const updatedPages = localPages.map(page => {
      if (page.id === pageId) {
        return {
          ...page,
          questions: (page.questions || []).filter(q => q.id !== questionId)
        };
      }
      return page;
    });
    setLocalPages(updatedPages);
  };

  // Handle featured image upload
  const uploadMap = useRef<Record<string, { objectPath?: string; publicURL?: string }>>({});

  const handleFeaturedImageUpload = async (file: any) => {
    try {
      const response = await fetch("/api/objects/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      
      if (!response.ok) throw new Error("Failed to get upload URL");
      
      const { uploadURL, objectPath, publicURL } = await response.json();
      
      // Save the server's path for use in onComplete
      uploadMap.current[file.name] = { objectPath, publicURL };
      
      return {
        method: "PUT" as const,
        url: uploadURL,
        headers: { "Content-Type": file.type }
      };
    } catch (error) {
      console.error("Error getting upload URL:", error);
      throw error;
    }
  };

  const handleFeaturedImageComplete = (result: any) => {
    if (result.successful && result.successful[0]) {
      const file = result.successful[0];
      
      // Use the actual path returned by the server
      const saved = uploadMap.current[file.name] || {};
      const finalUrl = saved.publicURL || saved.objectPath;
      
      if (!finalUrl) {
        // Fallback: check if the response contains the path
        const maybeFromLib = file?.response?.body?.publicURL || file?.response?.body?.objectPath;
        if (!maybeFromLib) {
          console.warn("No object path/public URL was found for uploaded file");
          return;
        }
        setNewLessonForm(prev => ({ ...prev, featuredImage: maybeFromLib }));
        toast({
          title: "Bild uppladdad!",
          description: "Utvald bild har lagts till"
        });
        return;
      }
      
      setNewLessonForm(prev => ({
        ...prev,
        featuredImage: finalUrl
      }));
      
      toast({
        title: "Bild uppladdad!",
        description: "Utvald bild har lagts till"
      });
    }
  };

  // Toggle publish status
  const handleTogglePublish = () => {
    if (!lesson || !editingLesson) return;

    const newPublishStatus = !newLessonForm.isPublished;
    
    setNewLessonForm(prev => ({
      ...prev,
      isPublished: newPublishStatus
    }));

    // Save immediately with ALL form data including featuredImage
    const updatedLesson = {
      ...editingLesson,
      ...newLessonForm,
      isPublished: newPublishStatus
    };

    updateMutation.mutate({ 
      id: lesson.id, 
      lesson: updatedLesson 
    });
  };

  // Export lesson functionality
  const handleExportLesson = async () => {
    if (!lesson) return;

    try {
      const response = await fetch(`/api/reading-lessons/${lesson.id}/export`);
      if (!response.ok) throw new Error("Failed to export");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${lesson.title.replace(/\s+/g, '-').toLowerCase()}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export lyckades!",
        description: "Lektionen har laddats ned som HTML-fil"
      });
    } catch (error) {
      toast({
        title: "Export misslyckades",
        description: "Kunde inte exportera lektionen",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/lasforstaelse">
            <Button variant="outline" size="sm" data-testid="button-back-reading-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka till läsförståelse
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-blue-600" />
              Redigera lektion
            </h1>
            <p className="text-gray-600">Avancerat verktyg för att redigera interaktiva läsövningar</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Laddar lektion...</p>
            </div>
          </div>
        ) : !lesson ? (
          <Card className="h-96">
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center">
                <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">Lektion hittades inte</h3>
                <p className="text-gray-500">Den begärda lektionen kunde inte hittas.</p>
                <Button 
                  onClick={() => setLocation("/lasforstaelse/skapa")}
                  className="mt-4"
                  data-testid="button-back-to-selector"
                >
                  Tillbaka till lektionsval
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Lesson Header */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{editingLesson?.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Årskurs {editingLesson?.gradeLevel} • {editingLesson?.subject} • {editingLesson?.readingTime} min
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowPreview(true)}
                      data-testid="button-preview-lesson"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Förhandsgranska
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowSettingsDialog(true)}
                      data-testid="button-lesson-settings"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Inställningar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleExportLesson}
                      data-testid="button-export-lesson"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Exportera
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleSaveContent}
                      disabled={updateMutation.isPending}
                      data-testid="button-save-content"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      {updateMutation.isPending ? "Sparar..." : "Spara"}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setLocation("/lasforstaelse/skapa")}
                      data-testid="button-back-to-list"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Tillbaka
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Editor Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="content" data-testid="tab-content">
                      <FileText className="w-4 h-4 mr-2" />
                      Innehåll
                    </TabsTrigger>
                    <TabsTrigger value="prereading" data-testid="tab-prereading">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Innan du läser
                    </TabsTrigger>
                    <TabsTrigger value="reading-questions" data-testid="tab-reading-questions">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Under läsning
                    </TabsTrigger>
                    <TabsTrigger value="questions" data-testid="tab-questions">
                      <Book className="w-4 h-4 mr-2" />
                      Frågor
                    </TabsTrigger>
                    <TabsTrigger value="definitions" data-testid="tab-definitions">
                      <Settings className="w-4 h-4 mr-2" />
                      Ordförklaringar
                    </TabsTrigger>
                  </TabsList>

                  {/* Content Tab */}
                  <TabsContent value="content" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Redigera text och innehåll</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Använd den avancerade textredigeraren för att skapa engagerande innehåll med bilder, formatering och sidbrytningar.
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Page Navigation */}
                          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div>
                              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                📄 Sida {currentPageIndex + 1} av {newLessonForm.numberOfPages}
                              </p>
                              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                                Varje sida har sin egen textredigerare
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                                disabled={currentPageIndex === 0}
                              >
                                ← Föregående
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPageIndex(Math.min(newLessonForm.numberOfPages - 1, currentPageIndex + 1))}
                                disabled={currentPageIndex >= newLessonForm.numberOfPages - 1}
                              >
                                Nästa →
                              </Button>
                            </div>
                          </div>

                          {/* Current Page Editor */}
                          {localPages[currentPageIndex] && (
                            <RichTextEditor
                              value={localPages[currentPageIndex].content || ''}
                              onChange={(content) => {
                                const safe = content ?? "";
                                setLocalPages(prev => {
                                  const updated = [...prev];
                                  updated[currentPageIndex] = {
                                    ...updated[currentPageIndex],
                                    content: safe
                                  };
                                  return updated;
                                });
                              }}
                              placeholder={`Skriv innehållet för sida ${currentPageIndex + 1} här...`}
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Pre-reading Questions Tab */}
                  <TabsContent value="prereading" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Innan du läser - frågor</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Skapa frågor som eleverna ska fundera på innan de läser texten
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex gap-2">
                          <Input
                            value={newPreReadingQuestion}
                            onChange={(e) => setNewPreReadingQuestion(e.target.value)}
                            placeholder="Skriv en fråga att fundera på..."
                            data-testid="input-prereading-question"
                          />
                          <Button 
                            onClick={addPreReadingQuestion}
                            disabled={!newPreReadingQuestion.trim()}
                            data-testid="button-add-prereading"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          {editingLesson?.preReadingQuestions?.map((question, index) => (
                            <div key={question.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                              <span className="font-medium text-sm">{index + 1}.</span>
                              <span className="flex-1">{question.question}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removePreReadingQuestion(question.id)}
                                data-testid={`button-remove-prereading-${question.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Reading Questions Tab - Questions that appear during reading */}
                  <TabsContent value="reading-questions" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Frågor under läsning</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Skapa frågor som eleverna svarar på medan de läser texten. Frågorna visas bredvid texten för att hjälpa eleverna hänga med.
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="p-4 border rounded-lg bg-blue-50">
                          <h4 className="font-medium mb-3 text-blue-800">Lägg till fråga för aktuell sida</h4>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Frågetyp</Label>
                                <Select 
                                  value={newQuestionForm.type} 
                                  onValueChange={(value: Question['type']) => setNewQuestionForm(prev => ({ ...prev, type: value }))}
                                >
                                  <SelectTrigger data-testid="select-reading-question-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="multiple-choice">Flerval</SelectItem>
                                    <SelectItem value="true-false">Sant/Falskt</SelectItem>
                                    <SelectItem value="open">Öppen fråga</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="p-3 border-2 border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-950">
                                <Label className="text-blue-700 dark:text-blue-300 font-semibold">📖 Vilken sida ska frågan visas på?</Label>
                                <Select 
                                  value={newQuestionForm.pageNumber?.toString() || "1"} 
                                  onValueChange={(value) => setNewQuestionForm(prev => ({ ...prev, pageNumber: parseInt(value) }))}
                                >
                                  <SelectTrigger data-testid="select-reading-question-page" className="mt-2 border-blue-300">
                                    <SelectValue placeholder="Välj sida" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: newLessonForm.numberOfPages }, (_, i) => (
                                      <SelectItem key={i + 1} value={(i + 1).toString()}>Sida {i + 1}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div>
                              <Label>Fråga</Label>
                              <Textarea
                                value={newQuestionForm.question}
                                onChange={(e) => setNewQuestionForm(prev => ({ ...prev, question: e.target.value }))}
                                placeholder="Skriv din fråga för denna del av texten..."
                                data-testid="textarea-reading-question"
                              />
                            </div>

                            {newQuestionForm.type === 'multiple-choice' && (
                              <div>
                                <Label>Svarsalternativ</Label>
                                <div className="space-y-2">
                                  {newQuestionForm.alternatives.map((alt, index) => (
                                    <div key={index} className="flex gap-2">
                                      <Input
                                        value={alt}
                                        onChange={(e) => {
                                          const newAlts = [...newQuestionForm.alternatives];
                                          newAlts[index] = e.target.value;
                                          setNewQuestionForm(prev => ({ ...prev, alternatives: newAlts }));
                                        }}
                                        placeholder={`Alternativ ${index + 1}`}
                                        data-testid={`input-reading-alt-${index}`}
                                      />
                                      {index === newQuestionForm.correctAnswer && (
                                        <Badge variant="secondary" className="self-center">Rätt svar</Badge>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setNewQuestionForm(prev => ({ ...prev, correctAnswer: index }))}
                                        className={index === newQuestionForm.correctAnswer ? "bg-green-100" : ""}
                                        data-testid={`button-reading-correct-${index}`}
                                      >
                                        ✓
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {newQuestionForm.type === 'true-false' && (
                              <div>
                                <Label>Rätt svar</Label>
                                <Select 
                                  value={String(newQuestionForm.correctAnswer)} 
                                  onValueChange={(value) => setNewQuestionForm(prev => ({ ...prev, correctAnswer: value === 'true' }))}
                                >
                                  <SelectTrigger data-testid="select-reading-true-false">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="true">Sant</SelectItem>
                                    <SelectItem value="false">Falskt</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <div>
                              <Label>Förklaring (valfritt)</Label>
                              <Textarea
                                value={newQuestionForm.explanation}
                                onChange={(e) => setNewQuestionForm(prev => ({ ...prev, explanation: e.target.value }))}
                                placeholder="Förklara varför detta är rätt svar..."
                                data-testid="textarea-reading-explanation"
                              />
                            </div>

                            <Button 
                              onClick={() => addReadingQuestion()}
                              disabled={!newQuestionForm.question.trim()}
                              data-testid="button-add-reading-question"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Lägg till fråga under läsning
                            </Button>
                          </div>
                        </div>

                        {/* Display existing reading questions */}
                        <div className="space-y-3">
                          <h4 className="font-medium">Frågor under läsning</h4>
                          {localPages.length > 0 && localPages.some(page => page.questions && page.questions.length > 0) ? (
                            localPages.map((page, pageIndex) => (
                              page.questions && page.questions.length > 0 && (
                                <div key={page.id} className="border rounded-lg p-4 bg-gray-50">
                                  <h5 className="font-medium mb-2">Sida {pageIndex + 1}</h5>
                                  <div className="space-y-2">
                                    {page.questions.map((question, qIndex) => (
                                      <div key={question.id} className="flex items-start gap-2 p-3 bg-white rounded border">
                                        <span className="font-medium text-sm">{qIndex + 1}.</span>
                                        <div className="flex-1">
                                          <p className="font-medium">{question.question}</p>
                                          <Badge variant="outline" className="mt-1">
                                            {question.type === 'multiple-choice' ? 'Flerval' : 
                                             question.type === 'true-false' ? 'Sant/Falskt' : 'Öppen'}
                                          </Badge>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeReadingQuestion(page.id, question.id)}
                                          data-testid={`button-remove-reading-${question.id}`}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            ))
                          ) : (
                            <p className="text-muted-foreground text-sm">Inga frågor under läsning har lagts till än.</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Questions Tab */}
                  <TabsContent value="questions" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Förståelsefrågor</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Skapa frågor för att testa elevernas förståelse av texten
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Add Question Form */}
                        <div className="p-4 border rounded-lg bg-gray-50">
                          <h4 className="font-medium mb-3">Lägg till ny fråga</h4>
                          <div className="space-y-3">
                            <div>
                              <Label>Frågetyp</Label>
                              <Select 
                                value={newQuestionForm.type} 
                                onValueChange={(value: Question['type']) => setNewQuestionForm(prev => ({ ...prev, type: value }))}
                              >
                                <SelectTrigger data-testid="select-question-type">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="multiple-choice">Flerval</SelectItem>
                                  <SelectItem value="true-false">Sant/Falskt</SelectItem>
                                  <SelectItem value="open">Öppen fråga</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label>Fråga</Label>
                              <Textarea
                                value={newQuestionForm.question}
                                onChange={(e) => setNewQuestionForm(prev => ({ ...prev, question: e.target.value }))}
                                placeholder="Skriv din fråga här..."
                                data-testid="textarea-question-text"
                              />
                            </div>

                            {newQuestionForm.type === 'multiple-choice' && (
                              <div>
                                <Label>Svarsalternativ</Label>
                                <div className="space-y-2">
                                  {newQuestionForm.alternatives.map((alt, index) => (
                                    <div key={index} className="flex gap-2">
                                      <Input
                                        value={alt}
                                        onChange={(e) => {
                                          const newAlts = [...newQuestionForm.alternatives];
                                          newAlts[index] = e.target.value;
                                          setNewQuestionForm(prev => ({ ...prev, alternatives: newAlts }));
                                        }}
                                        placeholder={`Alternativ ${index + 1}`}
                                        data-testid={`input-alternative-${index}`}
                                      />
                                      <Button
                                        variant={newQuestionForm.correctAnswer === index ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setNewQuestionForm(prev => ({ ...prev, correctAnswer: index }))}
                                        data-testid={`button-correct-${index}`}
                                      >
                                        {newQuestionForm.correctAnswer === index ? <CheckCircle className="w-4 h-4" /> : "Rätt"}
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {newQuestionForm.type === 'true-false' && (
                              <div>
                                <Label>Rätt svar</Label>
                                <div className="flex gap-2">
                                  <Button
                                    variant={newQuestionForm.alternatives[0] === 'sant' ? "default" : "outline"}
                                    onClick={() => setNewQuestionForm(prev => ({ ...prev, alternatives: ['sant', 'falskt'] }))}
                                    data-testid="button-true"
                                  >
                                    Sant
                                  </Button>
                                  <Button
                                    variant={newQuestionForm.alternatives[0] === 'falskt' ? "default" : "outline"}
                                    onClick={() => setNewQuestionForm(prev => ({ ...prev, alternatives: ['falskt', 'sant'] }))}
                                    data-testid="button-false"
                                  >
                                    Falskt
                                  </Button>
                                </div>
                              </div>
                            )}

                            <div>
                              <Label>Förklaring (valfritt)</Label>
                              <Textarea
                                value={newQuestionForm.explanation}
                                onChange={(e) => setNewQuestionForm(prev => ({ ...prev, explanation: e.target.value }))}
                                placeholder="Förklaring av det rätta svaret..."
                                data-testid="textarea-question-explanation"
                              />
                            </div>

                            <Button 
                              onClick={addQuestion}
                              disabled={!newQuestionForm.question.trim()}
                              data-testid="button-add-question"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Lägg till fråga
                            </Button>
                          </div>
                        </div>

                        {/* Questions List grouped by page */}
                        <div className="space-y-6">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-lg">Sparade frågor</h4>
                            <Badge variant="secondary">{editingLesson?.questions?.length || 0} totalt</Badge>
                          </div>
                          
                          {Array.from({ length: newLessonForm.numberOfPages }, (_, pageIndex) => {
                            const pageNumber = pageIndex + 1;
                            const pageQuestions = editingLesson?.questions?.filter(q => q.pageNumber === pageNumber) || [];
                            
                            return (
                              <div key={pageNumber} className="border-2 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                                    {pageNumber}
                                  </div>
                                  <h5 className="font-semibold text-lg">Sida {pageNumber}</h5>
                                  <Badge variant={pageQuestions.length > 0 ? "default" : "outline"} className="bg-blue-600">
                                    {pageQuestions.length} frågor
                                  </Badge>
                                </div>
                                
                                {pageQuestions.length === 0 ? (
                                  <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg text-center">
                                    <p className="text-sm text-muted-foreground">Inga frågor för denna sida än</p>
                                    <p className="text-xs text-muted-foreground mt-1">Välj "Sida {pageNumber}" i formuläret ovan för att lägga till frågor här</p>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {pageQuestions.map((question, index) => (
                                      <div key={question.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                              <Badge variant="outline">{question.type}</Badge>
                                              <span className="text-sm font-medium">Fråga {index + 1}</span>
                                            </div>
                                            <p className="text-sm mb-2">{question.question}</p>
                                            {question.alternatives && question.type === 'multiple-choice' && (
                                              <div className="text-xs text-muted-foreground">
                                                Alternativ: {question.alternatives.join(', ')}
                                                <br />Rätt svar: {question.alternatives[question.correctAnswer as number]}
                                              </div>
                                            )}
                                            {question.explanation && (
                                              <p className="text-xs text-muted-foreground mt-1">
                                                Förklaring: {question.explanation}
                                              </p>
                                            )}
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeQuestion(question.id)}
                                            data-testid={`button-remove-question-${question.id}`}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Word Definitions Tab */}
                  <TabsContent value="definitions" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Ordförklaringar</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Lägg till förklaringar för svåra ord som ska visas som tooltips i texten
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex gap-2">
                          <Input
                            value={newWordDefinition.word}
                            onChange={(e) => setNewWordDefinition(prev => ({ ...prev, word: e.target.value }))}
                            placeholder="Ord att förklara"
                            data-testid="input-word"
                          />
                          <Input
                            value={newWordDefinition.definition}
                            onChange={(e) => setNewWordDefinition(prev => ({ ...prev, definition: e.target.value }))}
                            placeholder="Förklaring"
                            className="flex-1"
                            data-testid="input-definition"
                          />
                          <Button 
                            onClick={addWordDefinition}
                            disabled={!newWordDefinition.word.trim() || !newWordDefinition.definition.trim()}
                            data-testid="button-add-definition"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          {editingLesson?.wordDefinitions?.map((def) => (
                            <div key={def.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                              <span className="font-medium">{def.word}:</span>
                              <span className="flex-1">{def.definition}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeWordDefinition(def.id)}
                                data-testid={`button-remove-definition-${def.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lektionsinställningar</DialogTitle>
            <DialogDescription>
              Hantera lektionens metadata och avancerade inställningar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="lesson-title">Titel</Label>
                <Input
                  id="lesson-title"
                  value={newLessonForm.title}
                  onChange={(e) => setNewLessonForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Lektionstitel"
                  data-testid="input-lesson-title"
                />
              </div>
              <div>
                <Label htmlFor="lesson-subject">Ämne</Label>
                <Input
                  id="lesson-subject"
                  value={newLessonForm.subject}
                  onChange={(e) => setNewLessonForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="t.ex. Svenska"
                  data-testid="input-lesson-subject"
                />
              </div>
              <div>
                <Label htmlFor="lesson-grade">Årskurs</Label>
                <Input
                  id="lesson-grade"
                  value={newLessonForm.gradeLevel}
                  onChange={(e) => setNewLessonForm(prev => ({ ...prev, gradeLevel: e.target.value }))}
                  placeholder="t.ex. 6"
                  data-testid="input-lesson-grade"
                />
              </div>
              <div>
                <Label htmlFor="lesson-time">Lästid (min)</Label>
                <Input
                  id="lesson-time"
                  type="number"
                  value={newLessonForm.readingTime}
                  onChange={(e) => setNewLessonForm(prev => ({ ...prev, readingTime: parseInt(e.target.value) || 10 }))}
                  placeholder="10"
                  data-testid="input-lesson-time"
                />
              </div>
              <div>
                <Label htmlFor="lesson-pages">Antal sidor</Label>
                <Input
                  id="lesson-pages"
                  type="number"
                  min="1"
                  max="10"
                  value={newLessonForm.numberOfPages}
                  onChange={(e) => setNewLessonForm(prev => ({ ...prev, numberOfPages: parseInt(e.target.value) || 1 }))}
                  placeholder="1"
                  data-testid="input-lesson-pages"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="lesson-description">Beskrivning</Label>
              <Textarea
                id="lesson-description"
                value={newLessonForm.description}
                onChange={(e) => setNewLessonForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Kort beskrivning av lektionen..."
                rows={3}
                data-testid="textarea-lesson-description"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <Label>Utvald bild</Label>
                {newLessonForm.featuredImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewLessonForm(prev => ({ ...prev, featuredImage: '' }))}
                    data-testid="button-remove-featured-image"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Ta bort bild
                  </Button>
                )}
              </div>
              
              {newLessonForm.featuredImage ? (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Image className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Bild uppladdad</p>
                      <p className="text-xs text-muted-foreground">{newLessonForm.featuredImage}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={5242880} // 5MB
                  onGetUploadParameters={handleFeaturedImageUpload}
                  onComplete={handleFeaturedImageComplete}
                  buttonClassName="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Ladda upp utvald bild
                </ObjectUploader>
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Publicering</p>
                <p className="text-sm text-muted-foreground">
                  {newLessonForm.isPublished ? 
                    "Lektionen är publicerad och synlig för alla" : 
                    "Lektionen är ett utkast och endast synlig för lärare"}
                </p>
              </div>
              <Button
                variant={newLessonForm.isPublished ? "destructive" : "default"}
                onClick={handleTogglePublish}
                disabled={updateMutation.isPending}
                data-testid="button-toggle-publish-dialog"
              >
                {newLessonForm.isPublished ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Avpublicera
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 mr-2" />
                    Publicera
                  </>
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowSettingsDialog(false)}
              data-testid="button-cancel-settings"
            >
              Stäng
            </Button>
            <Button 
              onClick={() => {
                handleSaveContent();
                setShowSettingsDialog(false);
              }}
              disabled={updateMutation.isPending}
              data-testid="button-save-settings"
            >
              <Save className="w-4 h-4 mr-2" />
              Spara inställningar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {showPreview && editingLesson && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Förhandsgranska: {editingLesson.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Pre-reading questions */}
              {editingLesson.preReadingQuestions.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium mb-3">Innan du läser - fundera på detta:</h3>
                  <ul className="space-y-2">
                    {editingLesson.preReadingQuestions.map((q, index) => (
                      <li key={q.id} className="text-sm">
                        {index + 1}. {q.question}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Content with word definitions */}
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: currentEditorContent 
                }}
              />
              
              {/* Questions */}
              {editingLesson.questions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium">Frågor:</h3>
                  {editingLesson.questions.map((q, index) => (
                    <div key={q.id} className="p-4 border rounded-lg">
                      <p className="font-medium mb-2">{index + 1}. {q.question}</p>
                      {q.alternatives && q.type === 'multiple-choice' && (
                        <div className="space-y-1">
                          {q.alternatives.map((alt, altIndex) => (
                            <div key={altIndex} className={`text-sm p-2 rounded ${altIndex === q.correctAnswer ? 'bg-green-100' : ''}`}>
                              {String.fromCharCode(65 + altIndex)}. {alt}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}