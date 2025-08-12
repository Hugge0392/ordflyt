interface FeedbackDisplayProps {
  feedback: {
    type: "success" | "error" | null;
    message: string;
    actualWordClass?: string;
  };
  onNextQuestion: () => void;
  showNextButton: boolean;
  isLastQuestion: boolean;
}

export default function FeedbackDisplay({ 
  feedback, 
  onNextQuestion, 
  showNextButton, 
  isLastQuestion 
}: FeedbackDisplayProps) {
  if (feedback.type === null) {
    return null;
  }

  return (
    <div id="feedback-area">
      {feedback.type === "success" && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-400 text-white p-4 rounded-xl mb-4 animate-celebration">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <i className="fas fa-check text-xl"></i>
            </div>
            <div>
              <p className="font-semibold">{feedback.message}</p>
              <p className="text-sm opacity-90">Du fick <span className="font-bold">+10 poäng</span></p>
            </div>
          </div>
        </div>
      )}

      {feedback.type === "error" && (
        <div className="bg-gradient-to-r from-red-500 to-red-400 text-white p-4 rounded-xl mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <i className="fas fa-times text-xl"></i>
            </div>
            <div>
              <p className="font-semibold">{feedback.message}</p>
              {feedback.actualWordClass && (
                <p className="text-sm opacity-90">
                  Det ordet är ett <span className="font-bold">{feedback.actualWordClass}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {showNextButton && (
        <div className="flex justify-center mt-6">
          <button 
            className="bg-gradient-to-r from-primary to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            onClick={onNextQuestion}
            data-testid="next-question-btn"
          >
            <i className="fas fa-arrow-right mr-2"></i>
            {isLastQuestion ? "Avsluta spel" : "Nästa mening"}
          </button>
        </div>
      )}
    </div>
  );
}
