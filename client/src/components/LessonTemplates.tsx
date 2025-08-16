import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface LessonTemplate {
  id: string;
  name: string;
  description: string;
  wordClass: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
  moments: any[];
  tags: string[];
}

const LESSON_TEMPLATES: LessonTemplate[] = [
  {
    id: 'substantiv-intro',
    name: 'Introduktion till Substantiv',
    description: 'Grundläggande lektion om vad substantiv är med praktiska exempel',
    wordClass: 'noun',
    difficulty: 'easy',
    estimatedTime: '15 min',
    tags: ['grundläggande', 'introduktion'],
    moments: [
      {
        type: 'pratbubbla',
        title: 'Välkomst',
        config: {
          text: 'Hej! Idag ska vi lära oss om substantiv. Substantiv är ord som beskriver personer, djur, saker och platser.',
          characterImage: '🏴‍☠️'
        }
      },
      {
        type: 'finns-ordklass',
        title: 'Hitta substantiven',
        config: {
          text: 'Katten sitter på stolen och äter fisk.',
          targetWords: ['Katten', 'stolen', 'fisk'],
          instruction: 'Klicka på alla substantiv (saker, djur, personer) i meningen'
        }
      },
      {
        type: 'memory',
        title: 'Memory - Substantiv',
        config: {
          wordPairs: ['hund|djur', 'hus|byggnad', 'bil|fordon', 'bok|föremål']
        }
      }
    ]
  },
  {
    id: 'verb-action',
    name: 'Verb och Handlingar',
    description: 'Lär dig känna igen verb genom actionfulla övningar',
    wordClass: 'verb',
    difficulty: 'easy',
    estimatedTime: '20 min',
    tags: ['verb', 'handlingar'],
    moments: [
      {
        type: 'pratbubbla',
        title: 'Vad är verb?',
        config: {
          text: 'Verb beskriver vad någon eller något gör. Springer, hoppar, läser, skriver - allt detta är verb!',
          characterImage: '👨‍🏫'
        }
      },
      {
        type: 'finns-ordklass',
        title: 'Hitta verben',
        config: {
          text: 'Maria springer snabbt och hoppar högt.',
          targetWords: ['springer', 'hoppar'],
          instruction: 'Klicka på alla verb (handlingsord) i meningen'
        }
      },
      {
        type: 'sortera-korgar',
        title: 'Sortera ord',
        config: {
          words: ['spring', 'hund', 'läsa', 'bok', 'skriv', 'penna'],
          categories: ['Verb', 'Substantiv'],
          instruction: 'Sortera orden i rätt kategori'
        }
      }
    ]
  },
  {
    id: 'adjektiv-colors',
    name: 'Adjektiv och Färger',
    description: 'Upptäck adjektiv genom färger och beskrivande ord',
    wordClass: 'adjective',
    difficulty: 'medium',
    estimatedTime: '18 min',
    tags: ['adjektiv', 'färger', 'beskrivning'],
    moments: [
      {
        type: 'textruta',
        title: 'Om adjektiv',
        config: {
          text: 'Adjektiv beskriver hur något ser ut, känns eller är. Röd, stor, snäll, kall - alla dessa ord är adjektiv.'
        }
      },
      {
        type: 'ordmoln',
        title: 'Färgernas värld',
        config: {
          words: ['röd', 'blå', 'grön', 'gul', 'svart', 'vit', 'rosa', 'lila'],
          theme: 'Färger'
        }
      },
      {
        type: 'finns-ordklass',
        title: 'Hitta adjektiven',
        config: {
          text: 'Den stora, röda bilen kör på den smala vägen.',
          targetWords: ['stora', 'röda', 'smala'],
          instruction: 'Klicka på alla adjektiv (beskrivande ord)'
        }
      }
    ]
  },
  {
    id: 'pratbubbla-quiz',
    name: 'Pratbubbla med Frågor',
    description: 'Exempel på hur man använder pratbubbla med interaktiva frågor',
    wordClass: 'mixed',
    difficulty: 'easy',
    estimatedTime: '10 min',
    tags: ['pratbubbla', 'interaktiv', 'frågor'],
    moments: [
      {
        type: 'pratbubbla',
        title: 'Vad är ordklasser?',
        config: {
          text: 'Hej! Idag ska vi lära oss om ordklasser. Ordklasser är olika grupper som vi delar in ord i.',
          characterImage: '🏴‍☠️',
          animationSpeed: 50,
          question: 'Vad tror du substantiv är för typ av ord?',
          alternatives: [
            { text: 'Ord som beskriver saker, personer, djur och platser', correct: true },
            { text: 'Ord som beskriver handlingar', correct: false },
            { text: 'Ord som beskriver hur något ser ut', correct: false }
          ],
          correctFeedback: 'Rätt! Substantiv är ord som beskriver saker, personer, djur och platser.',
          incorrectFeedback: 'Inte riktigt. Tänk på vad ord som "hund", "bil" och "skola" beskriver.'
        }
      },
      {
        type: 'pratbubbla',
        title: 'Om verb',
        config: {
          text: 'Verb är handlingsord - de beskriver vad någon eller något gör.',
          characterImage: '👨‍🏫',
          animationSpeed: 50,
          question: 'Vilket av dessa ord är ett verb?',
          alternatives: [
            { text: 'springer', correct: true },
            { text: 'hund', correct: false },
            { text: 'röd', correct: false }
          ],
          correctFeedback: 'Precis! "Springer" är ett verb eftersom det beskriver en handling.',
          incorrectFeedback: 'Försök igen. Vilket ord beskriver en handling eller vad någon gör?'
        }
      }
    ]
  }
];

interface LessonTemplatesProps {
  onSelectTemplate: (template: LessonTemplate) => void;
}

export function LessonTemplates({ onSelectTemplate }: LessonTemplatesProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          📚 Välj från mall
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lektionsmallar</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LESSON_TEMPLATES.map((template) => (
            <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <Badge className={getDifficultyColor(template.difficulty)}>
                    {template.difficulty === 'easy' ? 'Lätt' : 
                     template.difficulty === 'medium' ? 'Medel' : 'Svår'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{template.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Ordklass:</span>
                    <span className="font-medium">{template.wordClass}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tid:</span>
                    <span>{template.estimatedTime}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Moment:</span>
                    <span>{template.moments.length} stycken</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button 
                    onClick={() => onSelectTemplate(template)}
                    className="w-full mt-4"
                  >
                    Använd mall
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}