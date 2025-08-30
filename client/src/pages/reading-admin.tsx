import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BookOpen, Edit, Eye, Trash2, Plus, X } from "lucide-react";

export default function ReadingAdmin() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [, setLocation] = useLocation();

  const { data: lessons = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/reading-lessons"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, lesson }: { id: string; lesson: any }) => {
      return apiRequest('PUT', `/api/reading-lessons/${id}`, lesson);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-lessons"] });
      toast({
        title: "Framgång",
        description: "Lektionen har uppdaterats",
      });
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera lektionen",
        variant: "destructive",
      });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async (id: string) => {
      const lesson = lessons.find(l => l.id === id);
      return apiRequest('PUT', `/api/reading-lessons/${id}`, { ...lesson, isPublished: 0 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-lessons"] });
      toast({
        title: "Framgång",
        description: "Lektionen har avpublicerats",
      });
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte avpublicera lektionen",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/reading-lessons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-lessons"] });
      toast({
        title: "Framgång",
        description: "Lektionen har tagits bort",
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
    setLocation("/admin/reading/create");
  };

  const handleEditLesson = (lesson: any) => {
    setLocation(`/admin/reading/edit/${lesson.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin">
            <Button variant="outline" size="sm" data-testid="button-back-admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka till adminpanel
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-blue-600" />
              Hantera läsförståelselektioner
            </h1>
            <p className="text-gray-600">Skapa, redigera och publicera lektioner</p>
          </div>
        </div>

        <div className="mb-6">
          <Button onClick={handleCreateLesson} data-testid="button-create-lesson">
            <Plus className="w-4 h-4 mr-2" />
            Skapa ny lektion
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Laddar lektioner...</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all-lessons">Alla lektioner</TabsTrigger>
              <TabsTrigger value="published" data-testid="tab-published-lessons">Publicerade</TabsTrigger>
              <TabsTrigger value="drafts" data-testid="tab-draft-lessons">Utkast</TabsTrigger>
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
                        <div>Innan du läser: {lesson.preReadingQuestions?.length || 0}</div>
                        <div>Frågor: {lesson.questions?.length || 0}</div>
                        <div>Ordförklaringar: {lesson.wordDefinitions?.length || 0}</div>
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
                        
                        {lesson.isPublished ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unpublishMutation.mutate(lesson.id)}
                            disabled={unpublishMutation.isPending}
                            data-testid={`button-unpublish-${lesson.id}`}
                          >
                            Avpublicera
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              updateMutation.mutate({ 
                                id: lesson.id, 
                                lesson: { ...lesson, isPublished: 1 } 
                              });
                            }}
                            disabled={updateMutation.isPending}
                            data-testid={`button-publish-${lesson.id}`}
                          >
                            Publicera
                          </Button>
                        )}
                        
                        {lesson.isPublished && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            data-testid={`button-view-${lesson.id}`}
                          >
                            <Link href={`/lasforstaelse/${lesson.id}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                        )}
                        
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