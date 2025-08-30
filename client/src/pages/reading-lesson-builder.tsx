import { useState, useEffect, useCallback } from "react";
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
  CheckCircle
} from "lucide-react";

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
  const [match, params] = useRoute("/admin/reading/edit/:id");
  
  // Main lesson state
  const [selectedLesson, setSelectedLesson] = useState<ReadingLesson | null>(null);
  const [editingLesson, setEditingLesson] = useState<ReadingLesson | null>(null);
  const [currentEditorContent, setCurrentEditorContent] = useState("");
  const [localPages, setLocalPages] = useState<{ id: string; content: string; imagesAbove?: string[]; imagesBelow?: string[] }[]>([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState("content");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Form states for dialogs
  const [newQuestionForm, setNewQuestionForm] = useState({
    type: 'multiple-choice' as Question['type'],
    question: '',
    alternatives: ['', '', '', ''],
    correctAnswer: 0,
    explanation: ''
  });
  
  const [newWordDefinition, setNewWordDefinition] = useState({ word: '', definition: '' });
  const [newPreReadingQuestion, setNewPreReadingQuestion] = useState('');
  
  const [newLessonForm, setNewLessonForm] = useState({
    title: '',
    description: '',
    gradeLevel: '6',
    subject: 'Svenska',
    readingTime: 10
  });

  // Fetch lessons
  const { data: lessons = [], isLoading } = useQuery<ReadingLesson[]>({
    queryKey: ["/api/reading-lessons"],
  });

  // Auto-load lesson if editing via URL
  useEffect(() => {
    if (match && params?.id && lessons.length > 0) {
      const lessonToEdit = lessons.find(l => l.id === params.id);
      if (lessonToEdit) {
        handleEditLesson(lessonToEdit);
      }
    }
  }, [match, params?.id, lessons]);

  // Create lesson mutation
  const createMutation = useMutation({
    mutationFn: async (lesson: Omit<ReadingLesson, 'id' | 'createdAt'>) => {
      return apiRequest('POST', '/api/reading-lessons', lesson);
    },
    onSuccess: (newLesson) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-lessons"] });
      setEditingLesson(newLesson);
      setSelectedLesson(newLesson);
      setCurrentEditorContent(newLesson.content || "");
      setShowCreateDialog(false);
      toast({
        title: "Lektion skapad!",
        description: "Nu kan du börja redigera innehållet."
      });
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte skapa lektionen",
        variant: "destructive"
      });
    }
  });

  // Update lesson mutation - FIXED to not clear editing state
  const updateMutation = useMutation({
    mutationFn: async ({ id, lesson }: { id: string, lesson: Partial<ReadingLesson> }) => {
      return apiRequest('PUT', `/api/reading-lessons/${id}`, lesson);
    },
    onSuccess: (updatedLesson) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-lessons"] });
      // Keep user in editor and sync back server truth:
      setSelectedLesson(updatedLesson);
      setEditingLesson(updatedLesson);
      setCurrentEditorContent(updatedLesson.content || "");
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

  // Handle lesson selection
  const handleEditLesson = (lesson: ReadingLesson) => {
    setSelectedLesson(lesson);
    setEditingLesson({ ...lesson });
    setCurrentEditorContent(lesson.content || "");
    setActiveTab("content");
  };

  const handleCreateLesson = () => {
    const newLesson = {
      ...newLessonForm,
      content: "",
      featuredImage: "",
      preReadingQuestions: [],
      questions: [],
      wordDefinitions: [],
      isPublished: false
    };
    
    createMutation.mutate(newLesson);
  };

  // Save content manually
  const handleSaveContent = async () => {
    if (!selectedLesson || !editingLesson) return;
    
    const currentContent = currentEditorContent;
    if (!currentContent?.trim()) {
      toast({
        title: "Ingen text att spara",
        description: "Skriv något innehåll först",
        variant: "destructive"
      });
      return;
    }

    await updateMutation.mutateAsync({
      id: selectedLesson.id,
      lesson: {
        content: currentContent,
        title: editingLesson.title,
        gradeLevel: editingLesson.gradeLevel,
        description: editingLesson.description,
        subject: editingLesson.subject,
        readingTime: editingLesson.readingTime,
        featuredImage: editingLesson.featuredImage,
        preReadingQuestions: editingLesson.preReadingQuestions ?? [],
        questions: editingLesson.questions ?? [],
        wordDefinitions: editingLesson.wordDefinitions ?? [],
        isPublished: editingLesson.isPublished,
      }
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
      explanation: newQuestionForm.explanation || undefined
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
      explanation: ''
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/reading">
            <Button variant="outline" size="sm" data-testid="button-back-reading-admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka till läsförståelse
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-blue-600" />
              Skapa läsförståelse-lektion
            </h1>
            <p className="text-gray-600">Avancerat verktyg för att skapa interaktiva läsövningar</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Lesson List Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Lektioner
                </CardTitle>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="w-full" data-testid="button-new-lesson">
                      <Plus className="w-4 h-4 mr-2" />
                      Ny lektion
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Skapa ny lektion</DialogTitle>
                      <DialogDescription>
                        Fyll i grundinformation för din nya läsförståelse-lektion
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Titel</Label>
                        <Input
                          id="title"
                          value={newLessonForm.title}
                          onChange={(e) => setNewLessonForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="T.ex. 'Djur i skogen'"
                          data-testid="input-lesson-title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Beskrivning</Label>
                        <Textarea
                          id="description"
                          value={newLessonForm.description}
                          onChange={(e) => setNewLessonForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Kort beskrivning av lektionen"
                          data-testid="textarea-lesson-description"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="gradeLevel">Årskurs</Label>
                          <Select 
                            value={newLessonForm.gradeLevel} 
                            onValueChange={(value) => setNewLessonForm(prev => ({ ...prev, gradeLevel: value }))}
                          >
                            <SelectTrigger data-testid="select-grade-level">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Årskurs 1</SelectItem>
                              <SelectItem value="2">Årskurs 2</SelectItem>
                              <SelectItem value="3">Årskurs 3</SelectItem>
                              <SelectItem value="4">Årskurs 4</SelectItem>
                              <SelectItem value="5">Årskurs 5</SelectItem>
                              <SelectItem value="6">Årskurs 6</SelectItem>
                              <SelectItem value="7">Årskurs 7</SelectItem>
                              <SelectItem value="8">Årskurs 8</SelectItem>
                              <SelectItem value="9">Årskurs 9</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="readingTime">Läsningstid (min)</Label>
                          <Input
                            id="readingTime"
                            type="number"
                            value={newLessonForm.readingTime}
                            onChange={(e) => setNewLessonForm(prev => ({ ...prev, readingTime: parseInt(e.target.value) || 10 }))}
                            data-testid="input-reading-time"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="subject">Ämne</Label>
                        <Input
                          id="subject"
                          value={newLessonForm.subject}
                          onChange={(e) => setNewLessonForm(prev => ({ ...prev, subject: e.target.value }))}
                          placeholder="T.ex. Svenska, Naturkunskap"
                          data-testid="input-lesson-subject"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        onClick={handleCreateLesson} 
                        disabled={createMutation.isPending || !newLessonForm.title.trim()}
                        data-testid="button-create-confirm"
                      >
                        {createMutation.isPending ? "Skapar..." : "Skapa lektion"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : lessons.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Inga lektioner ännu
                  </p>
                ) : (
                  lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedLesson?.id === lesson.id ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleEditLesson(lesson)}
                      data-testid={`lesson-item-${lesson.id}`}
                    >
                      <div className="font-medium text-sm">{lesson.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Årskurs {lesson.gradeLevel} • {lesson.readingTime} min
                      </div>
                      <Badge variant={lesson.isPublished ? "default" : "secondary"} className="mt-1">
                        {lesson.isPublished ? "Publicerad" : "Utkast"}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Editor Area */}
          <div className="lg:col-span-3">
            {!editingLesson ? (
              <Card className="h-96">
                <CardContent className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Välj en lektion att redigera</h3>
                    <p className="text-gray-500">Klicka på en lektion i listan eller skapa en ny</p>
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
                        <CardTitle>{editingLesson.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Årskurs {editingLesson.gradeLevel} • {editingLesson.subject} • {editingLesson.readingTime} min
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
                          onClick={handleSaveContent}
                          disabled={updateMutation.isPending}
                          data-testid="button-save-content"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          {updateMutation.isPending ? "Sparar..." : "Spara innehåll"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Main Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="content" data-testid="tab-content">
                      <FileText className="w-4 h-4 mr-2" />
                      Innehåll
                    </TabsTrigger>
                    <TabsTrigger value="prereading" data-testid="tab-prereading">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Innan du läser
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
                        <RichTextEditor
                          value={currentEditorContent}
                          onChange={(content) => {
                            const safe = content ?? "";
                            setCurrentEditorContent(safe);
                            setEditingLesson(prev => prev ? { ...prev, content: safe } : prev);
                          }}
                          placeholder="Skriv ditt läsförståelse-innehåll här. Du kan lägga till rubriker, bilder, listor och mycket mer..."
                          onPagesChange={setLocalPages}
                        />
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
                          {editingLesson.preReadingQuestions.map((question, index) => (
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

                        {/* Questions List */}
                        <div className="space-y-3">
                          <h4 className="font-medium">Sparade frågor ({editingLesson.questions.length})</h4>
                          {editingLesson.questions.map((question, index) => (
                            <div key={question.id} className="p-4 border rounded-lg">
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
                          {editingLesson.wordDefinitions.map((def) => (
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
        </div>
      </div>

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