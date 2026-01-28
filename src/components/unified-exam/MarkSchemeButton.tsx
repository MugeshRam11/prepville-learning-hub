import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExamMode } from '@/contexts/ExamModeContext';
import { cn } from '@/lib/utils';

interface MarkSchemeButtonProps {
  hasAttempted: boolean;
  onClick: () => void;
  className?: string;
}

const MarkSchemeButton: React.FC<MarkSchemeButtonProps> = ({
  hasAttempted,
  onClick,
  className,
}) => {
  const { canShowMarkScheme } = useExamMode();

  // Don't render in exam mode
  if (!canShowMarkScheme()) {
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
        disabled={!hasAttempted}
        className={cn(
          "gap-2 transition-all",
          hasAttempted && "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300"
        )}
      >
        <FileText className="w-4 h-4" />
        <span>Mark Scheme</span>
      </Button>
    </motion.div>
  );
};

export default MarkSchemeButton;
