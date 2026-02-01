
# Implementation Plan: Enhanced Admin Workflow and Practice Question Bank

## Overview

This plan implements 6 features to improve the admin workflow, separate learning from assessment contexts, and convert `/practice` into a LeetCode-style question bank.

---

## Current State Analysis

| Component | Current Implementation |
|-----------|----------------------|
| **Post-Parsing Workflow** | `QuestionPreviewEditor.tsx` shows questions after parsing but lacks mandatory question type confirmation before publishing |
| **AI Tutor/Chatbot** | Available in `EnhancedAITutor.tsx`, `AITutorChat.tsx` - currently no route-based restrictions |
| **Practice Page** | Shows test cards (`PracticeTestCard.tsx`) that redirect to `PracticeExam.tsx` |
| **Interactive Mode** | Toggle exists in `UnifiedMockExam.tsx`, `PracticeExam.tsx`, `Quiz.tsx` |
| **Question Tables** | `mock_questions`, `mock_sub_questions` (mock tests), `questions` (quick tests/practice-QA) |

---

## FEATURE A: Post-Parsing Preview and Question Type Decision

### Objective
Introduce a mandatory Preview and Type Confirmation step before publishing questions.

### Changes Required

#### 1. Enhance `QuestionPreviewEditor.tsx`

Add new UI elements:
- **Student Preview Tab**: Render questions exactly as students would see them
- **Question Type Confirmation**: For each question, show AI-detected type with Accept/Override buttons
- **Block Publish**: Disable "Confirm" button until all question types are explicitly confirmed

**New State:**
```typescript
const [questionTypeConfirmed, setQuestionTypeConfirmed] = useState<Set<number>>(new Set());
const [selectedTypes, setSelectedTypes] = useState<Map<number, string>>(new Map());
```

**UI Flow:**
1. After parsing, questions appear in Preview tab
2. Each question shows:
   - AI-detected `interactive_type` badge
   - "Accept" button (confirms AI detection)
   - "Change Type" dropdown (manual override)
3. "Confirm & Publish" button stays disabled until all questions have confirmed types
4. On confirm, types are saved to `answer_block_type` column

#### 2. New Component: `StudentPreviewPane.tsx`

Create read-only preview component that:
- Uses `UnifiedQuestionCard` in read-only mode
- Renders all interaction types (graph, drag-drop, math input, etc.)
- Shows no input fields - purely visual preview
- Disabled submit/scoring

#### 3. Modify Publish Flow

In `QuestionPreviewEditor.tsx`:
- Add validation: `if (questionTypeConfirmed.size < questions.length) return;`
- Before calling `onConfirm()`, ensure all selected types are attached to question data

### Files to Create
| File | Purpose |
|------|---------|
| `src/components/admin/StudentPreviewPane.tsx` | Read-only student UI preview |
| `src/components/admin/QuestionTypeConfirmation.tsx` | Accept/Override question type UI |

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/admin/QuestionPreviewEditor.tsx` | Add tabs for Preview + Type Confirmation, block publish until confirmed |

---

## FEATURE B: Chatbot/AI Tutor Scope Fix

### Objective
Enable chatbot only in learning contexts, completely disable in mock exams.

### Route-Based Availability Rules

| Route Pattern | Chatbot Enabled |
|---------------|-----------------|
| `/practice/*` | Yes |
| `/subjects` | Yes |
| `/subject-learning` | Yes |
| `/quiz/*` | Yes |
| `/mock-exams/*` | No |
| `/mock-exams/unified/*` | No |

### Implementation Approach

#### 1. Create Chatbot Context Provider

**New File:** `src/contexts/ChatbotContext.tsx`

```typescript
interface ChatbotContextType {
  isEnabled: boolean;
  disable: () => void;
  enable: () => void;
}

const DISABLED_ROUTES = [
  '/mock-exams/start',
  '/mock-exams/unified',
  '/mock-exams/interactive',
  '/mock-exams/summary'
];
```

#### 2. Modify AI Tutor Components

In `EnhancedAITutor.tsx` and `AITutorChat.tsx`:
- Wrap with `useChatbot()` hook
- Return `null` if `!isEnabled`
- Remove floating button entirely in disabled state

#### 3. Remove from Mock Exam Pages

In `UnifiedMockExam.tsx`:
- Remove any AI tutor imports/usage
- Ensure no "Ask Tutor" button appears

### Files to Create
| File | Purpose |
|------|---------|
| `src/contexts/ChatbotContext.tsx` | Route-aware chatbot availability context |

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/EnhancedAITutor.tsx` | Add route check, return null if disabled |
| `src/components/AITutorChat.tsx` | Add route check, return null if disabled |
| `src/App.tsx` | Wrap app with `ChatbotProvider` |

---

## FEATURE C: Practice Mode - Ask Tutor Only

### Objective
Ensure "Ask Tutor" exists only in Practice mode and is completely removed from Mock Exam UI.

### Implementation

This is largely covered by Feature B. Additional steps:

#### 1. Add "Ask Tutor" Button to Practice Pages

In `PracticeExam.tsx`:
- Add floating "Ask Tutor" button (using `EnhancedAITutor`)
- Pass current question context to tutor

#### 2. Verify Mock Exam Has No Tutor

Audit `UnifiedMockExam.tsx`:
- Confirm no AI tutor imports
- Confirm no "Ask Tutor" button
- Confirm no keyboard shortcut triggers tutor

### Files to Modify
| File | Changes |
|------|---------|
| `src/pages/PracticeExam.tsx` | Add Ask Tutor button integration |
| `src/pages/UnifiedMockExam.tsx` | Remove any tutor references (if present) |

---

## FEATURE D: Practice as LeetCode-Style Question Bank

### Objective
Transform `/practice` from a test-card grid to a flat, filterable question list.

### New Practice Page Layout

```text
+----------------------------------------------------------+
|  Practice & Learn                                 [Filters]|
+----------------------------------------------------------+
|  Search: [_______________________]                        |
|                                                           |
|  Filters: [Topic ▼] [Difficulty ▼] [Type ▼] [Status ▼]   |
+----------------------------------------------------------+
|  # | Title                 | Topic    | Diff | Type | ✓  |
+----------------------------------------------------------+
|  1 | Solve quadratic...    | Algebra  | Med  | Math | ✓  |
|  2 | Probability of...     | Prob     | Easy | MCQ  | •  |
|  3 | Plot the function...  | Graphs   | Hard | Graph| ○  |
|  4 | Match expressions...  | Algebra  | Med  | D&D  | ○  |
+----------------------------------------------------------+
```

**Status Legend:**
- ✓ = Solved (green checkmark)
- • = Attempted (yellow dot)
- ○ = Unsolved (empty circle)

### Database Requirements

Query `questions` table (Practice-QA questions) with:
- Join to `user_answers` to determine solved/attempted status
- Filter by `test_type = 'quick_test'` OR standalone practice questions

### Implementation

#### 1. Rewrite `src/pages/Practice.tsx`

Replace test card grid with:
- Question list table
- Filter bar component
- Search input
- Status tracking per user

#### 2. Create Supporting Components

| Component | Purpose |
|-----------|---------|
| `PracticeQuestionRow.tsx` | Single row in question list |
| `PracticeFilters.tsx` | Filter dropdowns (Topic, Difficulty, Type, Status) |
| `PracticeStatusBadge.tsx` | Solved/Attempted/Unsolved indicator |

#### 3. Question Open Flow

When user clicks a question:
1. Navigate to `/practice/question/:questionId`
2. Load question in interactive practice UI
3. Enable Ask Tutor
4. No timer
5. Submit shows results immediately
6. Allow unlimited retries

#### 4. Create Question Detail Page

**New Route:** `/practice/question/:questionId`
**New Page:** `PracticeQuestionView.tsx`

Uses same `UnifiedQuestionCard` but:
- No timer
- Submit reveals answer + explanation
- "Try Again" resets answer
- "Ask Tutor" enabled

### Data Flow

```text
/practice (Question List)
    │
    ▼ Click question
/practice/question/:id (Interactive Practice UI)
    │
    ▼ Submit
Show Results + Explanation (inline, not new page)
    │
    ▼ Try Again or Back to List
```

### Files to Create
| File | Purpose |
|------|---------|
| `src/pages/Practice.tsx` (rewrite) | LeetCode-style question list |
| `src/pages/PracticeQuestionView.tsx` | Single question practice view |
| `src/components/practice/PracticeQuestionRow.tsx` | Table row component |
| `src/components/practice/PracticeFilters.tsx` | Filter bar |
| `src/components/practice/PracticeStatusBadge.tsx` | Status indicator |

### Files to Modify
| File | Changes |
|------|---------|
| `src/App.tsx` | Add route `/practice/question/:id` |

---

## FEATURE E: Interactive Mode Always On

### Objective
Remove Interactive Mode toggle completely - interactive behavior is default and permanent.

### Implementation

#### 1. Remove Toggle from All Pages

In each file:
- Delete `interactiveMode` state
- Delete Switch component for toggle
- Set `interactiveMode={true}` as constant or remove prop entirely

#### 2. Files to Modify

| File | Changes |
|------|---------|
| `src/pages/UnifiedMockExam.tsx` | Remove interactiveMode toggle, hardcode `true` |
| `src/pages/PracticeExam.tsx` | Remove interactiveMode toggle, hardcode `true` |
| `src/pages/Quiz.tsx` | Remove interactiveMode toggle, hardcode `true` |
| `src/components/unified-exam/UnifiedQuestionCard.tsx` | Remove `interactiveMode` prop or default to `true` |

#### 3. Result

- All question types (Graph, Drag-Drop, Math Input, etc.) always enabled
- Consistent UX across Preview, Practice, and Exam modes
- No user decision required

---

## System Constraints Verification

| Constraint | Status |
|------------|--------|
| No OCR changes | Compliant |
| No AI model changes | Compliant |
| No exam engine rewrite | Compliant - UI changes only |
| No routing overhaul | Compliant - additive routes only |
| No scoring logic change | Compliant |
| Backward compatible | Compliant |

---

## Implementation Order

### Phase 1: Interactive Mode Always On (Feature E)
- Quick win, removes UI complexity
- 4 files to modify

### Phase 2: Chatbot Scope Fix (Features B + C)
- Create ChatbotContext
- Modify AI Tutor components
- Add Ask Tutor to Practice

### Phase 3: Post-Parsing Preview (Feature A)
- Enhance QuestionPreviewEditor
- Create StudentPreviewPane
- Add mandatory type confirmation

### Phase 4: LeetCode-Style Practice (Feature D)
- Rewrite Practice page
- Create PracticeQuestionView
- Add new route

---

## Summary of New Files (8)

| File | Purpose |
|------|---------|
| `src/contexts/ChatbotContext.tsx` | Route-aware chatbot availability |
| `src/components/admin/StudentPreviewPane.tsx` | Read-only student UI preview |
| `src/components/admin/QuestionTypeConfirmation.tsx` | Type accept/override UI |
| `src/pages/PracticeQuestionView.tsx` | Single question practice view |
| `src/components/practice/PracticeQuestionRow.tsx` | Question list row |
| `src/components/practice/PracticeFilters.tsx` | Filter dropdowns |
| `src/components/practice/PracticeStatusBadge.tsx` | Status indicator |
| `src/hooks/usePracticeQuestionStatus.tsx` | Hook for solved/attempted tracking |

## Summary of Modified Files (10)

| File | Changes |
|------|---------|
| `src/App.tsx` | Add ChatbotProvider, new route |
| `src/pages/Practice.tsx` | Rewrite to question list |
| `src/pages/UnifiedMockExam.tsx` | Remove interactive toggle |
| `src/pages/PracticeExam.tsx` | Remove toggle, add Ask Tutor |
| `src/pages/Quiz.tsx` | Remove interactive toggle |
| `src/components/admin/QuestionPreviewEditor.tsx` | Add preview tab, type confirmation |
| `src/components/EnhancedAITutor.tsx` | Add route-based visibility |
| `src/components/AITutorChat.tsx` | Add route-based visibility |
| `src/components/unified-exam/UnifiedQuestionCard.tsx` | Default interactiveMode to true |
| `src/components/practice/PracticeTestCard.tsx` | May be deprecated or kept for reference |
