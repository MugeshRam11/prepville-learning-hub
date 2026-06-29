import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import UnifiedExamHeader from '@/components/unified-exam/UnifiedExamHeader';
import QuestionNavigator from '@/components/unified-exam/QuestionNavigator';
import ExamSourcePanel from '@/components/unified-exam/ExamSourcePanel';
import ExamQuestionCardsPanel from '@/components/unified-exam/ExamQuestionCardsPanel';
import ExamSyncOverlay from '@/components/unified-exam/ExamSyncOverlay';
import ExamLockdown from '@/components/unified-exam/ExamLockdown';
import { ExamModeProvider, useExamMode } from '@/contexts/ExamModeContext';
import { ExamSyncProvider, useExamSync } from '@/contexts/ExamSyncContext';
import { useAutoSave } from '@/hooks/useAutoSave';

import { 
  UnifiedExamData, 
  UnifiedQuestion, 
  UnifiedAnswer,
  getDefaultAnswerBlockType 
} from '@/types/answerBlock';

import { 
  detectQuestionType,
} from '@/lib/interactiveQuestionMapper';
import type { QuestionType } from '@/data/mocktest2';

import { cn } from '@/lib/utils';

// Inner component that uses the context
const UnifiedMockExamContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();
  
  const rawState = location.state || {};
  const resolvedTestId = params.testId || searchParams.get('testId') || rawState.testId;
  const { subject, topic, title } = rawState;
  
  const [examData, setExamData] = useState<UnifiedExamData | null>(null);
  const [answers, setAnswers] = useState<UnifiedAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [activeSubQuestionId, setActiveSubQuestionId] = useState<string | null>(null);
  const [startTime] = useState(new Date());
  const [hasStartedExam, setHasStartedExam] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  
  const interactiveMode = true;
  
  const { mode, config, focusMode } = useExamMode();
  
  let syncContext: ReturnType<typeof useExamSync> | null = null;
  try {
    syncContext = useExamSync();
  } catch {
    // Not wrapped in ExamSyncProvider
  }
  
  const rightPanelRef = useRef<HTMLDivElement>(null);

  const { isSaving, lastSaved, saveNow, loadSavedAnswers } = useAutoSave(answers, {
    testId: examData?.id || '',
    enabled: config.autoSaveEnabled
  });

  const safeParseConfig = (cfg: any) => {
    if (!cfg) return undefined;
    if (typeof cfg === 'object') return cfg;
    try { return JSON.parse(cfg); } catch { return undefined; }
  };

  const mapDBQuestionsToUnified = (dbQuestions: any[]): UnifiedQuestion[] => {
    return dbQuestions.map((q, index) => {
      const explicitType = q.answer_block_type;
      const detectedType = explicitType || detectQuestionType({
        id: q.id, question_text: q.question_text, marks: q.marks,
        question_number: q.question_number, diagram_description: q.diagram_description,
        question_image_url: q.question_image_url, answer_key: q.answer_key,
        command_term: q.command_term, graph_type: q.graph_type, has_table: q.has_table
      });
      
      const sortedSubs = [...(q.mock_sub_questions || [])].sort((a: any, b: any) => 
        (a.sub_question_label || '').localeCompare(b.sub_question_label || '', undefined, { numeric: true })
      );
      const subQuestions = sortedSubs.map((sq: any, sqIndex: number) => {
        const subType = sq.answer_block_type || detectQuestionType({
          id: sq.id, question_text: sq.sub_question_text, marks: sq.marks,
          question_number: sqIndex + 1, answer_key: sq.answer_key, command_term: sq.command_term
        });
        
        return {
          id: sq.id,
          label: sq.sub_question_label || String.fromCharCode(97 + sqIndex),
          text: sq.sub_question_text,
          imageUrl: sq.sub_question_image_url,
          marks: sq.marks || 1,
          commandTerm: sq.command_term,
          wordLimit: sq.word_limit,
          answerKey: sq.answer_key,
          answerBlockType: sq.answer_block_type || getDefaultAnswerBlockType(),
          answerBlockConfig: safeParseConfig(sq.answer_block_config),
          interactiveType: subType
        };
      }) || [];

      return {
        id: q.id,
        questionNumber: q.question_number || index + 1,
        questionText: q.question_text,
        questionImageUrl: q.question_image_url,
        marks: q.marks || 1,
        commandTerm: q.command_term,
        category: q.category,
        difficulty: q.difficulty,
        wordLimit: q.word_limit,
        answerKey: q.answer_key,
        diagramDescription: q.diagram_description,
        answerBlockType: q.answer_block_type || getDefaultAnswerBlockType(),
        answerBlockConfig: safeParseConfig(q.answer_block_config),
        subQuestions,
        interactiveType: detectedType
      };
    });
  };

  // Load exam data
  useEffect(() => {
    const loadExamData = async () => {
      setIsLoading(true);
      try {
        if (resolvedTestId) {
          const { data: questionsData, error } = await supabase
            .from('mock_questions')
            .select(`*, mock_sub_questions (*)`)
            .eq('mock_test_id', resolvedTestId)
            .order('question_number');

          if (error) throw error;

          if (questionsData && questionsData.length > 0) {
            const unifiedQuestions = mapDBQuestionsToUnified(questionsData);
            const totalMarks = unifiedQuestions.reduce((sum, q) => {
              const subMarks = q.subQuestions?.reduce((s, sq) => s + sq.marks, 0) || 0;
              return sum + (q.subQuestions?.length ? subMarks : q.marks);
            }, 0);

            const { data: testMeta } = await supabase
              .from('mock_tests')
              .select('title, subject, topic')
              .eq('id', resolvedTestId)
              .single();
            
            setExamData({
              id: resolvedTestId,
              title: testMeta?.title || title || 'Mock Examination',
              subject: testMeta?.subject || subject || 'Mathematics',
              topic: testMeta?.topic || topic,
              duration: 120,
              totalMarks,
              questions: unifiedQuestions
            });

            if (unifiedQuestions.length > 0) {
              setActiveQuestionId(unifiedQuestions[0].id);
              if (unifiedQuestions[0].subQuestions?.length) {
                setActiveSubQuestionId(unifiedQuestions[0].subQuestions[0].id);
              }
            }
            return;
          } else {
            toast.error('No questions found for this test.');
            navigate('/mock-exams/select');
            return;
          }
        }

        toast.error('Test ID missing. Please start from Mock Exams list.');
        navigate('/mock-exams/select');
      } catch (error) {
        console.error('Error loading exam:', error);
        toast.error('Failed to load exam');
      } finally {
        setIsLoading(false);
      }
    };

    loadExamData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTestId]);

  // Load saved answers
  useEffect(() => {
    if (!examData) return;
    const saveKey = `unifiedExam_${examData.id}`;
    const savedData = localStorage.getItem(saveKey);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setAnswers(parsed.answers || []);
      } catch (e) { console.error('Failed to load saved answers'); }
    }
  }, [examData?.id]);

  // Auto-save
  useEffect(() => {
    if (!examData) return;
    const saveKey = `unifiedExam_${examData.id}`;
    const interval = setInterval(() => {
      localStorage.setItem(saveKey, JSON.stringify({ answers }));
    }, 10000);
    return () => clearInterval(interval);
  }, [answers, examData?.id]);

  // Scroll-sync from IntersectionObserver
  useEffect(() => {
    const handleScrollSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setActiveQuestionId(detail.questionId);
        setActiveSubQuestionId(detail.subQuestionId || null);
      }
    };
    window.addEventListener('exam-scroll-sync', handleScrollSync);
    return () => window.removeEventListener('exam-scroll-sync', handleScrollSync);
  }, []);

  const handleAnswerChange = (questionId: string, value: any, subQuestionId?: string) => {
    if (!hasStartedExam) setHasStartedExam(true);
    
    setAnswers(prev => {
      const existingIndex = prev.findIndex(
        a => a.questionId === questionId && a.subQuestionId === subQuestionId
      );
      const newAnswer: UnifiedAnswer = {
        questionId, subQuestionId,
        answerType: getDefaultAnswerBlockType(),
        content: value,
        wordCount: typeof value === 'string' ? value.trim().split(/\s+/).filter(Boolean).length : 0,
        timestamp: new Date()
      };
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newAnswer;
        return updated;
      }
      return [...prev, newAnswer];
    });
  };

  const handleNavigate = (questionId: string, subQuestionId?: string) => {
    setActiveQuestionId(questionId);
    setActiveSubQuestionId(subQuestionId || null);

    requestAnimationFrame(() => {
      const container = rightPanelRef.current;
      if (!container) return;

      const targetId = subQuestionId
        ? `question-${questionId}-${subQuestionId}`
        : `question-${questionId}`;

      const target = document.getElementById(targetId);
      if (!target || !container.contains(target)) return;

      const topOffset = 16;
      const nextTop = Math.max(target.offsetTop - topOffset, 0);

      container.scrollTo({
        top: nextTop,
        behavior: 'smooth',
      });
    });
  };

  const handleToggleFlag = (questionId: string, subQuestionId?: string) => {
    const key = subQuestionId ? `${questionId}-${subQuestionId}` : questionId;
    setFlaggedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!examData) return;
    
    const isValidTestId = examData.id && examData.id !== 'demo-exam' && examData.id !== 'dynamic-test';
    if (!isValidTestId) {
      toast.error('Cannot submit: Test ID is missing.');
      return;
    }
    
    await saveNow();
    
    if (syncContext) {
      try { await syncContext.submitExam(); } catch (error) {
        console.error('Failed to sync submission:', error);
      }
    }
    
    localStorage.removeItem(`unifiedExam_${examData.id}`);
    const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / (1000 * 60));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Not authenticated'); return; }

      const { data: attemptData, error: attemptError } = await supabase
        .from('test_attempts')
        .insert({
          user_id: user.id, test_id: examData.id, answers: answers as any,
          score: 0, total_questions: getTotalQuestionSlots(),
          time_taken_seconds: timeSpent * 60,
          completed_at: new Date().toISOString(), submission_status: 'submitted'
        })
        .select().single();

      if (attemptError || !attemptData) {
        toast.error(`Failed to save submission: ${attemptError?.message || 'No data returned'}`);
        return;
      }

      await supabase.from('exam_evaluations').insert({
        test_attempt_id: attemptData.id, student_id: user.id,
        test_id: examData.id, evaluation_status: 'pending_review'
      });

      navigate('/mock-exams/submitted', {
        state: { testTitle: examData.title, attemptId: attemptData.id }
      });
      toast.success('Exam submitted successfully!');
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to submit exam');
    }
  };
  
  useEffect(() => {
    if (syncContext && activeQuestionId) {
      syncContext.updateCurrentQuestion(activeQuestionId, activeSubQuestionId || undefined);
    }
  }, [activeQuestionId, activeSubQuestionId, syncContext]);

  const getAnsweredCount = () => {
    return answers.filter(a => {
      const content = a.content;
      if (typeof content === 'string') return content.trim().length > 0;
      if (typeof content === 'object' && content !== null) return Object.keys(content).length > 0;
      return false;
    }).length;
  };

  const getTotalQuestionSlots = () => {
    if (!examData) return 0;
    return examData.questions.reduce((total, q) => {
      if (q.subQuestions && q.subQuestions.length > 0) return total + q.subQuestions.length;
      return total + 1;
    }, 0);
  };

  // Get active question object
  const activeQuestion = examData?.questions.find(q => q.id === activeQuestionId) || null;

  const handleLockdownViolation = useCallback((type: string, count: number) => {
    toast.warning(`Security violation: ${type} (${count})`);
  }, []);

  const handleMaxViolations = useCallback(() => {
    toast.error('Maximum violations reached — auto-submitting exam');
    handleSubmit();
  }, [handleSubmit]);

  const loadingScreen = (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-violet-50 to-sky-100 dark:from-indigo-950/30 dark:via-violet-950/20 dark:to-sky-950/30">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center p-10 bg-background/90 backdrop-blur rounded-2xl shadow-2xl border"
      >
        <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-violet-500 via-indigo-500 to-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-white/30 border-t-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
          Loading Exam...
        </h2>
        <p className="text-muted-foreground text-sm">Preparing your questions</p>
      </motion.div>
    </div>
  );

  return (
    <ExamLockdown
      enabled={true}
      onViolation={handleLockdownViolation}
      maxViolations={3}
      onMaxViolations={handleMaxViolations}
    >
      {isLoading || !examData ? loadingScreen : (
        <div className={cn(
          "h-screen flex flex-col bg-background overflow-hidden transition-all",
          focusMode.isActive && "focus-mode-container"
        )}>
          <ExamSyncOverlay onForceNavigate={() => navigate('/mock-exams/select')} />

          <UnifiedExamHeader
            title={examData.title}
            subject={examData.subject}
            duration={examData.duration}
            totalMarks={examData.totalMarks}
            answeredCount={getAnsweredCount()}
            totalQuestions={examData.questions.length}
            totalParts={getTotalQuestionSlots()}
            answeredParts={getAnsweredCount()}
            onSubmit={handleSubmit}
            hasStartedExam={hasStartedExam}
            isConnected={syncContext?.isConnected}
          />

          {/* Split layout: Navigator | Source Panel | Question Cards */}
          <div className="flex-1 min-h-0 grid grid-cols-[auto_1fr] lg:grid-cols-[auto_minmax(300px,2fr)_minmax(300px,2.4fr)] overflow-hidden">
            {/* Left: Question Navigator */}
            {!focusMode.isActive && (
              <QuestionNavigator
                examData={examData}
                answers={answers}
                activeQuestionId={activeQuestionId}
                activeSubQuestionId={activeSubQuestionId}
                onNavigate={handleNavigate}
                flaggedQuestions={flaggedQuestions}
                onToggleFlag={handleToggleFlag}
                scrollContainerRef={rightPanelRef}
              />
            )}

            {/* Center: Source / Extract Panel — visible on lg+ */}
            <ExamSourcePanel
              question={activeQuestion}
              className="hidden lg:flex border-r border-border min-h-0"
            />

            {/* Right: Sub-question Cards */}
            <ExamQuestionCardsPanel
              question={activeQuestion}
              answers={answers}
              onAnswerChange={handleAnswerChange}
              activeSubQuestionId={activeSubQuestionId}
              scrollRef={rightPanelRef}
              className="min-w-0 min-h-0"
            />
          </div>
        </div>
      )}
    </ExamLockdown>
  );
};

// Inner wrapper with sync
const UnifiedMockExamWithSync: React.FC<{ testId: string }> = ({ testId }) => {
  const navigate = useNavigate();
  
  return (
    <ExamSyncProvider
      testId={testId}
      onForceSubmit={() => {
        toast.warning('Exam submitted by administrator');
        navigate('/mock-exams/summary');
      }}
      onExamCancelled={() => {
        navigate('/mock-exams/select');
      }}
    >
      <UnifiedMockExamContent />
    </ExamSyncProvider>
  );
};

// Main component with provider wrapper
const UnifiedMockExam = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  
  const resolvedTestId = params.testId || searchParams.get('testId') || (location.state as any)?.testId;
  const hasPassedQuestions = (location.state as any)?.questions?.length > 0;
  
  if (!resolvedTestId && !hasPassedQuestions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/20 dark:via-orange-950/10 dark:to-rose-950/20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-5 max-w-md p-8 bg-background/90 backdrop-blur rounded-2xl shadow-xl border"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Test ID Missing</h2>
          <p className="text-muted-foreground text-sm">
            Please start the exam from the Mock Exams list.
          </p>
          <Button
            onClick={() => navigate('/mock-exams/select')}
            className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white rounded-xl shadow-md shadow-violet-500/20"
          >
            Go to Mock Exams
          </Button>
        </motion.div>
      </div>
    );
  }
  
  if (resolvedTestId && resolvedTestId !== 'dynamic-test' && resolvedTestId !== 'demo-exam') {
    return (
      <ExamModeProvider initialMode="study">
        <UnifiedMockExamWithSync testId={resolvedTestId} />
      </ExamModeProvider>
    );
  }
  
  return (
    <ExamModeProvider initialMode="study">
      <UnifiedMockExamContent />
    </ExamModeProvider>
  );
};

export default UnifiedMockExam;
