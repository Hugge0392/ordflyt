import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BookOpen, Edit, Eye, Trash2, Plus } from "lucide-react";

export default function AdminReading() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");

  const { data: publishedLessons = [], isLoading: lessonsLoading } = useQuery<any[]>({
    queryKey: ["/api/lessons/published"],
  });

  const { data: allLessons = [], isLoading: allLessonsLoading } = useQuery<any[]>({
    queryKey: ["/api/lessons"],
  });

  const unpublishMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const response = await apiRequest("POST", `/api/lessons/${lessonId}/unpublish`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lessons/published"] });
      toast({ title: "Framgång", description: "Lektion dold från elever" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const response = await apiRequest("DELETE", `/api/lessons/${lessonId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lessons/published"] });
      toast({ title: "Framgång", description: "Lektion borttagen" });
    }
  });

  const publishedLessonsData = allLessons.filter(lesson => lesson.isPublished);
  const draftLessonsData = allLessons.filter(lesson => !lesson.isPublished);

  const getLessonsForTab = (tab: string) => {
    switch (tab) {
      case "published":
        return publishedLessonsData;
      case "drafts":
        return draftLessonsData;
      default:
        return allLessons;
    }
  };

  const currentLessons = getLessonsForTab(activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6">
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
              <BookOpen className="w-8 h-8 text-teal-600" />
              Läsförståelse
            </h1>
            <p className="text-gray-600">Hantera läsförståelselektioner och texter</p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-between items-center">
              <TabsList className="grid w-fit grid-cols-3">
                <TabsTrigger value="all" data-testid="tab-all-lessons">Alla lektioner ({allLessons.length})</TabsTrigger>
                <TabsTrigger value="published" data-testid="tab-published-lessons">Publicerade ({publishedLessonsData.length})</TabsTrigger>
                <TabsTrigger value="drafts" data-testid="tab-draft-lessons">Utkast ({draftLessonsData.length})</TabsTrigger>
              </TabsList>
              
              <Link href="/lesson-builder">
                <Button className="bg-teal-600 hover:bg-teal-700" data-testid="button-create-lesson">
                  <Plus className="w-4 h-4 mr-2" />
                  Skapa ny lektion
                </Button>
              </Link>
            </div>

            <TabsContent value={activeTab} className="mt-6">
              {allLessonsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-200 rounded"></div>
                          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : currentLessons.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                      {activeTab === "published" ? "Inga publicerade lektioner" : 
                       activeTab === "drafts" ? "Inga utkast" : "Inga lektioner"}
                    </h3>
                    <p className="text-gray-500 mb-6">
                      {activeTab === "published" ? "Du har inte publicerat några lektioner än." : 
                       activeTab === "drafts" ? "Du har inga sparade utkast." : "Börja skapa läsförståelselektioner för dina elever."}
                    </p>
                    <Link href="/lesson-builder">
                      <Button className="bg-teal-600 hover:bg-teal-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Skapa din första lektion
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentLessons.map((lesson) => (
                    <Card key={lesson.id} className="hover:shadow-lg transition-shadow">
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
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <div>Skapad: {new Date(lesson.createdAt).toLocaleDateString('sv-SE')}</div>
                          {lesson.featuredImage && (
                            <div>📸 Har utvald bild</div>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Link href={`/reading/${lesson.id}`}>
                            <Button variant="outline" size="sm" data-testid={`button-view-${lesson.id}`}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Link href={`/lesson-builder?edit=${lesson.id}`}>
                            <Button variant="outline" size="sm" data-testid={`button-edit-${lesson.id}`}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          {activeTab === "published" && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => unpublishMutation.mutate(lesson.id)}
                              disabled={unpublishMutation.isPending}
                              data-testid={`button-unpublish-${lesson.id}`}
                            >
                              Göm
                            </Button>
                          )}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                data-testid={`button-delete-${lesson.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Ta bort lektion</DialogTitle>
                                <DialogDescription>
                                  Är du säker på att du vill ta bort lektionen "{lesson.title}"? 
                                  Detta kan inte ångras.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline">Avbryt</Button>
                                <Button 
                                  variant="destructive"
                                  onClick={() => deleteMutation.mutate(lesson.id)}
                                  disabled={deleteMutation.isPending}
                                  data-testid={`confirm-delete-${lesson.id}`}
                                >
                                  Ta bort
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}