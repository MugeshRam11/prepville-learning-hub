
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, ArrowLeft } from 'lucide-react';

interface QuizHeaderProps {
  subject: string;
  timeLeft: number;
  onBack: () => void;
}

const QuizHeader = ({ subject, timeLeft, onBack }: QuizHeaderProps) => {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
      <div className="flex items-center space-x-4">
        <Badge variant="outline">{subject}</Badge>
        <div className="flex items-center text-muted-foreground">
          <Clock className="w-4 h-4 mr-1" />
          {formatTime(timeLeft)}
        </div>
      </div>
    </div>
  );
};

export default QuizHeader;
