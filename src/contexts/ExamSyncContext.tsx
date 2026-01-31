import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback, 
  useRef,
  ReactNode 
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ExamSession,
  ExamState,
  AdminExamAction,
  ExamSyncState,
  ExamSyncActions,
  mapDbSessionToExamSession,
  mapDbActionToAdminAction,
  generateSessionId,
  getDeviceInfo,
} from '@/types/unifiedExam';

interface ExamSyncContextType extends ExamSyncState, ExamSyncActions {}

const ExamSyncContext = createContext<ExamSyncContextType | undefined>(undefined);

interface ExamSyncProviderProps {
  children: ReactNode;
  testId: string;
  onForceSubmit?: () => void;
  onExamPaused?: () => void;
  onExamResumed?: () => void;
  onExamCancelled?: () => void;
  onTimeExtended?: (extraMinutes: number) => void;
  onSecondaryTab?: () => void;
}

export const ExamSyncProvider: React.FC<ExamSyncProviderProps> = ({
  children,
  testId,
  onForceSubmit,
  onExamPaused,
  onExamResumed,
  onExamCancelled,
  onTimeExtended,
  onSecondaryTab,
}) => {
  const [session, setSession] = useState<ExamSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPrimaryTab, setIsPrimaryTab] = useState(true);
  const [lastAdminAction, setLastAdminAction] = useState<AdminExamAction | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const sessionIdRef = useRef<string>(generateSessionId());
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Initialize or restore session
  const initializeSession = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setConnectionError('Not authenticated');
        return;
      }

      // Check for existing session
      const { data: existingSession, error: fetchError } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('test_id', testId)
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingSession) {
        // Check if this is a different tab
        if (existingSession.active_session_id !== sessionIdRef.current) {
          // Another tab has this exam open
          const sessionAge = Date.now() - new Date(existingSession.last_synced_at).getTime();
          
          if (sessionAge < 10000) {
            // Recent activity - this is secondary tab
            setIsPrimaryTab(false);
            onSecondaryTab?.();
            toast.warning('This exam is open in another tab. This view is read-only.');
          } else {
            // Stale session - take over
            await supabase
              .from('exam_sessions')
              .update({ 
                active_session_id: sessionIdRef.current,
                last_synced_at: new Date().toISOString(),
                device_info: getDeviceInfo()
              })
              .eq('id', existingSession.id);
          }
        }

        setSession(mapDbSessionToExamSession(existingSession));
      } else {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from('exam_sessions')
          .insert({
            test_id: testId,
            user_id: user.id,
            active_session_id: sessionIdRef.current,
            exam_state: 'LIVE',
            device_info: getDeviceInfo()
          })
          .select()
          .single();

        if (createError) throw createError;
        setSession(mapDbSessionToExamSession(newSession));
      }

      setIsConnected(true);
      setConnectionError(null);
    } catch (error: any) {
      console.error('Session initialization error:', error);
      setConnectionError(error.message || 'Failed to initialize session');
    }
  }, [testId, onSecondaryTab]);

  // Update current question position
  const updateCurrentQuestion = useCallback((questionId: string, subQuestionId?: string) => {
    if (!session || !isPrimaryTab) return;

    setSession(prev => prev ? {
      ...prev,
      currentQuestionId: questionId,
      currentSubQuestionId: subQuestionId || null,
    } : null);

    // Debounced DB update happens in sync interval
  }, [session, isPrimaryTab]);

  // Update remaining time
  const updateTimeRemaining = useCallback((seconds: number) => {
    if (!session || !isPrimaryTab) return;

    setSession(prev => prev ? {
      ...prev,
      timeRemainingSeconds: seconds,
    } : null);
  }, [session, isPrimaryTab]);

  // Submit exam
  const submitExam = useCallback(async () => {
    if (!session) return;

    try {
      await supabase
        .from('exam_sessions')
        .update({
          exam_state: 'SUBMITTED' as ExamState,
          submitted_at: new Date().toISOString(),
        })
        .eq('id', session.id);

      setSession(prev => prev ? {
        ...prev,
        examState: 'SUBMITTED',
        submittedAt: new Date(),
      } : null);
    } catch (error) {
      console.error('Submit error:', error);
      throw error;
    }
  }, [session]);

  // Sync session state to database
  const syncNow = useCallback(async () => {
    if (!session || !isPrimaryTab) return;

    try {
      await supabase
        .from('exam_sessions')
        .update({
          current_question_id: session.currentQuestionId,
          current_sub_question_id: session.currentSubQuestionId,
          time_remaining_seconds: session.timeRemainingSeconds,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', session.id);
    } catch (error) {
      console.error('Sync error:', error);
    }
  }, [session, isPrimaryTab]);

  // Handle admin actions from realtime subscription
  const handleAdminAction = useCallback((action: AdminExamAction) => {
    setLastAdminAction(action);

    switch (action.actionType) {
      case 'PAUSE':
        setSession(prev => prev ? { ...prev, examState: 'PAUSED' } : null);
        onExamPaused?.();
        toast.info('Exam has been paused by administrator');
        break;

      case 'RESUME':
        setSession(prev => prev ? { ...prev, examState: 'LIVE' } : null);
        onExamResumed?.();
        toast.success('Exam has resumed');
        break;

      case 'FORCE_SUBMIT':
        setSession(prev => prev ? { ...prev, examState: 'SUBMITTED' } : null);
        onForceSubmit?.();
        toast.warning('Exam has been submitted by administrator');
        break;

      case 'CANCEL':
        setSession(prev => prev ? { ...prev, examState: 'CANCELLED' } : null);
        onExamCancelled?.();
        toast.error('Exam has been cancelled');
        break;

      case 'EXTEND_TIME':
        const extraMinutes = action.actionData?.extension_minutes || 0;
        onTimeExtended?.(extraMinutes);
        toast.success(`Time extended by ${extraMinutes} minutes`);
        break;

      case 'LOCK':
        setSession(prev => prev ? { ...prev, isLocked: true } : null);
        toast.warning('Your exam has been locked');
        break;

      case 'UNLOCK':
        setSession(prev => prev ? { ...prev, isLocked: false } : null);
        toast.success('Your exam has been unlocked');
        break;
    }
  }, [onExamPaused, onExamResumed, onForceSubmit, onExamCancelled, onTimeExtended]);

  // Set up realtime subscription
  useEffect(() => {
    if (!testId) return;

    // Subscribe to admin actions
    channelRef.current = supabase
      .channel(`exam-sync-${testId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_exam_actions',
          filter: `test_id=eq.${testId}`,
        },
        (payload) => {
          const action = mapDbActionToAdminAction(payload.new);
          // Check if action targets this user or all users
          if (!action.targetUserId || action.targetUserId === session?.userId) {
            handleAdminAction(action);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'exam_sessions',
          filter: `test_id=eq.${testId}`,
        },
        (payload) => {
          // Check if another session took over
          if (
            payload.new.user_id === session?.userId &&
            payload.new.active_session_id !== sessionIdRef.current
          ) {
            setIsPrimaryTab(false);
            onSecondaryTab?.();
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [testId, session?.userId, handleAdminAction, onSecondaryTab]);

  // Periodic sync
  useEffect(() => {
    if (!session || !isPrimaryTab) return;

    syncIntervalRef.current = setInterval(syncNow, 5000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [session, isPrimaryTab, syncNow]);

  // Initialize on mount
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  const value: ExamSyncContextType = {
    session,
    isConnected,
    isPrimaryTab,
    lastAdminAction,
    connectionError,
    initializeSession,
    updateCurrentQuestion,
    updateTimeRemaining,
    submitExam,
    syncNow,
  };

  return (
    <ExamSyncContext.Provider value={value}>
      {children}
    </ExamSyncContext.Provider>
  );
};

export const useExamSync = (): ExamSyncContextType => {
  const context = useContext(ExamSyncContext);
  if (context === undefined) {
    throw new Error('useExamSync must be used within an ExamSyncProvider');
  }
  return context;
};

export default ExamSyncContext;
