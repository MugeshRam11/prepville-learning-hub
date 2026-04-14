// IB MYP Topic Hierarchy: Subject → Unit → Topic → Subtopic → Pathway

export interface TopicNode {
  subtopics: string[];
  pathway?: 'standard' | 'extended' | 'both';
}

export interface UnitNode {
  [topic: string]: TopicNode;
}

export interface SubjectTree {
  [unit: string]: UnitNode;
}

export interface TopicTreeType {
  [subject: string]: SubjectTree;
}

export const TOPIC_TREE: TopicTreeType = {
  Mathematics: {
    "Unit 1: Number": {
      "Number Forms": {
        subtopics: [
          "Writing and interpreting numbers",
          "Calculations with integers",
          "Rounding and significant figures",
          "Standard form / Scientific notation",
          "Absolute value"
        ],
        pathway: 'both'
      },
      "Ratios and Proportion": {
        subtopics: [
          "Simple ratios",
          "Direct proportion",
          "Inverse proportion",
          "Percentage increase and decrease",
          "Compound interest"
        ],
        pathway: 'both'
      },
      "Number Sets and Properties": {
        subtopics: [
          "Natural numbers, integers, rationals",
          "Irrational and real numbers",
          "Prime factorization",
          "HCF and LCM",
          "Surds and radicals"
        ],
        pathway: 'both'
      }
    },
    "Unit 2: Algebra": {
      "Algebraic Expressions": {
        subtopics: [
          "Simplifying expressions",
          "Expanding brackets",
          "Factorising expressions",
          "Algebraic fractions",
          "Index laws"
        ],
        pathway: 'both'
      },
      "Solving Equations and Inequalities": {
        subtopics: [
          "Solving linear equations",
          "Solving quadratic equations",
          "Simultaneous equations",
          "Solving inequalities",
          "Quadratic formula"
        ],
        pathway: 'both'
      },
      "Sequences and Patterns": {
        subtopics: [
          "Arithmetic sequences",
          "Geometric sequences",
          "General term (nth term)",
          "Pattern recognition",
          "Sum of sequences"
        ],
        pathway: 'extended'
      },
      "Functions": {
        subtopics: [
          "Function notation",
          "Domain and range",
          "Composite functions",
          "Inverse functions",
          "Transformations of functions"
        ],
        pathway: 'extended'
      }
    },
    "Unit 3: Geometry and Trigonometry": {
      "Properties of Shapes": {
        subtopics: [
          "Angles in polygons",
          "Congruence and similarity",
          "Circle theorems",
          "Constructions and loci"
        ],
        pathway: 'both'
      },
      "Mensuration": {
        subtopics: [
          "Area of 2D shapes",
          "Surface area of 3D shapes",
          "Volume of 3D shapes",
          "Arc length and sector area"
        ],
        pathway: 'both'
      },
      "Trigonometry": {
        subtopics: [
          "Right-angle trigonometry (SOH CAH TOA)",
          "Sine rule",
          "Cosine rule",
          "Area using sine",
          "Bearings",
          "3D trigonometry"
        ],
        pathway: 'both'
      },
      "Coordinate Geometry": {
        subtopics: [
          "Distance and midpoint",
          "Gradient and equation of a line",
          "Parallel and perpendicular lines",
          "Equation of a circle"
        ],
        pathway: 'extended'
      }
    },
    "Unit 4: Statistics and Probability": {
      "Data Collection and Representation": {
        subtopics: [
          "Types of data",
          "Frequency tables",
          "Histograms",
          "Cumulative frequency",
          "Box-and-whisker plots"
        ],
        pathway: 'both'
      },
      "Measures of Central Tendency and Spread": {
        subtopics: [
          "Mean, median, mode",
          "Range and interquartile range",
          "Standard deviation",
          "Grouped data calculations"
        ],
        pathway: 'both'
      },
      "Probability": {
        subtopics: [
          "Basic probability",
          "Combined events",
          "Tree diagrams",
          "Venn diagrams",
          "Conditional probability"
        ],
        pathway: 'both'
      }
    },
    "Unit 5: Functions and Modelling": {
      "Linear Functions": {
        subtopics: [
          "Graphs of linear functions",
          "Gradient-intercept form",
          "Modelling with linear functions",
          "Piecewise linear functions"
        ],
        pathway: 'both'
      },
      "Quadratic Functions": {
        subtopics: [
          "Graphs of quadratic functions",
          "Vertex form and completing the square",
          "Discriminant",
          "Modelling with quadratics"
        ],
        pathway: 'both'
      },
      "Exponential and Logarithmic Functions": {
        subtopics: [
          "Exponential growth and decay",
          "Logarithmic functions",
          "Laws of logarithms",
          "Modelling with exponentials"
        ],
        pathway: 'extended'
      },
      "Rational Functions": {
        subtopics: [
          "Graphs of rational functions",
          "Asymptotes",
          "Modelling with rational functions"
        ],
        pathway: 'extended'
      }
    }
  },
  Science: {
    "Unit 1: Biology": {
      "Cells": {
        subtopics: [
          "Cell structure and function",
          "Cell division (mitosis & meiosis)",
          "Specialised cells",
          "Diffusion, osmosis, active transport"
        ],
        pathway: 'both'
      },
      "Organisms": {
        subtopics: [
          "Organ systems",
          "Nutrition and digestion",
          "Respiration",
          "Photosynthesis"
        ],
        pathway: 'both'
      },
      "Ecosystems": {
        subtopics: [
          "Food chains and webs",
          "Biodiversity",
          "Human impact on environment",
          "Carbon and water cycles"
        ],
        pathway: 'both'
      }
    },
    "Unit 2: Chemistry": {
      "Atomic Structure": {
        subtopics: [
          "Atoms and elements",
          "Periodic table trends",
          "Electron configuration",
          "Isotopes"
        ],
        pathway: 'both'
      },
      "Chemical Reactions": {
        subtopics: [
          "Types of reactions",
          "Balancing equations",
          "Rates of reaction",
          "Exothermic and endothermic"
        ],
        pathway: 'both'
      },
      "Bonding and Structure": {
        subtopics: [
          "Ionic bonding",
          "Covalent bonding",
          "Metallic bonding",
          "Properties of substances"
        ],
        pathway: 'both'
      }
    },
    "Unit 3: Physics": {
      "Forces and Motion": {
        subtopics: [
          "Speed, velocity, acceleration",
          "Newton's laws",
          "Momentum",
          "Forces in equilibrium"
        ],
        pathway: 'both'
      },
      "Energy": {
        subtopics: [
          "Forms of energy",
          "Energy transfers",
          "Efficiency",
          "Renewable and non-renewable"
        ],
        pathway: 'both'
      },
      "Waves": {
        subtopics: [
          "Properties of waves",
          "Sound waves",
          "Electromagnetic spectrum",
          "Light and optics"
        ],
        pathway: 'both'
      }
    }
  },
  Physics: {
    "Unit 1: Mechanics": {
      "Kinematics": {
        subtopics: [
          "Displacement, velocity, acceleration",
          "Equations of motion",
          "Projectile motion",
          "Graphical analysis"
        ],
        pathway: 'both'
      },
      "Dynamics": {
        subtopics: [
          "Newton's laws of motion",
          "Friction and drag",
          "Momentum and impulse",
          "Work, energy, power"
        ],
        pathway: 'both'
      }
    },
    "Unit 2: Thermal Physics": {
      "Heat and Temperature": {
        subtopics: [
          "Temperature scales",
          "Specific heat capacity",
          "Latent heat",
          "Thermal equilibrium"
        ],
        pathway: 'both'
      }
    },
    "Unit 3: Waves and Optics": {
      "Wave Properties": {
        subtopics: [
          "Transverse and longitudinal waves",
          "Reflection and refraction",
          "Diffraction and interference",
          "Standing waves"
        ],
        pathway: 'both'
      }
    }
  },
  Chemistry: {
    "Unit 1: Stoichiometry": {
      "The Mole Concept": {
        subtopics: [
          "Molar mass",
          "Avogadro's number",
          "Mole calculations",
          "Empirical and molecular formula"
        ],
        pathway: 'both'
      }
    },
    "Unit 2: Atomic Structure": {
      "Electron Configuration": {
        subtopics: [
          "Energy levels and orbitals",
          "Electron arrangement",
          "Ionisation energy trends",
          "Mass spectrometry"
        ],
        pathway: 'both'
      }
    },
    "Unit 3: Periodicity": {
      "Periodic Trends": {
        subtopics: [
          "Atomic radius",
          "Electronegativity",
          "Ionization energy",
          "Metallic and non-metallic character"
        ],
        pathway: 'both'
      }
    }
  },
  Biology: {
    "Unit 1: Cell Biology": {
      "Cell Theory": {
        subtopics: [
          "Cell structure (prokaryotes vs eukaryotes)",
          "Cell organelles and functions",
          "Microscopy techniques",
          "Stem cells"
        ],
        pathway: 'both'
      },
      "Cell Division": {
        subtopics: [
          "Mitosis",
          "Meiosis",
          "Cell cycle regulation",
          "Chromosomes and genes"
        ],
        pathway: 'both'
      }
    },
    "Unit 2: Molecular Biology": {
      "Biochemistry": {
        subtopics: [
          "Carbohydrates",
          "Lipids",
          "Proteins",
          "Nucleic acids",
          "Enzymes"
        ],
        pathway: 'both'
      }
    },
    "Unit 3: Genetics": {
      "Inheritance": {
        subtopics: [
          "Mendelian genetics",
          "Punnett squares",
          "Dihybrid crosses",
          "Sex-linked inheritance",
          "Genetic modification"
        ],
        pathway: 'both'
      }
    }
  },
  "Language & Literature": {
    "Unit 1: Analysing": {
      "Text Analysis": {
        subtopics: [
          "Literary devices and techniques",
          "Author's purpose and tone",
          "Structure and form",
          "Context and meaning"
        ],
        pathway: 'both'
      }
    },
    "Unit 2: Organising": {
      "Essay Writing": {
        subtopics: [
          "Thesis statements",
          "Paragraph structure",
          "Evidence and analysis",
          "Cohesive writing"
        ],
        pathway: 'both'
      }
    },
    "Unit 3: Producing Text": {
      "Creative Writing": {
        subtopics: [
          "Narrative techniques",
          "Descriptive writing",
          "Persuasive writing",
          "Comparative essays"
        ],
        pathway: 'both'
      }
    }
  },
  "Social Studies": {
    "Unit 1: Individuals and Societies": {
      "History": {
        subtopics: [
          "Causes and effects of events",
          "Source analysis",
          "Historical perspectives",
          "Change and continuity"
        ],
        pathway: 'both'
      },
      "Geography": {
        subtopics: [
          "Population and settlement",
          "Resources and sustainability",
          "Globalisation",
          "Development indicators"
        ],
        pathway: 'both'
      }
    }
  }
};

// ─── Helper functions ────────────────────────────────────────

/** Get all subjects */
export function getSubjects(): string[] {
  return Object.keys(TOPIC_TREE);
}

/** Get units for a subject */
export function getUnits(subject: string): string[] {
  return subject && TOPIC_TREE[subject] ? Object.keys(TOPIC_TREE[subject]) : [];
}

/** Get topics for a subject + unit */
export function getTopics(subject: string, unit: string): string[] {
  return subject && unit && TOPIC_TREE[subject]?.[unit]
    ? Object.keys(TOPIC_TREE[subject][unit])
    : [];
}

/** Get subtopics for a subject + unit + topic */
export function getSubtopics(subject: string, unit: string, topic: string): string[] {
  return TOPIC_TREE[subject]?.[unit]?.[topic]?.subtopics ?? [];
}

/** Get pathway for a subject + unit + topic */
export function getPathway(subject: string, unit: string, topic: string): string | undefined {
  return TOPIC_TREE[subject]?.[unit]?.[topic]?.pathway;
}

/** Map DB subject enum values to display names */
export const SUBJECT_DB_TO_DISPLAY: Record<string, string> = {
  'mathematics': 'Mathematics',
  'science': 'Science',
  'physics': 'Physics',
  'chemistry': 'Chemistry',
  'biology': 'Biology',
  'language_literature': 'Language & Literature',
  'social_studies': 'Social Studies',
};

export const SUBJECT_DISPLAY_TO_DB: Record<string, string> = Object.fromEntries(
  Object.entries(SUBJECT_DB_TO_DISPLAY).map(([k, v]) => [v, k])
);

/** Flatten entire tree for search */
export function searchTopicTree(query: string): Array<{
  subject: string;
  unit: string;
  topic: string;
  subtopic: string;
  pathway?: string;
}> {
  const q = query.toLowerCase();
  const results: Array<{
    subject: string;
    unit: string;
    topic: string;
    subtopic: string;
    pathway?: string;
  }> = [];

  for (const [subject, units] of Object.entries(TOPIC_TREE)) {
    for (const [unit, topics] of Object.entries(units)) {
      for (const [topic, node] of Object.entries(topics)) {
        for (const subtopic of node.subtopics) {
          if (
            subject.toLowerCase().includes(q) ||
            unit.toLowerCase().includes(q) ||
            topic.toLowerCase().includes(q) ||
            subtopic.toLowerCase().includes(q)
          ) {
            results.push({ subject, unit, topic, subtopic, pathway: node.pathway });
          }
        }
      }
    }
  }

  return results;
}
