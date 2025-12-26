// Sample Interactive Mock Test Data - mocktest2
// IB MYP Mathematics Grade 8-9

export type QuestionType = 
  | 'graph_interaction' 
  | 'drag_drop_match' 
  | 'image_drop_zone' 
  | 'step_builder' 
  | 'math_input'
  | 'text_input';

export interface GraphInteractionData {
  type: 'plot_point' | 'draw_line' | 'shade_region';
  equation?: string;
  targetPoint?: { x: number; y: number; tolerance?: number };
  expectedSlope?: number;
  expectedIntercept?: number;
}

export interface DragDropMatchData {
  items: { id: string; content: string; isLatex?: boolean }[];
  targets: { id: string; label: string; image?: string; correctItemId: string }[];
}

export interface ImageDropZoneData {
  imageUrl: string;
  dropZones: {
    id: string;
    x: number; // percentage from left
    y: number; // percentage from top
    correctLabel: string;
  }[];
  draggableLabels: { id: string; content: string }[];
}

export interface StepBuilderData {
  steps: { id: string; content: string; correctOrder: number }[];
}

export interface MathInputData {
  expectedAnswer: string;
  acceptedFormats?: string[]; // Alternative correct formats
  hint?: string;
}

export interface InteractiveQuestion {
  id: string;
  questionNumber: number;
  text: string;
  marks: number;
  questionType: QuestionType;
  interactionData?: GraphInteractionData | DragDropMatchData | ImageDropZoneData | StepBuilderData | MathInputData;
  hints?: string[];
  feedback?: {
    correct: string;
    partial?: string;
    incorrect: string;
  };
}

export interface InteractiveMockTest {
  id: string;
  title: string;
  subject: string;
  board: string;
  grade: string;
  duration: number; // in minutes
  totalMarks: number;
  questions: InteractiveQuestion[];
}

export const mocktest2: InteractiveMockTest = {
  id: 'mocktest2',
  title: 'Interactive Model Test',
  subject: 'IB MYP Mathematics',
  board: 'IB',
  grade: '8-9',
  duration: 20,
  totalMarks: 20,
  questions: [
    // QUESTION 1 - Graph Interaction (5 marks)
    {
      id: 'q1-graph',
      questionNumber: 1,
      text: 'The graph below represents a linear function: $f(x) = 2x + 1$\n\n**Task:**\n1. Plot the point where $x = 2$\n2. Draw the full straight line for the function',
      marks: 5,
      questionType: 'graph_interaction',
      interactionData: {
        type: 'plot_point',
        equation: 'f(x) = 2x + 1',
        targetPoint: { x: 2, y: 5, tolerance: 0.3 },
        expectedSlope: 2,
        expectedIntercept: 1
      } as GraphInteractionData,
      hints: [
        'Substitute x = 2 into the equation to find the y-value',
        'Remember: slope is the coefficient of x',
        'The y-intercept is where the line crosses the y-axis (when x = 0)'
      ],
      feedback: {
        correct: 'Excellent! Your point is at (2, 5) and the line has the correct slope of 2.',
        partial: 'Your point is correct! Now check if the slope matches the equation.',
        incorrect: 'Think about what f(2) equals. Substitute x = 2 into 2x + 1.'
      }
    },

    // QUESTION 2 - Drag & Drop Equation Matching (4 marks)
    {
      id: 'q2-dragdrop',
      questionNumber: 2,
      text: 'Match each equation to its correct graph.',
      marks: 4,
      questionType: 'drag_drop_match',
      interactionData: {
        items: [
          { id: 'eq1', content: 'y = x²', isLatex: true },
          { id: 'eq2', content: 'y = 2x', isLatex: true },
          { id: 'eq3', content: 'y = -x + 3', isLatex: true },
          { id: 'eq4', content: 'y = |x|', isLatex: true }
        ],
        targets: [
          { id: 'graph1', label: 'Parabola (U-shape)', correctItemId: 'eq1' },
          { id: 'graph2', label: 'Steep positive line through origin', correctItemId: 'eq2' },
          { id: 'graph3', label: 'Negative slope line', correctItemId: 'eq3' },
          { id: 'graph4', label: 'V-shaped graph', correctItemId: 'eq4' }
        ]
      } as DragDropMatchData,
      hints: [
        'A quadratic equation (x²) creates a parabola',
        'The sign of the slope determines if a line goes up or down',
        'Absolute value |x| creates a V-shape'
      ],
      feedback: {
        correct: 'Perfect! You correctly matched all equations to their graphs.',
        partial: 'Some matches are correct. Check the graph shapes carefully.',
        incorrect: 'Review the basic shapes: parabolas, lines, and V-shapes.'
      }
    },

    // QUESTION 3 - Image Drop Zone (4 marks)
    {
      id: 'q3-imagedrop',
      questionNumber: 3,
      text: 'A triangle is shown below. Drag the correct angle measures to the correct vertices.\n\n**Note:** The angles must sum to 180°.',
      marks: 4,
      questionType: 'image_drop_zone',
      interactionData: {
        imageUrl: '/placeholder.svg',
        dropZones: [
          { id: 'vertex-a', x: 50, y: 10, correctLabel: '30°' },
          { id: 'vertex-b', x: 15, y: 85, correctLabel: '50°' },
          { id: 'vertex-c', x: 85, y: 85, correctLabel: '100°' }
        ],
        draggableLabels: [
          { id: 'angle1', content: '30°' },
          { id: 'angle2', content: '50°' },
          { id: 'angle3', content: '100°' }
        ]
      } as ImageDropZoneData,
      hints: [
        'The largest angle is always opposite the longest side',
        'All angles in a triangle sum to 180°',
        'Look at the visual proportions of the triangle'
      ],
      feedback: {
        correct: 'Great work! You correctly placed all angle measures.',
        partial: 'Some angles are correct. Remember the angle-side relationship.',
        incorrect: 'The largest angle goes opposite the longest side.'
      }
    },

    // QUESTION 4 - Step-wise Solution Builder (5 marks)
    {
      id: 'q4-stepbuilder',
      questionNumber: 4,
      text: 'Solve the equation: $2x + 5 = 13$\n\nArrange the solution steps in the correct order.',
      marks: 5,
      questionType: 'step_builder',
      interactionData: {
        steps: [
          { id: 'step1', content: 'Subtract 5 from both sides', correctOrder: 1 },
          { id: 'step2', content: '2x = 8', correctOrder: 2 },
          { id: 'step3', content: 'Divide both sides by 2', correctOrder: 3 },
          { id: 'step4', content: 'x = 4', correctOrder: 4 }
        ]
      } as StepBuilderData,
      hints: [
        'Start by isolating the term with x',
        'Perform the same operation on both sides',
        'The final answer should be x = some number'
      ],
      feedback: {
        correct: 'Excellent! You arranged all steps correctly. This is exactly how IB examiners mark method marks.',
        partial: 'Some steps are in the correct order. Think about what you need to do first to isolate x.',
        incorrect: 'Start by getting the x-term alone. What operation removes +5?'
      }
    },

    // QUESTION 5 - Smart Math Input (2 marks)
    {
      id: 'q5-mathinput',
      questionNumber: 5,
      text: 'A bag contains 3 red balls and 2 blue balls.\n\nWhat is the probability of picking a blue ball?',
      marks: 2,
      questionType: 'math_input',
      interactionData: {
        expectedAnswer: '2/5',
        acceptedFormats: ['2/5', '\\frac{2}{5}', '0.4', '40%'],
        hint: 'Probability = favorable outcomes ÷ total outcomes'
      } as MathInputData,
      hints: [
        'Count the total number of balls first',
        'Probability = (what you want) / (total possibilities)',
        'Express your answer as a fraction'
      ],
      feedback: {
        correct: 'Perfect! 2/5 is correct. There are 2 blue balls out of 5 total.',
        partial: 'Your format is different but the value is correct!',
        incorrect: 'Count the blue balls (numerator) and total balls (denominator).'
      }
    }
  ]
};

export default mocktest2;
