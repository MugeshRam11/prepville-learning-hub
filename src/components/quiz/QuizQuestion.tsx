
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  optionFeedback?: {
    [key: number]: {
      type: 'correct' | 'calculation-error' | 'interpretation-error' | 'carelessness' | 'concept-error';
      message: string;
    };
  };
}

interface QuizQuestionProps {
  question: Question;
  selectedAnswer?: number;
  onAnswerSelect: (answerIndex: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
}

const QuizQuestion = ({
  question,
  selectedAnswer,
  onAnswerSelect,
  onNext,
  onPrevious,
  isFirstQuestion,
  isLastQuestion
}: QuizQuestionProps) => {
  const getFeedbackStyle = (type: string) => {
    switch (type) {
      case 'correct':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'calculation-error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'interpretation-error':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'carelessness':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'concept-error':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getFeedbackIcon = (type: string) => {
    switch (type) {
      case 'correct':
        return '✓';
      case 'calculation-error':
        return '🔢';
      case 'interpretation-error':
        return '📖';
      case 'carelessness':
        return '⚠️';
      case 'concept-error':
        return '💡';
      default:
        return '❗';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{question.question}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => onAnswerSelect(index)}
              className={`w-full p-4 text-left rounded-lg border transition-colors ${
                selectedAnswer === index
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-muted-foreground hover:bg-muted/50'
              }`}
            >
              <span className="font-medium mr-3">{String.fromCharCode(65 + index)}.</span>
              {option}
            </button>
          ))}
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={isFirstQuestion}
          >
            Previous
          </Button>
          <Button
            onClick={onNext}
            disabled={selectedAnswer === undefined}
          >
            {isLastQuestion ? 'Submit Quiz' : 'Next'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuizQuestion;
