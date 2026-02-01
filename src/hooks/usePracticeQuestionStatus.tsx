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
      const newStatusMap: QuestionStatusMap = {};

      // Fetch test attempts for status tracking
      const { data: attempts, error: attemptsError } = await supabase
        .from('test_attempts')
        .select('answers, score, total_questions')
        .eq('user_id', user.id);

      if (attemptsError) {
        console.error('Error fetching test attempts:', attemptsError);
      }

      // Parse answers from attempts to determine status per question
      attempts?.forEach(attempt => {
        if (attempt.answers && typeof attempt.answers === 'object') {
          const answers = attempt.answers as Record<string, any>;
          
          Object.entries(answers).forEach(([questionId, answer]) => {
            const isCorrect = answer?.isCorrect || answer?.correct;
            
            if (isCorrect) {
              newStatusMap[questionId] = 'solved';
            } else if (!newStatusMap[questionId] || newStatusMap[questionId] !== 'solved') {
              newStatusMap[questionId] = 'attempted';
            }
          });
        }
      });

      // Also check AI tutoring sessions for subject_questions practice attempts
      const { data: tutoringSessions, error: tutoringError } = await supabase
        .from('ai_tutoring_sessions')
        .select('question_id, is_correct, student_answer')
        .eq('user_id', user.id);

      if (tutoringError) {
        console.error('Error fetching tutoring sessions:', tutoringError);
      }

      // Mark questions based on tutoring session results
      tutoringSessions?.forEach(session => {
        if (session.question_id) {
          if (session.is_correct) {
            newStatusMap[session.question_id] = 'solved';
          } else if (session.student_answer && !newStatusMap[session.question_id]) {
            newStatusMap[session.question_id] = 'attempted';
          }
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
