# Answer Types — Architecture

> Updated 2026-06-12. All answer-type components now live in `src/components/answer-types/`, one folder per type.

## Overview

The exam system supports **10 answer block types**, defined in `src/types/answerBlock.ts` (`AnswerBlockType`). Each type follows a three-role pattern:

| Role | Purpose | Used by |
|---|---|---|
| **Editor** | Admin configures the question (correct answers, options, zones) | Mock-test creator, exam builder |
| **Player** | Student answers the question during an exam | `AnswerBlock`, `InteractiveAnswerBlock` |
| **Review** | Rendering of the student's answer for evaluation/feedback | `EvaluationAnswerRenderer` |

Most types don't need a dedicated Review component — `EvaluationAnswerRenderer.tsx` renders their answers directly, lazy-loading per-type Review components only where they exist (image-fill-blanks, venn-diagram).

## Folder structure

```
src/components/answer-types/
├── arrange-order/            # 'arrange_order' — Arrange / Order items
│   ├── ArrangeOrderEditor.tsx
│   ├── StepBuilder.tsx           (player)
│   └── SortableStepItem.tsx      (internal: sortable row used by StepBuilder)
├── drag-drop/                # 'drag_drop' — Drag & Drop matching
│   ├── DragDropMatchingEditor.tsx
│   ├── DragDropMatcher.tsx       (player)
│   └── PuzzleDragDrop.tsx        (alt player, used by InteractiveAnswerBlock)
├── graph-plot/               # 'graph_plot' — Graph plotting
│   ├── GraphPlotConfigEditor.tsx
│   ├── GraphEditor.tsx           (exam-builder variant editor)
│   ├── GraphPlotPlayer.tsx       (player)
│   └── InteractiveGraphCanvas.tsx (canvas engine, also used by mock-exam questions)
├── image-drop/               # 'image_drop' — Drag labels onto an image
│   ├── ImageDropZoneEditor.tsx
│   ├── ImageDropZone.tsx         (player)
│   └── DraggableElementContent.tsx (shared label renderer, also used in review)
├── image-fill-blanks/        # 'image_fill_blanks' — Typed input zones on an image
│   ├── ImageFillBlanksEditor.tsx
│   ├── ImageFillBlanksPlayer.tsx
│   └── ImageFillBlanksReview.tsx
├── multiple-choice/          # 'multiple_choice' — MCQ
│   ├── MultipleChoiceConfigEditor.tsx
│   └── MultipleChoiceEditor.tsx  (exam-builder variant editor; player is inline)
├── smart-math/               # 'smart_math' — Step-based math input
│   ├── SmartMathEditor.tsx
│   ├── SmartMathInput.tsx        (input widget)
│   └── SmartMathPlayer.tsx       (player)
├── table-input/              # 'table_input' — Table completion
│   ├── TableEditor.tsx           (exam-builder editor; player is inline)
│   └── TableAnswerValidator.tsx  (answer validation + review grid)
└── venn-diagram/             # 'venn_drag' — Drag labels into Venn regions
    ├── VennDiagram.tsx           (base SVG diagram, shared by all three)
    ├── VennDiagramEditor.tsx
    ├── VennDiagramPlayer.tsx
    └── VennDiagramReview.tsx
```

## Type → component matrix

| `AnswerBlockType` | Editor | Player | Review |
|---|---|---|---|
| `text_equation` | — (configured inline) | inline in `AnswerBlock` (`RichTextEditor` / textarea) | inline in `EvaluationAnswerRenderer` |
| `graph_plot` | `graph-plot/GraphPlotConfigEditor` | `graph-plot/GraphPlotPlayer` (+ `InteractiveGraphCanvas`) | `GraphPlotPlayer` in read-only mode |
| `drag_drop` | `drag-drop/DragDropMatchingEditor` | `drag-drop/DragDropMatcher` (or `PuzzleDragDrop`) | inline |
| `image_drop` | `image-drop/ImageDropZoneEditor` | `image-drop/ImageDropZone` | inline (uses `DraggableElementContent`) |
| `arrange_order` | `arrange-order/ArrangeOrderEditor` | `arrange-order/StepBuilder` | inline |
| `smart_math` | `smart-math/SmartMathEditor` | `smart-math/SmartMathPlayer` / `SmartMathInput` | inline |
| `multiple_choice` | `multiple-choice/MultipleChoiceConfigEditor` | inline in `AnswerBlock` | inline |
| `table_input` | `table-input/TableEditor` | inline in `InteractiveAnswerBlock` | `table-input/TableAnswerValidator` |
| `image_fill_blanks` | `image-fill-blanks/ImageFillBlanksEditor` | `image-fill-blanks/ImageFillBlanksPlayer` | `image-fill-blanks/ImageFillBlanksReview` |
| `venn_drag` | `venn-diagram/VennDiagramEditor` | `venn-diagram/VennDiagramPlayer` | `venn-diagram/VennDiagramReview` |

Each Editor also exports its `createDefault<Type>Config()` factory (e.g. `createDefaultVennConfig`).

## Consumers (where answer types are wired up)

| Consumer | Role |
|---|---|
| `src/types/answerBlock.ts` | Source of truth: `AnswerBlockType` union, config interfaces, labels, icons |
| `src/components/unified-exam/AnswerBlock.tsx` | Main student-facing switch — renders the Player for each type |
| `src/components/unified-exam/InteractiveAnswerBlock.tsx` | Interactive/validated variant of the same switch |
| `src/components/admin/mock-test-creator/QuestionGroupCard.tsx` | Admin question editor — renders the Editor for each type |
| `src/components/admin/mock-test-creator/SubQuestionCard.tsx` | Same, for sub-questions (a, b, c…) |
| `src/components/admin/AnswerBlockTypeSelector.tsx` | Dropdown for picking a type in the creator |
| `src/components/admin/EvaluationAnswerRenderer.tsx` | Review hub — renders submitted answers per type |
| `src/components/mock-exam/InteractiveExamQuestion.tsx`, `MockExamQuestion.tsx` | Legacy mock-exam rendering paths |
| `src/components/exam-builder/components/index.ts` | Re-exports `GraphEditor`, `MultipleChoiceEditor`, `TableEditor` from their new homes |
| `src/pages/InteractiveMockDemo.tsx` | Demo page exercising the players |

## Shared infrastructure (intentionally NOT in answer-types/)

These are used by answer types but are general-purpose, so they stay where they are:

- `admin/RichTextEditor.tsx` — rich text input (used for `text_equation` and question authoring everywhere)
- `mock-exam/MathEditor.tsx`, `MathKeyboard.tsx`, `MathLiveKeyboard.tsx`, `MatrixBuilder.tsx` — math input stack
- `equation-editor/` — standalone equation editing feature
- `admin/AnswerBlockTypeSelector.tsx` — type picker (about all types, not one)
- `admin/EvaluationAnswerRenderer.tsx` — cross-type review hub

## Conventions for adding a new answer type

1. Add the type to `AnswerBlockType` + config interface + label + icon in `src/types/answerBlock.ts`.
2. Create `src/components/answer-types/<kebab-name>/` with `<Name>Editor.tsx` (exporting `createDefault<Name>Config`), `<Name>Player.tsx`, and `<Name>Review.tsx` if review needs custom rendering.
3. Wire the Editor into `QuestionGroupCard.tsx` and `SubQuestionCard.tsx`.
4. Wire the Player into `AnswerBlock.tsx` and `InteractiveAnswerBlock.tsx`.
5. Wire review into `EvaluationAnswerRenderer.tsx`.
6. Add the type to `AnswerBlockTypeSelector.tsx`.

## Notes from the 2026-06-12 reorganization

- 20 scattered components were moved from `mock-exam/`, `admin/`, `exam-builder/components/`, `unified-exam/`, and `image-drop/` into per-type folders; the 7 existing `answer-types/` files were foldered too.
- All imports were updated; `tsc --noEmit` passes with 0 errors.
- `src/components/image-drop/` is now empty and can be deleted.
- `exam-builder/components/index.ts` still re-exports the three builder editors, so exam-builder code is unchanged.
