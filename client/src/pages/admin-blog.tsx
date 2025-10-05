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
import { RichTextEditor } from "@/components/RichTextEditor";
import { ArrowLeft, FileText, Edit, Eye, Trash2, Plus, Send, EyeOff } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

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

  // Form states for create/edit
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

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
    setMetaDescription("");
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
      metaDescription: metaDescription || undefined,
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
    setMetaDescription(post.metaDescription || "");
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
        metaDescription: metaDescription || undefined,
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
                      <RichTextEditor
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

                    <div>
                      <Label htmlFor="metaDesc">Meta-beskrivning</Label>
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
              <RichTextEditor
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

            <div>
              <Label htmlFor="edit-metaDesc">Meta-beskrivning</Label>
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
