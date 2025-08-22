import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface XPData {
  total_xp: number;
  current_level: number;
  xp_to_next_level: number;
  level_title: string;
  level_benefits: string[];
}

export interface XPActivity {
  id: string;
  activity_type: string;
  xp_gained: number;
  description?: string;
  activity_date: string;
  activity_data?: any;
}

export const useXPSystem = () => {
  const { user } = useAuth();
  const [xpData, setXpData] = useState<XPData | null>(null);
  const [recentActivities, setRecentActivities] = useState<XPActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchXPData = useCallback(async () => {
    if (!user) return;

    try {
      // Get user level info
      const { data: levelData, error: levelError } = await supabase
        .rpc('get_user_level_info', { user_uuid: user.id });

      if (levelError) throw levelError;

      if (levelData && levelData.length > 0) {
        setXpData(levelData[0]);
      } else {
        // Initialize user with 0 XP if no data exists
        setXpData({
          total_xp: 0,
          current_level: 1,
          xp_to_next_level: 100,
          level_title: 'New Explorer',
          level_benefits: ['Basic features', 'Getting started bonus']
        });
      }

      // Get recent XP activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('xp_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('activity_date', { ascending: false })
        .limit(10);

      if (activitiesError) throw activitiesError;

      setRecentActivities(activitiesData || []);
    } catch (error) {
      console.error('Error fetching XP data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addXP = useCallback(async (
    activityType: string,
    xpAmount: number,
    description?: string,
    activityData?: any
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .rpc('add_user_xp', {
          user_uuid: user.id,
          xp_amount: xpAmount,
          activity_type: activityType,
          activity_description: description,
          activity_data: activityData
        });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        
        // Show XP gained notification
        toast.success(`+${xpAmount} XP earned!`, {
          description: description || `From ${activityType.replace('_', ' ')}`
        });

        // Show level up notification if applicable
        if (result.level_up) {
          toast.success(`🎉 Level Up! You're now level ${result.new_level}!`, {
            description: "New benefits unlocked!"
          });
        }

        // Refresh XP data
        await fetchXPData();

        return result;
      }
    } catch (error) {
      console.error('Error adding XP:', error);
      toast.error('Failed to add XP');
    }

    return null;
  }, [user, fetchXPData]);

  // XP amount mappings for different activities
  const XP_REWARDS = {
    STREAK_MAINTAIN: 10,
    QUESTION_CORRECT: 5,
    QUIZ_COMPLETE: 25,
    MOCK_EXAM_COMPLETE: 50,
    DAILY_LOGIN: 5,
    STREAK_MILESTONE: (days: number) => days * 10,
    PERFECT_QUIZ: 50,
    FIRST_ATTEMPT_CORRECT: 10
  };

  // Helper functions for specific activities
  const rewardStreakMaintain = useCallback(() => 
    addXP('streak_maintain', XP_REWARDS.STREAK_MAINTAIN, 'Daily streak maintained'), 
    [addXP]
  );

  const rewardCorrectAnswer = useCallback((questionId?: string) => 
    addXP('question_correct', XP_REWARDS.QUESTION_CORRECT, 'Correct answer', { questionId }), 
    [addXP]
  );

  const rewardQuizComplete = useCallback((quizId: string, score: number, totalQuestions: number) => {
    const baseXP = XP_REWARDS.QUIZ_COMPLETE;
    const bonusXP = score === totalQuestions ? XP_REWARDS.PERFECT_QUIZ : 0;
    return addXP('quiz_complete', baseXP + bonusXP, 
      `Quiz completed (${score}/${totalQuestions})${bonusXP ? ' - Perfect score!' : ''}`, 
      { quizId, score, totalQuestions }
    );
  }, [addXP]);

  const rewardMockExamComplete = useCallback((examId: string, score: number) => 
    addXP('mock_exam_complete', XP_REWARDS.MOCK_EXAM_COMPLETE, `Mock exam completed (${score}%)`, { examId, score }), 
    [addXP]
  );

  const rewardDailyLogin = useCallback(() => 
    addXP('daily_login', XP_REWARDS.DAILY_LOGIN, 'Daily login bonus'), 
    [addXP]
  );

  const rewardStreakMilestone = useCallback((days: number) => 
    addXP('streak_milestone', XP_REWARDS.STREAK_MILESTONE(days), `${days}-day streak milestone!`, { milestone: days }), 
    [addXP]
  );

  useEffect(() => {
    fetchXPData();
  }, [fetchXPData]);

  return {
    xpData,
    recentActivities,
    loading,
    addXP,
    rewardStreakMaintain,
    rewardCorrectAnswer,
    rewardQuizComplete,
    rewardMockExamComplete,
    rewardDailyLogin,
    rewardStreakMilestone,
    refreshXPData: fetchXPData
  };
};