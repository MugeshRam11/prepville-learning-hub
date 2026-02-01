import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Calendar as CalendarIcon, Users, ClipboardList, Search, Filter, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface MockTest {
  id: string;
  title: string;
  subject: string;
  topic: string;
  total_questions: number;
}

interface Student {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  student_id: string | null;
  roll_number: string | null;
  class_name: string | null;
}

interface Assignment {
  id: string;
  test_id: string;
  student_id: string;
  assigned_by: string;
  start_date: string;
  due_date: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  mock_tests?: MockTest;
  profiles?: Student;
}

const AdminAssignments = () => {
  const [activeTab, setActiveTab] = useState('assignments');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Create assignment form state
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [dueDate, setDueDate] = useState<Date>();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch assignments with related data
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('test_assignments')
        .select(`
          *,
          mock_tests (id, title, subject, topic, total_questions)
        `)
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Fetch student profiles for each assignment
      const studentIds = [...new Set((assignmentsData || []).map(a => a.student_id))];
      let profilesMap: Record<string, Student> = {};
      
      if (studentIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, student_id, roll_number, class_name')
          .in('id', studentIds);
        
        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, Student>);
        }
      }

      // Merge profiles into assignments
      const enrichedAssignments = (assignmentsData || []).map(a => ({
        ...a,
        profiles: profilesMap[a.student_id]
      }));

      setAssignments(enrichedAssignments);

      // Fetch mock tests for dropdown
      const { data: testsData, error: testsError } = await supabase
        .from('mock_tests')
        .select('id, title, subject, topic, total_questions')
        .eq('is_published', true)
        .order('title');

      if (testsError) throw testsError;
      setMockTests(testsData || []);

      // Fetch all students
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, student_id, roll_number, class_name')
        .eq('role', 'student')
        .order('first_name');

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!selectedTest || selectedStudents.length === 0 || !startDate || !dueDate) {
      toast.error('Please fill all required fields');
      return;
    }

    if (dueDate < startDate) {
      toast.error('Due date must be after start date');
      return;
    }

    setCreating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Create assignments for all selected students
      const assignmentsToCreate = selectedStudents.map(studentId => ({
        test_id: selectedTest,
        student_id: studentId,
        assigned_by: userData.user.id,
        start_date: startDate.toISOString(),
        due_date: dueDate.toISOString(),
        status: 'not_started'
      }));

      const { error } = await supabase
        .from('test_assignments')
        .insert(assignmentsToCreate);

      if (error) throw error;

      toast.success(`Assignment created for ${selectedStudents.length} student(s)`);
      setIsCreateOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      toast.error(error.message || 'Failed to create assignment');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      const { error } = await supabase
        .from('test_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Assignment deleted');
      fetchData();
    } catch (error: any) {
      toast.error('Failed to delete assignment');
    }
  };

  const resetForm = () => {
    setSelectedTest('');
    setSelectedStudents([]);
    setStartDate(undefined);
    setDueDate(undefined);
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    
    if (status === 'completed') {
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Completed</Badge>;
    }
    if (status === 'in_progress') {
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">In Progress</Badge>;
    }
    if (now > due && status !== 'completed') {
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Missed</Badge>;
    }
    return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Not Started</Badge>;
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  };

  const filteredAssignments = assignments.filter(a => {
    const matchesSearch = 
      a.mock_tests?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.profiles?.student_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: assignments.length,
    completed: assignments.filter(a => a.status === 'completed').length,
    inProgress: assignments.filter(a => a.status === 'in_progress').length,
    pending: assignments.filter(a => a.status === 'not_started').length,
    missed: assignments.filter(a => {
      const now = new Date();
      const due = new Date(a.due_date);
      return now > due && a.status !== 'completed';
    }).length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 ml-64 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Assignment Management
              </h1>
              <p className="text-muted-foreground">Assign tests to students and track their progress</p>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Assignment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Assignment</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Test Selection */}
                  <div className="space-y-2">
                    <Label>Select Test *</Label>
                    <Select value={selectedTest} onValueChange={setSelectedTest}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a test to assign" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockTests.map(test => (
                          <SelectItem key={test.id} value={test.id}>
                            {test.title} ({test.subject} - {test.total_questions} Q)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Student Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Select Students * ({selectedStudents.length} selected)</Label>
                      <Button variant="ghost" size="sm" onClick={selectAllStudents}>
                        {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                    <div className="border rounded-lg max-h-60 overflow-y-auto p-2 space-y-1">
                      {students.map(student => (
                        <div 
                          key={student.id} 
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors",
                            selectedStudents.includes(student.id) && "bg-primary/10"
                          )}
                          onClick={() => toggleStudentSelection(student.id)}
                        >
                          <Checkbox checked={selectedStudents.includes(student.id)} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {student.first_name || ''} {student.last_name || ''} 
                              {!student.first_name && !student.last_name && student.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {student.student_id && `ID: ${student.student_id}`}
                              {student.roll_number && ` | Roll: ${student.roll_number}`}
                              {student.class_name && ` | Class: ${student.class_name}`}
                            </p>
                          </div>
                        </div>
                      ))}
                      {students.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">No students found</p>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateAssignment} disabled={creating}>
                    {creating ? 'Creating...' : 'Create Assignment'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.completed}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.inProgress}</p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                    <p className="text-xs text-muted-foreground">Not Started</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.missed}</p>
                    <p className="text-xs text-muted-foreground">Missed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by test, student name, or ID..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Assignments Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Assignments</CardTitle>
              <CardDescription>View and manage test assignments</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : filteredAssignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No assignments found. Create one to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Test</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Completed At</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssignments.map(assignment => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {assignment.profiles?.first_name || ''} {assignment.profiles?.last_name || ''}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {assignment.profiles?.student_id && `ID: ${assignment.profiles.student_id}`}
                              {assignment.profiles?.class_name && ` | ${assignment.profiles.class_name}`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{assignment.mock_tests?.title}</p>
                            <p className="text-xs text-muted-foreground">{assignment.mock_tests?.subject}</p>
                          </div>
                        </TableCell>
                        <TableCell>{format(new Date(assignment.start_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{format(new Date(assignment.due_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{getStatusBadge(assignment.status, assignment.due_date)}</TableCell>
                        <TableCell>
                          {assignment.completed_at 
                            ? format(new Date(assignment.completed_at), 'MMM d, yyyy HH:mm')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteAssignment(assignment.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminAssignments;
