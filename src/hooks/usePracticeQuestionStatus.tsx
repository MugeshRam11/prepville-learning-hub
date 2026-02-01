import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { PracticeQuestionStatus } from '@/components/practice/PracticeStatusBadge';

interface QuestionStatusMap {
  [questionId: string]: PracticeQuestionStatus;
}

export const usePracticeQuestionStatus = () => {
  const { user } = useAuth();
  const [statusMap, setStatusMap] = useState<QuestionStatusMap>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatuses = useCallback(async () => {
    if (!user) {
      setStatusMap({});
      setIsLoading(false);
      return;
    }

    try {
      // Fetch all test attempts for this user to determine question statuses
      const { data: attempts, error } = await supabase
        .from('test_attempts')
        .select('answers, score, total_questions')
        .eq('user_id', user.id);

      if (error) throw error;

      const newStatusMap: QuestionStatusMap = {};

      // Parse answers from attempts to determine status per question
      attempts?.forEach(attempt => {
        if (attempt.answers && typeof attempt.answers === 'object') {
          const answers = attempt.answers as Record<string, any>;
          
          Object.entries(answers).forEach(([questionId, answer]) => {
            // Check if this answer represents a solved or attempted state
            // For now, if any answer exists, mark as attempted
            // If score is present and > 0, mark as solved (simplified logic)
            const isCorrect = answer?.isCorrect || answer?.correct;
            
            if (isCorrect) {
              newStatusMap[questionId] = 'solved';
            } else if (!newStatusMap[questionId] || newStatusMap[questionId] !== 'solved') {
              newStatusMap[questionId] = 'attempted';
            }
          });
        }
      });

      setStatusMap(newStatusMap);
    } catch (error) {
      console.error('Error fetching question statuses:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const getStatus = useCallback((questionId: string): PracticeQuestionStatus => {
    return statusMap[questionId] || 'unsolved';
  }, [statusMap]);

  const markAsSolved = useCallback((questionId: string) => {
    setStatusMap(prev => ({
      ...prev,
      [questionId]: 'solved'
    }));
  }, []);

  const markAsAttempted = useCallback((questionId: string) => {
    setStatusMap(prev => ({
      ...prev,
      [questionId]: prev[questionId] === 'solved' ? 'solved' : 'attempted'
    }));
  }, []);

  return {
    statusMap,
    isLoading,
    getStatus,
    markAsSolved,
    markAsAttempted,
    refetch: fetchStatuses
  };
};

export default usePracticeQuestionStatus;
