import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Send, 
  AlertTriangle,
  BookOpen,
  Timer,
  Save,
  Cloud,
  CloudOff
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import ExamModeToggle from './ExamModeToggle';
import FocusModeToggle from './FocusModeToggle';
import { useExamMode } from '@/contexts/ExamModeContext';
import { cn } from '@/lib/utils';

interface UnifiedExamHeaderProps {
  title: string;
  subject: string;
  duration: number; // in minutes
  totalMarks: number;
  answeredCount: number;
  totalQuestions: number;
  onSubmit: () => void;
  hasStartedExam?: boolean;
}

const UnifiedExamHeader: React.FC<UnifiedExamHeaderProps> = ({
  title,
  subject,
  duration,
  totalMarks,
  answeredCount,
  totalQuestions,
  onSubmit,
  hasStartedExam = false
}) => {
  const { mode, config, autoSaveState, isTimerActive } = useExamMode();
  const [timeRemaining, setTimeRemaining] = useState(duration * 60); // seconds
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(!config.timerEnabled);

  // Sync timer pause state with mode
  useEffect(() => {
    setTimerPaused(!config.timerEnabled);
  }, [config.timerEnabled]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0 || timerPaused) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1;
        // Show warning when 10 minutes remaining
        if (newTime === 600 && !showTimeWarning) {
          setShowTimeWarning(true);
        }
        // Auto-submit when time runs out in exam mode
        if (newTime <= 0 && config.timerEnforced) {
          onSubmit();
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, showTimeWarning, timerPaused, config.timerEnforced, onSubmit]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColorClass = () => {
    if (timeRemaining <= 300) return 'text-red-600 bg-red-50'; // 5 min
    if (timeRemaining <= 600) return 'text-amber-600 bg-amber-50'; // 10 min
    return 'text-green-600 bg-green-50';
  };

  const progressPercentage = (answeredCount / totalQuestions) * 100;

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b shadow-sm"
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Title and subject */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-lg truncate">{title}</h1>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {subject}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {totalMarks} marks
                </span>
              </div>
            </div>
          </div>

          {/* Center: Progress */}
          <div className="hidden md:flex items-center gap-4 flex-1 max-w-md">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Progress</span>
                <span className="text-xs font-medium">{answeredCount}/{totalQuestions}</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </div>

          {/* Right: Mode Toggle, Timer and Submit */}
          <div className="flex items-center gap-3">
            {/* Exam Mode Toggle */}
            <ExamModeToggle hasStartedExam={hasStartedExam} />

            {/* Focus Mode (only in exam mode) */}
            <FocusModeToggle />

            {/* Auto-save indicator */}
            {config.autoSaveEnabled && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {autoSaveState.isSaving ? (
                  <>
                    <Save className="w-3.5 h-3.5 animate-pulse" />
                    <span>Saving...</span>
                  </>
                ) : autoSaveState.lastSaved ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-green-500" />
                    <span>Saved</span>
                  </>
                ) : autoSaveState.error ? (
                  <>
                    <CloudOff className="w-3.5 h-3.5 text-destructive" />
                    <span>Error</span>
                  </>
                ) : null}
              </div>
            )}

            {/* Timer */}
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
              getTimeColorClass(),
              timerPaused && "opacity-50"
            )}>
              <Timer className="w-5 h-5" />
              <span className="font-mono font-bold text-lg">
                {formatTime(timeRemaining)}
              </span>
              {timerPaused && (
                <span className="text-xs">(Paused)</span>
              )}
            </div>

            {/* Submit button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="gap-2">
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Submit</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Submit Exam?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>Are you sure you want to submit your exam?</p>
                    <div className="bg-muted p-3 rounded-lg space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">Questions answered:</span>{' '}
                        {answeredCount} of {totalQuestions}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Time remaining:</span>{' '}
                        {formatTime(timeRemaining)}
                      </p>
                    </div>
                    {answeredCount < totalQuestions && (
                      <p className="text-amber-600 text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        You have {totalQuestions - answeredCount} unanswered questions.
                      </p>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Continue Exam</AlertDialogCancel>
                  <AlertDialogAction onClick={onSubmit}>
                    Submit Exam
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Time warning banner */}
      {showTimeWarning && timeRemaining <= 600 && timeRemaining > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="bg-amber-50 border-t border-amber-200 px-4 py-2"
        >
          <div className="flex items-center justify-center gap-2 text-amber-700 text-sm">
            <Clock className="w-4 h-4" />
            <span className="font-medium">
              {timeRemaining <= 300 ? 'Less than 5 minutes remaining!' : '10 minutes remaining'}
            </span>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
};

export default UnifiedExamHeader;
