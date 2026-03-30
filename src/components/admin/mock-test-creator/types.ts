import type { AnswerBlockType } from '../AnswerBlockTypeSelector';
import type { EquationData } from '@/components/equation-editor/EquationObject';

export interface CreatorSubQuestion {
  id: string;
  label: string; // a, b, c
  text: string;
  imageUrl: string;
  marks: number;
  answerKey: string;
  wordLimit: string;
  commandTerm: string;
  answerBlockType: AnswerBlockType;
  answerBlockConfig: Record<string, any>;
  answerKeyEquations?: EquationData[];
}

export interface CreatorQuestionGroup {
  id: string;
  number: number;
  stem: string; // shared passage/image
  stemImageUrl: string;
  marks: number;
  difficulty: string;
  commandTerm: string;
  category: string;
  diagramDescription: string;
  answerBlockType: AnswerBlockType;
  answerBlockConfig: Record<string, any>;
  answerKey: string;
  wordLimit: string;
  answerKeyEquations?: EquationData[];
  subQuestions: CreatorSubQuestion[];
}

export interface CreatorSection {
  id: string;
  title: string;
  order: number;
  questionGroups: CreatorQuestionGroup[];
}

export interface CreatorState {
  title: string;
  subject: string;
  topic: string;
  durationMinutes: number;
  sections: CreatorSection[];
}

// Helpers
let _counter = 0;
export const genId = () => `${Date.now()}-${++_counter}-${Math.random().toString(36).slice(2, 7)}`;

const SUB_LABELS = 'abcdefghijklmnopqrstuvwxyz'.split('');

export const createSubQuestion = (index: number): CreatorSubQuestion => ({
  id: genId(),
  label: SUB_LABELS[index] || `${index + 1}`,
  text: '',
  imageUrl: '',
  marks: 1,
  answerKey: '',
  wordLimit: '',
  commandTerm: '',
  answerBlockType: 'text_equation',
  answerBlockConfig: {},
});

export const createQuestionGroup = (number: number): CreatorQuestionGroup => ({
  id: genId(),
  number,
  stem: '',
  stemImageUrl: '',
  marks: 1,
  difficulty: 'medium',
  commandTerm: '',
  category: '',
  diagramDescription: '',
  answerBlockType: 'text_equation',
  answerBlockConfig: {},
  answerKey: '',
  wordLimit: '',
  subQuestions: [],
});

export const createSection = (order: number): CreatorSection => ({
  id: genId(),
  title: `Part ${String.fromCharCode(65 + order)}`, // Part A, B, C...
  order,
  questionGroups: [createQuestionGroup(1)],
});

export const createDefaultState = (): CreatorState => ({
  title: '',
  subject: '',
  topic: '',
  durationMinutes: 120,
  sections: [createSection(0)],
});

export const getNextQuestionNumber = (sections: CreatorSection[]): number => {
  let max = 0;
  sections.forEach(s => s.questionGroups.forEach(q => { if (q.number > max) max = q.number; }));
  return max + 1;
};

export const getTotalMarks = (sections: CreatorSection[]): number => {
  return sections.reduce((total, s) => 
    total + s.questionGroups.reduce((sTotal, q) => {
      if (q.subQuestions.length > 0) {
        return sTotal + q.subQuestions.reduce((sqTotal, sq) => sqTotal + sq.marks, 0);
      }
      return sTotal + q.marks;
    }, 0), 0);
};

export const getTotalQuestions = (sections: CreatorSection[]): number => {
  return sections.reduce((total, s) => total + s.questionGroups.length, 0);
};
