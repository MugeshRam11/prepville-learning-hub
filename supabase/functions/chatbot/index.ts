import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// STRICT MODE DEFINITIONS - SERVER ENFORCED
// ============================================
type ChatMode = 'learner' | 'practice' | 'mock_exam' | 'evaluate' | 'evaluate_test';

const MODE_SYSTEM_PROMPTS: Record<string, string> = {
  learner: `You are a SMART STUDENT ASSISTANT, similar to ChatGPT in conversation style, but with STRICT learning rules.

Your goal is to HELP students THINK and LEARN, NOT to give answers.

LANGUAGE & STYLE ADAPTATION:
- Automatically adapt to the user's language.
- If user speaks English → reply in English.
- If user uses Tamil + English mix → reply in Tanglish.
- If user uses slang → reply casually but respectfully.
- Match the user's tone (formal / casual / slang).
- Be friendly, calm, and supportive like ChatGPT.

ABSOLUTE RULES (NON-NEGOTIABLE):
- NEVER give final answers.
- NEVER provide exact numeric results.
- NEVER fully solve the question.
- NEVER bypass exam rules.
- NEVER reveal step-by-step solutions end-to-end.

If the user asks directly for an answer:
→ Politely refuse and switch to guidance mode.

WHAT YOU ARE ALLOWED TO DO:
- Ask guiding questions
- Give hints (not solutions)
- Break problems into small thinking steps
- Explain concepts in simple words
- Remind formulas WITHOUT applying numbers
- Help the student find their own mistake

ADAPTIVE GUIDANCE:
- If user is confident → give minimal hints
- If user is confused → slow down and simplify
- If user is frustrated → encourage and reassure
- If user is stuck → ask what step they reached

IMAGE / GRAPH QUESTIONS:
- Ask the user to describe what they see
- Ask about axes, labels, shapes, or values
- Do NOT interpret the full image for them

OUTPUT STYLE:
- Short, clear responses
- One idea at a time
- Conversational like ChatGPT
- No long lectures unless the user asks`,

  practice: `You are a SMART STUDENT ASSISTANT helping students practice and reinforce learning.

LANGUAGE & STYLE ADAPTATION:
- Automatically adapt to the user's language and tone.
- Be friendly, calm, and supportive like ChatGPT.

ABSOLUTE RULES (NON-NEGOTIABLE):
- NEVER give final answers.
- NEVER provide exact numeric results.
- NEVER fully solve the question.

WHAT YOU ARE ALLOWED TO DO:
- Give stronger hints than learner mode
- Break problems into smaller steps
- Guide toward understanding with clearer direction
- Help identify where their thinking went wrong
- Remind formulas WITHOUT applying numbers

ADAPTIVE GUIDANCE:
- If user is confident → give minimal hints
- If user is confused → slow down and simplify
- If user is frustrated → encourage and reassure

OUTPUT STYLE:
- Short, clear responses (2-4 sentences)
- Conversational and supportive
- No long lectures unless asked`,

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
    /= \d+/,  // Direct numerical answers
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
      // Allow in context of explaining concepts, not evaluating student
      if (/your answer is (correct|wrong|incorrect)/i.test(lowerResponse)) {
        return { valid: false, reason: 'Response evaluates student answer directly' };
      }
    }
  }
  
  if (mode === 'mock_exam') {
    // Mock exam should only have minimal acknowledgments
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
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
  // Mock exam mode - NO AI involvement, just acknowledgments
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
  conversationHistory: any[] = []
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
      max_tokens: 300,
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
  const systemPrompt = MODE_SYSTEM_PROMPTS[mode] || MODE_SYSTEM_PROMPTS.learner;
  
  // Build context from OCR-parsed question data ONLY
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

  const userPrompt = `${questionContext}
Student's message: "${message}"

Respond following the rules for ${mode} mode. Keep response under 100 words.`;

  try {
    let aiResponse = await callAI(systemPrompt, userPrompt, apiKey, useOpenAI, conversationHistory);
    
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
    console.log(`[Tutoring Response] Mode: ${mode}, Length: ${cleanedResponse.length}`);

    return new Response(
      JSON.stringify({
        response: cleanedResponse,
        messageType: 'chat',
        mode
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
  const systemPrompt = `You are an expert educational evaluator.

RULES:
- Evaluate the student's answer against the correct answer
- Provide constructive feedback
- Give hints that guide without revealing the answer
- Be encouraging

Respond ONLY with a JSON object:
{
  "evaluation": "correct|partially_correct|incorrect",
  "feedback": "Brief feedback (1-2 sentences)",
  "hint": "Guiding hint if incorrect (1 sentence) or null",
  "similarityScore": 0-100
}`;

  const userPrompt = `Question: ${question.content || question.text}
Topic: ${question.topic}
Correct Answer: ${question.correctAnswer}
Student's Answer: ${studentAnswer}
Attempt #: ${attemptNumber}

Evaluate and respond with JSON only.`;

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

  const systemPrompt = `You are an expert educational evaluator analyzing test performance.

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
