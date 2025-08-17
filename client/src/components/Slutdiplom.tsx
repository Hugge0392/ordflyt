import { Button } from "@/components/ui/button";

interface SlutdiplomProps {
  moment: any;
  onNext?: () => void;
  correctAnswers?: number;
  wrongAnswers?: number;
}

export function Slutdiplom({ moment, onNext, correctAnswers = 0, wrongAnswers = 0 }: SlutdiplomProps) {
  const courseName = moment?.config?.courseName || 'Kursen';
  const diplomaTitle = moment?.config?.diplomaTitle || 'Grattis!';
  const message = moment?.config?.message || 'Du har slutfört kursen med framgång!';
  const showStats = moment?.config?.showStats !== false;
  
  const totalAnswers = correctAnswers + wrongAnswers;
  const percentage = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 flex items-center justify-center p-4">
      {/* Diploma Container */}
      <div className="relative">
        {/* Decorative elements */}
        <div className="absolute -top-4 -left-4 text-6xl animate-bounce">🏆</div>
        <div className="absolute -top-2 -right-6 text-4xl animate-pulse">⭐</div>
        <div className="absolute -bottom-4 -left-6 text-5xl animate-bounce delay-300">🎉</div>
        <div className="absolute -bottom-2 -right-4 text-4xl animate-pulse delay-500">🌟</div>
        
        {/* Main Diploma */}
        <div className="bg-white border-8 border-yellow-400 rounded-3xl shadow-2xl p-12 max-w-2xl mx-auto relative overflow-hidden">
          {/* Decorative border pattern */}
          <div className="absolute inset-4 border-4 border-yellow-300 rounded-2xl opacity-30"></div>
          <div className="absolute inset-6 border-2 border-yellow-200 rounded-xl opacity-50"></div>
          
          {/* Content */}
          <div className="relative z-10 text-center space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <div className="text-6xl">🏆</div>
              <h1 className="text-4xl font-bold text-yellow-600 tracking-wide">
                {diplomaTitle}
              </h1>
              <div className="h-1 w-32 bg-gradient-to-r from-yellow-400 to-orange-400 mx-auto rounded-full"></div>
            </div>
            
            {/* Main message */}
            <div className="space-y-4">
              <p className="text-xl text-gray-700 font-medium leading-relaxed">
                {message}
              </p>
              
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-yellow-700 mb-2">
                  {courseName}
                </h2>
                <p className="text-lg text-gray-600">
                  Genomförd med utmärkt resultat
                </p>
              </div>
            </div>
            
            {/* Statistics */}
            {showStats && totalAnswers > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-700 mb-4">
                  📊 Dina resultat
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
                    <div className="text-sm text-gray-600">Rätt svar</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-2xl font-bold text-red-500">{wrongAnswers}</div>
                    <div className="text-sm text-gray-600">Fel svar</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-2xl font-bold text-blue-600">{percentage}%</div>
                    <div className="text-sm text-gray-600">Resultat</div>
                  </div>
                </div>
                
                {/* Performance message */}
                <div className="mt-4 p-3 rounded-lg bg-white">
                  <p className="text-sm font-medium text-gray-700">
                    {percentage >= 90 ? '🌟 Enastående prestation!' :
                     percentage >= 80 ? '🎯 Mycket bra jobbat!' :
                     percentage >= 70 ? '👍 Bra gjort!' :
                     percentage >= 60 ? '💪 Godkänt resultat!' :
                     '🔄 Fortsätt öva för att förbättra ditt resultat!'}
                  </p>
                </div>
              </div>
            )}
            
            {/* Date and signature */}
            <div className="space-y-4 pt-6 border-t-2 border-yellow-200">
              <div className="text-gray-600">
                <p className="font-medium">Datum: {new Date().toLocaleDateString('sv-SE')}</p>
              </div>
              
              <div className="flex justify-center items-center space-x-8">
                <div className="text-center">
                  <div className="h-px w-32 bg-gray-400 mb-2"></div>
                  <p className="text-sm text-gray-600 font-medium">Lärare</p>
                </div>
                <div className="text-4xl">🏅</div>
                <div className="text-center">
                  <div className="h-px w-32 bg-gray-400 mb-2"></div>
                  <p className="text-sm text-gray-600 font-medium">Elev</p>
                </div>
              </div>
            </div>
            
            {/* Action button */}
            {onNext && (
              <div className="pt-6">
                <Button 
                  onClick={onNext}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-3 px-8 rounded-full text-lg shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  🎉 Avsluta
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}