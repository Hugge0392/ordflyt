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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Palette,
  Hash,
  Folder,
  FolderOpen,
  BookOpen,
  Target,
  Users,
  Brain,
  Languages,
  Mic,
  Pencil,
  Settings
} from "lucide-react";
import { 
  type LessonCategory,
  insertLessonCategorySchema
} from "@shared/schema";

// Available icons mapping - supports both kebab-case (new) and PascalCase (legacy)
const AVAILABLE_ICONS = {
  // Kebab-case (new format)
  'book-open': BookOpen,
  'folder': Folder,  
  'folder-open': FolderOpen,
  'target': Target,
  'users': Users,
  'brain': Brain,
  'languages': Languages,
  'mic': Mic,
  'pencil': Pencil,
  'settings': Settings,
  // Legacy PascalCase (for existing data)
  'BookOpen': BookOpen,
  'Type': Users, // Map old 'Type' to 'users' icon
  'FileText': BookOpen, // Map old 'FileText' to 'book-open' icon
  'PenTool': Pencil, // Map old 'PenTool' to 'pencil' icon
  'Sparkles': Settings, // Map old 'Sparkles' to 'settings' icon
} as const;

// Available colors
const AVAILABLE_COLORS = [
  { name: 'Blå', value: '#3B82F6' },
  { name: 'Grön', value: '#10B981' },
  { name: 'Lila', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Gul', value: '#F59E0B' },
  { name: 'Röd', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Grå', value: '#6B7280' },
  { name: 'Indigo', value: '#4F46E5' }
];

// Form schema for creating/editing categories
const categorySchema = insertLessonCategorySchema.extend({
  description: z.string().optional(),
  icon: z.string().optional(),
});

type CategoryForm = z.infer<typeof categorySchema>;

export default function AdminCategories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LessonCategory | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  // Set page title and meta description
  useEffect(() => {
    document.title = "Lektionskategorier | Admin";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Hantera lektionskategorier med färger och ikoner för bättre organisation.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Hantera lektionskategorier med färger och ikoner för bättre organisation.';
      document.head.appendChild(meta);
    }
  }, []);

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<LessonCategory[]>({
    queryKey: ["/api/lesson-categories"],
  });

  // Form for creating/editing categories  
  const form = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      swedishName: "",
      description: "",
      color: "#3B82F6",
      icon: "book-open",
      parentId: "",
      sortOrder: 0,
      isActive: true,
    },
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryForm) => {
      return apiRequest('POST', '/api/lesson-categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lesson-categories"] });
      toast({
        title: "Framgång",
        description: "Kategori skapad!"
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Fel",
        description: error.message || "Kunde inte skapa kategori",
        variant: "destructive"
      });
    }
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<CategoryForm> }) => {
      return apiRequest('PUT', `/api/lesson-categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lesson-categories"] });
      toast({
        title: "Framgång",
        description: "Kategori uppdaterad!"
      });
      setEditingCategory(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Fel", 
        description: error.message || "Kunde inte uppdatera kategori",
        variant: "destructive"
      });
    }
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/lesson-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lesson-categories"] });
      toast({
        title: "Framgång",
        description: "Kategori borttagen!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fel",
        description: error.message || "Kunde inte ta bort kategori",
        variant: "destructive"
      });
    }
  });

  // Handle create/edit submission
  const onSubmit = async (data: CategoryForm) => {
    // Normalize parentId: convert empty string to undefined/null
    const normalizedData = {
      ...data,
      parentId: data.parentId === "" ? undefined : data.parentId,
    };
    
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: normalizedData });
    } else {
      createCategoryMutation.mutate(normalizedData);
    }
  };

  // Handle edit click
  const handleEditCategory = (category: LessonCategory) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      swedishName: category.swedishName,
      description: category.description || "",
      color: category.color || "#3B82F6",
      icon: category.icon || "book-open", 
      parentId: category.parentId || "",
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
    setIsCreateDialogOpen(true);
  };

  // Handle create new category
  const handleCreateCategory = () => {
    setEditingCategory(null);
    form.reset();
    setIsCreateDialogOpen(true);
  };

  // Get main categories (no parent)
  const mainCategories = categories.filter(cat => !cat.parentId);
  
  // Get subcategories for a parent
  const getSubcategories = (parentId: string) => {
    return categories.filter(cat => cat.parentId === parentId);
  };

  // Get icon component
  const getIconComponent = (iconName?: string) => {
    if (!iconName || !(iconName in AVAILABLE_ICONS)) {
      return BookOpen;
    }
    return AVAILABLE_ICONS[iconName as keyof typeof AVAILABLE_ICONS];
  };

  if (categoriesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-8">
            <div className="text-lg">Laddar kategorier...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Tillbaka till admin
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  Lektionskategorier
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Hantera kategorier med färger och ikoner
                </p>
              </div>
            </div>
            
            <Button 
              onClick={handleCreateCategory}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-create-category"
            >
              <Plus className="h-4 w-4 mr-2" />
              Skapa kategori
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">Alla kategorier</TabsTrigger>
            <TabsTrigger value="hierarchy">Hierarki</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {categories.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Folder className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Inga kategorier än</h3>
                  <p className="text-gray-600 mb-6">
                    Skapa din första kategori för att organisera lektioner.
                  </p>
                  <Button onClick={handleCreateCategory}>
                    <Plus className="h-4 w-4 mr-2" />
                    Skapa kategori
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Alla kategorier ({categories.length})</CardTitle>
                  <CardDescription>
                    Hantera alla lektionskategorier här
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Förälder</TableHead>
                        <TableHead>Färg</TableHead>
                        <TableHead>Sortering</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Åtgärder</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category) => {
                        const IconComponent = getIconComponent(category.icon);
                        const parentCategory = categories.find(c => c.id === category.parentId);
                        
                        return (
                          <TableRow key={category.id} data-testid={`row-category-${category.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: `${category.color}20` }}
                                >
                                  <IconComponent
                                    className="h-4 w-4"
                                    style={{ color: category.color }}
                                  />
                                </div>
                                <div>
                                  <div className="font-medium">{category.swedishName}</div>
                                  <div className="text-sm text-muted-foreground">{category.name}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {parentCategory ? (
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-4 h-4 rounded"
                                    style={{ backgroundColor: parentCategory.color }}
                                  />
                                  {parentCategory.swedishName}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Huvudkategori</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded border"
                                  style={{ backgroundColor: category.color }}
                                />
                                <span className="font-mono text-xs">{category.color}</span>
                              </div>
                            </TableCell>
                            <TableCell>{category.sortOrder}</TableCell>
                            <TableCell>
                              <Badge variant={category.isActive ? "default" : "secondary"}>
                                {category.isActive ? "Aktiv" : "Inaktiv"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEditCategory(category)}
                                  data-testid={`button-edit-${category.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      data-testid={`button-delete-${category.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Ta bort kategori?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Detta kommer att ta bort kategorin "{category.swedishName}". 
                                        Åtgärden kan inte ångras.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteCategoryMutation.mutate(category.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Ta bort
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="hierarchy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Kategori-hierarki</CardTitle>
                <CardDescription>
                  Visa kategorier i hierarkisk struktur
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mainCategories.map((mainCategory) => {
                    const subcategories = getSubcategories(mainCategory.id);
                    const IconComponent = getIconComponent(mainCategory.icon);
                    
                    return (
                      <div key={mainCategory.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: `${mainCategory.color}20` }}
                            >
                              <IconComponent
                                className="h-5 w-5"
                                style={{ color: mainCategory.color }}
                              />
                            </div>
                            <div>
                              <h3 className="font-semibold">{mainCategory.swedishName}</h3>
                              <p className="text-sm text-muted-foreground">{mainCategory.name}</p>
                            </div>
                            <Badge variant="outline">
                              {subcategories.length} underkategorier
                            </Badge>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditCategory(mainCategory)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {subcategories.length > 0 && (
                          <div className="ml-13 mt-4 space-y-2">
                            {subcategories.map((subcategory) => {
                              const SubIconComponent = getIconComponent(subcategory.icon);
                              return (
                                <div key={subcategory.id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-6 h-6 rounded flex items-center justify-center"
                                      style={{ backgroundColor: `${subcategory.color}20` }}
                                    >
                                      <SubIconComponent
                                        className="h-3 w-3"
                                        style={{ color: subcategory.color }}
                                      />
                                    </div>
                                    <span className="text-sm">{subcategory.swedishName}</span>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleEditCategory(subcategory)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Redigera kategori" : "Skapa ny kategori"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory 
                ? "Uppdatera kategoriinformation"
                : "Skapa en ny kategori för att organisera lektioner"
              }
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tekniskt namn</FormLabel>
                      <FormControl>
                        <Input placeholder="t.ex. grammar" {...field} data-testid="input-name" />
                      </FormControl>
                      <FormDescription>
                        Används internt (endast engelska bokstäver)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="swedishName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Svenskt namn</FormLabel>
                      <FormControl>
                        <Input placeholder="t.ex. Grammatik" {...field} data-testid="input-swedish-name" />
                      </FormControl>
                      <FormDescription>
                        Visas för användarna
                      </FormDescription>
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
                        placeholder="Kort beskrivning av kategorin" 
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Färg</FormLabel>
                      <div className="grid grid-cols-5 gap-2">
                        {AVAILABLE_COLORS.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            className={`w-10 h-10 rounded-full border-2 transition-all ${
                              field.value === color.value 
                                ? 'border-gray-900 scale-110' 
                                : 'border-gray-300 hover:border-gray-500'
                            }`}
                            style={{ backgroundColor: color.value }}
                            onClick={() => field.onChange(color.value)}
                            title={color.name}
                            data-testid={`color-${color.value}`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <Input 
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          placeholder="#3B82F6"
                          className="font-mono"
                          data-testid="input-color-hex"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ikon</FormLabel>
                      <div className="grid grid-cols-5 gap-2">
                        {Object.entries(AVAILABLE_ICONS).map(([iconName, IconComponent]) => (
                          <button
                            key={iconName}
                            type="button"
                            className={`w-10 h-10 rounded border-2 flex items-center justify-center transition-all ${
                              field.value === iconName 
                                ? 'border-gray-900 bg-gray-100' 
                                : 'border-gray-300 hover:border-gray-500'
                            }`}
                            onClick={() => field.onChange(iconName)}
                            title={iconName}
                            data-testid={`icon-${iconName}`}
                          >
                            <IconComponent className="h-5 w-5" />
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="parentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Förälderkategori</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-parent">
                            <SelectValue placeholder="Välj förälderkategori (valfritt)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Ingen (huvudkategori)</SelectItem>
                          {mainCategories
                            .filter(cat => cat.id !== editingCategory?.id)
                            .map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.swedishName}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Skapa en underkategori genom att välja en förälder
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sorteringsordning</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-sort-order"
                        />
                      </FormControl>
                      <FormDescription>
                        Lägre nummer visas först
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Avbryt
                </Button>
                <Button 
                  type="submit" 
                  disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                  data-testid="button-save"
                >
                  {createCategoryMutation.isPending || updateCategoryMutation.isPending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-border border-t-foreground" />
                      Sparar...
                    </>
                  ) : (
                    editingCategory ? "Uppdatera" : "Skapa"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}