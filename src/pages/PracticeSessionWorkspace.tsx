import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Flag,
  Save,
  Send,
  Lock,
  Lightbulb,
  Award,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trophy
} from 'lucide-react';
import Header from '@/components/Header';
import InteractiveAnswerBlock from '@/components/unified-exam/InteractiveAnswerBlock';
import { renderFinalText as renderLatexContent } from '@/lib/renderFinalText';
import { cn } from '@/lib/utils';

interface SessionQuestionItem {
  id: string; // practice_session_questions.id
  session_id: string;
  question_id: string;
  order_index: number;
  attempt_status: string; // 'unattempted' | 'draft' | 'submitted' | 'evaluated'
  student_answer: string | null;
  is_correct: boolean | null;
  time_spent_seconds: number;
  question: {
    id: string;
    question_text: string;
    image_url: string | null;
    strand: string;
    myp_year: string;
    topic: string;
    subtopic: string | null;
    difficulty: string;
    question_type: string;
    marks: number;
  };
  subquestions: Array<{
    id: string;
    label: string;
    sub_question_text: string;
    sub_question_image_url: string | null;
    marks: number;
    answer_type: string;
    answer_block_config: any;
  }>;
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

const PracticeSessionWorkspace: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  // Session Data
  const [session, setSession] = useState<any | null>(null);
  const [questions, setQuestions] = useState<SessionQuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Interaction State
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Time tracking
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Solutions map for submitted questions
  const [solutionsMap, setSolutionsMap] = useState<Record<string, RevealedSolution[]>>({});
  const [loadingSolution, setLoadingSolution] = useState(false);

  // 1. Fetch Session and Questions
  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      // Fetch session
      const { data: sessData, error: sessErr } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessErr || !sessData) {
        throw new Error('Practice session not found or access unauthorized.');
      }
      setSession(sessData);

      // Fetch session questions
      const { data: psqData, error: psqErr } = await supabase
        .from('practice_session_questions')
        .select('*')
        .eq('session_id', sessionId)
        .order('order_index', { ascending: true });

      if (psqErr) throw psqErr;

      // Fetch corresponding question_bank records
      const questionIds = (psqData || []).map((q: any) => q.question_id);
      const { data: qbData, error: qbErr } = await supabase
        .from('question_bank')
        .select('id, question_text, image_url, strand, myp_year, topic, subtopic, difficulty, question_type, marks')
        .in('id', questionIds);

      if (qbErr) throw qbErr;

      const qbMap = new Map((qbData || []).map((q: any) => [q.id, q]));

      // Fetch subquestions for any multi-part questions
      const multiPartIds = (qbData || [])
        .filter((q: any) => q.question_type === 'multi_part')
        .map((q: any) => q.id);

      let subMap = new Map<string, any[]>();
      if (multiPartIds.length > 0) {
        const { data: subsData } = await supabase
          .from('question_subquestions')
          .select('id, question_id, label, sub_question_text, sub_question_image_url, answer_type, answer_config, marks, order_index')
          .in('question_id', multiPartIds)
          .order('order_index');

        (subsData || []).forEach((sq: any) => {
          const list = subMap.get(sq.question_id) || [];
          list.push({
            id: sq.id,
            label: sq.label || 'a',
            sub_question_text: sq.sub_question_text || '',
            sub_question_image_url: sq.sub_question_image_url,
            marks: sq.marks || 1,
            answer_type: sq.answer_type || 'text_equation',
            answer_block_config: { type: (sq.answer_type as any) || 'text_equation', ...(sq.answer_config as any || {}) }
          });
          subMap.set(sq.question_id, list);
        });
      }

      // Merge into complete SessionQuestionItem list
      const initialAnswers: Record<string, any> = {};
      const enrichedQuestions: SessionQuestionItem[] = (psqData || []).map((psq: any) => {
        const qb = qbMap.get(psq.question_id) || {
          id: psq.question_id,
          question_text: 'Question prompt',
          image_url: null,
          strand: 'Mathematics',
          myp_year: 'Year 5',
          topic: 'Mathematics',
          subtopic: null,
          difficulty: 'medium',
          question_type: 'numeric',
          marks: 1
        };

        const subquestions = subMap.get(psq.question_id) || [
          {
            id: qb.id,
            label: '1',
            sub_question_text: qb.question_text || '',
            sub_question_image_url: qb.image_url,
            marks: qb.marks || 1,
            answer_type: qb.question_type || 'text_equation',
            answer_block_config: { type: (qb.question_type as any) || 'text_equation' }
          }
        ];

        if (psq.student_answer) {
          try {
            const parsed = JSON.parse(psq.student_answer);
            initialAnswers[psq.id] = parsed;
          } catch {
            initialAnswers[psq.id] = psq.student_answer;
          }
        }

        return {
          id: psq.id,
          session_id: psq.session_id,
          question_id: psq.question_id,
          order_index: psq.order_index,
          attempt_status: psq.attempt_status,
          student_answer: psq.student_answer,
          is_correct: psq.is_correct,
          time_spent_seconds: psq.time_spent_seconds,
          question: qb,
          subquestions
        };
      });

      setQuestions(enrichedQuestions);
      setAnswers(initialAnswers);

      if (sessData.is_completed) {
        setShowSummaryModal(true);
      }
    } catch (err: any) {
      console.error('Error loading practice session:', err);
      toast.error(err.message || 'Failed to load practice session');
      navigate('/practice');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, navigate]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Timer
  useEffect(() => {
    if (session?.is_completed) return;
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [session?.is_completed]);

  const currentQ = questions[currentIndex] || null;

  // Fetch solution for a specific submitted question
  const fetchSolution = useCallback(async (sessionQuestionId: string) => {
    if (solutionsMap[sessionQuestionId]) return;
    setLoadingSolution(true);
    try {
      const { data: solRows, error } = await supabase.rpc('get_practice_question_solution', {
        p_session_question_id: sessionQuestionId
      });
      if (!error && solRows) {
        setSolutionsMap((prev) => ({
          ...prev,
          [sessionQuestionId]: solRows as RevealedSolution[]
        }));
      }
    } catch (err) {
      console.warn('Could not fetch solution:', err);
    } finally {
      setLoadingSolution(false);
    }
  }, [solutionsMap]);

  // When viewing a question that is already submitted/evaluated, fetch its solution
  useEffect(() => {
    if (currentQ && (currentQ.attempt_status === 'submitted' || currentQ.attempt_status === 'evaluated')) {
      fetchSolution(currentQ.id);
    }
  }, [currentQ, fetchSolution]);

  // Autosave Draft
  const saveDraft = useCallback(
    async (sqId: string, answerVal: any) => {
      if (!currentQ || currentQ.attempt_status === 'submitted' || currentQ.attempt_status === 'evaluated') {
        return;
      }
      setIsSaving(true);
      try {
        const payload = typeof answerVal === 'object' ? JSON.stringify(answerVal) : String(answerVal);
        await supabase.rpc('save_practice_draft_answer', {
          p_session_question_id: sqId,
          p_answer: payload,
          p_time_spent_seconds: elapsedSeconds
        });

        // Update local status to draft if was unattempted
        setQuestions((prev) =>
          prev.map((q) => (q.id === sqId && q.attempt_status === 'unattempted' ? { ...q, attempt_status: 'draft' } : q))
        );
      } catch (err) {
        console.warn('Draft autosave failed:', err);
      } finally {
        setIsSaving(false);
      }
    },
    [currentQ, elapsedSeconds]
  );

  const handleAnswerChange = useCallback(
    (val: any) => {
      if (!currentQ) return;
      const sqId = currentQ.id;
      setAnswers((prev) => {
        const next = { ...prev, [sqId]: val };
        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = setTimeout(() => {
          saveDraft(sqId, val);
        }, 1500);
        return next;
      });
    },
    [currentQ, saveDraft]
  );

  // Submit Current Question
  const handleSubmitCurrentQuestion = async () => {
    if (!currentQ) return;
    const sqId = currentQ.id;
    const answerVal = answers[sqId];

    if (!answerVal) {
      toast.info('Please write or input an answer before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = typeof answerVal === 'object' ? JSON.stringify(answerVal) : String(answerVal);
      const { data: submitResult, error } = await supabase.rpc('submit_practice_question_answer', {
        p_session_question_id: sqId,
        p_answer: payload,
        p_time_spent_seconds: elapsedSeconds
      });

      if (error) throw error;

      const res = submitResult?.[0];
      toast.success(
        res?.is_correct === true
          ? 'Correct! Official solution unlocked.'
          : 'Question submitted. Official solution unlocked.'
      );

      // Update question status in local list
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === sqId
            ? {
                ...q,
                attempt_status: 'submitted',
                is_correct: res?.is_correct ?? null
              }
            : q
        )
      );

      // Fetch unlocked solution
      await fetchSolution(sqId);
    } catch (err: any) {
      console.error('Submission failed:', err);
      toast.error(err.message || 'Failed to submit question');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete Full Practice Session
  const handleCompleteSession = async () => {
    if (!sessionId) return;
    setIsCompleting(true);
    try {
      const { data, error } = await supabase.rpc('complete_practice_session', {
        p_session_id: sessionId
      });

      if (error) throw error;

      const res = data?.[0];
      setSession((prev: any) => ({
        ...prev,
        is_completed: true,
        score: res?.score ?? 0,
        completed_questions: res?.total_completed ?? prev.completed_questions
      }));

      setShowFinishDialog(false);
      setShowSummaryModal(true);
      toast.success('Practice session completed!');
    } catch (err: any) {
      console.error('Error completing session:', err);
      toast.error(err.message || 'Failed to complete session');
    } finally {
      setIsCompleting(false);
    }
  };

  // Flag toggle
  const toggleFlag = (sqId: string) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sqId)) next.delete(sqId);
      else next.add(sqId);
      return next;
    });
  };

  const answeredCount = useMemo(
    () => questions.filter((q) => q.attempt_status === 'submitted' || q.attempt_status === 'evaluated' || !!answers[q.id]).length,
    [questions, answers]
  );

  const submittedCount = useMemo(
    () => questions.filter((q) => q.attempt_status === 'submitted' || q.attempt_status === 'evaluated').length,
    [questions]
  );

  const totalCount = questions.length || 1;
  const progressPercent = Math.round((submittedCount / totalCount) * 100);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 bg-card rounded-2xl shadow-lg border max-w-sm w-full">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
            <h2 className="text-base font-bold text-foreground">Preparing Practice Workspace...</h2>
            <p className="text-xs text-muted-foreground mt-1">Loading session questions and equation tools</p>
          </div>
        </main>
      </div>
    );
  }

  if (!currentQ) return null;

  const isCurrentSubmitted = currentQ.attempt_status === 'submitted' || currentQ.attempt_status === 'evaluated';
  const currentSolutions = solutionsMap[currentQ.id] || [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b shadow-sm">
        <div className="px-4 py-2.5 max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Back + Session Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/practice')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm truncate">{session?.title || 'Practice Session'}</span>
                <Badge variant="secondary" className="text-[11px] font-mono px-2 py-0">
                  {currentIndex + 1} / {totalCount}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="text-indigo-600 font-semibold">{currentQ.question.strand}</span>
                <span>•</span>
                <span>{currentQ.question.topic}</span>
              </div>
            </div>
          </div>

          {/* Center: Progress & Timer */}
          <div className="hidden md:flex items-center gap-6">
            <div className="w-48 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Submitted</span>
                <span className="font-mono font-medium">
                  {submittedCount} / {totalCount} ({progressPercent}%)
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-muted/50 px-2.5 py-1 rounded-md border">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>

            {isSaving && (
              <div className="flex items-center gap-1 text-xs text-amber-600 font-medium animate-pulse">
                <Save className="w-3.5 h-3.5" />
                <span>Saving draft...</span>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleFlag(currentQ.id)}
              className={cn(
                'h-8 text-xs gap-1.5',
                flaggedIds.has(currentQ.id) && 'bg-amber-50 text-amber-700 border-amber-300'
              )}
            >
              <Flag className={cn('w-3.5 h-3.5', flaggedIds.has(currentQ.id) && 'fill-amber-500 text-amber-500')} />
              <span>{flaggedIds.has(currentQ.id) ? 'Flagged' : 'Flag'}</span>
            </Button>

            <Button
              size="sm"
              variant={session?.is_completed ? 'secondary' : 'default'}
              onClick={() => (session?.is_completed ? setShowSummaryModal(true) : setShowFinishDialog(true))}
              className={cn(
                'h-8 text-xs font-semibold gap-1.5 shadow-sm',
                !session?.is_completed && 'bg-emerald-600 hover:bg-emerald-700 text-white'
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{session?.is_completed ? 'View Results' : 'Complete Session'}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden min-h-0" style={{ height: 'calc(100vh - 53px)' }}>
        {/* Left Sidebar: 1..N Question Matrix Navigator */}
        <aside className="hidden lg:flex lg:flex-col w-72 border-r bg-card flex-shrink-0 min-h-0 overflow-hidden">
          <div className="p-4 border-b space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Question Navigator
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {answeredCount}/{totalCount} Active
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Select any question to jump directly to it.
            </p>
          </div>

          {/* Grid of Question Number Buttons (up to 50 questions) */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isSelected = idx === currentIndex;
                const isSub = q.attempt_status === 'submitted' || q.attempt_status === 'evaluated';
                const hasDraft = !isSub && (q.attempt_status === 'draft' || !!answers[q.id]);
                const isFlagged = flaggedIds.has(q.id);

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      'relative h-10 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center border',
                      isSelected
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300 dark:ring-indigo-800'
                        : isSub
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        : hasDraft
                        ? 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                        : 'border-border bg-card text-foreground hover:bg-muted'
                    )}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-background" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar Legend */}
          <div className="p-3 border-t bg-muted/20 text-[11px] space-y-1.5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="w-3 h-3 rounded border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 inline-block" />
              <span>Submitted</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="w-3 h-3 rounded border border-amber-300 bg-amber-50 dark:bg-amber-950/40 inline-block" />
              <span>Draft Answer Saved</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block" />
              <span>Flagged for Review</span>
            </div>
          </div>
        </aside>

        {/* Workspace Split: Problem vs Solution / Input */}
        <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
          {/* LEFT: Question Statement */}
          <div className="min-w-0 min-h-0 overflow-y-auto border-b lg:border-b-0 lg:border-r bg-background p-6 space-y-5">
            <Card className="border border-border/80 shadow-sm">
              <CardHeader className="p-4 pb-3 bg-muted/20 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono">
                    Question {currentIndex + 1}
                  </Badge>
                  <Badge className={cn('text-xs capitalize border px-2 py-0', difficultyBadgeColors[currentQ.question.difficulty])}>
                    {currentQ.question.difficulty}
                  </Badge>
                </div>
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  {currentQ.question.marks} Marks
                </span>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                <div className="prose prose-sm max-w-none dark:prose-invert font-serif text-sm leading-relaxed">
                  {renderLatexContent(currentQ.question.question_text)}
                </div>

                {currentQ.question.image_url && (
                  <div className="rounded-xl border overflow-hidden max-w-lg mx-auto bg-white p-2">
                    <img
                      src={currentQ.question.image_url}
                      alt="Question visual"
                      className="max-h-72 object-contain mx-auto"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* If multi-part, render subquestions */}
            {currentQ.subquestions.length > 1 && (
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Sub-Questions
                </span>
                {currentQ.subquestions.map((sub) => (
                  <Card key={sub.id} className="border border-indigo-100 dark:border-indigo-950/60 shadow-xs">
                    <CardHeader className="p-3 pb-2 bg-indigo-50/20 dark:bg-indigo-950/10 border-b flex flex-row items-center justify-between">
                      <span className="font-mono font-bold text-xs text-indigo-600">
                        Part ({sub.label})
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">{sub.marks}m</span>
                    </CardHeader>
                    <CardContent className="p-4 text-xs font-serif leading-relaxed">
                      {renderLatexContent(sub.sub_question_text)}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Answer Input & Unlocked Solutions */}
          <div className="min-w-0 min-h-0 overflow-y-auto bg-muted/10 p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-5">
              {/* Answer Input */}
              <Card className="border border-border/80 shadow-sm">
                <CardHeader className="p-4 pb-3 border-b flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <span>Your Response</span>
                      {isCurrentSubmitted && (
                        <Badge
                          className={cn(
                            'text-[10px]',
                            currentQ.is_correct === true
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-100 text-indigo-800'
                          )}
                        >
                          {currentQ.is_correct === true ? 'Evaluated Correct' : 'Submitted'}
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Enter equations using standard notation or the toolbar.
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleSubmitCurrentQuestion}
                    disabled={isSubmitting || isCurrentSubmitted}
                    className={cn(
                      'h-8 text-xs font-medium gap-1.5 shadow-sm',
                      isCurrentSubmitted
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Submitting...
                      </>
                    ) : isCurrentSubmitted ? (
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
                  <InteractiveAnswerBlock
                    key={`${currentQ.id}-${currentQ.question.question_type}`}
                    questionId={currentQ.id}
                    subQuestionId={currentQ.id}
                    detectedType={currentQ.question.question_type as any}
                    config={{ type: (currentQ.question.question_type as any) || 'text_equation' }}
                    value={answers[currentQ.id] || ''}
                    onChange={handleAnswerChange}
                    disabled={isCurrentSubmitted}
                    allowTypeChange={false}
                    questionText={currentQ.question.question_text}
                  />
                </CardContent>
              </Card>

              {/* Solution Card (P0-01 Protected) */}
              <Card className="border border-border/80 shadow-sm overflow-hidden">
                <CardHeader className="p-4 pb-3 bg-muted/30 border-b flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>Official Solution & Marking Guide</span>
                  </CardTitle>
                  {!isCurrentSubmitted && (
                    <Badge variant="outline" className="text-[11px] gap-1 text-muted-foreground">
                      <Lock className="w-3 h-3" /> Locked
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="p-4">
                  {!isCurrentSubmitted ? (
                    <div className="text-center py-6 px-4 space-y-2">
                      <div className="w-10 h-10 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <Lock className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-semibold text-foreground">Submit Response to Unlock Solution</h4>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        Once you submit your answer, the official step-by-step solution and grading key are immediately
                        unlocked.
                      </p>
                    </div>
                  ) : loadingSolution ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                      <span className="text-xs text-muted-foreground ml-2">Unlocking solution...</span>
                    </div>
                  ) : currentSolutions.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      Solution is pending official curriculum verification.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {currentSolutions.map((sol, idx) => (
                        <div key={idx} className="space-y-3 border-b last:border-b-0 pb-3">
                          {sol.part_label && (
                            <Badge variant="secondary" className="text-xs font-mono">
                              Part ({sol.part_label})
                            </Badge>
                          )}

                          {sol.answer_key && (
                            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-1">
                                Answer Key
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

            {/* Bottom Question Navigation Toolbar */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((c) => Math.max(0, c - 1))}
                className="h-8 text-xs gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous Question
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleFlag(currentQ.id)}
                  className="h-8 text-xs gap-1"
                >
                  <Flag className={cn('w-3 h-3', flaggedIds.has(currentQ.id) && 'fill-amber-500 text-amber-500')} />
                  <span>{flaggedIds.has(currentQ.id) ? 'Unflag' : 'Flag'}</span>
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  disabled={currentIndex >= totalCount - 1}
                  onClick={() => setCurrentIndex((c) => Math.min(totalCount - 1, c + 1))}
                  className="h-8 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Next Question
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Session Confirmation Dialog */}
      <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Complete Practice Session?
            </DialogTitle>
            <DialogDescription className="text-sm">
              You have submitted <strong>{submittedCount}</strong> of <strong>{totalCount}</strong> questions.
              {submittedCount < totalCount && (
                <span className="block mt-1 text-amber-600 font-medium">
                  {totalCount - submittedCount} unsubmitted question(s) will be marked incomplete.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShowFinishDialog(false)}>
              Keep Practicing
            </Button>
            <Button
              size="sm"
              onClick={handleCompleteSession}
              disabled={isCompleting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {isCompleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Calculating Score...
                </>
              ) : (
                'Yes, Finish & Score'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post-Completion Summary Modal */}
      <Dialog open={showSummaryModal} onOpenChange={setShowSummaryModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Trophy className="w-6 h-6 text-amber-500" />
              Practice Session Summary
            </DialogTitle>
            <DialogDescription>
              Review your performance across this personalized MYP Mathematics set.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Score Banner */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-semibold text-indigo-300">Final Session Score</span>
                <div className="text-4xl font-extrabold font-mono mt-1">
                  {session?.score !== null && session?.score !== undefined ? `${Math.round(session.score)}%` : 'Completed'}
                </div>
                <p className="text-xs text-indigo-200 mt-1">
                  {submittedCount} of {totalCount} questions submitted
                </p>
              </div>

              <div className="w-16 h-16 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-amber-400" />
              </div>
            </div>

            {/* Questions breakdown */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Question Breakdown
              </span>
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {questions.map((q, idx) => {
                  const isSub = q.attempt_status === 'submitted' || q.attempt_status === 'evaluated';
                  return (
                    <div
                      key={q.id}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setShowSummaryModal(false);
                      }}
                      className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold w-6 text-muted-foreground">Q{idx + 1}</span>
                        <span className="font-medium truncate max-w-xs">{q.question.topic}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSub ? (
                          <Badge
                            className={cn(
                              'text-[10px]',
                              q.is_correct === true
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-indigo-100 text-indigo-800'
                            )}
                          >
                            {q.is_correct === true ? 'Correct' : 'Submitted'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Incomplete
                          </Badge>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShowSummaryModal(false)}>
              Review Solutions in Workspace
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/practice')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              Back to Question Bank
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PracticeSessionWorkspace;
