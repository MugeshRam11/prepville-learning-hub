// Unified Exam Framework Types

export type ExamType = 'MOCK' | 'PUZZLE' | 'CHALLENGE' | 'INTERACTIVE_DEMO';
export type ExamState = 'LIVE' | 'PAUSED' | 'SUBMITTED' | 'CANCELLED';

export type AdminActionType = 
  | 'PAUSE' 
  | 'RESUME' 
  | 'FORCE_SUBMIT' 
  | 'EXTEND_TIME' 
  | 'CANCEL' 
  | 'LOCK' 
  | 'UNLOCK'
  | 'PUBLISH'
  | 'UNPUBLISH';

export interface ExamSession {
  id: string;
  testId: string;
  userId: string;
  activeSessionId: string;
  examState: ExamState;
  currentQuestionId: string | null;
  currentSubQuestionId: string | null;
  timeRemainingSeconds: number | null;
  startedAt: Date;
  lastSyncedAt: Date;
  submittedAt: Date | null;
  isLocked: boolean;
  deviceInfo: Record<string, any> | null;
}

export interface AdminExamAction {
  id: string;
  testId: string;
  adminId: string;
  actionType: AdminActionType;
  targetUserId: string | null;
  actionData: Record<string, any> | null;
  executedAt: Date;
}

export interface ExamSyncState {
  session: ExamSession | null;
  isConnected: boolean;
  isPrimaryTab: boolean;
  lastAdminAction: AdminExamAction | null;
  connectionError: string | null;
}

export interface ExamSyncActions {
  initializeSession: (testId: string) => Promise<void>;
  updateCurrentQuestion: (questionId: string, subQuestionId?: string) => void;
  updateTimeRemaining: (seconds: number) => void;
  submitExam: () => Promise<void>;
  syncNow: () => Promise<void>;
}

// Map database snake_case to camelCase
export const mapDbSessionToExamSession = (dbSession: any): ExamSession => ({
  id: dbSession.id,
  testId: dbSession.test_id,
  userId: dbSession.user_id,
  activeSessionId: dbSession.active_session_id,
  examState: dbSession.exam_state,
  currentQuestionId: dbSession.current_question_id,
  currentSubQuestionId: dbSession.current_sub_question_id,
  timeRemainingSeconds: dbSession.time_remaining_seconds,
  startedAt: new Date(dbSession.started_at),
  lastSyncedAt: new Date(dbSession.last_synced_at),
  submittedAt: dbSession.submitted_at ? new Date(dbSession.submitted_at) : null,
  isLocked: dbSession.is_locked,
  deviceInfo: dbSession.device_info,
});

export const mapDbActionToAdminAction = (dbAction: any): AdminExamAction => ({
  id: dbAction.id,
  testId: dbAction.test_id,
  adminId: dbAction.admin_id,
  actionType: dbAction.action_type,
  targetUserId: dbAction.target_user_id,
  actionData: dbAction.action_data,
  executedAt: new Date(dbAction.executed_at),
});

// Generate unique session ID for tab detection
export const generateSessionId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Get device info for session
export const getDeviceInfo = (): Record<string, any> => ({
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  language: navigator.language,
  screenWidth: window.screen.width,
  screenHeight: window.screen.height,
  timestamp: new Date().toISOString(),
});
