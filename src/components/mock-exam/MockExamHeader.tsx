
import React from 'react';
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
}

const MockExamHeader = ({ 
  subject, 
  topic, 
  onSubmit, 
  onToggleFullscreen, 
  isFullscreen 
}: MockExamHeaderProps) => {
  const navigate = useNavigate();
  return (
    <header className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 shadow-lg px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg p-1.5">
            <img src={prepVilleLogo} alt="Prep Ville" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-bold text-white text-lg">The Prep Ville</span>
            <div className="flex items-center gap-2 text-blue-100 text-sm">
              <Trophy className="w-4 h-4" />
              <span className="font-medium">{subject}</span>
              <span>•</span>
              <span>{topic}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">Time: 02:15:30</span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleFullscreen}
          className="hidden md:flex items-center gap-2 bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30"
        >
          {isFullscreen ? (
            <>
              <Minimize className="w-4 h-4" />
              Exit Fullscreen
            </>
          ) : (
            <>
              <Maximize className="w-4 h-4" />
              Fullscreen
            </>
          )}
        </Button>
        
        <Button 
          onClick={onSubmit}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Submit Test
        </Button>
      </div>
    </header>
  );
};

export default MockExamHeader;
