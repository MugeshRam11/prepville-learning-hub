

# Bug Fix Plan: MockExamSummary Data Format Mismatch

## Problem Identified

The `MockExamSummary` page crashes after exam submission with:
```
TypeError: Cannot read properties of undefined (reading 'slice')
```

**Root Cause**: The Unified Mock Exam uses `UnifiedQuestion` type with `questionText` property, but the Summary page expects `text` property.

| Source | Property Used |
|--------|---------------|
| UnifiedMockExam.tsx | `question.questionText` |
| MockExamSummary.tsx | `question.text` |

Additionally, the answers format differs:
- UnifiedMockExam passes `UnifiedAnswer[]` with `content` property
- MockExamSummary expects `Answer[]` with `content` AND checks for `wordCount`

---

## Solution Overview

Update `MockExamSummary.tsx` to handle both data formats - the legacy format from `MockExamStart.tsx` and the new unified format from `UnifiedMockExam.tsx`.

---

## Implementation Details

### Phase 1: Add Type Detection and Data Normalization

Add a normalization function at the top of the component to detect which format was received and convert to a common structure:

```typescript
// Detect if this is unified exam format
const isUnifiedFormat = location.state?.isUnified === true;

// Normalize question text access
const getQuestionText = (question: any) => {
  return question.questionText || question.text || '';
};

// Normalize sub-question text access  
const getSubQuestionText = (subQuestion: any) => {
  return subQuestion.text || '';
};
```

### Phase 2: Fix All Text Access Points

Update all locations where `.text` is accessed to use the safe accessor:

**Line 318** (Overview tab - main question text):
```typescript
// Before
<h4>Q{index + 1}: {question.text.slice(0, 60)}...</h4>

// After
<h4>Q{index + 1}: {getQuestionText(question).slice(0, 60)}...</h4>
```

**Line 327** (Overview tab - sub-question text):
```typescript
// Before
<span>{subQ.text.slice(0, 40)}...</span>

// After
<span>{getSubQuestionText(subQ).slice(0, 40)}...</span>
```

### Phase 3: Handle Answer Format Differences

The unified format passes answers as `UnifiedAnswer[]` with `content` that may be string or object:

```typescript
// Normalize answer content
const getAnswerContent = (answer: any) => {
  if (typeof answer.content === 'string') return answer.content;
  if (typeof answer.content === 'object') return JSON.stringify(answer.content);
  return '';
};

// Normalize word count
const getWordCount = (answer: any) => {
  const content = getAnswerContent(answer);
  return answer.wordCount || content.split(/\s+/).filter(Boolean).length;
};
```

### Phase 4: Fix Detailed Answers Tab

Update the detailed answers section to handle unified format:

```typescript
// Line 368-391: Fix detailed answers rendering
{answersArray.map((answer: any, index: number) => {
  const question = questions.find((q: any) => 
    q.id === answer.questionId
  );
  const subQuestion = answer.subQuestionId 
    ? question?.subQuestions?.find((sq: any) => sq.id === answer.subQuestionId) 
    : null;
  
  return (
    <div key={index}>
      <h4>{getQuestionText(question)}</h4>
      {subQuestion && <span>{getSubQuestionText(subQuestion)}</span>}
      <Badge>{getWordCount(answer)} words</Badge>
      <p>{getAnswerContent(answer)}</p>
    </div>
  );
})}
```

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `src/pages/MockExamSummary.tsx` | Major | Add format detection, safe accessors, handle unified format |

---

## Technical Notes

### Backward Compatibility
- The fix maintains compatibility with the existing `MockExamStart.tsx` flow
- Uses fallback pattern: `question.questionText || question.text`
- Works for both array and object answer formats

### Type Safety
- Add defensive checks for undefined values
- Use optional chaining throughout
- Provide empty string defaults

### Testing Checklist After Implementation
1. Submit exam from UnifiedMockExam - verify summary loads
2. Submit exam from MockExamStart - verify still works
3. Verify AI evaluation results display correctly
4. Verify marks are calculated and displayed
5. Verify detailed answers tab shows correct content
6. Check for any console errors

---

## Additional Considerations

### Database Persistence (Not Fixed in This Plan)
The audit revealed that exam results are NOT being saved to the database. The `test_attempts` and `user_answers` tables have 0 records. This should be addressed in a follow-up implementation.

### Score Persistence Flow
```text
Current: Submit → AI Evaluate → Display → Navigate Away → LOST
Needed:  Submit → AI Evaluate → Save to DB → Display → Persisted
```

