import { type Sentence } from "@shared/schema";

interface MultipleChoiceSentenceProps {
  sentence: Sentence;
  targetWordClass: string;
  selectedWords: Set<number>;
  onWordClick: (wordIndex: number, wordClass: string) => void;
  showNoWordsButton: boolean;
  onNoWords: () => void;
  isSubmitted: boolean;
  correctWords: Set<number>;
  incorrectWords: Set<number>;
}

export default function MultipleChoiceSentence({ 
  sentence, 
  targetWordClass, 
  selectedWords,
  onWordClick, 
  showNoWordsButton,
  onNoWords,
  isSubmitted,
  correctWords,
  incorrectWords
}: MultipleChoiceSentenceProps) {
  const getWordClassName = (wordIndex: number, wordClass: string) => {
    const baseClasses = "word-button";
    
    if (isSubmitted) {
      if (correctWords.has(wordIndex)) {
        return `${baseClasses} correct`;
      } else if (incorrectWords.has(wordIndex)) {
        return `${baseClasses} incorrect`;
      } else if (selectedWords.has(wordIndex)) {
        return `${baseClasses} incorrect`; // Was selected but not correct
      }
    } else if (selectedWords.has(wordIndex)) {
      return `${baseClasses} bg-blue-200 border-blue-400`;
    }
    
    return baseClasses;
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 mb-6 border border-blue-100">
      <div className="text-center mb-6">
        <p className="text-2xl leading-relaxed text-gray-800 font-medium">
          {sentence.words.map((word, index) => (
            word.isPunctuation ? (
              <span key={index} className="inline-block mx-1">
                {word.text}
              </span>
            ) : (
              <span
                key={index}
                className={getWordClassName(index, word.wordClass)}
                onClick={() => !isSubmitted && onWordClick(index, word.wordClass)}
                data-testid={`word-${index}`}
                style={{
                  pointerEvents: isSubmitted ? 'none' : 'auto',
                  cursor: isSubmitted ? 'default' : 'pointer'
                }}
              >
                {word.text}
              </span>
            )
          ))}
        </p>
      </div>

      {showNoWordsButton && !isSubmitted && (
        <div className="text-center">
          <button
            onClick={onNoWords}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            data-testid="no-words-button"
          >
            <i className="fas fa-times mr-2"></i>
            Det finns inga {targetWordClass} i denna mening
          </button>
        </div>
      )}
    </div>
  );
}