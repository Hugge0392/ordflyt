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
import { TiptapEditor } from "@/components/TiptapEditor";
import { ArrowLeft, FileText, Edit, Eye, Trash2, Plus, Send, EyeOff, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BLOG_CATEGORIES, PARENT_CATEGORIES, getCategoryDisplayName } from "@/lib/blogCategories";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  heroImageUrl?: string;
  metaDescription?: string;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  downloadCount: number;
}

export default function AdminBlog() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Form states for create/edit
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [category, setCategory] = useState<string>("allmant");
  const [focusKeyphrase, setFocusKeyphrase] = useState("");

  // Import form states
  const [importHtmlContent, setImportHtmlContent] = useState("");
  const [importCategoryId, setImportCategoryId] = useState("none");

  const { data: allPosts = [], isLoading: postsLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/blog/posts"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/admin/blog/posts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/posts"] });
      toast({ title: "Framgång", description: "Blogginlägg skapat" });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error('[createMutation] Error:', error);
      toast({
        title: "Fel",
        description: error.message || "Kunde inte skapa blogginlägg",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PUT", `/api/admin/blog/posts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/posts"] });
      toast({ title: "Framgång", description: "Blogginlägg uppdaterat" });
      setIsEditDialogOpen(false);
      setEditingPost(null);
      resetForm();
    },
    onError: (error: any) => {
      console.error('[updateMutation] Error:', error);
      toast({
        title: "Fel",
        description: error.message || "Kunde inte uppdatera blogginlägg",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/blog/posts/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/posts"] });
      toast({ title: "Framgång", description: "Blogginlägg borttaget" });
    }
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/admin/blog/posts/${id}/publish`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog/posts"] }); // Also invalidate public blog
      toast({
        title: "Publicerat!",
        description: "Blogginlägget syns nu på /blogg"
      });
    }
  });

  const unpublishMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/admin/blog/posts/${id}/unpublish`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog/posts"] }); // Also invalidate public blog
      toast({ title: "Dolt", description: "Blogginlägget syns inte längre publikt" });
    }
  });

  const importMutation = useMutation({
    mutationFn: async (data: { htmlContent: string; categoryId: string; publishImmediately: boolean }) => {
      return await apiRequest("POST", "/api/admin/blog/posts/import", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog/posts"] });
      toast({ 
        title: "Framgång!", 
        description: "Blogginlägget har importerats och publicerats" 
      });
      setIsImportDialogOpen(false);
      setImportHtmlContent("");
      setImportCategoryId("");
    },
    onError: (error: any) => {
      console.error('[importMutation] Error:', error);
      toast({
        title: "Fel",
        description: error.message || "Kunde inte importera blogginlägg",
        variant: "destructive"
      });
    }
  });

  const publishedPosts = allPosts.filter(post => post.isPublished);
  const draftPosts = allPosts.filter(post => !post.isPublished);

  const getPostsForTab = (tab: string) => {
    switch (tab) {
      case "published":
        return publishedPosts;
      case "drafts":
        return draftPosts;
      default:
        return allPosts;
    }
  };

  const currentPosts = getPostsForTab(activeTab);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setExcerpt("");
    setHeroImageUrl("");
    setMetaTitle("");
    setMetaDescription("");
    setKeywords([]);
    setKeywordInput("");
    setCategory("allmant");
    setFocusKeyphrase("");
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleKeywordInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleCreate = () => {
    if (!title || !content) {
      toast({
        title: "Fel",
        description: "Titel och innehåll är obligatoriska",
        variant: "destructive"
      });
      return;
    }

    const postData = {
      title,
      content,
      excerpt: excerpt || undefined,
      heroImageUrl: heroImageUrl || undefined,
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      keywords: keywords.length > 0 ? keywords : undefined,
      category,
      focusKeyphrase: focusKeyphrase || undefined,
      isPublished: false, // Always create as draft initially
    };

    console.log('[handleCreate] Sending blog post data:', postData);
    createMutation.mutate(postData);
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setTitle(post.title);
    setContent(post.content);
    setExcerpt(post.excerpt || "");
    setHeroImageUrl(post.heroImageUrl || "");
    setMetaTitle((post as any).metaTitle || "");
    setMetaDescription(post.metaDescription || "");
    setKeywords((post as any).keywords || []);
    setFocusKeyphrase((post as any).focusKeyphrase || "");
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingPost || !title || !content) {
      toast({
        title: "Fel",
        description: "Titel och innehåll är obligatoriska",
        variant: "destructive"
      });
      return;
    }

    updateMutation.mutate({
      id: editingPost.id,
      data: {
        title,
        content,
        excerpt: excerpt || undefined,
        heroImageUrl: heroImageUrl || undefined,
        metaTitle: metaTitle || undefined,
        metaDescription: metaDescription || undefined,
        keywords: keywords.length > 0 ? keywords : undefined,
        focusKeyphrase: focusKeyphrase || undefined,
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka till adminpanel
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-8 h-8 text-purple-600" />
              Blogg
            </h1>
            <p className="text-gray-600">Hantera blogginlägg och SEO-optimering</p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-between items-center">
              <TabsList className="grid w-fit grid-cols-3">
                <TabsTrigger value="all">Alla inlägg ({allPosts.length})</TabsTrigger>
                <TabsTrigger value="published">Publicerade ({publishedPosts.length})</TabsTrigger>
                <TabsTrigger value="drafts">Utkast ({draftPosts.length})</TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                      <Send className="w-4 h-4 mr-2" />
                      Importera HTML
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Importera blogginlägg från HTML</DialogTitle>
                      <DialogDescription>
                        Klistra in SEO-optimerad HTML. Metadata extraheras automatiskt.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="importCategory">Välj kategori (valfritt)</Label>
                        <Select value={importCategoryId} onValueChange={setImportCategoryId}>
                          <SelectTrigger id="importCategory">
                            <SelectValue placeholder="Ingen kategori" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Ingen kategori</SelectItem>
                            <SelectItem value="5b1791eb-c06a-4a64-85c0-b3a3ed6aeee3">Läsförståelse</SelectItem>
                            <SelectItem value="f0d509a1-df45-49c6-a3b0-ec3d5f35eb8c">Grammatik</SelectItem>
                            <SelectItem value="19c2d55e-176e-478c-8627-3aea3a563e23">Ordklasser</SelectItem>
                            <SelectItem value="466db888-3463-4148-8526-f3be473c6b17">Skrivande</SelectItem>
                            <SelectItem value="710a1a0a-694c-440d-be2e-78373ab2cc69">Ordkunskap</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                          Lämna tomt om kategori-ID:n skiljer sig mellan utveckling och produktion
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="htmlContent">HTML-innehåll *</Label>
                        <Textarea
                          id="htmlContent"
                          value={importHtmlContent}
                          onChange={(e) => setImportHtmlContent(e.target.value)}
                          placeholder="<h1>Titel här</h1><p>Innehåll...</p>..."
                          className="font-mono text-sm min-h-[300px]"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          HTML-filen ska innehålla:<br/>
                          - <code className="bg-gray-100 px-1 rounded">h1</code>-tag för titel<br/>
                          - <code className="bg-gray-100 px-1 rounded">p</code>-taggar för innehåll<br/>
                          - SEO-metadata längst ner (Meta-beskrivning, Nyckelord)
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        onClick={() => {
                          if (!importHtmlContent) {
                            toast({
                              title: "Fel",
                              description: "HTML-innehåll är obligatoriskt",
                              variant: "destructive"
                            });
                            return;
                          }
                          importMutation.mutate({ 
                            htmlContent: importHtmlContent, 
                            categoryId: importCategoryId === "none" ? "" : importCategoryId,
                            publishImmediately: true 
                          });
                        }}
                        disabled={importMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {importMutation.isPending ? "Importerar..." : "Importera och publicera"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-purple-600 hover:bg-purple-700" onClick={resetForm}>
                      <Plus className="w-4 h-4 mr-2" />
                      Skapa nytt inlägg
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Skapa nytt blogginlägg</DialogTitle>
                    <DialogDescription>
                      SEO-metadata genereras automatiskt från titel och innehåll
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="title">Titel *</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Titel på blogginlägget"
                      />
                      <p className="text-xs text-gray-500 mt-1">URL-slug genereras automatiskt från titeln</p>
                    </div>

                    <div className="border-l-4 border-blue-400 pl-4 bg-blue-50 p-3 rounded">
                      <h3 className="text-sm font-semibold text-blue-900 mb-3">SEO-inställningar</h3>

                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="metaTitle">Meta-titel (SEO)</Label>
                          <Input
                            id="metaTitle"
                            value={metaTitle}
                            onChange={(e) => setMetaTitle(e.target.value)}
                            placeholder="Lämna tom för att använda titeln"
                            maxLength={60}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {metaTitle.length}/60 tecken - visas i Google sökresultat
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="metaDesc">Meta-beskrivning (SEO)</Label>
                          <Textarea
                            id="metaDesc"
                            value={metaDescription}
                            onChange={(e) => setMetaDescription(e.target.value)}
                            placeholder="Lämna tomt för automatisk generering från innehållet"
                            rows={2}
                            maxLength={160}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {metaDescription.length}/160 tecken
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="focusKeyphrase">Fokus-nyckelord (primär SEO)</Label>
                          <Input
                            id="focusKeyphrase"
                            value={focusKeyphrase}
                            onChange={(e) => setFocusKeyphrase(e.target.value)}
                            placeholder="t.ex. läsförståelse övningar åk 6"
                          />
                          <p className="text-xs text-gray-500 mt-1">Primärt sökord för SEO</p>
                        </div>

                        <div>
                          <Label htmlFor="keywords">Nyckelord</Label>
                          <div className="flex gap-2 mb-2">
                            <Input
                              id="keywords"
                              value={keywordInput}
                              onChange={(e) => setKeywordInput(e.target.value)}
                              onKeyDown={handleKeywordInputKeyDown}
                              placeholder="Skriv nyckelord och tryck Enter"
                            />
                            <Button type="button" onClick={handleAddKeyword} size="sm" variant="outline">
                              Lägg till
                            </Button>
                          </div>
                          {keywords.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {keywords.map((keyword) => (
                                <Badge key={keyword} variant="secondary" className="gap-1">
                                  {keyword}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveKeyword(keyword)}
                                    className="ml-1 hover:bg-gray-300 rounded-full"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Lägg till relaterade sökord för bättre SEO
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="category">Kategori * (SEO)</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj kategori" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {PARENT_CATEGORIES.map(parent => (
                            <div key={parent.id}>
                              <div className="px-2 py-1.5 text-sm font-semibold text-gray-500">
                                {parent.emoji} {parent.name}
                              </div>
                              {Object.entries(BLOG_CATEGORIES)
                                .filter(([_, cat]) => cat.parentCategory === parent.name)
                                .map(([id, cat]) => (
                                  <SelectItem key={id} value={id} className="pl-6">
                                    {cat.iconEmoji} {cat.displayName}
                                  </SelectItem>
                                ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        {BLOG_CATEGORIES[category]?.seoKeywords[0] || 'Välj SEO-kategori'}
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="excerpt">Utdrag</Label>
                      <Textarea
                        id="excerpt"
                        value={excerpt}
                        onChange={(e) => setExcerpt(e.target.value)}
                        placeholder="Kort sammanfattning för förhandsvisningar (valfritt)"
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="content">Innehåll *</Label>
                      <TiptapEditor
                        value={content}
                        onChange={setContent}
                        placeholder="Skriv ditt blogginlägg här..."
                        className="min-h-[300px]"
                      />
                    </div>

                    <div>
                      <Label htmlFor="heroImage">Huvudbild URL</Label>
                      <Input
                        id="heroImage"
                        value={heroImageUrl}
                        onChange={(e) => setHeroImageUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg (valfritt)"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Avbryt
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={createMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {createMutation.isPending ? "Skapar..." : "Skapa inlägg"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <TabsContent value={activeTab} className="mt-6">
              {postsLoading ? (
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
              ) : currentPosts.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                      {activeTab === "published" ? "Inga publicerade inlägg" :
                       activeTab === "drafts" ? "Inga utkast" : "Inga blogginlägg"}
                    </h3>
                    <p className="text-gray-500 mb-6">
                      {activeTab === "published" ? "Du har inte publicerat några inlägg än." :
                       activeTab === "drafts" ? "Du har inga sparade utkast." : "Börja skapa blogginlägg för SEO."}
                    </p>
                    <Button
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Skapa ditt första inlägg
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentPosts.map((post) => (
                    <Card key={post.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{post.title}</CardTitle>
                            <CardDescription className="mt-1">
                              {post.excerpt || "Inget utdrag"}
                            </CardDescription>
                          </div>
                          <Badge variant={post.isPublished ? "default" : "secondary"}>
                            {post.isPublished ? "Publicerad" : "Utkast"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <div>Skapad: {new Date(post.createdAt).toLocaleDateString('sv-SE')}</div>
                          <div>Slug: /{post.slug}</div>
                          <div className="flex gap-4">
                            <span>👁️ {post.viewCount} visningar</span>
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          <Link href={`/admin/blog/preview/${post.slug}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(post)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {post.isPublished ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => unpublishMutation.mutate(post.id)}
                              disabled={unpublishMutation.isPending}
                            >
                              <EyeOff className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => publishMutation.mutate(post.id)}
                              disabled={publishMutation.isPending}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Ta bort blogginlägg</DialogTitle>
                                <DialogDescription>
                                  Är du säker på att du vill ta bort "{post.title}"? Detta kan inte ångras.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline">Avbryt</Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => deleteMutation.mutate(post.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  {deleteMutation.isPending ? "Tar bort..." : "Ta bort"}
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
          </div>
          </Tabs>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Redigera blogginlägg</DialogTitle>
            <DialogDescription>
              SEO-metadata genereras automatiskt om du lämnar fält tomma
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-title">Titel *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titel på blogginlägget"
              />
            </div>

            <div className="border-l-4 border-blue-400 pl-4 bg-blue-50 p-3 rounded">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">SEO-inställningar</h3>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="edit-metaTitle">Meta-titel (SEO)</Label>
                  <Input
                    id="edit-metaTitle"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="Lämna tom för att använda titeln"
                    maxLength={60}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {metaTitle.length}/60 tecken - visas i Google sökresultat
                  </p>
                </div>

                <div>
                  <Label htmlFor="edit-metaDesc">Meta-beskrivning (SEO)</Label>
                  <Textarea
                    id="edit-metaDesc"
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="Lämna tomt för automatisk generering"
                    rows={2}
                    maxLength={160}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {metaDescription.length}/160 tecken
                  </p>
                </div>

                <div>
                  <Label htmlFor="edit-focusKeyphrase">Fokus-nyckelord (primär SEO)</Label>
                  <Input
                    id="edit-focusKeyphrase"
                    value={focusKeyphrase}
                    onChange={(e) => setFocusKeyphrase(e.target.value)}
                    placeholder="t.ex. läsförståelse övningar åk 6"
                  />
                  <p className="text-xs text-gray-500 mt-1">Primärt sökord för SEO</p>
                </div>

                <div>
                  <Label htmlFor="edit-keywords">Nyckelord</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      id="edit-keywords"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={handleKeywordInputKeyDown}
                      placeholder="Skriv nyckelord och tryck Enter"
                    />
                    <Button type="button" onClick={handleAddKeyword} size="sm" variant="outline">
                      Lägg till
                    </Button>
                  </div>
                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((keyword) => (
                        <Badge key={keyword} variant="secondary" className="gap-1">
                          {keyword}
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(keyword)}
                            className="ml-1 hover:bg-gray-300 rounded-full"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Lägg till relaterade sökord för bättre SEO
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-excerpt">Utdrag</Label>
              <Textarea
                id="edit-excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Kort sammanfattning"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="edit-content">Innehåll *</Label>
              <TiptapEditor
                value={content}
                onChange={setContent}
                placeholder="Skriv ditt blogginlägg här..."
                className="min-h-[300px]"
              />
            </div>

            <div>
              <Label htmlFor="edit-heroImage">Huvudbild URL</Label>
              <Input
                id="edit-heroImage"
                value={heroImageUrl}
                onChange={(e) => setHeroImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Avbryt
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {updateMutation.isPending ? "Uppdaterar..." : "Uppdatera inlägg"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
