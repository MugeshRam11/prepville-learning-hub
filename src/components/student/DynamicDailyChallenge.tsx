import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Zap, Trophy } from 'lucide-react';
import { DailyChallenge } from '@/hooks/useProgressTracking';

interface DynamicDailyChallengeProps {
  challenge: DailyChallenge | null;
  loading: boolean;
  onContinueChallenge: () => void;
}

const DynamicDailyChallenge: React.FC<DynamicDailyChallengeProps> = ({ 
  challenge, 
  loading, 
  onContinueChallenge 
}) => {
  if (loading) {
    return (
      <Card className="rounded-2xl shadow-md border-gray-100 animate-pulse">
        <CardHeader className="pb-4">
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-4 bg-gray-200 rounded mb-4"></div>
          <div className="h-3 bg-gray-200 rounded mb-3"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!challenge) {
    return null;
  }

  const progressPercentage = (challenge.current_count / challenge.target_count) * 100;

  return (
    <Card className="rounded-2xl shadow-md hover:shadow-xl transition-all bg-gradient-to-br from-[hsl(var(--adsavvy-pink))]/10 to-[hsl(var(--adsavvy-pink))]/5 border-[hsl(var(--adsavvy-pink))]/20 animate-fade-in">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl text-[hsl(var(--adsavvy-pink))]">
          <Zap className="w-6 h-6" />
          Daily Challenge
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-medium text-gray-700 mb-4">
          {challenge.challenge_type} to earn {challenge.xp_reward} XP!
        </p>

        <div className="relative mb-4">
          <Progress 
            value={progressPercentage} 
            className="h-4 bg-white/50" 
          />
          {progressPercentage === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-gray-400 font-medium">Not started</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-semibold text-[hsl(var(--adsavvy-pink))]">
            {challenge.current_count}/{challenge.target_count} completed
          </span>
          {challenge.is_completed && (
            <Trophy className="w-5 h-5 text-yellow-500 animate-bounce" />
          )}
        </div>

        <Button
          size="sm"
          onClick={onContinueChallenge}
          disabled={challenge.is_completed}
          className="w-full bg-gradient-to-r from-[hsl(var(--adsavvy-blue))] to-[hsl(var(--adsavvy-pink))] hover:opacity-90 transition-all shadow-md hover:shadow-lg rounded-xl font-semibold disabled:opacity-50"
        >
          {challenge.is_completed ? (
            <>
              <Trophy className="w-4 h-4 mr-2" />
              Challenge Complete! 🎉
            </>
          ) : (
            <>
              Continue Challenge
              <Zap className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default DynamicDailyChallenge;
