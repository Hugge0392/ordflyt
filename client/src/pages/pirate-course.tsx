import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PirateCourseProgress {
  currentLevel: number;
  level1Completed: boolean;
  level2Completed: boolean;
  level3Completed: boolean;
  level1Score: number;
  level2Score: number;
  level3Score: number;
}

interface Exercise {
  id: string;
  type: 'matching' | 'writing' | 'categorize' | 'memory' | 'quiz';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

export default function PirateCourse() {
  const [progress, setProgress] = useState<PirateCourseProgress>({
    currentLevel: 1,
    level1Completed: false,
    level2Completed: false, 
    level3Completed: false,
    level1Score: 0,
    level2Score: 0,
    level3Score: 0
  });

  const [currentPhase, setCurrentPhase] = useState<'menu' | 'intro' | 'theory' | 'exercise' | 'game' | 'quiz' | 'completed'>('menu');
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Level 1 exercises
  const level1Exercises: Exercise[] = [
    {
      id: 'l1_match_1',
      type: 'matching',
      question: 'Para ihop bilden med rätt substantiv',
      options: ['skepp', 'skatt', 'pirat', 'ö'],
      correctAnswer: 'skepp',
      explanation: 'Ett skepp är ett fartyg som pirater använder för att segla på haven.'
    },
    {
      id: 'l1_write_1',
      type: 'writing',
      question: 'Skriv pluralformen av "skepp"',
      correctAnswer: 'skepp',
      explanation: 'Pluralformen av skepp är också "skepp" - det är ett n-genus substantiv.'
    },
    {
      id: 'l1_quiz_1',
      type: 'quiz',
      question: 'Vilket av följande är ett substantiv?',
      options: ['hoppar', 'pirat', 'snabbt', 'och'],
      correctAnswer: 'pirat',
      explanation: 'Pirat är ett substantiv - det är namnet på en person.'
    }
  ];

  // Level 2 exercises  
  const level2Exercises: Exercise[] = [
    {
      id: 'l2_cat_1',
      type: 'categorize',
      question: 'Är "Blackbeard" ett egennamn eller vanligt substantiv?',
      options: ['Egennamn', 'Vanligt substantiv'],
      correctAnswer: 'Egennamn',
      explanation: 'Blackbeard är ett egennamn - det är namnet på en specifik pirat.'
    },
    {
      id: 'l2_form_1', 
      type: 'writing',
      question: 'Skriv den bestämda formen av "skatt"',
      correctAnswer: 'skatten',
      explanation: 'Skatten är den bestämda formen av skatt (en skatt → skatten).'
    }
  ];

  // Level 3 exercises
  const level3Exercises: Exercise[] = [
    {
      id: 'l3_gen_1',
      type: 'writing', 
      question: 'Skriv genitivformen av "pirat"',
      correctAnswer: 'pirats',
      explanation: 'Pirats är genitivformen som visar att något tillhör piraten.'
    },
    {
      id: 'l3_compound_1',
      type: 'writing',
      question: 'Sätt ihop "pirat" och "skepp" till ett sammansatt ord',
      correctAnswer: 'piratskepp',
      explanation: 'Piratskepp är ett sammansatt substantiv som betyder ett skepp som tillhör pirater.'
    }
  ];

  const getCurrentExercises = () => {
    switch(selectedLevel) {
      case 1: return level1Exercises;
      case 2: return level2Exercises;
      case 3: return level3Exercises;
      default: return [];
    }
  };

  const currentExercise = getCurrentExercises()[currentExerciseIndex];

  const playPirateSound = (soundType: 'intro' | 'success' | 'error' | 'victory') => {
    // In a real implementation, you would load actual pirate sound files
    console.log(`🏴‍☠️ Playing ${soundType} sound: Arrr!`);
  };

  const handleAnswerSubmit = () => {
    if (!currentExercise) return;

    const isCorrect = userAnswer.toLowerCase().trim() === currentExercise.correctAnswer.toLowerCase();
    
    if (isCorrect) {
      setScore(score + 10);
      setFeedback({ type: 'success', message: `Rätt! ${currentExercise.explanation}` });
      playPirateSound('success');
      
      setTimeout(() => {
        if (currentExerciseIndex < getCurrentExercises().length - 1) {
          setCurrentExerciseIndex(currentExerciseIndex + 1);
          setUserAnswer('');
          setFeedback({ type: null, message: '' });
        } else {
          // Level completed
          completeLevel();
        }
      }, 2000);
    } else {
      setFeedback({ type: 'error', message: `Fel svar. ${currentExercise.explanation}` });
      playPirateSound('error');
    }
  };

  const completeLevel = () => {
    const newProgress = { ...progress };
    
    switch(selectedLevel) {
      case 1:
        newProgress.level1Completed = true;
        newProgress.level1Score = score;
        newProgress.currentLevel = 2;
        break;
      case 2:
        newProgress.level2Completed = true;
        newProgress.level2Score = score;
        newProgress.currentLevel = 3;
        break;
      case 3:
        newProgress.level3Completed = true;
        newProgress.level3Score = score;
        break;
    }
    
    setProgress(newProgress);
    setCurrentPhase('completed');
    playPirateSound('victory');
  };

  const startLevel = (level: number) => {
    setSelectedLevel(level);
    setCurrentPhase('intro');
    setScore(0);
    setCurrentExerciseIndex(0);
    setUserAnswer('');
    setFeedback({ type: null, message: '' });
  };

  const renderMenu = () => (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🏴‍☠️ Piraternas Substantivkurs
          </h1>
          <p className="text-gray-600 text-lg">
            Sätt segel och upptäck substantivens värld tillsammans med pirater!
          </p>
        </div>

        <div className="space-y-4">
          {/* Level 1 - Matros */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              progress.level1Completed ? 'bg-green-50 border-green-200' : 'hover:bg-blue-50'
            }`}
            onClick={() => startLevel(1)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>⚓ Nivå 1 - Matros (åk 4)</span>
                {progress.level1Completed && (
                  <Badge className="bg-green-500">
                    ✓ Klar ({progress.level1Score}p)
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Lär dig grunderna om substantiv - namn på saker och ting
              </p>
            </CardContent>
          </Card>

          {/* Level 2 - Styrman */}
          <Card 
            className={`cursor-pointer transition-all ${
              progress.currentLevel >= 2 
                ? `hover:shadow-lg ${progress.level2Completed ? 'bg-green-50 border-green-200' : 'hover:bg-blue-50'}` 
                : 'opacity-50 cursor-not-allowed'
            }`}
            onClick={() => progress.currentLevel >= 2 && startLevel(2)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>🧭 Nivå 2 - Styrman (åk 5)</span>
                {progress.level2Completed && (
                  <Badge className="bg-green-500">
                    ✓ Klar ({progress.level2Score}p)
                  </Badge>
                )}
                {progress.currentLevel < 2 && (
                  <Badge variant="secondary">Låst</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Fördjupning i egennamn, genus och bestämd/obestämd form
              </p>
            </CardContent>
          </Card>

          {/* Level 3 - Kapten */}
          <Card 
            className={`cursor-pointer transition-all ${
              progress.currentLevel >= 3 
                ? `hover:shadow-lg ${progress.level3Completed ? 'bg-green-50 border-green-200' : 'hover:bg-blue-50'}` 
                : 'opacity-50 cursor-not-allowed'
            }`}
            onClick={() => progress.currentLevel >= 3 && startLevel(3)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>👑 Nivå 3 - Kapten (åk 6)</span>
                {progress.level3Completed && (
                  <Badge className="bg-green-500">
                    ✓ Klar ({progress.level3Score}p)
                  </Badge>
                )}
                {progress.currentLevel < 3 && (
                  <Badge variant="secondary">Låst</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Avancerade former: genitiv, pluralböjning och sammansättningar
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Link href="/">
            <Button variant="outline">
              ← Tillbaka till huvudmeny
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );

  const renderIntro = () => {
    const levelTitles = {
      1: 'Matros - Grundläggande substantiv',
      2: 'Styrman - Fördjupning i substantiv', 
      3: 'Kapten - Avancerade substantivformer'
    };

    const levelDescriptions = {
      1: 'Substantiv är namn på saker och ting. Som en pirat som vet namnen på alla skatter!',
      2: 'Nu lär vi oss om egennamn och hur substantiv förändras (en skatt → skatten).',
      3: 'Avancerat! Genitiv (piratens skatt), pluralformer och sammansatta ord.'
    };

    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-400 to-orange-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full text-center">
          <div className="text-8xl mb-6">🏴‍☠️</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            {levelTitles[selectedLevel as keyof typeof levelTitles]}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            {levelDescriptions[selectedLevel as keyof typeof levelDescriptions]}
          </p>
          
          <div className="space-y-4">
            <Button 
              onClick={() => {
                setCurrentPhase('exercise');
                playPirateSound('intro');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-3"
            >
              Starta äventyret! ⚔️
            </Button>
            
            <div>
              <Button variant="outline" onClick={() => setCurrentPhase('menu')}>
                Tillbaka till meny
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderExercise = () => (
    <div className="min-h-screen bg-gradient-to-b from-teal-400 to-blue-500 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Nivå {selectedLevel} - Övning {currentExerciseIndex + 1}/{getCurrentExercises().length}
              </h2>
              <p className="text-gray-600">Poäng: {score}</p>
            </div>
            <Button variant="outline" onClick={() => setCurrentPhase('menu')}>
              Avbryt
            </Button>
          </div>
        </div>

        {/* Exercise Content */}
        {currentExercise && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                {currentExercise.question}
              </h3>
              
              {currentExercise.type === 'writing' && (
                <div className="max-w-md mx-auto">
                  <Input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Skriv ditt svar här..."
                    className="text-lg p-4 mb-4"
                    onKeyPress={(e) => e.key === 'Enter' && handleAnswerSubmit()}
                  />
                  <Button 
                    onClick={handleAnswerSubmit}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                    disabled={!userAnswer.trim()}
                  >
                    Kontrollera svar
                  </Button>
                </div>
              )}

              {currentExercise.type === 'quiz' && currentExercise.options && (
                <div className="max-w-md mx-auto space-y-3">
                  {currentExercise.options.map((option, index) => (
                    <Button
                      key={index}
                      variant={userAnswer === option ? "default" : "outline"}
                      onClick={() => setUserAnswer(option)}
                      className="w-full text-left justify-start p-4"
                    >
                      {option}
                    </Button>
                  ))}
                  {userAnswer && (
                    <Button 
                      onClick={handleAnswerSubmit}
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 mt-4"
                    >
                      Kontrollera svar
                    </Button>
                  )}
                </div>
              )}

              {currentExercise.type === 'categorize' && currentExercise.options && (
                <div className="max-w-md mx-auto space-y-3">
                  {currentExercise.options.map((option, index) => (
                    <Button
                      key={index}
                      variant={userAnswer === option ? "default" : "outline"}
                      onClick={() => {
                        setUserAnswer(option);
                        setTimeout(handleAnswerSubmit, 500);
                      }}
                      className="w-full text-left justify-start p-4"
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Feedback */}
            {feedback.type && (
              <div className={`p-4 rounded-xl text-center ${
                feedback.type === 'success' 
                  ? 'bg-green-100 border border-green-200 text-green-700' 
                  : 'bg-red-100 border border-red-200 text-red-700'
              }`}>
                <p className="font-medium">{feedback.message}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderCompleted = () => (
    <div className="min-h-screen bg-gradient-to-b from-green-400 to-emerald-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full text-center">
        <div className="text-8xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Bra jobbat, matros!
        </h1>
        <p className="text-xl text-gray-600 mb-6">
          Du har klarat Nivå {selectedLevel} och fått {score} poäng!
        </p>
        
        <div className="space-y-4">
          {selectedLevel && selectedLevel < 3 && (
            <Button 
              onClick={() => startLevel(selectedLevel + 1)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-3"
            >
              Fortsätt till nästa nivå! 🚢
            </Button>
          )}
          
          <div>
            <Button variant="outline" onClick={() => setCurrentPhase('menu')}>
              Tillbaka till meny
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render current phase
  switch(currentPhase) {
    case 'menu': return renderMenu();
    case 'intro': return renderIntro();
    case 'exercise': return renderExercise();
    case 'completed': return renderCompleted();
    default: return renderMenu();
  }
}