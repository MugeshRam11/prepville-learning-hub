import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use Lovable AI for faster processing
const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('📥 Incoming request:', {
    method: req.method,
    url: req.url
  });

  try {
    const requestBody = await req.json();

    const { 
      content, 
      fileType, 
      parseMode = 'quick', 
      fileName, 
      extractedText,
      extractedImages = [],
      pageImages = [],
      actionMode = 'parse'
    } = requestBody;
    
    console.log('📥 Processing request:', { 
      fileName, 
      fileType, 
      parseMode,
      actionMode,
      contentLength: content?.length,
      hasExtractedText: !!extractedText,
      extractedImagesCount: extractedImages?.length || 0,
      pageImagesCount: pageImages?.length || 0
    });
    
    const allImages = [...(extractedImages || []), ...(pageImages || [])].filter(Boolean);
    
    if (!content && !extractedText) {
      return new Response(
        JSON.stringify({ error: 'No content provided', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const processedContent = (extractedText || content || '').substring(0, 15000); // Limit content size

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = getSystemPrompt(parseMode, allImages);
    const userPrompt = getUserPrompt(parseMode, fileName, processedContent, allImages);

    console.log('🤖 Calling Lovable AI (Gemini Flash) for fast parsing...');
    
    const aiResponse = await fetch(LOVABLE_AI_URL, {
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
        max_tokens: 8000
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI error:', aiResponse.status, errorText);
      
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
      
      throw new Error(`AI processing failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const parsedContent = aiData.choices[0]?.message?.content;
    
    console.log('📏 AI response length:', parsedContent?.length || 0);
    
    let finalParsedData;
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = parsedContent;
      const jsonMatch = parsedContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      finalParsedData = JSON.parse(jsonStr.trim());
      console.log('✅ Successfully parsed AI response');
    } catch (e) {
      console.error('❌ JSON parse error:', e);
      return new Response(
        JSON.stringify({ 
          error: 'AI response format invalid', 
          details: String(e),
          hint: 'The AI returned malformed JSON. Try with a simpler document.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const questions = finalParsedData.questions || [];
    console.log(`✅ Parsed ${questions.length} questions`);

    return new Response(
      JSON.stringify({
        success: true,
        actionMode,
        data: finalParsedData,
        parsed_count: questions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in ai-question-parser:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'Failed to process document'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getSystemPrompt(parseMode: string, extractedImages: string[]): string {
  const imageContext = extractedImages.length > 0
    ? `\n\nAvailable images (${extractedImages.length}):\n${extractedImages.map((url, i) => `${i + 1}. ${url}`).join('\n')}\nAssign these URLs to relevant questions using the question_image_url field.`
    : '';

  if (parseMode === 'mock') {
    return `You are an exam document parser. Extract ALL questions from the document.

Return valid JSON with this structure:
{
  "test_metadata": {
    "title": "string",
    "subject": "mathematics|science|physics|chemistry|biology|language_literature|social_studies",
    "topic": "string",
    "total_marks": number,
    "total_questions": number
  },
  "questions": [
    {
      "question_number": number,
      "question_text": "string",
      "question_image_url": "string or null",
      "type": "mcq|descriptive|diagram",
      "marks": number,
      "difficulty": "easy|medium|hard",
      "options": ["A) text", "B) text", "C) text", "D) text"] or null,
      "correct_answer": "string or null",
      "has_sub_questions": boolean,
      "sub_questions": [{"label": "a", "text": "string", "marks": number, "answer": "string or null"}] or null
    }
  ]
}${imageContext}

CRITICAL: Return ONLY valid JSON, no markdown.`;
  }

  // Quick mode - simpler MCQ format
  return `You are an educational document parser. Extract questions and convert to MCQ format.

Return valid JSON:
{
  "quiz_metadata": {
    "title": "string",
    "subject": "mathematics|science|english|history",
    "topic": "string",
    "difficulty": "easy|medium|hard"
  },
  "questions": [
    {
      "question_text": "string",
      "question_image_url": "string or null",
      "options": ["A. text", "B. text", "C. text", "D. text"],
      "correct_answer": "A|B|C|D",
      "explanation": "string",
      "difficulty": "easy|medium|hard"
    }
  ]
}${imageContext}

RULES:
- Every question MUST have 4 MCQ options
- If original is not MCQ, convert it to MCQ format
- Flatten sub-questions into separate questions
- Return ONLY valid JSON, no markdown`;
}

function getUserPrompt(parseMode: string, fileName: string | undefined, content: string, extractedImages: string[]): string {
  const fileInfo = fileName ? `\nFile: ${fileName}` : '';
  const imageInfo = extractedImages.length > 0 
    ? `\n\n${extractedImages.length} images extracted - assign to relevant questions.`
    : '';

  return `Parse this document and extract ALL questions.${fileInfo}${imageInfo}

DOCUMENT CONTENT:
${content}

Extract every question. Return pure JSON only.`;
}
