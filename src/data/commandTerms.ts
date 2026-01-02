export interface CommandTerm {
  id: string;
  term: string;
  definition: string;
  example?: string;
  category: string;
}

export interface CommandTermCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  terms: CommandTerm[];
}

export const commandTermsData: CommandTermCategory[] = [
  {
    id: 'calculation',
    name: 'Calculation & Problem Solving',
    icon: 'Calculator',
    color: 'hsl(211 100% 50%)',
    description: 'Terms that require mathematical operations and finding solutions',
    terms: [
      {
        id: 'apply',
        term: 'Apply',
        definition: 'Use knowledge and understanding in response to a given situation or real circumstances.',
        category: 'calculation'
      },
      {
        id: 'calculate',
        term: 'Calculate',
        definition: 'Obtain a numerical answer showing the relevant stages in the working.',
        category: 'calculation'
      },
      {
        id: 'estimate',
        term: 'Estimate',
        definition: 'Obtain an approximate value for an unknown quantity.',
        category: 'calculation'
      },
      {
        id: 'measure',
        term: 'Measure',
        definition: 'Obtain a value for a quantity.',
        category: 'calculation'
      },
      {
        id: 'solve',
        term: 'Solve',
        definition: 'Obtain the answer(s) using algebraic and/or numerical and/or graphical methods.',
        category: 'calculation'
      },
      {
        id: 'show',
        term: 'Show',
        definition: 'Provide structured evidence that leads to a given result.',
        category: 'calculation'
      },
      {
        id: 'verify',
        term: 'Verify',
        definition: 'Provide evidence that validates the result.',
        category: 'calculation'
      }
    ]
  },
  {
    id: 'reasoning',
    name: 'Reasoning & Proof',
    icon: 'Lightbulb',
    color: 'hsl(280 70% 55%)',
    description: 'Terms that require logical thinking and mathematical justification',
    terms: [
      {
        id: 'demonstrate',
        term: 'Demonstrate',
        definition: 'Make clear by reasoning or evidence, illustrating with examples or practical application.',
        category: 'reasoning'
      },
      {
        id: 'derive',
        term: 'Derive',
        definition: 'Manipulate a mathematical relationship to give a new equation or relationship.',
        category: 'reasoning'
      },
      {
        id: 'explain',
        term: 'Explain',
        definition: 'Give a detailed account including reasons or causes.',
        category: 'reasoning'
      },
      {
        id: 'justify',
        term: 'Justify',
        definition: 'Give valid reasons or evidence to support an answer or conclusion.',
        category: 'reasoning'
      },
      {
        id: 'prove',
        term: 'Prove',
        definition: 'Use a sequence of logical steps to obtain the required result in a formal way.',
        category: 'reasoning'
      }
    ]
  },
  {
    id: 'visual',
    name: 'Visual & Graphical Representation',
    icon: 'LineChart',
    color: 'hsl(160 70% 45%)',
    description: 'Terms that involve creating diagrams, graphs, and visual representations',
    terms: [
      {
        id: 'annotate',
        term: 'Annotate',
        definition: 'Add brief notes to a diagram or graph.',
        category: 'visual'
      },
      {
        id: 'construct',
        term: 'Construct',
        definition: 'Draw accurately using geometric instruments and appropriate techniques.',
        category: 'visual'
      },
      {
        id: 'draw',
        term: 'Draw',
        definition: 'Represent by means of a labelled, accurate diagram or graph, using a pencil.',
        category: 'visual'
      },
      {
        id: 'label',
        term: 'Label',
        definition: 'Add labels to a diagram.',
        category: 'visual'
      },
      {
        id: 'plot',
        term: 'Plot',
        definition: 'Mark the position of points on a diagram.',
        category: 'visual'
      },
      {
        id: 'sketch',
        term: 'Sketch',
        definition: 'Represent by means of a diagram or graph. A sketch should give a general idea of the required shape and be labelled.',
        category: 'visual'
      },
      {
        id: 'trace',
        term: 'Trace',
        definition: 'Follow and record the development of something.',
        category: 'visual'
      }
    ]
  },
  {
    id: 'thinking',
    name: 'Thinking & Interpretation',
    icon: 'Brain',
    color: 'hsl(343 100% 65%)',
    description: 'Terms that require analysis, interpretation, and critical thinking',
    terms: [
      {
        id: 'comment',
        term: 'Comment',
        definition: 'Give a judgment based on a given statement or result of a calculation.',
        category: 'thinking'
      },
      {
        id: 'discuss',
        term: 'Discuss',
        definition: 'Offer a considered and balanced review that includes a range of arguments, factors or hypotheses.',
        category: 'thinking'
      },
      {
        id: 'predict',
        term: 'Predict',
        definition: 'Give an expected result of an upcoming action or event.',
        category: 'thinking'
      },
      {
        id: 'suggest',
        term: 'Suggest',
        definition: 'Propose a solution, hypothesis or other possible answer.',
        category: 'thinking'
      }
    ]
  },
  {
    id: 'identification',
    name: 'Identification & Organization',
    icon: 'ClipboardList',
    color: 'hsl(48 100% 50%)',
    description: 'Terms that require identifying, organizing, and presenting information',
    terms: [
      {
        id: 'identify',
        term: 'Identify',
        definition: 'Provide an answer from a number of possibilities. Recognize and state briefly a distinguishing fact or feature.',
        category: 'identification'
      },
      {
        id: 'organize',
        term: 'Organize',
        definition: 'Put ideas and information into a proper or systematic order.',
        category: 'identification'
      },
      {
        id: 'select',
        term: 'Select',
        definition: 'Choose from a list or group.',
        category: 'identification'
      },
      {
        id: 'state',
        term: 'State',
        definition: 'Give a specific name, value or other brief answer without explanation or calculation.',
        category: 'identification'
      },
      {
        id: 'use',
        term: 'Use',
        definition: 'Apply knowledge or rules to put theory into practice.',
        category: 'identification'
      },
      {
        id: 'write-down',
        term: 'Write down',
        definition: 'Obtain the answer(s), usually by extracting information. Little or no calculation is required.',
        category: 'identification'
      }
    ]
  }
];

export const getAllTerms = (): CommandTerm[] => {
  return commandTermsData.flatMap(category => category.terms);
};

export const searchTerms = (query: string): CommandTerm[] => {
  const lowerQuery = query.toLowerCase();
  return getAllTerms().filter(
    term =>
      term.term.toLowerCase().includes(lowerQuery) ||
      term.definition.toLowerCase().includes(lowerQuery)
  );
};
