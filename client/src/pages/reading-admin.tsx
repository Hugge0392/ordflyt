import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Plus, BookOpen, Eye, Edit, Trash2, Save, X, Image as ImageIcon, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { ReadingLesson, InsertReadingLesson, ReadingQuestion, WordDefinition, PreReadingQuestion } from "@shared/schema";
import type { UploadResult } from "@uppy/core";

export default function ReadingAdmin() {
  const [selectedLesson, setSelectedLesson] = useState<ReadingLesson | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Partial<InsertReadingLesson> | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lessons, isLoading } = useQuery<ReadingLesson[]>({
    queryKey: ["/api/reading-lessons"],
  });

  const createMutation = useMutation({
    mutationFn: async (lesson: InsertReadingLesson) => {
      const response = await fetch("/api/reading-lessons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(lesson),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-lessons"] });
      setIsCreating(false);
      setEditingLesson(null);
      toast({ title: "Lektion skapad!", description: "Den nya läsförståelselektionen har sparats." });
    },
    onError: (error) => {
      toast({ 
        title: "Fel", 
        description: "Kunde inte skapa lektionen. Försök igen.",
        variant: "destructive"
      });
      console.error("Error creating lesson:", error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, lesson }: { id: string, lesson: Partial<InsertReadingLesson> }) => {
      const response = await fetch(`/api/reading-lessons/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(lesson),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-lessons"] });
      setSelectedLesson(null);
      setEditingLesson(null);
      toast({ title: "Lektion uppdaterad!", description: "Ändringarna har sparats." });
    },
    onError: (error) => {
      toast({ 
        title: "Fel", 
        description: "Kunde inte uppdatera lektionen. Försök igen.",
        variant: "destructive"
      });
      console.error("Error updating lesson:", error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/reading-lessons/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-lessons"] });
      setSelectedLesson(null);
      toast({ title: "Lektion borttagen!", description: "Lektionen har raderats permanent." });
    },
    onError: (error) => {
      toast({ 
        title: "Fel", 
        description: "Kunde inte radera lektionen. Försök igen.",
        variant: "destructive"
      });
      console.error("Error deleting lesson:", error);
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/reading-lessons/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPublished: 0 }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-lessons"] });
      toast({ title: "Lektion avpublicerad!", description: "Lektionen är nu ett utkast igen." });
    },
    onError: () => {
      toast({ 
        title: "Fel", 
        description: "Kunde inte avpublicera lektionen. Försök igen.",
        variant: "destructive"
      });
    },
  });

  const handleCreateLesson = () => {
    setIsCreating(true);
    setEditingLesson({
      title: "",
      description: "",
      content: "",
      gradeLevel: "4-6",
      subject: "Svenska",
      readingTime: 5,
      featuredImage: null,
      preReadingQuestions: [],
      questions: [],
      wordDefinitions: [],
      isPublished: 0
    });
  };

  const handleSaveLesson = () => {
    if (!editingLesson) return;
    
    if (!editingLesson.title || !editingLesson.content || !editingLesson.gradeLevel) {
      toast({
        title: "Fyll i alla obligatoriska fält",
        description: "Titel, innehåll och årskurs måste fyllas i.",
        variant: "destructive"
      });
      return;
    }

    if (isCreating) {
      createMutation.mutate(editingLesson as InsertReadingLesson);
    } else if (selectedLesson) {
      updateMutation.mutate({ id: selectedLesson.id, lesson: editingLesson });
    }
  };

  const handleEditLesson = (lesson: ReadingLesson) => {
    setSelectedLesson(lesson);
    setEditingLesson({
      title: lesson.title,
      description: lesson.description,
      content: lesson.content,
      gradeLevel: lesson.gradeLevel,
      subject: lesson.subject,
      readingTime: lesson.readingTime,
      featuredImage: lesson.featuredImage,
      preReadingQuestions: lesson.preReadingQuestions,
      questions: lesson.questions,
      wordDefinitions: lesson.wordDefinitions,
      isPublished: lesson.isPublished
    });
    setIsCreating(false);
  };

  const addQuestion = (type: ReadingQuestion["type"]) => {
    if (!editingLesson) return;
    
    const newQuestion: ReadingQuestion = {
      id: `q_${Date.now()}`,
      type,
      question: "",
      ...(type === "multiple_choice" && { options: ["", "", "", ""], correctAnswer: 0 }),
      ...(type === "true_false" && { correctAnswer: true }),
      explanation: ""
    };

    setEditingLesson({
      ...editingLesson,
      questions: [...(editingLesson.questions || []), newQuestion]
    });
  };

  const updateQuestion = (index: number, updates: Partial<ReadingQuestion>) => {
    if (!editingLesson) return;
    
    const questions = [...(editingLesson.questions || [])];
    questions[index] = { ...questions[index], ...updates };
    
    setEditingLesson({
      ...editingLesson,
      questions
    });
  };

  const removeQuestion = (index: number) => {
    if (!editingLesson) return;
    
    const questions = [...(editingLesson.questions || [])];
    questions.splice(index, 1);
    
    setEditingLesson({
      ...editingLesson,
      questions
    });
  };

  const addWordDefinition = () => {
    if (!editingLesson) return;
    
    const newDefinition: WordDefinition = {
      word: "",
      definition: "",
      context: ""
    };

    setEditingLesson({
      ...editingLesson,
      wordDefinitions: [...(editingLesson.wordDefinitions || []), newDefinition]
    });
  };

  const updateWordDefinition = (index: number, updates: Partial<WordDefinition>) => {
    if (!editingLesson) return;
    
    const definitions = [...(editingLesson.wordDefinitions || [])];
    definitions[index] = { ...definitions[index], ...updates };
    
    setEditingLesson({
      ...editingLesson,
      wordDefinitions: definitions
    });
  };

  const removeWordDefinition = (index: number) => {
    if (!editingLesson) return;
    
    const definitions = [...(editingLesson.wordDefinitions || [])];
    definitions.splice(index, 1);
    
    setEditingLesson({
      ...editingLesson,
      wordDefinitions: definitions
    });
  };

  const addPreReadingQuestion = () => {
    if (!editingLesson) return;
    
    const newQuestion: PreReadingQuestion = {
      id: `pre_${Date.now()}`,
      question: "",
      purpose: ""
    };

    setEditingLesson({
      ...editingLesson,
      preReadingQuestions: [...(editingLesson.preReadingQuestions || []), newQuestion]
    });
  };

  const updatePreReadingQuestion = (index: number, updates: Partial<PreReadingQuestion>) => {
    if (!editingLesson) return;
    
    const questions = [...(editingLesson.preReadingQuestions || [])];
    questions[index] = { ...questions[index], ...updates };
    
    setEditingLesson({
      ...editingLesson,
      preReadingQuestions: questions
    });
  };

  const removePreReadingQuestion = (index: number) => {
    if (!editingLesson) return;
    
    const questions = [...(editingLesson.preReadingQuestions || [])];
    questions.splice(index, 1);
    
    setEditingLesson({
      ...editingLesson,
      preReadingQuestions: questions
    });
  };

  // Inte behövd längre - ObjectUploader hanterar direkt upload
  const handleFeaturedImageUpload = () => ({});

  const handleFeaturedImageComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    console.log("Featured image upload completed:", result);
    
    if (result.failed && result.failed.length > 0) {
      console.error("Featured image upload failed:", result.failed);
      result.failed.forEach(file => {
        console.error("Failed featured image file:", file.name, file.error);
      });
      toast({
        title: "Uppladdning misslyckades",
        description: `Kunde inte ladda upp huvudbild: ${result.failed[0]?.error || 'Okänt fel'}`,
        variant: "destructive",
      });
      return;
    }
    
    if (result.successful && result.successful.length > 0) {
      const first = result.successful[0] as any;
      // Hämta objectPath från direktuppladdning
      const objectPath = first?.response?.objectPath || first?.response?.body?.objectPath;

      if (!objectPath) {
        console.warn("Featured image upload ok, men saknar objectPath i resultatet:", first);
        toast({
          title: "Uppladdning klar",
          description: "Kunde inte läsa in sökvägen till objektet automatiskt.",
          variant: "destructive",
        });
        return;
      }

      setEditingLesson(prev => prev ? {
        ...prev,
        featuredImage: objectPath
      } : prev);
      toast({
        title: "Bild uppladdad!",
        description: "Huvudbilden har lagts till.",
      });
    }
  };

  if (editingLesson || isCreating) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-background">
          <div className="max-w-6xl mx-auto p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6" />
                <div>
                  <h1 className="text-2xl font-bold">
                    {isCreating ? "Skapa ny lektion" : "Redigera lektion"}
                  </h1>
                  <p className="text-sm text-muted-foreground">Läsförståelse Admin</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingLesson(null);
                    setSelectedLesson(null);
                  }}
                  data-testid="button-cancel"
                >
                  <X className="w-4 h-4 mr-2" />
                  Avbryt
                </Button>
                <Dialog open={showPreview} onOpenChange={setShowPreview}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={!editingLesson?.content}
                      data-testid="button-preview-lesson"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Förhandsgranska
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingLesson?.title || "Förhandsgranskning"}</DialogTitle>
                      <DialogDescription>
                        Så här kommer lektionen att se ut för eleverna
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {editingLesson?.featuredImage && (
                        <div className="w-full h-48 bg-muted rounded-lg overflow-hidden">
                          <img 
                            src={editingLesson.featuredImage} 
                            alt={editingLesson.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-4">
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                          {editingLesson?.gradeLevel && `Årskurs ${editingLesson.gradeLevel}`}
                        </Badge>
                        {editingLesson?.readingTime && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {editingLesson.readingTime} min läsning
                          </div>
                        )}
                      </div>
                      {editingLesson?.description && (
                        <p className="text-muted-foreground mb-4">{editingLesson.description}</p>
                      )}
                      {editingLesson?.content && (
                        <div 
                          className="prose dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: editingLesson.content }}
                        />
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  onClick={handleSaveLesson}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-lesson"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Spara utkast
                </Button>
                <Button
                  onClick={() => {
                    if (editingLesson) {
                      setEditingLesson({ ...editingLesson, isPublished: 1 });
                      setTimeout(() => handleSaveLesson(), 100);
                    }
                  }}
                  disabled={createMutation.isPending || updateMutation.isPending || !editingLesson?.title || !editingLesson?.gradeLevel || !editingLesson?.content}
                  data-testid="button-publish-lesson"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Publicera lektion
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto p-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Grundinfo</TabsTrigger>
              <TabsTrigger value="content">Innehåll</TabsTrigger>
              <TabsTrigger value="prereading">Innan du läser</TabsTrigger>
              <TabsTrigger value="questions">Frågor</TabsTrigger>
              <TabsTrigger value="definitions">Ordförklaringar</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titel *</Label>
                  <Input
                    id="title"
                    value={editingLesson?.title || ""}
                    onChange={(e) => editingLesson && setEditingLesson({ ...editingLesson, title: e.target.value })}
                    placeholder="T.ex. Sommaräventyret"
                    data-testid="input-title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gradeLevel">Årskurs *</Label>
                  <Select
                    value={editingLesson?.gradeLevel || ""}
                    onValueChange={(value) => editingLesson && setEditingLesson({ ...editingLesson, gradeLevel: value })}
                  >
                    <SelectTrigger data-testid="select-grade-level">
                      <SelectValue placeholder="Välj årskurs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-3">Årskurs 1-3</SelectItem>
                      <SelectItem value="4-6">Årskurs 4-6</SelectItem>
                      <SelectItem value="7-9">Årskurs 7-9</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Ämne</Label>
                  <Input
                    id="subject"
                    value={editingLesson?.subject || ""}
                    onChange={(e) => editingLesson && setEditingLesson({ ...editingLesson, subject: e.target.value })}
                    placeholder="T.ex. Svenska, Naturkunskap"
                    data-testid="input-subject"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="readingTime">Läsningstid (minuter)</Label>
                  <Input
                    id="readingTime"
                    type="number"
                    value={editingLesson?.readingTime || ""}
                    onChange={(e) => editingLesson && setEditingLesson({ ...editingLesson, readingTime: parseInt(e.target.value) || null })}
                    placeholder="5"
                    data-testid="input-reading-time"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beskrivning</Label>
                <Textarea
                  id="description"
                  value={editingLesson?.description || ""}
                  onChange={(e) => editingLesson && setEditingLesson({ ...editingLesson, description: e.target.value })}
                  placeholder="En kort beskrivning av lektionen..."
                  rows={3}
                  data-testid="textarea-description"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${editingLesson?.isPublished === 1 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <div>
                    <p className="font-medium">
                      {editingLesson?.isPublished === 1 ? 'Publicerad' : 'Utkast'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {editingLesson?.isPublished === 1 
                        ? 'Lektionen är synlig för elever i läsförståelse-sektionen' 
                        : 'Lektionen är sparad som utkast och inte synlig för elever än'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="published"
                    checked={editingLesson?.isPublished === 1}
                    onChange={(e) => editingLesson && setEditingLesson({ ...editingLesson, isPublished: e.target.checked ? 1 : 0 })}
                    data-testid="checkbox-published"
                  />
                  <Label htmlFor="published">Publicerad</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Huvudbild (valfri)</Label>
                  {editingLesson?.featuredImage ? (
                    <div className="space-y-3">
                      <img
                        src={editingLesson.featuredImage}
                        alt="Huvudbild"
                        className="w-full max-w-md h-48 object-cover rounded-lg border"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editingLesson && setEditingLesson({...editingLesson, featuredImage: null})}
                        >
                          Ta bort bild
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={5 * 1024 * 1024} // 5MB
                      onComplete={handleFeaturedImageComplete}
                      buttonClassName="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                    >
                      <div className="flex flex-col items-center gap-2 text-gray-500">
                        <ImageIcon className="h-8 w-8" />
                        <span>Ladda upp huvudbild</span>
                        <span className="text-xs">JPG, PNG eller GIF (max 5MB)</span>
                      </div>
                    </ObjectUploader>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Huvudbilden visas överst i lektionen för att fånga elevernas uppmärksamhet.
                  </p>
                </div>

                <RichTextEditor
                  value={editingLesson?.content || ""}
                  onChange={(content) => editingLesson && setEditingLesson({...editingLesson, content})}
                  placeholder="Skriv ditt textinnehåll här..."
                  className="min-h-[400px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="prereading" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Innan du läser ({editingLesson?.preReadingQuestions?.length || 0})</h3>
                <Button variant="outline" onClick={addPreReadingQuestion} data-testid="button-add-prereading-question">
                  <Plus className="w-4 h-4 mr-2" />
                  Lägg till fråga
                </Button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Om "Innan du läser"-frågor</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Dessa frågor ställs innan eleven läser texten för att aktivera förkunskaper, väcka nyfikenhet och ge en riktning för läsningen. 
                  De hjälper eleven att fokusera på viktiga teman och förbereder för bättre textförståelse.
                </p>
              </div>

              <div className="space-y-4">
                {editingLesson?.preReadingQuestions?.map((question, index) => (
                  <Card key={(question as PreReadingQuestion).id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Fråga {index + 1}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePreReadingQuestion(index)}
                          data-testid={`button-remove-prereading-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label>Fråga</Label>
                        <Textarea
                          value={(question as PreReadingQuestion).question}
                          onChange={(e) => updatePreReadingQuestion(index, { question: e.target.value })}
                          placeholder="T.ex. Vad tror du att texten handlar om baserat på rubriken?"
                          rows={2}
                          data-testid={`textarea-prereading-question-${index}`}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Syfte</Label>
                        <Input
                          value={(question as PreReadingQuestion).purpose}
                          onChange={(e) => updatePreReadingQuestion(index, { purpose: e.target.value })}
                          placeholder="T.ex. Aktivera förkunskaper om ämnet"
                          data-testid={`input-prereading-purpose-${index}`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {(!editingLesson?.preReadingQuestions || editingLesson.preReadingQuestions.length === 0) && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                    <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500 mb-3">Inga "Innan du läser"-frågor ännu</p>
                    <Button variant="outline" onClick={addPreReadingQuestion} data-testid="button-add-first-prereading">
                      <Plus className="w-4 h-4 mr-2" />
                      Lägg till första frågan
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="questions" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Frågor ({editingLesson?.questions?.length || 0})</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => addQuestion("multiple_choice")} data-testid="button-add-multiple-choice">
                    + Flervalsfrågna
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addQuestion("true_false")} data-testid="button-add-true-false">
                    + Sant/Falskt
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addQuestion("open_ended")} data-testid="button-add-open-ended">
                    + Öppen fråga
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {editingLesson?.questions?.map((question, index) => (
                  <Card key={(question as ReadingQuestion).id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <Badge variant="outline">
                          {(question as ReadingQuestion).type === "multiple_choice" && "Flervalsfrågna"}
                          {(question as ReadingQuestion).type === "true_false" && "Sant/Falskt"}
                          {(question as ReadingQuestion).type === "open_ended" && "Öppen fråga"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(index)}
                          data-testid={`button-remove-question-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Label>Fråga</Label>
                        <Input
                          value={(question as ReadingQuestion).question}
                          onChange={(e) => updateQuestion(index, { question: e.target.value })}
                          placeholder="Skriv din fråga här..."
                          data-testid={`input-question-${index}`}
                        />
                      </div>

                      {(question as ReadingQuestion).type === "multiple_choice" && (
                        <div className="space-y-2">
                          <Label>Svarsalternativ</Label>
                          {(question as ReadingQuestion).options?.map((option: string, optionIndex: number) => (
                            <div key={optionIndex} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct-${(question as ReadingQuestion).id}`}
                                checked={(question as ReadingQuestion).correctAnswer === optionIndex}
                                onChange={() => updateQuestion(index, { correctAnswer: optionIndex })}
                                data-testid={`radio-correct-${index}-${optionIndex}`}
                              />
                              <Input
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...((question as ReadingQuestion).options || [])];
                                  newOptions[optionIndex] = e.target.value;
                                  updateQuestion(index, { options: newOptions });
                                }}
                                placeholder={`Alternativ ${optionIndex + 1}`}
                                data-testid={`input-option-${index}-${optionIndex}`}
                              />
                              <span className="text-xs text-muted-foreground">
                                {(question as ReadingQuestion).correctAnswer === optionIndex ? "(Rätt)" : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {(question as ReadingQuestion).type === "true_false" && (
                        <div className="space-y-2">
                          <Label>Korrekt svar</Label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`tf-${(question as ReadingQuestion).id}`}
                                checked={(question as ReadingQuestion).correctAnswer === true}
                                onChange={() => updateQuestion(index, { correctAnswer: true })}
                                data-testid={`radio-true-${index}`}
                              />
                              Sant
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`tf-${(question as ReadingQuestion).id}`}
                                checked={(question as ReadingQuestion).correctAnswer === false}
                                onChange={() => updateQuestion(index, { correctAnswer: false })}
                                data-testid={`radio-false-${index}`}
                              />
                              Falskt
                            </label>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Förklaring (valfri)</Label>
                        <Textarea
                          value={(question as ReadingQuestion).explanation || ""}
                          onChange={(e) => updateQuestion(index, { explanation: e.target.value })}
                          placeholder="Förklara varför svaret är korrekt..."
                          rows={2}
                          data-testid={`textarea-explanation-${index}`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="definitions" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Ordförklaringar ({editingLesson?.wordDefinitions?.length || 0})</h3>
                <Button variant="outline" onClick={addWordDefinition} data-testid="button-add-word-definition">
                  <Plus className="w-4 h-4 mr-2" />
                  Lägg till ordförklaring
                </Button>
              </div>

              <div className="space-y-4">
                {editingLesson?.wordDefinitions?.map((definition, index) => (
                  <Card key={index}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Ordförklaring {index + 1}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeWordDefinition(index)}
                          data-testid={`button-remove-definition-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Ord</Label>
                          <Input
                            value={(definition as WordDefinition).word}
                            onChange={(e) => updateWordDefinition(index, { word: e.target.value })}
                            placeholder="t.ex. mystisk"
                            data-testid={`input-word-${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Förklaring</Label>
                          <Input
                            value={(definition as WordDefinition).definition}
                            onChange={(e) => updateWordDefinition(index, { definition: e.target.value })}
                            placeholder="t.ex. hemlighetsfull, gåtfull"
                            data-testid={`input-definition-${index}`}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Kontext (valfri)</Label>
                        <Input
                          value={(definition as WordDefinition).context || ""}
                          onChange={(e) => updateWordDefinition(index, { context: e.target.value })}
                          placeholder="Meningen där ordet förekommer..."
                          data-testid={`input-context-${index}`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
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
              <Link href="/lasforstaelse" className="text-sm text-muted-foreground hover:text-foreground">
                ← Tillbaka till läsförståelse
              </Link>
              <div className="w-px h-6 bg-border"></div>
              <BookOpen className="w-6 h-6" />
              <div>
                <h1 className="text-2xl font-bold">Admin - Läsförståelse</h1>
                <p className="text-sm text-muted-foreground">Hantera läsförståelselektioner</p>
              </div>
            </div>
            <Button onClick={handleCreateLesson} data-testid="button-create-lesson">
              <Plus className="w-4 h-4 mr-2" />
              Skapa ny lektion
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="mt-2 text-muted-foreground">Laddar lektioner...</p>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Alla lektioner</TabsTrigger>
              <TabsTrigger value="published">Publicerade</TabsTrigger>
              <TabsTrigger value="drafts">Utkast</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lessons?.map((lesson) => (
                  <Card key={lesson.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{lesson.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {lesson.description || "Ingen beskrivning"}
                          </CardDescription>
                        </div>
                        <Badge variant={lesson.isPublished ? "default" : "secondary"}>
                          {lesson.isPublished ? "Publicerad" : "Utkast"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-muted-foreground mb-4">
                        <div>Årskurs: {lesson.gradeLevel}</div>
                        {lesson.subject && <div>Ämne: {lesson.subject}</div>}
                        {lesson.readingTime && <div>Läsningstid: {lesson.readingTime} min</div>}
                        <div>Innan du läser: {lesson.preReadingQuestions.length}</div>
                        <div>Frågor: {lesson.questions.length}</div>
                        <div>Ordförklaringar: {lesson.wordDefinitions.length}</div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditLesson(lesson)}
                          data-testid={`button-edit-${lesson.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(lesson.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${lesson.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {(!lessons || lessons.length === 0) && !isLoading && (
                  <div className="col-span-full text-center py-12">
                    <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Inga lektioner ännu</h3>
                    <p className="text-muted-foreground mb-4">
                      Skapa din första läsförståelselektion för att komma igång.
                    </p>
                    <Button onClick={handleCreateLesson} data-testid="button-create-first-lesson">
                      <Plus className="w-4 h-4 mr-2" />
                      Skapa första lektionen
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="published" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lessons?.filter(lesson => lesson.isPublished).map((lesson) => (
                  <Card key={lesson.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{lesson.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {lesson.description || "Ingen beskrivning"}
                          </CardDescription>
                        </div>
                        <Badge variant="default">Publicerad</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-muted-foreground mb-4">
                        <div>Årskurs: {lesson.gradeLevel}</div>
                        {lesson.subject && <div>Ämne: {lesson.subject}</div>}
                        {lesson.readingTime && <div>Läsningstid: {lesson.readingTime} min</div>}
                        <div>Innan du läser: {lesson.preReadingQuestions.length}</div>
                        <div>Frågor: {lesson.questions.length}</div>
                        <div>Ordförklaringar: {lesson.wordDefinitions.length}</div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link href={`/lasforstaelse/${lesson.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditLesson(lesson)}
                          data-testid={`button-edit-published-${lesson.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unpublishMutation.mutate(lesson.id)}
                          disabled={unpublishMutation.isPending}
                          data-testid={`button-unpublish-${lesson.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(lesson.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-published-${lesson.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {lessons?.filter(lesson => lesson.isPublished).length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Inga publicerade lektioner</h3>
                    <p className="text-muted-foreground">
                      Publicera en lektion för att se den här.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="drafts" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lessons?.filter(lesson => !lesson.isPublished).map((lesson) => (
                  <Card key={lesson.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{lesson.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {lesson.description || "Ingen beskrivning"}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">Utkast</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-muted-foreground mb-4">
                        <div>Årskurs: {lesson.gradeLevel}</div>
                        {lesson.subject && <div>Ämne: {lesson.subject}</div>}
                        {lesson.readingTime && <div>Läsningstid: {lesson.readingTime} min</div>}
                        <div>Innan du läser: {lesson.preReadingQuestions.length}</div>
                        <div>Frågor: {lesson.questions.length}</div>
                        <div>Ordförklaringar: {lesson.wordDefinitions.length}</div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditLesson(lesson)}
                          data-testid={`button-edit-draft-${lesson.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(lesson.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-draft-${lesson.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {lessons?.filter(lesson => !lesson.isPublished).length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Inga utkast</h3>
                    <p className="text-muted-foreground mb-4">
                      Skapa en ny lektion för att se den här.
                    </p>
                    <Button onClick={handleCreateLesson} data-testid="button-create-lesson-from-drafts">
                      <Plus className="w-4 h-4 mr-2" />
                      Skapa ny lektion
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}