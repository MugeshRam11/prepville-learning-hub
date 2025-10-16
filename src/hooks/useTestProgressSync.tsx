import { useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Enhanced hook to automatically sync test completions with topic progress
 * Listens for new test attempts and question completions in real-time
 * Integrates with AI progress analysis system
 */
export const useTestProgressSync = () => {
  const { user } = useAuth();

  const updateTopicProgress = useCallback(async (
    testType: string, 
    questionsCompleted: number,
    isCorrect?: boolean
  ) => {
    if (!user) return;

    // Enhanced topic mapping with subject categorization
    const topicMap: Record<string, string> = {
      'algebra': 'Algebra',
      'geometry': 'Geometry',
      'statistics': 'Statistics & Probability',
      'probability': 'Statistics & Probability',
      'number': 'Number Systems',
      'numbers': 'Number Systems',
      'calculus': 'Calculus',
      'trigonometry': 'Trigonometry',
      'measurement': 'Measurement',
      'data': 'Data Analysis'
    };

    // Find matching topic
    const topicName = Object.entries(topicMap).find(([key]) => 
      testType.toLowerCase().includes(key)
    )?.[1];

    if (!topicName) {
      console.log('No topic mapping found for:', testType);
      return;
    }

    try {
      // Get current topic progress
      const { data: currentProgress } = await supabase
        .from('topic_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('topic_name', topicName)
        .maybeSingle();

      if (!currentProgress) {
        // Create new topic progress if it doesn't exist
        const { error } = await supabase
          .from('topic_progress')
          .insert({
            user_id: user.id,
            topic_name: topicName,
            completed_tasks: isCorrect !== false ? questionsCompleted : 0,
            total_tasks: 50,
            difficulty: 'medium',
            last_activity_at: new Date().toISOString()
          });

        if (error) throw error;

        console.log(`Created new topic progress for ${topicName}`);
      } else {
        // Update existing progress - only increment if answer was correct
        const increment = isCorrect !== false ? questionsCompleted : 0;
        const newCompleted = Math.min(
          currentProgress.total_tasks,
          currentProgress.completed_tasks + increment
        );

        const { error } = await supabase
          .from('topic_progress')
          .update({
            completed_tasks: newCompleted,
            last_activity_at: new Date().toISOString()
          })
          .eq('id', currentProgress.id);

        if (error) throw error;

        // Check if topic completed
        if (newCompleted === currentProgress.total_tasks && 
            currentProgress.completed_tasks < currentProgress.total_tasks) {
          toast.success(`🎉 ${topicName} mastered!`, {
            description: 'Excellent work! You completed all tasks in this topic!',
            duration: 5000
          });
        }

        console.log(`Updated ${topicName}: ${currentProgress.completed_tasks} → ${newCompleted}`);
      }

      // Track struggle topics for incorrect answers
      if (isCorrect === false) {
        await supabase
          .from('student_struggle_topics')
          .upsert({
            user_id: user.id,
            subject: testType,
            topic: topicName,
            difficulty_level: currentProgress?.difficulty || 'medium',
            struggle_count: 1,
            last_struggled_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,subject,topic',
            ignoreDuplicates: false
          });
      }
    } catch (error) {
      console.error('Error updating topic progress:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Listen for test attempts and user answers in real-time
    const testChannel = supabase
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
          console.log('New test attempt detected:', attempt);
          
          // Get test details to determine topic
          const { data: testData } = await supabase
            .from('tests')
            .select('test_type, title')
            .eq('id', attempt.test_id)
            .maybeSingle();

          if (testData) {
            // Update topic progress based on score
            await updateTopicProgress(
              testData.test_type || testData.title,
              attempt.score || 0,
              true
            );
          }

          // Also check for mock test attempts
          const { data: mockTestData } = await supabase
            .from('mock_tests')
            .select('subject, topic')
            .eq('id', attempt.test_id)
            .maybeSingle();

          if (mockTestData) {
            await updateTopicProgress(
              mockTestData.topic || mockTestData.subject,
              attempt.score || 0,
              true
            );
          }
        }
      )
      .subscribe();

    // Listen for individual question answers for real-time progress (both INSERT and UPDATE)
    const answerChannel = supabase
      .channel('answer-progress-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_question_progress',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const progress = payload.new as any;
          console.log('Question progress update:', progress);

          if (!progress?.question_id) return;

          // Get question details to determine topic
          const { data: questionData } = await supabase
            .from('subject_questions')
            .select('topic, subject, title')
            .eq('id', progress.question_id)
            .maybeSingle();

          if (questionData) {
            // Create/update topic progress on any interaction
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              // If solved, increment progress
              if (progress.is_solved === true) {
                await updateTopicProgress(
                  questionData.topic || questionData.subject,
                  1,
                  true
                );
              } else {
                // Just update last_activity_at, don't increment
                const topicMap: Record<string, string> = {
                  'algebra': 'Algebra',
                  'geometry': 'Geometry',
                  'statistics': 'Statistics & Probability',
                  'probability': 'Statistics & Probability',
                  'number': 'Number Systems',
                  'numbers': 'Number Systems',
                  'calculus': 'Calculus',
                  'trigonometry': 'Trigonometry',
                  'measurement': 'Measurement',
                  'data': 'Data Analysis'
                };
                
                const topicName = Object.entries(topicMap).find(([key]) => 
                  (questionData.topic || questionData.subject).toLowerCase().includes(key)
                )?.[1] || questionData.topic || questionData.subject;

                // Ensure topic exists in progress
                await supabase
                  .from('topic_progress')
                  .upsert({
                    user_id: user.id,
                    topic_name: topicName,
                    completed_tasks: 0,
                    total_tasks: 50,
                    difficulty: 'medium',
                    last_activity_at: new Date().toISOString()
                  }, {
                    onConflict: 'user_id,topic_name',
                    ignoreDuplicates: false
                  });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(testChannel);
      supabase.removeChannel(answerChannel);
    };
  }, [user, updateTopicProgress]);

  return { updateTopicProgress };
};
