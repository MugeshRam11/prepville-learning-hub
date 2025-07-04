
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
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
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
