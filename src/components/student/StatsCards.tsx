import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, Target, BookOpen, TrendingUp } from 'lucide-react';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';

interface StatsCardsProps {
  currentStreak: number;
  weeklyCompleted: number;
  weeklyGoal: number;
  totalQuestions: number;
  correctAnswers: number;
}

const StatsCards = ({
  currentStreak,
  weeklyCompleted,
  weeklyGoal,
  totalQuestions,
  correctAnswers
}: StatsCardsProps) => {
  const animatedStreak = useAnimatedCounter({ end: currentStreak || 0, duration: 1200 });
  const animatedWeeklyCompleted = useAnimatedCounter({ end: weeklyCompleted || 0, duration: 1200 });
  const animatedTotalQuestions = useAnimatedCounter({ end: totalQuestions || 0, duration: 1500 });
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const animatedAccuracy = useAnimatedCounter({ end: accuracy, duration: 1500 });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in">
      <Card className="bg-gradient-to-br from-[hsl(var(--adsavvy-pink))]/10 to-[hsl(var(--adsavvy-pink))]/5 border-[hsl(var(--adsavvy-pink))]/20 hover:shadow-lg transition-all hover:scale-105 rounded-2xl">
        <CardContent className="p-6 text-center">
          <Flame className="w-10 h-10 text-[hsl(var(--adsavvy-pink))] mx-auto mb-3" />
          <div className="text-3xl font-bold text-gray-800">{Math.round(animatedStreak)}</div>
          <div className="text-sm font-medium text-gray-600 mt-1">Day Streak</div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-[hsl(var(--adsavvy-yellow))]/30 to-[hsl(var(--adsavvy-yellow))]/10 border-[hsl(var(--adsavvy-yellow))]/30 hover:shadow-lg transition-all hover:scale-105 rounded-2xl">
        <CardContent className="p-6 text-center">
          <Target className="w-10 h-10 text-yellow-600 mx-auto mb-3" />
          <div className="text-3xl font-bold text-gray-800">
            {Math.round(animatedWeeklyCompleted)}/{weeklyGoal}
          </div>
          <div className="text-sm font-medium text-gray-600 mt-1">Weekly Goal</div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-[hsl(var(--adsavvy-blue))]/10 to-[hsl(var(--adsavvy-blue))]/5 border-[hsl(var(--adsavvy-blue))]/20 hover:shadow-lg transition-all hover:scale-105 rounded-2xl">
        <CardContent className="p-6 text-center">
          <BookOpen className="w-10 h-10 text-[hsl(var(--adsavvy-blue))] mx-auto mb-3" />
          <div className="text-3xl font-bold text-gray-800">{Math.round(animatedTotalQuestions)}</div>
          <div className="text-sm font-medium text-gray-600 mt-1">Questions Solved</div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-100/50 to-purple-50 border-purple-200 hover:shadow-lg transition-all hover:scale-105 rounded-2xl">
        <CardContent className="p-6 text-center">
          <TrendingUp className="w-10 h-10 text-purple-600 mx-auto mb-3" />
          <div className="text-3xl font-bold text-gray-800">
            {Math.round(animatedAccuracy)}%
          </div>
          <div className="text-sm font-medium text-gray-600 mt-1">Accuracy</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsCards;
