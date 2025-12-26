import React, { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Flag, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface MockExamSidebarProps {
  questions: any[];
  currentQuestionIndex: number;
  currentSubQuestionIndex: number | null;
  answeredQuestions: Set<string>;
  flaggedQuestions?: Set<string>;
  onQuestionSelect: (questionIndex: number, subQuestionIndex?: number) => void;
  focusMode?: boolean;
}

const MockExamSidebar = ({
  questions,
  currentQuestionIndex,
  currentSubQuestionIndex,
  answeredQuestions,
  flaggedQuestions = new Set(),
  onQuestionSelect,
  focusMode = false
}: MockExamSidebarProps) => {
  const activeQuestionRef = useRef<HTMLDivElement>(null);

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
    
    if (flaggedQuestions.has(key)) return 'flagged';
    return answeredQuestions.has(key) ? 'answered' : 'unanswered';
  };

  const progressPercentage = questions.length > 0 
    ? Math.round((answeredQuestions.size / questions.reduce((acc, q) => 
        acc + 1 + (q.subQuestions?.length || 0), 0)) * 100)
    : 0;

  // Hide sidebar in focus mode
  if (focusMode) return null;

  return (
    <motion.aside 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-full lg:w-72 xl:w-80 bg-gradient-to-b from-card to-muted/30 border-r border-border flex flex-col h-full"
    >
      {/* Header with game-like progress */}
      <div className="p-4 border-b border-border space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Question Map
          </h2>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {progressPercentage}%
          </Badge>
        </div>
        
        {/* Progress bar with animation */}
        <div className="space-y-1">
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {answeredQuestions.size} / {questions.reduce((acc, q) => acc + 1 + (q.subQuestions?.length || 0), 0)} Questions Completed
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Done</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Current</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-muted border border-border" />
            <span className="text-muted-foreground">Pending</span>
          </div>
        </div>
      </div>

      {/* Question tiles - Game map style */}
      <ScrollArea className="flex-1 px-3">
        <div className="py-4 space-y-3">
          {questions.map((question, questionIndex) => {
            const mainQuestionStatus = getQuestionStatus(questionIndex);
            const isMainActive = currentQuestionIndex === questionIndex && currentSubQuestionIndex === null;

            return (
              <div 
                key={question.id} 
                className="space-y-2"
                ref={isMainActive && currentSubQuestionIndex === null ? activeQuestionRef : null}
              >
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: questionIndex * 0.05 }}
                >
                {/* Main Question Tile */}
                <motion.button
                  onClick={() => onQuestionSelect(questionIndex)}
                  className={cn(
                    "w-full p-3 rounded-xl border-2 transition-all duration-200 text-left",
                    "hover:shadow-md hover:scale-[1.02]",
                    isMainActive && "border-primary bg-primary/10 shadow-lg shadow-primary/20",
                    mainQuestionStatus === 'answered' && !isMainActive && "border-green-400 bg-green-50 dark:bg-green-950/30",
                    mainQuestionStatus === 'flagged' && !isMainActive && "border-amber-400 bg-amber-50 dark:bg-amber-950/30",
                    mainQuestionStatus === 'unanswered' && !isMainActive && "border-border bg-card hover:border-primary/50"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Status indicator */}
                      <motion.div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                          isMainActive && "bg-primary text-primary-foreground",
                          mainQuestionStatus === 'answered' && !isMainActive && "bg-green-500 text-white",
                          mainQuestionStatus === 'flagged' && !isMainActive && "bg-amber-500 text-white",
                          mainQuestionStatus === 'unanswered' && !isMainActive && "bg-muted text-muted-foreground"
                        )}
                        animate={isMainActive ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        {mainQuestionStatus === 'answered' && !isMainActive ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : mainQuestionStatus === 'flagged' ? (
                          <Flag className="w-4 h-4" />
                        ) : (
                          questionIndex + 1
                        )}
                      </motion.div>
                      <div>
                        <span className={cn(
                          "font-medium text-sm",
                          isMainActive ? "text-primary" : "text-foreground"
                        )}>
                          Question {questionIndex + 1}
                        </span>
                        {question.subQuestions?.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {question.subQuestions.length} parts
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge 
                      variant="outline"
                      className={cn(
                        "text-xs",
                        isMainActive && "border-primary text-primary"
                      )}
                    >
                      {question.marks}m
                    </Badge>
                  </div>
                </motion.button>

                {/* Sub-questions */}
                <AnimatePresence>
                  {question.subQuestions && question.subQuestions.map((subQuestion: any, subIndex: number) => {
                    const subQuestionStatus = getQuestionStatus(questionIndex, subIndex);
                    const isSubActive = currentQuestionIndex === questionIndex && currentSubQuestionIndex === subIndex;

                    return (
                      <motion.button
                        key={subQuestion.id}
                        ref={isSubActive ? activeQuestionRef : null}
                        onClick={() => onQuestionSelect(questionIndex, subIndex)}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className={cn(
                          "w-full ml-4 p-2.5 rounded-lg border transition-all duration-200 text-left flex items-center justify-between",
                          "hover:shadow-sm hover:scale-[1.01]",
                          isSubActive && "border-primary bg-primary/10",
                          subQuestionStatus === 'answered' && !isSubActive && "border-green-300 bg-green-50/50 dark:bg-green-950/20",
                          subQuestionStatus === 'unanswered' && !isSubActive && "border-border bg-card/50"
                        )}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn(
                            "w-6 h-6 rounded-md flex items-center justify-center text-xs font-medium",
                            isSubActive && "bg-primary text-primary-foreground",
                            subQuestionStatus === 'answered' && !isSubActive && "bg-green-500 text-white",
                            subQuestionStatus === 'unanswered' && !isSubActive && "bg-muted text-muted-foreground"
                          )}>
                            {subQuestionStatus === 'answered' && !isSubActive ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              subQuestion.label || String.fromCharCode(97 + subIndex)
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground truncate">
                            Part {subQuestion.label || String.fromCharCode(97 + subIndex)}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] h-5">
                          {subQuestion.marks}m
                        </Badge>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer Stats */}
      <div className="p-3 border-t border-border">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-green-500/10 text-center">
            <p className="text-lg font-bold text-green-600">{answeredQuestions.size}</p>
            <p className="text-[10px] text-green-700/70">Answered</p>
          </div>
          <div className="p-2 rounded-lg bg-muted text-center">
            <p className="text-lg font-bold text-muted-foreground">
              {questions.reduce((acc, q) => acc + 1 + (q.subQuestions?.length || 0), 0) - answeredQuestions.size}
            </p>
            <p className="text-[10px] text-muted-foreground">Remaining</p>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};

export default MockExamSidebar;
