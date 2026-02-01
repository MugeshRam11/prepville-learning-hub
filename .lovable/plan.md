
Goal
- Add a working “Assignments” system end-to-end:
  1) Admin can assign a Mock Test to one/many students.
  2) Students see their assigned items under the existing “Practice” page (/practice) with live sync.
  3) Assignment status updates automatically when a student starts and submits the assigned Mock Test.

What’s currently happening (why it feels “missing”)
- The database table `test_assignments` exists and is typed in `src/integrations/supabase/types.ts`.
- But there is no UI/page/component in the repo that creates or displays assignments:
  - No `/admin/assignments` route in `src/App.tsx`
  - No “Assignments” item in `src/components/admin/AdminSidebar.tsx`
  - No components like `AssignmentsDashboard` / `TestAssignmentModal` in `src/components/admin/`
  - No student-side integration in `src/pages/Practice.tsx`

Important constraint (from your DB)
- `test_assignments.test_id` is a foreign key to `mock_tests.id` (not to `tests`).
- So the “Assignments” we implement now will be “Assigned Mock Exams shown under /practice”.
- If you also want to assign Practice-QA tests from `tests`, that requires a separate DB table (or changing the schema) and is a follow-up.

Implementation design (high-level)
- Admin workflow:
  - New admin page `/admin/assignments`
  - Table listing assignments (student, test, start/due, status)
  - “Assign Test” button opens modal:
    - pick Mock Test
    - pick students (multi-select + search)
    - pick start/due datetime
    - create rows in `test_assignments`

- Student workflow (under /practice):
  - Add a “Your Assignments” section at the top of `/practice`
  - Fetch the logged-in student’s `test_assignments` joined with `mock_tests`
  - Show each assignment with:
    - test title/topic/subject
    - status badge (not_started / in_progress / completed / missed)
    - due date countdown (e.g., “Due in 2 days” / “Overdue by 1 day”)
    - action button:
      - “Start assignment” -> opens the unified mock exam for that specific `mock_tests.id`

- Status sync:
  - When student opens the assigned mock test:
    - set assignment status to `in_progress` (and `started_at` if empty)
  - When student submits from `UnifiedMockExam`:
    - set assignment status to `completed` and `completed_at`
  - Realtime updates:
    - subscribe to `test_assignments` changes and refetch on change for:
      - student `/practice`
      - admin `/admin/assignments`

Files to create (Admin)
1) `src/pages/AdminAssignments.tsx`
- Layout consistent with other admin pages:
  - `<AdminSidebar ... />`
  - heading + description
  - renders `<AssignmentsDashboard />`

2) `src/components/admin/AssignmentsDashboard.tsx`
- Responsibilities:
  - fetch list of assignments
  - fetch student profiles (since `test_assignments.student_id` has no FK relationship in types; we’ll map manually by `profiles.id`)
  - show table with filters:
    - status filter
    - search by student name/email or test title
  - open/close `<TestAssignmentModal />`
  - delete assignment action (optional but very useful)

3) `src/components/admin/TestAssignmentModal.tsx`
- Modal form:
  - Select mock test (from `mock_tests`)
  - Multi-select students (from `profiles` where role = student)
  - Start date/time (datetime-local input)
  - Due date/time (datetime-local input)
- Submit:
  - bulk insert `test_assignments` rows
  - handle unique constraint conflicts gracefully (if same test already assigned to a student)

Files to modify (Admin)
4) `src/components/admin/AdminSidebar.tsx`
- Add menu item:
  - { id: 'assignments', label: 'Assignments', icon: (ClipboardList or similar), path: '/admin/assignments' }

5) `src/App.tsx`
- Add route:
  - `/admin/assignments` -> `<ProtectedRoute><AdminAssignments /></ProtectedRoute>`
- Note: current `ProtectedRoute` does not restrict by role; RLS will block students but UX will be messy. Optional hardening below.

Files to modify (Student /practice)
6) `src/pages/Practice.tsx`
- Add new state: `assignments`, `assignmentsLoading`
- Fetch assignments:
  - `supabase.auth.getUser()` to get `user.id`
  - query `test_assignments`
    - `.select('id, test_id, start_date, due_date, status, started_at, completed_at, mock_tests (id, title, subject, topic, total_questions, time_limit_minutes)')`
    - `.eq('student_id', user.id)`
    - sort by `due_date` ascending
- Subscribe to realtime updates on `test_assignments` (filtered by student_id if supported; otherwise refetch on any change)
- UI:
  - New section above “Available Practice Tests”
  - If none: show small “No assignments right now”
  - If some: show assignment cards with “Start Assignment” button
- “Start Assignment” action:
  - Update assignment to `in_progress` (best-effort)
  - Navigate to the assigned mock test:
    - `navigate('/mock-exams/unified', { state: { testId: assignment.test_id } })`

Files to modify (Status updates from the exam)
7) `src/pages/UnifiedMockExam.tsx`
- Add two small “assignment sync” hooks:
  A) On exam load (once we know `examData.id` is a real mock test id and user is logged in):
     - lookup assignment row for (student_id=user.id, test_id=examData.id)
     - if found and status is `not_started`, update to:
       - status: `in_progress`
       - started_at: now (if null)
  B) In `handleSubmit` after creating `test_attempts` / `exam_evaluations`:
     - update assignment row to:
       - status: `completed`
       - completed_at: now

Optional but recommended (prevents confusing “permission denied” for students)
8) Add an Admin-only guard for `/admin/*` routes
- Current code: `ProtectedRoute` only checks “logged in”, not “admin role”.
- Minimal approach:
  - create `AdminProtectedRoute` that fetches the user’s profile role and blocks non-admin/moderator.
  - update admin routes in `App.tsx` to wrap with `AdminProtectedRoute`.
- This is not strictly required to make assignments work, but it will reduce support issues.

Acceptance criteria (what you’ll be able to do after implementation)
- Admin:
  - Go to `/admin/assignments`
  - Assign a published Mock Test to one or more students with start/due dates
  - See assignments list update in real-time
- Student:
  - Go to `/practice`
  - See “Your Assignments” section with assigned mock tests
  - Start assignment opens the correct mock test
  - Assignment status changes to “In progress”
  - After submitting the mock exam, assignment becomes “Completed”
  - Without refreshing, assignment list updates (realtime refetch)

Testing checklist (end-to-end)
1) As admin:
   - create 1 assignment for 1 student, due tomorrow
   - confirm it appears in `/admin/assignments` list
2) As that student:
   - open `/practice` and confirm it appears under “Your Assignments”
   - click “Start Assignment” -> confirm you land in the correct unified mock exam
   - confirm assignment becomes `in_progress` (either immediately or after realtime refetch)
3) Submit the exam:
   - confirm `test_attempts` row is created with `submission_status='submitted'`
   - confirm `exam_evaluations` row exists with `pending_review`
   - confirm assignment becomes `completed`

Implementation order (fastest path)
1) Create admin pages/components + route + sidebar item
2) Add student “Your Assignments” section in `/practice` + realtime subscription
3) Add assignment status syncing in `UnifiedMockExam.tsx`
4) (Optional) Add AdminProtectedRoute for cleaner access control
