import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CharacterLibraryProps {
  onCharacterSelect: (imageUrl: string) => void;
  currentImage?: string;
}

const CHARACTER_LIBRARY = [
  {
    id: 'pirat',
    name: 'Pirat',
    image: '/Bilder/Pirat höger.png',
    description: 'Trevlig pirat som kan hjälpa med substantivlektioner'
  },
  {
    id: 'teacher',
    name: 'Lärare',
    emoji: '👨‍🏫',
    description: 'Klassisk lärare som förklarar grammatik'
  },
  {
    id: 'student',
    name: 'Elev',
    emoji: '👩‍🎓',
    description: 'Nyfiken elev som lär sig'
  },
  {
    id: 'scientist',
    name: 'Forskare',
    emoji: '👩‍🔬',
    description: 'Smart forskare för avancerade ämnen'
  },
  {
    id: 'artist',
    name: 'Konstnär',
    emoji: '👩‍🎨',
    description: 'Kreativ konstnär för språkövningar'
  },
  {
    id: 'robot',
    name: 'Robot',
    emoji: '🤖',
    description: 'Hjälpsam robot för digitalt lärande'
  },
  {
    id: 'wizard',
    name: 'Trollkarl',
    emoji: '🧙‍♂️',
    description: 'Magisk trollkarl för fantasifulla lektioner'
  },
  {
    id: 'cat',
    name: 'Katt',
    emoji: '🐱',
    description: 'Söt katt som pratar om djur'
  },
  {
    id: 'bear',
    name: 'Björn',
    emoji: '🐻',
    description: 'Snäll björn för naturämnen'
  },
  {
    id: 'fairy',
    name: 'Älva',
    emoji: '🧚‍♀️',
    description: 'Magisk älva för sagor och berättelser'
  }
];

export function CharacterLibrary({ onCharacterSelect, currentImage }: CharacterLibraryProps) {
  const [customUrl, setCustomUrl] = useState('');
  const [showCustomDialog, setShowCustomDialog] = useState(false);

  const handleCharacterClick = (character: any) => {
    if (character.image) {
      onCharacterSelect(character.image);
    } else if (character.emoji) {
      onCharacterSelect(character.emoji);
    }
  };

  const handleCustomUrl = () => {
    if (customUrl.trim()) {
      onCharacterSelect(customUrl.trim());
      setCustomUrl('');
      setShowCustomDialog(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-base font-medium">Välj figur</Label>
        <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Egen URL
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lägg till egen bild-URL</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Bild-URL</Label>
                <Input
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/image.png"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCustomDialog(false)}>
                  Avbryt
                </Button>
                <Button onClick={handleCustomUrl}>
                  Använd
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {CHARACTER_LIBRARY.map((character) => (
          <Card
            key={character.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              (currentImage === character.image || currentImage === character.emoji) 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : ''
            }`}
            onClick={() => handleCharacterClick(character)}
          >
            <CardContent className="p-3 text-center">
              <div className="mb-2 flex justify-center">
                {character.image ? (
                  <img 
                    src={character.image} 
                    alt={character.name}
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <div className="text-3xl">{character.emoji}</div>
                )}
              </div>
              <div className="text-xs font-medium">{character.name}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {currentImage && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <Label className="text-sm font-medium mb-2 block">Vald figur:</Label>
          <div className="flex items-center space-x-3">
            {currentImage.startsWith('http') || currentImage.startsWith('/') ? (
              <img 
                src={currentImage} 
                alt="Vald figur" 
                className="w-10 h-10 object-contain rounded"
              />
            ) : (
              <div className="text-2xl">{currentImage}</div>
            )}
            <div className="text-sm text-gray-600 flex-1 truncate">
              {currentImage.length > 50 ? currentImage.substring(0, 50) + '...' : currentImage}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}