import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import AITestEvaluation from '@/components/AITestEvaluation';

interface QuizResultsProps {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  onTakeAnother: () => void;
  onBackToPractice: () => void;
}

const QuizResults = ({
  score,
  correctAnswers,
  totalQuestions,
  onTakeAnother,
  onBackToPractice
}: QuizResultsProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="container max-w-4xl space-y-6">
          <Card className="w-full">
            <CardHeader className="text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <CardTitle>Quiz Completed!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div>
                <p className="text-3xl font-bold text-green-600">{score}%</p>
                <p className="text-muted-foreground">Your Score</p>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Correct: {correctAnswers} / {totalQuestions}</p>
              </div>
              <div className="space-y-2">
                <Button className="w-full" onClick={onTakeAnother}>
                  Take Another Quiz
                </Button>
                <Button variant="outline" className="w-full" onClick={onBackToPractice}>
                  Back to Practice
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Evaluation */}
          <AITestEvaluation
            testType="quiz"
            subject="Quick Practice"
            score={score}
            correctAnswers={correctAnswers}
            totalQuestions={totalQuestions}
          />
        </div>
      </main>
    </div>
  );
};

export default QuizResults;
