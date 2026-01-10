// Enhanced Interactive Question Mapper - learns patterns from IB MYP eAssessment PDFs
import { supabase } from '@/integrations/supabase/client';
import type { 
  InteractiveQuestion, 
  QuestionType,
  GraphInteractionData,
  DragDropMatchData,
  StepBuilderData,
  MathInputData,
  ImageDropZoneData
} from '@/data/mocktest2';

interface DBQuestion {
  id: string;
  question_text: string;
  marks: number;
  question_number: number;
  category?: string;
  diagram_description?: string;
  question_image_url?: string;
  answer_key?: string;
  command_term?: string;
  has_table?: boolean;
  table_data?: string[][] | null;
  graph_type?: string;
  mock_sub_questions?: DBSubQuestion[];
}

interface DBSubQuestion {
  id: string;
  sub_question_text: string;
  marks: number;
  sub_question_label: string;
  answer_key?: string;
  command_term?: string;
}

interface AIDetectionResult {
  questionId: string;
  questionType: QuestionType;
  confidence: number;
  reasoning: string;
}

// Learned patterns from IB MYP eAssessment PDFs
const INTERACTIVE_PATTERNS = {
  // Drag & Drop patterns (from 7-2.pdf, 4-2.pdf)
  drag_drop: [
    'drag and drop',
    'draggable',
    'place them in the correct',
    'select the .* and place',
    'label the .* by placing',
    'match the',
    'pair the'
  ],
  
  // Venn Diagram interactive (from 3-2.pdf, 4-2.pdf)
  venn_diagram: [
    'venn diagram',
    'complete the venn',
    'set a .* set b',
    'a ∩ b',
    'a ∪ b',
    'intersection',
    'union'
  ],
  
  // Graph/Coordinate Plane (common pattern)
  graph_interaction: [
    'plot the point',
    'draw the graph',
    'draw the line',
    'draw a line of best fit',
    'sketch the graph',
    'on the coordinate',
    'x-axis',
    'y-axis',
    'cartesian plane',
    'coordinate plane',
    'graph of f(x)',
    'graph below'
  ],
  
  // Multiple Choice with figures (from 7-2.pdf)
  multiple_choice: [
    'select the figure',
    'option a',
    'option b',
    'option c',
    'choose the correct',
    'which of the following',
    'select the correct'
  ],
  
  // Tree Diagram / Probability (from 4-2.pdf)
  tree_diagram: [
    'tree diagram',
    'complete the tree',
    'probability tree',
    'first ball',
    'second ball'
  ],
  
  // Function transformation (from 4-2.pdf)
  transformation: [
    'transformed',
    'transformation',
    'f(x) is transformed',
    'translated',
    'reflected',
    'stretched',
    'compressed'
  ],
  
  // Box-and-whisker / Statistics (from 3-2.pdf)
  statistics: [
    'box-and-whisker',
    'box plot',
    'cumulative frequency',
    'histogram',
    'median',
    'interquartile range',
    'quartile'
  ],
  
  // Step-by-step / Working (common pattern)
  step_builder: [
    'show that',
    'show your working',
    'arrange the steps',
    'correct order',
    'prove that',
    'verify'
  ],
  
  // Math calculation input
  math_input: [
    'calculate',
    'find the value',
    'solve for',
    'evaluate',
    'determine',
    'find the probability',
    'find the exact',
    'what is the'
  ],
  
  // Table/Grid completion
  table_fill: [
    'complete the table',
    'fill in the table',
    'missing values',
    'determine the missing'
  ]
};

// Use AI to detect question types
export async function detectQuestionTypesWithAI(questions: DBQuestion[]): Promise<Map<string, QuestionType>> {
  const typeMap = new Map<string, QuestionType>();
  
  try {
    const { data, error } = await supabase.functions.invoke('detect-question-type', {
      body: { 
        questions: questions.map(q => ({
          id: q.id,
          question_text: q.question_text,
          diagram_description: q.diagram_description,
          marks: q.marks,
          answer_key: q.answer_key,
          command_term: q.command_term,
          has_table: q.has_table,
          graph_type: q.graph_type
        }))
      }
    });

    if (error) {
      console.error('AI detection error:', error);
      questions.forEach(q => {
        typeMap.set(q.id, detectQuestionType(q));
      });
      return typeMap;
    }

    const results = data?.results as AIDetectionResult[];
    if (results && Array.isArray(results)) {
      results.forEach(result => {
        typeMap.set(result.questionId, result.questionType);
      });
    }

    questions.forEach(q => {
      if (!typeMap.has(q.id)) {
        typeMap.set(q.id, detectQuestionType(q));
      }
    });

  } catch (err) {
    console.error('Failed to call AI detection:', err);
    questions.forEach(q => {
      typeMap.set(q.id, detectQuestionType(q));
    });
  }

  return typeMap;
}

// Enhanced pattern-based question type detection
export function detectQuestionType(question: DBQuestion): QuestionType {
  const text = (question.question_text || '').toLowerCase();
  const diagramDesc = (question.diagram_description || '').toLowerCase();
  const graphType = (question.graph_type || '').toLowerCase();
  const combined = `${text} ${diagramDesc} ${graphType}`;
  
  // Check each pattern category
  const checkPatterns = (patterns: string[]): boolean => {
    return patterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(combined);
    });
  };
  
  // Priority order for detection
  
  // 1. Drag & Drop (highest priority when explicitly mentioned)
  if (checkPatterns(INTERACTIVE_PATTERNS.drag_drop)) {
    return 'drag_drop_match';
  }
  
  // 2. Venn Diagram - special interactive type
  if (checkPatterns(INTERACTIVE_PATTERNS.venn_diagram)) {
    return 'image_drop_zone';
  }
  
  // 3. Graph/Coordinate Plane interactions
  if (checkPatterns(INTERACTIVE_PATTERNS.graph_interaction) || graphType.includes('coordinate') || graphType.includes('graph')) {
    return 'graph_interaction';
  }
  
  // 4. Tree Diagram - typically drag & drop or step builder
  if (checkPatterns(INTERACTIVE_PATTERNS.tree_diagram)) {
    return 'image_drop_zone';
  }
  
  // 5. Multiple Choice with images
  if (checkPatterns(INTERACTIVE_PATTERNS.multiple_choice)) {
    return 'drag_drop_match';
  }
  
  // 6. Step Builder - show working, prove, verify
  if (checkPatterns(INTERACTIVE_PATTERNS.step_builder)) {
    return 'step_builder';
  }
  
  // 7. Table Fill - complete tables
  if (checkPatterns(INTERACTIVE_PATTERNS.table_fill) || question.has_table) {
    return 'math_input';
  }
  
  // 8. Math Input - calculations, probability, determine values
  if (checkPatterns(INTERACTIVE_PATTERNS.math_input)) {
    return 'math_input';
  }
  
  // 9. Statistics questions often need math input
  if (checkPatterns(INTERACTIVE_PATTERNS.statistics)) {
    return 'math_input';
  }
  
  // Default to text input for general questions
  return 'text_input';
}

// Get readable type label
export function getQuestionTypeLabel(type: QuestionType): string {
  const labels: Record<QuestionType, string> = {
    'graph_interaction': '📊 Graph/Plot',
    'drag_drop_match': '🔀 Drag & Drop',
    'image_drop_zone': '📌 Interactive Diagram',
    'step_builder': '📝 Step Builder',
    'math_input': '🔢 Math Input',
    'text_input': '✏️ Text Answer'
  };
  return labels[type] || type;
}

// Extract equation from text or diagram description
function extractEquation(question: DBQuestion): string | undefined {
  const diagramDesc = question.diagram_description || '';
  const text = question.question_text || '';
  
  const equationPatterns = [
    /f\s*\(\s*x\s*\)\s*=\s*[^,\n.]+/i,
    /y\s*=\s*[^,\n.]+/i,
    /g\s*\(\s*x\s*\)\s*=\s*[^,\n.]+/i,
    /h\s*\(\s*t\s*\)\s*=\s*[^,\n.]+/i,
    /equation:\s*([^\n]+)/i,
  ];
  
  for (const pattern of equationPatterns) {
    const match = text.match(pattern) || diagramDesc.match(pattern);
    if (match) {
      return match[0].replace(/^equation:\s*/i, '').trim();
    }
  }
  
  return undefined;
}

// Extract draggable items from question text
function extractDraggableItems(question: DBQuestion): { items: any[]; targets: any[] } {
  const text = question.question_text || '';
  const items: { id: string; content: string; isLatex?: boolean }[] = [];
  const targets: { id: string; label: string; correctItemId: string }[] = [];
  
  // Look for patterns like "3x + 3 + 1 + x", "2x + 1 + x + 3", etc.
  const expressionMatches = text.match(/[0-9x+\-×÷()√\s]+=[^\n]+/g) || [];
  const algebraicMatches = text.match(/\(?[0-9]*x[²³]?\s*[+\-]\s*[0-9x]+\)?/g) || [];
  
  // If we have algebraic expressions, use those
  if (algebraicMatches.length > 0) {
    algebraicMatches.forEach((expr, i) => {
      items.push({ id: `item-${i}`, content: expr.trim(), isLatex: true });
    });
    
    // Create targets based on the question type
    items.slice(0, Math.ceil(items.length / 2)).forEach((_, i) => {
      targets.push({
        id: `target-${i}`,
        label: `Position ${i + 1}`,
        correctItemId: `item-${i}`
      });
    });
  }
  
  // Default if no expressions found
  if (items.length === 0) {
    items.push(
      { id: 'item-1', content: 'Expression 1', isLatex: true },
      { id: 'item-2', content: 'Expression 2', isLatex: true }
    );
    targets.push(
      { id: 'target-1', label: 'Match A', correctItemId: 'item-1' },
      { id: 'target-2', label: 'Match B', correctItemId: 'item-2' }
    );
  }
  
  return { items, targets };
}

// Generate graph interaction data from question
function generateGraphData(question: DBQuestion): GraphInteractionData {
  const equation = extractEquation(question);
  const text = (question.question_text || '').toLowerCase();
  const diagramDesc = (question.diagram_description || '').toLowerCase();
  
  let type: 'plot_point' | 'draw_line' | 'shade_region' = 'draw_line';
  
  if (text.includes('plot') || text.includes('point')) {
    type = 'plot_point';
  } else if (text.includes('shade') || text.includes('region')) {
    type = 'shade_region';
  }
  
  // Try to extract target point
  const pointMatch = text.match(/x\s*=\s*(\d+)/);
  
  return {
    type,
    equation,
    targetPoint: pointMatch ? { x: parseInt(pointMatch[1]), y: 0, tolerance: 0.5 } : undefined
  };
}

// Generate drag & drop data for matching questions
function generateDragDropData(question: DBQuestion): DragDropMatchData {
  const { items, targets } = extractDraggableItems(question);
  return { items, targets };
}

// Generate image drop zone data (for Venn diagrams, tree diagrams)
function generateImageDropZoneData(question: DBQuestion): ImageDropZoneData {
  return {
    imageUrl: question.question_image_url || '',
    dropZones: [
      { id: 'zone-1', x: 30, y: 50, correctLabel: 'label-1' },
      { id: 'zone-2', x: 70, y: 50, correctLabel: 'label-2' }
    ],
    draggableLabels: [
      { id: 'label-1', content: 'A' },
      { id: 'label-2', content: 'B' }
    ]
  };
}

// Generate step builder data from question
function generateStepBuilderData(question: DBQuestion): StepBuilderData {
  const steps: { id: string; content: string; correctOrder: number }[] = [];
  
  if (question.mock_sub_questions && question.mock_sub_questions.length > 0) {
    question.mock_sub_questions.forEach((sq, index) => {
      steps.push({
        id: sq.id,
        content: sq.sub_question_text,
        correctOrder: index + 1
      });
    });
  } else {
    const text = question.question_text || '';
    const lines = text.split('\n').filter(l => l.trim());
    lines.forEach((line, index) => {
      if (line.match(/^[i)v]+\)|^\d+\.|^[a-z]\)|^step/i)) {
        steps.push({
          id: `step-${index}`,
          content: line.replace(/^[i)v]+\)|^\d+\.|^[a-z]\)|^step\s*\d*:?\s*/i, '').trim(),
          correctOrder: index + 1
        });
      }
    });
  }
  
  if (steps.length === 0) {
    steps.push(
      { id: 'step1', content: 'First step', correctOrder: 1 },
      { id: 'step2', content: 'Second step', correctOrder: 2 }
    );
  }
  
  return { steps };
}

// Generate math input data
function generateMathInputData(question: DBQuestion): MathInputData {
  return {
    expectedAnswer: question.answer_key || '',
    acceptedFormats: [],
    hint: 'Enter your numerical answer'
  };
}

// Generate hints based on question content
function generateHints(question: DBQuestion): string[] {
  const hints: string[] = [];
  const text = (question.question_text || '').toLowerCase();
  const commandTerm = (question.command_term || '').toLowerCase();
  
  // Command term specific hints
  if (commandTerm === 'calculate' || text.includes('calculate')) {
    hints.push('Write down the formula you need');
    hints.push('Substitute the values carefully');
  }
  
  if (commandTerm === 'show that' || text.includes('show that')) {
    hints.push('Start with one side of the equation');
    hints.push('Show each step of your working');
  }
  
  if (commandTerm === 'determine' || text.includes('determine')) {
    hints.push('Identify what you need to find');
    hints.push('List the given information');
  }
  
  if (text.includes('graph') || text.includes('plot')) {
    hints.push('Identify key points on the graph');
    hints.push('Check the scale of the axes');
  }
  
  if (text.includes('probability')) {
    hints.push('Consider the total number of outcomes');
    hints.push('Count the favorable outcomes');
  }
  
  if (text.includes('venn diagram')) {
    hints.push('Start with the intersection');
    hints.push('Work outward to the individual sets');
  }
  
  if (hints.length === 0) {
    hints.push('Read the question carefully');
    hints.push('Identify what the question is asking for');
  }
  
  return hints;
}

// Main mapper function
export function mapDBQuestionToInteractive(question: DBQuestion, index: number): InteractiveQuestion {
  const questionType = detectQuestionType(question);
  
  let interactionData: any = undefined;
  
  switch (questionType) {
    case 'graph_interaction':
      interactionData = generateGraphData(question);
      break;
    case 'drag_drop_match':
      interactionData = generateDragDropData(question);
      break;
    case 'image_drop_zone':
      interactionData = generateImageDropZoneData(question);
      break;
    case 'step_builder':
      interactionData = generateStepBuilderData(question);
      break;
    case 'math_input':
      interactionData = generateMathInputData(question);
      break;
  }
  
  return {
    id: question.id,
    questionNumber: question.question_number || index + 1,
    text: question.question_text,
    marks: question.marks,
    questionType,
    interactionData,
    hints: generateHints(question),
    feedback: {
      correct: 'Well done! Your answer is correct.',
      partial: 'Partially correct. Review your answer.',
      incorrect: 'Not quite right. Try again.'
    }
  };
}

// Map array of DB questions to interactive questions (sync version)
export function mapDBQuestionsToInteractive(questions: DBQuestion[]): InteractiveQuestion[] {
  return questions.map((q, index) => mapDBQuestionToInteractive(q, index));
}

// Map array of DB questions with AI-powered type detection (async version)
export async function mapDBQuestionsToInteractiveWithAI(questions: DBQuestion[]): Promise<InteractiveQuestion[]> {
  const typeMap = await detectQuestionTypesWithAI(questions);
  
  return questions.map((question, index) => {
    const questionType = typeMap.get(question.id) || detectQuestionType(question);
    
    let interactionData: any = undefined;
    
    switch (questionType) {
      case 'graph_interaction':
        interactionData = generateGraphData(question);
        break;
      case 'drag_drop_match':
        interactionData = generateDragDropData(question);
        break;
      case 'image_drop_zone':
        interactionData = generateImageDropZoneData(question);
        break;
      case 'step_builder':
        interactionData = generateStepBuilderData(question);
        break;
      case 'math_input':
        interactionData = generateMathInputData(question);
        break;
    }
    
    return {
      id: question.id,
      questionNumber: question.question_number || index + 1,
      text: question.question_text,
      marks: question.marks,
      questionType,
      interactionData,
      hints: generateHints(question),
      feedback: {
        correct: 'Well done! Your answer is correct.',
        partial: 'Partially correct. Review your answer.',
        incorrect: 'Not quite right. Try again.'
      }
    };
  });
}
