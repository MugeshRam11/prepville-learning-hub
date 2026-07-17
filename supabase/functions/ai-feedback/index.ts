import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAiUsage, extractUsage } from '../_shared/aiUsage.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeedbackRequest {
  questionId: string;
  questionText: string;
  answerKey?: string;
  studentAnswer: any;
  commandTerm?: string;
  marks?: number;
}

interface FeedbackResponse {
  isOnTrack: boolean;
  feedback: string;
  hint: string;
  missingElements: string[];
  partialScore?: number;
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body: FeedbackRequest = await req.json();
    const { questionId, questionText, answerKey, studentAnswer, commandTerm, marks } = body;

    if (!questionText || !studentAnswer) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: questionText and studentAnswer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the prompt for AI evaluation
    const prompt = `You are an expert IB MYP Mathematics examiner providing instant feedback on a student's answer.

QUESTION:
${questionText}

${commandTerm ? `COMMAND TERM: ${commandTerm}` : ''}
${marks ? `MARKS: ${marks}` : ''}
${answerKey ? `MODEL ANSWER (for reference): ${answerKey}` : ''}

STUDENT'S ANSWER:
${typeof studentAnswer === 'string' ? studentAnswer : JSON.stringify(studentAnswer)}

Analyze the student's answer and provide feedback in JSON format with these exact fields:
{
  "isOnTrack": boolean (true if the answer shows correct understanding/approach, even if incomplete),
  "feedback": "2-3 sentences explaining what's good or needs improvement",
  "hint": "A helpful hint without giving away the answer (1-2 sentences)",
  "missingElements": ["list of key elements missing from the answer, max 3 items"],
  "partialScore": number between 0 and 1 representing estimated completion/correctness
}

Be encouraging but accurate. Use LaTeX notation with $ delimiters for any mathematical expressions.
RESPOND ONLY WITH VALID JSON, no markdown code blocks.`;

    // Call AI API
    const apiKey = lovableKey || openRouterKey;
    if (!apiKey) {
      // Fallback response if no API key
      const fallbackResponse: FeedbackResponse = {
        isOnTrack: true,
        feedback: "Your answer has been recorded. Keep working on showing your complete solution with all steps.",
        hint: "Make sure to show all your working and explain your reasoning clearly.",
        missingElements: [],
        partialScore: 0.5
      };
      
      return new Response(
        JSON.stringify(fallbackResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://prepville-learning-hub.lovable.app',
        'X-Title': 'PrepVille AI Feedback'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!aiResponse.ok) {
      console.error('AI API error:', await aiResponse.text());
      throw new Error('Failed to get AI response');
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    // Real-cost tracking for the admin Billing section — never blocks feedback.
    const { promptTokens, completionTokens } = extractUsage(aiData);
    await logAiUsage({
      functionName: 'ai-feedback',
      model: 'google/gemini-2.0-flash-001',
      promptTokens,
      completionTokens,
      userId: user.id,
    });

    // Parse AI response
    let feedbackData: FeedbackResponse;
    try {
      // Clean up the response (remove markdown code blocks if present)
      let cleanContent = aiContent.trim();
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }
      feedbackData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      feedbackData = {
        isOnTrack: true,
        feedback: "Your answer has been analyzed. Continue showing your working clearly.",
        hint: "Review the question requirements and ensure you've addressed all parts.",
        missingElements: [],
        partialScore: 0.5
      };
    }

    // Validate and sanitize response
    const response: FeedbackResponse = {
      isOnTrack: Boolean(feedbackData.isOnTrack),
      feedback: String(feedbackData.feedback || "Answer received."),
      hint: String(feedbackData.hint || ""),
      missingElements: Array.isArray(feedbackData.missingElements) 
        ? feedbackData.missingElements.slice(0, 3).map(String)
        : [],
      partialScore: typeof feedbackData.partialScore === 'number' 
        ? Math.max(0, Math.min(1, feedbackData.partialScore))
        : undefined
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-feedback function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        isOnTrack: true,
        feedback: "We couldn't analyze your answer right now. Please try again.",
        hint: "",
        missingElements: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
