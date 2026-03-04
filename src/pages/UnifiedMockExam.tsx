import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wifi, WifiOff } from 'lucide-react';
import UnifiedExamHeader from '@/components/unified-exam/UnifiedExamHeader';
import UnifiedExamSidebar from '@/components/unified-exam/UnifiedExamSidebar';
import QuestionNavigator from '@/components/unified-exam/QuestionNavigator';
import UnifiedQuestionCard from '@/components/unified-exam/UnifiedQuestionCard';
import ExamSyncOverlay from '@/components/unified-exam/ExamSyncOverlay';
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
  mapDBQuestionsToInteractive, 
  detectQuestionType,
  getQuestionTypeLabel 
} from '@/lib/interactiveQuestionMapper';
import type { QuestionType } from '@/data/mocktest2';

import { cn } from '@/lib/utils';

// Inner component that uses the context
const UnifiedMockExamContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();
  
  // Resolve testId from: URL params > query string > location state
  const rawState = location.state || {};
  const resolvedTestId = params.testId || searchParams.get('testId') || rawState.testId;
  const { subject, topic, title, questions: passedQuestions } = rawState;
  
  const [examData, setExamData] = useState<UnifiedExamData | null>(null);
  const [answers, setAnswers] = useState<UnifiedAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [activeSubQuestionId, setActiveSubQuestionId] = useState<string | null>(null);
  const [startTime] = useState(new Date());
  const [hasStartedExam, setHasStartedExam] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  
  // Interactive mode is always ON (Feature E)
  const interactiveMode = true;
  const [detectedQuestionTypes, setDetectedQuestionTypes] = useState<Map<string, QuestionType>>(new Map());
  
  // Get exam mode context
  const { mode, config, focusMode } = useExamMode();
  
  // Get exam sync context (optional - only when wrapped)
  let syncContext: ReturnType<typeof useExamSync> | null = null;
  try {
    syncContext = useExamSync();
  } catch {
    // Not wrapped in ExamSyncProvider - that's okay for demo mode
  }
  
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Auto-save hook
  const { isSaving, lastSaved, saveNow, loadSavedAnswers } = useAutoSave(answers, {
    testId: examData?.id || '',
    enabled: config.autoSaveEnabled
  });

  // Helper to safely parse JSON config
  const safeParseConfig = (config: any) => {
    if (!config) return undefined;
    if (typeof config === 'object') return config;
    try {
      return JSON.parse(config);
    } catch {
      return undefined;
    }
  };

  // Map database questions to unified format with interactive type detection
  const mapDBQuestionsToUnified = (dbQuestions: any[]): UnifiedQuestion[] => {
    const typeMap = new Map<string, QuestionType>();
    
    return dbQuestions.map((q, index) => {
      // Use explicit answer_block_type if provided, otherwise detect
      const explicitType = q.answer_block_type;
      const detectedType = explicitType || detectQuestionType({
        id: q.id,
        question_text: q.question_text,
        marks: q.marks,
        question_number: q.question_number,
        diagram_description: q.diagram_description,
        question_image_url: q.question_image_url,
        answer_key: q.answer_key,
        command_term: q.command_term,
        graph_type: q.graph_type,
        has_table: q.has_table
      });
      
      typeMap.set(q.id, detectedType);
      
      const subQuestions = q.mock_sub_questions?.map((sq: any, sqIndex: number) => {
        // Use explicit sub-question type if provided
        const subExplicitType = sq.answer_block_type;
        const subType = subExplicitType || detectQuestionType({
          id: sq.id,
          question_text: sq.sub_question_text,
          marks: sq.marks,
          question_number: sqIndex + 1,
          answer_key: sq.answer_key,
          command_term: sq.command_term
        });
        
        typeMap.set(sq.id, subType);
        
        return {
          id: sq.id,
          label: sq.sub_question_label || String.fromCharCode(97 + sqIndex), // a, b, c...
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
        // Always fetch from database using resolvedTestId (ignore passedQuestions to avoid subject-wide merging)
        if (resolvedTestId) {
          const { data: questionsData, error } = await supabase
            .from('mock_questions')
            .select(`
              *,
              mock_sub_questions (*)
            `)
            .eq('mock_test_id', resolvedTestId)
            .order('question_number');

          if (error) throw error;

          if (questionsData && questionsData.length > 0) {
            const unifiedQuestions = mapDBQuestionsToUnified(questionsData);
            const totalMarks = unifiedQuestions.reduce((sum, q) => {
              const subMarks = q.subQuestions?.reduce((s, sq) => s + sq.marks, 0) || 0;
              return sum + (q.subQuestions?.length ? subMarks : q.marks);
            }, 0);

            // Get test metadata
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
            // Successfully loaded from DB — skip demo fallback
            return;
          } else {
            // testId exists but no questions found
            toast.error('No questions found for this test. Returning to test list.');
            navigate('/mock-exams/select');
            return;
          }
        }

        // No testId at all — redirect instead of showing demo
        toast.error('Test ID missing. Please start the exam from the Mock Exams list.');
        navigate('/mock-exams/select');
        
      } catch (error) {
        console.error('Error loading exam:', error);
        toast.error('Failed to load exam');
      } finally {
        setIsLoading(false);
      }
    };

    loadExamData();
    // Only re-run when testId changes — NOT on passedQuestions/title/subject (object refs cause loops)
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
      } catch (e) {
        console.error('Failed to load saved answers');
      }
    }
  }, [examData?.id]);

  // Auto-save answers
  useEffect(() => {
    if (!examData) return;
    
    const saveKey = `unifiedExam_${examData.id}`;
    const saveData = () => {
      localStorage.setItem(saveKey, JSON.stringify({ answers }));
    };
    
    const interval = setInterval(saveData, 10000);
    return () => clearInterval(interval);
  }, [answers, examData?.id]);

  // Handle scroll-sync from IntersectionObserver in QuestionNavigator
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

  // Handle answer changes
  const handleAnswerChange = (questionId: string, value: any, subQuestionId?: string) => {
    // Mark exam as started when user types something
    if (!hasStartedExam) {
      setHasStartedExam(true);
    }
    
    setAnswers(prev => {
      const existingIndex = prev.findIndex(
        a => a.questionId === questionId && a.subQuestionId === subQuestionId
      );

      const newAnswer: UnifiedAnswer = {
        questionId,
        subQuestionId,
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

  // Navigate to question
  const handleNavigate = (questionId: string, subQuestionId?: string) => {
    const targetId = subQuestionId ? `question-${questionId}-${subQuestionId}` : `question-${questionId}`;
    const element = document.getElementById(targetId);
    
    if (element && mainContentRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveQuestionId(questionId);
      setActiveSubQuestionId(subQuestionId || null);
    }
  };

  // Toggle flag on question
  const handleToggleFlag = (questionId: string, subQuestionId?: string) => {
    const key = subQuestionId ? `${questionId}-${subQuestionId}` : questionId;
    setFlaggedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Submit exam
  const handleSubmit = async () => {
    if (!examData) return;
    
    // Hard guardrail: block submit without a valid test ID
    const isValidTestId = examData.id && examData.id !== 'demo-exam' && examData.id !== 'dynamic-test';
    if (!isValidTestId) {
      toast.error('Cannot submit: Test ID is missing. Please start the exam from the Mock Exams list.');
      return;
    }
    
    // Save final answers before submitting
    await saveNow();
    
    // Mark session as submitted if sync is active
    if (syncContext) {
      try {
        await syncContext.submitExam();
      } catch (error) {
        console.error('Failed to sync submission:', error);
      }
    }
    
    localStorage.removeItem(`unifiedExam_${examData.id}`);
    
    const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / (1000 * 60));
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      // Save test attempt to database with submission_status = 'submitted'
      const insertPayload = {
        user_id: user.id,
        test_id: examData.id,
        answers: answers as any,
        score: 0, // Will be calculated during evaluation
        total_questions: getTotalQuestionSlots(),
        time_taken_seconds: timeSpent * 60,
        completed_at: new Date().toISOString(),
        submission_status: 'submitted'
      };
      
      const { data: attemptData, error: attemptError } = await supabase
        .from('test_attempts')
        .insert(insertPayload)
        .select()
        .single();

      if (attemptError) {
        console.error('Error saving attempt:', attemptError);
        // Continue anyway to show submitted page
      }

      // Create evaluation record with pending_review status
      if (attemptData) {
        const { error: evalError } = await supabase
          .from('exam_evaluations')
          .insert({
            test_attempt_id: attemptData.id,
            student_id: user.id,
            test_id: examData.id,
            evaluation_status: 'pending_review'
          });

        if (evalError) {
          console.error('Error creating evaluation record:', evalError);
        }
      }

      // Navigate to submitted confirmation page (not summary)
      navigate('/mock-exams/submitted', {
        state: {
          testTitle: examData.title
        }
      });

      toast.success('Exam submitted successfully!');
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to submit exam');
    }
  };
  
  // Sync current question position
  useEffect(() => {
    if (syncContext && activeQuestionId) {
      syncContext.updateCurrentQuestion(activeQuestionId, activeSubQuestionId || undefined);
    }
  }, [activeQuestionId, activeSubQuestionId, syncContext]);

  // Get answered count
  const getAnsweredCount = () => {
    return answers.filter(a => {
      const content = a.content;
      if (typeof content === 'string') return content.trim().length > 0;
      if (typeof content === 'object' && content !== null) return Object.keys(content).length > 0;
      return false;
    }).length;
  };

  // Get total question slots
  const getTotalQuestionSlots = () => {
    if (!examData) return 0;
    return examData.questions.reduce((total, q) => {
      if (q.subQuestions && q.subQuestions.length > 0) {
        return total + q.subQuestions.length;
      }
      return total + 1;
    }, 0);
  };

  if (isLoading || !examData) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-8 bg-white rounded-2xl shadow-xl border"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Loading Exam...
          </h2>
          <p className="text-muted-foreground">Preparing your questions</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn(
      "h-screen flex flex-col bg-background overflow-hidden transition-all",
      focusMode.isActive && "focus-mode-container"
    )}>
      {/* Sync Overlay for paused/locked/secondary tab states */}
      <ExamSyncOverlay onForceNavigate={() => navigate('/mock-exams/select')} />
      
      {/* Header */}
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

      {/* Interactive Mode is always ON - toggle removed (Feature E) */}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigator - visible when focus mode is off */}
        {!focusMode.isActive && (
          <QuestionNavigator
            examData={examData}
            answers={answers}
            activeQuestionId={activeQuestionId}
            activeSubQuestionId={activeSubQuestionId}
            onNavigate={handleNavigate}
            flaggedQuestions={flaggedQuestions}
            onToggleFlag={handleToggleFlag}
            scrollContainerRef={mainContentRef}
          />
        )}

        {/* Scrollable question area */}
        <div 
          ref={mainContentRef}
          className="flex-1 overflow-y-auto"
        >
          <div className="max-w-4xl mx-auto p-6 space-y-8 pb-32">
            {examData.questions.map((question) => (
              <UnifiedQuestionCard
                key={question.id}
                question={question}
                answers={answers}
                onAnswerChange={handleAnswerChange}
                interactiveMode={interactiveMode}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

// Inner wrapper that adds sync when we have a testId
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
  
  // Resolve testId from: URL params > query string > location state
  const resolvedTestId = params.testId || searchParams.get('testId') || (location.state as any)?.testId;
  
  // Guardrail: if no testId and no passed questions, redirect to select page
  const hasPassedQuestions = (location.state as any)?.questions?.length > 0;
  
  if (!resolvedTestId && !hasPassedQuestions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md p-8">
          <div className="text-5xl">⚠️</div>
          <h2 className="text-xl font-bold text-foreground">Test ID Missing</h2>
          <p className="text-muted-foreground">
            Please start the exam from the Mock Exams list. Direct URL access requires a valid test ID.
          </p>
          <button
            onClick={() => navigate('/mock-exams/select')}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Go to Mock Exams
          </button>
        </div>
      </div>
    );
  }
  
  // If we have a valid testId, use sync provider
  if (resolvedTestId && resolvedTestId !== 'dynamic-test' && resolvedTestId !== 'demo-exam') {
    return (
      <ExamModeProvider initialMode="study">
        <UnifiedMockExamWithSync testId={resolvedTestId} />
      </ExamModeProvider>
    );
  }
  
  // Otherwise just render without sync (demo mode)
  return (
    <ExamModeProvider initialMode="study">
      <UnifiedMockExamContent />
    </ExamModeProvider>
  );
};

export default UnifiedMockExam;
