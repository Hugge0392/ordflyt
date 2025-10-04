import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import {
  Link as LinkIcon,
  X,
  Search,
  Plus,
  Calendar,
  Eye,
} from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: string;
  publishedAt: string | null;
  viewCount: number;
  categoryId: string | null;
  tags: string[];
}

interface RelatedPostsSelectorProps {
  currentPostId?: string;
  selectedPostIds: string[];
  onPostsChange: (postIds: string[]) => void;
  categoryId?: string;
  tags?: string[];
}

export default function RelatedPostsSelector({
  currentPostId,
  selectedPostIds,
  onPostsChange,
  categoryId,
  tags = [],
}: RelatedPostsSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);

  const { data: allPosts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ['/api/blog/posts'],
    queryFn: () => apiRequest('GET', '/api/blog/posts?status=all'),
  });

  // Filter out current post and already selected posts
  const availablePosts = allPosts?.filter(
    p => p.id !== currentPostId && !selectedPostIds.includes(p.id)
  ) || [];

  // Search filter
  const filteredPosts = availablePosts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get suggested posts based on category and tags
  const suggestedPosts = availablePosts
    .filter(post => {
      const sameCategory = post.categoryId === categoryId;
      const sharedTags = post.tags.filter(tag => tags.includes(tag)).length;
      return sameCategory || sharedTags > 0;
    })
    .sort((a, b) => {
      // Sort by relevance: same category first, then by shared tags count
      const aCategory = a.categoryId === categoryId ? 1 : 0;
      const bCategory = b.categoryId === categoryId ? 1 : 0;
      if (aCategory !== bCategory) return bCategory - aCategory;

      const aSharedTags = a.tags.filter(tag => tags.includes(tag)).length;
      const bSharedTags = b.tags.filter(tag => tags.includes(tag)).length;
      return bSharedTags - aSharedTags;
    })
    .slice(0, 5);

  const selectedPosts = allPosts?.filter(p => selectedPostIds.includes(p.id)) || [];

  const handleAdd = (postId: string) => {
    if (!selectedPostIds.includes(postId)) {
      onPostsChange([...selectedPostIds, postId]);
    }
  };

  const handleRemove = (postId: string) => {
    onPostsChange(selectedPostIds.filter(id => id !== postId));
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Ej publicerad';
    return new Date(date).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const PostCard = ({ post, onAction, actionIcon, actionLabel }: {
    post: BlogPost;
    onAction: () => void;
    actionIcon: React.ReactNode;
    actionLabel: string;
  }) => (
    <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{post.title}</div>
        {post.excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {post.excerpt}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            {post.status === 'published' ? 'Publicerad' : 'Utkast'}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDate(post.publishedAt)}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3 w-3" />
            {post.viewCount}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onAction}
        title={actionLabel}
      >
        {actionIcon}
      </Button>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-base">
          <LinkIcon className="h-5 w-5 mr-2" />
          Relaterade inlägg
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Föreslå relaterat innehåll till läsarna
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Posts */}
        {selectedPosts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Valda inlägg ({selectedPosts.length})</span>
              {selectedPosts.length >= 3 && (
                <Badge variant="outline">Max 6 rekommenderat</Badge>
              )}
            </div>
            {selectedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onAction={() => handleRemove(post.id)}
                actionIcon={<X className="h-4 w-4" />}
                actionLabel="Ta bort"
              />
            ))}
          </div>
        )}

        {/* Suggestions */}
        {suggestedPosts.length > 0 && showSuggestions && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-600">
                Föreslagna inlägg
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSuggestions(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Baserat på kategori och taggar
            </p>
            {suggestedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onAction={() => handleAdd(post.id)}
                actionIcon={<Plus className="h-4 w-4" />}
                actionLabel="Lägg till"
              />
            ))}
          </div>
        )}

        {/* Search */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sök efter inlägg att lägga till..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {searchTerm && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Inga inlägg hittades
                </p>
              ) : (
                filteredPosts.slice(0, 5).map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onAction={() => handleAdd(post.id)}
                    actionIcon={<Plus className="h-4 w-4" />}
                    actionLabel="Lägg till"
                  />
                ))
              )}
            </div>
          )}
        </div>

        {selectedPosts.length === 0 && !showSuggestions && !searchTerm && (
          <div className="text-center py-8 text-muted-foreground">
            <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Inga relaterade inlägg valda</p>
            <p className="text-xs mt-1">Sök efter inlägg att lägga till</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
