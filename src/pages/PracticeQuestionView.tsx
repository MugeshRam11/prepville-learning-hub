import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  MessageSquare,
  Lightbulb,
  Loader2,
  Circle,
  ChevronRight,
  ChevronLeft,
  Save,
  Send,
  Lock,
  Clock,
  Award
} from 'lucide-react';
import Header from '@/components/Header';
import { ExamModeProvider } from '@/contexts/ExamModeContext';
import { EnhancedAITutor } from '@/components/EnhancedAITutor';
import InteractiveAnswerBlock from '@/components/unified-exam/InteractiveAnswerBlock';
import { renderFinalText as renderLatexContent } from '@/lib/renderFinalText';
import AIFeedbackButton from '@/components/unified-exam/AIFeedbackButton';
import AIFeedbackPanel from '@/components/unified-exam/AIFeedbackPanel';
import { AIFeedbackResponse } from '@/types/examMode';
import { cn } from '@/lib/utils';
import { getPreviewText } from '@/lib/mathFormat';

interface SubQuestion {
  id: string;
  label: string;
  marks: number;
  answer_type: string;
  answer_block_config: any;
  sub_question_text: string;
  sub_question_image_url: string | null;
  order_index: number;
}

interface QuestionDetails {
  id: string;
  title: string;
  topic: string;
  strand: string;
  myp_year: string;
  difficulty: string;
  question_type: string;
  question_text: string;
  image_url: string | null;
  marks: number;
  sub_questions: SubQuestion[];
}

interface RevealedSolution {
  part_label: string | null;
  answer_key: string | null;
  solution: string | null;
  marking_rubric: any;
}

const difficultyBadgeColors: Record<string, string> = {
  easy: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
  medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  hard: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800'
};

const PracticeQuestionView: React.FC = () => {
  const { questionId, setId } = useParams<{ questionId?: string; setId?: string }>();
  const navigate = useNavigate();

  const [resolvedQuestionId, setResolvedQuestionId] = useState<string | null>(questionId || null);
  const [data, setData] = useState<QuestionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Practice Engine Session State (PV-18)
  const [, setSessionId] = useState<string | null>(null);
  const [sessionQuestionId, setSessionQuestionId] = useState<string | null>(null);
  const [attemptStatus, setAttemptStatus] = useState<string>('unattempted'); // 'unattempted' | 'draft' | 'submitted' | 'evaluated'
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState<number>(0);

  // Autosave and Submission
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Revealed Solutions (P0-01 post-submission only)
  const [revealedSolutions, setRevealedSolutions] = useState<RevealedSolution[]>([]);
  const [loadingSolutions, setLoadingSolutions] = useState(false);

  // Selected Sub-question (if multi-part)
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  // Mode and Tutor
  const [mode, setMode] = useState<'exam' | 'study'>('study');
  const [showTutor, setShowTutor] = useState(false);
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<AIFeedbackResponse | null>(null);
  const [aiFeedbackLoading, setAiFeedbackLoading] = useState(false);

  // Fetch solution via secure RPC (P0-01)
  const fetchSolution = useCallback(async (sqId: string) => {
    setLoadingSolutions(true);
    try {
      const { data: solRows, error } = await supabase.rpc('get_practice_question_solution', {
        p_session_question_id: sqId
      });

      if (error) {
        console.warn('Could not load solution:', error.message);
        return;
      }

      setRevealedSolutions((solRows as RevealedSolution[]) || []);
    } catch (err) {
      console.error('Error fetching solution:', err);
    } finally {
      setLoadingSolutions(false);
    }
  }, []);

  // 1. Resolve Question ID from legacy setId if needed
  useEffect(() => {
    const resolveId = async () => {
      if (questionId) {
        setResolvedQuestionId(questionId);
        return;
      }
      if (setId) {
        try {
          const { data: mapRows } = await supabase
            .from('legacy_question_id_map')
            .select('new_id')
            .eq('legacy_id', setId)
            .limit(1);

          if (mapRows && mapRows.length > 0 && mapRows[0].new_id) {
            setResolvedQuestionId(mapRows[0].new_id);
            return;
          }

          toast.error('Legacy practice set could not be mapped to question bank.');
          navigate('/practice');
        } catch (e) {
          console.error('Error resolving legacy set ID:', e);
          navigate('/practice');
        }
      }
    };
    resolveId();
  }, [questionId, setId, navigate]);

  // 2. Fetch Question and Subquestions from Question Bank
  useEffect(() => {
    if (!resolvedQuestionId) return;

    const loadQuestionData = async () => {
      setIsLoading(true);
      try {
        const { data: qb, error: qbErr } = await supabase
          .from('question_bank')
          .select('*')
          .eq('id', resolvedQuestionId)
          .single();

        if (qbErr || !qb) {
          throw new Error('Question not found or access unauthorized.');
        }

        // Fetch subquestions if multi-part
        let subqs: SubQuestion[] = [];
        if (qb.question_type === 'multi_part') {
          const { data: subData, error: subErr } = await supabase
            .from('question_subquestions')
            .select('id, label, sub_question_text, sub_question_image_url, answer_type, answer_config, marks, order_index')
            .eq('question_id', resolvedQuestionId)
            .order('order_index');

          if (!subErr && subData) {
            subqs = subData.map((sq: any) => ({
              id: sq.id,
              label: sq.label || 'a',
              marks: sq.marks || 1,
              answer_type: sq.answer_type || 'text_equation',
              answer_block_config: { type: (sq.answer_type as any) || 'text_equation', ...(sq.answer_config as any || {}) },
              sub_question_text: sq.sub_question_text || '',
              sub_question_image_url: sq.sub_question_image_url,
              order_index: sq.order_index || 0
            }));
          }
        }

        // If not multi-part or no subquestions found, create a pseudo sub-question for unified workspace
        if (subqs.length === 0) {
          subqs = [
            {
              id: qb.id,
              label: '1',
              marks: qb.marks || 1,
              answer_type: qb.question_type || 'text_equation',
              answer_block_config: { type: (qb.question_type as any) || 'text_equation' },
              sub_question_text: qb.question_text || '',
              sub_question_image_url: qb.image_url,
              order_index: 0
            }
          ];
        }

        setData({
          id: qb.id,
          title: qb.subtopic || qb.topic || 'Practice Question',
          topic: qb.topic || 'Mathematics',
          strand: qb.strand || 'Mathematics',
          myp_year: qb.myp_year || 'Year 5',
          difficulty: qb.difficulty || 'medium',
          question_type: qb.question_type || 'numeric',
          question_text: qb.question_text || '',
          image_url: qb.image_url,
          marks: qb.marks || 1,
          sub_questions: subqs
        });

        setSelectedSubId(subqs[0].id);

        // 3. Initialize/Resume Single Question Practice Attempt (PV-18)
        const { data: attemptRows, error: attemptErr } = await supabase.rpc(
          'start_single_question_attempt',
          { p_question_id: resolvedQuestionId }
        );

        if (attemptErr) {
          console.warn('Could not initialize practice session attempt via RPC:', attemptErr.message);
        } else if (attemptRows && attemptRows.length > 0) {
          const att = attemptRows[0];
          setSessionId(att.session_id);
          setSessionQuestionId(att.session_question_id);
          setAttemptStatus(att.attempt_status || 'unattempted');
          setTimeSpentSeconds(att.time_spent_seconds || 0);

          if (att.saved_answer) {
            try {
              const parsed = JSON.parse(att.saved_answer);
              setAnswers(typeof parsed === 'object' ? parsed : { [subqs[0].id]: att.saved_answer });
            } catch {
              setAnswers({ [subqs[0].id]: att.saved_answer });
            }
          }

          // If already submitted, fetch solution immediately
          if (att.attempt_status === 'submitted' || att.attempt_status === 'evaluated') {
            fetchSolution(att.session_question_id);
          }
        }
      } catch (err: any) {
        console.error('Failed to load practice question:', err);
        toast.error(err.message || 'Failed to load question');
        navigate('/practice');
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestionData();
  }, [resolvedQuestionId, navigate, fetchSolution]);

  // Timer for time spent tracking
  useEffect(() => {
    if (attemptStatus === 'submitted' || attemptStatus === 'evaluated') return;
    const interval = setInterval(() => {
      setTimeSpentSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [attemptStatus]);

  // Autosave Draft Answer
  const saveDraft = useCallback(
    async (currentAnswers: Record<string, any>) => {
      if (!sessionQuestionId || attemptStatus === 'submitted' || attemptStatus === 'evaluated') {
        return;
      }
      setIsSaving(true);
      try {
        const payload = JSON.stringify(currentAnswers);
        await supabase.rpc('save_practice_draft_answer', {
          p_session_question_id: sessionQuestionId,
          p_answer: payload,
          p_time_spent_seconds: timeSpentSeconds
        });
      } catch (err) {
        console.warn('Autosave failed:', err);
      } finally {
        setIsSaving(false);
      }
    },
    [sessionQuestionId, attemptStatus, timeSpentSeconds]
  );

  const handleAnswerChange = useCallback(
    (subId: string, value: any) => {
      setAnswers((prev) => {
        const updated = { ...prev, [subId]: value };
        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = setTimeout(() => {
          saveDraft(updated);
        }, 1500);
        return updated;
      });
    },
    [saveDraft]
  );

  // Submit Answer (P0-01)
  const handleSubmit = async () => {
    if (!sessionQuestionId) {
      toast.error('Session not initialized');
      return;
    }

    const currentSubId = selectedSubId || data?.sub_questions[0]?.id || '';
    const currentVal = answers[currentSubId];

    if (!currentVal && Object.keys(answers).length === 0) {
      toast.info('Please write or construct your answer before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const answerPayload =
        typeof currentVal === 'string' && data?.sub_questions.length === 1
          ? currentVal
          : JSON.stringify(answers);

      const { data: submitResult, error } = await supabase.rpc('submit_practice_question_answer', {
        p_session_question_id: sessionQuestionId,
        p_answer: answerPayload,
        p_time_spent_seconds: timeSpentSeconds
      });

      if (error) throw error;

      const res = submitResult?.[0];
      setAttemptStatus('submitted');
      setIsCorrect(res?.is_correct ?? null);

      toast.success(
        res?.is_correct === true
          ? 'Correct! Solution and marking breakdown unlocked.'
          : res?.is_correct === false
          ? 'Answer submitted. Review the official solution below.'
          : 'Answer submitted successfully!'
      );

      // Now fetch solutions via secure RPC
      await fetchSolution(sessionQuestionId);
    } catch (err: any) {
      console.error('Submission failed:', err);
      toast.error(err.message || 'Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSub = useMemo(
    () => data?.sub_questions.find((sq) => sq.id === selectedSubId) || data?.sub_questions[0] || null,
    [data, selectedSubId]
  );

  const answeredCount = useMemo(
    () =>
      Object.keys(answers).filter((k) => {
        const v = answers[k];
        if (!v) return false;
        if (typeof v === 'string') return v.trim().length > 0;
        if (typeof v === 'object') return Object.keys(v).length > 0;
        return true;
      }).length,
    [answers]
  );

  const totalCount = data?.sub_questions.length || 1;
  const progressPercentage = (answeredCount / totalCount) * 100;

  // AI Feedback Handler
  const handleAIFeedback = useCallback(async () => {
    if (!selectedSub) return;
    const userAnswer = answers[selectedSub.id];
    if (!userAnswer) {
      toast.info('Write an answer first');
      return;
    }

    setAiFeedbackLoading(true);
    setShowAIFeedback(true);
    try {
      const solutionMatch = revealedSolutions.find(
        (s) => s.part_label === selectedSub.label || !s.part_label
      );

      const { data: fbData, error } = await supabase.functions.invoke('ai-feedback', {
        body: {
          questionText: selectedSub.sub_question_text || data?.question_text,
          studentAnswer: typeof userAnswer === 'object' && userAnswer?.text ? userAnswer.text : String(userAnswer),
          answerKey: solutionMatch?.answer_key || '',
          commandTerm: 'calculate',
          marks: selectedSub.marks
        }
      });
      if (error) throw error;
      setAiFeedback(fbData as AIFeedbackResponse);
    } catch (err) {
      console.error(err);
      toast.error('Failed to get AI feedback');
    } finally {
      setAiFeedbackLoading(false);
    }
  }, [selectedSub, answers, revealedSolutions, data]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 bg-card rounded-2xl shadow-lg border max-w-sm w-full">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
            <h2 className="text-base font-bold text-foreground">Loading Mathematics Question...</h2>
            <p className="text-xs text-muted-foreground mt-1">Connecting to Question Bank</p>
          </div>
        </main>
      </div>
    );
  }

  if (!data) return null;

  const currentIdx = data.sub_questions.findIndex((sq) => sq.id === selectedSubId);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < data.sub_questions.length - 1;
  const isSubmitted = attemptStatus === 'submitted' || attemptStatus === 'evaluated';

  return (
    <ExamModeProvider initialMode={mode === 'study' ? 'study' : 'examination'}>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Top Navbar */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b shadow-sm">
          <div className="px-4 py-2.5 max-w-7xl mx-auto flex items-center justify-between gap-4">
            {/* Left: Back + Question Meta */}
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/practice')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm truncate">{data.title}</span>
                  <Badge variant="outline" className="text-[11px] font-mono px-1.5 py-0">
                    {data.myp_year}
                  </Badge>
                  <Badge className={cn('text-[11px] capitalize border px-1.5 py-0', difficultyBadgeColors[data.difficulty])}>
                    {data.difficulty}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">{data.strand}</span>
                  <ChevronRight className="w-3 h-3" />
                  <span>{data.topic}</span>
                </div>
              </div>
            </div>

            {/* Center: Save / Time status */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {Math.floor(timeSpentSeconds / 60)}:{(timeSpentSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>

              {isSaving && (
                <div className="flex items-center gap-1 text-xs text-amber-600 font-medium animate-pulse">
                  <Save className="w-3.5 h-3.5" />
                  <span>Autosaving...</span>
                </div>
              )}
            </div>

            {/* Right: Controls & Study / Exam Mode */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full border bg-muted/40">
                {mode === 'study' ? (
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                ) : (
                  <GraduationCap className="w-4 h-4 text-primary" />
                )}
                <Label htmlFor="mode-toggle" className="text-xs font-medium cursor-pointer">
                  {mode === 'study' ? 'Study' : 'Exam'}
                </Label>
                <Switch
                  id="mode-toggle"
                  checked={mode === 'study'}
                  onCheckedChange={(checked) => setMode(checked ? 'study' : 'exam')}
                />
              </div>

              {mode === 'study' && (
                <>
                  <AIFeedbackButton
                    questionId={selectedSub?.id || data.id}
                    hasAnswer={!!selectedSub && !!answers[selectedSub.id]}
                    isLoading={aiFeedbackLoading}
                    onClick={handleAIFeedback}
                  />
                  <Button variant="outline" size="sm" onClick={() => setShowTutor(true)} className="gap-1 h-8 text-xs">
                    <MessageSquare className="w-3.5 h-3.5" /> Tutor
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Workspace Layout */}
        <div className="flex-1 flex overflow-hidden min-h-0" style={{ height: 'calc(100vh - 53px)' }}>
          {/* Subquestions Navigator Sidebar (if multi-part) */}
          {data.sub_questions.length > 1 && (
            <aside className="hidden lg:flex lg:flex-col w-64 border-r bg-card flex-shrink-0 min-h-0 overflow-hidden">
              <div className="p-3 border-b space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Sub-Parts
                  </span>
                  <Badge variant="secondary" className="text-xs font-mono">
                    {answeredCount}/{totalCount}
                  </Badge>
                </div>
                <Progress value={progressPercentage} className="h-1.5" />
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {data.sub_questions.map((sq) => (
                  <button
                    key={sq.id}
                    onClick={() => setSelectedSubId(sq.id)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-2 group',
                      selectedSubId === sq.id
                        ? 'bg-indigo-500/10 text-indigo-600 font-semibold border-l-[3px] border-l-indigo-600'
                        : 'hover:bg-muted text-muted-foreground border-l-[3px] border-l-transparent'
                    )}
                  >
                    {answers[sq.id] ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="font-mono font-bold">({sq.label})</span>
                    <span className="line-clamp-1 flex-1">{getPreviewText(sq.sub_question_text, 25)}</span>
                    <span className="font-mono text-[11px] shrink-0">{sq.marks}m</span>
                  </button>
                ))}
              </div>
            </aside>
          )}

          {/* Main 2-Column Split: Question vs Answer Workspace */}
          <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
            {/* LEFT: Question Prompt Panel */}
            <div className="min-w-0 min-h-0 overflow-y-auto border-b lg:border-b-0 lg:border-r bg-background p-6 space-y-5">
              {/* Question Header Card */}
              <Card className="border border-border/80 shadow-sm">
                <CardHeader className="p-4 pb-3 bg-muted/20 border-b flex flex-row items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                    Problem Statement
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    {data.marks} Marks Total
                  </span>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="prose prose-sm max-w-none dark:prose-invert font-serif text-sm leading-relaxed">
                    {renderLatexContent(data.question_text)}
                  </div>

                  {data.image_url && (
                    <div className="rounded-xl border overflow-hidden max-w-lg mx-auto bg-white p-2">
                      <img
                        src={data.image_url}
                        alt="Question diagram"
                        className="max-h-72 object-contain mx-auto"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sub-question Detail (if multi-part) */}
              {selectedSub && data.sub_questions.length > 1 && (
                <Card className="border border-indigo-200/60 dark:border-indigo-900/60 shadow-sm">
                  <CardHeader className="p-4 pb-2 bg-indigo-50/30 dark:bg-indigo-950/20 border-b flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-indigo-600 text-white text-xs font-bold flex items-center justify-center font-mono">
                        {selectedSub.label}
                      </span>
                      <span className="text-xs font-semibold text-foreground">Part ({selectedSub.label})</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono">
                      {selectedSub.marks} {selectedSub.marks === 1 ? 'mark' : 'marks'}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    <div className="prose prose-sm max-w-none dark:prose-invert font-serif text-sm leading-relaxed">
                      {renderLatexContent(selectedSub.sub_question_text)}
                    </div>
                    {selectedSub.sub_question_image_url && (
                      <div className="rounded-xl border overflow-hidden max-w-sm mx-auto bg-white p-2">
                        <img
                          src={selectedSub.sub_question_image_url}
                          alt="Subquestion illustration"
                          className="max-h-60 object-contain mx-auto"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* RIGHT: Answer Workspace & Solutions */}
            <div className="min-w-0 min-h-0 overflow-y-auto bg-muted/10 p-6 space-y-5 flex flex-col justify-between">
              <div className="space-y-5">
                {/* Answer Input Block */}
                <Card className="border border-border/80 shadow-sm">
                  <CardHeader className="p-4 pb-3 border-b flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <span>Your Mathematical Solution</span>
                        {isSubmitted && (
                          <Badge
                            className={cn(
                              'text-[10px]',
                              isCorrect === true
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            )}
                          >
                            {isCorrect === true ? 'Evaluated Correct' : 'Submitted'}
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Use the equation toolbar or type LaTeX syntax directly.
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={isSubmitting || isSubmitted}
                      className={cn(
                        'h-8 text-xs font-medium gap-1.5 shadow-sm',
                        isSubmitted ? 'bg-muted text-muted-foreground' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      )}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Submitting...
                        </>
                      ) : isSubmitted ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          Submitted
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Submit Answer
                        </>
                      )}
                    </Button>
                  </CardHeader>

                  <CardContent className="p-4">
                    {selectedSub && (
                      <InteractiveAnswerBlock
                        key={`${selectedSub.id}-${selectedSub.answer_type}`}
                        questionId={selectedSub.id}
                        subQuestionId={selectedSub.id}
                        detectedType={selectedSub.answer_type as any}
                        config={selectedSub.answer_block_config || { type: 'text_equation' }}
                        value={answers[selectedSub.id] || ''}
                        onChange={(val) => handleAnswerChange(selectedSub.id, val)}
                        disabled={isSubmitted}
                        allowTypeChange={false}
                        questionText={selectedSub.sub_question_text}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Solution Reveal Panel (P0-01 Protected) */}
                <Card className="border border-border/80 shadow-sm overflow-hidden">
                  <CardHeader className="p-4 pb-3 bg-muted/30 border-b flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      <span>Official Solution & Marking Guide</span>
                    </CardTitle>
                    {!isSubmitted && (
                      <Badge variant="outline" className="text-[11px] gap-1 text-muted-foreground">
                        <Lock className="w-3 h-3" /> Locked
                      </Badge>
                    )}
                  </CardHeader>

                  <CardContent className="p-4">
                    {!isSubmitted ? (
                      <div className="text-center py-6 px-4 space-y-2">
                        <div className="w-10 h-10 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                          <Lock className="w-5 h-5" />
                        </div>
                        <h4 className="text-xs font-semibold text-foreground">Solution Protected</h4>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          To protect academic integrity and test preparation value, submit your response to unlock the
                          complete step-by-step solution and official marking criteria.
                        </p>
                      </div>
                    ) : loadingSolutions ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                        <span className="text-xs text-muted-foreground ml-2">Unlocking official solutions...</span>
                      </div>
                    ) : revealedSolutions.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        Solution is currently being verified by the curriculum team.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {revealedSolutions.map((sol, idx) => (
                          <div key={idx} className="space-y-3 border-b last:border-b-0 pb-3">
                            {sol.part_label && (
                              <Badge variant="secondary" className="text-xs font-mono">
                                Part ({sol.part_label})
                              </Badge>
                            )}

                            {sol.answer_key && (
                              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-1">
                                  Final Answer Key
                                </span>
                                <div className="text-xs font-mono font-semibold text-emerald-900 dark:text-emerald-200">
                                  {renderLatexContent(sol.answer_key)}
                                </div>
                              </div>
                            )}

                            {sol.solution && (
                              <div className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                                  Step-by-Step Derivation
                                </span>
                                <div className="prose prose-xs max-w-none dark:prose-invert font-serif text-xs leading-relaxed whitespace-pre-wrap">
                                  {renderLatexContent(sol.solution)}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Prev / Next Subquestion Buttons */}
              {data.sub_questions.length > 1 && (
                <div className="flex items-center justify-between gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasPrev}
                    onClick={() => setSelectedSubId(data.sub_questions[currentIdx - 1].id)}
                    className="h-8 text-xs gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Previous Part
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasNext}
                    onClick={() => setSelectedSubId(data.sub_questions[currentIdx + 1].id)}
                    className="h-8 text-xs gap-1"
                  >
                    Next Part
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Feedback Panel */}
        <AIFeedbackPanel
          isOpen={showAIFeedback}
          onClose={() => setShowAIFeedback(false)}
          feedback={aiFeedback}
          isLoading={aiFeedbackLoading}
          questionNumber={selectedSub ? data.sub_questions.indexOf(selectedSub) + 1 : 1}
          onTryAgain={() => {
            setShowAIFeedback(false);
            setAiFeedback(null);
          }}
        />

        {/* Enhanced AI Tutor */}
        <EnhancedAITutor
          question={{
            id: selectedSub?.id || data.id,
            title: data.title,
            content: selectedSub?.sub_question_text || data.question_text,
            answerKey: '',
            topic: data.topic,
            difficulty: data.difficulty
          }}
          subject="mathematics"
          isOpen={showTutor}
          onClose={() => setShowTutor(false)}
          mode="practice"
        />
      </div>
    </ExamModeProvider>
  );
};

export default PracticeQuestionView;
