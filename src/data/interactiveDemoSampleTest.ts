// Complete Interactive Demo Sample Test with ALL question types
// For testing the unified exam system with auto question-type detection

export interface InteractiveDemoQuestion {
  id: string;
  question_number: number;
  question_text: string;
  marks: number;
  command_term?: string;
  diagram_description?: string;
  question_image_url?: string;
  answer_block_type: string;
  answer_block_config?: any;
  mock_sub_questions?: InteractiveDemoSubQuestion[];
}

export interface InteractiveDemoSubQuestion {
  id: string;
  sub_question_label: string;
  sub_question_text: string;
  marks: number;
  command_term?: string;
  answer_block_type: string;
  answer_block_config?: any;
}

export interface InteractiveDemoTest {
  id: string;
  title: string;
  subject: string;
  topic: string;
  total_questions: number;
  total_marks: number;
  duration: number; // minutes
  questions: InteractiveDemoQuestion[];
}

// Complete demo test with all interactive question types
export const interactiveDemoSampleTest: InteractiveDemoTest = {
  id: 'interactive-demo-001',
  title: 'Interactive Question Types Demo',
  subject: 'mathematics',
  topic: 'All Interactive Types',
  total_questions: 7,
  total_marks: 35,
  duration: 30,
  questions: [
    // Question 1: Graph Plotting
    {
      id: 'demo-q1',
      question_number: 1,
      question_text: 'Plot the graph of the linear function $f(x) = 2x + 1$ for values of $x$ from $-3$ to $3$.\n\nShow at least 3 points and draw the complete line.',
      marks: 5,
      command_term: 'PLOT',
      diagram_description: 'coordinate_plane_graph',
      answer_block_type: 'graph_plot',
      answer_block_config: {
        graphConfig: {
          xMin: -5,
          xMax: 5,
          yMin: -5,
          yMax: 8,
          showGrid: true,
          gridStep: 1,
          showAxis: true
        }
      }
    },

    // Question 2: Drag & Drop Puzzle Matching
    {
      id: 'demo-q2',
      question_number: 2,
      question_text: 'Match each fraction to its decimal equivalent.',
      marks: 4,
      command_term: 'MATCH',
      answer_block_type: 'drag_drop',
      answer_block_config: {
        draggableItems: [
          { id: 'frac-1', content: '1/4', color: 'blue', isLatex: true },
          { id: 'frac-2', content: '1/2', color: 'green', isLatex: true },
          { id: 'frac-3', content: '3/4', color: 'orange', isLatex: true },
          { id: 'frac-4', content: '1/5', color: 'purple', isLatex: true }
        ],
        dropTargets: [
          { id: 'dec-1', label: '0.25', correctItemId: 'frac-1' },
          { id: 'dec-2', label: '0.5', correctItemId: 'frac-2' },
          { id: 'dec-3', label: '0.75', correctItemId: 'frac-3' },
          { id: 'dec-4', label: '0.2', correctItemId: 'frac-4' }
        ]
      }
    },

    // Question 3: Smart Math Input
    {
      id: 'demo-q3',
      question_number: 3,
      question_text: 'Solve the equation and express your answer in its simplest form.',
      marks: 6,
      command_term: 'SOLVE',
      answer_block_type: 'text_equation',
      mock_sub_questions: [
        {
          id: 'demo-q3a',
          sub_question_label: 'a',
          sub_question_text: 'Solve: $3x + 7 = 22$',
          marks: 2,
          command_term: 'CALCULATE',
          answer_block_type: 'smart_math',
          answer_block_config: {
            smartMathConfig: {
              expectedAnswer: 'x = 5',
              acceptedFormats: ['x = 5', '5', 'x=5']
            }
          }
        },
        {
          id: 'demo-q3b',
          sub_question_label: 'b',
          sub_question_text: 'Solve: $2(x - 3) = 10$',
          marks: 2,
          command_term: 'CALCULATE',
          answer_block_type: 'smart_math',
          answer_block_config: {
            smartMathConfig: {
              expectedAnswer: 'x = 8',
              acceptedFormats: ['x = 8', '8', 'x=8']
            }
          }
        },
        {
          id: 'demo-q3c',
          sub_question_label: 'c',
          sub_question_text: 'Solve: $\\frac{x}{4} + 2 = 5$',
          marks: 2,
          command_term: 'CALCULATE',
          answer_block_type: 'smart_math',
          answer_block_config: {
            smartMathConfig: {
              expectedAnswer: 'x = 12',
              acceptedFormats: ['x = 12', '12', 'x=12']
            }
          }
        }
      ]
    },

    // Question 4: Table Input
    {
      id: 'demo-q4',
      question_number: 4,
      question_text: 'Complete the function table for $f(x) = 3x - 2$.',
      marks: 5,
      command_term: 'COMPLETE',
      diagram_description: 'function_table',
      answer_block_type: 'table_input',
      answer_block_config: {
        tableConfig: {
          headers: ['x', 'f(x)'],
          rows: [
            { cells: [{ value: '-2', editable: false }, { value: '', editable: true, correct: '-8' }] },
            { cells: [{ value: '-1', editable: false }, { value: '', editable: true, correct: '-5' }] },
            { cells: [{ value: '0', editable: false }, { value: '', editable: true, correct: '-2' }] },
            { cells: [{ value: '1', editable: false }, { value: '', editable: true, correct: '1' }] },
            { cells: [{ value: '2', editable: false }, { value: '', editable: true, correct: '4' }] }
          ]
        }
      }
    },

    // Question 5: Arrange/Order Steps
    {
      id: 'demo-q5',
      question_number: 5,
      question_text: 'Arrange the steps to solve the equation $2x + 6 = 14$ in the correct order.',
      marks: 4,
      command_term: 'ARRANGE',
      answer_block_type: 'arrange_order',
      answer_block_config: {
        arrangeConfig: {
          items: [
            { id: 'solve-1', content: 'Subtract 6 from both sides', correctOrder: 1 },
            { id: 'solve-2', content: '2x = 8', correctOrder: 2 },
            { id: 'solve-3', content: 'Divide both sides by 2', correctOrder: 3 },
            { id: 'solve-4', content: 'x = 4', correctOrder: 4 }
          ]
        }
      }
    },

    // Question 6: Multiple Choice
    {
      id: 'demo-q6',
      question_number: 6,
      question_text: 'Which of the following represents a linear function?',
      marks: 2,
      command_term: 'SELECT',
      answer_block_type: 'multiple_choice',
      answer_block_config: {
        mcqConfig: {
          options: [
            { id: 'opt-a', content: 'y = x² + 3', isCorrect: false },
            { id: 'opt-b', content: 'y = 2x + 5', isCorrect: true },
            { id: 'opt-c', content: 'y = √x', isCorrect: false },
            { id: 'opt-d', content: 'y = 1/x', isCorrect: false }
          ],
          allowMultiple: false
        }
      }
    },

    // Question 7: Mixed - Image Drop Zone with Venn Diagram
    {
      id: 'demo-q7',
      question_number: 7,
      question_text: 'The Venn diagram shows students taking Art (A) and Music (M) classes.\n\nTotal students = 50, Art only = 15, Music only = 12, Both = 8, Neither = 15',
      marks: 9,
      command_term: 'ANALYZE',
      diagram_description: 'venn_diagram',
      question_image_url: '/lovable-uploads/demo1-tree-diagram.jpg',
      answer_block_type: 'text_equation',
      mock_sub_questions: [
        {
          id: 'demo-q7a',
          sub_question_label: 'a',
          sub_question_text: 'Match each set notation to its meaning:',
          marks: 3,
          command_term: 'MATCH',
          answer_block_type: 'drag_drop',
          answer_block_config: {
            draggableItems: [
              { id: 'set-1', content: 'A ∩ M', color: 'red', isLatex: false },
              { id: 'set-2', content: 'A ∪ M', color: 'blue', isLatex: false },
              { id: 'set-3', content: "A'", color: 'green', isLatex: false }
            ],
            dropTargets: [
              { id: 'mean-1', label: 'Students in BOTH classes', correctItemId: 'set-1' },
              { id: 'mean-2', label: 'Students in at least one class', correctItemId: 'set-2' },
              { id: 'mean-3', label: 'Students NOT in Art', correctItemId: 'set-3' }
            ]
          }
        },
        {
          id: 'demo-q7b',
          sub_question_label: 'b',
          sub_question_text: 'Calculate $n(A \\cup M)$, the number of students in at least one class.',
          marks: 3,
          command_term: 'CALCULATE',
          answer_block_type: 'smart_math',
          answer_block_config: {
            smartMathConfig: {
              expectedAnswer: '35',
              acceptedFormats: ['35', 'n(A∪M) = 35']
            }
          }
        },
        {
          id: 'demo-q7c',
          sub_question_label: 'c',
          sub_question_text: 'What is the probability that a randomly selected student takes both Art and Music? Express as a fraction.',
          marks: 3,
          command_term: 'FIND',
          answer_block_type: 'smart_math',
          answer_block_config: {
            smartMathConfig: {
              expectedAnswer: '8/50',
              acceptedFormats: ['8/50', '4/25', '0.16', '16%']
            }
          }
        }
      ]
    }
  ]
};

// Helper function to load the demo test into the unified exam
export const loadInteractiveDemoTest = () => {
  return {
    testId: interactiveDemoSampleTest.id,
    title: interactiveDemoSampleTest.title,
    subject: interactiveDemoSampleTest.subject,
    topic: interactiveDemoSampleTest.topic,
    duration: interactiveDemoSampleTest.duration,
    questions: interactiveDemoSampleTest.questions.map(q => ({
      ...q,
      mock_sub_questions: q.mock_sub_questions?.map(sq => ({
        ...sq,
        answer_block_config: sq.answer_block_config ? JSON.stringify(sq.answer_block_config) : null
      })),
      answer_block_config: q.answer_block_config ? JSON.stringify(q.answer_block_config) : null
    }))
  };
};

export default interactiveDemoSampleTest;
