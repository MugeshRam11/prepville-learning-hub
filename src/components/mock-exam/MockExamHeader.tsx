
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize, Minimize, LogOut, Clock, Trophy, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import prepVilleLogo from '@/assets/prep-ville-logo.svg';

interface MockExamHeaderProps {
  subject: string;
  topic: string;
  onSubmit: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  timeLimit?: number; // in minutes
}

const MockExamHeader = ({ 
  subject, 
  topic, 
  onSubmit, 
  onToggleFullscreen, 
  isFullscreen,
  timeLimit = 135 // default 2h 15min (135 minutes)
}: MockExamHeaderProps) => {
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState(timeLimit * 60); // convert to seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onSubmit(); // Auto-submit when time runs out
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

  const timeColor = timeRemaining < 600 ? 'text-red-200' : 'text-white'; // Red when < 10 minutes

  return (
    <header className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 shadow-lg px-3 sm:px-4 md:px-6 py-3 md:py-4 flex items-center justify-between flex-wrap gap-3 md:gap-0">
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
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
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg p-1 sm:p-1.5">
            <img src={prepVilleLogo} alt="Prep Ville" className="w-full h-full object-contain" />
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-white text-sm sm:text-base md:text-lg">The Prep Ville</span>
            <div className="hidden md:flex items-center gap-2 text-blue-100 text-xs sm:text-sm">
              <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-medium">{subject}</span>
              <span>•</span>
              <span>{topic}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <div className={`flex items-center gap-1 sm:gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 ${timeColor}`}>
          <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm font-medium">{formatTime(timeRemaining)}</span>
        </div>
        
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
        
        <Button 
          onClick={onSubmit}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg flex items-center gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-4 text-xs sm:text-sm"
        >
          <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Submit Test</span>
          <span className="sm:hidden">Submit</span>
        </Button>
      </div>
    </header>
  );
};

export default MockExamHeader;
