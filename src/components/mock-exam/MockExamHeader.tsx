
import React from 'react';
import { Button } from '@/components/ui/button';
import { Maximize, Minimize, LogOut } from 'lucide-react';

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
  return (
    <header className="bg-white border-b shadow-sm px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SH</span>
          </div>
          <span className="font-bold text-gray-800">Study Hub</span>
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-medium">{subject}</span> - {topic}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleFullscreen}
          className="hidden md:flex items-center gap-2"
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
          className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Submit Test
        </Button>
      </div>
    </header>
  );
};

export default MockExamHeader;
