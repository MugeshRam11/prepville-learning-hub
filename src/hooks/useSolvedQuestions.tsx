import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SolvedQuestionStats {
  mockTestSolved: number;
  subjectTestSolved: number;
  quickTestSolved: number;
  totalSolved: number;
  mockTestUnsolved: number;
  subjectTestUnsolved: number;
  quickTestUnsolved: number;
  totalUnsolved: number;
  loading: boolean;
}

export const useSolvedQuestions = (): SolvedQuestionStats => {
  const { user } = useAuth();
  const [stats, setStats] = useState<SolvedQuestionStats>({
    mockTestSolved: 0,
    subjectTestSolved: 0,
    quickTestSolved: 0,
    totalSolved: 0,
    mockTestUnsolved: 0,
    subjectTestUnsolved: 0,
    quickTestUnsolved: 0,
    totalUnsolved: 0,
    loading: true,
  });

  const fetchSolvedQuestions = async () => {
    if (!user) {
      setStats({
        mockTestSolved: 0,
        subjectTestSolved: 0,
        quickTestSolved: 0,
        totalSolved: 0,
        mockTestUnsolved: 0,
        subjectTestUnsolved: 0,
        quickTestUnsolved: 0,
        totalUnsolved: 0,
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

      // Calculate solved and unsolved questions by category
      let mockTestSolved = 0;
      let subjectTestSolved = 0;
      let quickTestSolved = 0;
      let totalSolved = 0;
      
      let mockTestUnsolved = 0;
      let subjectTestUnsolved = 0;
      let quickTestUnsolved = 0;
      let totalUnsolved = 0;

      attempts?.forEach((attempt: any) => {
        const solvedCount = attempt.score || 0;
        const totalQuestions = attempt.total_questions || 0;
        const unsolvedCount = Math.max(0, totalQuestions - solvedCount);
        const testType = attempt.tests?.test_type;

        totalSolved += solvedCount;
        totalUnsolved += unsolvedCount;

        if (testType === 'mock_test') {
          mockTestSolved += solvedCount;
          mockTestUnsolved += unsolvedCount;
        } else if (testType === 'topic_practice' || testType === 'subject_test') {
          subjectTestSolved += solvedCount;
          subjectTestUnsolved += unsolvedCount;
        } else if (testType === 'quick_test') {
          quickTestSolved += solvedCount;
          quickTestUnsolved += unsolvedCount;
        }
      });

      setStats({
        mockTestSolved,
        subjectTestSolved,
        quickTestSolved,
        totalSolved,
        mockTestUnsolved,
        subjectTestUnsolved,
        quickTestUnsolved,
        totalUnsolved,
        loading: false,
      });
    } catch (error) {
      console.error('Error in fetchSolvedQuestions:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchSolvedQuestions();
  }, [user]);

  // Set up real-time subscription for test_attempts changes
  useEffect(() => {
    if (!user) return;

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
  }, [user]);

  return stats;
};
