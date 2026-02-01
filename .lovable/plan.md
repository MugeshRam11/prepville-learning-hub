

# Complete Real-Time Synchronization Across All Admin & Student Pages

## Overview

This plan establishes comprehensive bidirectional real-time sync between admin management pages and student-facing pages, ensuring all related tables are properly subscribed for instant updates.

---

## Current Sync Status Analysis

| Page | Route | Current Sync | Tables Subscribed |
|------|-------|--------------|-------------------|
| **Practice** | `/practice` | Partial | `subject_questions`, `tests`, `questions` |
| **Admin Tests** | `/admin/tests` | Has Sync | `tests` only |
| **Admin Assignments** | `/admin/assignments` | Has Sync | `test_assignments` only |
| **Student Assignments** | `/assignments` | Has Sync | `test_assignments` (filtered by user) |
| **Admin Mock Tests** | `/admin/mock-tests` | Has Sync | `mock_tests` only |
| **Mock Exam Select** | `/mock-exams/select` | Has Sync | `mock_tests` only |

---

## Required Enhancements

### Problem: Incomplete Cross-Table Sync

When an admin publishes a mock test in `/admin/mock-tests`, the following should update immediately:
1. `/mock-exams/select` (student selection page)
2. `/admin/assignments` (if tests are used in assignments)

When admin creates/modifies assignments, these should update:
1. `/assignments` (student view)
2. Related stats in admin dashboard

---

## Files to Modify

| File | Required Changes |
|------|------------------|
| `src/pages/Practice.tsx` | Add `test_assignments` subscription for solved status sync |
| `src/pages/AdminTests.tsx` | Add `questions` and `subject_questions` subscriptions |
| `src/pages/AdminMockTests.tsx` | Add `mock_questions` subscription for question counts |
| `src/pages/MockExamSelect.tsx` | Add `mock_questions` subscription for accurate totals |
| `src/pages/AdminAssignments.tsx` | Add `mock_tests` subscription for test name updates |
| `src/pages/StudentAssignments.tsx` | Add `mock_tests` subscription for test detail updates |

---

## Detailed Implementation

### 1. Practice Page (`/practice`)

**Current:** Subscribes to `subject_questions`, `tests`, `questions`

**Add:** Sync from `test_assignments` to track solved questions from assigned tests

```typescript
// Add to existing useEffect
const assignmentsChannel = supabase.channel('practice_assignments_sync')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'test_assignments'
  }, () => {
    console.log('[Practice] test_assignments changed, updating status...');
    // Trigger status refresh
  })
  .subscribe();
```

### 2. Admin Tests Page (`/admin/tests`)

**Current:** Only subscribes to `tests` table

**Add:** `questions` and `subject_questions` subscriptions to sync question counts

```typescript
// Enhance existing subscription
const questionsChannel = supabase.channel('admin_tests_questions_sync')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'questions'
  }, () => fetchTests())
  .subscribe();

const subjectQuestionsChannel = supabase.channel('admin_tests_sq_sync')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'subject_questions'
  }, () => fetchTests())
  .subscribe();
```

### 3. Admin Mock Tests Page (`/admin/mock-tests`)

**Current:** Only subscribes to `mock_tests` table

**Add:** `mock_questions` subscription to update question counts when questions are added/removed

```typescript
// Add after existing channel
const mockQuestionsChannel = supabase.channel('admin_mock_questions_sync')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'mock_questions'
  }, () => {
    console.log('[AdminMockTests] mock_questions changed, refetching...');
    fetchMockTests();
  })
  .subscribe();
```

### 4. Mock Exam Select Page (`/mock-exams/select`)

**Current:** Only subscribes to `mock_tests` table

**Add:** `mock_questions` subscription to ensure total question counts are accurate

```typescript
// Add after existing channel
const mockQuestionsChannel = supabase.channel('mock_select_questions_sync')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'mock_questions'
  }, () => {
    console.log('[MockExamSelect] mock_questions changed, refetching...');
    fetchMockTests();
  })
  .subscribe();
```

### 5. Admin Assignments Page (`/admin/assignments`)

**Current:** Subscribes to `test_assignments`

**Add:** `mock_tests` subscription to update test names if they change

```typescript
// Add after existing channel
const mockTestsChannel = supabase.channel('admin_assignments_tests_sync')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'mock_tests'
  }, () => {
    console.log('[AdminAssignments] mock_tests changed, refetching...');
    fetchData();
  })
  .subscribe();
```

### 6. Student Assignments Page (`/assignments`)

**Current:** Subscribes to `test_assignments` filtered by user

**Add:** `mock_tests` subscription to update test details (title, subject, duration)

```typescript
// Add after existing channel
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
```

---

## Sync Relationship Map

```text
+-------------------+         +-------------------+
|  Admin Mock Tests | ------> |  Mock Exam Select |
|  /admin/mock-tests|         |  /mock-exams/select
+-------------------+         +-------------------+
        |                              |
        | mock_tests table             | mock_tests table
        | mock_questions table         | mock_questions table
        v                              v
+-------------------+         +-------------------+
| Admin Assignments | ------> | Student Assignments
|  /admin/assignments|        |  /assignments      |
+-------------------+         +-------------------+
        |                              |
        | test_assignments table       | test_assignments table (filtered)
        | mock_tests table             | mock_tests table
        v                              v
+-------------------+
|    Practice       |
|    /practice      |
+-------------------+
        |
        | subject_questions, tests, questions, test_assignments
```

---

## Cleanup Pattern

Each page must properly clean up all channels on unmount:

```typescript
return () => {
  supabase.removeChannel(channel1);
  supabase.removeChannel(channel2);
  supabase.removeChannel(channel3);
  // ... all channels
};
```

---

## Summary of Changes

| File | Channels to Add |
|------|----------------|
| `Practice.tsx` | `test_assignments` |
| `AdminTests.tsx` | `questions`, `subject_questions` |
| `AdminMockTests.tsx` | `mock_questions` |
| `MockExamSelect.tsx` | `mock_questions` |
| `AdminAssignments.tsx` | `mock_tests` |
| `StudentAssignments.tsx` | `mock_tests` |

---

## Technical Notes

1. **Channel Naming:** Use unique descriptive names to avoid conflicts (e.g., `admin_mock_questions_sync` vs `mock_select_questions_sync`)

2. **Performance:** Supabase realtime is efficient - multiple subscriptions on the same table from different pages won't cause issues

3. **Debouncing:** Not needed for these use cases as Supabase already batches rapid changes

4. **Logging:** Each refetch logs to console for debugging visibility

---

## Acceptance Criteria

1. Admin publishes a mock test → `/mock-exams/select` updates instantly
2. Admin adds questions to mock test → Question counts update on both admin and student pages
3. Admin creates assignment → Student sees it immediately in `/assignments`
4. Admin extends due date → Student sees updated due date instantly
5. Student starts/finishes test → Admin sees status change in `/admin/assignments`
6. Admin activates/deactivates practice test → `/practice` updates immediately
7. All channel subscriptions are properly cleaned up on unmount
8. Console logs confirm sync events are firing

