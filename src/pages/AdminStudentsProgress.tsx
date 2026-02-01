import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Users, Activity, Award, TrendingUp, Eye, Calendar, Target, Flame, CheckCircle, Clock, XCircle } from 'lucide-react';
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

const AdminStudentsProgress = () => {
  const [activeTab, setActiveTab] = useState('students-progress');
  const [students, setStudents] = useState<(StudentProfile & { stats: StudentStats })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<DetailedStudent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // Fetch all student profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // For each student, fetch their stats
      const studentsWithStats = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const stats = await fetchStudentStats(profile.id);
          return { ...profile, stats };
        })
      );

      setStudents(studentsWithStats);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentStats = async (userId: string): Promise<StudentStats> => {
    try {
      // Fetch test attempts
      const { data: attempts } = await supabase
        .from('test_attempts')
        .select('score, total_questions, completed_at')
        .eq('user_id', userId);

      // Fetch assignments
      const { data: assignments } = await supabase
        .from('test_assignments')
        .select('status')
        .eq('student_id', userId);

      // Fetch streak data
      const { data: streaks } = await supabase
        .from('user_streaks')
        .select('current_streak, best_streak, last_activity_date')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1);

      const totalAttempts = attempts?.length || 0;
      const correctAnswers = attempts?.reduce((sum, a) => sum + (a.score || 0), 0) || 0;
      const totalQuestions = attempts?.reduce((sum, a) => sum + (a.total_questions || 0), 0) || 0;
      const avgScore = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
      
      const lastAttempt = attempts?.sort((a, b) => 
        new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()
      )[0];

      return {
        totalAttempts,
        correctAnswers,
        totalQuestions,
        avgScore,
        lastActive: lastAttempt?.completed_at || streaks?.[0]?.last_activity_date || null,
        currentStreak: streaks?.[0]?.current_streak || 0,
        bestStreak: streaks?.[0]?.best_streak || 0,
        assignmentsTotal: assignments?.length || 0,
        assignmentsCompleted: assignments?.filter(a => a.status === 'completed').length || 0,
        assignmentsPending: assignments?.filter(a => a.status !== 'completed').length || 0
      };
    } catch (error) {
      console.error('Error fetching student stats:', error);
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
      // Fetch detailed test attempts
      const { data: attempts } = await supabase
        .from('test_attempts')
        .select(`
          *,
          tests (title, test_type)
        `)
        .eq('user_id', student.id)
        .order('completed_at', { ascending: false })
        .limit(50);

      // Fetch assignments with test info
      const { data: assignments } = await supabase
        .from('test_assignments')
        .select(`
          *,
          mock_tests (title, subject, topic)
        `)
        .eq('student_id', student.id)
        .order('created_at', { ascending: false });

      // Fetch streak history
      const { data: streakData } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', student.id)
        .order('date', { ascending: false })
        .limit(30);

      // Fetch XP data
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
      toast.error('Failed to load student details');
    } finally {
      setLoadingDetails(false);
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
      s.email.toLowerCase().includes(term) ||
      s.student_id?.toLowerCase().includes(term) ||
      s.roll_number?.toLowerCase().includes(term) ||
      s.class_name?.toLowerCase().includes(term)
    );
  });

  // Stats summary
  const totalStats = {
    totalStudents: students.length,
    activeToday: students.filter(s => {
      const activity = getActivityStatus(s.stats.lastActive);
      return activity.label === 'Today';
    }).length,
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
            <p className="text-muted-foreground">Monitor all student activity, performance, and learning progress</p>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalStats.totalStudents}</p>
                    <p className="text-xs text-muted-foreground">Total Students</p>
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
                    <p className="text-xs text-muted-foreground">Avg Problems/Student</p>
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

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name, email, student ID, roll number, or class..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Student Cards Grid */}
          {loading ? (
            <div className="text-center py-12">Loading students...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No students found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map(student => {
                const activity = getActivityStatus(student.stats.lastActive);
                return (
                  <Card key={student.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">
                            {student.first_name || ''} {student.last_name || ''}
                            {!student.first_name && !student.last_name && student.email}
                          </h3>
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        </div>
                        <Badge variant={student.is_active ? 'default' : 'secondary'}>
                          {student.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        {student.student_id && (
                          <div>
                            <span className="text-muted-foreground">ID:</span> {student.student_id}
                          </div>
                        )}
                        {student.roll_number && (
                          <div>
                            <span className="text-muted-foreground">Roll:</span> {student.roll_number}
                          </div>
                        )}
                        {student.class_name && (
                          <div>
                            <span className="text-muted-foreground">Class:</span> {student.class_name}
                          </div>
                        )}
                        <div className={activity.color}>
                          <span className="text-muted-foreground">Last Active:</span> {activity.label}
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-2 border-t border-b mb-3">
                        <div className="text-center">
                          <p className="font-bold text-lg">{student.stats.currentStreak}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Flame className="w-3 h-3 text-orange-500" /> Streak
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-lg">{student.stats.totalQuestions}</p>
                          <p className="text-xs text-muted-foreground">Problems</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-lg">{student.stats.avgScore}%</p>
                          <p className="text-xs text-muted-foreground">Accuracy</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm mb-3">
                        <span className="text-muted-foreground">Assignments:</span>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-3 h-3" /> {student.stats.assignmentsCompleted}
                          </span>
                          <span className="flex items-center gap-1 text-yellow-600">
                            <Clock className="w-3 h-3" /> {student.stats.assignmentsPending}
                          </span>
                        </div>
                      </div>

                      <Button 
                        variant="outline" 
                        className="w-full gap-2"
                        onClick={() => fetchStudentDetails(student)}
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Student Details Dialog */}
          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  Student Details: {selectedStudent?.first_name} {selectedStudent?.last_name}
                </DialogTitle>
              </DialogHeader>
              
              {loadingDetails ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  Loading details...
                </div>
              ) : selectedStudent && (
                <ScrollArea className="flex-1">
                  <Tabs defaultValue="activity" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="activity">Activity</TabsTrigger>
                      <TabsTrigger value="practice">Practice & Problems</TabsTrigger>
                      <TabsTrigger value="assignments">Assignments</TabsTrigger>
                      <TabsTrigger value="performance">Performance</TabsTrigger>
                      <TabsTrigger value="streaks">Streaks</TabsTrigger>
                    </TabsList>

                    <TabsContent value="activity" className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="pt-4 text-center">
                            <p className="text-3xl font-bold">{selectedStudent.attempts.length}</p>
                            <p className="text-sm text-muted-foreground">Total Login Sessions</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4 text-center">
                            <p className="text-3xl font-bold">
                              {selectedStudent.stats.lastActive 
                                ? format(new Date(selectedStudent.stats.lastActive), 'MMM d, HH:mm')
                                : 'Never'}
                            </p>
                            <p className="text-sm text-muted-foreground">Last Login</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4 text-center">
                            <p className="text-3xl font-bold">{selectedStudent.xpData?.current_level || 1}</p>
                            <p className="text-sm text-muted-foreground">Current Level</p>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

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
                              {selectedStudent.stats.totalQuestions - selectedStudent.stats.correctAnswers}
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
                          <CardTitle className="text-base">Recent Attempts</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Test</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedStudent.attempts.slice(0, 10).map((attempt: any) => (
                                <TableRow key={attempt.id}>
                                  <TableCell>{attempt.tests?.title || 'Unknown Test'}</TableCell>
                                  <TableCell>
                                    {attempt.score}/{attempt.total_questions} 
                                    ({Math.round((attempt.score / attempt.total_questions) * 100)}%)
                                  </TableCell>
                                  <TableCell>
                                    {attempt.completed_at 
                                      ? format(new Date(attempt.completed_at), 'MMM d, yyyy HH:mm')
                                      : '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="assignments" className="space-y-4">
                      <Card>
                        <CardContent className="pt-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Test</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Assigned</TableHead>
                                <TableHead>Due</TableHead>
                                <TableHead>Completed</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedStudent.assignments.map((assignment: any) => (
                                <TableRow key={assignment.id}>
                                  <TableCell>{assignment.mock_tests?.title}</TableCell>
                                  <TableCell>{assignment.mock_tests?.subject}</TableCell>
                                  <TableCell>
                                    {format(new Date(assignment.start_date), 'MMM d')}
                                  </TableCell>
                                  <TableCell>
                                    {format(new Date(assignment.due_date), 'MMM d')}
                                  </TableCell>
                                  <TableCell>
                                    {assignment.completed_at 
                                      ? format(new Date(assignment.completed_at), 'MMM d')
                                      : '-'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={
                                      assignment.status === 'completed' ? 'default' :
                                      assignment.status === 'in_progress' ? 'secondary' :
                                      new Date() > new Date(assignment.due_date) ? 'destructive' : 'outline'
                                    }>
                                      {assignment.status === 'completed' ? 'Completed' :
                                       assignment.status === 'in_progress' ? 'In Progress' :
                                       new Date() > new Date(assignment.due_date) ? 'Missed' : 'Pending'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="performance" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Score Trend</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={selectedStudent.attempts.slice(0, 20).reverse().map((a: any, i: number) => ({
                                attempt: i + 1,
                                score: Math.round((a.score / a.total_questions) * 100)
                              }))}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="attempt" />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="streaks" className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="pt-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Flame className="w-6 h-6 text-orange-500" />
                              <p className="text-3xl font-bold">{selectedStudent.stats.currentStreak}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">Current Streak</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Award className="w-6 h-6 text-yellow-500" />
                              <p className="text-3xl font-bold">{selectedStudent.stats.bestStreak}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">Best Streak</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4 text-center">
                            <p className="text-3xl font-bold">{selectedStudent.xpData?.total_xp || 0}</p>
                            <p className="text-sm text-muted-foreground">Total XP</p>
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Streak History (Last 30 Days)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={selectedStudent.streakData.slice(0, 30).reverse().map((s: any) => ({
                                date: format(new Date(s.date), 'MMM d'),
                                streak: s.current_streak
                              }))}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" fontSize={10} />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="streak" fill="hsl(var(--primary))" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </ScrollArea>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default AdminStudentsProgress;
