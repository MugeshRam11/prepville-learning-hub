import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserProgress {
  id: string;
  user_id: string;
  knowledge_understanding: number;
  pattern_recognition: number;
  communication: number;
  real_life_applications: number;
  updated_at: string;
}

export interface TopicProgress {
  id: string;
  user_id: string;
  topic_name: string;
  total_tasks: number;
  completed_tasks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  last_activity_at: string | null;
}

export interface DailyChallenge {
  id: string;
  user_id: string;
  challenge_date: string;
  challenge_type: string;
  target_count: number;
  current_count: number;
  xp_reward: number;
  is_completed: boolean;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_name: string;
  achievement_icon: string;
  unlocked_at: string;
}

export const useProgressTracking = () => {
  const { user } = useAuth();
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [topicProgress, setTopicProgress] = useState<TopicProgress[]>([]);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize user progress if it doesn't exist
  const initializeUserProgress = useCallback(async () => {
    if (!user) return;

    try {
      const { data: existing } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!existing) {
        const { error } = await supabase
          .from('user_progress')
          .insert({
            user_id: user.id,
            knowledge_understanding: 0,
            pattern_recognition: 0,
            communication: 0,
            real_life_applications: 0
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error initializing user progress:', error);
    }
  }, [user]);

  // Initialize default topics
  const initializeTopics = useCallback(async () => {
    if (!user) return;

    const defaultTopics = [
      { topic_name: 'Algebra', difficulty: 'medium', total_tasks: 50 },
      { topic_name: 'Geometry', difficulty: 'hard', total_tasks: 40 },
      { topic_name: 'Statistics & Probability', difficulty: 'medium', total_tasks: 45 },
      { topic_name: 'Number Systems', difficulty: 'easy', total_tasks: 35 }
    ];

    try {
      for (const topic of defaultTopics) {
        const { data: existing } = await supabase
          .from('topic_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('topic_name', topic.topic_name)
          .single();

        if (!existing) {
          await supabase
            .from('topic_progress')
            .insert({
              user_id: user.id,
              ...topic,
              completed_tasks: 0
            });
        }
      }
    } catch (error) {
      console.error('Error initializing topics:', error);
    }
  }, [user]);

  // Initialize daily challenge
  const initializeDailyChallenge = useCallback(async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: existing } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('user_id', user.id)
        .eq('challenge_date', today)
        .single();

      if (!existing) {
        await supabase
          .from('daily_challenges')
          .insert({
            user_id: user.id,
            challenge_type: 'Solve 10 questions daily',
            target_count: 10,
            current_count: 0,
            xp_reward: 100,
            challenge_date: today
          });
      }
    } catch (error) {
      console.error('Error initializing daily challenge:', error);
    }
  }, [user]);

  // Fetch all progress data
  const fetchProgressData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch user progress
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setUserProgress(progressData);

      // Fetch topic progress
      const { data: topicsData } = await supabase
        .from('topic_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('topic_name');

      setTopicProgress((topicsData || []).map(t => ({
        ...t,
        difficulty: t.difficulty as 'easy' | 'medium' | 'hard'
      })));

      // Fetch daily challenge
      const today = new Date().toISOString().split('T')[0];
      const { data: challengeData } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('user_id', user.id)
        .eq('challenge_date', today)
        .single();

      setDailyChallenge(challengeData);

      // Fetch achievements
      const { data: achievementsData } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false })
        .limit(5);

      setAchievements(achievementsData || []);
    } catch (error) {
      console.error('Error fetching progress data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Update performance criteria
  const updatePerformanceCriteria = useCallback(async (
    criterion: keyof Pick<UserProgress, 'knowledge_understanding' | 'pattern_recognition' | 'communication' | 'real_life_applications'>,
    increment: number
  ) => {
    if (!user || !userProgress) return;

    try {
      const currentValue = userProgress[criterion];
      const newValue = Math.min(100, currentValue + increment);

      const { error } = await supabase
        .from('user_progress')
        .update({ [criterion]: newValue })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(`${criterion.replace(/_/g, ' ')} increased by ${increment}%!`);
    } catch (error) {
      console.error('Error updating performance criteria:', error);
      toast.error('Failed to update progress');
    }
  }, [user, userProgress]);

  // Update topic progress
  const updateTopicProgress = useCallback(async (topicName: string, tasksCompleted: number = 1) => {
    if (!user) return;

    try {
      const topic = topicProgress.find(t => t.topic_name === topicName);
      if (!topic) return;

      const newCompleted = Math.min(topic.total_tasks, topic.completed_tasks + tasksCompleted);

      const { error } = await supabase
        .from('topic_progress')
        .update({ 
          completed_tasks: newCompleted,
          last_activity_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('topic_name', topicName);

      if (error) throw error;

      toast.success(`${topicName} progress updated!`);

      // Check if topic is completed
      if (newCompleted === topic.total_tasks && topic.completed_tasks < topic.total_tasks) {
        await unlockAchievement(`${topicName} Master`, '🏆');
      }
    } catch (error) {
      console.error('Error updating topic progress:', error);
      toast.error('Failed to update topic progress');
    }
  }, [user, topicProgress]);

  // Update daily challenge
  const updateDailyChallenge = useCallback(async () => {
    if (!user || !dailyChallenge) return;

    try {
      const newCount = Math.min(dailyChallenge.target_count, dailyChallenge.current_count + 1);
      const isCompleted = newCount === dailyChallenge.target_count;

      const { error } = await supabase
        .from('daily_challenges')
        .update({ 
          current_count: newCount,
          is_completed: isCompleted
        })
        .eq('user_id', user.id)
        .eq('challenge_date', dailyChallenge.challenge_date);

      if (error) throw error;

      if (isCompleted && !dailyChallenge.is_completed) {
        toast.success(`🎉 Daily Challenge Complete! +${dailyChallenge.xp_reward} XP`);
      }
    } catch (error) {
      console.error('Error updating daily challenge:', error);
      toast.error('Failed to update challenge');
    }
  }, [user, dailyChallenge]);

  // Unlock achievement
  const unlockAchievement = useCallback(async (name: string, icon: string) => {
    if (!user) return;

    try {
      const { data: existing } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .eq('achievement_name', name)
        .single();

      if (existing) return; // Already unlocked

      const { error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: user.id,
          achievement_name: name,
          achievement_icon: icon
        });

      if (error) throw error;

      toast.success(`🏆 Achievement Unlocked: ${name}!`, {
        duration: 5000
      });
    } catch (error) {
      console.error('Error unlocking achievement:', error);
    }
  }, [user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('progress-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_progress',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setUserProgress(payload.new as UserProgress);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'topic_progress',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setTopicProgress(prev => 
              prev.map(t => t.id === payload.new.id ? payload.new as TopicProgress : t)
            );
          } else if (payload.eventType === 'INSERT') {
            setTopicProgress(prev => [...prev, payload.new as TopicProgress]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_challenges',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setDailyChallenge(payload.new as DailyChallenge);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setAchievements(prev => [payload.new as Achievement, ...prev].slice(0, 5));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Initialize data on mount
  useEffect(() => {
    if (user) {
      const initialize = async () => {
        await initializeUserProgress();
        await initializeTopics();
        await initializeDailyChallenge();
        await fetchProgressData();
      };
      initialize();
    }
  }, [user, initializeUserProgress, initializeTopics, initializeDailyChallenge, fetchProgressData]);

  return {
    userProgress,
    topicProgress,
    dailyChallenge,
    achievements,
    loading,
    updatePerformanceCriteria,
    updateTopicProgress,
    updateDailyChallenge,
    unlockAchievement,
    refreshData: fetchProgressData
  };
};
