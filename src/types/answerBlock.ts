// Answer Block Types for Unified Exam System
// Each sub-question can have a different answer type

export type AnswerBlockType = 
  | 'text_equation'    // Text/LaTeX Answer
  | 'graph_plot'       // Graph Plotting
  | 'drag_drop'        // Drag & Drop Matching
  | 'image_drop'       // Image Drop / Image Select
  | 'arrange_order'    // Arrange / Order items
  | 'smart_math'       // Smart Math (step-based)
  | 'multiple_choice'; // MCQ options

export interface AnswerBlockConfig {
  type: AnswerBlockType;
  // Graph settings
  graphConfig?: {
    showGrid: boolean;
    xRange: [number, number];
    yRange: [number, number];
    allowPoints: boolean;
    allowLines: boolean;
    allowShading: boolean;
  };
  // Drag drop settings
  dragDropConfig?: {
    items: { id: string; content: string; isLatex?: boolean }[];
    targets: { id: string; label: string; correctItemId?: string }[];
  };
  // Image drop settings
  imageDropConfig?: {
    imageUrl: string;
    dropZones: { id: string; x: number; y: number; label?: string }[];
    draggableLabels: { id: string; content: string }[];
  };
  // Arrange/order settings
  arrangeConfig?: {
    items: { id: string; content: string; correctOrder?: number }[];
  };
  // Smart math settings
  smartMathConfig?: {
    expectedAnswer?: string;
    acceptedFormats?: string[];
    showStepBuilder?: boolean;
  };
  // MCQ settings
  mcqConfig?: {
    options: { id: string; content: string; isCorrect?: boolean }[];
    allowMultiple?: boolean;
  };
}

export interface UnifiedQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  questionImageUrl?: string;
  marks: number;
  commandTerm?: string;
  category?: string;
  difficulty?: string;
  wordLimit?: number;
  answerKey?: string;
  diagramDescription?: string;
  // Answer block type for main question (if no sub-questions)
  answerBlockType?: AnswerBlockType;
  answerBlockConfig?: AnswerBlockConfig;
  subQuestions?: UnifiedSubQuestion[];
  // Interactive question type (detected from AI parser)
  interactiveType?: 'graph_interaction' | 'drag_drop_match' | 'image_drop_zone' | 'step_builder' | 'math_input' | 'text_input';
}

export interface UnifiedSubQuestion {
  id: string;
  label: string; // a, b, c, etc.
  text: string;
  imageUrl?: string;
  marks: number;
  commandTerm?: string;
  wordLimit?: number;
  answerKey?: string;
  // Each sub-question has its own answer block type
  answerBlockType: AnswerBlockType;
  answerBlockConfig?: AnswerBlockConfig;
  // Interactive question type
  interactiveType?: 'graph_interaction' | 'drag_drop_match' | 'image_drop_zone' | 'step_builder' | 'math_input' | 'text_input';
}

export interface UnifiedExamData {
  id: string;
  title: string;
  subject: string;
  topic?: string;
  duration: number; // in minutes
  totalMarks: number;
  questions: UnifiedQuestion[];
}

// Answer data structure
export interface UnifiedAnswer {
  questionId: string;
  subQuestionId?: string;
  answerType: AnswerBlockType;
  content: string | object; // Can be text, JSON for drag-drop, etc.
  wordCount?: number;
  timestamp: Date;
}

// Helper to get default answer block type
export const getDefaultAnswerBlockType = (): AnswerBlockType => 'text_equation';

// Helper to get display name for answer block type
export const getAnswerBlockTypeLabel = (type: AnswerBlockType): string => {
  const labels: Record<AnswerBlockType, string> = {
    text_equation: 'Text / Equation',
    graph_plot: 'Graph Plotting',
    drag_drop: 'Drag & Drop',
    image_drop: 'Image Drop Zone',
    arrange_order: 'Arrange / Order',
    smart_math: 'Smart Math Input',
    multiple_choice: 'Multiple Choice'
  };
  return labels[type];
};

// Helper to get icon for answer block type
export const getAnswerBlockTypeIcon = (type: AnswerBlockType): string => {
  const icons: Record<AnswerBlockType, string> = {
    text_equation: '📝',
    graph_plot: '📊',
    drag_drop: '🧩',
    image_drop: '🖼️',
    arrange_order: '🔢',
    smart_math: '🤖',
    multiple_choice: '☑️'
  };
  return icons[type];
};
