

# Admin Assignment System - 2-Level Drill-down with Per-Student Modifications

## Overview

Transform `/admin/assignments` from a flat table into a comprehensive 2-level drill-down system with:
1. Assignment groups (Level 1) showing Finished/Not Finished/Missed counts
2. Student-wise status table (Level 2) with per-student action controls
3. Remove "Subject Questions" from Admin Sidebar
4. Add real-time Supabase sync

---

## Current vs Required

| Feature | Current State | Required |
|---------|--------------|----------|
| View Type | Flat table of all assignments | 2-level: Groups then Students |
| Counts | Global stats only | Per-group Finished/Not Finished/Missed |
| Per-Student Actions | Delete only | Extend due, Reopen, Remove, Add students |
| Real-time Sync | None | Supabase channel subscription |
| Subject Questions sidebar | Present (line 54) | Remove |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/AdminSidebar.tsx` | Remove "Subject Questions" menu item (line 54) |
| `src/pages/AdminAssignments.tsx` | Complete rewrite with 2-level drill-down + per-student actions |

---

## Implementation Details

### 1. Remove Subject Questions from Sidebar

**File:** `src/components/admin/AdminSidebar.tsx`

Remove line 54:
```typescript
{ id: 'questions', label: 'Subject Questions', icon: FileQuestion, path: '/admin/questions' },
```

Also remove unused `FileQuestion` import from lucide-react.

---

### 2. Rewrite AdminAssignments.tsx

#### New State Structure:

```typescript
// View mode: 'list' (Level 1) or 'detail' (Level 2)
const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
const [selectedGroup, setSelectedGroup] = useState<AssignmentGroup | null>(null);

// Per-student action modals
const [actionModalOpen, setActionModalOpen] = useState(false);
const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
const [actionType, setActionType] = useState<'extend' | 'reopen' | 'remove' | null>(null);

// Add student modal
const [addStudentModalOpen, setAddStudentModalOpen] = useState(false);
```

#### New Interfaces:

```typescript
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

interface StudentAssignment extends Assignment {
  calculated_status: 'not_started' | 'in_progress' | 'finished' | 'missed';
}
```

#### Status Calculation Function:

```typescript
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
```

#### Grouping Logic:

```typescript
const groupAssignmentsByTest = (assignments: Assignment[]): AssignmentGroup[] => {
  const groups = new Map<string, AssignmentGroup>();
  
  assignments.forEach(a => {
    // Group by test_id + due_date combo
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
    else group.not_finished_count++; // not_started + in_progress
  });
  
  return Array.from(groups.values()).sort((a, b) => 
    new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
  );
};
```

---

### 3. Level 1 UI: Assignment Groups View

```text
+------------------------------------------------------------------+
|  Assignment Management                     [+ Create Assignment]  |
+------------------------------------------------------------------+
|  [Search...] [Filter: All ▼]                                      |
+------------------------------------------------------------------+
|  ┌────────────────────────────────────────────────────────────┐  |
|  │ Algebra Mock Test - Week 5                                 │  |
|  │ Mock Test | 15 Students | Due: Feb 5, 2026                │  |
|  │ ┌────────────────────────────────────────────────────────┐ │  |
|  │ │ ✓ Finished: 8  │  ○ Not Finished: 5  │  ✗ Missed: 2   │ │  |
|  │ └────────────────────────────────────────────────────────┘ │  |
|  │                                              [View Details] │  |
|  └────────────────────────────────────────────────────────────┘  |
+------------------------------------------------------------------+
```

Each card is clickable and opens Level 2.

---

### 4. Level 2 UI: Student-wise Status Table

```text
+------------------------------------------------------------------+
|  ← Back    Algebra Mock Test - Week 5        [+ Add Student]      |
+------------------------------------------------------------------+
|  Filter: [All ▼] [Finished] [Not Finished] [Missed]               |
+------------------------------------------------------------------+
| # | Student      | ID    | Status       | Start | Submit | Due   | Actions |
+------------------------------------------------------------------+
| 1 | John Doe     | S001  | ✓ Finished   | Feb 1 | Feb 2  | Feb 5 |   ⋮    |
| 2 | Jane Smith   | S002  | ● In Progress| Feb 1 | -      | Feb 5 |   ⋮    |
| 3 | Bob Wilson   | S003  | ○ Not Started| -     | -      | Feb 5 |   ⋮    |
| 4 | Alice Brown  | S004  | ✗ Missed     | -     | -      | Feb 5 |   ⋮    |
+------------------------------------------------------------------+
```

---

### 5. Per-Student Actions (Actions Column Menu)

Each row has a dropdown menu with:

| Action | When Available | Effect |
|--------|----------------|--------|
| **Extend Due Date** | Always | Opens date picker, updates `due_date` for this student only |
| **Reopen Assignment** | Finished or Missed | Clears `completed_at`, sets status to in_progress |
| **Remove from Assignment** | Always | Soft-delete (update `is_deleted = true` or hard delete with confirmation) |

**Add Student Button** (top of Level 2):
- Opens modal with student selector
- Excludes students already in this assignment group
- New student inherits: test_id, start_date, due_date
- Status = not_started

---

### 6. Real-time Sync Implementation

```typescript
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
      fetchData(); // Refetch all data to recalculate counts
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

---

### 7. Per-Student Action Handlers

```typescript
// Extend due date for single student
const handleExtendDueDate = async (assignmentId: string, newDueDate: Date) => {
  const { error } = await supabase
    .from('test_assignments')
    .update({ 
      due_date: newDueDate.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', assignmentId);
  
  if (error) throw error;
  toast.success('Due date extended');
  // Real-time will auto-refetch
};

// Reopen assignment (allow reattempt)
const handleReopenAssignment = async (assignmentId: string) => {
  const { error } = await supabase
    .from('test_assignments')
    .update({ 
      completed_at: null,
      status: 'in_progress',
      updated_at: new Date().toISOString()
    })
    .eq('id', assignmentId);
  
  if (error) throw error;
  toast.success('Assignment reopened');
};

// Remove student from assignment
const handleRemoveStudent = async (assignmentId: string) => {
  const { error } = await supabase
    .from('test_assignments')
    .delete()
    .eq('id', assignmentId);
  
  if (error) throw error;
  toast.success('Student removed from assignment');
};

// Add new students to existing assignment group
const handleAddStudents = async (
  testId: string, 
  startDate: string, 
  dueDate: string, 
  studentIds: string[]
) => {
  const { data: userData } = await supabase.auth.getUser();
  
  const newAssignments = studentIds.map(studentId => ({
    test_id: testId,
    student_id: studentId,
    assigned_by: userData.user!.id,
    start_date: startDate,
    due_date: dueDate,
    status: 'not_started'
  }));
  
  const { error } = await supabase
    .from('test_assignments')
    .insert(newAssignments);
  
  if (error) throw error;
  toast.success(`Added ${studentIds.length} student(s) to assignment`);
};
```

---

### 8. Status Badge Component

```typescript
const getStatusBadge = (status: StudentStatus) => {
  switch (status) {
    case 'finished':
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
        <Check className="w-3 h-3 mr-1" /> Finished
      </Badge>;
    case 'in_progress':
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
        <Clock className="w-3 h-3 mr-1" /> In Progress
      </Badge>;
    case 'missed':
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
        <X className="w-3 h-3 mr-1" /> Missed
      </Badge>;
    case 'not_started':
    default:
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
        <Circle className="w-3 h-3 mr-1" /> Not Started
      </Badge>;
  }
};
```

---

### 9. Stats Cards Update

Keep global stats at page top:
- Total Assignments
- Finished (all groups combined)
- Not Finished (all groups combined)
- Missed (all groups combined)

These update automatically via real-time sync.

---

## New UI Components

| Component | Purpose |
|-----------|---------|
| `AssignmentGroupCard` | Clickable card in Level 1 showing test info + counts |
| `StudentStatusTable` | Table in Level 2 with per-student status + actions |
| `ExtendDueDateModal` | Date picker modal for extending individual due dates |
| `ReopenConfirmModal` | Confirmation for reopening finished/missed assignments |
| `RemoveStudentModal` | Confirmation for removing student from assignment |
| `AddStudentsModal` | Student selector for adding to existing assignment |

All will be inline in `AdminAssignments.tsx` as sub-components.

---

## Acceptance Criteria

1. "Subject Questions" removed from Admin Sidebar
2. Level 1 shows assignment groups with Finished/Not Finished/Missed counts
3. Clicking a group opens Level 2 student-wise table
4. Each student row shows exactly one status (Not Started, In Progress, Finished, Missed)
5. Actions column has: Extend Due Date, Reopen, Remove
6. Add Student button works for existing assignment groups
7. All changes sync in real-time via Supabase subscription
8. Status recalculates automatically after any modification
9. Counts update instantly without manual refresh
10. Confirmation modals for destructive actions (Remove, Reopen)

