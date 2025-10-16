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
    const { content, fileType, parseMode = 'quick', fileName, extractedText } = await req.json();
    
    console.log('📥 Parsing request:', { 
      fileName, 
      fileType, 
      parseMode, 
      contentLength: content?.length,
      hasExtractedText: !!extractedText 
    });
    
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

    // Enhanced adaptive prompt based on mode with flexible parsing
    const systemPrompt = parseMode === 'mock' 
      ? `You are an expert document parser specialized in educational content. Your task is to extract ALL questions from ANY document format, regardless of structure.

ADAPTIVE PARSING RULES:
1. **Be Format-Agnostic**: Handle CSV, PDF, Word, images, or any text format
2. **Flexible Column Detection**: Recognize question data even if columns are named differently
3. **Auto-detect Question Types**: MCQ, True/False, Short Answer, Essay, Fill-in-blank
4. **Smart Option Extraction**: Recognize options in various formats
5. **Answer Key Flexibility**: Accept various answer formats and normalize them
6. **Handle Missing Data**: Use sensible defaults if information is missing
7. **Extract Everything**: Never skip questions due to formatting issues

**CRITICAL - VALID SUBJECT VALUES ONLY:**
You MUST use ONLY these exact subject values (no other values allowed):
- "mathematics"
- "science"  
- "language_literature"
- "social_studies"
- "physics"
- "chemistry"
- "biology"

If the subject is unclear or general, default to "mathematics".

Return JSON with this structure:
{
  "test_metadata": {
    "title": "string (default: 'Imported Mock Test')",
    "subject": "mathematics|science|language_literature|social_studies|physics|chemistry|biology (REQUIRED - choose closest match)",
    "topic": "string (default: 'General')",
    "total_marks": number (sum of all question marks)
  },
  "questions": [
    {
      "question_number": number (auto-increment if missing),
      "question_text": "string",
      "question_type": "mcq|true_false|short_answer|essay|fill_blank (auto-detect)",
      "marks": number (default: 1),
      "difficulty": "easy|medium|hard (default: 'medium')",
      "options": ["A. text", "B. text", "C. text", "D. text"] (for MCQ, create labels if missing),
      "correct_answer": "A|B|C|D|true|false|text (normalize to standard format)",
      "explanation": "string (optional)",
      "has_sub_questions": boolean (default: false),
      "sub_questions": []
    }
  ]
}`
      : `You are an expert document parser specialized in educational content. Extract ALL questions from ANY document format with maximum flexibility.

ADAPTIVE PARSING RULES:
1. **Format-Agnostic**: Parse CSV, PDF, Word, images, or plain text
2. **Flexible Recognition**: Identify questions even with varying column names or formats
3. **Smart Detection**: Auto-detect question types and extract options intelligently
4. **Missing Data**: Use reasonable defaults for missing information
5. **Never Skip**: Extract every question regardless of format issues

**VALID SUBJECT VALUES:**
For quick practice, use: "mathematics", "science", "english", "history", or infer from content.
Default to "mathematics" if unclear.

Return JSON (use defaults for missing fields):
{
  "quiz_metadata": {
    "title": "string (default: 'Quick Practice Quiz')",
    "subject": "mathematics|science|english|history (choose closest match, default: 'mathematics')",
    "difficulty": "easy|medium|hard (default: 'medium')"
  },
  "questions": [
    {
      "question_text": "string",
      "question_type": "mcq|true_false|short_answer (auto-detect)",
      "options": ["text", "text", "text", "text"] (create if MCQ),
      "correct_answer": "A|B|C|D|true|false|text (normalize)",
      "explanation": "string (optional)",
      "difficulty": "easy|medium|hard (use from data or default: 'medium')"
    }
  ]
}`;

    // Prepare enhanced prompt with file context
    const fileContext = fileName ? `\nFile: ${fileName} (${fileType})` : '';
    const textPreview = extractedText ? `\n\n📄 Pre-extracted Text (${extractedText.length} chars):\n${extractedText.substring(0, 1000)}${extractedText.length > 1000 ? '...' : ''}` : '';
    
    const userPrompt = `Parse educational content and extract ALL questions with complete details.${fileContext}${textPreview}

${extractedText ? 'Use the pre-extracted text above for accurate parsing.' : 'Content to parse:'}
${!extractedText ? content : ''}

PARSING INSTRUCTIONS:
- For CSV: Parse column headers and rows intelligently
- For Word/PDF: Extract from formatted text and tables  
- For Images: Perform OCR and extract visible questions
- Handle numbered lists, bullet points, tables, and paragraphs
- Auto-detect question structure and types (MCQ, True/False, etc.)
- Normalize answer formats (A/B/C/D, 1/2/3/4, true/false)
- Extract EVERY question - never skip due to format issues

Return pure JSON only (no markdown, no explanations).`;

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