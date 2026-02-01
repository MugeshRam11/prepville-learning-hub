

# Remove Subjects Navigation & Replace with Assignments (Student Side)

## Overview

This implementation removes the "Subjects" navigation entry from all student-facing navigation and replaces it with an "Assignments" entry that links to a new student assignments page.

---

## Current State Analysis

| Location | Current | After Change |
|----------|---------|--------------|
| **Header Navigation** (logged in) | `/subjects` with BookOpen icon | `/assignments` with ClipboardList icon |
| **Routes in App.tsx** | `/subjects` → Subjects page | `/assignments` → New StudentAssignments page |
| **Student Dashboard** | No direct assignment visibility | Keep unchanged (dashboard focus) |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/Header.tsx` | Replace "Subjects" nav item with "Assignments" |
| `src/App.tsx` | Add new `/assignments` route, keep `/subjects` route (for backward compatibility) |

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/StudentAssignments.tsx` | New student assignments view showing their assigned tests |

---

## Implementation Details

### 1. Update Header Navigation

**File:** `src/components/Header.tsx`

Replace the Subjects nav item (line 36):
```typescript
// BEFORE
{ href: '/subjects', label: 'Subjects', icon: BookOpen },

// AFTER  
{ href: '/assignments', label: 'Assignments', icon: ClipboardList },
```

Add `ClipboardList` to the lucide-react imports.

---

### 2. Create Student Assignments Page

**File:** `src/pages/StudentAssignments.tsx`

A new page that shows the logged-in student their assigned tests with:

**Features:**
- Fetch assignments from `test_assignments` where `student_id` = current user
- Join with `mock_tests` to get test details
- Display status badges (Not Started, In Progress, Finished, Missed)
- Real-time sync via Supabase subscription
- "Start" button for Not Started/In Progress assignments
- Filter by status (All, Pending, Finished, Missed)

**UI Layout:**
```text
+------------------------------------------------------------------+
|  Header                                                          |
+------------------------------------------------------------------+
|  My Assignments                                                   |
+------------------------------------------------------------------+
|  [Filter: All ▼]                                                  |
+------------------------------------------------------------------+
|  ┌────────────────────────────────────────────────────────────┐  |
|  │ Algebra Mock Test - Week 5           ○ Not Started          │  |
|  │ Mock Test | Due: Feb 5, 2026                                │  |
|  │                                             [Start Test →]  │  |
|  └────────────────────────────────────────────────────────────┘  |
|  ┌────────────────────────────────────────────────────────────┐  |
|  │ Chemistry Weekly Quiz                 ● In Progress         │  |
|  │ Weekly Quiz | Due: Feb 3, 2026                              │  |
|  │                                           [Continue →]      │  |
|  └────────────────────────────────────────────────────────────┘  |
|  ┌────────────────────────────────────────────────────────────┐  |
|  │ Physics Mid-Term Mock                 ✓ Finished            │  |
|  │ Mock Test | Submitted: Jan 30, 2026                         │  |
|  │                                           [View Results]    │  |
|  └────────────────────────────────────────────────────────────┘  |
+------------------------------------------------------------------+
|  Footer                                                          |
+------------------------------------------------------------------+
```

**Status Logic (same as admin):**
```typescript
const getAssignmentStatus = (assignment) => {
  const now = new Date();
  const dueDate = new Date(assignment.due_date);
  
  if (assignment.completed_at) return 'finished';
  if (now > dueDate) return 'missed';
  if (assignment.started_at) return 'in_progress';
  return 'not_started';
};
```

---

### 3. Add Route in App.tsx

**File:** `src/App.tsx`

Add new import and route:
```typescript
import StudentAssignments from "./pages/StudentAssignments";

// Add route (protected with subscription)
<Route path="/assignments" element={
  <ProtectedRoute requiresSubscription>
    <StudentAssignments />
  </ProtectedRoute>
} />
```

---

### 4. Action Buttons Logic

| Status | Button | Action |
|--------|--------|--------|
| **Not Started** | "Start Test" | Navigate to `/mock-exams/unified/{testId}`, update `started_at` |
| **In Progress** | "Continue" | Navigate to `/mock-exams/unified/{testId}` |
| **Finished** | "View Results" | Navigate to test results/summary page |
| **Missed** | "Missed" (disabled badge) | No action (greyed out) |

---

### 5. Real-time Updates

The page will subscribe to changes on `test_assignments` for the current user:
```typescript
const channel = supabase.channel('student_assignments_sync')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'test_assignments',
    filter: `student_id=eq.${user.id}`
  }, () => fetchAssignments())
  .subscribe();
```

---

## What Remains Unchanged

- `/subjects` route still exists (for any existing bookmarks/links)
- SubjectLearning page unchanged
- Admin sidebar/navigation unchanged
- Student Dashboard unchanged (no subject references there)

---

## Technical Details

### Database Query for Student Assignments

```typescript
const { data } = await supabase
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
      duration_minutes,
      total_marks
    )
  `)
  .eq('student_id', user.id)
  .order('due_date', { ascending: true });
```

### Status Badge Component

```typescript
const StatusBadge = ({ status }) => {
  const config = {
    not_started: { label: 'Not Started', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: Circle },
    in_progress: { label: 'In Progress', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Clock },
    finished: { label: 'Finished', className: 'bg-green-500/10 text-green-600 border-green-500/20', icon: Check },
    missed: { label: 'Missed', className: 'bg-red-500/10 text-red-600 border-red-500/20', icon: X }
  };
  
  const { label, className, icon: Icon } = config[status];
  return (
    <Badge className={className}>
      <Icon className="w-3 h-3 mr-1" /> {label}
    </Badge>
  );
};
```

---

## Acceptance Criteria

1. "Subjects" removed from Header navigation for logged-in users
2. "Assignments" added to Header navigation with ClipboardList icon
3. New `/assignments` route created and protected
4. Student sees only their assigned tests
5. Status badges show Not Started, In Progress, Finished, or Missed
6. Start/Continue buttons navigate to the test
7. Real-time updates when admin modifies assignments
8. Filter by status works correctly
9. Empty state when no assignments

