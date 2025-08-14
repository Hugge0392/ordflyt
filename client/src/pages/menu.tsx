import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { type WordClass } from "@shared/schema";

export default function Menu() {
  const { data: wordClasses = [], isLoading } = useQuery<WordClass[]>({
    queryKey: ["/api/word-classes"],
  });

  const getColorForWordClass = (wordClass: string) => {
    switch (wordClass) {
      case 'verb': return 'from-indigo-500 to-purple-600';
      case 'noun': return 'from-green-500 to-emerald-600';
      case 'adjective': return 'from-yellow-500 to-orange-600';
      case 'adverb': return 'from-purple-500 to-pink-600';
      case 'pronoun': return 'from-pink-500 to-rose-600';
      case 'preposition': return 'from-gray-500 to-slate-600';
      default: return 'from-blue-500 to-indigo-600';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Laddar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl inline-block mb-6">
              <i className="fas fa-graduation-cap text-4xl"></i>
            </div>
            <h1 className="text-5xl font-bold mb-4">Välkommen till Ordklasser!</h1>
            <p className="text-xl mb-4">Lär dig svenska grammatik genom roliga spel och övningar</p>
            <div className="bg-white/10 rounded-xl p-4 max-w-2xl mx-auto">
              <p className="text-lg">
                <i className="fas fa-lightbulb mr-2"></i>
                Klicka på ord i meningar för att hitta rätt ordklass. 
                Börja med enskilda ordklasser eller testa alla på en gång!
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Individual Word Class Training */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Träna enskilda ordklasser
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wordClasses.map((wordClass) => (
              <Link
                key={wordClass.id}
                href={`/wordclass/${wordClass.name}`}
                className="group"
                data-testid={`practice-${wordClass.name}`}
              >
                <div className={`bg-gradient-to-r ${getColorForWordClass(wordClass.name)} text-white p-6 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300`}>
                  <div className="text-center">
                    <div className="text-4xl mb-4">
                      {wordClass.name === 'noun' && '📚'}
                      {wordClass.name === 'verb' && '🏃‍♂️'}
                      {wordClass.name === 'adjective' && '🎨'}
                      {wordClass.name === 'adverb' && '⚡'}
                      {wordClass.name === 'pronoun' && '👥'}
                      {wordClass.name === 'preposition' && '📍'}
                      {wordClass.name === 'conjunction' && '🔗'}
                      {wordClass.name === 'interjection' && '💬'}
                      {wordClass.name === 'numeral' && '🔢'}
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{wordClass.swedishName}</h3>
                    <p className="text-lg opacity-90 mb-4">{wordClass.description}</p>
                    <div className="bg-white/20 rounded-lg px-4 py-2">
                      <span className="text-sm font-medium">Klicka för att träna</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>



        {/* Tests Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Prov och tester
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Individual Tests */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="text-center mb-6">
                <div className="bg-orange-100 text-orange-600 p-4 rounded-xl inline-block mb-4">
                  <i className="fas fa-stopwatch text-3xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Slutprov per ordklass</h3>
                <p className="text-gray-600">Testa dina kunskaper med tidtagning</p>
              </div>
              
              <div className="space-y-3">
                {wordClasses.map((wordClass) => (
                  <Link
                    key={`test-${wordClass.id}`}
                    href={`/test/${wordClass.name}`}
                    className="block"
                    data-testid={`test-${wordClass.name}`}
                  >
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: wordClass.color }}
                        />
                        <span className="font-medium text-gray-700">{wordClass.swedishName}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-500 group-hover:text-gray-700">
                        <i className="fas fa-clock text-sm"></i>
                        <span className="text-sm">Tidsprov</span>
                        <i className="fas fa-arrow-right text-sm"></i>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Complete Test */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="text-center mb-6">
                <div className="bg-purple-100 text-purple-600 p-4 rounded-xl inline-block mb-4">
                  <i className="fas fa-trophy text-3xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Komplett ordklassprov</h3>
                <p className="text-gray-600">Testa alla ordklasser i samma prov</p>
              </div>
              
              <Link href="/test/complete" data-testid="complete-test">
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-6 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-center">
                  <div className="text-2xl mb-2">🎯</div>
                  <div className="font-bold text-lg mb-2">Starta komplett prov</div>
                  <div className="text-sm opacity-90">Alla ordklasser • Tidtagning • Högsta svårighetsgrad</div>
                </div>
              </Link>

              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Vad ingår:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Meningar med alla ordklasser</li>
                  <li>• Tidtagning och poäng baserat på hastighet</li>
                  <li>• Tidstillägg för fel svar</li>
                  <li>• Slutbetyg och ranking</li>
                </ul>
              </div>
            </div>
          </div>
        </section>



        {/* Free Practice */}
        <section>
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
            <div className="bg-blue-100 text-blue-600 p-4 rounded-xl inline-block mb-6">
              <i className="fas fa-play text-3xl"></i>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Fri träning</h3>
            <p className="text-gray-600 mb-6">Träna på alla ordklasser blandat utan tidsbegränsning</p>
            
            <Link href="/practice" data-testid="free-practice">
              <button className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
                <i className="fas fa-gamepad mr-2"></i>
                Starta fri träning
              </button>
            </Link>
          </div>
        </section>

        {/* Admin Panel Section */}
        <section className="mb-16">
          <div className="max-w-md mx-auto">
            <Link href="/admin">
              <div className="bg-gray-600 hover:bg-gray-700 text-white p-6 rounded-xl shadow-xl transform hover:scale-105 transition-all duration-200 text-center">
                <div className="text-3xl mb-3">⚙️</div>
                <h3 className="text-xl font-bold mb-2">Adminpanel</h3>
                <p className="text-sm opacity-90">
                  Hantera meningar och ordklasser
                </p>
              </div>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}