
import React from 'react';

interface QuizProgressProps {
  currentQuestion: number;
  totalQuestions: number;
}

const QuizProgress = ({ currentQuestion, totalQuestions }: QuizProgressProps) => {
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  return (
    <div className="mb-6">
      <div className="flex justify-between text-sm text-muted-foreground mb-2">
        <span>Question {currentQuestion + 1} of {totalQuestions}</span>
        <span>{Math.round(progress)}% Complete</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

export default QuizProgress;
