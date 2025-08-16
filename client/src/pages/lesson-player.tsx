import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InteractivePreview } from "@/components/InteractivePreview";

interface LessonMoment {
  id: string;
  type: string;
  title: string;
  order: number;
  config: any;
}

interface PublishedLesson {
  id: string;
  title: string;
  description: string;
  wordClass: string;
  difficulty: string;
  content: {
    title: string;
    moments: LessonMoment[];
    wordClass: string;
  };
  fileName: string;
  filePath?: string;
}

export default function LessonPlayer() {
  const [match, params] = useRoute("/lesson/:id");
  const [currentMoment, setCurrentMoment] = useState(0);
  const lessonId = params?.id;

  const { data: publishedLessons = [] } = useQuery<PublishedLesson[]>({
    queryKey: ['/api/lessons/published'],
  });

  const lesson = publishedLessons.find(l => l.id === lessonId);

  // Debug log to verify this component is being used
  console.log('LessonPlayer loaded with ID:', lessonId);
  console.log('Found lesson:', lesson);

  if (!match || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Lektion inte hittad</h1>
          <p className="text-gray-600 mb-4">Lesson ID: {lessonId}</p>
          <p className="text-gray-600 mb-4">Available lessons: {publishedLessons.length}</p>
          <Button onClick={() => window.history.back()}>Tillbaka</Button>
        </div>
      </div>
    );
  }

  const moments = lesson.content.moments || [];
  const totalMoments = moments.length;

  const nextMoment = () => {
    if (currentMoment < totalMoments - 1) {
      setCurrentMoment(currentMoment + 1);
    }
  };

  const prevMoment = () => {
    if (currentMoment > 0) {
      setCurrentMoment(currentMoment - 1);
    }
  };

  const currentMomentData = moments[currentMoment];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{lesson.title}</h1>
              <p className="text-blue-100 mt-1">{lesson.description}</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-blue-800">
                {lesson.wordClass}
              </Badge>
              <Badge 
                variant={lesson.difficulty === 'easy' ? 'secondary' : lesson.difficulty === 'medium' ? 'default' : 'destructive'}
                className="text-white"
              >
                {lesson.difficulty === 'easy' ? 'Lätt' : lesson.difficulty === 'medium' ? 'Medel' : 'Svår'}
              </Badge>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-blue-100 mb-2">
              <span>Moment {currentMoment + 1} av {totalMoments}</span>
              <span>{Math.round(((currentMoment + 1) / totalMoments) * 100)}%</span>
            </div>
            <div className="w-full bg-blue-400/30 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentMoment + 1) / totalMoments) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {currentMomentData && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="text-2xl">
                  {currentMomentData.type === 'textruta' && '📝'}
                  {currentMomentData.type === 'pratbubbla' && '💬'}
                  {currentMomentData.type === 'memory' && '🃏'}
                  {currentMomentData.type === 'finns-ordklass' && '🔍'}
                  {currentMomentData.type === 'ordmoln' && '☁️'}
                </span>
                {currentMomentData.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InteractivePreview 
                moment={currentMomentData}
                isPlaying={true}
              />
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button 
            variant="outline" 
            onClick={prevMoment}
            disabled={currentMoment === 0}
          >
            ← Föregående
          </Button>
          
          <div className="flex gap-2">
            {moments.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentMoment(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentMoment 
                    ? 'bg-blue-500' 
                    : index < currentMoment 
                      ? 'bg-green-500' 
                      : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {currentMoment === totalMoments - 1 ? (
            <Button onClick={() => window.history.back()}>
              Avsluta lektion
            </Button>
          ) : (
            <Button onClick={nextMoment}>
              Nästa →
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}