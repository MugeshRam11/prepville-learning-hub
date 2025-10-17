import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode, subject, message, question, studentAnswer, sessionId, attemptNumber, conversationHistory, testType, topic, score, correctAnswers, totalQuestions, questions, answers, userId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Create Supabase client for database access
    const supabaseClient = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY 
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : null;

    // Handle different tutoring modes
    if (mode === 'evaluate') {
      // Answer evaluation mode
      return await evaluateAnswer({
        question,
        studentAnswer,
        attemptNumber,
        conversationHistory,
        apiKey: LOVABLE_API_KEY,
        corsHeaders
      });
    } else if (mode === 'evaluate_test') {
      // Test evaluation mode
      return await evaluateTest({
        testType,
        subject,
        topic,
        score,
        correctAnswers,
        totalQuestions,
        questions,
        answers,
        apiKey: LOVABLE_API_KEY,
        corsHeaders
      });
    } else if (mode === 'tutor') {
      // Interactive tutoring mode with user context
      return await guideTutoring({
        question,
        message,
        conversationHistory,
        subject,
        userId,
        supabaseClient,
        apiKey: LOVABLE_API_KEY,
        corsHeaders
      });
    } else {
      // Regular chat mode (backward compatibility)
      return await regularChat({
        subject,
        message,
        conversationHistory,
        apiKey: LOVABLE_API_KEY,
        corsHeaders
      });
    }

  } catch (error) {
    console.error('Error in chatbot function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        details: 'Please try again or contact support if the issue persists.'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Test Evaluation Function
async function evaluateTest({ testType, subject, topic, score, correctAnswers, totalQuestions, questions, answers, apiKey, corsHeaders }: any) {
  const evaluationPrompt = `You are an expert educational evaluator analyzing a student's ${testType} test performance.

**Test Details:**
- Subject: ${subject}
- Topic: ${topic || 'General'}
- Score: ${score}%
- Correct Answers: ${correctAnswers} out of ${totalQuestions}

${questions && questions.length > 0 ? `
**Sample Questions:**
${questions.map((q: any, i: number) => `${i + 1}. ${q.question || q.text || 'Question'}`).join('\n')}
` : ''}

Based on this performance, provide a comprehensive evaluation with:

1. **overallFeedback**: A supportive 2-3 sentence summary of their performance
2. **strengths**: Array of 2-3 specific strengths they demonstrated
3. **weaknesses**: Array of 2-3 areas that need improvement
4. **recommendations**: Array of 3-4 specific, actionable study recommendations
5. **performanceLevel**: One of: "excellent" (90-100%), "good" (70-89%), "average" (50-69%), "needs-improvement" (<50%)

Be encouraging, specific, and actionable. Focus on growth mindset.

Respond ONLY with a JSON object like:
{
  "overallFeedback": "Great job! You showed strong understanding...",
  "strengths": ["Strong grasp of basic concepts", "Good problem-solving approach"],
  "weaknesses": ["Time management needs work", "Complex problems need practice"],
  "recommendations": ["Review advanced topics", "Practice under timed conditions", "Focus on word problems"],
  "performanceLevel": "good"
}`;

  console.log('Evaluating test performance with AI...');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are an expert educational evaluator who provides constructive, encouraging feedback on student performance.' },
        { role: 'user', content: evaluationPrompt }
      ],
      temperature: 0.7
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API error:', response.status, errorText);
    throw new Error(`AI evaluation failed: ${response.status}`);
  }

  const data = await response.json();
  const aiResponse = data.choices?.[0]?.message?.content;

  if (!aiResponse) {
    throw new Error('No evaluation generated');
  }

  console.log('Raw AI test evaluation response:', aiResponse);

  // Parse JSON response
  let evaluationData;
  try {
    const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || aiResponse.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
    evaluationData = JSON.parse(jsonString);
  } catch (e) {
    console.error('Failed to parse evaluation JSON:', e);
    // Fallback evaluation based on score
    const level = score >= 90 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'average' : 'needs-improvement';
    evaluationData = {
      overallFeedback: `You scored ${score}% on this ${testType} test. Keep working on understanding the concepts!`,
      strengths: ['Completed the test', 'Showed effort in attempting questions'],
      weaknesses: ['Review incorrect answers', 'Practice similar problems'],
      recommendations: ['Review the topics covered', 'Practice with similar questions', 'Ask for help when needed'],
      performanceLevel: level
    };
  }

  console.log('Test evaluation complete:', evaluationData.performanceLevel);

  return new Response(
    JSON.stringify({ evaluation: evaluationData }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    }
  );
}

// Answer Evaluation Function
async function evaluateAnswer({ question, studentAnswer, attemptNumber, conversationHistory, apiKey, corsHeaders }: any) {
  const evaluationPrompt = `You are an expert tutor evaluating a student's answer.

**Question:** ${question.content}
**Topic:** ${question.topic}
**Difficulty:** ${question.difficulty}
**Correct Answer:** ${question.correctAnswer}
**Student's Answer:** ${studentAnswer}
**Attempt Number:** ${attemptNumber}

**Previous conversation:**
${conversationHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}

Evaluate the student's answer and provide:
1. **evaluation**: "correct", "partially_correct", or "incorrect"
2. **feedback**: Brief explanation of what's right or wrong (2-3 sentences)
3. **hint**: If incorrect or partial, provide a guiding hint WITHOUT giving away the answer (1-2 sentences)
4. **similarityScore**: Rate similarity to correct answer (0-100)

Respond ONLY with a JSON object like:
{
  "evaluation": "correct|partially_correct|incorrect",
  "feedback": "Clear feedback here",
  "hint": "Guiding hint here or null if correct",
  "similarityScore": 85
}`;

  console.log('Evaluating answer with Gemini...');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are an expert tutor who evaluates answers and provides constructive feedback.' },
        { role: 'user', content: evaluationPrompt }
      ],
      temperature: 0.7
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, errorText);
    throw new Error(`AI evaluation failed: ${response.status}`);
  }

  const data = await response.json();
  const aiResponse = data.choices?.[0]?.message?.content;

  if (!aiResponse) {
    throw new Error('No evaluation generated');
  }

  console.log('Raw AI evaluation response:', aiResponse);

  // Parse JSON response
  let evaluationData;
  try {
    // Extract JSON if wrapped in markdown code blocks
    const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || aiResponse.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
    evaluationData = JSON.parse(jsonString);
  } catch (e) {
    console.error('Failed to parse evaluation JSON:', e);
    // Fallback evaluation
    evaluationData = {
      evaluation: 'incorrect',
      feedback: 'I had trouble evaluating your answer. Let\'s try a different approach.',
      hint: 'Think about the key concepts in the question.',
      similarityScore: 0
    };
  }

  console.log('Evaluation result:', evaluationData.evaluation);

  return new Response(
    JSON.stringify(evaluationData),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    }
  );
}

// Interactive Tutoring Function
async function guideTutoring({ question, message, conversationHistory, subject, apiKey, corsHeaders, userId, supabaseClient }: any) {
  // Fetch user context for personalized tutoring
  let userContext = '';
  let knowledgeContext = '';
  
  if (userId && supabaseClient) {
    try {
      // Get user level and XP
      const { data: xpData } = await supabaseClient
        .from('user_xp')
        .select('current_level, total_xp')
        .eq('user_id', userId)
        .single();

      // Get user struggle topics
      const { data: struggleTopics } = await supabaseClient
        .from('student_struggle_topics')
        .select('subject, topic, difficulty_level, struggle_count')
        .eq('user_id', userId)
        .order('struggle_count', { ascending: false })
        .limit(5);

      // Get recent performance
      const { data: recentAttempts } = await supabaseClient
        .from('test_attempts')
        .select('score, total_questions')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(5);

      const avgScore = recentAttempts?.length 
        ? (recentAttempts.reduce((sum: number, a: any) => sum + (a.score / a.total_questions * 100), 0) / recentAttempts.length).toFixed(1)
        : 'N/A';

      userContext = `
**Student Profile:**
- Level: ${xpData?.current_level || 1} (${xpData?.total_xp || 0} XP)
- Recent Average Score: ${avgScore}%
${struggleTopics?.length ? `- Known Struggle Topics: ${struggleTopics.map((t: any) => `${t.topic} (${t.subject})`).join(', ')}` : ''}

**Tutoring Strategy:**
- Adjust explanation complexity based on student level
- Be extra patient with topics they've struggled with before
- Build on their existing knowledge
`;

      // Search knowledge base for relevant examples
      const { data: knowledgeItems, error: kbError } = await supabaseClient
        .rpc('search_knowledge_base', {
          search_query: `${question.content} ${question.topic}`,
          subject_filter: subject,
          topic_filter: question.topic,
          limit_count: 3
        });

      if (!kbError && knowledgeItems?.length > 0) {
        knowledgeContext = `\n**Related Examples from Knowledge Base:**\n`;
        knowledgeItems.forEach((item: any, idx: number) => {
          knowledgeContext += `
${idx + 1}. **Example:** ${item.question_text}
   **Answer:** ${item.correct_answer}
   **Explanation:** ${item.explanation}
   **Common Mistakes:** ${JSON.parse(item.common_mistakes || '[]').join(', ')}
   **Hints:** ${JSON.parse(item.hints || '[]').join(', ')}
`;
        });
        console.log(`Found ${knowledgeItems.length} relevant knowledge base items`);
      }
    } catch (error) {
      console.error('Failed to fetch user context:', error);
    }
  }

  const tutoringPrompt = `You are a patient, encouraging AI tutor helping a student with ${subject}.

${userContext}
${knowledgeContext}

**Question Context:**
- Topic: ${question.topic}
- Difficulty: ${question.difficulty}
- Question: ${question.content}

**Student says:** ${message}

**Previous conversation:**
${conversationHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}

**Your role:**
- Use the examples from the knowledge base to inform your teaching approach
- Learn from common mistakes students make (shown in examples)
- Guide the student step-by-step toward understanding
- Ask leading questions to help them think
- Provide hints and strategies similar to those in the knowledge base, but DON'T give away the direct answer
- Be encouraging and supportive
- Break down complex concepts into simpler parts
- Use analogies and examples when helpful
- NEVER reveal the final answer directly
- Consider their level and past struggles when explaining

CRITICAL: Respond ONLY with plain conversational text. DO NOT use JSON format. DO NOT include any JSON structure, curly braces, or field names like "response" or "messageType". Just write your tutoring response directly as if you're talking to the student.`;

  console.log('Generating tutoring guidance with user context...');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a patient, encouraging tutor who guides students through reasoning without giving away answers. You adapt your teaching style based on the student\'s level and known struggle areas.' },
        { role: 'user', content: tutoringPrompt }
      ],
      temperature: 0.8
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, errorText);
    throw new Error(`AI tutoring failed: ${response.status}`);
  }

  const data = await response.json();
  const aiResponse = data.choices?.[0]?.message?.content;

  if (!aiResponse) {
    throw new Error('No tutoring response generated');
  }

  console.log('Raw AI response (first 200 chars):', aiResponse.substring(0, 200));

  // Clean up any JSON artifacts that might still appear
  let cleanedResponse = aiResponse.trim();
  
  // Remove JSON code blocks if present
  cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  // Remove JSON object wrapper if present
  const jsonMatch = cleanedResponse.match(/\{\s*"response"\s*:\s*"(.+)"\s*,?\s*"messageType"\s*:\s*"chat"\s*\}/s);
  if (jsonMatch) {
    cleanedResponse = jsonMatch[1];
  }
  
  // Unescape any escaped characters
  cleanedResponse = cleanedResponse
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');

  const tutoringData = {
    response: cleanedResponse,
    messageType: 'chat'
  };

  console.log('Generated tutoring response with knowledge base (cleaned)');

  return new Response(
    JSON.stringify(tutoringData),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    }
  );
}

// Regular Chat Function (backward compatibility)
async function regularChat({ subject, message, conversationHistory, apiKey, corsHeaders }: any) {
  const systemPrompt = `You are "TutorBot", an AI assistant for PrepVille Learning Hub.
You help students with Biology, Economics, English, Computer Science, etc.

CRITICAL RULES:
- NEVER provide direct answers to questions
- Guide students through problem-solving step by step
- Ask leading questions to help them think
- Explain concepts and methods without solving the problem for them
- Encourage independent thinking
- Provide hints and strategies instead of solutions

Give clear explanations, break down complex topics step by step, provide examples, and ask follow-up questions if needed.
Be polite, student-friendly, and concise unless more detail is requested.`;

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  if (conversationHistory && conversationHistory.length > 0) {
    conversationHistory.forEach((msg: any) => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });
  }

  messages.push({
    role: 'user',
    content: message
  });

  console.log('Regular chat mode with Gemini for subject:', subject);

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: messages,
      temperature: 0.7
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, errorText);
    
    if (response.status === 429) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again in a moment.' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = await response.json();
  const tutorResponse = data.choices?.[0]?.message?.content;

  if (!tutorResponse) {
    throw new Error('No response generated from the model');
  }

  console.log('Successfully generated response');

  return new Response(
    JSON.stringify({ 
      response: tutorResponse,
      subject: subject 
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    }
  );
}
