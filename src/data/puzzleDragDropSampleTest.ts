// Sample Mock Test with Puzzle Drag & Drop Questions
// For testing the enhanced puzzle interface

export interface PuzzleTestQuestion {
  id: string;
  question_number: number;
  question_text: string;
  marks: number;
  command_term?: string;
  diagram_description?: string;
  question_image_url?: string;
  answer_block_type: 'drag_drop' | 'text_equation' | 'smart_math' | 'graph_plot' | 'table_input';
  answer_block_config?: {
    draggableItems?: Array<{
      id: string;
      content: string;
      color?: string;
      isLatex?: boolean;
    }>;
    dropTargets?: Array<{
      id: string;
      label: string;
      correctItemId: string;
      description?: string;
    }>;
    tableConfig?: {
      rows: number;
      columns: number;
      headers?: string[];
    };
  };
  mock_sub_questions?: Array<{
    id: string;
    sub_question_label: string;
    sub_question_text: string;
    marks: number;
    command_term?: string;
    answer_block_type: string;
    answer_block_config?: any;
  }>;
}

export interface PuzzleSampleTest {
  id: string;
  title: string;
  subject: string;
  topic: string;
  total_questions: number;
  questions: PuzzleTestQuestion[];
}

// Sample test with various drag & drop puzzle questions
export const puzzleDragDropSampleTest: PuzzleSampleTest = {
  id: 'puzzle-sample-test-001',
  title: 'IB Mathematics - Matching & Puzzle Challenge',
  subject: 'mathematics',
  topic: 'Mixed Topics - Ratios, Equations, Probability',
  total_questions: 6,
  questions: [
    // Question 1: Ratio Matching (like the uploaded image)
    {
      id: 'puzzle-q1',
      question_number: 1,
      question_text: 'Match equivalent ratios. Drag each ratio on the left to its equivalent ratio on the right.',
      marks: 4,
      command_term: 'MATCH',
      diagram_description: 'ratio_matching_puzzle',
      answer_block_type: 'drag_drop',
      answer_block_config: {
        draggableItems: [
          { id: 'ratio-1', content: '6:4', color: 'orange' },
          { id: 'ratio-2', content: '15:20', color: 'cyan' },
          { id: 'ratio-3', content: '8:6', color: 'pink' },
          { id: 'ratio-4', content: '21:14', color: 'green' }
        ],
        dropTargets: [
          { id: 'target-1', label: '16:24', correctItemId: 'ratio-1', description: 'Simplify to find equivalent' },
          { id: 'target-2', label: '3:4', correctItemId: 'ratio-2', description: 'Reduce to lowest terms' },
          { id: 'target-3', label: '4:3', correctItemId: 'ratio-3', description: 'Match the simplified form' },
          { id: 'target-4', label: '3:2', correctItemId: 'ratio-4', description: 'Divide by common factor' }
        ]
      }
    },

    // Question 2: Equation to Graph Matching
    {
      id: 'puzzle-q2',
      question_number: 2,
      question_text: 'Match each linear equation to its correct description.',
      marks: 4,
      command_term: 'MATCH',
      diagram_description: 'equation_graph_matching',
      answer_block_type: 'drag_drop',
      answer_block_config: {
        draggableItems: [
          { id: 'eq-1', content: 'y = 2x + 3', color: 'purple', isLatex: true },
          { id: 'eq-2', content: 'y = -x + 5', color: 'blue', isLatex: true },
          { id: 'eq-3', content: 'y = ½x - 2', color: 'orange', isLatex: true },
          { id: 'eq-4', content: 'y = 3', color: 'green', isLatex: true }
        ],
        dropTargets: [
          { id: 'desc-1', label: 'Slope = 2, y-intercept = 3', correctItemId: 'eq-1' },
          { id: 'desc-2', label: 'Negative slope, crosses y at 5', correctItemId: 'eq-2' },
          { id: 'desc-3', label: 'Gentle slope, crosses y at -2', correctItemId: 'eq-3' },
          { id: 'desc-4', label: 'Horizontal line', correctItemId: 'eq-4' }
        ]
      }
    },

    // Question 3: Probability Matching
    {
      id: 'puzzle-q3',
      question_number: 3,
      question_text: 'Match each probability scenario to its correct probability value.',
      marks: 5,
      command_term: 'CALCULATE',
      answer_block_type: 'drag_drop',
      answer_block_config: {
        draggableItems: [
          { id: 'prob-1', content: '1/6', color: 'red', isLatex: true },
          { id: 'prob-2', content: '1/2', color: 'blue', isLatex: true },
          { id: 'prob-3', content: '1/4', color: 'yellow', isLatex: true },
          { id: 'prob-4', content: '2/3', color: 'green', isLatex: true },
          { id: 'prob-5', content: '1/13', color: 'purple', isLatex: true }
        ],
        dropTargets: [
          { id: 'scenario-1', label: 'Rolling a 4 on a fair die', correctItemId: 'prob-1' },
          { id: 'scenario-2', label: 'Flipping heads on a coin', correctItemId: 'prob-2' },
          { id: 'scenario-3', label: 'Drawing a heart from a deck', correctItemId: 'prob-3' },
          { id: 'scenario-4', label: 'Not rolling a 1 or 2 on a die', correctItemId: 'prob-4' },
          { id: 'scenario-5', label: 'Drawing an Ace from a deck', correctItemId: 'prob-5' }
        ]
      }
    },

    // Question 4: Mixed - Drag & Drop + Written Response
    {
      id: 'puzzle-q4',
      question_number: 4,
      question_text: 'The Venn diagram shows students studying French (F) and Spanish (S).\n\nTotal students = 30',
      marks: 6,
      command_term: 'ANALYZE',
      diagram_description: 'venn_diagram_two_sets',
      question_image_url: '/lovable-uploads/demo1-tree-diagram.jpg',
      answer_block_type: 'text_equation',
      mock_sub_questions: [
        {
          id: 'puzzle-q4a',
          sub_question_label: 'a',
          sub_question_text: 'Match each region to its meaning:',
          marks: 3,
          command_term: 'MATCH',
          answer_block_type: 'drag_drop',
          answer_block_config: {
            draggableItems: [
              { id: 'region-1', content: 'F ∩ S', color: 'purple', isLatex: true },
              { id: 'region-2', content: 'F ∪ S', color: 'blue', isLatex: true },
              { id: 'region-3', content: "F'", color: 'orange', isLatex: true }
            ],
            dropTargets: [
              { id: 'meaning-1', label: 'Students studying BOTH languages', correctItemId: 'region-1' },
              { id: 'meaning-2', label: 'Students studying at least ONE language', correctItemId: 'region-2' },
              { id: 'meaning-3', label: 'Students NOT studying French', correctItemId: 'region-3' }
            ]
          }
        },
        {
          id: 'puzzle-q4b',
          sub_question_label: 'b',
          sub_question_text: 'If 12 students study French, 15 study Spanish, and 5 study both, how many study neither?',
          marks: 3,
          command_term: 'CALCULATE',
          answer_block_type: 'smart_math'
        }
      ]
    },

    // Question 5: Geometry Shape Matching
    {
      id: 'puzzle-q5',
      question_number: 5,
      question_text: 'Match each quadrilateral to its defining property.',
      marks: 4,
      command_term: 'CLASSIFY',
      answer_block_type: 'drag_drop',
      answer_block_config: {
        draggableItems: [
          { id: 'shape-1', content: 'Square', color: 'red' },
          { id: 'shape-2', content: 'Rhombus', color: 'blue' },
          { id: 'shape-3', content: 'Rectangle', color: 'green' },
          { id: 'shape-4', content: 'Trapezoid', color: 'yellow' }
        ],
        dropTargets: [
          { id: 'prop-1', label: '4 equal sides AND 4 right angles', correctItemId: 'shape-1' },
          { id: 'prop-2', label: '4 equal sides, angles NOT 90°', correctItemId: 'shape-2' },
          { id: 'prop-3', label: 'Opposite sides equal, 4 right angles', correctItemId: 'shape-3' },
          { id: 'prop-4', label: 'Exactly ONE pair of parallel sides', correctItemId: 'shape-4' }
        ]
      }
    },

    // Question 6: Unit Conversion Matching
    {
      id: 'puzzle-q6',
      question_number: 6,
      question_text: 'Match each measurement to its equivalent value.',
      marks: 4,
      command_term: 'CONVERT',
      answer_block_type: 'drag_drop',
      answer_block_config: {
        draggableItems: [
          { id: 'unit-1', content: '2.5 km', color: 'cyan' },
          { id: 'unit-2', content: '3000 g', color: 'pink' },
          { id: 'unit-3', content: '1.5 hours', color: 'orange' },
          { id: 'unit-4', content: '0.75 L', color: 'green' }
        ],
        dropTargets: [
          { id: 'equiv-1', label: '2500 m', correctItemId: 'unit-1' },
          { id: 'equiv-2', label: '3 kg', correctItemId: 'unit-2' },
          { id: 'equiv-3', label: '90 minutes', correctItemId: 'unit-3' },
          { id: 'equiv-4', label: '750 mL', correctItemId: 'unit-4' }
        ]
      }
    }
  ]
};

// Helper to load sample test into the unified exam
export const loadPuzzleSampleTest = () => {
  return {
    testId: puzzleDragDropSampleTest.id,
    title: puzzleDragDropSampleTest.title,
    subject: puzzleDragDropSampleTest.subject,
    topic: puzzleDragDropSampleTest.topic,
    questions: puzzleDragDropSampleTest.questions.map(q => ({
      ...q,
      mock_sub_questions: q.mock_sub_questions?.map(sq => ({
        ...sq,
        answer_block_config: sq.answer_block_config ? JSON.stringify(sq.answer_block_config) : null
      })),
      answer_block_config: JSON.stringify(q.answer_block_config)
    }))
  };
};

export default puzzleDragDropSampleTest;
