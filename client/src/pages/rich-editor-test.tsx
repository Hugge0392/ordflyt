import { useState } from 'react';
import { JSONContent } from '@tiptap/react';
import { RichDocEditor, RichDocRenderer } from '@/components/rich-editor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function RichEditorTest() {
  const [content, setContent] = useState<JSONContent>({
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Välkommen till den nya block-baserade editorn!' }]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Detta är en test av den nya ' },
          { type: 'text', marks: [{ type: 'bold' }], text: 'block-baserade editorn' },
          { type: 'text', text: ' med separata text- och bildblock.' }
        ]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Du kan testa olika funktioner som:' }
        ]
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Separata textblock som är oberoende av bilder' }]
              }
            ]
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Bildblock som inte läggs över texten' }]
              }
            ]
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Lägg till nya block med plus-knappen' }]
              }
            ]
          }
        ]
      }
    ]
  });

  const [showJson, setShowJson] = useState(false);

  const handleContentChange = (newContent: JSONContent) => {
    setContent(newContent);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Block-baserad Editor Test</CardTitle>
            <p className="text-gray-600 dark:text-gray-400">
              Test den nya block-baserade editorn med separata text- och bildblock
            </p>
          </CardHeader>
        </Card>

        {/* Editor and Preview */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Block Editor</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Använd "Lägg till block" för att lägga till nya text- eller bildblock
              </p>
            </CardHeader>
            <CardContent>
              <RichDocEditor
                content={content}
                onChange={handleContentChange}
                placeholder="Börja skriva här..."
                autoFocus
                data-testid="rich-editor"
              />
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Förhandsvisning</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Så här ser innehållet ut i läsläge
              </p>
            </CardHeader>
            <CardContent>
              <RichDocRenderer 
                content={content}
                data-testid="rich-renderer"
              />
            </CardContent>
          </Card>
        </div>

        {/* JSON Data */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">JSON Data</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Rå JSON-data från editorn (konverterat från block-format)
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowJson(!showJson)}
                data-testid="toggle-json"
              >
                {showJson ? 'Dölj JSON' : 'Visa JSON'}
              </Button>
            </div>
          </CardHeader>
          {showJson && (
            <CardContent>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(content, null, 2)}
              </pre>
            </CardContent>
          )}
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Testinstruktioner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Block-funktioner:</h4>
                <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• Klicka "Lägg till block" för att lägga till nya block</li>
                  <li>• Välj "Textblock" eller "Bildblock" från menyn</li>
                  <li>• Varje textblock har egen toolbar när det är fokuserat</li>
                  <li>• Bildblock är helt separata från text</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Text-formatering i textblock:</h4>
                <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• Ctrl+B - Fetstil</li>
                  <li>• Ctrl+I - Kursiv</li>
                  <li>• Rubriker via dropdown i toolbar</li>
                  <li>• Listor och citat via toolbar</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}