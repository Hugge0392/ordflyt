import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Star, Pin, TrendingUp, ArrowUp } from 'lucide-react';

interface FeaturedSettingsProps {
  isFeatured: boolean;
  isSticky: boolean;
  featuredOrder?: number;
  onFeaturedChange: (featured: boolean) => void;
  onStickyChange: (sticky: boolean) => void;
  onFeaturedOrderChange: (order: number) => void;
}

export default function FeaturedSettings({
  isFeatured,
  isSticky,
  featuredOrder,
  onFeaturedChange,
  onStickyChange,
  onFeaturedOrderChange,
}: FeaturedSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-base">
          <Star className="h-5 w-5 mr-2" />
          Framhävning
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Gör detta inlägg mer synligt för läsare
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Featured Toggle */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-yellow-600" />
              <Label htmlFor="featured" className="cursor-pointer font-medium">
                Utvalt innehåll
              </Label>
              {isFeatured && (
                <Badge className="bg-yellow-600">Utvalt</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Visas i "Utvalt innehåll"-sektionen på startsidan
            </p>
          </div>
          <Switch
            id="featured"
            checked={isFeatured}
            onCheckedChange={onFeaturedChange}
          />
        </div>

        {/* Featured Order Input */}
        {isFeatured && (
          <div className="pl-6 space-y-2">
            <Label htmlFor="featured-order" className="text-xs">
              Sorteringsordning (lägre nummer = högre upp)
            </Label>
            <Input
              id="featured-order"
              type="number"
              value={featuredOrder || 0}
              onChange={(e) => onFeaturedOrderChange(parseInt(e.target.value) || 0)}
              min={0}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Utvalt innehåll sorteras enligt denna siffra
            </p>
          </div>
        )}

        {/* Sticky Toggle */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Pin className="h-4 w-4 text-blue-600" />
              <Label htmlFor="sticky" className="cursor-pointer font-medium">
                Klistrat inlägg
              </Label>
              {isSticky && (
                <Badge className="bg-blue-600">Klistrad</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Stannar alltid överst i bloggistan (WordPress "sticky post")
            </p>
          </div>
          <Switch
            id="sticky"
            checked={isSticky}
            onCheckedChange={onStickyChange}
          />
        </div>

        {/* Info Boxes */}
        {(isFeatured || isSticky) && (
          <div className="space-y-2 pt-2 border-t">
            {isFeatured && (
              <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <Star className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">Utvalt innehåll aktivt</p>
                  <p className="text-yellow-700 mt-1">
                    Detta inlägg visas framträdande på startsidan i "Utvalt innehåll"
                  </p>
                </div>
              </div>
            )}

            {isSticky && (
              <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                <ArrowUp className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Klistrat inlägg aktivt</p>
                  <p className="text-blue-700 mt-1">
                    Detta inlägg stannar alltid överst i bloggistan, oavsett publiceringsdatum
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Usage Tips */}
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs font-medium mb-2">💡 Tips för framhävning:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• <strong>Utvalt</strong>: Använd för viktiga guider eller populärt innehåll</li>
            <li>• <strong>Klistrat</strong>: Perfekt för nyheter eller tidsbegränsade kampanjer</li>
            <li>• Kombinera gärna båda för maximal synlighet</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
