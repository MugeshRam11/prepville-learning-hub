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
  Wifi,
  WifiOff
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
import { cn } from '@/lib/utils';

interface UnifiedExamHeaderProps {
  title: string;
  subject: string;
  duration: number;
  totalMarks: number;
  answeredCount: number;
  totalQuestions: number;
  totalParts?: number;
  answeredParts?: number;
  onSubmit: () => void;
  isConnected?: boolean;
}

const UnifiedExamHeader: React.FC<UnifiedExamHeaderProps> = ({
  title,
  subject,
  duration,
  totalMarks,
  answeredCount,
  totalQuestions,
  totalParts,
  answeredParts,
  onSubmit,
  isConnected
}) => {
  const [timeRemaining, setTimeRemaining] = useState(duration * 60);
  const [showTimeWarning, setShowTimeWarning] = useState(false);

  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1;
        if (newTime === 600 && !showTimeWarning) {
          setShowTimeWarning(true);
        }
        if (newTime <= 0) {
          onSubmit();
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, showTimeWarning, onSubmit]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerStyle = () => {
    if (timeRemaining <= 300) return {
      bg: 'bg-gradient-to-r from-red-500 to-rose-600',
      text: 'text-white',
      shadow: 'shadow-lg shadow-red-500/30',
    };
    if (timeRemaining <= 600) return {
      bg: 'bg-gradient-to-r from-amber-400 to-orange-500',
      text: 'text-white',
      shadow: 'shadow-lg shadow-amber-500/30',
    };
    return {
      bg: 'bg-gradient-to-r from-emerald-500 to-teal-500',
      text: 'text-white',
      shadow: 'shadow-md shadow-emerald-500/20',
    };
  };

  const timerStyle = getTimerStyle();
  const progressPercentage = (answeredCount / totalQuestions) * 100;

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 exam-glass border-b border-violet-500/10 shadow-sm shadow-violet-500/5"
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Icon + Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-violet-500/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-lg truncate">{title}</h1>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800">
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
                <span className="text-xs text-muted-foreground">
                  Q {answeredCount}/{totalQuestions}
                </span>
                {totalParts && totalParts !== totalQuestions && (
                  <span className="text-[10px] text-muted-foreground">
                    {answeredParts ?? answeredCount}/{totalParts} parts
                  </span>
                )}
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </div>

          {/* Right: Connection, Timer, Submit */}
          <div className="flex items-center gap-3">
            {isConnected !== undefined && (
              <div className="flex items-center gap-1">
                {isConnected ? (
                  <Wifi className="w-4 h-4 text-emerald-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
              </div>
            )}

            {/* Submit */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md shadow-violet-500/20 rounded-xl">
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Submit</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                      <AlertTriangle className="w-4 h-4 text-white" />
                    </div>
                    Submit Exam?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>Are you sure you want to submit your exam?</p>
                    <div className="bg-gradient-to-r from-slate-50 to-violet-50/50 dark:from-slate-900 dark:to-violet-950/30 p-4 rounded-xl space-y-2 border">
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
                      <p className="text-amber-600 dark:text-amber-400 text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        You have {totalQuestions - answeredCount} unanswered questions.
                      </p>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Continue Exam</AlertDialogCancel>
                  <AlertDialogAction onClick={onSubmit} className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 rounded-xl">
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
          className={cn(
            "border-t px-4 py-2",
            timeRemaining <= 300
              ? "bg-gradient-to-r from-red-50 to-rose-50 border-red-200 dark:from-red-950/30 dark:to-rose-950/30 dark:border-red-800"
              : "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 dark:from-amber-950/30 dark:to-orange-950/30 dark:border-amber-800"
          )}
        >
          <div className={cn(
            "flex items-center justify-center gap-2 text-sm font-medium",
            timeRemaining <= 300 ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
          )}>
            <Clock className="w-4 h-4" />
            <span>
              {timeRemaining <= 300 ? 'Less than 5 minutes remaining!' : '10 minutes remaining'}
            </span>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
};

export default UnifiedExamHeader;
