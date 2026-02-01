import React from 'react';
import { CheckCircle2, Circle, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PracticeQuestionStatus = 'solved' | 'attempted' | 'unsolved';

interface PracticeStatusBadgeProps {
  status: PracticeQuestionStatus;
  className?: string;
}

const PracticeStatusBadge: React.FC<PracticeStatusBadgeProps> = ({ status, className }) => {
  switch (status) {
    case 'solved':
      return (
        <div className={cn("flex items-center gap-1.5 text-green-600", className)}>
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Solved</span>
        </div>
      );
    case 'attempted':
      return (
        <div className={cn("flex items-center gap-1.5 text-amber-500", className)}>
          <CircleDot className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Attempted</span>
        </div>
      );
    case 'unsolved':
    default:
      return (
        <div className={cn("flex items-center gap-1.5 text-muted-foreground", className)}>
          <Circle className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Unsolved</span>
        </div>
      );
  }
};

export default PracticeStatusBadge;
