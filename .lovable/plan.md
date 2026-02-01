
# LeetCode-Style Practice Bank Implementation

## Overview

This plan converts `/practice` from a test-card selection page into a pure LeetCode-style question bank where students directly see all practice questions in a filterable table, with no extra routes or redirects.

---

## Current State Analysis

| Issue | Current Implementation | Required Change |
|-------|----------------------|-----------------|
| **Practice Page** | Shows test cards (`PracticeTestCard`) that redirect to `/practice/exam` | Rewrite to show direct question list table |
| **Extra Routes** | `/practice/exam` exists | Remove this route entirely |
| **Question Source** | Fetches tests, not individual questions | Query `subject_questions` table directly |
| **Question Open Flow** | Navigates to `/practice/question/:id` | Keep this route for inline question view |
| **Status Tracking** | Hook exists (`usePracticeQuestionStatus`) but Practice.tsx doesn't use it | Integrate into question list |

---

## Changes Required

### 1. Rewrite `src/pages/Practice.tsx`

**Remove:**
- Test card grid layout
- `PracticeTestCard` component usage
- `handleStartPractice` function that navigates to `/practice/exam`
- "Available Practice Tests" section
- Mock Exams CTA section

**Add:**
- Direct question list table using `PracticeQuestionRow`
- `PracticeFilters` component for filtering
- Integration with `usePracticeQuestionStatus` hook
- Query `subject_questions` table (all published Practice-QA questions)
- Topic pills row at top (similar to LeetCode reference image)
- Search bar + filter dropdowns
- "X/Y Solved" counter in header

**UI Structure (based on reference images):**
```
+----------------------------------------------------------+
|  Practice & Learn                                         |
+----------------------------------------------------------+
|  [All Topics] [Algebra] [Geometry] [Probability] ...     |
+----------------------------------------------------------+
|  [Q Search...] [Sort ↕] [Filter ▽]       ○ 28/120 Solved |
+----------------------------------------------------------+
|  # | Question Title           | Topic  | Diff | Status   |
+----------------------------------------------------------+
|  1 | Solve quadratic...      | Algebra| Easy | ✓ Solved |
|  2 | Probability of...       | Prob   | Med  | • Attempt|
|  3 | Plot the function...    | Graphs | Hard | ○ Unsolved|
+----------------------------------------------------------+
```

### 2. Update Routing in `src/App.tsx`

**Remove:**
```tsx
<Route path="/practice/exam" element={...}>
  <PracticeExam />
</Route>
```

**Keep:**
```tsx
<Route path="/practice" element={...}>
  <Practice />
</Route>
<Route path="/practice/question/:questionId" element={...}>
  <PracticeQuestionView />
</Route>
```

### 3. Keep `src/pages/PracticeQuestionView.tsx`

This page already works correctly for:
- Loading individual questions from `subject_questions` or `questions` table
- Showing interactive question UI
- Ask Tutor button enabled
- Submit to review flow
- Try Again functionality
- Back to Practice navigation

**Minor enhancements needed:**
- Ensure Ask Tutor button is always visible (not just on modal toggle)
- Verify "Submit to Review" behavior shows correct answer + explanation

### 4. Update `usePracticeQuestionStatus` Hook

Currently tracks status from `test_attempts`, but needs to also check `user_question_progress` table for `subject_questions`:

**Query both sources:**
- `test_attempts.answers` for questions tied to tests
- `user_question_progress.is_solved` for subject_questions

### 5. Remove Unused Components/Routes

**Delete or deprecate:**
- `/practice/exam` route removal from `App.tsx`
- `PracticeExam.tsx` can be kept for now but not routed
- `PracticeTestCard.tsx` - no longer needed on `/practice`

---

## Data Flow

### Question Source
```
subject_questions table
  ├── is_published = true
  ├── Any subject (Mathematics, Physics, Chemistry, Biology)
  └── Ordered by: topic, difficulty, created_at
```

### Status Determination
```
For each question:
1. Check user_question_progress for user_id + question_id
   ├── is_solved = true → "Solved" (green checkmark)
   ├── user_answer exists but is_solved = false → "Attempted" (yellow dot)
   └── No record → "Unsolved" (empty circle)
```

### Click Flow
```
/practice (Question List)
    │
    ▼ Click question row
/practice/question/:id
    │
    ├── Load question from subject_questions
    ├── Show interactive UI
    ├── Ask Tutor enabled
    ├── Submit → Show result inline
    └── Try Again or Back to /practice
```

---

## UI Components to Use

| Component | Location | Purpose |
|-----------|----------|---------|
| `PracticeFilters` | `src/components/practice/PracticeFilters.tsx` | Already exists - filter dropdowns |
| `PracticeQuestionRow` | `src/components/practice/PracticeQuestionRow.tsx` | Already exists - table row with navigation |
| `PracticeStatusBadge` | `src/components/practice/PracticeStatusBadge.tsx` | Already exists - solved/attempted/unsolved |
| `Table, TableHeader, TableBody, etc.` | `src/components/ui/table.tsx` | Already exists - table structure |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Practice.tsx` | Full rewrite: question list table + filters |
| `src/App.tsx` | Remove `/practice/exam` route |
| `src/hooks/usePracticeQuestionStatus.tsx` | Query `user_question_progress` table |
| `src/pages/PracticeQuestionView.tsx` | Minor UX polish for Ask Tutor visibility |

## Files to Keep (No Changes)

| File | Reason |
|------|--------|
| `src/components/practice/PracticeFilters.tsx` | Already implements correct filters |
| `src/components/practice/PracticeQuestionRow.tsx` | Already navigates to `/practice/question/:id` |
| `src/components/practice/PracticeStatusBadge.tsx` | Already shows 3 states correctly |

## Files That Become Unused

| File | Action |
|------|--------|
| `src/pages/PracticeExam.tsx` | Route removed, file can remain for reference |
| `src/components/practice/PracticeTestCard.tsx` | No longer imported, can be deleted |

---

## Technical Details

### Practice.tsx Query
```typescript
// Fetch all published practice questions
const { data, error } = await supabase
  .from('subject_questions')
  .select('id, title, topic, difficulty, question_text, xp_reward')
  .eq('is_published', true)
  .order('topic')
  .order('difficulty');
```

### Filter Logic
```typescript
const filteredQuestions = useMemo(() => {
  return questions.filter(q => {
    if (filters.search && !q.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.topic !== 'all' && q.topic !== filters.topic) return false;
    if (filters.difficulty !== 'all' && q.difficulty !== filters.difficulty) return false;
    if (filters.status !== 'all' && getStatus(q.id) !== filters.status) return false;
    return true;
  });
}, [questions, filters, getStatus]);
```

### Topic Pills Extraction
```typescript
const uniqueTopics = useMemo(() => {
  return [...new Set(questions.map(q => q.topic))].sort();
}, [questions]);
```

---

## Ask Tutor Behavior (Confirmed)

| Route | Ask Tutor Available |
|-------|---------------------|
| `/practice` | Via question view only |
| `/practice/question/:id` | Yes - always enabled |
| `/mock-exams/*` | No - completely disabled |

The `EnhancedAITutor` component already checks `useChatbot()` context which disables it for mock exam routes. No changes needed here.

---

## Acceptance Criteria

1. `/practice` opens directly to question list (no cards)
2. No `/practice/exam` route exists
3. All published `subject_questions` are visible
4. Filters work: Topic, Difficulty, Question Type, Status
5. Search by title/keyword works
6. Clicking question opens `/practice/question/:id`
7. Status (Solved/Attempted/Unsolved) shows per-student
8. Ask Tutor available only in practice contexts
9. Practice feels like LeetCode, not exam
