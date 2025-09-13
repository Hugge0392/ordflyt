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
        content: [{ type: 'text', text: 'Välkommen till den nya editorn!' }]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Detta är en test av den nya ' },
          { type: 'text', marks: [{ type: 'bold' }], text: 'RichDocEditor' },
          { type: 'text', text: ' komponenten byggd med Tiptap.' }
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
                content: [
                  { type: 'text', marks: [{ type: 'bold' }], text: 'Fetstil' },
                  { type: 'text', text: ' och ' },
                  { type: 'text', marks: [{ type: 'italic' }], text: 'kursiv' }
                ]
              }
            ]
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', text: 'Olika ' },
                  { type: 'text', marks: [{ type: 'highlight' }], text: 'markeringar' }
                ]
              }
            ]
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Listor och rubriker' }]
              }
            ]
          }
        ]
      },
      {
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Prova att skriva "/" för att öppna kommando-menyn!' }
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
            <CardTitle className="text-2xl">RichDocEditor Test</CardTitle>
            <p className="text-gray-600 dark:text-gray-400">
              Test den nya WYSIWYG-editorn med alla funktioner
            </p>
          </CardHeader>
        </Card>

        {/* Editor and Preview */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Editor</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Redigera innehållet här. Prova slash-kommandon med "/"
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
                  Rå JSON-data från editorn
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
                <h4 className="font-medium mb-2">Grundläggande formatering:</h4>
                <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• Ctrl+B - Fetstil</li>
                  <li>• Ctrl+I - Kursiv</li>
                  <li>• Ctrl+U - Understrykning</li>
                  <li>• Markera text för bubble menu</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Slash-kommandon:</h4>
                <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• /heading - Rubriker</li>
                  <li>• /quote - Citat</li>
                  <li>• /list - Listor</li>
                  <li>• /table - Tabell</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}