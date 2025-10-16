import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, fileType, parseMode = 'quick' } = await req.json();
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build adaptive prompt based on mode
    const systemPrompt = parseMode === 'mock' 
      ? `You are an expert test parser for educational mock exams. Parse the provided content and extract ALL questions with their complete details.

CRITICAL RULES:
1. Extract EVERY question from the document - do not skip any
2. Detect question type automatically (MCQ, True/False, Short Answer, Essay, Fill-in-blank)
3. For MCQs: Extract all options (A, B, C, D, etc.) and identify the correct answer
4. For True/False: Identify correct answer
5. For descriptive questions: Extract full question text and any marking criteria
6. Preserve question numbers and structure
7. Extract marks/points for each question
8. Identify subject, topic, and difficulty if mentioned
9. Handle sub-questions properly

Return a valid JSON object with this structure:
{
  "test_metadata": {
    "title": "string",
    "subject": "mathematics|science|language_literature|social_studies|physics|chemistry|biology|general",
    "topic": "string",
    "total_marks": number
  },
  "questions": [
    {
      "question_number": number,
      "question_text": "string",
      "question_type": "mcq|true_false|short_answer|essay|fill_blank",
      "marks": number,
      "difficulty": "easy|medium|hard",
      "options": ["A. text", "B. text", "C. text", "D. text"], // for MCQ only
      "correct_answer": "A|B|C|D|true|false|text", // based on type
      "explanation": "string (optional)",
      "has_sub_questions": boolean,
      "sub_questions": [
        {
          "label": "a|b|i|ii",
          "text": "string",
          "marks": number,
          "answer": "string"
        }
      ]
    }
  ]
}`
      : `You are an expert quiz question parser. Parse the provided content and extract ALL questions with their details.

RULES:
1. Extract every question - do not skip any
2. Auto-detect question type (MCQ, True/False, Short Answer)
3. For MCQ: Extract all options and correct answer
4. For True/False: Extract correct answer
5. Preserve question structure
6. Identify subject and difficulty

Return valid JSON:
{
  "quiz_metadata": {
    "title": "string",
    "subject": "mathematics|science|english|history|general",
    "difficulty": "easy|medium|hard"
  },
  "questions": [
    {
      "question_text": "string",
      "question_type": "mcq|true_false|short_answer",
      "options": ["A", "B", "C", "D"], // for MCQ
      "correct_answer": "A|B|C|D|true|false|text",
      "explanation": "optional"
    }
  ]
}`;

    const userPrompt = `Parse the following ${fileType || 'content'} and extract all questions:

${content}

Remember to extract EVERY question with complete accuracy.`;

    console.log('Calling Lovable AI for question parsing...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI parsing failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const parsedContent = aiData.choices[0].message.content;
    
    let parsedData;
    try {
      parsedData = JSON.parse(parsedContent);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      return new Response(
        JSON.stringify({ error: 'AI response format invalid' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate parsed data
    const questions = parseMode === 'mock' ? parsedData.questions : parsedData.questions;
    if (!questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No questions found in the content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully parsed ${questions.length} questions`);

    return new Response(
      JSON.stringify({
        success: true,
        data: parsedData,
        parsed_count: questions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-question-parser:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'Failed to parse questions'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});