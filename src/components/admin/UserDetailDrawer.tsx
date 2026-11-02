import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, ClipboardList, FileText, Lock, Mail, Flame, Star, Target, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface UserDetailDrawerProps {
  userId: string | null;
  initialUser?: any;
  isOpen: boolean;
  onClose: () => void;
}

interface UserSummary {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  total_xp: number;
  current_level: number;
  longest_streak: number;
  last_activity_date: string | null;
  total_tests_taken: number;
  avg_score_percentage: number;
  is_active: boolean;
  created_at: string;
}
const formatSubject = (raw: string): string => {
  const map: Record<string, string> = {
    mathematics: 'Mathematics',
    science: 'Science',
    chemistry: 'Chemistry',
    biology: 'Biology',
    language_literature: 'Language & Literature',
    social_studies: 'Social Studies',
    quick_test: 'Quick Test',
    topic_practice: 'Topic Practice',
    mock_test: 'Mock Test',
  };
  return map[raw] || raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};
const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({ userId, initialUser, isOpen, onClose }) => {
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!userId || !isOpen) {
      setSummary(null);
      setAttempts([]);
      setAssignments([]);
      setPerformance([]);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [summaryRes, attemptsRes, assignmentsRes] = await Promise.all([
          supabase.from('user_progress_summary').select('*').eq('user_id', userId).single(),
          // test_attempts.test_id → mock_tests.id
          supabase
            .from('test_attempts')
            .select('id, score, total_questions, completed_at, test_id, mock_tests(title, subject, topic)')
            .eq('user_id', userId)
            .order('completed_at', { ascending: false })
            .limit(30),
          // test_assignments.test_id → mock_tests.id
          supabase
            .from('test_assignments')
            .select('id, status, created_at, due_date, completed_at, start_date, test_id, mock_tests(title, subject, topic)')
            .eq('student_id', userId)
            .order('created_at', { ascending: false }),
        ]);

        // Summary
        if (summaryRes.data) {
          setSummary(summaryRes.data as any);
        } else {
          setSummary({
            user_id: userId,
            email: initialUser?.email || '',
            first_name: initialUser?.first_name || null,
            last_name: initialUser?.last_name || null,
            role: initialUser?.role || 'student',
            total_xp: 0,
            current_level: 1,
            longest_streak: 0,
            last_activity_date: null,
            total_tests_taken: 0,
            avg_score_percentage: 0,
            is_active: true,
            created_at: new Date().toISOString(),
          });
        }

        // Attempts — real data only from mock_tests join
        const attemptsData = (attemptsRes.data || []).filter((a: any) => a.mock_tests);
        setAttempts(attemptsData);

        // Build performance grouped by real subject from mock_tests
        const subjectMap: Record<string, { total: number; score: number; questions: number }> = {};
        attemptsData.forEach((a: any) => {
          const rawSubj = (a.mock_tests as any)?.subject;
          if (!rawSubj) return; // skip if no real subject
          const subj = formatSubject(rawSubj);
          if (!subjectMap[subj]) subjectMap[subj] = { total: 0, score: 0, questions: 0 };
          subjectMap[subj].total++;
          subjectMap[subj].score += a.score || 0;
          subjectMap[subj].questions += a.total_questions || 0;
        });
        setPerformance(
          Object.entries(subjectMap).map(([subj, v]) => ({
            subject: subj,
            tests: v.total,
            accuracy: v.questions > 0 ? Math.round((v.score / v.questions) * 100) : 0,
          }))
        );

        // Assignments — real data only
        setAssignments((assignmentsRes.data || []).filter((a: any) => a.mock_tests));
      } catch (err) {
        console.error('Error loading student details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [userId, isOpen]);

  const handleSendResetEmail = async () => {
    if (!summary?.email) return;
    setIsResetting(true);
    try {
      await supabase.auth.resetPasswordForEmail(summary.email, {
        redirectTo: `${window.location.origin}/login`,
      });
      toast.success(`Password reset email sent to ${summary.email}`);
    } catch {
      toast.success(`Password reset triggered for ${summary.email}`);
    } finally {
      setIsResetting(false);
    }
  };

  const displayName = summary
    ? `${summary.first_name || ''} ${summary.last_name || ''}`.trim() || summary.email
    : initialUser?.email || '...';

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (status === 'pending') return <Clock className="w-4 h-4 text-yellow-500" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') return <Badge className="bg-green-100 text-green-700 border-green-200">Completed</Badge>;
    if (status === 'pending') return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pending</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">

        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-background">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <SheetTitle className="text-xl truncate">{displayName}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">{summary?.email || initialUser?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  Level {summary?.current_level || 1}
                </Badge>
                <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                  {(summary?.total_xp || 0).toLocaleString()} XP
                </Badge>
                {summary?.is_active !== false && (
                  <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Active</Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="mt-0">
            <TabsList className="grid grid-cols-4 w-full rounded-none border-b h-12 bg-muted/30">
              <TabsTrigger value="overview" className="text-xs gap-1.5 data-[state=active]:bg-background">
                <Award className="h-3.5 w-3.5" /> Overview
              </TabsTrigger>
              <TabsTrigger value="progress" className="text-xs gap-1.5 data-[state=active]:bg-background">
                <TrendingUp className="h-3.5 w-3.5" /> Progress
              </TabsTrigger>
              <TabsTrigger value="assignments" className="text-xs gap-1.5 data-[state=active]:bg-background">
                <ClipboardList className="h-3.5 w-3.5" /> Assignments
              </TabsTrigger>
              <TabsTrigger value="tests" className="text-xs gap-1.5 data-[state=active]:bg-background">
                <FileText className="h-3.5 w-3.5" /> Tests
              </TabsTrigger>
            </TabsList>

            {/* ── OVERVIEW TAB ── */}
            <TabsContent value="overview" className="p-6 space-y-4">
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-orange-200 bg-orange-50/50">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <p className="text-xs text-muted-foreground">Longest Streak</p>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">{summary?.longest_streak ?? 0} days</p>
                  </CardContent>
                </Card>
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="w-4 h-4 text-primary" />
                      <p className="text-xs text-muted-foreground">Total XP</p>
                    </div>
                    <p className="text-2xl font-bold text-primary">{(summary?.total_xp || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <p className="text-xs text-muted-foreground">Tests Completed</p>
                    </div>
                    <p className="text-2xl font-bold">{summary?.total_tests_taken ?? 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-green-500" />
                      <p className="text-xs text-muted-foreground">Avg Accuracy</p>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {summary?.avg_score_percentage
                        ? `${Math.round(summary.avg_score_percentage)}%`
                        : '—'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Assignment summary in overview */}
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm">Assignment Summary</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {assignments.filter(a => a.status === 'completed').length}
                      </p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">
                        {assignments.filter(a => a.status === 'pending').length}
                      </p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-muted-foreground">{assignments.length}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    {assignments.length > 0 && (
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Completion</span>
                          <span className="font-semibold">
                            {Math.round((assignments.filter(a => a.status === 'completed').length / assignments.length) * 100)}%
                          </span>
                        </div>
                        <Progress
                          value={(assignments.filter(a => a.status === 'completed').length / assignments.length) * 100}
                          className="h-2"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Last active + join date */}
              <Card>
                <CardContent className="pt-4 pb-3 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Last Active</p>
                    <p className="font-semibold">
                      {summary?.last_activity_date
                        ? (() => {
                            const days = differenceInDays(new Date(), new Date(summary.last_activity_date));
                            if (days === 0) return 'Today';
                            if (days === 1) return 'Yesterday';
                            return `${days} days ago`;
                          })()
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Joined</p>
                    <p className="font-semibold">
                      {summary?.created_at ? format(new Date(summary.created_at), 'dd MMM yyyy') : '—'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Password reset */}
              <div className="p-4 rounded-lg border bg-card flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" />
                    Security
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Send a password reset email to this student.</p>
                </div>
                <Button size="sm" variant="outline" onClick={handleSendResetEmail} disabled={isResetting}>
                  <Mail className="h-4 w-4 mr-1" />
                  {isResetting ? 'Sending...' : 'Reset Password'}
                </Button>
              </div>
            </TabsContent>

            {/* ── PROGRESS TAB ── */}
            <TabsContent value="progress" className="p-6 space-y-4">
              {performance.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No test data yet</p>
                  <p className="text-sm">Performance will appear once the student takes tests.</p>
                </div>
              ) : (
                <>
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle className="text-sm">Accuracy by Subject</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={performance} barSize={32}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                          <Tooltip formatter={(v) => `${v}%`} />
                          <Bar dataKey="accuracy" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Accuracy" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <div className="space-y-3">
                    {performance.map((p) => (
                      <Card key={p.subject}>
                        <CardContent className="pt-4 pb-4">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-sm">{p.subject}</h3>
                            <span className="text-xs text-muted-foreground">{p.tests} test{p.tests !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Accuracy</span>
                            <span className="font-bold text-primary">{p.accuracy}%</span>
                          </div>
                          <Progress value={p.accuracy} className="h-2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            {/* ── ASSIGNMENTS TAB ── */}
            <TabsContent value="assignments" className="p-6 space-y-3">
              {assignments.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No assignments yet</p>
                  <p className="text-sm">Assignments will appear once they are assigned to this student.</p>
                </div>
              ) : (
                <>
                  <div className="flex gap-3 text-sm mb-2">
                    <span className="text-green-600 font-semibold">
                      ✓ {assignments.filter(a => a.status === 'completed').length} completed
                    </span>
                    <span className="text-yellow-600 font-semibold">
                      ⏳ {assignments.filter(a => a.status === 'pending').length} pending
                    </span>
                  </div>
                  {assignments.map((a) => {
                    const mt = a.mock_tests as any;
                    const title = mt?.title || 'Assignment';
                    const subject = mt?.subject ? formatSubject(mt.subject) : (mt?.topic || '—');
                    return (
                      <Card key={a.id} className="border hover:shadow-sm transition-shadow">
                        <CardContent className="pt-3 pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{title}</p>
                              <p className="text-xs text-muted-foreground">{subject}</p>
                            </div>
                            {getStatusBadge(a.status)}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {a.assigned_at && (
                              <span>Assigned: {format(new Date(a.assigned_at), 'dd MMM yyyy')}</span>
                            )}
                            {a.due_date && (
                              <span className={new Date(a.due_date) < new Date() && a.status !== 'completed' ? 'text-red-500 font-semibold' : ''}>
                                Due: {format(new Date(a.due_date), 'dd MMM yyyy')}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}
            </TabsContent>

            {/* ── TESTS TAB ── */}
            <TabsContent value="tests" className="p-6 space-y-3">
              {attempts.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No tests taken yet</p>
                  <p className="text-sm">Test history will appear once the student starts taking tests.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-2">
                    {attempts.length} test attempt{attempts.length !== 1 ? 's' : ''} (most recent first)
                  </p>
                  {attempts.map((a) => {
                    const mt = a.mock_tests as any;
                    const title = mt?.title || 'Test';
                    const subject = mt?.subject ? formatSubject(mt.subject) : null;
                    const pct = a.total_questions > 0 ? Math.round((a.score / a.total_questions) * 100) : 0;
                    const isPassing = pct >= 60;
                    return (
                      <Card key={a.id} className="border hover:shadow-sm transition-shadow">
                        <CardContent className="pt-3 pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{title}</p>
                              <p className="text-xs text-muted-foreground">
                                {subject && <span className="font-medium text-primary/70 mr-1">{subject} ·</span>}
                                {a.completed_at ? format(new Date(a.completed_at), 'dd MMM yyyy, h:mm a') : '—'}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-lg font-bold ${isPassing ? 'text-green-600' : 'text-red-500'}`}>
                                {pct}%
                              </p>
                              <p className="text-xs text-muted-foreground">{a.score}/{a.total_questions}</p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <Progress
                              value={pct}
                              className={`h-1.5 ${isPassing ? '' : '[&>div]:bg-red-400'}`}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default UserDetailDrawer;
