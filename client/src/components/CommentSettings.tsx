import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, AlertCircle } from 'lucide-react';

interface CommentSettingsProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  commentCount?: number;
}

export default function CommentSettings({
  enabled,
  onToggle,
  commentCount = 0,
}: CommentSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-base">
            <MessageCircle className="h-5 w-5 mr-2" />
            Kommentarer
          </CardTitle>
          <div className="flex items-center gap-2">
            <Switch
              id="comments-enabled"
              checked={enabled}
              onCheckedChange={onToggle}
            />
            <Label htmlFor="comments-enabled" className="cursor-pointer">
              {enabled ? 'Aktiverade' : 'Inaktiverade'}
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {enabled ? (
          <>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-2">
                <MessageCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="flex-1 text-sm text-green-900">
                  <p className="font-medium">Kommentarer är aktiverade</p>
                  <p className="text-xs mt-1">
                    Läsare kan lämna kommentarer på detta inlägg. Alla kommentarer måste godkännas av dig innan de publiceras.
                  </p>
                </div>
              </div>
            </div>

            {commentCount > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {commentCount} {commentCount === 1 ? 'kommentar' : 'kommentarer'}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Visa alla kommentarer i moderationspanelen
                  </p>
                </div>
                <Badge variant="default">{commentCount}</Badge>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Funktioner:</p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                <li>✓ Moderering krävs innan publicering</li>
                <li>✓ Spam-skydd aktiverat</li>
                <li>✓ Trådat kommentarssystem (svar på kommentarer)</li>
                <li>✓ E-postnotifieringar vid nya kommentarer</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-gray-600 mt-0.5" />
              <div className="flex-1 text-sm text-gray-700">
                <p className="font-medium">Kommentarer är inaktiverade</p>
                <p className="text-xs mt-1 text-gray-600">
                  Läsare kommer inte kunna kommentera detta inlägg. Befintliga kommentarer döljs också.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
