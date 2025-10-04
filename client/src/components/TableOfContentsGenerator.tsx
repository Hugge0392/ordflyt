import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { List, ChevronRight } from 'lucide-react';

interface Heading {
  level: number;
  text: string;
  id: string;
}

interface TableOfContentsGeneratorProps {
  content: any;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export default function TableOfContentsGenerator({
  content,
  enabled,
  onToggle,
}: TableOfContentsGeneratorProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);

  useEffect(() => {
    if (!content || !content.html) {
      setHeadings([]);
      return;
    }

    // Parse HTML to extract headings
    const parser = new DOMParser();
    const doc = parser.parseFromString(content.html, 'text/html');
    const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');

    const extractedHeadings: Heading[] = [];
    headingElements.forEach((heading, index) => {
      const level = parseInt(heading.tagName.substring(1));
      const text = heading.textContent || '';
      const id = text
        .toLowerCase()
        .replace(/å/g, 'a')
        .replace(/ä/g, 'a')
        .replace(/ö/g, 'o')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        || `heading-${index}`;

      extractedHeadings.push({ level, text, id });
    });

    setHeadings(extractedHeadings);
  }, [content]);

  const generateTableOfContents = () => {
    if (headings.length === 0) return null;

    return (
      <div className="space-y-2">
        {headings.map((heading, index) => (
          <div
            key={index}
            style={{ paddingLeft: `${(heading.level - 1) * 16}px` }}
            className="flex items-start gap-2 text-sm"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-gray-700">{heading.text}</span>
              <Badge variant="outline" className="ml-2 text-xs">
                H{heading.level}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-base">
            <List className="h-5 w-5 mr-2" />
            Innehållsförteckning
          </CardTitle>
          <div className="flex items-center gap-2">
            <Switch
              id="toc-enabled"
              checked={enabled}
              onCheckedChange={onToggle}
            />
            <Label htmlFor="toc-enabled" className="cursor-pointer">
              {enabled ? 'Aktiverad' : 'Inaktiverad'}
            </Label>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Genererar automatiskt innehållsförteckning från dina rubriker (H1-H6)
        </p>
      </CardHeader>
      <CardContent>
        {headings.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <List className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Inga rubriker hittades i innehållet</p>
            <p className="text-xs mt-1">Lägg till rubriker (H1-H6) i din text</p>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">Förhandsvisning</span>
              <Badge>{headings.length} rubriker</Badge>
            </div>
            {generateTableOfContents()}
            {enabled && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-900">
                  ✓ Innehållsförteckningen visas automatiskt längst upp i bloggposten
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
