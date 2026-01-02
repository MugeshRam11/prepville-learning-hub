import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Answer {
  questionId: string;
  answer: any;
  questionType: string;
}

interface EvaluationResult {
  questionId: string;
  isCorrect: boolean;
  partialCredit: number;
  marksAwarded: number;
  totalMarks: number;
  feedback: string;
  commandTermFollowed: boolean;
  commandTerm: string | null;
  missingElements: string[];
}

// Command term evaluation rules
const COMMAND_TERM_RULES: Record<string, {
  description: string;
  requirements: string[];
  penalties: string[];
}> = {
  CALCULATE: {
    description: "Obtain a numerical answer showing the relevant stages in the working",
    requirements: [
      "Show clear working steps",
      "Present correct mathematical method",
      "Arrive at correct final numerical answer",
      "Include units where applicable"
    ],
    penalties: [
      "Only final answer without steps: -50% marks",
      "Correct steps but wrong final answer: partial credit",
      "Missing units: minor penalty"
    ]
  },
  JUSTIFY: {
    description: "Give valid reasons or evidence to support an answer or conclusion",
    requirements: [
      "Provide mathematical reasoning",
      "Reference relevant properties, rules, or theorems",
      "Present clear logical connection to conclusion",
      "State explicit conclusion"
    ],
    penalties: [
      "Correct answer but no reasoning: -70% marks",
      "Reasoning without conclusion: -30% marks",
      "Vague or incomplete reasoning: partial credit"
    ]
  },
  EXPLAIN: {
    description: "Give a detailed account including reasons or causes",
    requirements: [
      "Provide clear verbal explanation",
      "Show logical flow of ideas",
      "Demonstrate cause-effect relationships",
      "Use appropriate mathematical terminology"
    ],
    penalties: [
      "Only equations without explanation: -60% marks",
      "Incomplete explanation: partial credit",
      "Missing logical connection: -40% marks"
    ]
  },
  STATE: {
    description: "Give a specific name, value or other brief answer without explanation",
    requirements: [
      "Provide short, direct answer",
      "Be precise and specific",
      "No extended explanation required"
    ],
    penalties: [
      "Overly long answer: no penalty but note unnecessary",
      "Vague answer: -50% marks"
    ]
  },
  PROVE: {
    description: "Use a sequence of logical steps to obtain the required result",
    requirements: [
      "Start with given information or definitions",
      "Present logical sequence of mathematical steps",
      "Each step must follow logically from previous",
      "Conclude with required result clearly stated"
    ],
    penalties: [
      "Jumping to conclusion: -70% marks",
      "Missing logical steps: partial credit based on completeness",
      "Circular reasoning: -80% marks"
    ]
  },
  DERIVE: {
    description: "Obtain an answer using appropriate logical steps",
    requirements: [
      "Show clear derivation process",
      "Use valid mathematical operations",
      "Progress logically from start to result"
    ],
    penalties: [
      "Missing intermediate steps: -40% marks",
      "Incorrect operations: -50% marks"
    ]
  },
  DEMONSTRATE: {
    description: "Make clear by reasoning or evidence",
    requirements: [
      "Provide clear evidence or reasoning",
      "Show understanding of concept",
      "Use examples if appropriate"
    ],
    penalties: [
      "Weak evidence: -50% marks",
      "No clear demonstration: -70% marks"
    ]
  },
  VERIFY: {
    description: "Provide evidence that validates the result",
    requirements: [
      "Show verification method",
      "Confirm result through alternative approach or substitution",
      "State that result is verified"
    ],
    penalties: [
      "No verification shown: -80% marks",
      "Incomplete verification: -40% marks"
    ]
  },
  APPLY: {
    description: "Use knowledge and understanding in response to a given situation",
    requirements: [
      "Correctly identify relevant concept/formula",
      "Apply appropriately to given situation",
      "Show working and result"
    ],
    penalties: [
      "Wrong concept applied: -60% marks",
      "Correct concept but wrong application: -40% marks"
    ]
  },
  ESTIMATE: {
    description: "Obtain an approximate value for an unknown quantity",
    requirements: [
      "Show estimation approach",
      "Use reasonable approximations",
      "Arrive at sensible approximate value"
    ],
    penalties: [
      "Unreasonable estimate: -70% marks",
      "No method shown: -40% marks"
    ]
  },
  MEASURE: {
    description: "Obtain a value for a quantity",
    requirements: [
      "Show measurement approach",
      "Include appropriate units",
      "Provide accurate value"
    ],
    penalties: [
      "Missing units: -30% marks",
      "Inaccurate value: partial credit"
    ]
  },
  SOLVE: {
    description: "Obtain the answer(s) using algebraic and/or numerical methods",
    requirements: [
      "Show clear method",
      "Perform correct algebraic/numerical operations",
      "State all valid solutions"
    ],
    penalties: [
      "Missing solutions: -30% per missing solution",
      "No working shown: -50% marks"
    ]
  },
  SHOW: {
    description: "Obtain the answer showing all working",
    requirements: [
      "Show ALL working steps clearly",
      "Present logical progression",
      "Arrive at required answer"
    ],
    penalties: [
      "Incomplete working: -40% marks",
      "Skipping steps: -30% marks"
    ]
  },
  ANNOTATE: {
    description: "Add brief notes to a diagram or graph",
    requirements: [
      "Add relevant labels/notes",
      "Annotations must be clear and correct",
      "Position annotations appropriately"
    ],
    penalties: [
      "Incorrect annotations: -50% marks",
      "Missing key annotations: -40% marks"
    ]
  },
  CONSTRUCT: {
    description: "Display information in a diagrammatic or logical form",
    requirements: [
      "Create accurate construction",
      "Use appropriate tools/methods",
      "Show construction marks where relevant"
    ],
    penalties: [
      "Inaccurate construction: partial credit",
      "Missing construction lines: -30% marks"
    ]
  },
  DRAW: {
    description: "Represent by means of a labelled, accurate diagram or graph",
    requirements: [
      "Create accurate diagram/graph",
      "Include all required labels",
      "Use appropriate scale if applicable"
    ],
    penalties: [
      "Missing labels: -30% marks",
      "Inaccurate representation: -50% marks"
    ]
  },
  LABEL: {
    description: "Add title, labels or brief explanation(s) to a diagram or graph",
    requirements: [
      "Add all required labels",
      "Labels must be correct and clear",
      "Position labels appropriately"
    ],
    penalties: [
      "Missing labels: -40% per missing label",
      "Incorrect labels: -50% marks"
    ]
  },
  PLOT: {
    description: "Mark the position of points on a diagram",
    requirements: [
      "Plot points accurately",
      "Use correct scale",
      "Mark points clearly"
    ],
    penalties: [
      "Inaccurate plotting: partial credit",
      "Missing points: -30% per point"
    ]
  },
  SKETCH: {
    description: "Represent by means of a diagram or graph showing essential features",
    requirements: [
      "Show key features of shape/graph",
      "Correct general shape/trend",
      "Label key points if applicable"
    ],
    penalties: [
      "Missing essential features: -40% marks",
      "Incorrect shape: -60% marks"
    ]
  },
  TRACE: {
    description: "Follow and record the action of an algorithm",
    requirements: [
      "Show each step of algorithm",
      "Record intermediate values",
      "Follow correct order"
    ],
    penalties: [
      "Missing steps: -30% per step",
      "Incorrect tracing: -50% marks"
    ]
  },
  COMMENT: {
    description: "Give a judgment based on a given statement or result",
    requirements: [
      "Provide clear judgment",
      "Reference given statement/result",
      "Use appropriate reasoning"
    ],
    penalties: [
      "No clear judgment: -60% marks",
      "Unsubstantiated comment: -40% marks"
    ]
  },
  DISCUSS: {
    description: "Offer a considered and balanced review with range of arguments",
    requirements: [
      "Present multiple perspectives",
      "Balance different viewpoints",
      "Provide reasoned analysis"
    ],
    penalties: [
      "One-sided discussion: -50% marks",
      "Superficial analysis: -40% marks"
    ]
  },
  PREDICT: {
    description: "Give an expected result of an upcoming action or event",
    requirements: [
      "State clear prediction",
      "Base on given information/patterns",
      "Reasoning should be logical"
    ],
    penalties: [
      "Unreasoned prediction: -50% marks",
      "Illogical prediction: -60% marks"
    ]
  },
  SUGGEST: {
    description: "Propose a solution, hypothesis or other possible answer",
    requirements: [
      "Propose reasonable solution",
      "Base on available information",
      "Show some justification"
    ],
    penalties: [
      "Unreasonable suggestion: -60% marks",
      "No justification: -30% marks"
    ]
  },
  IDENTIFY: {
    description: "Provide an answer from a number of possibilities",
    requirements: [
      "Select correct option",
      "Be specific in identification"
    ],
    penalties: [
      "Wrong identification: 0 marks",
      "Vague identification: -50% marks"
    ]
  },
  ORGANIZE: {
    description: "Put ideas and information into a proper or systematic order",
    requirements: [
      "Present in logical order",
      "Show clear organization",
      "Group related items appropriately"
    ],
    penalties: [
      "Disorganized: -50% marks",
      "Illogical ordering: -40% marks"
    ]
  },
  SELECT: {
    description: "Choose from a list or group",
    requirements: [
      "Choose correct item(s)",
      "Be specific in selection"
    ],
    penalties: [
      "Wrong selection: 0 marks",
      "Partial correct selection: partial credit"
    ]
  },
  USE: {
    description: "Apply knowledge or rules to put theory into practice",
    requirements: [
      "Apply correct knowledge/rules",
      "Show proper application",
      "Arrive at correct result"
    ],
    penalties: [
      "Wrong application: -60% marks",
      "Incomplete application: -40% marks"
    ]
  },
  "WRITE DOWN": {
    description: "Obtain the answer(s) usually without showing working",
    requirements: [
      "Provide correct answer",
      "Working not required but may be shown"
    ],
    penalties: [
      "Wrong answer: 0 marks"
    ]
  }
};

function buildCommandTermPrompt(commandTerm: string | null): string {
  if (!commandTerm) {
    return "Evaluate the answer based on mathematical correctness and completeness.";
  }

  const term = commandTerm.toUpperCase();
  const rules = COMMAND_TERM_RULES[term];
  
  if (!rules) {
    return `The command term is "${commandTerm}". Evaluate whether the student followed this instruction appropriately.`;
  }

  return `
COMMAND TERM: ${term}
Definition: ${rules.description}

REQUIRED ELEMENTS:
${rules.requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

PENALTY RULES:
${rules.penalties.map(p => `• ${p}`).join('\n')}

STRICT EVALUATION: The student MUST follow the command term requirements. A mathematically correct answer that does not follow the command term format should receive reduced marks.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { answers, testId } = await req.json();
    
    if (!answers || !Array.isArray(answers)) {
      throw new Error('Answers array is required');
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch questions with answer keys AND command terms
    const questionIds = answers.map(a => a.questionId);
    const { data: questions, error: questionsError } = await supabase
      .from('mock_questions')
      .select('id, question_text, answer_key, marks, diagram_description, command_term')
      .in('id', questionIds);

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      throw new Error('Failed to fetch questions');
    }

    const results: EvaluationResult[] = [];
    let totalScore = 0;
    let totalPossibleMarks = 0;

    for (const studentAnswer of answers) {
      const question = questions?.find(q => q.id === studentAnswer.questionId);
      
      if (!question) {
        console.warn(`Question ${studentAnswer.questionId} not found`);
        continue;
      }

      totalPossibleMarks += question.marks;
      const commandTerm = question.command_term || null;
      const commandTermPrompt = buildCommandTermPrompt(commandTerm);

      // Build the evaluation prompt with command term awareness
      const evaluationPrompt = `You are an IB MYP Mathematics exam evaluator. Evaluate the student's answer STRICTLY based on the command term requirements.

${commandTermPrompt}

---

QUESTION: ${question.question_text}

EXPECTED ANSWER/KEY: ${question.answer_key || 'Not provided - use mathematical logic to verify'}

DIAGRAM/CONTEXT: ${question.diagram_description || 'None'}

STUDENT'S ANSWER: ${JSON.stringify(studentAnswer.answer)}

QUESTION TYPE: ${studentAnswer.questionType}

MAXIMUM MARKS: ${question.marks}

---

EVALUATION INSTRUCTIONS:
1. First, check if the answer is mathematically correct
2. Then, critically evaluate if the student followed the command term requirements
3. A correct answer that doesn't follow the command term format should receive REDUCED marks
4. Identify specific missing elements based on command term requirements

Respond with ONLY a valid JSON object (no markdown, no explanation):
{
  "isCorrect": boolean,
  "partialCredit": number between 0 and 1,
  "commandTermFollowed": boolean (did student follow the command term format?),
  "missingElements": ["list of specific missing elements based on command term requirements"],
  "feedback": "Specific feedback referencing the command term. Start with 'Since the command term was [TERM], you needed to...' if requirements weren't met"
}`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { 
                role: "system", 
                content: `You are an expert IB MYP Mathematics examiner. You evaluate strictly according to command term requirements. 
                
CRITICAL RULES:
- A mathematically correct answer that ignores the command term receives reduced marks
- You must identify missing elements based on the specific command term
- Feedback must reference the command term and what was required
- Be fair but strict about format requirements

Respond only with valid JSON.` 
              },
              { role: "user", content: evaluationPrompt }
            ],
            temperature: 0.1,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error('AI evaluation error:', errorText);
          
          // Check for rate limit or credit errors
          if (aiResponse.status === 429 || aiResponse.status === 402) {
            results.push({
              questionId: studentAnswer.questionId,
              isCorrect: false,
              partialCredit: 0,
              marksAwarded: 0,
              totalMarks: question.marks,
              feedback: aiResponse.status === 402 
                ? "AI evaluation credits exhausted. Please contact support."
                : "Too many requests. Please try again later.",
              commandTermFollowed: false,
              commandTerm: commandTerm,
              missingElements: ["Evaluation unavailable"]
            });
            continue;
          }
          
          // Fallback evaluation
          results.push({
            questionId: studentAnswer.questionId,
            isCorrect: false,
            partialCredit: 0,
            marksAwarded: 0,
            totalMarks: question.marks,
            feedback: "Unable to evaluate automatically. Please review with your teacher.",
            commandTermFollowed: false,
            commandTerm: commandTerm,
            missingElements: []
          });
          continue;
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || '';
        
        // Parse the JSON response
        let evaluation;
        try {
          const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
          evaluation = JSON.parse(cleanContent);
        } catch (parseError) {
          console.error('Failed to parse AI response:', content);
          evaluation = {
            isCorrect: false,
            partialCredit: 0,
            commandTermFollowed: false,
            missingElements: [],
            feedback: "Evaluation pending manual review."
          };
        }

        const marksAwarded = Math.round(question.marks * evaluation.partialCredit * 10) / 10;
        totalScore += marksAwarded;

        results.push({
          questionId: studentAnswer.questionId,
          isCorrect: evaluation.isCorrect,
          partialCredit: evaluation.partialCredit,
          marksAwarded,
          totalMarks: question.marks,
          feedback: evaluation.feedback,
          commandTermFollowed: evaluation.commandTermFollowed ?? true,
          commandTerm: commandTerm,
          missingElements: evaluation.missingElements || []
        });

      } catch (evalError) {
        console.error('Evaluation error for question:', studentAnswer.questionId, evalError);
        results.push({
          questionId: studentAnswer.questionId,
          isCorrect: false,
          partialCredit: 0,
          marksAwarded: 0,
          totalMarks: question.marks,
          feedback: "Error during evaluation. Please try again.",
          commandTermFollowed: false,
          commandTerm: commandTerm,
          missingElements: []
        });
      }
    }

    const response = {
      results,
      summary: {
        totalScore,
        totalPossibleMarks,
        percentage: totalPossibleMarks > 0 ? Math.round((totalScore / totalPossibleMarks) * 100) : 0,
        questionsEvaluated: results.length,
        commandTermCompliance: results.filter(r => r.commandTermFollowed).length
      }
    };

    console.log('Evaluation complete:', response.summary);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in evaluate-interactive-answers:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
