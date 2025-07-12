
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Question } from '@/pages/MockExamStart';

interface MockExamSidebarProps {
  questions: Question[];
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
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

  const toggleExpanded = (questionIndex: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionIndex)) {
      newExpanded.delete(questionIndex);
    } else {
      newExpanded.add(questionIndex);
    }
    setExpandedQuestions(newExpanded);
  };

  const isQuestionAnswered = (questionId: string, subQuestionId?: string) => {
    const key = subQuestionId ? `${questionId}-${subQuestionId}` : questionId;
    return answeredQuestions.has(key);
  };

  const getQuestionStatus = (question: Question) => {
    if (question.subQuestions) {
      const answeredCount = question.subQuestions.filter(sq => 
        isQuestionAnswered(question.id, sq.id)
      ).length;
      const totalCount = question.subQuestions.length;
      
      if (answeredCount === 0) return 'unanswered';
      if (answeredCount === totalCount) return 'answered';
      return 'partial';
    } else {
      return isQuestionAnswered(question.id) ? 'answered' : 'unanswered';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'answered': return 'bg-green-100 text-green-800 border-green-200';
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="w-80 bg-white border-r shadow-sm flex flex-col">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-800">Questions</h3>
        <p className="text-sm text-gray-600 mt-1">Click to navigate</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {questions.map((question, questionIndex) => {
          const isExpanded = expandedQuestions.has(questionIndex);
          const status = getQuestionStatus(question);
          const isCurrentQuestion = questionIndex === currentQuestionIndex;

          return (
            <div key={question.id} className="space-y-1">
              {question.subQuestions ? (
                <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(questionIndex)}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={`w-full justify-between p-3 h-auto ${
                        isCurrentQuestion && currentSubQuestionIndex === null 
                          ? 'bg-blue-50 border-2 border-blue-200' 
                          : ''
                      }`}
                      onClick={() => onQuestionSelect(questionIndex)}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-medium">Q{questionIndex + 1}</span>
                        <Badge variant="secondary" className="text-xs">
                          {question.marks} marks
                        </Badge>
                        <div className={`w-3 h-3 rounded-full border-2 ${getStatusColor(status)}`} />
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="ml-4 space-y-1 mt-1">
                    {question.subQuestions.map((subQuestion, subIndex) => {
                      const isAnswered = isQuestionAnswered(question.id, subQuestion.id);
                      const isCurrentSub = isCurrentQuestion && currentSubQuestionIndex === subIndex;
                      
                      return (
                        <Button
                          key={subQuestion.id}
                          variant="ghost"
                          size="sm"
                          className={`w-full justify-start p-2 h-auto ${
                            isCurrentSub ? 'bg-blue-50 border-2 border-blue-200' : ''
                          }`}
                          onClick={() => onQuestionSelect(questionIndex, subIndex)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              Q{questionIndex + 1}{String.fromCharCode(97 + subIndex)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {subQuestion.marks}m
                            </Badge>
                            <div className={`w-2 h-2 rounded-full ${
                              isAnswered ? 'bg-green-500' : 'bg-gray-300'
                            }`} />
                          </div>
                        </Button>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <Button
                  variant="ghost"
                  className={`w-full justify-start p-3 h-auto ${
                    isCurrentQuestion ? 'bg-blue-50 border-2 border-blue-200' : ''
                  }`}
                  onClick={() => onQuestionSelect(questionIndex)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Q{questionIndex + 1}</span>
                    <Badge variant="secondary" className="text-xs">
                      {question.marks} marks
                    </Badge>
                    <div className={`w-3 h-3 rounded-full border-2 ${getStatusColor(status)}`} />
                  </div>
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="p-4 border-t bg-gray-50 text-xs space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Partially Answered</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <span>Not Answered</span>
        </div>
      </div>
    </div>
  );
};

export default MockExamSidebar;
