import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Play, Eye, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface MockTest {
  id: string;
  title: string;
  subject: string;
  topic: string;
  total_questions: number;
  time_limit_minutes: number | null;
}

interface TestAttempt {
  id: string;
  test_id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  submission_status: string;
}

interface EvalStatus {
  test_attempt_id: string;
  evaluation_status: string;
  final_score: number | null;
  final_marks: any;
}

const MockTestStatus = () => {
  const navigate = useNavigate();
  const { user, isDemo } = useAuth();
  const [availableTests, setAvailableTests] = useState<MockTest[]>([]);
  const [completedAttempts, setCompletedAttempts] = useState<(TestAttempt & { evalStatus?: EvalStatus; testTitle?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemo) {
      setLoading(false);
      return;
    }
    if (user?.id) fetchData();
  }, [user?.id, isDemo]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch published mock tests
      const { data: tests } = await supabase
        .from('mock_tests')
        .select('id, title, subject, topic, total_questions, time_limit_minutes')
        .eq('is_published', true);

      // Fetch user's attempts
      const { data: attempts } = await supabase
        .from('test_attempts')
        .select('id, test_id, score, total_questions, completed_at, submission_status')
        .eq('user_id', user!.id)
        .not('test_id', 'is', null)
        .order('completed_at', { ascending: false });

      // Fetch evaluation statuses for submitted attempts
      const attemptIds = (attempts || []).map(a => a.id);
      let evalMap: Record<string, EvalStatus> = {};
      if (attemptIds.length > 0) {
        const { data: evals } = await supabase
          .from('exam_evaluations')
          .select('test_attempt_id, evaluation_status, final_score, final_marks')
          .in('test_attempt_id', attemptIds);
        if (evals) {
          evalMap = evals.reduce((acc, e) => ({ ...acc, [e.test_attempt_id]: e }), {});
        }
      }

      const testsMap = (tests || []).reduce((acc, t) => ({ ...acc, [t.id]: t }), {} as Record<string, MockTest>);
      const attemptedTestIds = new Set((attempts || []).map(a => a.test_id));

      // Available = published tests not yet attempted
      setAvailableTests((tests || []).filter(t => !attemptedTestIds.has(t.id)));

      // Completed = attempts with their eval status
      setCompletedAttempts((attempts || []).map(a => ({
        ...a,
        evalStatus: evalMap[a.id],
        testTitle: testsMap[a.test_id]?.title || 'Mock Test'
      })));
    } catch (error) {
      console.error('Error fetching mock test status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (attempt: typeof completedAttempts[0]) => {
    const evalStatus = attempt.evalStatus?.evaluation_status;
    if (evalStatus === 'finalized') {
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" />Result Published</Badge>;
    }
    if (evalStatus === 'ai_evaluated' || evalStatus === 'manually_evaluated') {
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><Clock className="w-3 h-3 mr-1" />Under Review</Badge>;
    }
    return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="w-3 h-3 mr-1" />Under Evaluation</Badge>;
  };

  if (loading) {
    return <Card className="rounded-2xl"><CardContent className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      {/* Available Tests */}
      {availableTests.length > 0 && (
        <Card className="rounded-2xl shadow-md border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Play className="w-5 h-5 text-primary" />
              Available Mock Tests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableTests.map(test => (
              <div key={test.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{test.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {test.subject} • {test.total_questions} questions
                      {test.time_limit_minutes && ` • ${test.time_limit_minutes} min`}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/mock-exams/unified/${test.id}`, {
                    state: { testId: test.id, title: test.title, subject: test.subject, topic: test.topic }
                  })}
                >
                  Start Test
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Completed Tests */}
      {completedAttempts.length > 0 && (
        <Card className="rounded-2xl shadow-md border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Completed Mock Tests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedAttempts.map(attempt => (
              <div key={attempt.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{attempt.testTitle}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {getStatusBadge(attempt)}
                      {attempt.evalStatus?.evaluation_status === 'finalized' && attempt.evalStatus.final_score != null && (
                        <span className="text-xs font-semibold text-green-600">
                          Score: {attempt.evalStatus.final_score}/{attempt.evalStatus.final_marks?.possible || attempt.total_questions}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Submitted: {format(new Date(attempt.completed_at), 'dd MMM yyyy')}
                    </p>
                  </div>
                </div>
                {attempt.evalStatus?.evaluation_status === 'finalized' ? (
                  <Button size="sm" variant="outline" onClick={() => navigate(`/mock-exams/results/${attempt.id}`)}>
                    <Eye className="w-4 h-4 mr-1" />
                    View Result
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-xs">Pending</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {availableTests.length === 0 && completedAttempts.length === 0 && (
        <Card className="rounded-2xl">
          <CardContent className="p-6 text-center text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No mock tests available yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MockTestStatus;
