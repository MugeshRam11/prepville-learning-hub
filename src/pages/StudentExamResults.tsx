import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  CheckCircle, XCircle, AlertCircle, Clock, ArrowLeft, Trophy,
  Lightbulb, Target, TrendingUp, Loader2, FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface QuestionEvaluation {
  questionId: string;
  subQuestionId?: string;
  questionText: string;
  studentAnswer: string;
  correctAnswer?: string;
  marksAwarded: number;
  maxMarks: number;
  feedback?: string;
  suggestions?: {
    whatYouDidWell?: string;
    whatYouMissed?: string;
    howToImprove?: string;
  };
  isCorrect: boolean;
}

const StudentExamResults = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [testMeta, setTestMeta] = useState<any>(null);
  const [questionEvals, setQuestionEvals] = useState<QuestionEvaluation[]>([]);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    if (attemptId) fetchResults();
  }, [attemptId]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }

      // Get evaluation for this attempt
      const { data: evalData, error: evalError } = await supabase
        .from('exam_evaluations')
        .select('*, test_attempts(answers, score, total_questions, completed_at, time_taken_seconds)')
        .eq('test_attempt_id', attemptId)
        .eq('student_id', user.id)
        .single();

      if (evalError) throw evalError;

      setEvaluation(evalData);
      setStatus(evalData.evaluation_status);

      // Get test metadata
      if (evalData.test_id) {
        const { data: test } = await supabase
          .from('mock_tests')
          .select('title, subject, topic, total_questions')
          .eq('id', evalData.test_id)
          .single();
        setTestMeta(test);
      }

      // Build question evaluations from stored data
      if (evalData.evaluation_status === 'finalized' && evalData.question_evaluations) {
        const evals = (evalData.question_evaluations as any[]).map((qe: any) => ({
          questionId: qe.questionId,
          subQuestionId: qe.subQuestionId,
          questionText: qe.questionText || '',
          studentAnswer: qe.studentAnswer || '',
          correctAnswer: qe.correctAnswer,
          marksAwarded: qe.marksAwarded || 0,
          maxMarks: qe.maxMarks || 1,
          feedback: qe.feedback,
          suggestions: qe.suggestions,
          isCorrect: qe.marksAwarded === qe.maxMarks,
        }));
        setQuestionEvals(evals);
      }
    } catch (error: any) {
      console.error('Error loading results:', error);
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Pending states
  if (status !== 'finalized') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-8 pb-6 text-center space-y-4">
              <Clock className="w-12 h-12 text-amber-500 mx-auto" />
              <h2 className="text-xl font-bold">Evaluation In Progress</h2>
              <p className="text-muted-foreground text-sm">
                {status === 'pending_review' && 'Your exam is awaiting evaluation. Results will be available within 24 hours.'}
                {status === 'ai_evaluated' && 'AI evaluation is complete. An evaluator will review your results shortly.'}
                {status === 'manually_evaluated' && 'Your exam has been evaluated and is being finalized.'}
              </p>
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                {status === 'pending_review' ? 'Pending' :
                 status === 'ai_evaluated' ? 'Under Review' :
                 status === 'manually_evaluated' ? 'Being Finalized' : status}
              </Badge>
              <Button variant="outline" onClick={() => navigate('/dashboard')} className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Published results
  const totalAwarded = evaluation?.final_score || 0;
  const totalPossible = evaluation?.final_marks?.possible || 0;
  const percentage = totalPossible > 0 ? Math.round((totalAwarded / totalPossible) * 100) : 0;
  const correctCount = questionEvals.filter(q => q.isCorrect).length;
  const partialCount = questionEvals.filter(q => !q.isCorrect && q.marksAwarded > 0).length;
  const incorrectCount = questionEvals.filter(q => q.marksAwarded === 0).length;

  const getScoreColor = () => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="container max-w-4xl space-y-6">
          {/* Back button */}
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          {/* Score Summary */}
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-8 pb-6">
              <div className="text-center space-y-4">
                <Trophy className="w-12 h-12 text-primary mx-auto" />
                <h1 className="text-2xl font-bold">{testMeta?.title || 'Exam Results'}</h1>
                {testMeta && (
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="outline">{testMeta.subject}</Badge>
                    {testMeta.topic && <Badge variant="secondary">{testMeta.topic}</Badge>}
                  </div>
                )}

                <div className={cn("text-5xl font-black", getScoreColor())}>
                  {percentage}%
                </div>
                <p className="text-muted-foreground">
                  {totalAwarded} / {totalPossible} marks
                </p>

                <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{correctCount}</div>
                    <div className="text-xs text-muted-foreground">Correct</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">{partialCount}</div>
                    <div className="text-xs text-muted-foreground">Partial</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{incorrectCount}</div>
                    <div className="text-xs text-muted-foreground">Incorrect</div>
                  </div>
                </div>

                {evaluation?.feedback && (
                  <div className="bg-muted/50 rounded-lg p-4 text-left mt-4">
                    <p className="text-sm font-medium mb-1">Evaluator Feedback</p>
                    <p className="text-sm text-muted-foreground">{evaluation.feedback}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Question-by-question results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Detailed Question Review
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {questionEvals.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No detailed breakdown available.</p>
              ) : (
                questionEvals.map((qe, index) => (
                  <Card key={`${qe.questionId}-${qe.subQuestionId || ''}`} className="border">
                    <CardContent className="pt-4 space-y-3">
                      {/* Question header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {qe.isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                          ) : qe.marksAwarded > 0 ? (
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-sm">
                              Q{index + 1}{qe.subQuestionId ? ` (${qe.subQuestionId})` : ''}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2">{qe.questionText}</p>
                          </div>
                        </div>
                        <Badge
                          variant={qe.isCorrect ? 'default' : qe.marksAwarded > 0 ? 'secondary' : 'destructive'}
                          className="shrink-0"
                        >
                          {qe.marksAwarded}/{qe.maxMarks}
                        </Badge>
                      </div>

                      {/* Student answer */}
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Your Answer</p>
                        <p className="text-sm">{qe.studentAnswer || 'No answer provided'}</p>
                      </div>

                      {/* Feedback */}
                      {qe.feedback && (
                        <div className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg">
                          {qe.feedback}
                        </div>
                      )}

                      {/* Suggestions */}
                      {qe.suggestions && (
                        <div className="space-y-2 border-t pt-3">
                          {qe.suggestions.whatYouDidWell && (
                            <div className="flex items-start gap-2 text-sm">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                              <div>
                                <span className="font-medium text-green-700 dark:text-green-400">What you did well: </span>
                                <span className="text-muted-foreground">{qe.suggestions.whatYouDidWell}</span>
                              </div>
                            </div>
                          )}
                          {qe.suggestions.whatYouMissed && (
                            <div className="flex items-start gap-2 text-sm">
                              <Target className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                              <div>
                                <span className="font-medium text-amber-700 dark:text-amber-400">What you missed: </span>
                                <span className="text-muted-foreground">{qe.suggestions.whatYouMissed}</span>
                              </div>
                            </div>
                          )}
                          {qe.suggestions.howToImprove && (
                            <div className="flex items-start gap-2 text-sm">
                              <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                              <div>
                                <span className="font-medium text-primary">How to improve: </span>
                                <span className="text-muted-foreground">{qe.suggestions.howToImprove}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default StudentExamResults;
