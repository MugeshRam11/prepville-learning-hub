import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an EXAM PAPER QUESTION EXTRACTOR.

Your task is ONLY to extract questions that are explicitly present in the uploaded exam paper.

STRICT RULES (MANDATORY):
- Do NOT create new questions
- Do NOT infer missing questions
- Do NOT rephrase or rewrite text
- Do NOT summarize
- Do NOT generate answers
- Do NOT count examples or instructions as questions

You must behave like a scanner, not a teacher.
If it is not clearly a question in the paper, IGNORE it.

QUESTION STRUCTURE PATTERNS TO RECOGNIZE:
- "Question 1 (6 marks)" = main question with total marks
- "Question 1a (1 mark)" = sub-question with label "a" and 1 mark
- "Question 1b (3 marks)" = sub-question with label "b" and 3 marks
- Marks in parentheses indicate point value

IMAGE/DIAGRAM HANDLING:
- If a question references "the diagram", "the graph", "the figure", note has_diagram: true
- Do NOT create questions from images alone

WHAT TO IGNORE:
- Headers/footers (QuintoPrep, www.quintoprep.com, etc.)
- "Scroll down to continue"
- Formula sheets
- Navigation instructions
- Styling markers (B, I, U, x², Ω, Styles, etc.)

OUTPUT FORMAT (STRICT JSON ONLY):
Return ONLY valid JSON. No markdown. No explanation. No extra text.`;

function buildUserPrompt(parseMode: string, content: string, fileName?: string): string {
  if (parseMode === 'mock') {
    return `Extract ALL questions from this exam paper: ${fileName || 'document'}

Return JSON with this exact structure:
{
  "metadata": {
    "title": "extracted title or filename",
    "subject": "mathematics",
    "topic": "General",
    "total_questions": number
  },
  "questions": [
    {
      "question_number": 1,
      "question_text": "exact text of the main question",
      "marks": 6,
      "has_sub_questions": true,
      "has_diagram": false,
      "difficulty": "medium",
      "sub_questions": [
        { "label": "a", "text": "exact sub-question text", "marks": 1 },
        { "label": "b", "text": "exact sub-question text", "marks": 3 }
      ]
    }
  ]
}

PARSING RULES:
1. "Question X (N marks)" = main question number X with N total marks
2. "Question Xa (N mark)" = sub-question with label "a", N marks
3. Group sub-questions under their parent question
4. If no sub-questions, set has_sub_questions: false and sub_questions: []

DOCUMENT CONTENT:
${content}`;
  }

  return `Extract questions from this document. Return JSON:

{
  "questions": [
    {
      "question_text": "exact question text",
      "options": ["A) option", "B) option", "C) option", "D) option"],
      "correct_answer": "A",
      "explanation": "",
      "difficulty": "medium"
    }
  ]
}

DOCUMENT CONTENT:
${content}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, parseMode = 'quick', fileName } = await req.json();

    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No content provided', questions: [] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log(`Parsing ${content.length} chars in ${parseMode} mode using GPT-4o`);

    const userPrompt = buildUserPrompt(parseMode, content, fileName);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0,
        max_tokens: 8000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.', questions: [] }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || '';

    console.log('GPT-4o response received, parsing JSON...');

    let parsed;
    try {
      parsed = JSON.parse(aiContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', aiContent.substring(0, 500));
      
      // Try to extract JSON from response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Failed to parse AI response',
            questions: []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const questionCount = parsed.questions?.length || 0;
    console.log(`Successfully extracted ${questionCount} questions`);

    return new Response(
      JSON.stringify({
        success: true,
        data: parsed,
        questions: parsed.questions || [],
        parsed_count: questionCount,
        actionMode: 'parse'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Parser error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message, 
        questions: [] 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
