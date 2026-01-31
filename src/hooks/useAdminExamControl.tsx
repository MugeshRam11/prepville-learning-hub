import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AdminActionType, ExamState } from '@/types/unifiedExam';

interface ActiveStudent {
  userId: string;
  email?: string;
  currentQuestion: string | null;
  timeRemaining: number | null;
  examState: ExamState;
  lastSynced: Date;
}

interface UseAdminExamControlReturn {
  activeStudents: ActiveStudent[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  pauseExam: (testId: string, targetUserId?: string) => Promise<void>;
  resumeExam: (testId: string, targetUserId?: string) => Promise<void>;
  forceSubmit: (testId: string, targetUserId?: string) => Promise<void>;
  extendTime: (testId: string, minutes: number, targetUserId?: string) => Promise<void>;
  cancelExam: (testId: string, targetUserId?: string) => Promise<void>;
  lockStudent: (testId: string, userId: string) => Promise<void>;
  unlockStudent: (testId: string, userId: string) => Promise<void>;
  
  // Refresh
  refreshActiveStudents: (testId: string) => Promise<void>;
}

export const useAdminExamControl = (): UseAdminExamControlReturn => {
  const [activeStudents, setActiveStudents] = useState<ActiveStudent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generic action dispatcher
  const dispatchAction = useCallback(async (
    testId: string,
    actionType: AdminActionType,
    targetUserId?: string,
    actionData?: Record<string, any>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: insertError } = await supabase
        .from('admin_exam_actions')
        .insert({
          test_id: testId,
          admin_id: user.id,
          action_type: actionType,
          target_user_id: targetUserId || null,
          action_data: actionData || null,
        });

      if (insertError) throw insertError;

      // Also update exam_sessions directly for immediate effect
      const updateData: Record<string, any> = {};
      
      if (actionType === 'PAUSE') updateData.exam_state = 'PAUSED';
      if (actionType === 'RESUME') updateData.exam_state = 'LIVE';
      if (actionType === 'FORCE_SUBMIT') {
        updateData.exam_state = 'SUBMITTED';
        updateData.submitted_at = new Date().toISOString();
      }
      if (actionType === 'CANCEL') updateData.exam_state = 'CANCELLED';
      if (actionType === 'LOCK') updateData.is_locked = true;
      if (actionType === 'UNLOCK') updateData.is_locked = false;

      if (Object.keys(updateData).length > 0) {
        let query = supabase
          .from('exam_sessions')
          .update(updateData)
          .eq('test_id', testId);
        
        if (targetUserId) {
          query = query.eq('user_id', targetUserId);
        }
        
        await query;
      }

      toast.success(`Action ${actionType} executed successfully`);
    } catch (err: any) {
      console.error('Admin action error:', err);
      setError(err.message);
      toast.error(`Failed to execute action: ${err.message}`);
      throw err;
    }
  }, []);

  const pauseExam = useCallback(async (testId: string, targetUserId?: string) => {
    await dispatchAction(testId, 'PAUSE', targetUserId);
  }, [dispatchAction]);

  const resumeExam = useCallback(async (testId: string, targetUserId?: string) => {
    await dispatchAction(testId, 'RESUME', targetUserId);
  }, [dispatchAction]);

  const forceSubmit = useCallback(async (testId: string, targetUserId?: string) => {
    await dispatchAction(testId, 'FORCE_SUBMIT', targetUserId);
  }, [dispatchAction]);

  const extendTime = useCallback(async (testId: string, minutes: number, targetUserId?: string) => {
    await dispatchAction(testId, 'EXTEND_TIME', targetUserId, { extension_minutes: minutes });
    
    // Update time_remaining in sessions
    const { data: sessions } = await supabase
      .from('exam_sessions')
      .select('id, time_remaining_seconds')
      .eq('test_id', testId)
      .not('exam_state', 'eq', 'SUBMITTED');
    
    if (sessions) {
      for (const session of sessions) {
        const newTime = (session.time_remaining_seconds || 0) + (minutes * 60);
        await supabase
          .from('exam_sessions')
          .update({ time_remaining_seconds: newTime })
          .eq('id', session.id);
      }
    }
  }, [dispatchAction]);

  const cancelExam = useCallback(async (testId: string, targetUserId?: string) => {
    await dispatchAction(testId, 'CANCEL', targetUserId);
  }, [dispatchAction]);

  const lockStudent = useCallback(async (testId: string, userId: string) => {
    await dispatchAction(testId, 'LOCK', userId);
  }, [dispatchAction]);

  const unlockStudent = useCallback(async (testId: string, userId: string) => {
    await dispatchAction(testId, 'UNLOCK', userId);
  }, [dispatchAction]);

  const refreshActiveStudents = useCallback(async (testId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: sessions, error: fetchError } = await supabase
        .from('exam_sessions')
        .select(`
          user_id,
          current_question_id,
          time_remaining_seconds,
          exam_state,
          last_synced_at
        `)
        .eq('test_id', testId)
        .neq('exam_state', 'SUBMITTED')
        .neq('exam_state', 'CANCELLED');

      if (fetchError) throw fetchError;

      // Get user emails
      const userIds = sessions?.map(s => s.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      setActiveStudents(
        sessions?.map(s => ({
          userId: s.user_id,
          email: profileMap.get(s.user_id),
          currentQuestion: s.current_question_id,
          timeRemaining: s.time_remaining_seconds,
          examState: s.exam_state as ExamState,
          lastSynced: new Date(s.last_synced_at),
        })) || []
      );
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    activeStudents,
    isLoading,
    error,
    pauseExam,
    resumeExam,
    forceSubmit,
    extendTime,
    cancelExam,
    lockStudent,
    unlockStudent,
    refreshActiveStudents,
  };
};

export default useAdminExamControl;
