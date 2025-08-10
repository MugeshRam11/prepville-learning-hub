import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Zap, CheckCircle } from 'lucide-react';
import { useStreakTracker } from '@/hooks/useStreakTracker';
import { cn } from '@/lib/utils';

interface StreakActivityButtonProps {
  activityType?: string;
  className?: string;
  children?: React.ReactNode;
}

const StreakActivityButton = ({ 
  activityType = 'general', 
  className,
  children 
}: StreakActivityButtonProps) => {
  const { recordActivity, streakData } = useStreakTracker();
  const [isLoading, setIsLoading] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const handleActivity = async () => {
    if (isLoading || justCompleted) return;
    
    setIsLoading(true);
    try {
      await recordActivity();
      setJustCompleted(true);
      
      // Reset the completed state after animation
      setTimeout(() => setJustCompleted(false), 2000);
    } catch (error) {
      console.error('Failed to record activity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user has already completed activity today
  const today = new Date().toISOString().split('T')[0];
  const hasCompletedToday = streakData.lastActivityDate === today;

  return (
    <Button
      onClick={handleActivity}
      disabled={isLoading || hasCompletedToday}
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        {
          "bg-green-500 hover:bg-green-600": justCompleted,
          "bg-orange-500 hover:bg-orange-600": !justCompleted && !hasCompletedToday,
          "bg-gray-400": hasCompletedToday && !justCompleted
        },
        className
      )}
    >
      <div className={cn(
        "flex items-center gap-2 transition-transform duration-300",
        justCompleted && "scale-110"
      )}>
        {justCompleted ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          <Zap className={cn("w-4 h-4", isLoading && "animate-spin")} />
        )}
        
        {children || (
          <span>
            {justCompleted ? "Completed!" : 
             hasCompletedToday ? "Done Today" : 
             "Record Activity"}
          </span>
        )}
      </div>

      {/* Success animation overlay */}
      {justCompleted && (
        <div className="absolute inset-0 bg-green-400 animate-pulse opacity-30 rounded-md" />
      )}
    </Button>
  );
};

export default StreakActivityButton;