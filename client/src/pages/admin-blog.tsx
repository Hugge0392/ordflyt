import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Copy,
  Calendar,
  FileText,
  TrendingUp,
} from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  isPublished: boolean;
  publishedAt: string | null;
  scheduledFor: string | null;
  authorName: string;
  categoryId: string | null;
  tags: string[];
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminBlogPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');

  // Fetch all blog posts
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ['/api/blog/posts', statusFilter],
    queryFn: async () => {
      const url = statusFilter === 'all'
        ? '/api/blog/posts'
        : `/api/blog/posts?status=${statusFilter}`;
      return apiRequest('GET', url);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/blog/posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blog/posts'] });
      toast({
        title: 'Bloggpost raderad',
        description: 'Bloggposten har raderats permanent.',
      });
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Fel',
        description: error.message || 'Kunde inte radera bloggposten.',
        variant: 'destructive',
      });
    },
  });

  // Duplicate post mutation
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => apiRequest('POST', `/api/blog/posts/${id}/duplicate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blog/posts'] });
      toast({
        title: 'Bloggpost duplicerad',
        description: 'En kopia av bloggposten har skapats som utkast.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fel',
        description: error.message || 'Kunde inte duplicera bloggposten.',
        variant: 'destructive',
      });
    },
  });

  const filteredPosts = posts?.filter((post) => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const stats = {
    total: posts?.length || 0,
    published: posts?.filter(p => p.status === 'published').length || 0,
    drafts: posts?.filter(p => p.status === 'draft').length || 0,
    scheduled: posts?.filter(p => p.status === 'scheduled').length || 0,
    totalViews: posts?.reduce((sum, p) => sum + p.viewCount, 0) || 0,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      published: { variant: 'default', label: 'Publicerad' },
      draft: { variant: 'secondary', label: 'Utkast' },
      scheduled: { variant: 'outline', label: 'Schemalagd' },
      archived: { variant: 'destructive', label: 'Arkiverad' },
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const handleDelete = (id: string) => {
    setPostToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (postToDelete) {
      deleteMutation.mutate(postToDelete);
    }
  };

  const toggleSelectAll = () => {
    if (selectedPosts.length === filteredPosts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(filteredPosts.map(p => p.id));
    }
  };

  const toggleSelectPost = (postId: string) => {
    setSelectedPosts(prev =>
      prev.includes(postId)
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedPosts.length === 0) return;

    try {
      if (bulkAction === 'delete') {
        await Promise.all(
          selectedPosts.map(id => apiRequest('DELETE', `/api/blog/posts/${id}`))
        );
        toast({
          title: 'Raderat!',
          description: `${selectedPosts.length} bloggpost(er) har raderats.`,
        });
      } else if (bulkAction.startsWith('status-')) {
        const newStatus = bulkAction.replace('status-', '');
        await Promise.all(
          selectedPosts.map(id =>
            apiRequest('PUT', `/api/blog/posts/${id}`, { status: newStatus })
          )
        );
        toast({
          title: 'Uppdaterat!',
          description: `${selectedPosts.length} bloggpost(er) har uppdaterats.`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['/api/blog/posts'] });
      setSelectedPosts([]);
      setBulkAction('');
    } catch (error: any) {
      toast({
        title: 'Fel',
        description: error.message || 'Kunde inte utföra åtgärd.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Laddar bloggposter...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bloggposter</h1>
          <p className="text-muted-foreground">Hantera ditt blogginnehåll</p>
        </div>
        <Link href="/admin/blog/new">
          <Button size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Ny bloggpost
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totalt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <FileText className="h-4 w-4 mr-1" />
              Publicerade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.published}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Edit className="h-4 w-4 mr-1" />
              Utkast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.drafts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              Schemalagda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <TrendingUp className="h-4 w-4 mr-1" />
              Totala visningar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.totalViews}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Alla bloggposter</CardTitle>
          <CardDescription>
            Sök, filtrera och hantera dina bloggposter
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bulk Actions */}
          {selectedPosts.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium">
                {selectedPosts.length} markerad(e)
              </span>
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Välj åtgärd..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status-published">Markera som publicerad</SelectItem>
                  <SelectItem value="status-draft">Markera som utkast</SelectItem>
                  <SelectItem value="status-archived">Arkivera</SelectItem>
                  <SelectItem value="delete">Radera</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleBulkAction}
                disabled={!bulkAction}
                size="sm"
              >
                Verkställ
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPosts([])}
              >
                Avmarkera alla
              </Button>
            </div>
          )}

          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sök bloggposter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrera status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla statusar</SelectItem>
                <SelectItem value="published">Publicerade</SelectItem>
                <SelectItem value="draft">Utkast</SelectItem>
                <SelectItem value="scheduled">Schemalagda</SelectItem>
                <SelectItem value="archived">Arkiverade</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Posts Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <input
                      type="checkbox"
                      checked={selectedPosts.length === filteredPosts.length && filteredPosts.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4"
                    />
                  </TableHead>
                  <TableHead>Titel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Visningar</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead className="w-[100px]">Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'Inga bloggposter hittades' : 'Inga bloggposter ännu. Skapa din första!'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedPosts.includes(post.id)}
                          onChange={() => toggleSelectPost(post.id)}
                          className="w-4 h-4"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">{post.title}</div>
                          {post.excerpt && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {post.excerpt}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(post.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {post.categoryId || 'Ingen kategori'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          {post.viewCount}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {post.publishedAt
                            ? new Date(post.publishedAt).toLocaleDateString('sv-SE')
                            : new Date(post.createdAt).toLocaleDateString('sv-SE')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setLocation(`/admin/blog/edit/${post.id}`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Redigera
                            </DropdownMenuItem>
                            {post.isPublished && (
                              <DropdownMenuItem onClick={() => window.open(`/lektionsmaterial/${post.slug}`, '_blank')}>
                                <Eye className="h-4 w-4 mr-2" />
                                Förhandsgranska
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => duplicateMutation.mutate(post.id)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicera
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(post.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Radera
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Är du säker?</AlertDialogTitle>
            <AlertDialogDescription>
              Detta kommer att radera bloggposten permanent. Denna åtgärd kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Radera
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
