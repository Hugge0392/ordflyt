import { type Sentence } from "@shared/schema";

interface SentenceDisplayProps {
  sentence: Sentence;
  targetWordClass: string;
  onWordClick: (wordIndex: number, wordClass: string) => void;
  clickedWords: Set<number>;
  feedback: {
    type: "success" | "error" | null;
    message: string;
    actualWordClass?: string;
  };
}

export default function SentenceDisplay({ 
  sentence, 
  targetWordClass, 
  onWordClick, 
  clickedWords,
  feedback 
}: SentenceDisplayProps) {
  const getWordClassName = (wordIndex: number, wordClass: string) => {
    const baseClasses = "word-button";
    
    if (clickedWords.has(wordIndex)) {
      if (wordClass === targetWordClass) {
        return `${baseClasses} correct`;
      } else {
        return `${baseClasses} incorrect`;
      }
    }
    
    return baseClasses;
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 mb-6 border border-blue-100">
      <div className="text-center">
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
                onClick={() => onWordClick(index, word.wordClass)}
                data-testid={`word-${index}`}
                style={{
                  pointerEvents: clickedWords.size > 0 && feedback.type ? 'none' : 'auto'
                }}
              >
                {word.text}
              </span>
            )
          ))}
        </p>
      </div>
    </div>
  );
}