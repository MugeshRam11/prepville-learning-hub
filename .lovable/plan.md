

# PrepVille Learning Hub — Professional Upgrade Plan

## Executive Summary
This plan upgrades your existing exam system with Study/Exam mode toggle, enhanced math keyboard with matrix builder, real-time database auto-save, AI feedback in study mode, and mark scheme visibility. All changes follow your existing patterns and architecture.

---

## Phase 1: Study Mode vs Examination Mode System

### What We're Building
A mode toggle that fundamentally changes the exam experience:
- **Study Mode**: Hints, AI feedback, mark schemes visible, no timer pressure
- **Exam Mode**: Timer countdown, no feedback, auto-save, focus mode

### Frontend Changes

**File: `src/types/examMode.ts` (NEW)**
```text
- ExamMode type: 'study' | 'examination'
- ExamModeConfig interface with settings per mode
- Context provider for mode management
```

**File: `src/contexts/ExamModeContext.tsx` (NEW)**
```text
- React context for exam mode state
- Provider component wrapping exam pages
- Custom hook useExamMode()
- Toggles: showHints, showMarkScheme, showAIFeedback, timerEnabled, autoSaveEnabled
```

**File: `src/components/unified-exam/ExamModeToggle.tsx` (NEW)**
```text
- Toggle switch component with Study/Exam labels
- Icons: BookOpen for Study, Timer for Exam
- Animated transition between modes
- Confirmation dialog when switching mid-exam
```

**File: `src/components/unified-exam/UnifiedExamHeader.tsx` (MODIFY)**
```text
Lines ~45-55: Add ExamModeToggle component
Lines ~60-80: Conditionally show/hide timer based on mode
Add: AI Feedback button (visible in Study mode only)
Add: Mark Scheme button (visible in Study mode only)
```

### Technical Design
```text
┌─────────────────────────────────────────────────────────────┐
│                     EXAM MODE SYSTEM                        │
├─────────────────────────────────────────────────────────────┤
│  Study Mode                  │  Examination Mode            │
│  ─────────────              │  ──────────────              │
│  ✓ AI Feedback button       │  ✗ No feedback until submit │
│  ✓ Mark Scheme visible      │  ✗ Mark Scheme hidden       │
│  ✓ Hints available          │  ✗ Hints disabled           │
│  ✗ Timer optional           │  ✓ Timer enforced           │
│  ✓ Instant correctness      │  ✗ No correctness shown     │
│  ✗ No auto-save             │  ✓ Auto-save every 5 sec    │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 2: Enhanced Math Keyboard with Matrix Builder

### What We're Building
Extend the existing MathKeyboard with:
- Matrix input (2×2, 3×3, custom dimensions)
- Absolute value templates
- Enhanced symbol organization

### Frontend Changes

**File: `src/components/mock-exam/MathKeyboard.tsx` (MODIFY)**
```text
Lines ~70-130: Add new tab for "Matrix" category
Add: Matrix button templates (2×2, 3×3, n×m)
Add: MatrixBuilder modal component
Add: Absolute value, logarithm base, and integration bounds
```

**File: `src/components/mock-exam/MatrixBuilder.tsx` (NEW)**
```text
- Modal component for building matrices
- Row/column dimension inputs
- Grid of editable cells
- LaTeX output generation
- Preview with KaTeX rendering
```

### New Math Buttons to Add
```text
Matrix Tab:
- [2×2] → \begin{pmatrix} □ & □ \\ □ & □ \end{pmatrix}
- [3×3] → 3×3 matrix template
- [n×m] → Opens MatrixBuilder modal
- [det] → \det\begin{vmatrix} □ \end{vmatrix}

Enhanced Symbols:
- [|x|] → |□|
- [log_b] → \log_{□}(□)
- [lim] → \lim_{x \to □}
- [∫_a^b] → \int_{□}^{□}
```

---

## Phase 3: Real-Time Database Auto-Save

### What We're Building
Replace localStorage-only save with Supabase real-time persistence.

### Database Changes

**New Table: `user_answers` (if not exists)**
```sql
CREATE TABLE user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id UUID REFERENCES mock_tests(id) ON DELETE CASCADE,
  question_id UUID REFERENCES mock_questions(id) ON DELETE CASCADE,
  sub_question_id UUID REFERENCES mock_sub_questions(id),
  answer_content JSONB NOT NULL,
  answer_type TEXT,
  word_count INTEGER,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_final BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, test_id, question_id, sub_question_id)
);

-- Enable RLS
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own answers
CREATE POLICY "Users can manage own answers" ON user_answers
  FOR ALL USING (auth.uid() = user_id);
```

### Frontend Changes

**File: `src/hooks/useAutoSave.tsx` (NEW)**
```text
- Custom hook for auto-save functionality
- Debounced save (5 seconds after last change)
- Supabase upsert for answer persistence
- Offline queue with sync on reconnect
- Save indicator component
```

**File: `src/pages/UnifiedMockExam.tsx` (MODIFY)**
```text
Lines ~290-300: Replace localStorage with useAutoSave hook
Lines ~345-367: Update handleAnswerChange to trigger auto-save
Add: Session restoration from database on mount
Add: Visual save indicator in header
```

---

## Phase 4: AI Feedback System (Study Mode)

### What We're Building
Instant AI feedback without submitting the full exam.

### Backend Changes

**File: `supabase/functions/ai-feedback/index.ts` (NEW)**
```text
- New edge function for single-question feedback
- Uses same Lovable AI but for individual questions
- Returns: correctness, hints, partial feedback
- Rate limited: 1 request per 10 seconds per user
```

### Frontend Changes

**File: `src/components/unified-exam/AIFeedbackButton.tsx` (NEW)**
```text
- Button component with sparkle icon
- Only visible in Study Mode
- Calls ai-feedback edge function
- Shows loading state
- Displays feedback in a slide-over panel
```

**File: `src/components/unified-exam/AIFeedbackPanel.tsx` (NEW)**
```text
- Slide-over panel for AI feedback display
- Shows: correctness indicator, explanation, hints
- LaTeX rendering for math feedback
- "Try Again" button
```

### API Contract
```text
POST /functions/v1/ai-feedback
Body: {
  questionId: string,
  questionText: string,
  answerKey: string,
  studentAnswer: any,
  commandTerm: string
}
Response: {
  isOnTrack: boolean,
  feedback: string,
  hint: string,
  missingElements: string[]
}
```

---

## Phase 5: Mark Scheme / Solution Display

### What We're Building
Show the model answer and marking criteria in Study Mode.

### Frontend Changes

**File: `src/components/unified-exam/MarkSchemeButton.tsx` (NEW)**
```text
- Button visible only in Study Mode
- Opens MarkSchemeModal
- Disabled if user hasn't attempted the question
```

**File: `src/components/unified-exam/MarkSchemeModal.tsx` (NEW)**
```text
- Modal displaying:
  - Model answer (from answer_key column)
  - Marking criteria breakdown
  - Command term requirements
  - Common mistakes to avoid
- LaTeX rendering for mathematical content
```

**File: `src/components/unified-exam/UnifiedQuestionCard.tsx` (MODIFY)**
```text
Add: MarkSchemeButton in question footer
Add: Conditional rendering based on exam mode
```

---

## Phase 6: Enhanced Question Navigator (Left Panel)

### What We're Building
A comprehensive question navigator with extract selector and difficulty filtering.

### Frontend Changes

**File: `src/components/unified-exam/QuestionNavigator.tsx` (NEW)**
```text
- Left sidebar component replacing current sidebar
- Sections:
  1. Extract/Context selector (reading passages, diagrams)
  2. Question map with hierarchical numbering (1ai, 1aii, 1b)
  3. Difficulty filter (Easy/Medium/Hard)
  4. Status legend (Answered/Flagged/Not Attempted)
```

**File: `src/components/unified-exam/ExtractViewer.tsx` (NEW)**
```text
- Component for displaying reading passages
- Image viewer for diagrams
- Sticky positioning option
- Collapsible with resize handle
```

### Layout Changes
```text
┌─────────────────────────────────────────────────────────────────┐
│  HEADER: Timer | Mode Toggle | Submit                          │
├───────────┬─────────────────────────────────────┬───────────────┤
│  LEFT     │  CENTER: Question & Answer Area     │  RIGHT        │
│  PANEL    │                                     │  SIDEBAR      │
│           │  Q1: [Question Text]                │               │
│  Extracts │  [Interactive Component]            │  Navigator    │
│  Selector │  [Math Keyboard]                    │  Status       │
│           │                                     │  Progress     │
│  Questions│  [AI Feedback] [Mark Scheme]       │               │
│  1 → 1a   │                                     │               │
│     → 1ai │  [Previous] [Next]                  │               │
│     → 1aii│                                     │               │
│  2 → 2a   │                                     │               │
└───────────┴─────────────────────────────────────┴───────────────┘
```

---

## Phase 7: Focus Mode Implementation

### What We're Building
Distraction-free exam mode with hidden sidebars and enlarged workspace.

### Frontend Changes

**File: `src/components/unified-exam/FocusModeToggle.tsx` (NEW)**
```text
- Toggle button in header
- Expands/Fullscreen keyboard shortcut (F11 or Cmd+Shift+F)
- Dims background
- Hides sidebars with smooth animation
```

**File: `src/pages/UnifiedMockExam.tsx` (MODIFY)**
```text
Add: Focus mode state
Add: Conditional sidebar rendering
Add: CSS classes for focus mode styling
Add: Keyboard shortcut listener
```

---

## Phase 8: Sub-Question Numbering Enhancement

### Frontend Changes

**File: `src/components/unified-exam/SubQuestionLabel.tsx` (NEW)**
```text
- Component rendering hierarchical numbering
- Format: "1(a)(i)" or "1ai" configurable
- Visual indicator for current sub-question
- Badge styling consistent with existing UI
```

**File: `src/components/unified-exam/UnifiedQuestionCard.tsx` (MODIFY)**
```text
Lines ~80-120: Update sub-question rendering
Add: Roman numeral support (i, ii, iii, iv)
Add: Nested indentation for sub-sub-questions
```

### Numbering Format Examples
```text
Question 1
  ├── (a) First part [3 marks]
  │     ├── (i) Calculate...
  │     └── (ii) Explain...
  ├── (b) Second part [2 marks]
  └── (c) Third part [4 marks]
```

---

## Implementation Order (Priority)

| Phase | Feature | Effort | Impact |
|-------|---------|--------|--------|
| 1 | Study/Exam Mode Toggle | Medium | High |
| 2 | Matrix Builder | Low | Medium |
| 3 | Database Auto-Save | Medium | High |
| 4 | AI Feedback (Study) | Medium | High |
| 5 | Mark Scheme Display | Low | Medium |
| 6 | Question Navigator | Medium | Medium |
| 7 | Focus Mode | Low | Low |
| 8 | Sub-Question Numbering | Low | Low |

---

## Files to Create (Summary)

### New Files
1. `src/types/examMode.ts`
2. `src/contexts/ExamModeContext.tsx`
3. `src/components/unified-exam/ExamModeToggle.tsx`
4. `src/components/mock-exam/MatrixBuilder.tsx`
5. `src/hooks/useAutoSave.tsx`
6. `src/components/unified-exam/AIFeedbackButton.tsx`
7. `src/components/unified-exam/AIFeedbackPanel.tsx`
8. `src/components/unified-exam/MarkSchemeButton.tsx`
9. `src/components/unified-exam/MarkSchemeModal.tsx`
10. `src/components/unified-exam/QuestionNavigator.tsx`
11. `src/components/unified-exam/ExtractViewer.tsx`
12. `src/components/unified-exam/FocusModeToggle.tsx`
13. `src/components/unified-exam/SubQuestionLabel.tsx`
14. `supabase/functions/ai-feedback/index.ts`

### Files to Modify
1. `src/components/unified-exam/UnifiedExamHeader.tsx`
2. `src/components/mock-exam/MathKeyboard.tsx`
3. `src/pages/UnifiedMockExam.tsx`
4. `src/components/unified-exam/UnifiedQuestionCard.tsx`
5. `src/components/unified-exam/UnifiedExamSidebar.tsx`

### Database Migration
```sql
-- user_answers table for persistent answer storage
-- Enable RLS with user-based policies
```

---

## Technical Considerations

### State Management
- Use React Context for exam mode (lightweight, no external deps)
- Continue using React Query for server state
- LocalStorage as fallback for offline support

### Performance
- Debounce auto-save to prevent excessive API calls
- Lazy load MatrixBuilder modal
- Virtualize question navigator for large exams

### Security
- RLS policies ensure users only access their own answers
- Edge function rate limiting for AI feedback
- No answer keys exposed in Study Mode API responses (only through authenticated requests)

### Accessibility
- Keyboard navigation for all new components
- Screen reader support for mode announcements
- High contrast mode ready

