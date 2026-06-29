import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, CheckCircle2, BookOpen, GraduationCap,
  MessageSquare, Lightbulb, Loader2, Circle,
  ChevronRight, ChevronLeft
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
  answer_key: string | null;
  solution: string | null;
  command_term: string | null;
  sub_question_text: string;
  sub_question_image_url: string | null;
  order_index: number;
}

interface PracticeSetData {
  id: string;
  title: string;
  subject: string;
  topic: string;
  difficulty: string;
  question_text: string;
  question_image_url: string | null;
  sub_questions: SubQuestion[];
}

const PracticeQuestionView = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<PracticeSetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<'exam' | 'study'>('exam');
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showTutor, setShowTutor] = useState(false);
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<AIFeedbackResponse | null>(null);
  const [aiFeedbackLoading, setAiFeedbackLoading] = useState(false);

  useEffect(() => {
    if (!setId) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const { data: ps, error: psErr } = await supabase
          .from('practice_sets')
          .select('id, title, subject, topic, difficulty')
          .eq('id', setId)
          .single();
        if (psErr) throw psErr;

        const { data: qs } = await supabase
          .from('practice_questions')
          .select('*')
          .eq('practice_set_id', setId)
          .order('order_index')
          .limit(1);

        const mainQ = qs?.[0];
        if (!mainQ) { toast.error('No questions found'); navigate('/practice'); return; }

        const { data: sqs } = await supabase
          .from('practice_sub_questions')
          .select('*')
          .eq('question_id', mainQ.id)
          .order('order_index');

        const sorted = (sqs || []).sort((a: any, b: any) => {
          const la = a.label?.toLowerCase() || '';
          const lb = b.label?.toLowerCase() || '';
          return la.localeCompare(lb, undefined, { numeric: true });
        });

        setData({
          ...ps,
          question_text: mainQ.question_text,
          question_image_url: mainQ.question_image_url,
          sub_questions: sorted as SubQuestion[],
        });

        if (sorted.length > 0) setSelectedSubId(sorted[0].id);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load practice set');
        navigate('/practice');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [setId]);

  const selectedSub = useMemo(
    () => data?.sub_questions.find(sq => sq.id === selectedSubId) || null,
    [data, selectedSubId]
  );

  const answeredCount = useMemo(() => Object.keys(answers).filter(k => {
    const v = answers[k];
    if (!v) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (typeof v === 'object') return Object.keys(v).length > 0;
    return true;
  }).length, [answers]);

  const totalCount = data?.sub_questions.length || 0;
  const progressPercentage = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;

  const handleAnswerChange = useCallback((subId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [subId]: value }));
  }, []);

  const handleAIFeedback = useCallback(async () => {
    if (!selectedSub) return;
    const userAnswer = answers[selectedSub.id];
    if (!userAnswer) { toast.info('Write an answer first'); return; }

    setAiFeedbackLoading(true);
    setShowAIFeedback(true);
    try {
      const { data: fbData, error } = await supabase.functions.invoke('ai-feedback', {
        body: {
          questionText: selectedSub.sub_question_text,
          studentAnswer: typeof userAnswer === 'object' && userAnswer?.text ? userAnswer.text : String(userAnswer),
          answerKey: selectedSub.answer_key || '',
          commandTerm: selectedSub.command_term || '',
          marks: selectedSub.marks,
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
  }, [selectedSub, answers]);

  // ── Loading state ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-violet-100 via-sky-50 to-rose-100 dark:from-violet-950/30 dark:via-sky-950/20 dark:to-rose-950/30">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-8 bg-background/90 backdrop-blur rounded-2xl shadow-xl border"
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-500 via-blue-500 to-cyan-400 rounded-full flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2 bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Loading Practice Set...
            </h2>
            <p className="text-muted-foreground text-sm">Preparing your questions</p>
          </motion.div>
        </main>
      </div>
    );
  }

  if (!data) return null;

  const currentIdx = data.sub_questions.findIndex(sq => sq.id === selectedSubId);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < data.sub_questions.length - 1;

  return (
    <ExamModeProvider initialMode={mode === 'study' ? 'study' : 'examination'}>
      <div className="min-h-screen flex flex-col bg-background">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b shadow-sm"
        >
          <div className="px-4 py-3">
            <div className="flex items-center justify-between max-w-[1600px] mx-auto gap-4">
              {/* Left: Back + Title */}
              <div className="flex items-center gap-3 min-w-0">
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/practice')}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-violet-500/20">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 hidden sm:block">
                  <h1 className="text-sm font-bold truncate">{data.title}</h1>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Practice</span>
                    <ChevronRight className="w-3 h-3" />
                    <span>{data.subject}</span>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-foreground font-medium">{data.topic}</span>
                  </div>
                </div>
              </div>

              {/* Center: Progress */}
              <div className="hidden md:flex items-center gap-4 flex-1 max-w-xs">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{answeredCount}/{totalCount} parts</span>
                    <span className="text-xs text-muted-foreground">{Math.round(progressPercentage)}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
              </div>

              {/* Right: Controls */}
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-muted/40 shadow-sm">
                  {mode === 'study'
                    ? <BookOpen className="w-4 h-4 text-blue-500" />
                    : <GraduationCap className="w-4 h-4 text-primary" />
                  }
                  <Label htmlFor="mode-toggle" className="text-sm font-medium cursor-pointer">
                    {mode === 'study' ? 'Study' : 'Exam'}
                  </Label>
                  <Switch
                    id="mode-toggle"
                    checked={mode === 'study'}
                    onCheckedChange={(checked) => setMode(checked ? 'study' : 'exam')}
                  />
                </div>

                <Badge variant="outline" className={cn(
                  "capitalize text-xs",
                  data.difficulty === 'hard' && "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400",
                  data.difficulty === 'medium' && "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
                  data.difficulty === 'easy' && "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400"
                )}>
                  {data.difficulty}
                </Badge>

                {mode === 'study' && (
                  <>
                    <AIFeedbackButton
                      questionId={selectedSub?.id || ''}
                      hasAnswer={!!selectedSub && !!answers[selectedSub.id]}
                      isLoading={aiFeedbackLoading}
                      onClick={handleAIFeedback}
                    />
                    <Button variant="outline" size="sm" onClick={() => setShowTutor(true)} className="gap-1 rounded-lg">
                      <MessageSquare className="w-4 h-4" /> Tutor
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.header>

        {/* ── Workspace ───────────────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden min-h-0" style={{ height: 'calc(100vh - 57px)' }}>

          {/* LEFT: Navigator Sidebar */}
          <motion.aside
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="hidden lg:flex lg:flex-col w-72 border-r bg-card flex-shrink-0 min-h-0 overflow-hidden"
          >
            {/* Sidebar header */}
            <div className="p-4 border-b space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Sub-Questions</h3>
                <Badge variant="secondary" className="text-xs font-mono">{answeredCount}/{totalCount}</Badge>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">{Math.round(progressPercentage)}% complete</p>
            </div>

            {/* Sidebar items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {data.sub_questions.map((sq) => (
                <button
                  key={sq.id}
                  onClick={() => setSelectedSubId(sq.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2.5 group",
                    selectedSubId === sq.id
                      ? "bg-primary/10 border-l-[3px] border-l-primary"
                      : "hover:bg-muted border-l-[3px] border-l-transparent"
                  )}
                >
                  {answers[sq.id] ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs">({sq.label})</span>
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {getPreviewText(sq.sub_question_text, 30)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono shrink-0">{sq.marks}m</span>
                </button>
              ))}
            </div>

            {/* Sidebar legend */}
            <div className="p-3 border-t bg-muted/30 space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Legend</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <span className="text-muted-foreground">Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Circle className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Not attempted</span>
                </div>
              </div>
            </div>
          </motion.aside>

          {/* Main content grid */}
          <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">

            {/* ── QUESTION PANEL ──────────────────────────────────────── */}
            <div className="min-w-0 min-h-0 overflow-y-auto border-b lg:border-b-0 lg:border-r bg-background">
              <div className="p-4 lg:p-6 space-y-4 lg:space-y-5">

                {/* Mobile sub-question navigator */}
                <div className="lg:hidden">
                  <Card className="border-border/60 shadow-sm">
                    <CardContent className="p-3 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Sub-Questions
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {data.sub_questions.map((sq) => (
                          <button
                            key={sq.id}
                            onClick={() => setSelectedSubId(sq.id)}
                            className={cn(
                              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5',
                              selectedSubId === sq.id
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : answers[sq.id]
                                  ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800'
                                  : 'bg-background text-foreground hover:bg-muted border-border'
                            )}
                          >
                            {answers[sq.id] && selectedSubId !== sq.id && (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            ({sq.label}) {sq.marks}m
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Main question card */}
                <Card className="border-border/60 shadow-sm overflow-hidden">
                  <CardHeader className="pb-3 bg-gradient-to-r from-sky-50 via-violet-50 to-pink-50 dark:from-sky-950/30 dark:via-violet-950/20 dark:to-pink-950/30">
                    <CardTitle className="text-lg flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center shadow-sm">
                        <BookOpen className="w-4 h-4 text-white" />
                      </div>
                      Question
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {renderLatexContent(data.question_text)}
                    </div>
                    {data.question_image_url && (
                      <img
                        src={data.question_image_url}
                        alt="Question diagram"
                        className="mt-4 max-w-full rounded-lg border"
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Selected sub-question card */}
                <AnimatePresence mode="wait">
                  {selectedSub && (
                    <motion.div
                      key={selectedSub.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="border-violet-200/60 dark:border-violet-800 shadow-md ring-1 ring-violet-500/20">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">
                                {selectedSub.label}
                              </div>
                              {selectedSub.command_term && (
                                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                                  {selectedSub.command_term}
                                </Badge>
                              )}
                            </div>
                            <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                              [{selectedSub.marks}]
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            {renderLatexContent(selectedSub.sub_question_text)}
                          </div>
                          {selectedSub.sub_question_image_url && (
                            <img
                              src={selectedSub.sub_question_image_url}
                              alt={`Sub-question ${selectedSub.label}`}
                              className="mt-3 max-w-full rounded-lg border"
                            />
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── ANSWER PANEL ────────────────────────────────────────── */}
            <div className="min-w-0 min-h-0 overflow-y-auto bg-gradient-to-b from-slate-50/80 via-background to-violet-50/30 dark:from-slate-950/30 dark:via-background dark:to-violet-950/10">
              <div className="p-4 lg:p-6 space-y-4">
                {selectedSub ? (
                  <>
                    {/* Answer header */}
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
                          <span className="text-xs font-bold text-white">{selectedSub.label}</span>
                        </div>
                        Answer
                      </h3>
                      <Badge variant="outline" className="text-[10px] font-mono capitalize">
                        {selectedSub.answer_type.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Interactive answer block */}
                    <InteractiveAnswerBlock
                      key={`${selectedSub.id}-${selectedSub.answer_type}`}
                      questionId={selectedSub.id}
                      subQuestionId={selectedSub.id}
                      detectedType={selectedSub.answer_type as any}
                      config={selectedSub.answer_block_config || {}}
                      value={answers[selectedSub.id] || ''}
                      onChange={(val) => handleAnswerChange(selectedSub.id, val)}
                      disabled={mode === 'study'}
                      allowTypeChange={false}
                      questionText={selectedSub.sub_question_text}
                    />

                    {/* Study mode: answer key + solution */}
                    {mode === 'study' && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        {selectedSub.answer_key && (
                          <Card className="border-emerald-200/60 dark:border-emerald-800 shadow-sm overflow-hidden">
                            <CardHeader className="pb-2 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-cyan-950/30">
                              <CardTitle className="text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                </div>
                                Answer Key
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3">
                              <div className="prose prose-sm max-w-none dark:prose-invert">
                                {renderLatexContent(selectedSub.answer_key)}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {selectedSub.solution && (
                          <Card className="border-blue-200/60 dark:border-blue-800 shadow-sm overflow-hidden">
                            <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-violet-950/30">
                              <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-300">
                                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm">
                                  <Lightbulb className="w-3.5 h-3.5 text-white" />
                                </div>
                                Step-by-Step Solution
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3">
                              <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                                {renderLatexContent(selectedSub.solution)}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </motion.div>
                    )}

                    {/* Prev / Next navigation */}
                    <div className="flex gap-3 pt-4">
                      {hasPrev && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-xl shadow-sm hover:shadow-md transition-all"
                          onClick={() => setSelectedSubId(data.sub_questions[currentIdx - 1].id)}
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Previous
                        </Button>
                      )}
                      {hasNext && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-xl shadow-sm hover:shadow-md transition-all"
                          onClick={() => setSelectedSubId(data.sub_questions[currentIdx + 1].id)}
                        >
                          Next
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-16"
                  >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-100 to-sky-100 dark:from-violet-900/30 dark:to-sky-900/30 flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-violet-400" />
                    </div>
                    <p className="text-foreground font-medium">Select a sub-question to begin</p>
                    <p className="text-xs text-muted-foreground mt-1">Choose from the navigator on the left</p>
                  </motion.div>
                )}
              </div>
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
          onTryAgain={() => { setShowAIFeedback(false); setAiFeedback(null); }}
        />

        {/* AI Tutor */}
        <EnhancedAITutor
          question={{
            id: selectedSub?.id || data.id,
            title: data.title,
            content: selectedSub?.sub_question_text || data.question_text,
            answerKey: selectedSub?.answer_key || '',
            topic: data.topic,
            difficulty: data.difficulty
          }}
          subject={data.subject}
          isOpen={showTutor}
          onClose={() => setShowTutor(false)}
          mode="practice"
        />
      </div>
    </ExamModeProvider>
  );
};

export default PracticeQuestionView;
