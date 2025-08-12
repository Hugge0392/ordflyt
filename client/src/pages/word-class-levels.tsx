import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { type WordClass, type GameProgress } from "@shared/schema";

export default function WordClassLevels() {
  const [match, params] = useRoute("/wordclass/:wordClass");
  const wordClassName = params?.wordClass;
  
  const { data: wordClasses = [], isLoading: wordClassesLoading } = useQuery<WordClass[]>({
    queryKey: ["/api/word-classes"],
  });

  const { data: gameProgress, isLoading: progressLoading } = useQuery<GameProgress>({
    queryKey: ["/api/game-progress"],
  });

  const currentWordClass = wordClasses.find(wc => wc.name === wordClassName);
  const completedLevel = gameProgress?.completedLevels?.[wordClassName || ""] || 0;

  const levels = [
    {
      level: 1,
      name: "Grundläggande",
      description: "3-4 ord, ett rätt svar. Grön feedback direkt.",
      difficulty: "Lätt",
      color: "from-green-400 to-emerald-500",
      icon: "🌱"
    },
    {
      level: 2,
      name: "Medel",
      description: "5-7 ord, ett rätt svar. Grön feedback direkt.",
      difficulty: "Medel", 
      color: "from-yellow-400 to-orange-500",
      icon: "🌳"
    },
    {
      level: 3,
      name: "Avancerad",
      description: "5-8 ord, flera rätt svar. 'Gå vidare' knapp.",
      difficulty: "Svår",
      color: "from-orange-400 to-red-500",
      icon: "🏔️"
    },
    {
      level: 4,
      name: "Expert",
      description: "6-12 ord, flera svar eller inga ord. 'Gå vidare' knapp.",
      difficulty: "Expert",
      color: "from-red-500 to-pink-600",
      icon: "🔥"
    },
    {
      level: 5,
      name: "Slutprov",
      description: "Tidsprov med 5-stjärnig bedömning",
      difficulty: "Slutprov",
      color: "from-purple-500 to-indigo-600",
      icon: "👑"
    }
  ];

  if (wordClassesLoading || progressLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Laddar...</div>
      </div>
    );
  }

  if (!currentWordClass) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col space-y-4">
        <div className="text-lg text-gray-600">Ordklass hittades inte</div>
        <Link href="/">
          <button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90">
            Tillbaka till meny
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-primary/10">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/">
              <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors">
                <i className="fas fa-arrow-left"></i>
                <span>Tillbaka till meny</span>
              </button>
            </Link>
            
            <div className="text-center">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl mb-3 mx-auto"
                style={{ backgroundColor: currentWordClass.color }}
              >
                {currentWordClass.name === 'noun' && '📚'}
                {currentWordClass.name === 'verb' && '🏃‍♂️'}
                {currentWordClass.name === 'adjective' && '🎨'}
                {currentWordClass.name === 'adverb' && '⚡'}
                {currentWordClass.name === 'pronoun' && '👥'}
                {currentWordClass.name === 'preposition' && '📍'}
                {currentWordClass.name === 'conjunction' && '🔗'}
                {currentWordClass.name === 'interjection' && '💬'}
                {currentWordClass.name === 'numeral' && '🔢'}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentWordClass.swedishName}</h1>
              <p className="text-gray-600">{currentWordClass.description}</p>
            </div>
            
            <div className="bg-gradient-to-r from-secondary to-emerald-400 text-white px-4 py-2 rounded-xl">
              <div className="text-center">
                <div className="font-bold">Nivå {completedLevel}</div>
                <div className="text-sm opacity-90">Klarad</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Välj nivå att träna</h2>
          <p className="text-gray-600">Börja med grundläggande och arbeta dig uppåt!</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {levels.map((level) => {
            const isCompleted = completedLevel >= level.level;
            const isLocked = level.level > completedLevel + 1;
            const isCurrent = level.level === completedLevel + 1;
            
            return (
              <div
                key={level.level}
                className={`relative rounded-2xl shadow-xl border-2 transition-all duration-300 ${
                  isLocked 
                    ? 'bg-gray-100 border-gray-200 opacity-60' 
                    : 'bg-white border-gray-100 hover:shadow-2xl hover:scale-105'
                }`}
              >
                {/* Level content */}
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${level.color} flex items-center justify-center text-2xl`}>
                        {isLocked ? '🔒' : level.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          Nivå {level.level}: {level.name}
                        </h3>
                        <p className="text-gray-600">{level.description}</p>
                      </div>
                    </div>
                    
                    {isCompleted && (
                      <div className="bg-green-100 text-green-600 p-2 rounded-lg">
                        <i className="fas fa-check text-xl"></i>
                      </div>
                    )}
                    
                    {isCurrent && (
                      <div className="bg-blue-100 text-blue-600 p-2 rounded-lg animate-pulse">
                        <i className="fas fa-star text-xl"></i>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500">Svårighet:</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        level.difficulty === 'Lätt' ? 'bg-green-100 text-green-700' :
                        level.difficulty === 'Medel' ? 'bg-yellow-100 text-yellow-700' :
                        level.difficulty === 'Svår' ? 'bg-red-100 text-red-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {level.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Action button */}
                  {level.level === 5 ? (
                    // Final test level (level 5)
                    <Link 
                      href={isLocked ? '#' : `/test/${wordClassName}`}
                      className={isLocked ? 'pointer-events-none' : ''}
                    >
                      <button 
                        className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                          isLocked 
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:shadow-lg transform hover:scale-105'
                        }`}
                        disabled={isLocked}
                        data-testid={`test-level-${level.level}`}
                      >
                        <i className="fas fa-clock mr-2"></i>
                        {isLocked ? 'Låst - Klara tidigare nivåer först' : 'Starta slutprov'}
                      </button>
                    </Link>
                  ) : (
                    // Practice level
                    <Link 
                      href={isLocked ? '#' : `/practice/${wordClassName}/level/${level.level}`}
                      className={isLocked ? 'pointer-events-none' : ''}
                    >
                      <button 
                        className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                          isLocked 
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : isCompleted
                            ? 'bg-gray-500 text-white hover:bg-gray-600'
                            : `bg-gradient-to-r ${level.color} text-white hover:shadow-lg transform hover:scale-105`
                        }`}
                        disabled={isLocked}
                        data-testid={`practice-level-${level.level}`}
                      >
                        <i className={`fas ${isCompleted ? 'fa-redo' : 'fa-play'} mr-2`}></i>
                        {isLocked ? 'Låst - Klara tidigare nivåer först' : 
                         isCompleted ? 'Träna igen' : 
                         isCurrent ? 'Starta nivå' : 'Träna'}
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress overview */}
        <div className="mt-12 bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Ditt framsteg</h3>
          
          <div className="flex justify-center mb-6">
            <div className="w-full max-w-md">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Framsteg</span>
                <span>{completedLevel}/5 nivåer</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-secondary to-emerald-400 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(completedLevel / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="text-center">
            {completedLevel === 0 && (
              <p className="text-gray-600">Börja med Nivå 1 för att lära dig grunderna!</p>
            )}
            {completedLevel > 0 && completedLevel < 5 && (
              <p className="text-gray-600">
                Bra jobbat! Du har klarat {completedLevel} av 5 nivåer. 
                Fortsätt till nästa för att utvecklas mer!
              </p>
            )}
            {completedLevel === 5 && (
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-6 border border-green-200">
                <p className="text-green-700 font-semibold">
                  🎉 Grattis! Du har klarnat alla nivåer för {currentWordClass.swedishName}!
                </p>
                <p className="text-green-600 text-sm mt-2">
                  Prova andra ordklasser eller gör det kompletta provet!
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}