import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SolvedQuestionStats {
  mockTestSolved: number;
  subjectTestSolved: number;
  quickTestSolved: number;
  totalSolved: number;
  loading: boolean;
}

export const useSolvedQuestions = (): SolvedQuestionStats => {
  const { user, isDemo } = useAuth();
  const [stats, setStats] = useState<SolvedQuestionStats>({
    mockTestSolved: 0,
    subjectTestSolved: 0,
    quickTestSolved: 0,
    totalSolved: 0,
    loading: true,
  });

  const fetchSolvedQuestions = async () => {
    // Demo users get zero stats (no Supabase access)
    if (isDemo) {
      setStats({
        mockTestSolved: 0,
        subjectTestSolved: 0,
        quickTestSolved: 0,
        totalSolved: 0,
        loading: false,
      });
      return;
    }

    if (!user?.id) {
      setStats({
        mockTestSolved: 0,
        subjectTestSolved: 0,
        quickTestSolved: 0,
        totalSolved: 0,
        loading: false,
      });
      return;
    }

    try {
      // Fetch test attempts with test type information
      const { data: attempts, error } = await supabase
        .from('test_attempts')
        .select(`
          score,
          tests (
            test_type
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching solved questions:', error);
        setStats(prev => ({ ...prev, loading: false }));
        return;
      }

      // Calculate solved questions by category from real Supabase data
      let mockTestSolved = 0;
      let subjectTestSolved = 0;
      let quickTestSolved = 0;
      let totalSolved = 0;

      attempts?.forEach((attempt: any) => {
        const solvedCount = attempt.score || 0;
        const testType = attempt.tests?.test_type;

        totalSolved += solvedCount;

        if (testType === 'mock_test') {
          mockTestSolved += solvedCount;
        } else if (testType === 'topic_practice' || testType === 'subject_test') {
          subjectTestSolved += solvedCount;
        } else if (testType === 'quick_test') {
          quickTestSolved += solvedCount;
        }
      });

      setStats({
        mockTestSolved,
        subjectTestSolved,
        quickTestSolved,
        totalSolved,
        loading: false,
      });
    } catch (error) {
      console.error('Error in fetchSolvedQuestions:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchSolvedQuestions();
  }, [user?.id, isDemo]);

  // Set up real-time subscription for test_attempts changes
  useEffect(() => {
    if (isDemo || !user?.id) return;

    const channel = supabase
      .channel('solved-questions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_attempts',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchSolvedQuestions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isDemo]);

  return stats;
};
