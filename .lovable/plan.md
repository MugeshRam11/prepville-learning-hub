
# Plan: Unified Mock Exam – Direct Navigation Flow

## Overview

Simplify the student exam experience by making **Unified Mock Exam the ONLY entry point** for all subject-based exams. This eliminates decision fatigue and streamlines the user journey.

---

## Current Flow (Problem)

```text
/mock-exams/select → Subject Card → /mock-exams/subject/:subject
                                            ↓
                         ┌──────────────────┴──────────────────┐
                         │                                      │
                    [Standard Test]                    [Interactive Test]
                         ↓                                      ↓
                /mock-exams/start              /mock-exams/interactive
```

**Issues:**
- Two competing "Start" buttons cause confusion
- Extra page (`MockExamSubjectView`) adds unnecessary clicks
- Split experience between Standard/Interactive modes

---

## New Flow (Solution)

```text
/mock-exams/select → Subject Card → /mock-exams/unified
                                            ↓
                              [Single Unified Exam Experience]
                              (Graph, Drag & Drop, Image Zones, Smart Math)
```

**Benefits:**
- Zero intermediate screens
- No user decisions required
- Same interactive features for all subjects

---

## Implementation Details

### Phase 1: Update Subject Card Navigation

**File:** `src/components/mock-exam/SubjectTestCard.tsx`

**Change:** Modify the `onStart` callback to navigate directly to unified exam with subject-loaded questions.

Current behavior:
```tsx
onClick={() => onStart(subjectKey)}
// Parent routes to: /mock-exams/subject/${subjectKey}
```

New behavior:
```tsx
// Load questions and navigate directly to unified exam
onClick={async () => {
  const questions = await fetchQuestionsForSubject(subjectKey);
  navigate('/mock-exams/unified', {
    state: {
      subject: subjectLabel,
      subjectKey,
      title: subjectLabel,
      questions
    }
  });
}}
```

### Phase 2: Update MockExamSelect Page

**File:** `src/pages/MockExamSelect.tsx`

**Changes:**
1. Change `handleStartSubject` to fetch questions and navigate directly to `/mock-exams/unified`
2. Remove `InteractiveDemoCard` import and rendering (optional - can keep for demo purposes)

```tsx
const handleStartSubject = async (subjectKey: string) => {
  // Fetch questions for the subject
  const { data: tests } = await supabase
    .from('mock_tests')
    .select('id')
    .eq('subject', subjectKey)
    .eq('is_published', true);

  if (!tests || tests.length === 0) {
    toast.error('No questions available for this subject');
    return;
  }

  const testIds = tests.map(t => t.id);
  const { data: questions } = await supabase
    .from('mock_questions')
    .select('*, mock_sub_questions(*)')
    .in('mock_test_id', testIds)
    .order('question_number');

  // Navigate directly to Unified Exam
  navigate('/mock-exams/unified', {
    state: {
      subject: getSubjectLabel(subjectKey),
      subjectKey,
      title: getSubjectLabel(subjectKey),
      questions: questions || []
    }
  });
};
```

### Phase 3: Simplify MockExamSelect UI

**File:** `src/pages/MockExamSelect.tsx`

**Remove or hide:**
- `InteractiveDemoCard` component (or keep for demo/training purposes)
- Hero text mentioning "Choose your exam mode"

**Keep:**
- `UnifiedExamCard` as the prominent entry
- Subject browser section with cards

**Updated Hero Text:**
```tsx
<h1>Mock Examinations</h1>
<p>Select a subject to start your unified exam experience</p>
```

### Phase 4: Update Routing (Optional Cleanup)

**File:** `src/App.tsx`

The `/mock-exams/subject/:subject` route can be:
- **Option A:** Redirected to fetch questions and navigate to unified (keep backward compatibility)
- **Option B:** Removed entirely (breaking change for bookmarks)

**Recommended:** Option A - Add redirect logic in `MockExamSubjectView.tsx`:
```tsx
useEffect(() => {
  // Auto-redirect to unified exam with loaded questions
  if (questions.length > 0 && !loading) {
    navigate('/mock-exams/unified', {
      state: { subject, questions, title: getSubjectLabel(subject) },
      replace: true
    });
  }
}, [questions, loading]);
```

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/MockExamSelect.tsx` | Modify | Update `handleStartSubject` to navigate directly to unified with questions |
| `src/pages/MockExamSubjectView.tsx` | Modify | Auto-redirect to unified exam after loading questions |
| `src/components/mock-exam/SubjectTestCard.tsx` | Keep | No changes needed (uses parent's `onStart`) |

---

## Files to Keep (No Changes)

| File | Reason |
|------|--------|
| `src/pages/UnifiedMockExam.tsx` | Core exam engine - no changes |
| `src/pages/MockExamStart.tsx` | Keep for backward compatibility (legacy links) |
| `src/pages/InteractiveMockExam.tsx` | Keep for backward compatibility |
| `src/App.tsx` | Keep all routes for backward compatibility |

---

## Out of Scope (Per PRD)

- No changes to exam logic
- No changes to question types
- No changes to evaluation
- No changes to timer logic
- No changes to AI/OCR

---

## Testing Checklist

After implementation:
1. Click any subject card → Should go directly to `/mock-exams/unified`
2. Unified exam should load with correct subject questions
3. All interactive question types should work (Graph, Drag & Drop, etc.)
4. Submit should navigate to summary correctly
5. Old bookmarks to `/mock-exams/subject/:subject` should auto-redirect

