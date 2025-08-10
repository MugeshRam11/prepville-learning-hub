import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastActivityDate: string | null;
  streakStartDate: string | null;
  weeklyActivity: boolean[];
}

interface MilestoneReward {
  milestone: number;
  reward_xp: number;
  message: string;
}

export const useStreakTracker = () => {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    bestStreak: 0,
    lastActivityDate: null,
    streakStartDate: null,
    weeklyActivity: []
  });
  const [loading, setLoading] = useState(true);

  // Generate weekly activity calendar (last 7 days)
  const generateWeeklyActivity = (streaks: any[]) => {
    const today = new Date();
    const weekActivity = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      // Check if user had activity on this date
      const hasActivity = streaks.some(streak => 
        streak.date === dateString || streak.last_activity_date === dateString
      );
      
      weekActivity.push(hasActivity);
    }
    
    return weekActivity;
  };

  const fetchStreakData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch current streak data
      const { data: streaks, error } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(7);

      if (error) throw error;

      if (streaks && streaks.length > 0) {
        const latest = streaks[0];
        const weeklyActivity = generateWeeklyActivity(streaks);
        
        setStreakData({
          currentStreak: latest.current_streak || 0,
          bestStreak: latest.best_streak || 0,
          lastActivityDate: latest.last_activity_date,
          streakStartDate: latest.streak_start_date,
          weeklyActivity
        });
      } else {
        // No streak data found, set default values
        setStreakData({
          currentStreak: 0,
          bestStreak: 0,
          lastActivityDate: null,
          streakStartDate: null,
          weeklyActivity: [false, false, false, false, false, false, false]
        });
      }
    } catch (error) {
      console.error('Error fetching streak data:', error);
      toast({
        title: "Error",
        description: "Failed to load streak data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const recordActivity = async () => {
    if (!user) return;

    try {
      // Call the update_user_streak function
      const { data, error } = await supabase.rpc('update_user_streak', {
        user_uuid: user.id
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const { current_streak, best_streak, is_new_best } = data[0];
        
        // Update local state
        setStreakData(prev => ({
          ...prev,
          currentStreak: current_streak,
          bestStreak: best_streak,
          lastActivityDate: new Date().toISOString().split('T')[0]
        }));

        // Check for milestone rewards
        const { data: milestones, error: milestoneError } = await supabase.rpc('check_streak_milestones', {
          user_uuid: user.id,
          streak_days: current_streak
        });

        if (!milestoneError && milestones && milestones.length > 0) {
          // Show milestone rewards
          milestones.forEach((milestone: MilestoneReward) => {
            toast({
              title: "🎉 Streak Milestone!",
              description: `${milestone.message} +${milestone.reward_xp} XP!`,
              duration: 5000
            });
          });
        }

        // Show encouragement for new best
        if (is_new_best) {
          toast({
            title: "🔥 New Personal Best!",
            description: `${current_streak} days streak - You're unstoppable!`,
            duration: 4000
          });
        }

        // Refresh data to get updated weekly view
        await fetchStreakData();
      }
    } catch (error) {
      console.error('Error recording activity:', error);
      toast({
        title: "Error",
        description: "Failed to record activity",
        variant: "destructive"
      });
    }
  };

  const getEncouragementMessage = () => {
    const { currentStreak } = streakData;
    
    if (currentStreak === 0) return "Start your learning journey today! 🚀";
    if (currentStreak === 1) return "Great start! Keep the momentum going! 💪";
    if (currentStreak < 7) return "🔥 You're building a habit! Keep going!";
    if (currentStreak < 14) return "⚡ Impressive streak! You're on fire!";
    if (currentStreak < 30) return "🎯 Unstoppable! Don't break the chain!";
    if (currentStreak < 100) return "🏆 Legendary dedication! Amazing work!";
    return "👑 Master level achieved! You're inspiring!";
  };

  const getStreakIntensity = () => {
    const { currentStreak } = streakData;
    if (currentStreak < 3) return 1;
    if (currentStreak < 7) return 2;
    if (currentStreak < 14) return 3;
    if (currentStreak < 30) return 4;
    return 5;
  };

  useEffect(() => {
    fetchStreakData();
  }, [user]);

  return {
    streakData,
    loading,
    recordActivity,
    getEncouragementMessage,
    getStreakIntensity,
    refreshStreakData: fetchStreakData
  };
};