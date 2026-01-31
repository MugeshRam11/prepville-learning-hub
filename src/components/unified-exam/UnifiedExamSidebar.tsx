import React from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, ChevronRight, Wifi, WifiOff, Cloud } from 'lucide-react';
import { UnifiedQuestion, UnifiedAnswer } from '@/types/answerBlock';

interface UnifiedExamSidebarProps {
  questions: UnifiedQuestion[];
  answers: UnifiedAnswer[];
  activeQuestionId: string | null;
  activeSubQuestionId: string | null;
  onNavigate: (questionId: string, subQuestionId?: string) => void;
  isConnected?: boolean;
  lastSynced?: Date | null;
}

const UnifiedExamSidebar: React.FC<UnifiedExamSidebarProps> = ({
  questions,
  answers,
  activeQuestionId,
  activeSubQuestionId,
  onNavigate,
  isConnected,
  lastSynced
}) => {
  // Calculate progress
  const getTotalAnswerSlots = () => {
    return questions.reduce((total, q) => {
      if (q.subQuestions && q.subQuestions.length > 0) {
        return total + q.subQuestions.length;
      }
      return total + 1;
    }, 0);
  };

  const getAnsweredCount = () => {
    return answers.filter(a => {
      const content = a.content;
      if (typeof content === 'string') return content.trim().length > 0;
      if (typeof content === 'object') return Object.keys(content).length > 0;
      return false;
    }).length;
  };

  const isAnswered = (questionId: string, subQuestionId?: string) => {
    const answer = answers.find(
      a => a.questionId === questionId && a.subQuestionId === subQuestionId
    );
    if (!answer) return false;
    const content = answer.content;
    if (typeof content === 'string') return content.trim().length > 0;
    if (typeof content === 'object') return Object.keys(content).length > 0;
    return false;
  };

  const isActive = (questionId: string, subQuestionId?: string) => {
    if (subQuestionId) {
      return activeQuestionId === questionId && activeSubQuestionId === subQuestionId;
    }
    return activeQuestionId === questionId && !activeSubQuestionId;
  };

  const totalSlots = getTotalAnswerSlots();
  const answeredCount = getAnsweredCount();
  const progressPercentage = totalSlots > 0 ? (answeredCount / totalSlots) * 100 : 0;

  return (
    <motion.aside
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-72 border-l bg-card hidden lg:flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Question Navigator</h3>
          <Badge variant="secondary" className="text-xs">
            {answeredCount}/{totalSlots}
          </Badge>
        </div>
        <Progress value={progressPercentage} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {Math.round(progressPercentage)}% complete
        </p>
      </div>

      {/* Question list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {questions.map((question) => {
            const hasSubQuestions = question.subQuestions && question.subQuestions.length > 0;

            return (
              <div key={question.id} className="space-y-1">
                {/* Main question button */}
                <button
                  onClick={() => onNavigate(question.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                    isActive(question.id) && !hasSubQuestions
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'hover:bg-muted border-2 border-transparent'
                  }`}
                >
                  {/* Status icon */}
                  {!hasSubQuestions && (
                    isAnswered(question.id) ? (
                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                    )
                  )}

                  {/* Question number */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive(question.id) && !hasSubQuestions
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}>
                    <span className="font-bold text-sm">{question.questionNumber}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      Question {question.questionNumber}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {question.marks} marks
                      {hasSubQuestions && ` • ${question.subQuestions!.length} parts`}
                    </div>
                  </div>

                  {hasSubQuestions && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {/* Sub-questions */}
                {hasSubQuestions && (
                  <div className="ml-6 space-y-1">
                    {question.subQuestions!.map((subQ) => (
                      <button
                        key={subQ.id}
                        onClick={() => onNavigate(question.id, subQ.id)}
                        className={`w-full flex items-center gap-2 p-2 rounded-md text-left transition-all ${
                          isActive(question.id, subQ.id)
                            ? 'bg-primary/10 border-2 border-primary'
                            : 'hover:bg-muted border-2 border-transparent'
                        }`}
                      >
                        {/* Status icon */}
                        {isAnswered(question.id, subQ.id) ? (
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}

                        {/* Label */}
                        <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-medium ${
                          isActive(question.id, subQ.id)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}>
                          {subQ.label}
                        </span>

                        {/* Marks */}
                        <span className="text-xs text-muted-foreground">
                          {subQ.marks} {subQ.marks === 1 ? 'mark' : 'marks'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            {isConnected !== undefined && (
              isConnected ? (
                <Wifi className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-red-500" />
              )
            )}
            <Cloud className="w-3.5 h-3.5" />
            <span>Auto-saved</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {answeredCount} answered
          </Badge>
        </div>
      </div>
    </motion.aside>
  );
};

export default UnifiedExamSidebar;
