
# Plan: Learning vs Assessment Separation

## Problem Summary

The current system has overlapping UI that confuses users:

| Current Page | Problem |
|--------------|---------|
| **Quick Practice** (`/quick-practice`) | Shows test cards with timer, "Start Test" button - behaves like exam |
| **Practice** (`/practice`) | Has 3 cards including "Quick Practice" - unclear purpose |
| **Exam Header** | Contains Study/Exam toggle - mixes learning inside assessment |

**Result**: Users cannot distinguish between learning and evaluation modes.

---

## Solution: Clear Intent Separation

**Principle**: One purpose → One mode → One UI

| User Intent | Route | Mode | Behavior |
|-------------|-------|------|----------|
| Learn concepts | `/practice` | Practice | Learning UI, no timer, explanations |
| Browse topics | `/subjects` | Practice | Topic browser |
| Exam simulation | `/mock-exams/unified` | Exam | Timed, evaluated |

---

## Phase 1: Transform Quick Practice → Practice (Learning Mode)

**File**: `src/pages/QuickPractice.tsx`

### Current Behavior (Wrong)
- Fetches tests from database
- Shows `QuizGrid` with test cards displaying timer + "Start Test" button
- Navigates to timed quiz on click

### New Behavior (Correct)
- Rename to Practice Mode (learning-focused)
- Remove exam-like elements:
  - Remove timer display
  - Remove "Start Test" button
  - Remove quiz grid with test cards
- Add learning-focused elements:
  - Browse subjects/topics
  - Explore questions freely
  - Show explanations and hints
  - No pressure, no evaluation

### Implementation
Replace the entire component to show a learning-oriented interface that redirects users to browse subjects or shows learning content directly.

**New content will include:**
- Hero section: "Practice & Learn" (not "Quick Practice Tests")
- Two clear paths:
  1. **Browse by Subject** → `/subjects`
  2. **Mock Exams** → `/mock-exams/select`
- Remove: `QuizFilters`, `QuizGrid`, test fetching logic

---

## Phase 2: Remove Study Toggle from Unified Exam Header

**File**: `src/components/unified-exam/UnifiedExamHeader.tsx`

### Current Behavior (Wrong)
- Shows `ExamModeToggle` component (Study/Exam switch)
- Shows `FocusModeToggle` component
- Shows auto-save indicator (tied to exam mode context)
- Allows switching between Study/Exam during assessment

### New Behavior (Correct)
- Exam is always in exam mode - no toggle
- Remove Study Mode toggle completely
- Remove Focus Mode toggle (part of mode system)
- Remove auto-save indicator (depends on mode context)

### Components to Remove

```text
Line 31-32: Remove imports
- ExamModeToggle
- FocusModeToggle

Line 33: Remove useExamMode import usage (config, autoSaveState)

Lines 159-162: Remove ExamModeToggle and FocusModeToggle from render

Lines 175-195: Remove auto-save indicator section
```

### Keep
- Timer (required for exams)
- Progress indicator
- Submit button
- Back button
- Connection indicator

---

## Phase 3: Update Header Navigation

**File**: `src/components/Header.tsx`

### Current Navigation (Line 35)
```tsx
{ href: '/quick-practice', label: 'Quick Practice', icon: Target }
```

### New Navigation
```tsx
{ href: '/practice', label: 'Practice', icon: Target }
```

**Change**: Rename "Quick Practice" to "Practice" and update route from `/quick-practice` to `/practice`.

**Note**: The route `/practice` already exists and maps to `Practice.tsx`. We will update that page instead.

---

## Phase 4: Update Practice Entry Page

**File**: `src/pages/Practice.tsx`

### Current Behavior
Shows 3 cards:
1. Quick Practice → `/quick-practice`
2. Topic Practice → No route
3. Mock Exams → `/mock-exams/select`

Plus 6 hardcoded "Continue Your Practice" cards.

### New Behavior
Simplify to 2 clear paths:

**Card 1: Study & Learn**
- Icon: BookOpen (green)
- Description: "Explore subjects, practice questions with explanations and hints. Learn at your own pace."
- Button: "Browse Subjects" → `/subjects`

**Card 2: Mock Exams**
- Icon: Calendar (purple)
- Description: "Timed exam simulations. Evaluate your knowledge under exam conditions."
- Button: "Take Mock Exam" → `/mock-exams/select`

**Remove:**
- "Quick Practice" card
- Hardcoded "Continue Your Practice" section (can be added back with real data later)

---

## Phase 5: Update Routes in App.tsx

**File**: `src/App.tsx`

### Changes
1. Update Quick Practice route to redirect to Practice:
   - Keep `/quick-practice` but make it redirect to `/practice`
   - OR simply remove `/quick-practice` route (breaking old links)

**Recommended**: Keep both routes pointing to same behavior for backward compatibility.

### Route Mapping After Changes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/practice` | Practice.tsx | Learning entry point (2 cards) |
| `/quick-practice` | Practice.tsx | Redirect/alias to Practice |
| `/subjects` | Subjects.tsx | Browse subjects |
| `/subject-learning` | SubjectLearning.tsx | Learn with explanations |
| `/mock-exams/select` | MockExamSelect.tsx | Exam selection |
| `/mock-exams/unified` | UnifiedMockExam.tsx | Timed assessment |

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/QuickPractice.tsx` | **Rewrite** | Simple redirect to `/practice` |
| `src/pages/Practice.tsx` | **Edit** | Simplify to 2 cards (Study + Exams) |
| `src/components/unified-exam/UnifiedExamHeader.tsx` | **Edit** | Remove mode toggles and auto-save |
| `src/components/Header.tsx` | **Edit** | Change nav item to Practice → `/practice` |
| `src/App.tsx` | **Edit** | Update route for QuickPractice |

---

## Files Unchanged

| File | Reason |
|------|--------|
| `src/pages/UnifiedMockExam.tsx` | Core exam engine - no changes |
| `src/pages/Subjects.tsx` | Already learning-focused |
| `src/pages/SubjectLearning.tsx` | Already learning-focused |
| `src/contexts/ExamModeContext.tsx` | Keep for potential future use |
| `src/types/examMode.ts` | Keep type definitions |

---

## Technical Details

### QuickPractice.tsx - Redirect Implementation

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const QuickPractice = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/practice', { replace: true });
  }, [navigate]);
  
  return null;
};

export default QuickPractice;
```

### UnifiedExamHeader.tsx - Lines to Remove

```text
Remove imports (lines 31-33):
- import ExamModeToggle from './ExamModeToggle';
- import FocusModeToggle from './FocusModeToggle';
- Parts of useExamMode: config, autoSaveState

Remove from render (lines 158-162):
- <ExamModeToggle hasStartedExam={hasStartedExam} />
- <FocusModeToggle />

Remove auto-save section (lines 176-195):
- The entire {config.autoSaveEnabled && (...)} block

Update timer logic:
- Remove timerPaused state (line 63)
- Remove useEffect syncing timerPaused with config (lines 66-68)
- Timer should always run in exam mode
```

### Header.tsx - Navigation Update

```tsx
// Line 35 - Change from:
{ href: '/quick-practice', label: 'Quick Practice', icon: Target }

// To:
{ href: '/practice', label: 'Practice', icon: Target }
```

### Practice.tsx - Simplified Cards

```tsx
<div className="grid md:grid-cols-2 gap-6 mb-12">
  {/* Study Card */}
  <Card>
    <CardHeader>
      <BookOpen className="w-12 h-12 text-green-600 mx-auto mb-4" />
      <CardTitle>Study & Learn</CardTitle>
    </CardHeader>
    <CardContent>
      <p>Explore subjects, practice questions with explanations...</p>
      <Button onClick={() => navigate('/subjects')}>
        Browse Subjects
      </Button>
    </CardContent>
  </Card>

  {/* Mock Exam Card */}
  <Card>
    <CardHeader>
      <Calendar className="w-12 h-12 text-purple-600 mx-auto mb-4" />
      <CardTitle>Mock Exams</CardTitle>
    </CardHeader>
    <CardContent>
      <p>Timed exam simulations under real conditions...</p>
      <Button onClick={() => navigate('/mock-exams/select')}>
        Take Mock Exam
      </Button>
    </CardContent>
  </Card>
</div>
```

---

## Testing Checklist

After implementation:

1. **Navigation Test**
   - Click "Practice" in header → Goes to `/practice`
   - Visit `/quick-practice` → Redirects to `/practice`

2. **Practice Page Test**
   - Shows only 2 cards: Study and Mock Exams
   - No timer, no "Start Test" buttons
   - "Browse Subjects" goes to `/subjects`
   - "Take Mock Exam" goes to `/mock-exams/select`

3. **Exam Page Test**
   - No Study/Exam toggle in header
   - No Focus Mode toggle
   - Timer runs automatically
   - Submit button works

4. **User Clarity Test**
   - Practice page = clearly for learning
   - Exam page = clearly for assessment
   - No mixed UI elements

---

## UI Result Summary

**Practice Mode (Learning)**
- No timer
- No submit button
- Hints and explanations available
- Free exploration
- Located at: `/practice`, `/subjects`, `/subject-learning`

**Exam Mode (Assessment)**
- Timer active and enforced
- Submit button visible
- No hints or explanations
- No study toggle
- Located at: `/mock-exams/unified`
