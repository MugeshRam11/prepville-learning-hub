import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Loader2, ChevronRight, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ResultRow {
  test_attempt_id: string;
  test_id: string | null;
  evaluation_status: string;
  final_score: number | null;
  final_marks: any;
  created_at: string;
  mock_tests: { title: string; subject: string } | null;
  test_attempts: { completed_at: string | null } | null;
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  finalized: { label: 'Completed', className: 'bg-green-100 text-green-700 border-green-200' },
  pending_review: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  ai_evaluated: { label: 'Under Review', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  manually_evaluated: { label: 'Being Finalized', className: 'bg-amber-100 text-amber-700 border-amber-200' },
};

const ExamResults = () => {
  const navigate = useNavigate();
  const { user, isDemo } = useAuth();
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemo) { setLoading(false); return; }
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('exam_evaluations')
        .select('test_attempt_id, test_id, evaluation_status, final_score, final_marks, created_at, mock_tests(title, subject), test_attempts(completed_at)')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });
      setRows((data as unknown as ResultRow[]) || []);
      setLoading(false);
    })();
  }, [user?.id, isDemo]);

  const scorePct = (r: ResultRow): number | null => {
    if (r.evaluation_status !== 'finalized') return null;
    const possible = Number(r.final_marks?.possible || 0);
    if (!possible) return null;
    return Math.round((Number(r.final_score || 0) / possible) * 100);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="container max-w-3xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Exam Results</h1>
              <p className="text-sm text-muted-foreground">Your mock exam attempts and scores</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center space-y-3">
                <ClipboardList className="w-10 h-10 text-muted-foreground/50 mx-auto" />
                <p className="text-muted-foreground">You haven't completed any mock exams yet.</p>
                <button
                  onClick={() => navigate('/mock-exams/select')}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Browse mock exams →
                </button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => {
                const meta = STATUS_META[r.evaluation_status] || { label: r.evaluation_status, className: 'bg-muted text-muted-foreground' };
                const pct = scorePct(r);
                const dateStr = r.test_attempts?.completed_at || r.created_at;
                return (
                  <Card
                    key={r.test_attempt_id}
                    onClick={() => navigate(`/mock-exams/results/${r.test_attempt_id}`)}
                    className="cursor-pointer transition-all hover:shadow-md hover:border-violet-500/30"
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{r.mock_tests?.title || 'Mock Exam'}</h3>
                          <Badge variant="outline" className="text-[10px] capitalize bg-violet-50 text-violet-700 border-violet-200">
                            {r.mock_tests?.subject || '—'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {dateStr ? format(new Date(dateStr), 'dd MMM yyyy, HH:mm') : '—'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {pct !== null && (
                          <span className={cn(
                            "text-lg font-bold",
                            pct >= 80 ? "text-green-600" : pct >= 60 ? "text-amber-600" : "text-red-600"
                          )}>
                            {pct}%
                          </span>
                        )}
                        <Badge variant="outline" className={cn("text-[10px]", meta.className)}>
                          {meta.label}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ExamResults;
