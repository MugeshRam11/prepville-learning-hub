import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize, Minimize, LogOut, Clock, Trophy, ArrowLeft, Focus, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import prepVilleLogo from '@/assets/prep-ville-logo.svg';
import { cn } from '@/lib/utils';

interface MockExamHeaderProps {
  subject: string;
  topic: string;
  onSubmit: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  timeLimit?: number;
  onFocusModeToggle?: (enabled: boolean) => void;
  focusMode?: boolean;
}

const MockExamHeader = ({ 
  subject, 
  topic, 
  onSubmit, 
  onToggleFullscreen, 
  isFullscreen,
  timeLimit = 135,
  onFocusModeToggle,
  focusMode = false
}: MockExamHeaderProps) => {
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState(timeLimit * 60);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onSubmit]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeRemaining < 600; // Less than 10 minutes
  const isCriticalTime = timeRemaining < 120; // Less than 2 minutes
  const timePercentage = (timeRemaining / (timeLimit * 60)) * 100;

  const handleSubmitClick = () => {
    setShowSubmitConfirm(true);
  };

  const confirmSubmit = () => {
    setShowSubmitConfirm(false);
    onSubmit();
  };

  return (
    <>
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative overflow-hidden shadow-lg px-3 sm:px-4 md:px-6 py-3 md:py-4 flex items-center justify-between flex-wrap gap-3 md:gap-0"
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-accent animate-gradient-x" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        
        {/* Content */}
        <div className="relative flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30 h-8 sm:h-9 px-2 sm:px-3"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.div 
              className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg p-1 sm:p-1.5"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <img src={prepVilleLogo} alt="Prep Ville" className="w-full h-full object-contain" />
            </motion.div>
            <div className="hidden sm:block">
              <span className="font-bold text-white text-sm sm:text-base md:text-lg">The Prep Ville</span>
              <div className="hidden md:flex items-center gap-2 text-white/80 text-xs sm:text-sm">
                <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="font-medium">{subject}</span>
                <span>•</span>
                <span>{topic}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Timer Section - Center */}
        <motion.div 
          className={cn(
            "relative flex items-center gap-2 sm:gap-3 bg-white/20 backdrop-blur-sm rounded-xl px-3 sm:px-4 py-2 z-10",
            isCriticalTime && "bg-red-500/30",
            isLowTime && !isCriticalTime && "bg-orange-500/20"
          )}
          animate={isCriticalTime ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {/* Timer progress ring */}
          <div className="relative w-10 h-10 hidden sm:block">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="white"
                strokeOpacity="0.2"
                strokeWidth="3"
              />
              <motion.circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke={isCriticalTime ? '#ef4444' : isLowTime ? '#f97316' : 'white'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={100.53}
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: 100.53 - (timePercentage / 100) * 100.53 }}
                transition={{ duration: 0.5 }}
              />
            </svg>
            <Clock className={cn(
              "w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
              isCriticalTime ? "text-red-200" : "text-white"
            )} />
          </div>
          
          <div className="text-center">
            <motion.span 
              className={cn(
                "text-lg sm:text-xl font-bold font-mono",
                isCriticalTime ? "text-red-200" : isLowTime ? "text-orange-200" : "text-white"
              )}
              animate={isCriticalTime ? { opacity: [1, 0.5, 1] } : {}}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              {formatTime(timeRemaining)}
            </motion.span>
            <p className="text-[10px] text-white/60 hidden sm:block">Time Remaining</p>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="relative flex items-center gap-2 sm:gap-3 flex-shrink-0 z-10">
          {/* Focus Mode Toggle */}
          {onFocusModeToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFocusModeToggle(!focusMode)}
              className={cn(
                "bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 h-8 sm:h-9 px-2 sm:px-3",
                focusMode && "bg-white/40"
              )}
            >
              {focusMode ? (
                <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" />
              ) : (
                <Focus className="w-3 h-3 sm:w-4 sm:h-4" />
              )}
              <span className="hidden xl:inline ml-2">{focusMode ? 'Exit Focus' : 'Focus Mode'}</span>
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleFullscreen}
            className="hidden lg:flex items-center gap-2 bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xl:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xl:inline">Fullscreen</span>
              </>
            )}
          </Button>
          
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={handleSubmitClick}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg flex items-center gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-4 text-xs sm:text-sm"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Submit Test</span>
              <span className="sm:hidden">Submit</span>
            </Button>
          </motion.div>
        </div>
      </motion.header>

      {/* Submit Confirmation Modal */}
      <AnimatePresence>
        {showSubmitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSubmitConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card p-6 rounded-2xl shadow-2xl max-w-sm mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-foreground mb-2">Submit Test?</h3>
              <p className="text-muted-foreground mb-6">
                Are you sure you want to submit? You won't be able to change your answers after submission.
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowSubmitConfirm(false)}
                >
                  Continue Test
                </Button>
                <Button 
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
                  onClick={confirmSubmit}
                >
                  Submit Now
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MockExamHeader;
