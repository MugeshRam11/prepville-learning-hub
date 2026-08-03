import React, { useState, useEffect, useCallback } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Search, Flame, RefreshCw, Eye } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import UserDetailDrawer from '@/components/admin/UserDetailDrawer';

interface StudentData {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  created_at: string;
  // from user_progress_summary
  total_xp: number;
  current_level: number;
  longest_streak: number;
  last_activity_date: string | null;
  total_tests_taken: number;
  avg_score_percentage: number;
  // from test_assignments
  assignmentsCompleted: number;
  assignmentsPending: number;
}

const AdminStudentsProgress = () => {
  const [activeTab, setActiveTab] = useState('students-progress');
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentData, setSelectedStudentData] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openStudentDrawer = (student: StudentData) => {
    setSelectedStudentId(student.id);
    setSelectedStudentData({
      email: student.email,
      first_name: student.first_name,
      last_name: student.last_name,
      role: 'student',
    });
    setDrawerOpen(true);
  };

  const fetchStudents = useCallback(async () => {
    try {
      // 1. Get all students from user_progress_summary (has XP, streak, tests in one query)
      const { data: summaryData, error: summaryErr } = await supabase
        .from('user_progress_summary')
        .select('*')
        .order('created_at', { ascending: false });

      if (summaryErr) {
        console.error('Summary error:', summaryErr);
      }

      let profiles = (summaryData || []).filter(
        (u: any) => u.role === 'student' || !u.role
      );

      // Fallback: if summary is empty or all admin, get from profiles directly
      if (profiles.length === 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        profiles = (profilesData || []).filter((p: any) => p.role !== 'admin');
      }

      // 2. Get all assignments in one batch query
      const { data: allAssignments } = await supabase
        .from('test_assignments')
        .select('student_id, status');

      const assignmentMap: Record<string, { completed: number; pending: number }> = {};
      (allAssignments || []).forEach((a: any) => {
        const sid = a.student_id || a.user_id;
        if (!sid) return;
        if (!assignmentMap[sid]) assignmentMap[sid] = { completed: 0, pending: 0 };
        if (a.status === 'completed') assignmentMap[sid].completed++;
        else assignmentMap[sid].pending++;
      });

      const studentList: StudentData[] = profiles.map((u: any) => {
        const uid = u.user_id || u.id;
        const asgn = assignmentMap[uid] || { completed: 0, pending: 0 };
        return {
          id: uid,
          email: u.email || '',
          first_name: u.first_name || null,
          last_name: u.last_name || null,
          is_active: u.is_active ?? true,
          created_at: u.created_at || new Date().toISOString(),
          total_xp: u.total_xp ?? 0,
          current_level: u.current_level ?? 1,
          longest_streak: u.longest_streak ?? u.best_streak ?? 0,
          last_activity_date: u.last_activity_date ?? null,
          total_tests_taken: u.total_tests_taken ?? 0,
          avg_score_percentage: u.avg_score_percentage ?? 0,
          assignmentsCompleted: asgn.completed,
          assignmentsPending: asgn.pending,
        };
      });

      setStudents(studentList);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load student data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();

    // Real-time subscriptions on all relevant tables
    const channel = supabase
      .channel('student-progress-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'test_attempts' },
        () => { fetchStudents(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'test_assignments' },
        () => { fetchStudents(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_streaks' },
        () => { fetchStudents(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_xp' },
        () => { fetchStudents(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' },
        () => { fetchStudents(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' },
        () => { fetchStudents(); })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscribed for student progress');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStudents]);

  const getActivityLabel = (lastActive: string | null) => {
    if (!lastActive) return { label: 'Never', color: 'text-muted-foreground' };
    const days = differenceInDays(new Date(), new Date(lastActive));
    if (days === 0) return { label: 'Today', color: 'text-green-600' };
    if (days === 1) return { label: 'Yesterday', color: 'text-green-600' };
    if (days <= 7) return { label: `${days}d ago`, color: 'text-yellow-600' };
    return { label: `${days}d ago`, color: 'text-red-600' };
  };

  const filteredStudents = students.filter(s => {
    const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
    const term = searchTerm.toLowerCase();
    return fullName.includes(term) || s.email.toLowerCase().includes(term);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 ml-64 p-6">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Student Progress Dashboard
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Monitor real-time student activity and progress
                <span className="ml-2 text-xs text-green-600 font-medium">
                  🟢 Live — updated {lastUpdated.toLocaleTimeString()}
                </span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setLoading(true); fetchStudents(); }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>

          {/* Search */}
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

          {/* Summary bar */}
          <div className="flex gap-4 mb-4 text-sm text-muted-foreground">
            <span><strong className="text-foreground">{filteredStudents.length}</strong> students</span>
            <span><strong className="text-green-600">{filteredStudents.filter(s => s.is_active).length}</strong> active</span>
            <span><strong className="text-primary">{filteredStudents.reduce((sum, s) => sum + s.total_tests_taken, 0)}</strong> total tests taken</span>
          </div>

          {/* Student Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-8 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg font-medium">No students found</p>
              <p className="text-sm mt-1">Try adjusting your search or check back after students register.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map((student) => {
                const activity = getActivityLabel(student.last_activity_date);
                const displayName = student.first_name || student.last_name
                  ? `${student.first_name || ''} ${student.last_name || ''}`.trim()
                  : student.email;
                const totalAssignments = student.assignmentsCompleted + student.assignmentsPending;

                return (
                  <Card
                    key={student.id}
                    className="hover:shadow-md transition-all duration-200 border hover:border-primary/30 cursor-pointer group"
                    onClick={() => openStudentDrawer(student)}
                  >
                    <CardContent className="pt-4 space-y-3">
                      {/* Name + Badge */}
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-base truncate">{displayName}</h3>
                          <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                        </div>
                        <Badge variant={student.is_active ? 'default' : 'secondary'} className="ml-2 shrink-0">
                          {student.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      {/* Meta info */}
                      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground border-t pt-2">
                        <div><strong>Level:</strong> {student.current_level}</div>
                        <div><strong>XP:</strong> {student.total_xp.toLocaleString()}</div>
                        <div className={`col-span-2 ${activity.color}`}>
                          <strong>Last Active:</strong> {activity.label}
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2 text-center border-t border-b py-2">
                        <div>
                          <p className="font-bold text-base text-orange-500 flex items-center justify-center gap-1">
                            <Flame className="w-3.5 h-3.5" />
                            {student.longest_streak}
                          </p>
                          <p className="text-[11px] text-muted-foreground">Streak</p>
                        </div>
                        <div>
                          <p className="font-bold text-base text-foreground">{student.total_tests_taken}</p>
                          <p className="text-[11px] text-muted-foreground">Tests</p>
                        </div>
                        <div>
                          <p className="font-bold text-base text-primary">
                            {student.avg_score_percentage > 0
                              ? `${Math.round(student.avg_score_percentage)}%`
                              : '—'}
                          </p>
                          <p className="text-[11px] text-muted-foreground">Accuracy</p>
                        </div>
                      </div>

                      {/* Assignments */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Assignments{totalAssignments > 0 ? ` (${totalAssignments})` : ''}:
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-green-600 font-bold">✓ {student.assignmentsCompleted}</span>
                          <span className="text-yellow-600 font-bold">⏳ {student.assignmentsPending}</span>
                        </div>
                      </div>

                      {/* View Details CTA */}
                      <div className="border-t pt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full text-xs text-primary hover:text-primary hover:bg-primary/10 group-hover:bg-primary/5 transition-colors"
                          onClick={(e) => { e.stopPropagation(); openStudentDrawer(student); }}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          View Full Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Student Detail Drawer */}
      <UserDetailDrawer
        userId={selectedStudentId}
        initialUser={selectedStudentData}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
};

export default AdminStudentsProgress;
