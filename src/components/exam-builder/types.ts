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

export interface ComponentConfig {
  id: string;
  type: ComponentType;
  label: string;
  content: string;
  settings: Record<string, any>;
}

export interface ExamQuestion {
  id: string;
  title: string;
  instructions: string;
  components: ComponentConfig[];
  thumbnail?: string;
}

export interface ExamBuilderState {
  examName: string;
  questions: ExamQuestion[];
  activeQuestionId: string | null;
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
