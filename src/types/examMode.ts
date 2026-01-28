// Exam Mode Types for Study vs Examination mode system

export type ExamMode = 'study' | 'examination';

export interface ExamModeConfig {
  mode: ExamMode;
  // Feature toggles based on mode
  showHints: boolean;
  showMarkScheme: boolean;
  showAIFeedback: boolean;
  showInstantFeedback: boolean;
  timerEnabled: boolean;
  timerEnforced: boolean;
  autoSaveEnabled: boolean;
  focusModeAvailable: boolean;
}

// Default configurations for each mode
export const STUDY_MODE_CONFIG: ExamModeConfig = {
  mode: 'study',
  showHints: true,
  showMarkScheme: true,
  showAIFeedback: true,
  showInstantFeedback: true,
  timerEnabled: false,
  timerEnforced: false,
  autoSaveEnabled: false,
  focusModeAvailable: false,
};

export const EXAMINATION_MODE_CONFIG: ExamModeConfig = {
  mode: 'examination',
  showHints: false,
  showMarkScheme: false,
  showAIFeedback: false,
  showInstantFeedback: false,
  timerEnabled: true,
  timerEnforced: true,
  autoSaveEnabled: true,
  focusModeAvailable: true,
};

export const getConfigForMode = (mode: ExamMode): ExamModeConfig => {
  return mode === 'study' ? STUDY_MODE_CONFIG : EXAMINATION_MODE_CONFIG;
};

// AI Feedback response type
export interface AIFeedbackResponse {
  isOnTrack: boolean;
  feedback: string;
  hint: string;
  missingElements: string[];
  partialScore?: number;
}

// Mark Scheme data type
export interface MarkSchemeData {
  modelAnswer: string;
  markingCriteria: MarkingCriterion[];
  commandTermRequirements: string;
  commonMistakes: string[];
  totalMarks: number;
}

export interface MarkingCriterion {
  description: string;
  marks: number;
  category: 'method' | 'accuracy' | 'reasoning' | 'communication';
}

// Auto-save state
export interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  pendingChanges: boolean;
  error: string | null;
}

// Focus mode state
export interface FocusModeState {
  isActive: boolean;
  hideSidebars: boolean;
  dimBackground: boolean;
}
