// Types for the drag-and-drop exam builder

export type ComponentType = 
  | 'note'
  | 'free_response'
  | 'math_response'
  | 'multiple_choice'
  | 'checkboxes'
  | 'ordered_list'
  | 'graph'
  | 'sketch'
  | 'media'
  | 'table';

export interface MultipleChoiceOption {
  id: string;
  label: string;
  text: string;
  isCorrect?: boolean;
}

export interface TableCell {
  value: string;
  isHeader?: boolean;
  isEditable?: boolean;
}

export interface TableConfig {
  rows: number;
  columns: number;
  cells: TableCell[][];
  hasHeaders?: boolean;
}

export interface GraphConfig {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  showGrid: boolean;
  showAxes: boolean;
  plotPoints?: { x: number; y: number }[];
}

export interface ComponentConfig {
  id: string;
  type: ComponentType;
  label: string;
  content: string;
  settings: Record<string, any>;
  // Enhanced fields for different component types
  options?: MultipleChoiceOption[];
  tableConfig?: TableConfig;
  graphConfig?: GraphConfig;
  mediaUrl?: string;
  marks?: number;
  answerKey?: string;
  wordLimit?: number;
}

export interface ExamQuestion {
  id: string;
  title: string;
  instructions: string;
  components: ComponentConfig[];
  thumbnail?: string;
  marks?: number;
  commandTerm?: string;
}

export interface ExamBuilderState {
  examName: string;
  questions: ExamQuestion[];
  activeQuestionId: string | null;
  subject?: string;
  topic?: string;
  isPublished?: boolean;
}

export interface DraggableSidebarItem {
  id: string;
  type: ComponentType;
  label: string;
  icon: string;
  description: string;
}

export const COMPONENT_TYPES: DraggableSidebarItem[] = [
  { id: 'note', type: 'note', label: 'Note', icon: 'AlignLeft', description: 'Add text or instructions' },
  { id: 'free_response', type: 'free_response', label: 'Free Response', icon: 'FileText', description: 'Open text answer' },
  { id: 'math_response', type: 'math_response', label: 'Math Response', icon: 'Calculator', description: 'Math equation input' },
  { id: 'multiple_choice', type: 'multiple_choice', label: 'Multiple Choice', icon: 'List', description: 'Single selection options' },
  { id: 'checkboxes', type: 'checkboxes', label: 'Checkboxes', icon: 'CheckSquare', description: 'Multiple selection options' },
  { id: 'ordered_list', type: 'ordered_list', label: 'Ordered List', icon: 'ListOrdered', description: 'Sequenced items' },
  { id: 'graph', type: 'graph', label: 'Graph', icon: 'LineChart', description: 'Interactive graph canvas' },
  { id: 'sketch', type: 'sketch', label: 'Sketch', icon: 'Pencil', description: 'Freehand drawing area' },
  { id: 'media', type: 'media', label: 'Media', icon: 'Image', description: 'Upload images or videos' },
  { id: 'table', type: 'table', label: 'Table', icon: 'Table2', description: 'Data table component' },
];

// Helper function to create default options for multiple choice
export function createDefaultOptions(): MultipleChoiceOption[] {
  return [
    { id: 'a', label: 'A', text: '', isCorrect: false },
    { id: 'b', label: 'B', text: '', isCorrect: false },
    { id: 'c', label: 'C', text: '', isCorrect: false },
    { id: 'd', label: 'D', text: '', isCorrect: false },
  ];
}

// Helper function to create default table config
export function createDefaultTableConfig(rows = 3, columns = 3): TableConfig {
  const cells: TableCell[][] = [];
  for (let i = 0; i < rows; i++) {
    const row: TableCell[] = [];
    for (let j = 0; j < columns; j++) {
      row.push({
        value: '',
        isHeader: i === 0,
        isEditable: true,
      });
    }
    cells.push(row);
  }
  return { rows, columns, cells, hasHeaders: true };
}

// Helper function to create default graph config
export function createDefaultGraphConfig(): GraphConfig {
  return {
    xMin: -10,
    xMax: 10,
    yMin: -10,
    yMax: 10,
    showGrid: true,
    showAxes: true,
    plotPoints: [],
  };
}
