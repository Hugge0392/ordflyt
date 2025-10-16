import { type WordClass } from "@shared/schema";

interface WordClassGuideProps {
  wordClass: WordClass;
  isCorrect?: boolean;
  isWrong?: boolean;
  onClose?: () => void;
}

export default function WordClassGuide({ wordClass, isCorrect, isWrong, onClose }: WordClassGuideProps) {
  const getCharacterMood = () => {
    if (isCorrect) return "😊";
    if (isWrong) return "🤔";
    return "👋";
  };

  const getMessage = () => {
    if (isCorrect) {
      return `Bra jobbat! Du hittade ${wordClass.swedishName.toLowerCase()}et!`;
    }
    if (isWrong) {
      return `Inte riktigt rätt. Kom ihåg att ${wordClass.swedishName.toLowerCase()} är ${wordClass.description}.`;
    }
    return `Hej! Idag ska vi hitta ${wordClass.swedishName.toLowerCase()}. ${wordClass.description.charAt(0).toUpperCase() + wordClass.description.slice(1)}.`;
  };

  const getExplanation = () => {
    switch (wordClass.name) {
      case 'verb':
        return 'Verb beskriver vad någon gör. Till exempel: springer, läser, äter.';
      case 'noun':
        return 'Substantiv är namn på saker, personer eller platser. Till exempel: bok, hund, skola.';
      case 'adjective':
        return 'Adjektiv beskriver hur något är. Till exempel: stor, grön, snabb.';
      case 'adverb':
        return 'Adverb beskriver hur något görs. Till exempel: snabbt, tyst, försiktigt.';
      case 'pronoun':
        return 'Pronomen ersätter substantiv. Till exempel: jag, du, han, hon, det.';
      case 'preposition':
        return 'Prepositioner visar förhållanden. Till exempel: till, från, på, under.';
      default:
        return wordClass.description;
    }
  };

  return (
    <div className={`bg-white rounded-2xl shadow-xl p-6 mb-6 border-2 ${
      isCorrect ? 'border-green-300 bg-green-50' : 
      isWrong ? 'border-red-300 bg-red-50' : 
      'border-blue-300 bg-blue-50'
    }`}>
      <div className="flex items-start space-x-4">
        <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-2xl ${
          isCorrect ? 'bg-green-100' : 
          isWrong ? 'bg-red-100' : 
          'bg-blue-100'
        }`}>
          {getCharacterMood()}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Lilla Grammatik</h3>
            <div 
              className="px-3 py-1 rounded-full text-white text-sm font-medium"
              style={{ backgroundColor: wordClass.color }}
            >
              {wordClass.swedishName}
            </div>
          </div>
          
          <p className="text-gray-700 mb-2">
            {getMessage()}
          </p>
          
          <p className="text-sm text-gray-600">
            {getExplanation()}
          </p>
        </div>
      </div>
    </div>
  );
}