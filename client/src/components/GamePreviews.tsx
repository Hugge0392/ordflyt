import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GamePreviewProps {
  moment: any;
  onNext?: () => void;
}

export function OrdracetPreview({ moment, onNext }: GamePreviewProps) {
  const words = moment.config.words || ['ord', 'faller', 'från', 'himlen'];
  
  return (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-xl font-bold text-center mb-6">🏃‍♂️ Ordracet</h3>
      <div className="bg-gradient-to-b from-blue-200 to-green-200 rounded-lg p-6 min-h-96 relative overflow-hidden">
        <div className="absolute top-4 right-4">
          <Badge>Tid: {moment.config.duration || 60}s</Badge>
        </div>
        <div className="space-y-4">
          {words.slice(0, 4).map((word: string, i: number) => (
            <div 
              key={i} 
              className="bg-white rounded-lg p-3 text-center font-bold shadow-md"
              style={{ 
                marginLeft: `${Math.random() * 60}%`,
                animation: `fall 3s linear infinite ${i * 0.5}s`
              }}
            >
              {word}
            </div>
          ))}
        </div>
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-yellow-400 rounded-lg p-3 text-center font-bold">
            🧺 Fångkorg
          </div>
        </div>
      </div>
      <div className="text-center mt-4">
        <p className="text-gray-600 mb-4">Fånga orden som faller från himlen!</p>
        <Button onClick={onNext}>Fortsätt</Button>
      </div>
    </div>
  );
}

export function MeningPusselPreview({ moment, onNext }: GamePreviewProps) {
  const sentence = moment.config.sentences?.[0] || 'Katten sitter på mattan';
  const parts = sentence.split(' ');
  
  return (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-xl font-bold text-center mb-6">🧩 Meningspussel</h3>
      <div className="space-y-6">
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6 min-h-24 flex items-center justify-center">
          <p className="text-gray-500">Dra orddelarna hit för att bygga meningen</p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          {parts.map((part: string, i: number) => (
            <div 
              key={i}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg cursor-move hover:bg-blue-600 transition-colors"
            >
              {part}
            </div>
          ))}
        </div>
      </div>
      <div className="text-center mt-6">
        <Button onClick={onNext}>Fortsätt</Button>
      </div>
    </div>
  );
}

export function OrdklassdrakPreview({ moment, onNext }: GamePreviewProps) {
  const [score, setScore] = useState(0);
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const [wordsUsed, setWordsUsed] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);

  const targetClass = moment.config.targetWordClass || 'substantiv';
  const targetWords = moment.config.targetWords || ['hund', 'katt', 'hus'];
  const distractors = moment.config.distractors || ['springa', 'snabb', 'under'];
  const wordsPerRound = moment.config.wordsPerRound || 6;
  
  // Shuffle and take specified number of words
  const allWords = [...targetWords, ...distractors]
    .sort(() => Math.random() - 0.5)
    .slice(0, wordsPerRound)
    .filter(word => !wordsUsed.includes(word));

  const targetWordsInRound = allWords.filter(word => targetWords.includes(word));
  const gameComplete = score >= targetWordsInRound.length && targetWordsInRound.length > 0;

  const handleDragStart = (e: React.DragEvent, word: string) => {
    setDraggedWord(word);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedWord) return;

    const isCorrect = targetWords.includes(draggedWord);
    
    if (isCorrect) {
      setScore(prev => prev + 1);
      setFeedback(`Rätt! "${draggedWord}" är ${targetClass}. 🐉`);
      setWordsUsed(prev => [...prev, draggedWord]);
    } else {
      setFeedback(`Fel! "${draggedWord}" är inte ${targetClass}. 😔`);
    }
    
    setShowFeedback(true);
    setDraggedWord(null);
    
    // Hide feedback after 2 seconds
    setTimeout(() => {
      setShowFeedback(false);
      setFeedback('');
    }, 2000);
  };

  const handleDragEnd = () => {
    setDraggedWord(null);
  };

  if (gameComplete) {
    return (
      <div className="max-w-4xl mx-auto text-center">
        <h3 className="text-xl font-bold mb-6">🐉 Ordklassdrak - Klart!</h3>
        <div className="bg-green-100 rounded-lg p-8 mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h4 className="text-2xl font-bold text-green-800 mb-2">Perfekt!</h4>
          <p className="text-lg text-green-700">
            Du matade draken med alla {targetClass}! Slutpoäng: {score}/{targetWordsInRound.length}
          </p>
        </div>
        <Button onClick={onNext} size="lg">Fortsätt</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h3 className="text-xl font-bold text-center mb-6">🐉 Ordklassdrak</h3>
      <div className="bg-gradient-to-b from-purple-200 to-blue-200 rounded-lg p-6 min-h-96 relative">
        
        {/* Dragon */}
        <div className="absolute top-4 right-4 text-6xl animate-bounce">
          🐉
        </div>
        
        {/* Instructions */}
        <div className="text-center mb-6">
          <h4 className="text-lg font-semibold mb-2">Mata draken med {targetClass}!</h4>
          <div className="bg-white bg-opacity-80 rounded-lg p-3 inline-block">
            <p className="text-sm">Dra ord till drakens mun. Bara {targetClass} gör draken glad!</p>
          </div>
        </div>

        {/* Dragon's mouth (drop zone) */}
        <div 
          className={`absolute top-20 right-12 w-16 h-12 bg-red-400 rounded-full border-4 border-red-600 transition-all ${
            draggedWord ? 'opacity-100 scale-110' : 'opacity-70'
          }`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="text-center text-white font-bold text-xs mt-2">Mun</div>
        </div>

        {/* Words to drag */}
        <div className="flex flex-wrap gap-3 justify-center mt-20">
          {allWords.map((word, i) => {
            const isTarget = targetWords.includes(word);
            return (
              <div 
                key={i}
                draggable
                onDragStart={(e) => handleDragStart(e, word)}
                onDragEnd={handleDragEnd}
                className={`
                  px-4 py-2 rounded-lg cursor-move shadow-md hover:shadow-lg transition-all
                  ${draggedWord === word ? 'opacity-50 scale-95' : ''}
                  ${isTarget 
                    ? 'bg-green-400 hover:bg-green-500 text-white' 
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
                  }
                `}
              >
                {word}
              </div>
            );
          })}
        </div>

        {/* Feedback */}
        {showFeedback && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-4 shadow-lg border-2 border-blue-300 z-10">
            <p className="text-lg font-semibold text-center">{feedback}</p>
          </div>
        )}

        {/* Score area */}
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg p-3">
          <div className="text-sm font-semibold">Poäng: {score}/{targetWordsInRound.length}</div>
          <div className="text-xs text-gray-600">Målordklass: {targetClass}</div>
        </div>
      </div>
      <div className="text-center mt-4">
        <p className="text-gray-600 mb-4">Dra {targetClass} till drakens mun för att mata den!</p>
        {score > 0 && targetWordsInRound.length > 0 && (
          <Button onClick={onNext} variant="outline" className="mr-2">
            Avsluta nu ({score}/{targetWordsInRound.length})
          </Button>
        )}
      </div>
    </div>
  );
}

export function GissaOrdetPreview({ moment, onNext }: GamePreviewProps) {
  const word = moment.config.words?.[0] || 'KATT';
  const clue = moment.config.clues?.[0] || 'Ett djur som säger mjau';
  const maxGuesses = moment.config.maxGuesses || 3;
  
  return (
    <div className="max-w-2xl mx-auto text-center">
      <h3 className="text-xl font-bold mb-6">🎯 Gissa ordet</h3>
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <div className="mb-4">
          <Badge>Gissningar kvar: {maxGuesses}</Badge>
        </div>
        <div className="text-lg mb-4">
          <strong>Ledtråd:</strong> {clue}
        </div>
        <div className="flex justify-center space-x-2 mb-4">
          {word.split('').map((_letter: string, i: number) => (
            <div key={i} className="w-8 h-8 border-2 border-gray-400 rounded flex items-center justify-center">
              <span className="text-gray-400">_</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-6 gap-2 max-w-xs mx-auto">
          {['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','Å','Ä','Ö'].slice(0, 12).map((letter: string) => (
            <Button key={letter} variant="outline" size="sm" className="aspect-square">
              {letter}
            </Button>
          ))}
        </div>
      </div>
      <Button onClick={onNext}>Fortsätt</Button>
    </div>
  );
}

export function QuizPreview({ moment, onNext }: GamePreviewProps) {
  const question = moment.config.questions?.[0] || {
    question: 'Vad är ett substantiv?',
    options: ['Ett namn på person, djur eller sak', 'Ett handlingsord', 'Ett beskrivande ord', 'Ett hjälpord'],
    correctAnswer: 0
  };
  
  return (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-xl font-bold text-center mb-6">❓ Quiz</h3>
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="mb-4">
            <Badge>Fråga 1 av {moment.config.questions?.length || 1}</Badge>
            {moment.config.timeLimit > 0 && (
              <Badge variant="outline" className="ml-2">
                Tid: {moment.config.timeLimit}s
              </Badge>
            )}
          </div>
          <h4 className="text-lg font-medium mb-4">{question.question}</h4>
          <div className="space-y-2">
            {question.options.map((option: string, i: number) => (
              <Button 
                key={i} 
                variant="outline" 
                className="w-full text-left justify-start h-auto p-3"
              >
                <span className="mr-3 font-bold">{String.fromCharCode(65 + i)}.</span>
                {option}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="text-center">
        <Button onClick={onNext}>Fortsätt</Button>
      </div>
    </div>
  );
}

export function RimSpelPreview({ moment, onNext }: GamePreviewProps) {
  const words = moment.config.words || ['katt', 'hatt', 'matt', 'bil', 'stil', 'mil'];
  
  return (
    <div className="max-w-2xl mx-auto text-center">
      <h3 className="text-xl font-bold mb-6">🎵 Rimspel</h3>
      <div className="bg-purple-50 rounded-lg p-6 mb-6">
        <p className="text-lg mb-4">{moment.config.instruction || 'Hitta ord som rimmar'}</p>
        <div className="grid grid-cols-3 gap-3">
          {words.slice(0, 6).map((word: string, i: number) => (
            <Button 
              key={i} 
              variant="outline" 
              className="h-12 text-lg"
            >
              {word}
            </Button>
          ))}
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Klicka på ord som rimmar med varandra
        </div>
      </div>
      <Button onClick={onNext}>Fortsätt</Button>
    </div>
  );
}

export function BeratttelsePreview({ moment, onNext }: GamePreviewProps) {
  const story = moment.config.story || 'Det var en gång...';
  const choices = moment.config.choices || [
    { text: 'Gå till höger', outcome: 'Du hittar en skattkista' },
    { text: 'Gå till vänster', outcome: 'Du möter en drake' }
  ];
  
  return (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-xl font-bold text-center mb-6">📖 Interaktiv berättelse</h3>
      <Card className="mb-6">
        <CardContent className="p-6">
          <p className="text-lg leading-relaxed mb-6">{story}</p>
          <div className="space-y-3">
            <p className="font-medium">Vad väljer du?</p>
            {choices.map((choice: any, i: number) => (
              <Button 
                key={i} 
                variant="outline" 
                className="w-full text-left justify-start h-auto p-3"
              >
                {choice.text}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="text-center">
        <Button onClick={onNext}>Fortsätt</Button>
      </div>
    </div>
  );
}