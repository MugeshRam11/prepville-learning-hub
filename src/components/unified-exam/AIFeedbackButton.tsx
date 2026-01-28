import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExamMode } from '@/contexts/ExamModeContext';
import { cn } from '@/lib/utils';

interface AIFeedbackButtonProps {
  questionId: string;
  subQuestionId?: string;
  hasAnswer: boolean;
  isLoading?: boolean;
  onClick: () => void;
  className?: string;
}

const AIFeedbackButton: React.FC<AIFeedbackButtonProps> = ({
  questionId,
  subQuestionId,
  hasAnswer,
  isLoading = false,
  onClick,
  className,
}) => {
  const { canShowFeedback } = useExamMode();

  // Don't render in exam mode
  if (!canShowFeedback()) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("inline-flex", className)}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={onClick}
        disabled={!hasAnswer || isLoading}
        className={cn(
          "gap-2 transition-all",
          hasAnswer && !isLoading && "border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-800 dark:border-purple-800 dark:bg-purple-950/30 dark:hover:bg-purple-900/50 dark:text-purple-300"
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Analyzing...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>AI Feedback</span>
          </>
        )}
      </Button>
    </motion.div>
  );
};

export default AIFeedbackButton;
