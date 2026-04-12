import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft, CheckCircle2, BookOpen, GraduationCap,
  MessageSquare, Lightbulb, ChevronRight, Loader2
} from 'lucide-react';
import Header from '@/components/Header';
import { ExamModeProvider } from '@/contexts/ExamModeContext';
import { EnhancedAITutor } from '@/components/EnhancedAITutor';
import AnswerBlock from '@/components/unified-exam/AnswerBlock';
import { renderLatexContent } from '@/lib/renderLatex';
import AIFeedbackButton from '@/components/unified-exam/AIFeedbackButton';
import AIFeedbackPanel from '@/components/unified-exam/AIFeedbackPanel';
import { AIFeedbackResponse } from '@/types/examMode';
import { cn } from '@/lib/utils';

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </main>
      </div>
    );
  }

  if (!data) return null;

  return (
    <ExamModeProvider initialMode={mode}>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header Bar */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-4 py-2">
          <div className="flex items-center justify-between max-w-[1600px] mx-auto">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/practice')}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <div className="hidden sm:block">
                <h1 className="text-sm font-semibold line-clamp-1">{data.title}</h1>
                <p className="text-xs text-muted-foreground">{data.subject} · {data.topic}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Mode Toggle */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-muted/50">
                <GraduationCap className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="mode-toggle" className="text-sm font-medium cursor-pointer">
                  {mode === 'study' ? 'Study' : 'Exam'}
                </Label>
                <Switch
                  id="mode-toggle"
                  checked={mode === 'study'}
                  onCheckedChange={(checked) => setMode(checked ? 'study' : 'exam')}
                />
              </div>

              <Badge variant="outline" className="capitalize">{data.difficulty}</Badge>

              <AIFeedbackButton
                questionId={selectedSub?.id || ''}
                hasAnswer={!!selectedSub && !!answers[selectedSub.id]}
                isLoading={aiFeedbackLoading}
                onClick={handleAIFeedback}
              />
              <Button variant="outline" size="sm" onClick={() => setShowTutor(true)} className="gap-1">
                <MessageSquare className="w-4 h-4" /> Tutor
              </Button>
            </div>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 49px)' }}>
          {/* LEFT: Navigator */}
          <div className="w-56 border-r bg-muted/30 flex-shrink-0 overflow-y-auto">
            <div className="p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                Sub-Questions
              </p>
              {data.sub_questions.map((sq) => (
                <button
                  key={sq.id}
                  onClick={() => setSelectedSubId(sq.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between group",
                    selectedSubId === sq.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">({sq.label})</span>
                    <span className="line-clamp-1 text-xs opacity-80">
                      {sq.sub_question_text.slice(0, 40)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={cn(
                      "text-[10px] px-1.5",
                      selectedSubId === sq.id ? "border-primary-foreground/30 text-primary-foreground" : ""
                    )}>
                      {sq.marks}m
                    </Badge>
                    {answers[sq.id] && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* CENTER: Question / Reading Panel */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto p-6 space-y-6">
              {/* Main Question */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Question
                  </CardTitle>
                </CardHeader>
                <CardContent>
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

              {/* Selected Sub-Question Text */}
              {selectedSub && (
                <motion.div key={selectedSub.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                  <Card className="border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="font-mono text-primary">({selectedSub.label})</span>
                        <Badge variant="outline" className="text-xs">{selectedSub.marks} marks</Badge>
                        {selectedSub.command_term && (
                          <Badge variant="secondary" className="text-xs">{selectedSub.command_term}</Badge>
                        )}
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
            </div>
          </div>

          {/* RIGHT: Answer Panel */}
          <div className="w-[420px] border-l bg-muted/10 flex-shrink-0 overflow-y-auto">
            <div className="p-4 space-y-4">
              {selectedSub ? (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                      Answer ({selectedSub.label})
                    </h3>
                    <Badge variant="outline" className="text-xs">{selectedSub.answer_type.replace('_', ' ')}</Badge>
                  </div>

                  {/* Answer Input */}
                  <Card>
                    <CardContent className="p-4">
                      <AnswerBlock
                        questionId={selectedSub.id}
                        subQuestionId={selectedSub.id}
                        answerBlockType={selectedSub.answer_type as any}
                        answerBlockConfig={selectedSub.answer_block_config || {}}
                        marks={selectedSub.marks}
                        value={answers[selectedSub.id] || ''}
                        onChange={(val) => handleAnswerChange(selectedSub.id, val)}
                        disabled={false}
                      />
                    </CardContent>
                  </Card>

                  {/* Study Mode: Show Answer & Solution */}
                  {mode === 'study' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      {selectedSub.answer_key && (
                        <Card className="border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="w-4 h-4" /> Answer Key
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              {renderLatexContent(selectedSub.answer_key)}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {selectedSub.solution && (
                        <Card className="border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-300">
                              <Lightbulb className="w-4 h-4" /> Step-by-Step Solution
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                              {renderLatexContent(selectedSub.solution)}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </motion.div>
                  )}

                  {/* Navigation */}
                  <div className="flex gap-2 pt-2">
                    {data.sub_questions.findIndex(sq => sq.id === selectedSubId) > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const idx = data.sub_questions.findIndex(sq => sq.id === selectedSubId);
                          setSelectedSubId(data.sub_questions[idx - 1].id);
                        }}
                      >
                        ← Previous
                      </Button>
                    )}
                    {data.sub_questions.findIndex(sq => sq.id === selectedSubId) < data.sub_questions.length - 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const idx = data.sub_questions.findIndex(sq => sq.id === selectedSubId);
                          setSelectedSubId(data.sub_questions[idx + 1].id);
                        }}
                      >
                        Next →
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Select a sub-question to begin.</p>
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
