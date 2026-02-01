import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  Loader2, 
  Circle, 
  Clock, 
  Check, 
  X, 
  ClipboardList,
  Calendar,
  ArrowRight,
  Eye,
  BookOpen
} from 'lucide-react';
import { format } from 'date-fns';

type StudentStatus = 'not_started' | 'in_progress' | 'finished' | 'missed';
type FilterStatus = 'all' | 'pending' | 'finished' | 'missed';

interface Assignment {
  id: string;
  test_id: string;
  start_date: string;
  due_date: string;
  status: string | null;
  started_at: string | null;
  completed_at: string | null;
  mock_tests: {
    id: string;
    title: string;
    subject: string;
    time_limit_minutes: number | null;
    total_questions: number;
  } | null;
}

const getStudentStatus = (assignment: Assignment): StudentStatus => {
  const now = new Date();
  const dueDate = new Date(assignment.due_date);
  
  if (assignment.completed_at) return 'finished';
  if (now > dueDate) return 'missed';
  if (assignment.started_at) return 'in_progress';
  return 'not_started';
};

const StatusBadge = ({ status }: { status: StudentStatus }) => {
  const config = {
    not_started: { 
      label: 'Not Started', 
      className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', 
      icon: Circle 
    },
    in_progress: { 
      label: 'In Progress', 
      className: 'bg-blue-500/10 text-blue-600 border-blue-500/20', 
      icon: Clock 
    },
    finished: { 
      label: 'Finished', 
      className: 'bg-green-500/10 text-green-600 border-green-500/20', 
      icon: Check 
    },
    missed: { 
      label: 'Missed', 
      className: 'bg-red-500/10 text-red-600 border-red-500/20', 
      icon: X 
    }
  };
  
  const { label, className, icon: Icon } = config[status];
  return (
    <Badge className={className}>
      <Icon className="w-3 h-3 mr-1" /> {label}
    </Badge>
  );
};

const StudentAssignments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');

  const fetchAssignments = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('test_assignments')
        .select(`
          id,
          test_id,
          start_date,
          due_date,
          status,
          started_at,
          completed_at,
          mock_tests (
            id,
            title,
            subject,
            time_limit_minutes,
            total_questions
          )
        `)
        .eq('student_id', user.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();

    if (!user) return;

    // Real-time subscription for assignment updates
    const assignmentsChannel = supabase.channel('student_assignments_sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'test_assignments',
        filter: `student_id=eq.${user.id}`
      }, () => {
        console.log('[StudentAssignments] test_assignments changed, refetching...');
        fetchAssignments();
      })
      .subscribe();

    // Subscribe to mock_tests for test detail updates (title, subject, duration)
    const mockTestsChannel = supabase.channel('student_assignments_tests_sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mock_tests'
      }, () => {
        console.log('[StudentAssignments] mock_tests changed, refetching...');
        fetchAssignments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(assignmentsChannel);
      supabase.removeChannel(mockTestsChannel);
    };
  }, [user]);

  const handleStartTest = async (assignment: Assignment) => {
    // Update started_at if not already set
    if (!assignment.started_at) {
      const { error } = await supabase
        .from('test_assignments')
        .update({ 
          started_at: new Date().toISOString(),
          status: 'in_progress'
        })
        .eq('id', assignment.id);

      if (error) {
        console.error('Error updating assignment:', error);
        toast.error('Failed to start assignment');
        return;
      }
    }

    // Navigate to the test
    navigate(`/mock-exams/unified/${assignment.test_id}`);
  };

  const handleContinueTest = (assignment: Assignment) => {
    navigate(`/mock-exams/unified/${assignment.test_id}`);
  };

  const handleViewResults = (assignment: Assignment) => {
    // Navigate to results/summary page
    navigate(`/mock-exams/summary?testId=${assignment.test_id}`);
  };

  const filteredAssignments = assignments.filter(assignment => {
    const status = getStudentStatus(assignment);
    
    if (filter === 'all') return true;
    if (filter === 'pending') return status === 'not_started' || status === 'in_progress';
    if (filter === 'finished') return status === 'finished';
    if (filter === 'missed') return status === 'missed';
    return true;
  });

  const counts = {
    all: assignments.length,
    pending: assignments.filter(a => {
      const s = getStudentStatus(a);
      return s === 'not_started' || s === 'in_progress';
    }).length,
    finished: assignments.filter(a => getStudentStatus(a) === 'finished').length,
    missed: assignments.filter(a => getStudentStatus(a) === 'missed').length
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your assignments...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ClipboardList className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">My Assignments</h1>
          </div>
          <p className="text-muted-foreground">
            View and complete your assigned tests
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <Badge variant="outline" className="px-3 py-1">
              Total: {counts.all}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              Pending: {counts.pending}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-green-500/10 text-green-600 border-green-500/20">
              Finished: {counts.finished}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-red-500/10 text-red-600 border-red-500/20">
              Missed: {counts.missed}
            </Badge>
          </div>

          <Select value={filter} onValueChange={(v) => setFilter(v as FilterStatus)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignments</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="finished">Finished</SelectItem>
              <SelectItem value="missed">Missed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Assignments List */}
        {filteredAssignments.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {filter === 'all' ? 'No assignments yet' : `No ${filter} assignments`}
              </h3>
              <p className="text-muted-foreground">
                {filter === 'all' 
                  ? 'Your teacher will assign tests here. Check back later!' 
                  : 'Try changing the filter to see other assignments.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAssignments.map((assignment) => {
              const status = getStudentStatus(assignment);
              const test = assignment.mock_tests;
              
              return (
                <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">
                            {test?.title || 'Unknown Test'}
                          </h3>
                          <StatusBadge status={status} />
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4" />
                            {test?.subject || 'N/A'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {test?.time_limit_minutes || 60} mins
                          </span>
                          <span>
                            {test?.total_questions || 0} questions
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            Due: {format(new Date(assignment.due_date), 'MMM d, yyyy h:mm a')}
                          </span>
                          {assignment.completed_at && (
                            <span className="text-green-600">
                              Submitted: {format(new Date(assignment.completed_at), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {status === 'not_started' && (
                          <Button onClick={() => handleStartTest(assignment)}>
                            Start Test <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        )}
                        {status === 'in_progress' && (
                          <Button onClick={() => handleContinueTest(assignment)}>
                            Continue <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        )}
                        {status === 'finished' && (
                          <Button variant="outline" onClick={() => handleViewResults(assignment)}>
                            <Eye className="w-4 h-4 mr-1" /> View Results
                          </Button>
                        )}
                        {status === 'missed' && (
                          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 px-4 py-2">
                            Missed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default StudentAssignments;
