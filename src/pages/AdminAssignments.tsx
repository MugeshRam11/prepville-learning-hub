import React, { useState, useEffect, useMemo } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Plus, Calendar as CalendarIcon, Users, ClipboardList, Search, Filter, 
  ArrowLeft, Check, Clock, Circle, X, MoreVertical, CalendarPlus, 
  RotateCcw, UserMinus, UserPlus
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Types
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

type StudentStatus = 'not_started' | 'in_progress' | 'finished' | 'missed';

interface StudentAssignment extends Assignment {
  calculated_status: StudentStatus;
}

interface AssignmentGroup {
  test_id: string;
  test_title: string;
  test_type: 'mock' | 'weekly';
  subject: string;
  due_date: string;
  start_date: string;
  total_students: number;
  finished_count: number;
  not_finished_count: number;
  missed_count: number;
  students: StudentAssignment[];
}

// Status calculation function
const getStudentStatus = (assignment: Assignment): StudentStatus => {
  const now = new Date();
  const dueDate = new Date(assignment.due_date);
  
  // Finished = completed_at is set (submitted)
  if (assignment.completed_at) {
    return 'finished';
  }
  
  // Missed = due date passed without submission
  if (now > dueDate) {
    return 'missed';
  }
  
  // In Progress = started but not finished
  if (assignment.started_at) {
    return 'in_progress';
  }
  
  // Not Started = never opened
  return 'not_started';
};

// Status badge component
const StatusBadge = ({ status }: { status: StudentStatus }) => {
  switch (status) {
    case 'finished':
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
          <Check className="w-3 h-3 mr-1" /> Finished
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          <Clock className="w-3 h-3 mr-1" /> In Progress
        </Badge>
      );
    case 'missed':
      return (
        <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
          <X className="w-3 h-3 mr-1" /> Missed
        </Badge>
      );
    case 'not_started':
    default:
      return (
        <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <Circle className="w-3 h-3 mr-1" /> Not Started
        </Badge>
      );
  }
};

const AdminAssignments = () => {
  const [activeTab, setActiveTab] = useState('assignments');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  // View state
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedGroup, setSelectedGroup] = useState<AssignmentGroup | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>('all');

  // Create assignment modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [dueDate, setDueDate] = useState<Date>();
  const [creating, setCreating] = useState(false);

  // Per-student action modals
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [addStudentModalOpen, setAddStudentModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<StudentAssignment | null>(null);
  const [newDueDate, setNewDueDate] = useState<Date>();
  const [studentsToAdd, setStudentsToAdd] = useState<string[]>([]);

  // Fetch data and set up real-time subscription
  useEffect(() => {
    fetchData();

    // Real-time subscription for assignment updates
    const channel = supabase.channel('admin_assignments_sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'test_assignments'
      }, (payload) => {
        console.log('[AdminAssignments] Change detected:', payload);
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  // Group assignments by test_id + due_date
  const assignmentGroups = useMemo((): AssignmentGroup[] => {
    const groups = new Map<string, AssignmentGroup>();
    
    assignments.forEach(a => {
      const key = `${a.test_id}_${a.due_date}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          test_id: a.test_id,
          test_title: a.mock_tests?.title || 'Unknown Test',
          test_type: 'mock',
          subject: a.mock_tests?.subject || '',
          due_date: a.due_date,
          start_date: a.start_date,
          total_students: 0,
          finished_count: 0,
          not_finished_count: 0,
          missed_count: 0,
          students: []
        });
      }
      
      const group = groups.get(key)!;
      const status = getStudentStatus(a);
      
      group.total_students++;
      group.students.push({ ...a, calculated_status: status });
      
      if (status === 'finished') group.finished_count++;
      else if (status === 'missed') group.missed_count++;
      else group.not_finished_count++;
    });
    
    return Array.from(groups.values()).sort((a, b) => 
      new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
    );
  }, [assignments]);

  // Filter assignment groups
  const filteredGroups = useMemo(() => {
    return assignmentGroups.filter(group => {
      const matchesSearch = group.test_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.subject.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (statusFilter === 'all') return matchesSearch;
      if (statusFilter === 'has_unfinished') return matchesSearch && group.not_finished_count > 0;
      if (statusFilter === 'all_finished') return matchesSearch && group.not_finished_count === 0 && group.missed_count === 0;
      if (statusFilter === 'has_missed') return matchesSearch && group.missed_count > 0;
      
      return matchesSearch;
    });
  }, [assignmentGroups, searchTerm, statusFilter]);

  // Filter students in detail view
  const filteredStudents = useMemo(() => {
    if (!selectedGroup) return [];
    
    return selectedGroup.students.filter(student => {
      if (studentStatusFilter === 'all') return true;
      if (studentStatusFilter === 'finished') return student.calculated_status === 'finished';
      if (studentStatusFilter === 'not_finished') return ['not_started', 'in_progress'].includes(student.calculated_status);
      if (studentStatusFilter === 'missed') return student.calculated_status === 'missed';
      return true;
    });
  }, [selectedGroup, studentStatusFilter]);

  // Global stats
  const stats = useMemo(() => {
    const allStudents = assignmentGroups.flatMap(g => g.students);
    return {
      total: assignmentGroups.length,
      finished: allStudents.filter(s => s.calculated_status === 'finished').length,
      notFinished: allStudents.filter(s => ['not_started', 'in_progress'].includes(s.calculated_status)).length,
      missed: allStudents.filter(s => s.calculated_status === 'missed').length
    };
  }, [assignmentGroups]);

  // Handlers
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
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      toast.error(error.message || 'Failed to create assignment');
    } finally {
      setCreating(false);
    }
  };

  const handleExtendDueDate = async () => {
    if (!selectedAssignment || !newDueDate) return;

    try {
      const { error } = await supabase
        .from('test_assignments')
        .update({ 
          due_date: newDueDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAssignment.id);

      if (error) throw error;
      toast.success('Due date extended successfully');
      setExtendModalOpen(false);
      setSelectedAssignment(null);
      setNewDueDate(undefined);
    } catch (error: any) {
      toast.error('Failed to extend due date');
    }
  };

  const handleReopenAssignment = async () => {
    if (!selectedAssignment) return;

    try {
      const { error } = await supabase
        .from('test_assignments')
        .update({ 
          completed_at: null,
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAssignment.id);

      if (error) throw error;
      toast.success('Assignment reopened successfully');
      setReopenModalOpen(false);
      setSelectedAssignment(null);
    } catch (error: any) {
      toast.error('Failed to reopen assignment');
    }
  };

  const handleRemoveStudent = async () => {
    if (!selectedAssignment) return;

    try {
      const { error } = await supabase
        .from('test_assignments')
        .delete()
        .eq('id', selectedAssignment.id);

      if (error) throw error;
      toast.success('Student removed from assignment');
      setRemoveModalOpen(false);
      setSelectedAssignment(null);
      
      // If we removed the last student, go back to list view
      if (selectedGroup && selectedGroup.students.length <= 1) {
        setViewMode('list');
        setSelectedGroup(null);
      }
    } catch (error: any) {
      toast.error('Failed to remove student');
    }
  };

  const handleAddStudents = async () => {
    if (!selectedGroup || studentsToAdd.length === 0) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const newAssignments = studentsToAdd.map(studentId => ({
        test_id: selectedGroup.test_id,
        student_id: studentId,
        assigned_by: userData.user!.id,
        start_date: selectedGroup.start_date,
        due_date: selectedGroup.due_date,
        status: 'not_started'
      }));

      const { error } = await supabase
        .from('test_assignments')
        .insert(newAssignments);

      if (error) throw error;
      toast.success(`Added ${studentsToAdd.length} student(s) to assignment`);
      setAddStudentModalOpen(false);
      setStudentsToAdd([]);
    } catch (error: any) {
      toast.error('Failed to add students');
    }
  };

  const resetForm = () => {
    setSelectedTest('');
    setSelectedStudents([]);
    setStartDate(undefined);
    setDueDate(undefined);
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleAddStudentSelection = (studentId: string) => {
    setStudentsToAdd(prev => 
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

  const openGroupDetail = (group: AssignmentGroup) => {
    setSelectedGroup(group);
    setViewMode('detail');
    setStudentStatusFilter('all');
  };

  const backToList = () => {
    setViewMode('list');
    setSelectedGroup(null);
    setStudentStatusFilter('all');
  };

  // Get available students (not already in assignment group)
  const availableStudentsForAdd = useMemo(() => {
    if (!selectedGroup) return [];
    const assignedIds = new Set(selectedGroup.students.map(s => s.student_id));
    return students.filter(s => !assignedIds.has(s.id));
  }, [selectedGroup, students]);

  // Render Level 1: Assignment Groups
  const renderGroupsView = () => (
    <>
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by test name or subject..." 
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
                <SelectItem value="all">All Assignments</SelectItem>
                <SelectItem value="has_unfinished">Has Unfinished</SelectItem>
                <SelectItem value="all_finished">All Finished</SelectItem>
                <SelectItem value="has_missed">Has Missed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Groups */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No assignments found. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredGroups.map((group, index) => (
            <Card 
              key={`${group.test_id}_${group.due_date}_${index}`}
              className="hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => openGroupDetail(group)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{group.test_title}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <Badge variant="outline">{group.test_type === 'mock' ? 'Mock Test' : 'Weekly Test'}</Badge>
                      <span>{group.subject}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {group.total_students} Students
                      </span>
                      <span>•</span>
                      <span>Due: {format(new Date(group.due_date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
                
                {/* Status counts */}
                <div className="flex items-center gap-6 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">Finished: {group.finished_count}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="text-sm font-medium">Not Finished: {group.not_finished_count}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-sm font-medium">Missed: {group.missed_count}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );

  // Render Level 2: Student-wise Status Table
  const renderDetailView = () => (
    <>
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={backToList}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{selectedGroup?.test_title}</h2>
            <p className="text-sm text-muted-foreground">
              {selectedGroup?.subject} • Due: {selectedGroup && format(new Date(selectedGroup.due_date), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <Button onClick={() => setAddStudentModalOpen(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Add Student
        </Button>
      </div>

      {/* Status filter */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filter:</span>
            {['all', 'finished', 'not_finished', 'missed'].map(filter => (
              <Button
                key={filter}
                variant={studentStatusFilter === filter ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStudentStatusFilter(filter)}
              >
                {filter === 'all' && 'All'}
                {filter === 'finished' && 'Finished'}
                {filter === 'not_finished' && 'Not Finished'}
                {filter === 'missed' && 'Missed'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Status</CardTitle>
          <CardDescription>
            {filteredStudents.length} student(s) {studentStatusFilter !== 'all' && `(filtered by ${studentStatusFilter.replace('_', ' ')})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Submission</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student, index) => (
                <TableRow key={student.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {student.profiles?.first_name || ''} {student.profiles?.last_name || ''}
                      </p>
                      <p className="text-xs text-muted-foreground">{student.profiles?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">
                      {student.profiles?.student_id || student.profiles?.roll_number || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={student.calculated_status} />
                  </TableCell>
                  <TableCell>
                    {student.started_at 
                      ? format(new Date(student.started_at), 'MMM d, yyyy')
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    {student.completed_at 
                      ? format(new Date(student.completed_at), 'MMM d, yyyy HH:mm')
                      : '-'
                    }
                  </TableCell>
                  <TableCell>{format(new Date(student.due_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedAssignment(student);
                            setNewDueDate(new Date(student.due_date));
                            setExtendModalOpen(true);
                          }}
                        >
                          <CalendarPlus className="w-4 h-4 mr-2" />
                          Extend Due Date
                        </DropdownMenuItem>
                        {(student.calculated_status === 'finished' || student.calculated_status === 'missed') && (
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedAssignment(student);
                              setReopenModalOpen(true);
                            }}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reopen Assignment
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => {
                            setSelectedAssignment(student);
                            setRemoveModalOpen(true);
                          }}
                        >
                          <UserMinus className="w-4 h-4 mr-2" />
                          Remove from Assignment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );

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
              <p className="text-muted-foreground">Track student assignments and manage submissions</p>
            </div>
            {viewMode === 'list' && (
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
            )}
          </div>

          {/* Stats Cards - Only show in list view */}
          {viewMode === 'list' && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Total Groups</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.finished}</p>
                      <p className="text-xs text-muted-foreground">Finished</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.notFinished}</p>
                      <p className="text-xs text-muted-foreground">Not Finished</p>
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
          )}

          {/* Main Content */}
          {viewMode === 'list' ? renderGroupsView() : renderDetailView()}
        </div>
      </div>

      {/* Extend Due Date Modal */}
      <Dialog open={extendModalOpen} onOpenChange={setExtendModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Due Date</DialogTitle>
            <DialogDescription>
              Set a new due date for {selectedAssignment?.profiles?.first_name} {selectedAssignment?.profiles?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>New Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full mt-2 justify-start text-left font-normal", !newDueDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newDueDate ? format(newDueDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={newDueDate} onSelect={setNewDueDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendModalOpen(false)}>Cancel</Button>
            <Button onClick={handleExtendDueDate}>Extend Due Date</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Assignment Modal */}
      <Dialog open={reopenModalOpen} onOpenChange={setReopenModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reopen Assignment</DialogTitle>
            <DialogDescription>
              This will clear the submission and allow {selectedAssignment?.profiles?.first_name} {selectedAssignment?.profiles?.last_name} to reattempt the assignment.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReopenModalOpen(false)}>Cancel</Button>
            <Button onClick={handleReopenAssignment}>Reopen Assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Student Modal */}
      <Dialog open={removeModalOpen} onOpenChange={setRemoveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from Assignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedAssignment?.profiles?.first_name} {selectedAssignment?.profiles?.last_name} from this assignment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemoveStudent}>Remove Student</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Student Modal */}
      <Dialog open={addStudentModalOpen} onOpenChange={setAddStudentModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Students to Assignment</DialogTitle>
            <DialogDescription>
              Select students to add to "{selectedGroup?.test_title}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="border rounded-lg max-h-60 overflow-y-auto p-2 space-y-1">
              {availableStudentsForAdd.map(student => (
                <div 
                  key={student.id} 
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors",
                    studentsToAdd.includes(student.id) && "bg-primary/10"
                  )}
                  onClick={() => toggleAddStudentSelection(student.id)}
                >
                  <Checkbox checked={studentsToAdd.includes(student.id)} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {student.first_name || ''} {student.last_name || ''} 
                      {!student.first_name && !student.last_name && student.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {student.student_id && `ID: ${student.student_id}`}
                      {student.roll_number && ` | Roll: ${student.roll_number}`}
                    </p>
                  </div>
                </div>
              ))}
              {availableStudentsForAdd.length === 0 && (
                <p className="text-center text-muted-foreground py-4">All students are already assigned</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddStudentModalOpen(false); setStudentsToAdd([]); }}>Cancel</Button>
            <Button onClick={handleAddStudents} disabled={studentsToAdd.length === 0}>
              Add {studentsToAdd.length} Student(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAssignments;
