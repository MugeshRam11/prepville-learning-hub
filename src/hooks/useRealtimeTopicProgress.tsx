import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface TopicProgress {
  id: string;
  user_id: string;
  topic_name: string;
  completed_tasks: number;
  total_tasks: number;
  difficulty: string;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Enhanced hook for real-time topic progress tracking
 * Automatically syncs with database and provides instant updates
 */
export const useRealtimeTopicProgress = () => {
  const { user } = useAuth();
  const [topics, setTopics] = useState<TopicProgress[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial topic progress
  const fetchTopics = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('topic_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('last_activity_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error('Error fetching topics:', error);
      toast.error('Failed to load topic progress');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Update or create topic progress
  const updateTopicProgress = useCallback(async (
    topicName: string,
    questionsCompleted: number,
    subject?: string
  ) => {
    if (!user) return;

    try {
      // Get current topic progress
      const { data: currentProgress } = await supabase
        .from('topic_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('topic_name', topicName)
        .maybeSingle();

      if (!currentProgress) {
        // Create new topic progress
        const { data: newProgress, error } = await supabase
          .from('topic_progress')
          .insert({
            user_id: user.id,
            topic_name: topicName,
            completed_tasks: questionsCompleted,
            total_tasks: 50, // Default, can be adjusted
            difficulty: 'medium',
            last_activity_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        
        toast.success(`Started tracking progress for ${topicName}!`);
        return newProgress;
      } else {
        // Update existing progress
        const newCompleted = Math.min(
          currentProgress.total_tasks,
          currentProgress.completed_tasks + questionsCompleted
        );

        const { data: updatedProgress, error } = await supabase
          .from('topic_progress')
          .update({
            completed_tasks: newCompleted,
            last_activity_at: new Date().toISOString()
          })
          .eq('id', currentProgress.id)
          .select()
          .single();

        if (error) throw error;

        // Check for topic completion
        if (newCompleted === currentProgress.total_tasks && 
            currentProgress.completed_tasks < currentProgress.total_tasks) {
          toast.success(`🎉 ${topicName} mastered!`, {
            description: 'You completed all tasks in this topic!',
            duration: 5000
          });
        } else if (questionsCompleted > 0) {
          const percentage = Math.round((newCompleted / currentProgress.total_tasks) * 100);
          toast.success(`Progress updated: ${topicName} (${percentage}%)`);
        }

        return updatedProgress;
      }
    } catch (error) {
      console.error('Error updating topic progress:', error);
      toast.error('Failed to update progress');
    }
  }, [user]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    fetchTopics();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('realtime-topic-progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'topic_progress',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time topic progress update:', payload);

          if (payload.eventType === 'INSERT') {
            setTopics(prev => {
              const exists = prev.find(t => t.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new as TopicProgress].sort((a, b) => {
                const dateA = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
                const dateB = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
                return dateB - dateA;
              });
            });
          } else if (payload.eventType === 'UPDATE') {
            setTopics(prev => prev.map(t => 
              t.id === payload.new.id 
                ? { ...payload.new as TopicProgress } 
                : t
            ).sort((a, b) => {
              const dateA = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
              const dateB = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
              return dateB - dateA;
            }));
          } else if (payload.eventType === 'DELETE') {
            setTopics(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchTopics]);

  return {
    topics,
    loading,
    updateTopicProgress,
    refreshTopics: fetchTopics
  };
};
