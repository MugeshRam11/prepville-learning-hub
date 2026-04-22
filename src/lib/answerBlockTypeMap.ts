// Single source of truth for mapping interactive/legacy type strings
// to the canonical AnswerBlockType used by all renderers.
// Use this everywhere instead of redeclaring local typeMap objects.

import type { AnswerBlockType } from '@/types/answerBlock';

export const INTERACTIVE_TO_ANSWER_BLOCK_TYPE: Record<string, AnswerBlockType> = {
  // Graph
  graph_interaction: 'graph_plot',
  graph_plot: 'graph_plot',
  graph: 'graph_plot',

  // Drag & drop
  drag_drop_match: 'drag_drop',
  drag_drop: 'drag_drop',

  // Image drop zone
  image_drop_zone: 'image_drop',
  image_drop: 'image_drop',
  image_zone: 'image_drop',

  // Arrange / order
  step_builder: 'arrange_order',
  arrange_order: 'arrange_order',

  // Smart math
  math_input: 'smart_math',
  smart_math: 'smart_math',

  // Text / equation
  text_input: 'text_equation',
  text_equation: 'text_equation',
  text: 'text_equation',

  // MCQ
  multiple_choice: 'multiple_choice',
  mcq: 'multiple_choice',

  // Table
  table_input: 'table_input',
  table: 'table_input',

  // Image fill-in-the-blanks
  image_fill_blanks: 'image_fill_blanks',

  // Venn diagram
  venn_drag: 'venn_drag',
  venn: 'venn_drag',
  venn_diagram: 'venn_drag',
};

/**
 * Map any incoming type string (DB column, AI parser output, legacy alias)
 * to the canonical AnswerBlockType. Returns `undefined` when the input is
 * empty so callers can fall back to their own default.
 */
export function mapToAnswerBlockType(
  interactiveType?: string | null,
): AnswerBlockType | undefined {
  if (!interactiveType) return undefined;
  return INTERACTIVE_TO_ANSWER_BLOCK_TYPE[interactiveType] ?? 'text_equation';
}
