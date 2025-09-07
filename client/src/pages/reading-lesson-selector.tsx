import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { BookOpen, Plus, Edit, Clock, ArrowLeft, User, Target, Globe, EyeOff, Trash2, Eye } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import type { ReadingLesson } from "@shared/schema";

export default function ReadingLessonSelector() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newLessonForm, setNewLessonForm] = useState({
    title: '',
    description: '',
    gradeLevel: '6',
    subject: 'Svenska',
    readingTime: 10,
    featuredImage: '',
  });

  const { data: lessons, isLoading } = useQuery<ReadingLesson[]>({
    queryKey: ["/api/reading-lessons"],
  });

  const createMutation = useMutation({
    mutationFn: (lesson: any) => apiRequest('POST', '/api/reading-lessons', lesson),
    onSuccess: (newLesson) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-lessons"] });
      setShowCreateDialog(false);
      setNewLessonForm({
        title: '',
        description: '',
        gradeLevel: '6',
        subject: 'Svenska',
        readingTime: 10,
        featuredImage: '',
      });
      toast({
        title: "Lektion skapad!",
        description: "Nu kan du börja redigera din nya lektion"
      });
      // Navigate to editor with the new lesson
      setLocation(`/lasforstaelse/skapa/${newLesson.id}`);
    },
    onError: (error) => {
      toast({
        title: "Kunde inte skapa lektion",
        description: "Försök igen",
        variant: "destructive"
      });
    }
  });

  const publishMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string, isPublished: boolean }) => 
      apiRequest('PUT', `/api/reading-lessons/${id}`, { isPublished: isPublished ? 1 : 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-lessons"] });
      toast({
        title: "Status uppdaterad!",
        description: "Lektionens publiceringsstatus har ändrats"
      });
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera publiceringsstatus",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/reading-lessons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-lessons"] });
      toast({
        title: "Lektion borttagen",
        description: "Lektionen har tagits bort permanent",
      });
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte ta bort lektionen",
        variant: "destructive",
      });
    },
  });

  const handleCreateLesson = () => {
    if (!newLessonForm.title.trim()) {
      toast({
        title: "Titel krävs",
        description: "Ange en titel för lektionen",
        variant: "destructive"
      });
      return;
    }

    const newLesson = {
      ...newLessonForm,
      content: "",
      preReadingQuestions: [],
      questions: [],
      wordDefinitions: [],
      isPublished: 0
    };
    
    createMutation.mutate(newLesson);
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "1": case "2": case "3": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "4": case "5": case "6": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "7": case "8": case "9": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getDifficultyText = (level: string) => {
    switch (level) {
      case "1": case "2": case "3": return "Lätt";
      case "4": case "5": case "6": return "Medel";
      case "7": case "8": case "9": return "Svår";
      default: return "Okänd";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
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
              Välj lektion att arbeta med
            </h1>
            <p className="text-gray-600">Välj en befintlig lektion att redigera eller skapa en ny</p>
          </div>
        </div>

        {/* Create New Lesson Button */}
        <div className="mb-8">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="lg" className="w-full md:w-auto" data-testid="button-create-new-lesson">
                <Plus className="w-5 h-5 mr-2" />
                Skapa ny lektion
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
                    <Label htmlFor="readingTime">Lästid (min)</Label>
                    <Input
                      id="readingTime"
                      type="number"
                      min="1"
                      max="120"
                      value={newLessonForm.readingTime}
                      onChange={(e) => setNewLessonForm(prev => ({ ...prev, readingTime: parseInt(e.target.value) || 10 }))}
                      data-testid="input-reading-time"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Avbryt
                </Button>
                <Button 
                  onClick={handleCreateLesson}
                  disabled={!newLessonForm.title.trim() || createMutation.isPending}
                  data-testid="button-create-lesson"
                >
                  {createMutation.isPending ? "Skapar..." : "Skapa lektion"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Existing Lessons */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Befintliga lektioner</h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
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
          ) : lessons && lessons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lessons.map(lesson => (
                <Card 
                  key={lesson.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => setLocation(`/lasforstaelse/skapa/${lesson.id}`)}
                  data-testid={`card-lesson-${lesson.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge className={getDifficultyColor(lesson.gradeLevel)}>
                        Årskurs {lesson.gradeLevel}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {lesson.readingTime} min
                      </div>
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-2">
                      {lesson.title || "Namnlös lektion"}
                    </CardTitle>
                    {lesson.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {lesson.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {lesson.featuredImage && (
                        <div className="w-full h-24 bg-muted rounded-lg overflow-hidden">
                          <img 
                            src={lesson.featuredImage} 
                            alt={lesson.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {getDifficultyText(lesson.gradeLevel)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {lesson.subject}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge variant={lesson.isPublished === 1 ? "default" : "secondary"}>
                          {lesson.isPublished === 1 ? "Publicerad" : "Utkast"}
                        </Badge>
                        <div className="flex gap-1 flex-wrap">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/lasforstaelse/lektion/${lesson.id}`);
                            }}
                            data-testid={`button-preview-lesson-${lesson.id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Förhandsgranska
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/lasforstaelse/skapa/${lesson.id}`);
                            }}
                            data-testid={`button-edit-lesson-${lesson.id}`}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Redigera
                          </Button>
                          <Button 
                            size="sm" 
                            variant={lesson.isPublished === 1 ? "destructive" : "default"}
                            onClick={(e) => {
                              e.stopPropagation();
                              publishMutation.mutate({ 
                                id: lesson.id, 
                                isPublished: lesson.isPublished !== 1 
                              });
                            }}
                            disabled={publishMutation.isPending}
                            data-testid={`button-publish-${lesson.id}`}
                          >
                            {lesson.isPublished === 1 ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-1" />
                                Avpublicera
                              </>
                            ) : (
                              <>
                                <Globe className="w-4 h-4 mr-1" />
                                Publicera
                              </>
                            )}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Är du säker på att du vill ta bort denna lektion? Detta kan inte ångras.")) {
                                deleteMutation.mutate(lesson.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-lesson-${lesson.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Ta bort
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Inga lektioner än</h3>
                <p className="text-muted-foreground mb-4">
                  Skapa din första lektion för att komma igång med läsförståelse-verktyget.
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Skapa första lektionen
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-12 text-center">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold mb-3">Så fungerar lektionsskaparen</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Välj en befintlig lektion att fortsätta arbeta med, eller skapa en ny. 
              När du klickar på en lektion öppnas det avancerade redigeringsverktyget 
              där du kan lägga till text, bilder, frågor och ordförklaringar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}