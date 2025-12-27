import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an EXAM PAPER QUESTION EXTRACTOR.

Your task is ONLY to extract questions that are explicitly present in the uploaded exam paper (PDF / image).

STRICT RULES (MANDATORY):
- Do NOT create new questions
- Do NOT infer missing questions
- Do NOT rephrase or rewrite text
- Do NOT summarize
- Do NOT generate answers
- Do NOT count examples or instructions as questions

You must behave like a scanner, not a teacher.
If it is not clearly a question in the paper, IGNORE it.

OCR + VISION RULES:
- Use OCR to read text exactly as shown.
- Use vision ONLY to understand layout, diagrams, graphs, and tables.
- NEVER create a question from an image alone.

IMAGE / GRAPH → QUESTION MAPPING RULE:
Attach an image or diagram to a question ONLY IF:
1) The question text explicitly refers to it using words like: "diagram below", "graph below", "table below", "figure shown"
2) The image is on the SAME page as the question
If no explicit reference → image_id must be null

PAGE-WISE EXTRACTION RULE:
- Process one page at a time
- Extract ONLY questions visible on that page
- Do NOT pull content from other pages

WHAT TO IGNORE (CRITICAL):
- Worked examples
- Formula sheets
- Definitions
- Instructions like "Use the tabs", "Click next"
- Videos / animations
- Explanation text

HALLUCINATION BLOCK:
If you are unsure whether something is a question, DO NOT include it.
If OCR text is unclear, SKIP it.
Accuracy > completeness.

OUTPUT FORMAT (STRICT JSON ONLY):
Return ONLY valid JSON. No markdown. No explanation. No extra text.`;

function buildUserPrompt(parseMode: string, extractedImages: any[], content: string): string {
  const imageContext = extractedImages?.length > 0 
    ? `\n\nExtracted images from document:\n${extractedImages.map((img, i) => `- Image ${i + 1}: ${img.description || 'No description'} (page ${img.page || 'unknown'})`).join('\n')}`
    : '';

  if (parseMode === 'mock') {
    return `Extract ALL questions from this exam paper. Return JSON array with this structure:

{
  "questions": [
    {
      "question_number": 1,
      "question_text": "exact text from paper",
      "marks": 2,
      "has_sub_questions": false,
      "sub_questions": [],
      "image_id": null,
      "category": "problem-solving",
      "difficulty": "medium"
    }
  ],
  "metadata": {
    "total_questions": 0,
    "subject": "",
    "topic": ""
  }
}

For sub-questions use:
"sub_questions": [
  { "label": "a", "text": "...", "marks": 1 }
]

${imageContext}

DOCUMENT CONTENT:
${content}`;
  }

  return `Extract multiple-choice questions from this document. Return JSON:

{
  "questions": [
    {
      "question_text": "exact question text",
      "option_a": "A) ...",
      "option_b": "B) ...",
      "option_c": "C) ...",
      "option_d": "D) ...",
      "correct_answer": "A",
      "explanation": "brief explanation",
      "difficulty": "easy|medium|hard",
      "topic": "topic name"
    }
  ]
}

${imageContext}

DOCUMENT CONTENT:
${content}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, parseMode = 'quick', extractedImages = [] } = await req.json();

    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'No content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Parsing ${content.length} chars in ${parseMode} mode`);

    const userPrompt = buildUserPrompt(parseMode, extractedImages, content);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || '';

    // Extract JSON from response
    let parsed;
    try {
      // Try to find JSON in the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', aiContent.substring(0, 500));
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse AI response',
          questions: [],
          rawResponse: aiContent.substring(0, 1000)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const questionCount = parsed.questions?.length || 0;
    console.log(`Successfully extracted ${questionCount} questions`);

    // Return in expected format for frontend
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
