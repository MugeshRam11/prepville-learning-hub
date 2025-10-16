
import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MockExamSidebarProps {
  questions: any[];
  currentQuestionIndex: number;
  currentSubQuestionIndex: number | null;
  answeredQuestions: Set<string>;
  onQuestionSelect: (questionIndex: number, subQuestionIndex?: number) => void;
}

const MockExamSidebar = ({
  questions,
  currentQuestionIndex,
  currentSubQuestionIndex,
  answeredQuestions,
  onQuestionSelect
}: MockExamSidebarProps) => {
  const activeQuestionRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active question with smooth animation
  useEffect(() => {
    if (activeQuestionRef.current) {
      activeQuestionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'start'
      });
    }
  }, [currentQuestionIndex, currentSubQuestionIndex]);

  const getQuestionStatus = (questionIndex: number, subQuestionIndex?: number) => {
    const question = questions[questionIndex];
    if (!question) return 'unanswered';

    const questionId = question.id;
    const subQuestionId = subQuestionIndex !== undefined 
      ? question.subQuestions?.[subQuestionIndex]?.id 
      : undefined;

    const key = subQuestionId ? `${questionId}-${subQuestionId}` : questionId;
    return answeredQuestions.has(key) ? 'answered' : 'unanswered';
  };

  const getStatusIcon = (status: string, isActive: boolean) => {
    if (status === 'answered') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (isActive) {
      return <AlertCircle className="w-4 h-4 text-orange-500" />;
    }
    return <Circle className="w-4 h-4 text-gray-400" />;
  };

  const getStatusColor = (status: string, isActive: boolean) => {
    if (isActive) {
      return 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg';
    }
    if (status === 'answered') {
      return 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-300 text-green-800 hover:from-green-200 hover:to-emerald-200';
    }
    return 'bg-white border-gray-200 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-300';
  };

  return (
    <aside className="w-full lg:w-80 xl:w-96 bg-gradient-to-b from-background to-primary/5 border-r border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Question Navigation
        </h2>
        <div className="flex items-center gap-3 flex-wrap text-sm">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-green-700">Answered</span>
          </div>
          <div className="flex items-center gap-1">
            <Circle className="w-4 h-4 text-gray-400" />
            <span className="text-muted-foreground">Not Answered</span>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-3 py-4">
        {questions.map((question, questionIndex) => {
          const mainQuestionStatus = getQuestionStatus(questionIndex);
          const isMainActive = currentQuestionIndex === questionIndex && currentSubQuestionIndex === null;

          return (
            <div 
              key={question.id} 
              className="space-y-2"
              ref={isMainActive && currentSubQuestionIndex === null ? activeQuestionRef : null}
            >
              <Card
                className={`p-3 cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-[1.02] ${getStatusColor(mainQuestionStatus, isMainActive)}`}
                onClick={() => onQuestionSelect(questionIndex)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(mainQuestionStatus, isMainActive)}
                    <span className="font-medium">Question {questionIndex + 1}</span>
                  </div>
                  <Badge 
                    variant={isMainActive ? "secondary" : "outline"}
                    className={isMainActive ? "bg-white/20 text-white" : ""}
                  >
                    {question.marks} marks
                  </Badge>
                </div>
              </Card>

              {question.subQuestions && question.subQuestions.map((subQuestion: any, subIndex: number) => {
                const subQuestionStatus = getQuestionStatus(questionIndex, subIndex);
                const isSubActive = currentQuestionIndex === questionIndex && currentSubQuestionIndex === subIndex;

                return (
                  <Card
                    key={subQuestion.id}
                    ref={isSubActive ? activeQuestionRef : null}
                    className={`ml-4 lg:ml-6 p-2 cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-[1.02] ${getStatusColor(subQuestionStatus, isSubActive)}`}
                    onClick={() => onQuestionSelect(questionIndex, subIndex)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {getStatusIcon(subQuestionStatus, isSubActive)}
                        <span className="text-sm font-medium truncate">
                          {subQuestion.label || String.fromCharCode(97 + subIndex)}) {subQuestion.text?.slice(0, 30) || 'Sub-question'}...
                        </span>
                      </div>
                      <Badge 
                        variant={isSubActive ? "secondary" : "outline"}
                        className={`text-xs flex-shrink-0 ${isSubActive ? "bg-white/20 text-white" : ""}`}
                      >
                        {subQuestion.marks}m
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          );
        })}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-3">
          <h3 className="font-medium text-foreground mb-2">Progress Overview</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-foreground">
              <span>Answered:</span>
              <span className="font-semibold text-green-600">{answeredQuestions.size}</span>
            </div>
            <div className="flex justify-between text-foreground">
              <span>Remaining:</span>
              <span className="font-semibold text-orange-600">{questions.length - answeredQuestions.size}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default MockExamSidebar;
