

# Plan: Complete Evaluation Workflow System with 5 Core Features

## Overview

This PRD implementation adds a complete admin-controlled evaluation workflow with test assignments, enhanced student progress analytics, a hybrid AI + manual evaluation system, improved student identity management, and math keyboard fixes.

---

## Technical Architecture Summary

### Current State

| Component | Status |
|-----------|--------|
| Database tables | `test_attempts`, `user_answers` exist but lack evaluation fields |
| Profiles | Has `email`, `first_name`, `last_name`, `role` - missing `student_id`, `roll_number`, `class` |
| Evaluation | AI evaluation runs immediately on submission in `MockExamSummary.tsx` |
| Student messaging | Shows score immediately after AI evaluation |
| Admin dashboard | Has user/test management but no evaluation module |

### Target State

| Component | Change |
|-----------|--------|
| New table `test_assignments` | Links tests to students with start/due dates and status |
| New table `exam_evaluations` | Stores evaluation state and results per submission |
| Profiles extended | Add `student_id`, `roll_number`, `class_name` columns |
| Evaluation workflow | Two-phase: Student submits -> Admin evaluates -> Student sees score |
| New admin route `/admin/evaluation` | Dedicated evaluation dashboard |

---

## FEATURE 1: Admin Assignment Management

### Database Schema Change

Create new table `test_assignments`:

```sql
CREATE TABLE test_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES mock_tests(id) NOT NULL,
  student_id UUID NOT NULL, -- References profiles
  assigned_by UUID NOT NULL, -- Admin who assigned
  start_date TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'missed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(test_id, student_id)
);
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/admin/TestAssignmentModal.tsx` | Modal to assign tests to students |
| `src/components/admin/AssignmentsDashboard.tsx` | View all assignments with filters |
| `src/pages/AdminAssignments.tsx` | Page wrapper for assignments management |

### Files to Modify

| File | Change |
|------|---------|
| `src/components/admin/AdminSidebar.tsx` | Add "Assignments" menu item |
| `src/App.tsx` | Add route `/admin/assignments` |

### Assignment Flow

1. Admin navigates to `/admin/assignments`
2. Clicks "Assign Test"
3. Selects test (mock test or practice-QA)
4. Selects students (multi-select with search)
5. Sets start date and due date
6. Confirms assignment
7. System creates `test_assignments` records

### Student View Integration

When student visits `/practice` or `/mock-exams/select`:
- Query `test_assignments` for their assigned tests
- Show "Assigned to you" badge on assigned tests
- Show due date countdown
- Update status to `in_progress` when started, `completed` when submitted

---

## FEATURE 2: Admin Student Progress Dashboard

### Files to Create

| File | Purpose |
|------|---------|
| `src/pages/AdminStudentProgress.tsx` | Main student progress page |
| `src/components/admin/StudentProgressCard.tsx` | Individual student card with metrics |
| `src/components/admin/StudentDetailModal.tsx` | Detailed view with charts |
| `src/components/admin/StudentMarksHistogram.tsx` | Marks distribution chart |

### Data to Display

**Student Overview Cards:**
- Student name, ID, roll number, class
- Problems solved (total/this week)
- Current streak / best streak
- Average score percentage
- Last activity timestamp
- Assignment completion rate

**Detailed Student View (modal/drawer):**
- Performance by subject (bar chart)
- Score trend over time (line chart)
- Assignment timeline with status
- Topic-wise accuracy breakdown
- Recent activity log

### Files to Modify

| File | Change |
|------|---------|
| `src/components/admin/AdminSidebar.tsx` | Add "Student Progress" menu item |
| `src/App.tsx` | Add route `/admin/student-progress` |

### Database View Enhancement

Create or enhance view `student_progress_detailed`:

```sql
CREATE OR REPLACE VIEW student_progress_detailed AS
SELECT 
  p.id as user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.student_id,
  p.roll_number,
  p.class_name,
  COALESCE(xp.total_xp, 0) as total_xp,
  COALESCE(xp.current_level, 1) as current_level,
  COALESCE(s.current_streak, 0) as current_streak,
  COALESCE(s.best_streak, 0) as best_streak,
  COUNT(DISTINCT ta.id) as total_tests_taken,
  AVG(ta.score) as avg_score,
  MAX(ta.completed_at) as last_test_at,
  COUNT(DISTINCT CASE WHEN ta.status = 'completed' THEN a.id END) as assignments_completed,
  COUNT(DISTINCT a.id) as total_assignments
FROM profiles p
LEFT JOIN user_xp xp ON p.id = xp.user_id
LEFT JOIN user_streaks s ON p.id = s.user_id
LEFT JOIN test_attempts ta ON p.id = ta.user_id
LEFT JOIN test_assignments a ON p.id = a.student_id
WHERE p.role = 'student'
GROUP BY p.id, xp.total_xp, xp.current_level, s.current_streak, s.best_streak;
```

---

## FEATURE 3: Rebuilt Evaluation Workflow

### Database Schema Changes

#### 1. New table `exam_evaluations`:

```sql
CREATE TABLE exam_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_attempt_id UUID REFERENCES test_attempts(id) UNIQUE NOT NULL,
  student_id UUID NOT NULL,
  test_id UUID NOT NULL,
  evaluation_status TEXT DEFAULT 'pending_review' CHECK (status IN (
    'pending_review',
    'ai_evaluated', 
    'manually_evaluated',
    'finalized'
  )),
  ai_evaluation_data JSONB, -- Stores AI evaluation results
  manual_adjustments JSONB, -- Stores admin overrides
  final_score NUMERIC,
  final_marks JSONB, -- Per-question marks
  feedback TEXT,
  evaluated_by UUID, -- Admin who finalized
  evaluated_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. Modify `test_attempts` table:

Add column:
```sql
ALTER TABLE test_attempts ADD COLUMN submission_status TEXT DEFAULT 'draft' 
  CHECK (submission_status IN ('draft', 'submitted', 'under_review', 'evaluated'));
```

### Workflow Flow

```text
Student Flow:
+-------------+    +------------+    +----------------+    +---------------+
| Takes Exam  | -> | Clicks     | -> | Sees Message:  | -> | Waits for     |
|             |    | Submit     |    | "Your score    |    | Notification  |
+-------------+    +------------+    | will be        |    +---------------+
                                     | notified soon" |
                                     +----------------+

Admin Flow:
+---------------+    +----------------+    +------------------+    +------------+
| Pending       | -> | Opens          | -> | Evaluates:       | -> | Finalizes  |
| Review List   |    | Submission     |    | AI or Manual     |    | & Notifies |
+---------------+    +----------------+    +------------------+    +------------+
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/pages/AdminEvaluation.tsx` | Main evaluation dashboard |
| `src/components/admin/EvaluationSubmissionsList.tsx` | List of pending submissions |
| `src/components/admin/EvaluationDetailView.tsx` | Single submission evaluation UI |
| `src/components/admin/AIEvaluationPanel.tsx` | AI evaluation trigger and results |
| `src/components/admin/ManualEvaluationPanel.tsx` | Question-by-question manual grading |
| `src/components/admin/EvaluationFinalizeModal.tsx` | Confirmation before finalizing |

### 3.1 Student Submission Flow Changes

**File to Modify:** `src/pages/UnifiedMockExam.tsx`

Update `handleSubmit` function:

```typescript
const handleSubmit = async () => {
  // Save answers to test_attempts with submission_status = 'submitted'
  await supabase.from('test_attempts').insert({
    user_id: userId,
    test_id: examData.id,
    answers: answers,
    submission_status: 'submitted',
    completed_at: new Date().toISOString()
  });

  // Create evaluation record with pending_review status
  await supabase.from('exam_evaluations').insert({
    test_attempt_id: attemptId,
    student_id: userId,
    test_id: examData.id,
    evaluation_status: 'pending_review'
  });

  // Navigate to new submission confirmation page
  navigate('/mock-exams/submitted', {
    state: { testTitle: examData.title }
  });
};
```

**New File:** `src/pages/MockExamSubmitted.tsx`

```typescript
// Shows: "Your score will be notified soon."
// Clean, calm, informational page
// No score, no results - just confirmation
```

### 3.2 Admin Evaluation Dashboard

**Route:** `/admin/evaluation`

**EvaluationSubmissionsList Component:**

Display table with columns:
- Student Name
- Student ID / Roll No
- Test / Assignment Name
- Submission Date
- Evaluation Status (badge with color coding)
- Actions (View/Evaluate button)

**Status Badges:**
- `pending_review` - Yellow "Pending Review"
- `ai_evaluated` - Blue "AI Evaluated"
- `manually_evaluated` - Purple "Manually Evaluated"
- `finalized` - Green "Finalized"

### 3.3 Evaluation Prompt (Critical Requirement)

When admin opens a `pending_review` submission, show:

```text
+----------------------------------------------------------+
|  ℹ️  Student has finished the assignment.                 |
|      Please review and evaluate using AI or Manual        |
|      evaluation.                                          |
+----------------------------------------------------------+
|                                                           |
|  [🤖 Run AI Evaluation]    [✏️ Manual Evaluation]         |
|                                                           |
+----------------------------------------------------------+
```

### 3.4 AI Evaluation Action

When admin clicks "Run AI Evaluation":
1. Call existing `evaluate-interactive-answers` edge function
2. Store results in `exam_evaluations.ai_evaluation_data`
3. Display suggested scores and feedback per question
4. Update status to `ai_evaluated`
5. Admin can adjust scores before finalizing

### 3.5 Manual Evaluation Action

When admin clicks "Manual Evaluation":
1. Show each question with student's answer
2. Show reference answer (from `answer_key`)
3. Admin enters marks awarded per question
4. Admin can add feedback per question
5. Store in `exam_evaluations.manual_adjustments`
6. Update status to `manually_evaluated`

### 3.6 Finalize Evaluation

When admin clicks "Finalize Evaluation":
1. Show confirmation modal
2. Calculate final score from all marks
3. Update `exam_evaluations.evaluation_status` to `finalized`
4. Update `test_attempts.submission_status` to `evaluated`
5. Create notification for student (if notification system exists)
6. Lock evaluation - no further changes allowed

### 3.7 Student Notification

After finalization, student sees:
- Score on their dashboard
- "Evaluation Complete" status on test history
- Detailed feedback when viewing results

**Modify:** `src/pages/MockExamSummary.tsx`

Only show scores if `evaluation_status = 'finalized'`:

```typescript
const { data: evaluation } = await supabase
  .from('exam_evaluations')
  .select('*')
  .eq('test_attempt_id', attemptId)
  .single();

if (evaluation?.evaluation_status !== 'finalized') {
  return <PendingEvaluationMessage />;
}
// Show full results
```

---

## FEATURE 4: Enhanced Login/Signup (Student Identity)

### Database Schema Change

Extend `profiles` table:

```sql
ALTER TABLE profiles 
ADD COLUMN student_id TEXT UNIQUE,
ADD COLUMN roll_number TEXT,
ADD COLUMN class_name TEXT;
```

### Files to Modify

#### 1. `src/components/auth/SignUpForm.tsx`

Add new fields:

```typescript
const [formData, setFormData] = useState({
  fullName: '',
  email: '',
  studentId: '',      // NEW - Required
  rollNumber: '',     // NEW - Required
  className: '',      // NEW - Required
  password: '',
  confirmPassword: ''
});
```

Updated form layout:
- Student Name (required)
- Student ID (required, unique)
- Roll Number (required)
- Class (required, select dropdown)
- Email (optional for student created by admin, required for self-signup)
- Password (required)
- Confirm Password (required)

#### 2. `src/components/auth/SignInForm.tsx`

Add alternative login option:

```typescript
// Tab 1: Email + Password (existing)
// Tab 2: Student ID + Password (NEW)
// Tab 3: Roll Number + Password (NEW)
```

Login by Student ID:
```typescript
const handleStudentIdLogin = async () => {
  // Look up email from student_id in profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('student_id', studentId)
    .single();

  if (profile?.email) {
    // Sign in with found email
    await supabase.auth.signInWithPassword({
      email: profile.email,
      password
    });
  }
};
```

#### 3. `src/components/admin/CreateUserModal.tsx`

Add new fields to admin user creation:
- Student ID (required for students)
- Roll Number (required for students)
- Class (required for students)

#### 4. Edge Function `create-user`

Update to handle new profile fields.

---

## FEATURE 5: Mathematical Keyboard Fixes

### Issues to Fix

1. **Space key not working** - Spaces should insert properly
2. **Enter key behavior** - Should move to next input or submit
3. **Fraction handling (1/2)** - Should parse correctly
4. **Operator precedence** - Mathematical operations should follow BODMAS

### Files to Modify

#### `src/components/mock-exam/MathKeyboard.tsx`

**Fix 1: Space Key**

Add space button to basic tab:
```typescript
const numberButtons: MathButton[] = [
  // ... existing buttons
  { label: '⎵', latex: ' ' }, // Space
];
```

Handle space in input:
```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === ' ') {
    e.preventDefault();
    insertAtCursor(' ');
  }
};
```

**Fix 2: Enter Key**

```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (onSubmit) {
      onSubmit();
    } else {
      // Move to next input if available
      const inputs = document.querySelectorAll('[data-math-input]');
      const currentIndex = Array.from(inputs).indexOf(e.target as Element);
      if (currentIndex < inputs.length - 1) {
        (inputs[currentIndex + 1] as HTMLElement).focus();
      }
    }
  }
};
```

**Fix 3: Fraction Handling**

Improve fraction button behavior:
```typescript
const fractionButtons: MathButton[] = [
  { 
    label: '□/□', 
    latex: '\\frac{}{} ', // Proper LaTeX fraction
    display: '\\frac{a}{b}',
    cursorOffset: -3 // Place cursor in numerator
  },
];
```

**Fix 4: Operator Precedence**

No changes to parsing needed - KaTeX handles LaTeX correctly. Issue may be in how input is validated. Check `evaluate-interactive-answers` edge function math parsing.

---

## Implementation Order

### Phase 1: Database Foundation (Migration)
1. Create `test_assignments` table
2. Create `exam_evaluations` table
3. Extend `profiles` table with student identity fields
4. Update `test_attempts` table

### Phase 2: Student Identity (Feature 4)
1. Update `SignUpForm.tsx` with new fields
2. Update `SignInForm.tsx` with alternative logins
3. Update `CreateUserModal.tsx` for admin user creation
4. Update `create-user` edge function

### Phase 3: Assignment System (Feature 1)
1. Create `TestAssignmentModal.tsx`
2. Create `AssignmentsDashboard.tsx`
3. Create `AdminAssignments.tsx` page
4. Update sidebar and routes
5. Integrate with student-facing pages

### Phase 4: Evaluation Workflow (Feature 3)
1. Create `MockExamSubmitted.tsx` - submission confirmation
2. Modify `UnifiedMockExam.tsx` - change submit flow
3. Create `AdminEvaluation.tsx` page
4. Create evaluation components
5. Modify `MockExamSummary.tsx` - conditional score display
6. Update sidebar and routes

### Phase 5: Student Progress Dashboard (Feature 2)
1. Create database view
2. Create `AdminStudentProgress.tsx` page
3. Create progress components
4. Update sidebar and routes

### Phase 6: Math Keyboard Fixes (Feature 5)
1. Fix space key handling
2. Fix enter key behavior
3. Improve fraction input
4. Test all interactive question types

---

## Files Summary

### New Files (17)

| File | Purpose |
|------|---------|
| `src/pages/AdminAssignments.tsx` | Assignment management page |
| `src/pages/AdminEvaluation.tsx` | Evaluation dashboard page |
| `src/pages/AdminStudentProgress.tsx` | Student progress page |
| `src/pages/MockExamSubmitted.tsx` | Post-submission confirmation |
| `src/components/admin/TestAssignmentModal.tsx` | Assign tests to students |
| `src/components/admin/AssignmentsDashboard.tsx` | View/filter assignments |
| `src/components/admin/EvaluationSubmissionsList.tsx` | Pending evaluations list |
| `src/components/admin/EvaluationDetailView.tsx` | Single submission view |
| `src/components/admin/AIEvaluationPanel.tsx` | AI evaluation UI |
| `src/components/admin/ManualEvaluationPanel.tsx` | Manual grading UI |
| `src/components/admin/EvaluationFinalizeModal.tsx` | Finalization confirmation |
| `src/components/admin/StudentProgressCard.tsx` | Student metrics card |
| `src/components/admin/StudentDetailModal.tsx` | Detailed student view |
| `src/components/admin/StudentMarksHistogram.tsx` | Marks distribution chart |
| `src/components/admin/EvaluationPromptBanner.tsx` | "Please evaluate" prompt |
| `src/components/exam/SubmissionConfirmation.tsx` | "Score will be notified" message |
| `supabase/migrations/add_evaluation_workflow.sql` | Database migration |

### Modified Files (10)

| File | Changes |
|------|---------|
| `src/components/admin/AdminSidebar.tsx` | Add 3 new menu items |
| `src/App.tsx` | Add 4 new routes |
| `src/components/auth/SignUpForm.tsx` | Add student identity fields |
| `src/components/auth/SignInForm.tsx` | Add Student ID/Roll No login |
| `src/components/admin/CreateUserModal.tsx` | Add student fields |
| `src/pages/UnifiedMockExam.tsx` | Change submit flow |
| `src/pages/MockExamSummary.tsx` | Conditional score display |
| `src/components/mock-exam/MathKeyboard.tsx` | Fix space/enter/fractions |
| `supabase/functions/create-user/index.ts` | Handle new profile fields |
| `src/integrations/supabase/types.ts` | Will auto-regenerate |

---

## UI/UX Specifications

### Student Submission Message

After clicking "Submit":
```text
+----------------------------------------------------------+
|                                                           |
|     ✅  Your answers have been submitted successfully!    |
|                                                           |
|         Your score will be notified soon.                 |
|                                                           |
|     Your teacher will review your submission and          |
|     you will receive your results once evaluated.         |
|                                                           |
|              [Return to Dashboard]                        |
|                                                           |
+----------------------------------------------------------+
```

Style: Green checkmark, calm messaging, single CTA button

### Admin Evaluation Prompt

When viewing pending submission:
```text
+----------------------------------------------------------+
| ℹ️  Student has finished the assignment.                  |
|     Please review and evaluate using AI or Manual         |
|     evaluation.                                           |
+----------------------------------------------------------+
```

Style: Blue info banner, clear action buttons below

### Evaluation Status Badges

| Status | Color | Text |
|--------|-------|------|
| pending_review | Yellow/Amber | "Pending Review" |
| ai_evaluated | Blue | "AI Evaluated" |
| manually_evaluated | Purple | "Manually Evaluated" |
| finalized | Green | "Finalized" |

---

## System Constraints Adherence

| Constraint | Status |
|------------|--------|
| No OCR changes | ✅ Compliant |
| No AI model changes | ✅ Uses existing edge functions |
| No exam engine rewrite | ✅ Only submit flow changes |
| No routing overhaul | ✅ Additive routes only |
| Additive only | ✅ All changes are additive |
| Backward compatible | ✅ Existing flows still work |

