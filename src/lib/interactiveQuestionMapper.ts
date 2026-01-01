// Maps database mock_questions to interactive question format
import type { 
  InteractiveQuestion, 
  QuestionType,
  GraphInteractionData,
  DragDropMatchData,
  StepBuilderData,
  MathInputData
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
  mock_sub_questions?: DBSubQuestion[];
}

interface DBSubQuestion {
  id: string;
  sub_question_text: string;
  marks: number;
  sub_question_label: string;
  answer_key?: string;
}

// Detect question type based on content keywords and structure
export function detectQuestionType(question: DBQuestion): QuestionType {
  const text = question.question_text.toLowerCase();
  const diagramDesc = (question.diagram_description || '').toLowerCase();
  
  // Graph interaction indicators
  if (
    text.includes('plot') ||
    text.includes('draw the graph') ||
    text.includes('draw the line') ||
    text.includes('coordinate') ||
    text.includes('cartesian') ||
    diagramDesc.includes('coordinate') ||
    diagramDesc.includes('x-axis') ||
    diagramDesc.includes('y-axis') ||
    diagramDesc.includes('parabola') ||
    diagramDesc.includes('graph')
  ) {
    return 'graph_interaction';
  }
  
  // Drag & Drop matching indicators
  if (
    text.includes('match') ||
    text.includes('pair') ||
    text.includes('drag') ||
    text.includes('correct column')
  ) {
    return 'drag_drop_match';
  }
  
  // Step builder indicators (solving equations, arranging steps)
  if (
    text.includes('arrange') ||
    text.includes('order the steps') ||
    text.includes('correct order') ||
    text.includes('solve the equation') ||
    text.includes('show your working')
  ) {
    return 'step_builder';
  }
  
  // Math input for calculations
  if (
    text.includes('calculate') ||
    text.includes('find the value') ||
    text.includes('solve for') ||
    text.includes('evaluate') ||
    text.includes('determine') ||
    text.includes('find the exact') ||
    text.includes('probability')
  ) {
    return 'math_input';
  }
  
  // Default to text input for general questions
  return 'text_input';
}

// Extract equation from text or diagram description
function extractEquation(question: DBQuestion): string | undefined {
  const diagramDesc = question.diagram_description || '';
  const text = question.question_text;
  
  // Look for common equation patterns
  const equationPatterns = [
    /f\(x\)\s*=\s*[^,\n]+/i,
    /y\s*=\s*[^,\n]+/i,
    /equation:\s*([^\n]+)/i,
  ];
  
  for (const pattern of equationPatterns) {
    const match = diagramDesc.match(pattern) || text.match(pattern);
    if (match) {
      return match[0].replace(/^equation:\s*/i, '').trim();
    }
  }
  
  return undefined;
}

// Generate graph interaction data from question
function generateGraphData(question: DBQuestion): GraphInteractionData {
  const equation = extractEquation(question);
  const diagramDesc = question.diagram_description || '';
  
  // Try to detect graph type
  let type: 'plot_point' | 'draw_line' | 'shade_region' = 'draw_line';
  
  if (question.question_text.toLowerCase().includes('plot')) {
    type = 'plot_point';
  } else if (question.question_text.toLowerCase().includes('shade')) {
    type = 'shade_region';
  }
  
  return {
    type,
    equation,
  };
}

// Generate drag & drop data for matching questions
function generateDragDropData(question: DBQuestion): DragDropMatchData {
  // Default example - in production this would parse the question text
  return {
    items: [
      { id: 'item1', content: 'Expression 1', isLatex: true },
      { id: 'item2', content: 'Expression 2', isLatex: true },
    ],
    targets: [
      { id: 'target1', label: 'Match A', correctItemId: 'item1' },
      { id: 'target2', label: 'Match B', correctItemId: 'item2' },
    ]
  };
}

// Generate step builder data from question with sub-questions
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
    // Extract steps from question text if no sub-questions
    const lines = question.question_text.split('\n').filter(l => l.trim());
    lines.forEach((line, index) => {
      if (line.match(/^[i)v]+\)|^\d+\.|^[a-z]\)/i)) {
        steps.push({
          id: `step-${index}`,
          content: line.replace(/^[i)v]+\)|^\d+\.|^[a-z]\)/i, '').trim(),
          correctOrder: index + 1
        });
      }
    });
  }
  
  // If still no steps, create default
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
    hint: 'Enter your answer in the input field'
  };
}

// Generate hints based on question content
function generateHints(question: DBQuestion): string[] {
  const hints: string[] = [];
  const text = question.question_text.toLowerCase();
  
  if (text.includes('equation') || text.includes('function')) {
    hints.push('Identify the key components of the equation');
    hints.push('Consider what values you need to substitute');
  }
  
  if (text.includes('graph') || text.includes('plot')) {
    hints.push('Identify key points on the graph');
    hints.push('Check the scale of the axes');
  }
  
  if (text.includes('calculate') || text.includes('find')) {
    hints.push('Write down the formula you need to use');
    hints.push('Substitute the given values carefully');
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

// Map array of DB questions to interactive questions
export function mapDBQuestionsToInteractive(questions: DBQuestion[]): InteractiveQuestion[] {
  return questions.map((q, index) => mapDBQuestionToInteractive(q, index));
}
