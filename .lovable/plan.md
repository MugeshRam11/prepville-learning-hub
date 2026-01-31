

# Plan: Practice Mode = Unified Exam UI with Submit for Re-Test

## Problem Summary

The current `/practice` page shows a simple two-card selector (Study & Learn / Mock Exams). The requirement is to transform it into a full interactive exam-like interface that:

1. **Replicates the Unified Exam UI** (`/mock-exams/unified`) layout exactly
2. **Removes the timer** - no time pressure for practice
3. **Keeps the Submit button** - but for review/retry purposes, not final evaluation
4. **Shows answers and explanations after submit** - learning-focused
5. **Enables re-test/retry** - unlimited attempts

---

## Visual Reference

Based on the uploaded screenshot (image-224.png), the Practice UI should include:

```text
+---------------------------------------------------------------+
|  [←]  Mathematics         Progress  0/48        [Submit]      |
|       Mathematics • 122 marks                                 |
+---------------------------------------------------------------+
| [Switch] Interactive Mode  Graphs, Drag & Drop enabled        |
+---------------------------------------------------------------+
|                           |                                   |
| Question Navigator  0/48  |  [Question Content Area]          |
|                           |                                   |
| 0% complete               |  The probability a visitor...     |
|                           |                                   |
| 1 Q1 - 12m • 4 parts      |  [Tree Diagram Image]             |
|   (a) 3m  <active>        |                                   |
|   (b) 2m                  |  [Interactive Answer Widgets]     |
|   (c) 4m                  |                                   |
|   (d) 3m                  |                                   |
|                           |                                   |
| Legend:                   |                                   |
| ✓ Answered  ○ Not attempted |                                 |
| ⚑ Flagged   ◻ Current     |                                   |
+---------------------------------------------------------------+
```

**Key Differences from Exam Mode:**
- NO countdown timer (shows "Practice Mode" label instead)
- Submit = "Submit to Review" (not final exam submission)
- After submit: show correct answers, explanations, enable "Re-Test" button

---

## Architecture Approach

### Option A: Create New Practice Exam Page (Recommended)

Create a new `PracticeExam.tsx` page that reuses the Unified Exam components but with practice-specific behavior.

**Why this approach:**
- Keeps exam and practice code separate
- Easier to maintain different behaviors
- No risk of breaking exam functionality

### Components to Reuse

| Component | Reuse As-Is? | Modifications Needed |
|-----------|--------------|---------------------|
| `QuestionNavigator` | Yes | None - works for both |
| `UnifiedQuestionCard` | Yes | None - works for both |
| `InteractiveAnswerBlock` | Yes | None - works for both |

### New Components Needed

| Component | Purpose |
|-----------|---------|
| `PracticeExamHeader` | Similar to UnifiedExamHeader but without timer |
| `PracticeResultsModal` | Shows answers + explanations after submit |

---

## Phase 1: Create Practice Exam Header Component

**File**: `src/components/practice-exam/PracticeExamHeader.tsx`

A simplified version of `UnifiedExamHeader` specifically for practice mode:

**Features:**
- Back button to `/practice`
- Title + Subject badge
- Progress indicator (X/Y questions)
- "Practice Mode" label (green badge)
- Submit button (green styling, text: "Submit to Review")

**Removed:**
- Timer/countdown
- Time warnings
- Exam-style submit confirmation

**Submit Button Behavior:**
- Opens a results/review modal
- Does NOT navigate away immediately
- Shows "Re-Test" option after review

---

## Phase 2: Create Practice Results Modal

**File**: `src/components/practice-exam/PracticeResultsModal.tsx`

Modal shown after clicking "Submit to Review":

**Content:**
- Summary stats (X/Y answered, estimated score)
- Question-by-question review with:
  - Your answer
  - Correct answer (from `answer_key`)
  - Explanation (if available)
  - Correct/Incorrect indicator
- Action buttons:
  - "Review Questions" - close modal, continue viewing
  - "Re-Test" - reset all answers, start fresh
  - "Back to Practice" - return to `/practice` selector

---

## Phase 3: Create Practice Exam Page

**File**: `src/pages/PracticeExam.tsx`

This is the core practice page that mirrors `UnifiedMockExam.tsx` but with practice-specific logic.

**Structure (similar to UnifiedMockExam):**
```tsx
<div className="h-screen flex flex-col bg-background overflow-hidden">
  {/* Practice Header - no timer */}
  <PracticeExamHeader
    title={examData.title}
    subject={examData.subject}
    answeredCount={getAnsweredCount()}
    totalQuestions={getTotalQuestionSlots()}
    onSubmit={handleSubmitToReview}
  />

  {/* Interactive Mode Toggle Bar */}
  <div className="interactive-toggle-bar">
    <Switch /> Interactive Mode
  </div>

  {/* Main content */}
  <div className="flex-1 flex overflow-hidden">
    {/* Left Navigator */}
    <QuestionNavigator
      questions={examData.questions}
      answers={answers}
      ...
    />

    {/* Scrollable question area */}
    <div className="flex-1 overflow-y-auto">
      {examData.questions.map(question => (
        <UnifiedQuestionCard
          question={question}
          answers={answers}
          onAnswerChange={handleAnswerChange}
          interactiveMode={interactiveMode}
        />
      ))}
    </div>
  </div>

  {/* Results Modal */}
  <PracticeResultsModal
    isOpen={showResults}
    onClose={() => setShowResults(false)}
    questions={examData.questions}
    answers={answers}
    onReTest={handleReTest}
  />
</div>
```

**Key Differences from UnifiedMockExam:**
1. Uses `PracticeExamHeader` instead of `UnifiedExamHeader`
2. No timer state or countdown
3. Submit opens results modal instead of navigating
4. "Re-Test" button clears answers and restarts
5. No exam sync context needed
6. No focus mode needed

---

## Phase 4: Update Practice Page as Entry Point

**File**: `src/pages/Practice.tsx`

Replace the current two-card layout with options that lead to the new practice exam:

**New Structure:**

```text
+----------------------------------------------------+
|              Practice & Learn                       |
|  Choose a subject to practice questions interactively|
+----------------------------------------------------+
|                                                     |
|  [Subject Selection Grid - fetched from DB]         |
|                                                     |
|  +----------+  +----------+  +----------+           |
|  | Math     |  | Physics  |  | Chemistry|           |
|  | 120 Qs   |  | 80 Qs    |  | 95 Qs    |           |
|  | Start    |  | Start    |  | Start    |           |
|  +----------+  +----------+  +----------+           |
|                                                     |
+----------------------------------------------------+
|  OR navigate to Mock Exams for timed assessment     |
|  [Take Mock Exam] → /mock-exams/select              |
+----------------------------------------------------+
```

**Behavior:**
- Clicking a subject → navigates to `/practice/exam` with subject data in state
- OR we can reuse mock test selection and pass `mode: 'practice'`

---

## Phase 5: Add Route for Practice Exam

**File**: `src/App.tsx`

Add new route:
```tsx
<Route path="/practice/exam" element={
  <ProtectedRoute requiresSubscription>
    <PracticeExam />
  </ProtectedRoute>
} />
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/PracticeExam.tsx` | Main practice exam page |
| `src/components/practice-exam/PracticeExamHeader.tsx` | Header without timer |
| `src/components/practice-exam/PracticeResultsModal.tsx` | Results + review modal |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Practice.tsx` | Replace with subject selector that leads to PracticeExam |
| `src/App.tsx` | Add `/practice/exam` route |

---

## Files Unchanged

| File | Reason |
|------|--------|
| `src/pages/UnifiedMockExam.tsx` | Exam mode - keep separate |
| `src/components/unified-exam/QuestionNavigator.tsx` | Reused as-is |
| `src/components/unified-exam/UnifiedQuestionCard.tsx` | Reused as-is |
| `src/components/unified-exam/InteractiveAnswerBlock.tsx` | Reused as-is |

---

## Submit Flow Comparison

### Practice Mode Submit Flow
```text
Answer Questions
    ↓
Click "Submit to Review"
    ↓
[Results Modal Opens]
- See your answers vs correct answers
- See explanations
- See partial scores
    ↓
Choose:
├── "Review Questions" → Close modal, continue viewing with answers visible
├── "Re-Test" → Reset answers, start fresh
└── "Back to Practice" → Navigate to /practice
```

### Exam Mode Submit Flow (Unchanged)
```text
Answer Questions
    ↓
Click "Submit"
    ↓
[Confirmation Dialog]
    ↓
Navigate to /mock-exams/summary
    ↓
[AI Evaluation runs]
    ↓
Final score locked, no retry
```

---

## Language & Microcopy Rules

**Inside Practice Mode:**
- "Submit to Review" (not "Submit")
- "Practice Mode" badge (green)
- "Re-Test" or "Try Again" (not "Retry Exam")
- "Your Answer" / "Correct Answer" (not "Score")
- "Keep Learning" (not "End Session")

**Avoid:**
- "Exam"
- "Final"
- "Time's up"
- "Locked"
- Any pressure language

---

## Re-Test Logic

When user clicks "Re-Test":

```typescript
const handleReTest = () => {
  // Clear all answers
  setAnswers([]);
  
  // Close results modal
  setShowResults(false);
  
  // Scroll to top
  mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  
  // Reset active question to first
  setActiveQuestionId(examData.questions[0].id);
  
  // Toast confirmation
  toast.info('Ready for another attempt!');
};
```

---

## Testing Checklist

After implementation:

1. **Navigation Test**
   - Click "Practice" in header → Goes to `/practice`
   - Select a subject → Goes to `/practice/exam` with questions

2. **Practice UI Test**
   - No timer visible in header
   - "Practice Mode" badge visible
   - Question Navigator on left
   - Questions render with interactive widgets

3. **Submit Flow Test**
   - Click "Submit to Review" → Results modal opens
   - Modal shows correct answers and explanations
   - "Re-Test" clears answers and restarts
   - "Back to Practice" returns to subject selector

4. **Comparison Test**
   - Practice: no timer, submit = review, unlimited retries
   - Exam: has timer, submit = final, one attempt

---

## Technical Details Summary

### PracticeExamHeader.tsx Key Props
```typescript
interface PracticeExamHeaderProps {
  title: string;
  subject: string;
  totalMarks: number;
  answeredCount: number;
  totalQuestions: number;
  onSubmit: () => void;  // Opens results modal
}
```

### PracticeResultsModal.tsx Key Props
```typescript
interface PracticeResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: UnifiedQuestion[];
  answers: UnifiedAnswer[];
  onReTest: () => void;
  onBackToPractice: () => void;
}
```

### PracticeExam.tsx Key State
```typescript
const [examData, setExamData] = useState<UnifiedExamData | null>(null);
const [answers, setAnswers] = useState<UnifiedAnswer[]>([]);
const [showResults, setShowResults] = useState(false);
const [interactiveMode, setInteractiveMode] = useState(true);
const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
// NO timer state needed
```

