interface GameHeaderProps {
  score: number;
  level: number;
}

export default function GameHeader({ score, level }: GameHeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b-2 border-primary/10">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-primary text-white p-3 rounded-xl">
              <i className="fas fa-graduation-cap text-xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ordklasser</h1>
              <p className="text-gray-600">Träna grammatik genom att hitta rätt ordklass</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="bg-gradient-to-r from-secondary to-emerald-400 text-white px-6 py-3 rounded-xl shadow-lg">
              <div className="flex items-center space-x-2">
                <i className="fas fa-star"></i>
                <span className="font-bold text-lg" data-testid="score-display">{score}</span>
                <span className="text-sm opacity-90">poäng</span>
              </div>
            </div>
            
            <div className="bg-accent text-white px-4 py-3 rounded-xl shadow-lg">
              <div className="flex items-center space-x-2">
                <i className="fas fa-trophy"></i>
                <span className="font-semibold" data-testid="level-display">Nivå {level}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
