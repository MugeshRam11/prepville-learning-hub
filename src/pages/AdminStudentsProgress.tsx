import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Users, Activity, Award, TrendingUp, Eye, Target, Flame, CheckCircle, Clock, FileText, HelpCircle, Check, X } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface StudentProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  student_id: string | null;
  roll_number: string | null;
  class_name: string | null;
  is_active: boolean;
  created_at: string;
}

interface StudentStats {
  totalAttempts: number;
  correctAnswers: number;
  totalQuestions: number;
  avgScore: number;
  lastActive: string | null;
  currentStreak: number;
  bestStreak: number;
  assignmentsTotal: number;
  assignmentsCompleted: number;
  assignmentsPending: number;
}

interface DetailedStudent extends StudentProfile {
  stats: StudentStats;
  attempts: any[];
  assignments: any[];
  streakData: any[];
  xpData: any;
}

interface QuestionSolution {
  id: string;
  question_text: string;
  options: string[] | any;
  correct_answer: string;
  explanation: string | null;
  user_answer: string | null;
  is_correct: boolean | null;
  marks: number | null;
}

const AdminStudentsProgress = () => {
  const [activeTab, setActiveTab] = useState('students-progress');
  const [students, setStudents] = useState<(StudentProfile & { stats: StudentStats })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<DetailedStudent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Solution Review Modal State
  const [solutionModalOpen, setSolutionModalOpen] = useState(false);
  const [selectedAttemptForSolution, setSelectedAttemptForSolution] = useState<any>(null);
  const [attemptQuestions, setAttemptQuestions] = useState<QuestionSolution[]>([]);
  const [loadingSolutions, setLoadingSolutions] = useState(false);

  useEffect(() => {
    fetchStudents();

    const channel = supabase
      .channel('admin-student-progress-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'test_attempts' },
        () => fetchStudents()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'test_assignments' },
        () => fetchStudents()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_streaks' },
        () => fetchStudents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // Fetch all student accounts directly from profiles or user_progress_summary
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      let loadedProfiles: StudentProfile[] = profilesData || [];

      if (loadedProfiles.length === 0) {
        const { data: summaryData } = await supabase
          .from('user_progress_summary')
          .select('*')
          .eq('role', 'student');

        if (summaryData && summaryData.length > 0) {
          loadedProfiles = summaryData.map((u: any) => ({
            id: u.user_id,
            email: u.email,
            first_name: u.first_name,
            last_name: u.last_name,
            student_id: null,
            roll_number: null,
            class_name: null,
            is_active: u.is_active ?? true,
            created_at: u.created_at || new Date().toISOString(),
          }));
        }
      }

      // Calculate realtime stats for each student from Supabase
      const studentsWithStats = await Promise.all(
        loadedProfiles.map(async (profile) => {
          const stats = await fetchStudentStats(profile.id);
          return { ...profile, stats };
        })
      );

      setStudents(studentsWithStats);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load student progress');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentStats = async (userId: string): Promise<StudentStats> => {
    try {
      const [attemptsRes, assignmentsRes, streaksRes] = await Promise.all([
        supabase
          .from('test_attempts')
          .select('score, total_questions, completed_at')
          .eq('user_id', userId),
        supabase
          .from('test_assignments')
          .select('status')
          .eq('student_id', userId),
        supabase
          .from('user_streaks')
          .select('current_streak, best_streak, last_activity_date')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(1)
      ]);

      const attempts = attemptsRes.data || [];
      const assignments = assignmentsRes.data || [];
      const streaks = streaksRes.data || [];

      const totalAttempts = attempts.length;
      const correctAnswers = attempts.reduce((sum, a) => sum + (a.score || 0), 0);
      const totalQuestions = attempts.reduce((sum, a) => sum + (a.total_questions || 0), 0);
      const avgScore = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
      
      const lastAttempt = attempts.sort((a, b) => 
        new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()
      )[0];

      return {
        totalAttempts,
        correctAnswers,
        totalQuestions,
        avgScore,
        lastActive: lastAttempt?.completed_at || streaks[0]?.last_activity_date || null,
        currentStreak: streaks[0]?.current_streak || 0,
        bestStreak: streaks[0]?.best_streak || 0,
        assignmentsTotal: assignments.length,
        assignmentsCompleted: assignments.filter(a => a.status === 'completed').length,
        assignmentsPending: assignments.filter(a => a.status !== 'completed').length
      };
    } catch (error) {
      return {
        totalAttempts: 0,
        correctAnswers: 0,
        totalQuestions: 0,
        avgScore: 0,
        lastActive: null,
        currentStreak: 0,
        bestStreak: 0,
        assignmentsTotal: 0,
        assignmentsCompleted: 0,
        assignmentsPending: 0
      };
    }
  };

  const fetchStudentDetails = async (student: StudentProfile & { stats: StudentStats }) => {
    setLoadingDetails(true);
    setDetailsOpen(true);
    
    try {
      const { data: attempts } = await supabase
        .from('test_attempts')
        .select(`
          *,
          mock_tests (title, subject, topic)
        `)
        .eq('user_id', student.id)
        .order('completed_at', { ascending: false })
        .limit(50);

      const { data: assignments } = await supabase
        .from('test_assignments')
        .select(`
          *,
          mock_tests (title, subject, topic)
        `)
        .eq('student_id', student.id)
        .order('created_at', { ascending: false });

      const { data: streakData } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', student.id)
        .order('date', { ascending: false })
        .limit(30);

      const { data: xpData } = await supabase
        .from('user_xp')
        .select('*')
        .eq('user_id', student.id)
        .single();

      setSelectedStudent({
        ...student,
        attempts: attempts || [],
        assignments: assignments || [],
        streakData: streakData || [],
        xpData: xpData || { total_xp: 0, current_level: 1 }
      });
    } catch (error) {
      console.error('Error fetching student details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewAttemptSolutions = async (attempt: any) => {
    setSelectedAttemptForSolution(attempt);
    setSolutionModalOpen(true);
    setLoadingSolutions(true);

    try {
      const testId = attempt.test_id;

      const { data: questions } = await supabase
        .from('mock_questions')
        .select('*')
        .eq('test_id', testId);

      const { data: answers } = await supabase
        .from('user_answers')
        .select('*')
        .eq('test_attempt_id', attempt.id);

      const answerMap = new Map((answers || []).map(a => [a.question_id, a]));

      if (questions && questions.length > 0) {
        const solutions: QuestionSolution[] = questions.map((q: any) => {
          const uAns = answerMap.get(q.id);
          const isCorrect = uAns?.is_correct ?? (uAns?.user_answer === q.correct_answer);
          return {
            id: q.id,
            question_text: q.question_text || q.question || 'Practice Question',
            options: q.options || [],
            correct_answer: q.correct_answer || 'A',
            explanation: q.explanation || q.solution_explanation || 'Solution logic step-by-step.',
            user_answer: uAns?.user_answer || 'Not Attempted',
            is_correct: isCorrect,
            marks: q.marks || 1
          };
        });
        setAttemptQuestions(solutions);
      } else {
        setAttemptQuestions([]);
      }
    } catch (error) {
      console.error('Error fetching solutions:', error);
    } finally {
      setLoadingSolutions(false);
    }
  };

  const getActivityStatus = (lastActive: string | null): { label: string; color: string } => {
    if (!lastActive) return { label: 'Never', color: 'text-muted-foreground' };
    
    const days = differenceInDays(new Date(), new Date(lastActive));
    if (days === 0) return { label: 'Today', color: 'text-green-600' };
    if (days === 1) return { label: 'Yesterday', color: 'text-green-600' };
    if (days <= 7) return { label: `${days}d ago`, color: 'text-yellow-600' };
    if (days <= 30) return { label: `${days}d ago`, color: 'text-orange-600' };
    return { label: `${days}d ago`, color: 'text-red-600' };
  };

  const filteredStudents = students.filter(s => {
    const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
    const term = searchTerm.toLowerCase();
    return (
      fullName.includes(term) ||
      s.email.toLowerCase().includes(term)
    );
  });

  const totalStats = {
    totalStudents: students.length,
    activeToday: students.filter(s => getActivityStatus(s.stats.lastActive).label === 'Today').length,
    avgProblemsPerStudent: Math.round(
      students.reduce((sum, s) => sum + s.stats.totalQuestions, 0) / Math.max(students.length, 1)
    ),
    avgAccuracy: Math.round(
      students.reduce((sum, s) => sum + s.stats.avgScore, 0) / Math.max(students.length, 1)
    )
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 ml-64 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Student Progress Dashboard
            </h1>
            <p className="text-muted-foreground">Monitor real-time student learning, solved problems, and solutions</p>
          </div>

          {/* Realtime Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalStats.totalStudents}</p>
                    <p className="text-xs text-muted-foreground">Total Registered Students</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Activity className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalStats.activeToday}</p>
                    <p className="text-xs text-muted-foreground">Active Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalStats.avgProblemsPerStudent}</p>
                    <p className="text-xs text-muted-foreground">Avg Problems Solved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalStats.avgAccuracy}%</p>
                    <p className="text-xs text-muted-foreground">Avg Accuracy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Bar */}
          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by student name or email..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Student Cards Grid (Real-time DB counts only) */}
          {loading ? (
            <div className="text-center py-12">Loading student realtime progress...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No registered students found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map((student) => {
                const activity = getActivityStatus(student.stats.lastActive);
                return (
                  <Card key={student.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-base">
                            {student.first_name || student.last_name
                              ? `${student.first_name || ''} ${student.last_name || ''}`.trim()
                              : student.email}
                          </h3>
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        </div>
                        <Badge variant={student.is_active ? 'default' : 'secondary'}>
                          {student.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground border-t pt-2">
                        <div>
                          <strong>ID:</strong> {student.student_id || '—'}
                        </div>
                        <div>
                          <strong>Class:</strong> {student.class_name || '—'}
                        </div>
                        <div className={activity.color + ' col-span-2'}>
                          <strong>Last Active:</strong> {activity.label}
                        </div>
                      </div>

                      {/* Real DB Metrics without Fake Fallbacks */}
                      <div className="grid grid-cols-3 gap-2 text-center border-t border-b py-2">
                        <div>
                          <p className="font-bold text-base text-orange-500">🔥 {student.stats.currentStreak}</p>
                          <p className="text-[11px] text-muted-foreground">Streak</p>
                        </div>
                        <div>
                          <p className="font-bold text-base text-foreground">{student.stats.totalQuestions}</p>
                          <p className="text-[11px] text-muted-foreground">Problems</p>
                        </div>
                        <div>
                          <p className="font-bold text-base text-primary">{student.stats.avgScore}%</p>
                          <p className="text-[11px] text-muted-foreground">Accuracy</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Assignments:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600 font-bold">
                            ✓ {student.stats.assignmentsCompleted}
                          </span>
                          <span className="text-yellow-600 font-bold">
                            ⏳ {student.stats.assignmentsPending}
                          </span>
                        </div>
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full gap-2 text-xs"
                        onClick={() => fetchStudentDetails(student)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Student Solved Problems
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Details Dialog */}
          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  Student Details: {selectedStudent?.first_name} {selectedStudent?.last_name} ({selectedStudent?.email})
                </DialogTitle>
              </DialogHeader>
              
              {loadingDetails ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  Loading student details...
                </div>
              ) : selectedStudent && (
                <ScrollArea className="flex-1">
                  <Tabs defaultValue="practice" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="practice">Practice & Problems Solved</TabsTrigger>
                      <TabsTrigger value="assignments">Assignments</TabsTrigger>
                      <TabsTrigger value="activity">Activity Log</TabsTrigger>
                    </TabsList>

                    <TabsContent value="practice" className="space-y-4">
                      <div className="grid grid-cols-4 gap-4">
                        <Card>
                          <CardContent className="pt-4 text-center">
                            <p className="text-3xl font-bold">{selectedStudent.stats.totalQuestions}</p>
                            <p className="text-sm text-muted-foreground">Problems Attempted</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4 text-center">
                            <p className="text-3xl font-bold text-green-600">{selectedStudent.stats.correctAnswers}</p>
                            <p className="text-sm text-muted-foreground">Solved Correctly</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4 text-center">
                            <p className="text-3xl font-bold text-orange-600">
                              {Math.max(0, selectedStudent.stats.totalQuestions - selectedStudent.stats.correctAnswers)}
                            </p>
                            <p className="text-sm text-muted-foreground">Retried/Wrong</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4 text-center">
                            <p className="text-3xl font-bold">{selectedStudent.stats.totalAttempts}</p>
                            <p className="text-sm text-muted-foreground">Practice Submissions</p>
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Realtime Solved Attempts</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {selectedStudent.attempts.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                              No practice attempts found in database.
                            </div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Test / Topic</TableHead>
                                  <TableHead>Subject</TableHead>
                                  <TableHead>Score</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Date</TableHead>
                                  <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedStudent.attempts.map((attempt: any) => {
                                  const totalQ = attempt.total_questions || 10;
                                  const score = attempt.score || 0;
                                  const pct = Math.round((score / totalQ) * 100);
                                  return (
                                    <TableRow key={attempt.id}>
                                      <TableCell className="font-semibold text-primary">
                                        {attempt.mock_tests?.title || attempt.mock_tests?.topic || 'Practice Attempt'}
                                      </TableCell>
                                      <TableCell>{attempt.mock_tests?.subject || 'General'}</TableCell>
                                      <TableCell>
                                        <span className="font-bold">{score}/{totalQ}</span> ({pct}%)
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant={pct >= 90 ? 'default' : pct >= 60 ? 'secondary' : 'outline'}>
                                          {pct >= 90 ? 'Perfect' : pct >= 60 ? 'Completed' : 'Needs Practice'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        {attempt.completed_at 
                                          ? format(new Date(attempt.completed_at), 'MMM d, yyyy HH:mm')
                                          : 'Recent'}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleViewAttemptSolutions(attempt)}
                                        >
                                          <Eye className="h-4 w-4 mr-1 text-primary" />
                                          View Solutions
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="assignments" className="space-y-4">
                      <Card>
                        <CardContent className="pt-4">
                          {selectedStudent.assignments.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                              No assignments found for this student.
                            </div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Assignment Test</TableHead>
                                  <TableHead>Subject</TableHead>
                                  <TableHead>Assigned Date</TableHead>
                                  <TableHead>Due Date</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedStudent.assignments.map((assignment: any) => (
                                  <TableRow key={assignment.id}>
                                    <TableCell className="font-medium">{assignment.mock_tests?.title || 'Assignment'}</TableCell>
                                    <TableCell>{assignment.mock_tests?.subject || 'Mathematics'}</TableCell>
                                    <TableCell>
                                      {assignment.start_date ? format(new Date(assignment.start_date), 'MMM d, yyyy') : '—'}
                                    </TableCell>
                                    <TableCell>
                                      {assignment.due_date ? format(new Date(assignment.due_date), 'MMM d, yyyy') : '—'}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={assignment.status === 'completed' ? 'default' : 'secondary'}>
                                        {assignment.status || 'Pending'}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="activity" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardContent className="pt-4 text-center">
                            <p className="text-3xl font-bold">{selectedStudent.attempts.length}</p>
                            <p className="text-sm text-muted-foreground">Total Database Attempts</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4 text-center">
                            <p className="text-3xl font-bold">
                              {selectedStudent.stats.lastActive 
                                ? format(new Date(selectedStudent.stats.lastActive), 'MMM d, HH:mm')
                                : 'Never'}
                            </p>
                            <p className="text-sm text-muted-foreground">Last Activity</p>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>
                </ScrollArea>
              )}
            </DialogContent>
          </Dialog>

          {/* Solutions Breakdown Dialog */}
          <Dialog open={solutionModalOpen} onOpenChange={setSolutionModalOpen}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <FileText className="h-5 w-5 text-primary" />
                  Solved Problems & Solutions Review
                </DialogTitle>
                <DialogDescription>
                  {selectedAttemptForSolution?.mock_tests?.title || 'Practice Test Attempt'}
                </DialogDescription>
              </DialogHeader>

              {loadingSolutions ? (
                <div className="py-12 text-center text-muted-foreground">
                  Loading solutions from database...
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 bg-muted/30 p-3 rounded-lg border text-center text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Score</p>
                      <p className="font-bold text-foreground">
                        {selectedAttemptForSolution?.score || 0}/{selectedAttemptForSolution?.total_questions || 10}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Accuracy</p>
                      <p className="font-bold text-green-600">
                        {Math.round(((selectedAttemptForSolution?.score || 0) / (selectedAttemptForSolution?.total_questions || 10)) * 100)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Subject</p>
                      <p className="font-bold text-primary">
                        {selectedAttemptForSolution?.mock_tests?.subject || 'Physics'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {attemptQuestions.map((q, idx) => (
                      <div key={q.id || idx} className="p-4 rounded-lg border bg-card space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-sm">
                            Question {idx + 1}: {q.question_text}
                          </p>
                          <Badge variant={q.is_correct ? 'default' : 'destructive'} className="shrink-0 text-xs">
                            {q.is_correct ? <Check className="h-3 w-3 mr-1 inline" /> : <X className="h-3 w-3 mr-1 inline" />}
                            {q.is_correct ? 'Correct' : 'Incorrect'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                          <div className="p-2 rounded bg-muted/40 border">
                            <span className="font-medium text-muted-foreground">Student Answer:</span>
                            <p className="font-bold text-foreground mt-0.5">{q.user_answer}</p>
                          </div>
                          <div className="p-2 rounded bg-green-500/10 border border-green-500/20 text-green-800 dark:text-green-300">
                            <span className="font-medium">Correct Answer:</span>
                            <p className="font-bold mt-0.5">{q.correct_answer}</p>
                          </div>
                        </div>

                        <div className="p-3 rounded bg-primary/5 border border-primary/20 text-xs space-y-1">
                          <p className="font-semibold text-primary flex items-center gap-1">
                            <HelpCircle className="h-3.5 w-3.5" />
                            Step-by-Step Solution:
                          </p>
                          <p className="text-muted-foreground leading-relaxed">
                            {q.explanation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default AdminStudentsProgress;
