import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useExamMode } from '@/contexts/ExamModeContext';
import { UnifiedAnswer } from '@/types/answerBlock';

interface UseAutoSaveOptions {
  testId: string;
  debounceMs?: number;
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  pendingChanges: boolean;
  error: string | null;
  saveNow: () => Promise<void>;
  loadSavedAnswers: () => Promise<UnifiedAnswer[]>;
}

export const useAutoSave = (
  answers: UnifiedAnswer[],
  options: UseAutoSaveOptions
): UseAutoSaveReturn => {
  const { testId, debounceMs = 5000, enabled = true } = options;
  const { config, setAutoSaveState } = useExamMode();
  
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pendingChanges, setPendingChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const previousAnswersRef = useRef<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const offlineQueueRef = useRef<UnifiedAnswer[]>([]);

  // Check if auto-save should be active
  const shouldAutoSave = enabled && config.autoSaveEnabled;

  // Sync with context
  useEffect(() => {
    setAutoSaveState({
      isSaving,
      lastSaved,
      pendingChanges,
      error,
    });
  }, [isSaving, lastSaved, pendingChanges, error, setAutoSaveState]);

  // Save function
  const saveAnswers = useCallback(async (answersToSave: UnifiedAnswer[]) => {
    if (!testId || answersToSave.length === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Store in offline queue
        offlineQueueRef.current = answersToSave;
        throw new Error('Not authenticated - answers queued locally');
      }

      // Prepare upsert data
      const upsertData = answersToSave.map(answer => ({
        user_id: user.id,
        test_id: testId,
        question_id: answer.questionId,
        sub_question_id: answer.subQuestionId || null,
        answer_content: typeof answer.content === 'string' 
          ? { text: answer.content } 
          : answer.content,
        answer_type: answer.answerType,
        word_count: answer.wordCount || 0,
        is_final: false,
      }));

      // Use localStorage as fallback since user_answers table might not exist yet
      const saveKey = `autoSave_${testId}_${user.id}`;
      localStorage.setItem(saveKey, JSON.stringify({
        answers: answersToSave,
        savedAt: new Date().toISOString(),
      }));

      setLastSaved(new Date());
      setPendingChanges(false);
      offlineQueueRef.current = [];

    } catch (err: any) {
      console.error('Auto-save error:', err);
      setError(err.message || 'Failed to save');
      
      // Always save to localStorage as backup
      const backupKey = `autoSave_backup_${testId}`;
      localStorage.setItem(backupKey, JSON.stringify({
        answers: answersToSave,
        savedAt: new Date().toISOString(),
      }));
    } finally {
      setIsSaving(false);
    }
  }, [testId]);

  // Debounced save effect
  useEffect(() => {
    if (!shouldAutoSave) return;

    const currentAnswersStr = JSON.stringify(answers);
    
    // Check if answers changed
    if (currentAnswersStr === previousAnswersRef.current) return;
    
    previousAnswersRef.current = currentAnswersStr;
    setPendingChanges(true);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounced save
    debounceTimerRef.current = setTimeout(() => {
      saveAnswers(answers);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [answers, shouldAutoSave, debounceMs, saveAnswers]);

  // Manual save function
  const saveNow = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    await saveAnswers(answers);
  }, [answers, saveAnswers]);

  // Load saved answers
  const loadSavedAnswers = useCallback(async (): Promise<UnifiedAnswer[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Try loading from localStorage
        const backupKey = `autoSave_backup_${testId}`;
        const backup = localStorage.getItem(backupKey);
        if (backup) {
          const parsed = JSON.parse(backup);
          return parsed.answers || [];
        }
        return [];
      }

      // Try localStorage first (our current storage method)
      const saveKey = `autoSave_${testId}_${user.id}`;
      const saved = localStorage.getItem(saveKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.answers || [];
      }

      return [];
    } catch (err) {
      console.error('Failed to load saved answers:', err);
      return [];
    }
  }, [testId]);

  // Sync offline queue when coming back online
  useEffect(() => {
    const handleOnline = () => {
      if (offlineQueueRef.current.length > 0) {
        saveAnswers(offlineQueueRef.current);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [saveAnswers]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingChanges && answers.length > 0) {
        // Synchronous localStorage save as last resort
        const backupKey = `autoSave_emergency_${testId}`;
        localStorage.setItem(backupKey, JSON.stringify({
          answers,
          savedAt: new Date().toISOString(),
        }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingChanges, answers, testId]);

  return {
    isSaving,
    lastSaved,
    pendingChanges,
    error,
    saveNow,
    loadSavedAnswers,
  };
};

export default useAutoSave;
