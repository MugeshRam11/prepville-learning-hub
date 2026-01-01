import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { QuestionType } from '@/data/mocktest2';

interface QuestionInfo {
  id: string;
  questionNumber: number;
  questionType: QuestionType;
  marks: number;
}

interface InteractiveExamSidebarProps {
  questions: QuestionInfo[];
  currentQuestionIndex: number;
  answeredQuestions: Set<string>;
  flaggedQuestions?: Set<string>;
  onQuestionSelect: (index: number) => void;
}

const questionTypeLabels: Record<QuestionType, string> = {
  graph_interaction: 'Graph',
  drag_drop_match: 'Drag & Drop',
  image_drop_zone: 'Image Drop',
  step_builder: 'Arrange',
  math_input: 'Smart Math',
  text_input: 'Text'
};

const questionTypeColors: Record<QuestionType, string> = {
  graph_interaction: 'bg-blue-500',
  drag_drop_match: 'bg-purple-500',
  image_drop_zone: 'bg-amber-500',
  step_builder: 'bg-teal-500',
  math_input: 'bg-pink-500',
  text_input: 'bg-gray-500'
};

const InteractiveExamSidebar = ({
  questions,
  currentQuestionIndex,
  answeredQuestions,
  flaggedQuestions = new Set(),
  onQuestionSelect
}: InteractiveExamSidebarProps) => {

  const getQuestionStatus = (questionId: string) => {
    if (flaggedQuestions.has(questionId)) return 'flagged';
    return answeredQuestions.has(questionId) ? 'answered' : 'unanswered';
  };

  return (
    <motion.aside 
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-64 bg-card border-l border-border flex flex-col h-full"
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-bold text-foreground">Quadrant Response</h2>
      </div>

      {/* Question List */}
      <ScrollArea className="flex-1 px-3">
        <div className="py-3 space-y-2">
          {questions.map((question, index) => {
            const status = getQuestionStatus(question.id);
            const isActive = currentQuestionIndex === index;

            return (
              <motion.button
                key={question.id}
                onClick={() => onQuestionSelect(index)}
                className={cn(
                  "w-full p-3 rounded-lg text-left transition-all duration-200",
                  "hover:bg-muted/50",
                  isActive && "bg-primary/5 border-l-2 border-primary",
                  !isActive && "border-l-2 border-transparent"
                )}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-3">
                  {/* Status Icon */}
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                    status === 'answered' && "text-green-500",
                    status === 'flagged' && "text-amber-500",
                    status === 'unanswered' && "text-muted-foreground"
                  )}>
                    {status === 'answered' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : status === 'flagged' ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </div>

                  {/* Question Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        Q{question.questionNumber}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-[10px] h-5 px-1.5 text-white",
                          questionTypeColors[question.questionType]
                        )}
                      >
                        {questionTypeLabels[question.questionType]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {status === 'answered' ? 'Answered' : 
                       status === 'flagged' ? 'Flagged' : 
                       'Not Attempted'}
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer - Auto Save Indicator */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          <span className="text-green-600 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Auto-saved
          </span>
          <span className="text-muted-foreground">
            {answeredQuestions.size}/{questions.length} done
          </span>
        </div>
      </div>
    </motion.aside>
  );
};

export default InteractiveExamSidebar;
