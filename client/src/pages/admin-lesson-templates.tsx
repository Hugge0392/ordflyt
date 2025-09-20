import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Plus, 
  Settings, 
  Edit, 
  Trash2, 
  Copy,
  BookOpen,
  Clock,
  Target,
  Users,
  Eye
} from "lucide-react";
import { 
  type LessonTemplate, 
  type LessonCategory,
  insertLessonTemplateSchema
} from "@shared/schema";

// Form schema for creating/editing lesson templates
const lessonTemplateSchema = insertLessonTemplateSchema.extend({
  estimatedDuration: z.number().min(5).max(120),
  description: z.string().optional(),
  difficulty: z.string().optional(),
});

type LessonTemplateForm = z.infer<typeof lessonTemplateSchema>;

export default function AdminLessonTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LessonTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  // Set page title and meta description
  useEffect(() => {
    document.title = "Lesson Templates | Admin";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Hantera lesson templates och kategorier för svenska lektioner.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Hantera lesson templates och kategorier för svenska lektioner.';
      document.head.appendChild(meta);
    }
  }, []);

  // Fetch lesson templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery<LessonTemplate[]>({
    queryKey: ["/api/lesson-templates"],
  });

  // Fetch lesson categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<LessonCategory[]>({
    queryKey: ["/api/lesson-categories"],
  });

  // Form for creating/editing templates
  const form = useForm<LessonTemplateForm>({
    resolver: zodResolver(lessonTemplateSchema),
    defaultValues: {
      title: "",
      description: "",
      categoryId: "",
      difficulty: "medium",
      estimatedDuration: 15,
      templateData: {
        components: {},
        settings: {
          allowCustomization: true,
          defaultDifficulty: "medium",
          estimatedDuration: 15
        }
      },
      tags: []
    },
  });

  // Create lesson template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: LessonTemplateForm) => {
      return apiRequest('POST', '/api/lesson-templates', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lesson-templates"] });
      toast({
        title: "Framgång",
        description: "Lesson template skapad!"
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Fel",
        description: error.message || "Kunde inte skapa lesson template",
        variant: "destructive"
      });
    }
  });

  // Update lesson template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<LessonTemplateForm> }) => {
      return apiRequest('PUT', `/api/lesson-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lesson-templates"] });
      toast({
        title: "Framgång",
        description: "Lesson template uppdaterad!"
      });
      setEditingTemplate(null);
    },
    onError: (error: any) => {
      toast({
        title: "Fel",
        description: error.message || "Kunde inte uppdatera lesson template",
        variant: "destructive"
      });
    }
  });

  // Delete lesson template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/lesson-templates/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lesson-templates"] });
      toast({
        title: "Framgång",
        description: "Lesson template borttagen!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fel",
        description: error.message || "Kunde inte ta bort lesson template",
        variant: "destructive"
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: LessonTemplateForm) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  // Filter templates based on active tab
  const getFilteredTemplates = () => {
    switch (activeTab) {
      case "grammar":
        return templates.filter(t => categories.find(c => c.id === t.categoryId)?.name === "grammar");
      case "reading":
        return templates.filter(t => categories.find(c => c.id === t.categoryId)?.name === "reading");
      case "writing":
        return templates.filter(t => categories.find(c => c.id === t.categoryId)?.name === "writing");
      default:
        return templates;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.swedishName || category?.name || 'Okänd kategori';
  };

  const filteredTemplates = getFilteredTemplates();

  if (templatesLoading || categoriesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-50">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <div className="text-lg text-gray-600">Laddar lesson templates...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/lessons">
            <Button variant="outline" size="sm" data-testid="button-back-admin-lessons">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka till lektioner
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-8 h-8 text-orange-600" />
              Lesson Templates
            </h1>
            <p className="text-gray-600">Hantera återanvändbara lesson templates för lärare</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-orange-600 hover:bg-orange-700 text-white"
                data-testid="button-create-template"
              >
                <Plus className="w-4 h-4 mr-2" />
                Skapa Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Skapa Ny Lesson Template</DialogTitle>
                <DialogDescription>
                  Skapa en återanvändbar lesson template som lärare kan använda.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Titel</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="T.ex. Substantiv grundkurs" 
                              data-testid="input-template-title"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kategori</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-template-category">
                                <SelectValue placeholder="Välj kategori" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.swedishName || category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Beskrivning</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Beskriv vad denna lesson template handlar om..."
                            data-testid="textarea-template-description"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="difficulty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Svårighetsgrad</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-template-difficulty">
                                <SelectValue placeholder="Välj svårighetsgrad" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="easy">Lätt</SelectItem>
                              <SelectItem value="medium">Medel</SelectItem>
                              <SelectItem value="hard">Svår</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="estimatedDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Beräknad tid (minuter)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="5" 
                              max="120"
                              placeholder="15"
                              data-testid="input-template-duration"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      data-testid="button-cancel-template"
                    >
                      Avbryt
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createTemplateMutation.isPending}
                      data-testid="button-save-template"
                    >
                      {createTemplateMutation.isPending ? "Skapar..." : "Skapa Template"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totalt Templates</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{templates.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kategorier</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categories.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Medel Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {templates.length > 0 
                  ? Math.round(templates.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0) / templates.length)
                  : 0
                } min
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Publicerade</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {templates.filter(t => t.isPublished).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and Templates List */}
        <Card>
          <CardHeader>
            <CardTitle>Lesson Templates</CardTitle>
            <CardDescription>
              Hantera alla lesson templates som lärare kan använda för sina lektioner.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="all" data-testid="tab-all-templates">Alla ({templates.length})</TabsTrigger>
                <TabsTrigger value="grammar" data-testid="tab-grammar-templates">
                  Grammatik ({templates.filter(t => categories.find(c => c.id === t.categoryId)?.name === "grammar").length})
                </TabsTrigger>
                <TabsTrigger value="reading" data-testid="tab-reading-templates">
                  Läsning ({templates.filter(t => categories.find(c => c.id === t.categoryId)?.name === "reading").length})
                </TabsTrigger>
                <TabsTrigger value="writing" data-testid="tab-writing-templates">
                  Skrivning ({templates.filter(t => categories.find(c => c.id === t.categoryId)?.name === "writing").length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="space-y-4">
                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-xl font-bold text-gray-600 mb-2">
                      Inga lesson templates hittades
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Skapa din första lesson template för att komma igång.
                    </p>
                    <Button 
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                      data-testid="button-create-first-template"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Skapa Template
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Titel</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Svårighetsgrad</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Åtgärder</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTemplates.map((template) => (
                        <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{template.title}</div>
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {template.description || 'Ingen beskrivning'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {getCategoryName(template.categoryId)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              className={getDifficultyColor(template.difficulty)}
                            >
                              {getDifficultyText(template.difficulty)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              {template.estimatedDuration || 0} min
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={template.isPublished ? "default" : "secondary"}
                              className={template.isPublished ? "bg-green-100 text-green-800" : ""}
                            >
                              {template.isPublished ? "Publicerad" : "Utkast"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                data-testid={`button-edit-${template.id}`}
                                onClick={() => {
                                  setEditingTemplate(template);
                                  form.reset({
                                    title: template.title,
                                    description: template.description || '',
                                    categoryId: template.categoryId,
                                    difficulty: template.difficulty || 'medium',
                                    estimatedDuration: template.estimatedDuration || 15,
                                    templateData: template.templateData,
                                    tags: template.tags || []
                                  });
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                data-testid={`button-copy-${template.id}`}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700"
                                data-testid={`button-delete-${template.id}`}
                                onClick={() => {
                                  if (confirm('Är du säker på att du vill ta bort denna lesson template?')) {
                                    deleteTemplateMutation.mutate(template.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Edit Template Dialog */}
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Redigera Lesson Template</DialogTitle>
              <DialogDescription>
                Uppdatera lesson template informationen.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Titel</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="T.ex. Substantiv grundkurs" 
                            data-testid="input-edit-template-title"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kategori</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-template-category">
                              <SelectValue placeholder="Välj kategori" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.swedishName || category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beskrivning</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Beskriv vad denna lesson template handlar om..."
                          data-testid="textarea-edit-template-description"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Svårighetsgrad</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-template-difficulty">
                              <SelectValue placeholder="Välj svårighetsgrad" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="easy">Lätt</SelectItem>
                            <SelectItem value="medium">Medel</SelectItem>
                            <SelectItem value="hard">Svår</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="estimatedDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Beräknad tid (minuter)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="5" 
                            max="120"
                            placeholder="15"
                            data-testid="input-edit-template-duration"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setEditingTemplate(null)}
                    data-testid="button-cancel-edit-template"
                  >
                    Avbryt
                  </Button>
                  <Button 
                    type="submit"
                    disabled={updateTemplateMutation.isPending}
                    data-testid="button-save-edit-template"
                  >
                    {updateTemplateMutation.isPending ? "Sparar..." : "Spara Ändringar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}