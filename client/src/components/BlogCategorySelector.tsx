import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { Folder, Loader2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  swedishName: string;
  description: string;
  color: string;
  icon: string;
  isActive: boolean;
}

interface BlogCategorySelectorProps {
  selectedCategoryId?: string;
  onCategoryChange: (categoryId: string) => void;
}

export default function BlogCategorySelector({
  selectedCategoryId,
  onCategoryChange,
}: BlogCategorySelectorProps) {
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ['/api/lesson-categories'],
    queryFn: () => apiRequest('GET', '/api/lesson-categories?active=true'),
  });

  const selectedCategory = categories?.find(c => c.id === selectedCategoryId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Laddar kategorier...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="category">Kategori</Label>
      <Select value={selectedCategoryId || ''} onValueChange={onCategoryChange}>
        <SelectTrigger id="category">
          <SelectValue placeholder="Välj kategori...">
            {selectedCategory && (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedCategory.color }}
                />
                <span>{selectedCategory.swedishName}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Ingen kategori</span>
            </div>
          </SelectItem>
          {categories?.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <span>{category.swedishName}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedCategory && (
        <p className="text-xs text-muted-foreground">
          {selectedCategory.description}
        </p>
      )}
    </div>
  );
}
