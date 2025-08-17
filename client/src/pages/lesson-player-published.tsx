import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { InteractivePreview } from "@/components/InteractivePreview";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface PublishedLessonPlayerProps {
  lesson: any;
}

export function PublishedLessonPlayer({ lesson }: PublishedLessonPlayerProps) {
  const [currentMomentIndex, setCurrentMomentIndex] = useState(0);
  
  if (!lesson?.content?.moments) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Lektion inte tillgänglig</h2>
          <p className="text-gray-600">Kunde inte ladda lektionsinnehåll.</p>
        </div>
      </div>
    );
  }

  const moments = lesson.content.moments;
  const currentMoment = moments[currentMomentIndex];
  const isLastMoment = currentMomentIndex === moments.length - 1;
  const isFirstMoment = currentMomentIndex === 0;

  const goToNextMoment = () => {
    if (!isLastMoment) {
      setCurrentMomentIndex(currentMomentIndex + 1);
    }
  };

  const goToPreviousMoment = () => {
    if (!isFirstMoment) {
      setCurrentMomentIndex(currentMomentIndex - 1);
    }
  };

  // Background style based on lesson background
  const getBackgroundStyle = (background?: string) => {
    switch (background) {
      case 'beach':
        return 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 50%, #f59e0b 100%)';
      case 'forest':
        return 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #10b981 100%)';
      case 'castle':
        return 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 50%, #6366f1 100%)';
      case 'library':
        return 'linear-gradient(135deg, #fef7cd 0%, #fde68a 50%, #f59e0b 100%)';
      case 'space':
        return 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 50%, #6366f1 100%)';
      default:
        return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
  };

  return (
    <div 
      className="h-screen relative"
      style={{ 
        background: getBackgroundStyle(lesson.content.background),
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
      }}
    >
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="flex justify-between items-center">
          <div className="bg-white rounded-lg px-4 py-2 shadow-lg">
            <h1 className="text-lg font-bold text-gray-800">{lesson.title}</h1>
            <p className="text-sm text-gray-600">
              Moment {currentMomentIndex + 1} av {moments.length}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={goToPreviousMoment}
              disabled={isFirstMoment}
              variant="outline"
              size="sm"
              className="bg-white hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button
              onClick={goToNextMoment}
              disabled={isLastMoment}
              variant="outline"
              size="sm"
              className="bg-white hover:bg-gray-50"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main content - exact copy of InteractivePreview */}
      <div className="pt-20 h-full">
        <InteractivePreview 
          moment={currentMoment} 
          onNext={goToNextMoment}
          lesson={lesson}
        />
      </div>

      {/* Completion screen */}
      {isLastMoment && currentMoment?.type === 'slutdiplom' && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-white rounded-lg p-4 shadow-lg text-center">
            <h2 className="text-xl font-bold text-green-600 mb-2">🎉 Lektion slutförd!</h2>
            <p className="text-gray-600">Bra jobbat! Du har klarat alla moment.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// This will be the standalone published lesson page
export default function PublishedLessonPage() {
  const [match, params] = useRoute("/published/:lessonId");
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (match && params?.lessonId) {
      fetchPublishedLesson(params.lessonId);
    }
  }, [match, params?.lessonId]);

  const fetchPublishedLesson = async (lessonId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/lessons/published/${lessonId}`);
      
      if (!response.ok) {
        throw new Error('Lektion kunde inte laddas');
      }
      
      const lessonData = await response.json();
      setLesson(lessonData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laddar lektion...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-600">Fel vid laddning</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Lektion inte hittad</h2>
          <p className="text-gray-600">Den begärda lektionen finns inte.</p>
        </div>
      </div>
    );
  }

  return <PublishedLessonPlayer lesson={lesson} />;
}