
import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flame, Calendar, Trophy, Zap, Target, Award, History } from 'lucide-react';
import { useStreakTracker } from '@/hooks/useStreakTracker';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const StreakTracker = () => {
  const { 
    streakData, 
    loading, 
    recordActivity, 
    getEncouragementMessage, 
    getStreakIntensity 
  } = useStreakTracker();

  // Generate calendar for the last 7 days with real data
  const generateWeekCalendar = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      const isActive = streakData.weeklyActivity[6 - i] || false;
      const isToday = i === 0;
      
      days.push({
        date: date.getDate(),
        dayName: date.toLocaleDateString('en', { weekday: 'short' }),
        isActive,
        isToday
      });
    }
    
    return days;
  };

  const handleBackfill = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('backfill-streak', {
        body: { 
          startDate: '2025-08-18',
          endDate: new Date().toISOString().split('T')[0]
        }
      });

      if (error) throw error;

      toast({
        title: "✅ Streak Backfilled Successfully!",
        description: `Added ${data.data.processedDays} days of streak data. Current streak: ${data.data.finalStreak} days!`,
        duration: 5000
      });

      // Refresh streak data after successful backfill
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Backfill error:', error);
      toast({
        title: "Error",
        description: "Failed to backfill streak data",
        variant: "destructive"
      });
    }
  };

  const weekDays = generateWeekCalendar();
  const intensity = getStreakIntensity();
  const encouragementMessage = getEncouragementMessage();

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-orange-200 rounded"></div>
            <div className="h-16 bg-orange-200 rounded"></div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-8 bg-orange-200 rounded-full"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-800">
            <Flame className={cn("w-6 h-6 transition-all duration-300", {
              "animate-pulse": intensity >= 3,
              "text-orange-600": intensity >= 4,
              "text-red-500": intensity >= 5
            })} />
            Streak Tracker
          </div>
          <Button 
            onClick={recordActivity}
            size="sm" 
            variant="outline"
            className="border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            Log Activity
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current Streak with Intensity */}
        <div className="text-center relative">
          <div className="relative inline-block">
            <div className={cn("text-4xl font-bold mb-2 transition-all duration-500", {
              "text-orange-500": intensity === 1,
              "text-orange-600": intensity === 2,
              "text-red-500": intensity === 3,
              "text-red-600": intensity === 4,
              "text-red-700 animate-bounce": intensity === 5
            })}>
              {streakData.currentStreak}
            </div>
            <div className="flex justify-center gap-1 mb-2">
              {Array.from({ length: Math.min(intensity, 5) }).map((_, i) => (
                <Flame key={i} className={cn("w-4 h-4", {
                  "text-orange-400": i < 2,
                  "text-orange-500": i >= 2 && i < 4,
                  "text-red-500 animate-pulse": i >= 4
                })} />
              ))}
            </div>
          </div>
          <div className="text-sm text-orange-700 font-medium">Days in a row</div>
        </div>

        {/* Week Calendar */}
        <div className="space-y-3">
          <div className="text-sm font-semibold text-orange-800 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            This Week
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, index) => (
              <div key={index} className="text-center">
                <div className="text-xs text-orange-600 mb-1 font-medium">{day.dayName}</div>
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 relative",
                  {
                    "bg-orange-500 text-white shadow-lg": day.isActive,
                    "bg-orange-100 text-orange-400": !day.isActive,
                    "ring-2 ring-orange-600 ring-offset-2": day.isToday,
                    "transform scale-110": day.isToday && day.isActive
                  }
                )}>
                  {day.isActive && <div className="absolute inset-0 bg-gradient-to-t from-orange-600 to-orange-400 rounded-full"></div>}
                  <span className="relative z-10">{day.date}</span>
                  {day.isActive && <Zap className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-orange-200">
          <div className="text-center p-3 bg-orange-100 rounded-lg">
            <Trophy className="w-5 h-5 text-orange-600 mx-auto mb-1" />
            <div className="text-lg font-bold text-orange-800">{streakData.bestStreak}</div>
            <div className="text-xs text-orange-600">Best Streak</div>
          </div>
          <div className="text-center p-3 bg-orange-100 rounded-lg">
            <Target className="w-5 h-5 text-orange-600 mx-auto mb-1" />
            <div className="text-lg font-bold text-orange-800">
              {7 - (streakData.currentStreak % 7) === 7 ? 0 : 7 - (streakData.currentStreak % 7)}
            </div>
            <div className="text-xs text-orange-600">Days to Goal</div>
          </div>
        </div>

        {/* Encouragement Message */}
        <div className="text-center p-4 bg-gradient-to-r from-orange-100 to-red-100 rounded-lg border border-orange-200">
          <div className="text-sm font-semibold text-orange-800 mb-1">
            {encouragementMessage}
          </div>
          {streakData.currentStreak >= 7 && (
            <div className="flex justify-center items-center gap-1 text-xs text-orange-600">
              <Award className="w-3 h-3" />
              <span>Week Goal Achieved!</span>
              <Award className="w-3 h-3" />
            </div>
          )}
        </div>


        {/* Next Milestone */}
        {streakData.currentStreak > 0 && (
          <div className="text-center p-3 bg-white/50 rounded-lg border border-orange-200">
            <div className="text-xs text-orange-600 mb-1">Next Milestone</div>
            <div className="text-sm font-semibold text-orange-800">
              {streakData.currentStreak < 7 ? '7 Days - Week Warrior 🔥' :
               streakData.currentStreak < 14 ? '14 Days - Two Week Champion ⚡' :
               streakData.currentStreak < 21 ? '21 Days - Three Week Master 🎯' :
               streakData.currentStreak < 30 ? '30 Days - Monthly Legend 🏆' :
               streakData.currentStreak < 60 ? '60 Days - Diamond Streaker 💎' :
               streakData.currentStreak < 100 ? '100 Days - Century Club 👑' :
               '365 Days - Year Legend 🌟'}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StreakTracker;
