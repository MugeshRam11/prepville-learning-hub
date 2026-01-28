import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { 
  ExamMode, 
  ExamModeConfig, 
  getConfigForMode,
  FocusModeState,
  AutoSaveState 
} from '@/types/examMode';

interface ExamModeContextType {
  // Mode state
  mode: ExamMode;
  config: ExamModeConfig;
  setMode: (mode: ExamMode) => void;
  toggleMode: () => void;
  
  // Focus mode
  focusMode: FocusModeState;
  toggleFocusMode: () => void;
  setFocusMode: (state: Partial<FocusModeState>) => void;
  
  // Auto-save state
  autoSaveState: AutoSaveState;
  setAutoSaveState: (state: Partial<AutoSaveState>) => void;
  
  // Helpers
  canShowFeedback: () => boolean;
  canShowMarkScheme: () => boolean;
  canShowHints: () => boolean;
  isTimerActive: () => boolean;
}

const ExamModeContext = createContext<ExamModeContextType | undefined>(undefined);

interface ExamModeProviderProps {
  children: ReactNode;
  initialMode?: ExamMode;
}

export const ExamModeProvider: React.FC<ExamModeProviderProps> = ({ 
  children, 
  initialMode = 'study' 
}) => {
  const [mode, setModeState] = useState<ExamMode>(initialMode);
  const [config, setConfig] = useState<ExamModeConfig>(getConfigForMode(initialMode));
  
  const [focusMode, setFocusModeState] = useState<FocusModeState>({
    isActive: false,
    hideSidebars: false,
    dimBackground: false,
  });
  
  const [autoSaveState, setAutoSaveStateInternal] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    pendingChanges: false,
    error: null,
  });

  const setMode = useCallback((newMode: ExamMode) => {
    setModeState(newMode);
    setConfig(getConfigForMode(newMode));
    
    // Reset focus mode when switching modes
    if (newMode === 'study') {
      setFocusModeState({
        isActive: false,
        hideSidebars: false,
        dimBackground: false,
      });
    }
  }, []);

  const toggleMode = useCallback(() => {
    const newMode = mode === 'study' ? 'examination' : 'study';
    setMode(newMode);
  }, [mode, setMode]);

  const toggleFocusMode = useCallback(() => {
    if (!config.focusModeAvailable) return;
    
    setFocusModeState(prev => ({
      isActive: !prev.isActive,
      hideSidebars: !prev.isActive,
      dimBackground: !prev.isActive,
    }));
  }, [config.focusModeAvailable]);

  const setFocusMode = useCallback((state: Partial<FocusModeState>) => {
    setFocusModeState(prev => ({ ...prev, ...state }));
  }, []);

  const setAutoSaveState = useCallback((state: Partial<AutoSaveState>) => {
    setAutoSaveStateInternal(prev => ({ ...prev, ...state }));
  }, []);

  // Helper functions
  const canShowFeedback = useCallback(() => config.showAIFeedback, [config]);
  const canShowMarkScheme = useCallback(() => config.showMarkScheme, [config]);
  const canShowHints = useCallback(() => config.showHints, [config]);
  const isTimerActive = useCallback(() => config.timerEnabled, [config]);

  const value: ExamModeContextType = {
    mode,
    config,
    setMode,
    toggleMode,
    focusMode,
    toggleFocusMode,
    setFocusMode,
    autoSaveState,
    setAutoSaveState,
    canShowFeedback,
    canShowMarkScheme,
    canShowHints,
    isTimerActive,
  };

  return (
    <ExamModeContext.Provider value={value}>
      {children}
    </ExamModeContext.Provider>
  );
};

export const useExamMode = (): ExamModeContextType => {
  const context = useContext(ExamModeContext);
  if (context === undefined) {
    throw new Error('useExamMode must be used within an ExamModeProvider');
  }
  return context;
};

export default ExamModeContext;
