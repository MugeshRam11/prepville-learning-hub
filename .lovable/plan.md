

# Replace EquationEditor with EquationTextEditor for Answer Key inputs

## Problem
The admin create/edit pages use the old `EquationEditor` (Unicode toolbar + textarea with separate preview) for answer key fields. The user wants the same inline math editor (`EquationTextEditor`) used in the student-facing `InteractiveAnswerBlock` — where KaTeX renders directly inside the input area.

## Approach
Replace all `EquationEditor` usages for answer keys with `EquationTextEditor`. This requires managing an `equations` array alongside the `answerKey` string, since `EquationTextEditor` uses `[[EQ:id]]` placeholders with a separate equations list.

## Files to modify

### 1. `src/components/admin/mock-test-creator/types.ts`
- Add `answerKeyEquations?: EquationData[]` to `CreatorSubQuestion` and `CreatorQuestionGroup` types

### 2. `src/components/admin/mock-test-creator/SubQuestionCard.tsx`
- Replace `EquationEditor` import with `EquationTextEditor` + `EquationData` from `@/components/equation-editor`
- Remove `EquationEditor` import
- Update the answer key fallback block to use `EquationTextEditor` with `value`, `equations`, `onValueChange`, `onEquationsChange` props
- Pass `subQuestion.answerKeyEquations` for equations state

### 3. `src/components/admin/mock-test-creator/QuestionGroupCard.tsx`
- Same swap: replace `EquationEditor` with `EquationTextEditor` for the answer key section
- Wire `group.answerKeyEquations` through the component

### 4. `src/components/admin/QuestionBuilder.tsx`
- Replace all 3 `EquationEditor` usages (new question answer key, existing question answer key, sub-question answer key) with `EquationTextEditor`
- Add equations state management for each context

### 5. `src/pages/AdminMockTestEdit.tsx`
- Ensure `answerKeyEquations` is preserved during load/save cycles

## Technical details
- `EquationTextEditor` requires: `value: string`, `equations: EquationData[]`, `onValueChange`, `onEquationsChange`
- The equations array stores `{id, latex, display}` objects; the value string contains `[[EQ:id]]` placeholders
- For DB storage, equations can be serialized into the existing `answer_key` field as JSON or kept alongside in `answer_block_config`
- The `EquationEditor` component (old Unicode toolbar) will no longer be used for answer keys but may remain for other uses (AI Tutor, etc.)

