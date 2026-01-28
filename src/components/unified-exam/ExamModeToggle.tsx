import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Timer, AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useExamMode } from '@/contexts/ExamModeContext';
import { cn } from '@/lib/utils';

interface ExamModeToggleProps {
  hasStartedExam?: boolean;
  className?: string;
}

const ExamModeToggle: React.FC<ExamModeToggleProps> = ({ 
  hasStartedExam = false,
  className 
}) => {
  const { mode, toggleMode } = useExamMode();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingMode, setPendingMode] = useState<'study' | 'examination' | null>(null);

  const isExamMode = mode === 'examination';

  const handleToggleClick = () => {
    // If exam has started and we're switching from exam to study, show warning
    if (hasStartedExam && isExamMode) {
      setPendingMode('study');
      setShowConfirmDialog(true);
      return;
    }
    
    // If switching to exam mode, show confirmation
    if (!isExamMode && hasStartedExam) {
      setPendingMode('examination');
      setShowConfirmDialog(true);
      return;
    }

    toggleMode();
  };

  const handleConfirmSwitch = () => {
    toggleMode();
    setShowConfirmDialog(false);
    setPendingMode(null);
  };

  return (
    <>
      <motion.div 
        className={cn(
          "flex items-center gap-3 px-4 py-2 rounded-xl border transition-all",
          isExamMode 
            ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800" 
            : "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
          className
        )}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Study Mode Icon */}
        <div className={cn(
          "flex items-center gap-1.5 transition-opacity",
          isExamMode ? "opacity-50" : "opacity-100"
        )}>
          <BookOpen className={cn(
            "w-4 h-4",
            isExamMode ? "text-muted-foreground" : "text-blue-600"
          )} />
          <span className={cn(
            "text-sm font-medium",
            isExamMode ? "text-muted-foreground" : "text-blue-700 dark:text-blue-300"
          )}>
            Study
          </span>
        </div>

        {/* Toggle Switch */}
        <Switch
          checked={isExamMode}
          onCheckedChange={handleToggleClick}
          className="data-[state=checked]:bg-amber-500"
        />

        {/* Exam Mode Icon */}
        <div className={cn(
          "flex items-center gap-1.5 transition-opacity",
          !isExamMode ? "opacity-50" : "opacity-100"
        )}>
          <Timer className={cn(
            "w-4 h-4",
            !isExamMode ? "text-muted-foreground" : "text-amber-600"
          )} />
          <span className={cn(
            "text-sm font-medium",
            !isExamMode ? "text-muted-foreground" : "text-amber-700 dark:text-amber-300"
          )}>
            Exam
          </span>
        </div>

        {/* Mode Badge */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs font-medium",
                isExamMode 
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" 
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
              )}
            >
              {isExamMode ? "Timed" : "Practice"}
            </Badge>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Switch to {pendingMode === 'study' ? 'Study' : 'Examination'} Mode?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {pendingMode === 'study' ? (
                <>
                  <p>Switching to Study Mode will:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Pause the timer</li>
                    <li>Enable AI Feedback and Mark Schemes</li>
                    <li>Allow you to see hints</li>
                  </ul>
                  <p className="text-amber-600 text-sm font-medium">
                    Your progress will be preserved.
                  </p>
                </>
              ) : (
                <>
                  <p>Switching to Examination Mode will:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Start/resume the timer</li>
                    <li>Hide AI Feedback and Mark Schemes</li>
                    <li>Enable auto-save every 5 seconds</li>
                    <li>Lock feedback until submission</li>
                  </ul>
                  <p className="text-amber-600 text-sm font-medium">
                    This simulates a real exam environment.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSwitch}>
              Switch Mode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ExamModeToggle;
