import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, ArrowLeft, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import prepVilleLogo from '@/assets/prep-ville-logo.svg';
import { cn } from '@/lib/utils';

interface InteractiveExamHeaderProps {
  title: string;
  subject: string;
  onSubmit: () => void;
  timeLimit: number; // in minutes
  progressPercentage: number;
  currentQuestion: number;
  totalQuestions: number;
}

const InteractiveExamHeader = ({ 
  title,
  subject,
  onSubmit,
  timeLimit,
  progressPercentage,
  currentQuestion,
  totalQuestions
}: InteractiveExamHeaderProps) => {
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState(timeLimit * 60);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

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

  const isLowTime = timeRemaining < 600;
  const isCriticalTime = timeRemaining < 120;

  const handleBackClick = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    setShowExitConfirm(false);
    navigate(-1);
  };

  return (
    <>
      <header className="bg-gradient-to-r from-[#1e88e5] via-[#42a5f5] to-[#64b5f6] shadow-lg">
        {/* Main Header Row */}
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Left - Back Button & Logo */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackClick}
              className="bg-white/20 hover:bg-white/30 text-white h-9 w-9 p-0 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1.5 shadow-sm">
                <img src={prepVilleLogo} alt="Prep Ville" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>

          {/* Center - Title */}
          <div className="flex-1 text-center">
            <h1 className="text-white font-bold text-lg">{title}</h1>
            <p className="text-white/80 text-xs">{subject}</p>
          </div>

          {/* Right - Timer & Submit */}
          <div className="flex items-center gap-3">
            {/* Timer */}
            <motion.div 
              className={cn(
                "flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2",
                isCriticalTime && "bg-red-500/30",
                isLowTime && !isCriticalTime && "bg-orange-500/20"
              )}
              animate={isCriticalTime ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <div className="relative w-6 h-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    fill="none"
                    stroke="white"
                    strokeOpacity="0.3"
                    strokeWidth="2"
                  />
                  <motion.circle
                    cx="12"
                    cy="12"
                    r="10"
                    fill="none"
                    stroke={isCriticalTime ? '#ef4444' : 'white'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={62.83}
                    animate={{ 
                      strokeDashoffset: 62.83 - ((timeRemaining / (timeLimit * 60)) * 62.83) 
                    }}
                  />
                </svg>
                <Clock className="w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" />
              </div>
              
              <span className={cn(
                "text-white font-mono font-bold text-sm",
                isCriticalTime && "animate-pulse text-red-200"
              )}>
                {formatTime(timeRemaining)}
              </span>
            </motion.div>

            {/* Submit Button */}
            <Button 
              onClick={() => setShowSubmitConfirm(true)}
              variant="outline"
              className="bg-white text-[#1e88e5] hover:bg-white/90 border-0 font-semibold shadow-sm"
            >
              Submit Test
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Progress 
              value={progressPercentage} 
              className="h-2 bg-white/20"
            />
            <div className="absolute right-0 -top-6 text-xs text-white/80">
              {progressPercentage.toFixed(0)}% answered
            </div>
          </div>
        </div>
      </header>

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
                You have answered {Math.round(progressPercentage)}% of the questions. Are you sure you want to submit?
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
                  className="flex-1 bg-gradient-to-r from-[#1e88e5] to-[#42a5f5] text-white"
                  onClick={() => {
                    setShowSubmitConfirm(false);
                    onSubmit();
                  }}
                >
                  Submit Now
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowExitConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card p-6 rounded-2xl shadow-2xl max-w-sm mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-foreground mb-2">Leave Test?</h3>
              <p className="text-muted-foreground mb-6">
                Your progress will be lost if you leave now. Are you sure?
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowExitConfirm(false)}
                >
                  Stay
                </Button>
                <Button 
                  variant="destructive"
                  className="flex-1"
                  onClick={confirmExit}
                >
                  Leave
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default InteractiveExamHeader;
