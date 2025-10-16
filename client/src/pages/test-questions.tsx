import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

export default function TestQuestions() {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const question = {
    prompt: "Vilka två författare nämns som nästan lika viktiga som Hamsun?",
    options: [
      "Selma Lagerlöf och Henrik Pontoppidan",
      "August Strindberg och Leo Tolstoj",
      "Henrik Ibsen och Fjodor Dostojevskij",
      "Astrid Lindgren och Karen Blixen",
    ],
    correctIndex: 0,
  };

  const handleCheck = () => {
    setShowResult(true);
  };

  const handleReset = () => {
    setSelectedAnswer(null);
    setShowResult(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Test av frågekomponent</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{question.prompt}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === question.correctIndex;
              const showFeedback = showResult;

              return (
                <button
                  key={index}
                  className={`
                    w-full text-left p-3 rounded-lg border-2 transition-all
                    ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                    ${showFeedback && isCorrect ? 'bg-green-50 border-green-500' : ''}
                    ${showFeedback && isSelected && !isCorrect ? 'bg-red-50 border-red-500' : ''}
                  `}
                  onClick={() => !showResult && setSelectedAnswer(index)}
                  disabled={showResult}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {showFeedback && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                    {showFeedback && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </button>
              );
            })}

            <div className="flex gap-2 pt-2">
              {!showResult ? (
                <Button
                  onClick={handleCheck}
                  disabled={selectedAnswer === null}
                >
                  Kolla svar
                </Button>
              ) : (
                <>
                  <Badge
                    variant={selectedAnswer === question.correctIndex ? "default" : "destructive"}
                    className="py-1"
                  >
                    {selectedAnswer === question.correctIndex ? "✓ Rätt svar!" : "✗ Fel svar"}
                  </Badge>
                  <Button variant="outline" onClick={handleReset}>
                    Försök igen
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-blue-100 rounded-lg">
          <h2 className="font-semibold mb-2">Debug info:</h2>
          <p>Valt svar: {selectedAnswer !== null ? selectedAnswer : "Inget valt"}</p>
          <p>Visar resultat: {showResult ? "Ja" : "Nej"}</p>
          <p>Rätt svar index: {question.correctIndex}</p>
        </div>
      </div>
    </div>
  );
}