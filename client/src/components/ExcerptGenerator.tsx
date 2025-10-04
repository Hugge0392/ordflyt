import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Wand2, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface ExcerptGeneratorProps {
  content: any;
  currentExcerpt: string;
  onExcerptChange: (excerpt: string) => void;
  maxLength?: number;
}

export default function ExcerptGenerator({
  content,
  currentExcerpt,
  onExcerptChange,
  maxLength = 200,
}: ExcerptGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateExcerpt = () => {
    setIsGenerating(true);

    // Extract text from content
    let text = '';
    if (content?.html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content.html, 'text/html');
      text = doc.body.textContent || '';
    } else if (typeof content === 'string') {
      text = content;
    }

    // Clean up text
    text = text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ');

    if (!text) {
      setIsGenerating(false);
      return;
    }

    // Get first sentence or two, up to maxLength
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let excerpt = '';

    for (const sentence of sentences) {
      const testExcerpt = excerpt + sentence.trim() + '.';
      if (testExcerpt.length <= maxLength) {
        excerpt = testExcerpt;
      } else {
        break;
      }
    }

    // If no full sentences fit, just truncate
    if (!excerpt && text.length > 0) {
      excerpt = text.substring(0, maxLength - 3) + '...';
    }

    // Ensure it ends properly
    if (excerpt && !excerpt.endsWith('.') && !excerpt.endsWith('...')) {
      excerpt += '...';
    }

    onExcerptChange(excerpt.trim());

    setTimeout(() => setIsGenerating(false), 300);
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="excerpt">Utdrag</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generateExcerpt}
            disabled={isGenerating || !content}
            className="text-xs"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Genererar...
              </>
            ) : (
              <>
                <Wand2 className="h-3 w-3 mr-1" />
                Autogenerera
              </>
            )}
          </Button>
        </div>

        <Textarea
          id="excerpt"
          value={currentExcerpt}
          onChange={(e) => onExcerptChange(e.target.value)}
          placeholder="Kort sammanfattning som visas i listningar..."
          rows={3}
          maxLength={maxLength}
        />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Kort sammanfattning för förhands visning</span>
          <span className={currentExcerpt.length > maxLength - 20 ? 'text-orange-600 font-medium' : ''}>
            {currentExcerpt.length}/{maxLength} tecken
          </span>
        </div>

        {!currentExcerpt && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-900">
            💡 <strong>Tips:</strong> Klicka på "Autogenerera" för att automatiskt skapa ett utdrag från ditt innehåll
          </div>
        )}
      </CardContent>
    </Card>
  );
}
