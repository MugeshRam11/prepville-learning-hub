import { useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook to automatically sync test completions with topic progress
 * Listens for new test attempts and updates topic progress accordingly
 */
export const useTestProgressSync = () => {
  const { user } = useAuth();

  const updateTopicProgress = useCallback(async (testType: string, questionsCompleted: number) => {
    if (!user) return;

    // Map test types to topic names
    const topicMap: Record<string, string> = {
      'algebra': 'Algebra',
      'geometry': 'Geometry',
      'statistics': 'Statistics & Probability',
      'number': 'Number Systems',
      'numbers': 'Number Systems'
    };

    // Find matching topic
    const topicName = Object.entries(topicMap).find(([key]) => 
      testType.toLowerCase().includes(key)
    )?.[1];

    if (!topicName) return;

    try {
      // Get current topic progress
      const { data: currentProgress } = await supabase
        .from('topic_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('topic_name', topicName)
        .single();

      if (!currentProgress) {
        // Create new topic progress if it doesn't exist
        await supabase
          .from('topic_progress')
          .insert({
            user_id: user.id,
            topic_name: topicName,
            completed_tasks: questionsCompleted,
            total_tasks: 50,
            difficulty: 'medium',
            last_activity_at: new Date().toISOString()
          });
      } else {
        // Update existing progress
        const newCompleted = Math.min(
          currentProgress.total_tasks,
          currentProgress.completed_tasks + questionsCompleted
        );

        await supabase
          .from('topic_progress')
          .update({
            completed_tasks: newCompleted,
            last_activity_at: new Date().toISOString()
          })
          .eq('id', currentProgress.id);

        // Check if topic completed
        if (newCompleted === currentProgress.total_tasks && 
            currentProgress.completed_tasks < currentProgress.total_tasks) {
          toast.success(`🎉 ${topicName} topic completed!`, {
            description: 'Great job mastering this topic!',
            duration: 5000
          });
        }
      }
    } catch (error) {
      console.error('Error updating topic progress:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Listen for new test attempts
    const channel = supabase
      .channel('test-completion-sync')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'test_attempts',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const attempt = payload.new;
          
          // Get test details to determine topic
          const { data: testData } = await supabase
            .from('tests')
            .select('test_type, title')
            .eq('id', attempt.test_id)
            .single();

          if (testData) {
            // Update topic progress based on score
            await updateTopicProgress(
              testData.test_type || testData.title,
              attempt.score || 0
            );
          }

          // Also check for mock test attempts
          const { data: mockTestData } = await supabase
            .from('mock_tests')
            .select('subject, topic')
            .eq('id', attempt.test_id)
            .single();

          if (mockTestData) {
            await updateTopicProgress(
              mockTestData.topic || mockTestData.subject,
              attempt.score || 0
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, updateTopicProgress]);

  return { updateTopicProgress };
};
