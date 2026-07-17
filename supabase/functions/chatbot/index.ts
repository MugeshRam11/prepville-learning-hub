import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { logAiUsage, extractUsage } from '../_shared/aiUsage.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// AUTHENTICATION HELPER
// ============================================
async function validateAuth(req: Request): Promise<{ user: any; error: string | null }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { user: null, error: 'Missing authorization header' };
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { user: null, error: 'Server configuration error' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const token = authHeader.replace('Bearer ', '');
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return { user: null, error: 'Invalid authentication token' };
  }

  return { user, error: null };
}

// ============================================
// MYP MATHEMATICS COMMAND TERMS
// ============================================
const MYP_COMMAND_TERMS: Record<string, { definition: string; responseStyle: string }> = {
  'annotate': {
    definition: 'Add brief notes to a diagram or graph',
    responseStyle: 'Add concise labels or notes without explanation'
  },
  'apply': {
    definition: 'Use knowledge and understanding in response to a given situation or real circumstances',
    responseStyle: 'Show application of concept to the specific problem'
  },
  'calculate': {
    definition: 'Obtain a numerical answer showing the relevant stages in the working',
    responseStyle: 'Show ALL intermediate steps with clear working. Display each step on new line'
  },
  'comment': {
    definition: 'Give a judgment based on a given statement or result of a calculation',
    responseStyle: 'Provide brief analytical judgment'
  },
  'construct': {
    definition: 'Display information in a diagrammatic or logical form',
    responseStyle: 'Present information as diagram description or logical structure'
  },
  'demonstrate': {
    definition: 'Make clear by reasoning or evidence, illustrating with examples or practical application',
    responseStyle: 'Focus on reasoning with practical examples'
  },
  'derive': {
    definition: 'Manipulate a mathematical relationship to give a new equation or relationship',
    responseStyle: 'Show step-by-step algebraic manipulation'
  },
  'describe': {
    definition: 'Give a detailed account or picture of a situation, event, pattern, or process',
    responseStyle: 'Provide detailed explanation of the pattern or process'
  },
  'discuss': {
    definition: 'Offer a considered and balanced review with arguments supported by evidence',
    responseStyle: 'Present multiple perspectives with supporting evidence'
  },
  'draw': {
    definition: 'Represent by means of a labelled, accurate diagram or graph',
    responseStyle: 'Describe diagram/graph with labels and accurate details'
  },
  'estimate': {
    definition: 'Obtain an approximate value for an unknown quantity',
    responseStyle: 'Provide approximation with reasoning for estimate'
  },
  'explain': {
    definition: 'Give a detailed account including reasons or causes',
    responseStyle: 'Focus on WHY - give reasons and causes, not just steps'
  },
  'identify': {
    definition: 'Provide an answer from a number of possibilities. Recognize and state briefly',
    responseStyle: 'Give ONLY the identified answer with NO explanation'
  },
  'justify': {
    definition: 'Give valid reasons or evidence to support an answer or conclusion',
    responseStyle: 'Provide evidence and logical reasoning to support the answer'
  },
  'label': {
    definition: 'Add title, labels, or brief explanation(s) to a diagram or graph',
    responseStyle: 'Provide labels without extended explanation'
  },
  'measure': {
    definition: 'Obtain a value for a quantity',
    responseStyle: 'Provide the measured value with appropriate units'
  },
  'organize': {
    definition: 'Put ideas and information into a proper or systematic order',
    responseStyle: 'Present information in logical, structured order'
  },
  'plot': {
    definition: 'Mark the position of points on a diagram',
    responseStyle: 'Describe point positions with coordinates'
  },
  'predict': {
    definition: 'Give an expected result of an upcoming action or event',
    responseStyle: 'Provide prediction with brief reasoning'
  },
  'prove': {
    definition: 'Use a sequence of logical steps to obtain the required result in a formal way',
    responseStyle: 'Use FORMAL logical structure: Given → Show → Therefore'
  },
  'select': {
    definition: 'Choose from a list or group',
    responseStyle: 'Give ONLY the selected answer with NO explanation'
  },
  'show': {
    definition: 'Give the steps in a calculation or derivation',
    responseStyle: 'Display ALL steps in the working clearly'
  },
  'sketch': {
    definition: 'Represent by means of a diagram or graph showing general shape or relationship',
    responseStyle: 'Describe the general shape with relevant features'
  },
  'solve': {
    definition: 'Obtain the answer(s) using algebraic, numerical, or graphical methods',
    responseStyle: 'Show complete solution with ALL steps using appropriate method'
  },
  'state': {
    definition: 'Give a specific name, value, or other brief answer without explanation or calculation',
    responseStyle: 'Give ONLY the answer with NO explanation, NO working'
  },
  'suggest': {
    definition: 'Propose a solution, hypothesis, or other possible answer',
    responseStyle: 'Offer a proposed solution with brief reasoning'
  },
  'trace': {
    definition: 'Follow and record the action of an algorithm',
    responseStyle: 'Show step-by-step execution of the algorithm'
  },
  'use': {
    definition: 'Apply knowledge or rules to put theory into practice',
    responseStyle: 'Apply the rule/theory to the specific situation'
  },
  'verify': {
    definition: 'Provide evidence that validates the result',
    responseStyle: 'Show evidence/check that confirms the result is correct'
  },
  'write down': {
    definition: 'Obtain the answer(s), usually by extracting information. Little or no calculation required',
    responseStyle: 'Give the answer directly with minimal or no working'
  }
};

// Detect command term in text
function detectCommandTerm(text: string): { term: string; definition: string; responseStyle: string } | null {
  const lowerText = text.toLowerCase();
  
  // Check for each command term (check longer phrases first)
  const sortedTerms = Object.keys(MYP_COMMAND_TERMS).sort((a, b) => b.length - a.length);
  
  for (const term of sortedTerms) {
    // Match at word boundaries
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    if (regex.test(lowerText)) {
      return {
        term,
        definition: MYP_COMMAND_TERMS[term].definition,
        responseStyle: MYP_COMMAND_TERMS[term].responseStyle
      };
    }
  }
  
  return null;
}

// ============================================
// LATEX FORMATTING RULES
// ============================================
const LATEX_SYSTEM_RULES = `
LATEX FORMATTING - MANDATORY:
All mathematical notation MUST be in LaTeX format. NEVER write math in plain text.

RULES:
- Use $...$ for inline math: $x^2 + 2x + 1$
- Use $$...$$ for display/block math: $$\\frac{a}{b} = c$$
- Common patterns:
  • Fractions: $\\frac{numerator}{denominator}$
  • Powers: $x^2$, $x^{10}$
  • Subscripts: $x_1$, $a_{n+1}$
  • Square roots: $\\sqrt{16}$, $\\sqrt[3]{27}$
  • Greek letters: $\\pi$, $\\theta$, $\\alpha$
  • Multiplication: $\\times$ or $\\cdot$
  • Division: $\\div$ or $\\frac{a}{b}$
  • Equals/inequalities: $=$, $\\neq$, $<$, $>$, $\\leq$, $\\geq$
  • Plus/minus: $\\pm$
  • Summation: $\\sum_{i=1}^{n}$
  • Integral: $\\int_{a}^{b}$
  • Limits: $\\lim_{x \\to 0}$
  • Trigonometry: $\\sin$, $\\cos$, $\\tan$
  • Logarithms: $\\log$, $\\ln$

WRONG: x^2 + 2x + 1 = 0, sqrt(16) = 4, pi = 3.14
CORRECT: $x^2 + 2x + 1 = 0$, $\\sqrt{16} = 4$, $\\pi \\approx 3.14$
`;

// ============================================
// STRICT MODE DEFINITIONS - SERVER ENFORCED
// ============================================
type ChatMode = 'learner' | 'practice' | 'mock_exam' | 'evaluate' | 'evaluate_test';

const MODE_SYSTEM_PROMPTS: Record<string, string> = {
  learner: `You are an MYP MATHEMATICS SMART STUDENT ASSISTANT.

${LATEX_SYSTEM_RULES}

MYP COMMAND TERM RECOGNITION:
When a question contains a command term, respond STRICTLY according to its definition:
- "State", "Identify", "Select", "Write down": Give ONLY the final response with NO explanation
- "Calculate", "Solve", "Show": Include ALL intermediate steps
- "Explain", "Justify", "Demonstrate": Focus on reasoning, not just answers
- "Prove": Use formal logical structure (Given → Proof → Therefore)
- "Describe": Give detailed account of pattern/process
- "Derive": Show step-by-step algebraic manipulation

LANGUAGE & STYLE ADAPTATION:
- Automatically adapt to the user's language.
- If user speaks English → reply in English.
- If user uses Tamil + English mix → reply in Tanglish.
- Match the user's tone (formal / casual).
- Be friendly, calm, and supportive.

ABSOLUTE RULES (NON-NEGOTIABLE):
- NEVER give final answers directly unless command term requires it.
- NEVER bypass learning rules.
- In student-assist mode, GUIDE the learner without revealing the answer.

WHAT YOU ARE ALLOWED TO DO:
- Ask guiding questions
- Give hints (not solutions)
- Break problems into small thinking steps
- Explain concepts in simple words
- Remind formulas using LaTeX WITHOUT applying numbers
- Help the student find their own mistake

ADAPTIVE GUIDANCE:
- If user is confident → give minimal hints
- If user is confused → slow down and simplify
- If user is frustrated → encourage and reassure

OUTPUT STYLE:
- Short, clear responses
- One idea at a time
- ALL math in LaTeX format`,

  practice: `You are an MYP MATHEMATICS PRACTICE ASSISTANT.

${LATEX_SYSTEM_RULES}

MYP COMMAND TERM RECOGNITION:
Respond STRICTLY according to the command term in the question:
- "State", "Identify", "Select": Give ONLY the answer, NO explanation
- "Calculate", "Solve", "Show": Show ALL working steps
- "Explain", "Justify": Focus on reasoning and causes
- "Prove": Use formal logical proof structure

LANGUAGE & STYLE ADAPTATION:
- Automatically adapt to the user's language and tone.
- Be friendly, calm, and supportive.

WHAT YOU ARE ALLOWED TO DO:
- Give stronger hints than learner mode
- Break problems into smaller steps
- Guide toward understanding with clearer direction
- Help identify where their thinking went wrong
- Remind formulas using LaTeX

OUTPUT STYLE:
- Short, clear responses (2-4 sentences)
- ALL mathematical notation in LaTeX
- Conversational and supportive`,

  mock_exam: `You are a strict exam monitor. This is a mock exam environment.

CRITICAL RULES - ABSOLUTELY NO EXCEPTIONS:
1. Provide NO hints whatsoever
2. Provide NO explanations
3. Provide NO guidance
4. Only acknowledge that input was received

ALLOWED RESPONSES ONLY:
- "Your answer has been recorded."
- "Proceeding to the next question."
- "Please select an answer to continue."
- "Time remaining: [if provided]"

ANY request for help MUST be declined with:
"This is an exam environment. Please submit your best answer."`,
};

// ============================================
// RESPONSE VALIDATION
// ============================================
function validateResponse(response: string, mode: ChatMode): { valid: boolean; reason?: string } {
  const lowerResponse = response.toLowerCase();
  
  // Patterns that indicate answer revelation
  const answerPatterns = [
    /the (?:correct |right )?answer is/i,
    /option [a-d] is (?:correct|right)/i,
    /you should (?:choose|select|pick) [a-d]/i,
    /the solution is/i,
    /(?:it's|its|it is) [a-d]\b/i,
  ];
  
  if (mode === 'learner' || mode === 'practice') {
    for (const pattern of answerPatterns) {
      if (pattern.test(response)) {
        return { valid: false, reason: 'Response reveals answer' };
      }
    }
    
    // Check for explicit correct/wrong statements
    if (/\b(correct|wrong|right answer|incorrect)\b/i.test(lowerResponse)) {
      if (/your answer is (correct|wrong|incorrect)/i.test(lowerResponse)) {
        return { valid: false, reason: 'Response evaluates student answer directly' };
      }
    }
  }
  
  if (mode === 'mock_exam') {
    const allowedPhrases = [
      'recorded', 'proceeding', 'next question', 'select an answer', 
      'exam environment', 'submit your', 'time remaining'
    ];
    const hasAllowedPhrase = allowedPhrases.some(phrase => lowerResponse.includes(phrase));
    if (!hasAllowedPhrase && response.length > 100) {
      return { valid: false, reason: 'Mock exam response too detailed' };
    }
  }
  
  return { valid: true };
}

// ============================================
// SAFE FALLBACK RESPONSES
// ============================================
const FALLBACK_RESPONSES: Record<string, string> = {
  learner: "Let's think about this step by step. What do you notice about the problem first?",
  practice: "I can help you work through this. What part would you like to focus on?",
  mock_exam: "Your answer has been recorded.",
};

// ============================================
// MAIN HANDLER
// ============================================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const { user, error: authError } = await validateAuth(req);
    if (authError) {
      console.error('[Chatbot] Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: authError }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Chatbot] Authenticated user:', user.id);

    const requestData = await req.json();
    const { 
      mode = 'learner',
      subject, 
      message, 
      question, 
      studentAnswer, 
      sessionId, 
      attemptNumber, 
      conversationHistory = [], 
      testType, 
      topic, 
      score, 
      correctAnswers, 
      totalQuestions, 
      questions, 
      answers, 
      userId 
    } = requestData;

    // Use OpenAI API key (GPT-4)
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Prefer OpenAI, fallback to Lovable AI
    const useOpenAI = !!OPENAI_API_KEY;
    const apiKey = OPENAI_API_KEY || LOVABLE_API_KEY;
    
    if (!apiKey) {
      throw new Error('No AI API key configured (OPENAI_API_KEY or LOVABLE_API_KEY required)');
    }

    const supabaseClient = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY 
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : null;

    console.log(`[Chatbot] Mode: ${mode}, Using: ${useOpenAI ? 'OpenAI GPT-4' : 'Lovable AI'}`);

    // Log AI request for audit
    const logEntry = {
      timestamp: new Date().toISOString(),
      mode,
      userId: userId || 'anonymous',
      subject,
      messageLength: message?.length || 0,
    };
    console.log('[Chatbot Audit]', JSON.stringify(logEntry));

    // Route based on mode
    if (mode === 'evaluate') {
      return await evaluateAnswer({
        question,
        studentAnswer,
        attemptNumber,
        conversationHistory,
        apiKey,
        useOpenAI,
        corsHeaders
      });
    } else if (mode === 'evaluate_test') {
      return await evaluateTest({
        testType,
        subject,
        topic,
        score,
        correctAnswers,
        totalQuestions,
        questions,
        answers,
        apiKey,
        useOpenAI,
        corsHeaders
      });
    } else if (mode === 'mock_exam') {
      return await handleMockExam({
        message,
        corsHeaders
      });
    } else {
      // learner or practice mode
      return await guideTutoring({
        mode: mode as 'learner' | 'practice',
        question,
        message,
        conversationHistory,
        subject,
        userId,
        supabaseClient,
        apiKey,
        useOpenAI,
        corsHeaders
      });
    }

  } catch (error) {
    console.error('[Chatbot Error]', error);
    return new Response(
      JSON.stringify({ 
        error: 'AI tutoring service temporarily unavailable.',
        details: 'Please try again in a moment.'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// ============================================
// MOCK EXAM HANDLER - NO AI CALLS
// ============================================
async function handleMockExam({ message, corsHeaders }: any) {
  console.log('[MockExam] Answer recorded (no AI call)');
  
  return new Response(
    JSON.stringify({
      response: "Your answer has been recorded. Please proceed to the next question.",
      messageType: 'acknowledgment',
      mode: 'mock_exam'
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    }
  );
}

// ============================================
// AI API CALL HELPER
// ============================================
async function callAI(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  useOpenAI: boolean,
  conversationHistory: any[] = [],
  logCtx: { userId?: string | null } = {}
): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-6).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    })),
    { role: 'user', content: userPrompt }
  ];

  const endpoint = useOpenAI 
    ? 'https://api.openai.com/v1/chat/completions'
    : 'https://ai.gateway.lovable.dev/v1/chat/completions';
  
  const model = useOpenAI ? 'gpt-4o' : 'google/gemini-2.5-flash';

  console.log(`[AI Call] Endpoint: ${endpoint}, Model: ${model}`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[AI Error]', response.status, errorText);
    
    if (response.status === 429) {
      throw new Error('AI service rate limited. Please try again later.');
    }
    if (response.status === 402) {
      throw new Error('AI service quota exceeded.');
    }
    throw new Error(`AI request failed: ${response.status}`);
  }

  const data = await response.json();

  // Real-cost tracking for the admin Billing section — never blocks the response.
  const { promptTokens, completionTokens } = extractUsage(data);
  await logAiUsage({
    functionName: 'chatbot',
    model,
    promptTokens,
    completionTokens,
    userId: logCtx.userId ?? null,
  });

  return data.choices?.[0]?.message?.content || '';
}

// ============================================
// GUIDED TUTORING (LEARNER & PRACTICE MODES)
// ============================================
async function guideTutoring({
  mode,
  question,
  message,
  conversationHistory,
  subject,
  userId,
  supabaseClient,
  apiKey,
  useOpenAI,
  corsHeaders
}: any) {
  const baseSystemPrompt = MODE_SYSTEM_PROMPTS[mode] || MODE_SYSTEM_PROMPTS.learner;
  
  // Detect MYP command term in the question or message
  const questionText = question?.content || question?.text || message || '';
  const detectedCommand = detectCommandTerm(questionText);
  
  let commandTermInstructions = '';
  if (detectedCommand) {
    console.log(`[MYP] Detected command term: "${detectedCommand.term}"`);
    commandTermInstructions = `
DETECTED COMMAND TERM: "${detectedCommand.term.toUpperCase()}"
Definition: ${detectedCommand.definition}
REQUIRED RESPONSE STYLE: ${detectedCommand.responseStyle}

You MUST follow this response style exactly. Do not add extra explanation if the command term doesn't require it.
`;
  }

  // Build context from OCR-parsed question data
  let questionContext = '';
  if (question) {
    questionContext = `
QUESTION CONTEXT (from OCR-parsed content):
- Topic: ${question.topic || 'General'}
- Difficulty: ${question.difficulty || 'medium'}
- Question Text: ${question.content || question.text || 'No question provided'}
${question.options ? `- Options: ${JSON.stringify(question.options)}` : ''}

IMPORTANT: Only use the above question data. Do not invent or assume additional information.
`;
  }

  const systemPrompt = baseSystemPrompt + commandTermInstructions;

  const userPrompt = `${questionContext}
Student's message: "${message}"

Respond following the rules for ${mode} mode.${detectedCommand ? ` Use the "${detectedCommand.term}" command term response style.` : ''}
Remember: ALL mathematical expressions MUST use LaTeX formatting ($...$).`;

  try {
    let aiResponse = await callAI(systemPrompt, userPrompt, apiKey, useOpenAI, conversationHistory, { userId });

    // Validate response doesn't violate mode rules
    const validation = validateResponse(aiResponse, mode as ChatMode);
    if (!validation.valid) {
      console.warn(`[Validation Failed] ${validation.reason} - Using fallback`);
      aiResponse = FALLBACK_RESPONSES[mode] || FALLBACK_RESPONSES.learner;
    }

    // Clean up response
    let cleanedResponse = aiResponse.trim()
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/\{"response":\s*"/g, '')
      .replace(/"\s*\}/g, '');

    // Log for audit
    console.log(`[Tutoring Response] Mode: ${mode}, Command: ${detectedCommand?.term || 'none'}, Length: ${cleanedResponse.length}`);

    return new Response(
      JSON.stringify({
        response: cleanedResponse,
        messageType: 'chat',
        mode,
        detectedCommandTerm: detectedCommand?.term || null
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('[Tutoring Error]', error);
    return new Response(
      JSON.stringify({
        response: FALLBACK_RESPONSES[mode] || "I'm here to help. What would you like to explore?",
        messageType: 'error',
        mode
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  }
}

// ============================================
// ANSWER EVALUATION
// ============================================
async function evaluateAnswer({ 
  question, 
  studentAnswer, 
  attemptNumber, 
  conversationHistory, 
  apiKey, 
  useOpenAI,
  corsHeaders 
}: any) {
  const systemPrompt = `You are an expert MYP Mathematics evaluator.

${LATEX_SYSTEM_RULES}

RULES:
- Evaluate the student's answer against the correct answer
- Provide constructive feedback using LaTeX for any mathematical notation
- Give hints that guide without revealing the answer
- Be encouraging

Respond ONLY with a JSON object:
{
  "evaluation": "correct|partially_correct|incorrect",
  "feedback": "Brief feedback using LaTeX for math (1-2 sentences)",
  "hint": "Guiding hint if incorrect using LaTeX (1 sentence) or null",
  "similarityScore": 0-100
}`;

  const userPrompt = `Question: ${question.content || question.text}
Topic: ${question.topic}
Correct Answer: ${question.correctAnswer}
Student's Answer: ${studentAnswer}
Attempt #: ${attemptNumber}

Evaluate and respond with JSON only. Use LaTeX for all mathematical expressions.`;

  try {
    const aiResponse = await callAI(systemPrompt, userPrompt, apiKey, useOpenAI, conversationHistory);
    
    // Parse JSON response
    let evaluationData;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      evaluationData = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
    } catch {
      evaluationData = {
        evaluation: 'incorrect',
        feedback: 'Let me help you think about this differently.',
        hint: 'Consider the key concepts in the question.',
        similarityScore: 0
      };
    }

    console.log(`[Evaluation] Result: ${evaluationData.evaluation}`);

    return new Response(
      JSON.stringify(evaluationData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('[Evaluation Error]', error);
    return new Response(
      JSON.stringify({
        evaluation: 'error',
        feedback: 'Unable to evaluate at the moment. Please try again.',
        hint: null,
        similarityScore: 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  }
}

// ============================================
// TEST EVALUATION
// ============================================
async function evaluateTest({ 
  testType, 
  subject, 
  topic, 
  score, 
  correctAnswers, 
  totalQuestions, 
  questions, 
  answers, 
  apiKey, 
  useOpenAI,
  corsHeaders 
}: any) {
  const validScore = Math.max(0, Math.min(100, score || 0));
  const validCorrect = Math.max(0, correctAnswers || 0);

  const systemPrompt = `You are an expert MYP Mathematics evaluator analyzing test performance.

${LATEX_SYSTEM_RULES}

Provide constructive analysis focusing on:
- Overall performance assessment
- Specific areas needing improvement
- Actionable recommendations

Respond ONLY with a JSON object:
{
  "overallFeedback": "1-2 sentence assessment",
  "weaknesses": ["specific area 1", "specific area 2", "specific area 3"],
  "recommendations": ["action 1", "action 2", "action 3", "action 4"],
  "performanceLevel": "excellent|good|average|needs-improvement"
}`;

  const userPrompt = `Test: ${testType}
Subject: ${subject}
Topic: ${topic || 'General'}
Score: ${validScore}%
Correct: ${validCorrect}/${totalQuestions}

Analyze this performance and provide improvement guidance.`;

  try {
    const aiResponse = await callAI(systemPrompt, userPrompt, apiKey, useOpenAI, []);
    
    let evaluationData;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      evaluationData = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
    } catch {
      const level = validScore >= 90 ? 'excellent' : validScore >= 70 ? 'good' : validScore >= 50 ? 'average' : 'needs-improvement';
      evaluationData = {
        overallFeedback: `You scored ${validScore}% (${validCorrect}/${totalQuestions} correct).`,
        weaknesses: ['Review incorrect answers', 'Focus on problem areas', 'Practice more'],
        recommendations: ['Review each incorrect answer', 'Identify patterns in mistakes', 'Practice similar problems', 'Seek help on difficult topics'],
        performanceLevel: level
      };
    }

    console.log(`[Test Evaluation] Performance: ${evaluationData.performanceLevel}`);

    return new Response(
      JSON.stringify({ evaluation: evaluationData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('[Test Evaluation Error]', error);
    const level = validScore >= 90 ? 'excellent' : validScore >= 70 ? 'good' : validScore >= 50 ? 'average' : 'needs-improvement';
    return new Response(
      JSON.stringify({
        evaluation: {
          overallFeedback: `You scored ${validScore}%.`,
          weaknesses: ['Unable to analyze specific areas'],
          recommendations: ['Review your answers', 'Practice more questions'],
          performanceLevel: level
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  }
}
