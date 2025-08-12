import { type WordClass } from "@shared/schema";

interface GameSidebarProps {
  currentProgress: number;
  totalQuestions: number;
  progressPercentage: number;
  correctAnswers: number;
  wrongAnswers: number;
  wordClasses: WordClass[];
}

export default function GameSidebar({
  currentProgress,
  totalQuestions,
  progressPercentage,
  correctAnswers,
  wrongAnswers,
  wordClasses
}: GameSidebarProps) {
  const getColorForWordClass = (wordClass: string) => {
    switch (wordClass) {
      case 'verb': return 'bg-primary';
      case 'noun': return 'bg-secondary';
      case 'adjective': return 'bg-accent';
      case 'adverb': return 'bg-purple-500';
      case 'pronoun': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Card */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Framsteg</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Genomfört</span>
              <span className="text-sm font-semibold text-gray-900" data-testid="progress-text">
                {currentProgress}/{totalQuestions}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-secondary to-emerald-400 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
                data-testid="progress-bar"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500" data-testid="correct-answers">
                {correctAnswers}
              </div>
              <div className="text-xs text-gray-500">Rätt</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500" data-testid="wrong-answers">
                {wrongAnswers}
              </div>
              <div className="text-xs text-gray-500">Fel</div>
            </div>
          </div>
        </div>
      </div>

      {/* Word Classes Reference */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ordklasser att hitta</h3>
        
        <div className="space-y-3">
          {wordClasses.map((wordClass) => (
            <div 
              key={wordClass.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              data-testid={`word-class-${wordClass.name}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${getColorForWordClass(wordClass.name)}`} />
                <span className="font-medium text-gray-700">{wordClass.swedishName}</span>
              </div>
              <span className="text-xs text-gray-500">{wordClass.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Achievements */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Senaste prestationer</h3>
        
        <div className="space-y-3">
          {correctAnswers >= 5 && (
            <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-100">
              <div className="bg-accent text-white p-2 rounded-lg">
                <i className="fas fa-medal text-sm"></i>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800 text-sm">Verb-mästare</p>
                <p className="text-xs text-gray-500">5 eller fler rätt svar</p>
              </div>
            </div>
          )}
          
          {correctAnswers >= 3 && (
            <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
              <div className="bg-green-500 text-white p-2 rounded-lg">
                <i className="fas fa-fire text-sm"></i>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800 text-sm">På streak!</p>
                <p className="text-xs text-gray-500">3 eller fler rätt i rad</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
