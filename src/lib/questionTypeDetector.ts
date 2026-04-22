// Auto Question-Type Detection System
// Maps question data to the correct interactive component

import type { InteractiveType } from '@/components/unified-exam/InteractiveAnswerBlock';

// Question type mapping from JSON type field to interactive type
export const QUESTION_TYPE_MAP: Record<string, InteractiveType> = {
  // Direct type mappings
  'mcq': 'multiple_choice',
  'multiple_choice': 'multiple_choice',
  'drag_drop': 'drag_drop',
  'graph': 'graph_plot',
  'graph_plot': 'graph_plot',
  'graph_interaction': 'graph_plot',
  'image_zone': 'image_drop',
  'image_drop': 'image_drop',
  'image_drop_zone': 'image_drop',
  'math_input': 'smart_math',
  'smart_math': 'smart_math',
  'step_builder': 'arrange_order',
  'arrange_order': 'arrange_order',
  'table': 'table_input',
  'table_input': 'table_input',
  'text': 'text_equation',
  'text_equation': 'text_equation',
  'text_input': 'text_equation',
  'image_fill_blanks': 'image_fill_blanks',
  'venn_drag': 'venn_drag',
  'venn': 'venn_drag',
  'venn_diagram': 'venn_drag',
  // Legacy mappings
  'drag_drop_match': 'drag_drop',
};

// IB-style command term patterns for additional detection
export const COMMAND_TERM_PATTERNS: { type: InteractiveType; terms: string[] }[] = [
  { type: 'graph_plot', terms: ['plot', 'draw', 'sketch', 'graph'] },
  { type: 'drag_drop', terms: ['match', 'pair', 'drag', 'connect'] },
  { type: 'smart_math', terms: ['calculate', 'solve', 'find', 'evaluate', 'determine', 'compute'] },
  { type: 'table_input', terms: ['complete the table', 'fill in the table'] },
  { type: 'arrange_order', terms: ['arrange', 'order', 'sequence', 'show your working'] },
  { type: 'multiple_choice', terms: ['select', 'choose', 'which of the following'] },
  { type: 'image_drop', terms: ['label the diagram', 'venn diagram'] },
];

// Content pattern detection for automatic type inference
export const CONTENT_PATTERNS: { type: InteractiveType; patterns: RegExp[] }[] = [
  {
    type: 'table_input',
    patterns: [
      /complete\s+(?:the\s+)?table/i,
      /fill\s+(?:in\s+)?(?:the\s+)?table/i,
      /copy\s+and\s+complete/i,
      /missing\s+values?\s+(?:in\s+)?(?:the\s+)?table/i,
      /frequency\s+table/i,
    ]
  },
  {
    type: 'graph_plot',
    patterns: [
      /plot\s+(?:the\s+)?point/i,
      /draw\s+(?:the\s+)?(?:graph|line|curve)/i,
      /sketch\s+(?:the\s+)?graph/i,
      /on\s+the\s+(?:coordinate|cartesian)\s+plane/i,
    ]
  },
  {
    type: 'drag_drop',
    patterns: [
      /match\s+(?:the\s+)?(?:following|pairs?|items?)/i,
      /drag\s+(?:and\s+)?drop/i,
      /pair\s+(?:the|each)/i,
    ]
  },
  {
    type: 'image_drop',
    patterns: [
      /venn\s+diagram/i,
      /tree\s+diagram/i,
      /label\s+(?:the\s+)?diagram/i,
    ]
  },
  {
    type: 'arrange_order',
    patterns: [
      /arrange\s+(?:the\s+)?(?:steps?|following)/i,
      /correct\s+order/i,
      /show\s+(?:your\s+)?working/i,
    ]
  },
  {
    type: 'multiple_choice',
    patterns: [
      /which\s+(?:of\s+)?(?:the\s+)?following/i,
      /\(a\).*\(b\).*\(c\)/i,
    ]
  },
  {
    type: 'smart_math',
    patterns: [
      /calculate/i,
      /find\s+(?:the\s+)?(?:value|exact|probability)/i,
      /solve\s+(?:for|the)/i,
    ]
  },
];

export interface QuestionData {
  type?: string;
  answer_block_type?: string;
  questionType?: string;
  question_text?: string;
  text?: string;
  command_term?: string;
  diagram_description?: string;
  answer_block_config?: any;
  interactionData?: any;
}

/**
 * Auto-detect the interactive type from question data
 * Priority:
 * 1. Explicit type field mapping
 * 2. answer_block_type field
 * 3. Config-based detection
 * 4. Content pattern matching
 * 5. Default to text_equation
 */
export function detectQuestionType(question: QuestionData): InteractiveType {
  // 1. Check explicit type field
  const typeField = question.type || question.questionType;
  if (typeField && QUESTION_TYPE_MAP[typeField]) {
    return QUESTION_TYPE_MAP[typeField];
  }

  // 2. Check answer_block_type
  if (question.answer_block_type && QUESTION_TYPE_MAP[question.answer_block_type]) {
    return QUESTION_TYPE_MAP[question.answer_block_type];
  }

  // 3. Check config-based detection
  const config = question.answer_block_config || question.interactionData;
  if (config) {
    if (config.tableConfig || config.rows) return 'table_input';
    if (config.graphConfig || config.equation) return 'graph_plot';
    if (config.dragDropConfig || config.items && config.targets) return 'drag_drop';
    if (config.draggableItems && config.dropTargets) return 'drag_drop';
    if (config.imageDropConfig || config.dropZones) return 'image_drop';
    if (config.arrangeConfig || config.steps) return 'arrange_order';
    if (config.smartMathConfig || config.expectedAnswer) return 'smart_math';
    if (config.mcqConfig || config.options) return 'multiple_choice';
  }

  // 4. Content pattern matching
  const textContent = [
    question.question_text || '',
    question.text || '',
    question.diagram_description || '',
    question.command_term || ''
  ].join(' ').toLowerCase();

  for (const { type, patterns } of CONTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(textContent)) {
        return type;
      }
    }
  }

  // 5. Default fallback
  return 'text_equation';
}

/**
 * Get a user-friendly label for an interactive type
 */
export function getInteractiveTypeLabel(type: InteractiveType): string {
  const labels: Record<InteractiveType, string> = {
    'text_equation': 'Text / Equation',
    'graph_plot': 'Graph Plotting',
    'drag_drop': 'Drag & Drop',
    'image_drop': 'Image Drop Zone',
    'arrange_order': 'Step Arrangement',
    'smart_math': 'Math Input',
    'multiple_choice': 'Multiple Choice',
    'table_input': 'Table Input',
    'image_fill_blanks': 'Image Fill Blanks',
    'venn_drag': 'Venn Diagram',
  };
  return labels[type] || type;
}

/**
 * Get icon name for an interactive type
 */
export function getInteractiveTypeIcon(type: InteractiveType): string {
  const icons: Record<InteractiveType, string> = {
    'text_equation': 'FileText',
    'graph_plot': 'PenTool',
    'drag_drop': 'GripHorizontal',
    'image_drop': 'MousePointer2',
    'arrange_order': 'ListOrdered',
    'smart_math': 'Hash',
    'multiple_choice': 'CheckSquare',
    'table_input': 'Table2',
    'image_fill_blanks': 'PenTool',
    'venn_drag': 'Target',
  };
  return icons[type] || 'FileText';
}

/**
 * Count interactive types in a list of questions
 */
export function countInteractiveTypes(questions: QuestionData[]): Record<InteractiveType, number> {
  const counts: Record<InteractiveType, number> = {
    'text_equation': 0,
    'graph_plot': 0,
    'drag_drop': 0,
    'image_drop': 0,
    'arrange_order': 0,
    'smart_math': 0,
    'multiple_choice': 0,
    'table_input': 0,
    'image_fill_blanks': 0,
    'venn_drag': 0,
  };

  questions.forEach(q => {
    const type = detectQuestionType(q);
    counts[type]++;
  });

  return counts;
}

export default detectQuestionType;
