import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PDR-compliant system prompt for exam question extraction
const SYSTEM_PROMPT = `You are an exam question extractor AI with advanced vision capabilities.

From the uploaded exam page image or document:

1. Extract the Question Number
2. Extract the Main Question Text exactly as written
3. If any graph, diagram, chart, figure, or visual element exists, describe it in detail with:
   - Type (graph, chart, Venn diagram, geometry figure, coordinate grid, table, etc.)
   - Visible labels, values, axis markings
   - For coordinate grids: grid range, plotted points with exact (x,y) coordinates
   - For shapes: vertices, side lengths, angles if marked
   - For charts: axis labels, bar values, categories
   - For tables: all headers and cell values

4. Ignore UI elements such as:
   - Timers, headers, footers
   - Navigation buttons, sidebars
   - Page decorations, watermarks

5. Extract ALL visible questions, not just the first one

QUESTION STRUCTURE RULES:
- "Question 1 (6 marks)" = main question number 1 with 6 total marks
- "Question 1a (1 mark)" = sub-question with label "a", 1 mark
- Group sub-questions under their parent question

OUTPUT FORMAT (JSON ONLY):
{
  "metadata": {
    "title": "extracted title or filename",
    "subject": "mathematics",
    "topic": "detected topic",
    "total_questions": number
  },
  "questions": [
    {
      "question_number": 1,
      "question_text": "exact question text as written",
      "marks": 6,
      "has_sub_questions": true,
      "has_diagram": true,
      "diagram_description": "Complete visual description with coordinates, values, labels",
      "difficulty": "medium",
      "sub_questions": [
        { "label": "a", "text": "exact sub-question text", "marks": 1 }
      ]
    }
  ]
}

ERROR HANDLING:
- If question text is unreadable: question_text = "unreadable"
- If question number not found: question_number = "not found"
- If no graph/diagram: diagram_description = "none"`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, parseMode = 'mock', fileName, images } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // If images are provided, use Vision API with Gemini
    if (images && images.length > 0) {
      console.log(`Processing ${images.length} page images with Gemini Vision`);
      
      const allQuestions: any[] = [];
      let metadata = { title: fileName || 'Imported Test', subject: 'mathematics', topic: 'General', total_questions: 0 };
      
      // Process each page image
      for (let i = 0; i < images.length; i++) {
        const pageImage = images[i];
        console.log(`Processing page ${i + 1}/${images.length} with Gemini Vision...`);
        
        // Prepare image content for Gemini
        const imageContent = pageImage.startsWith('data:') 
          ? pageImage 
          : `data:image/jpeg;base64,${pageImage}`;

        const messages = [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: [
              {
                type: 'text',
                text: `ANALYZE THIS EXAM PAGE (page ${i + 1}) WITH VISION AI.

EXTRACT ALL QUESTIONS AND VISUAL CONTENT.

FOR EVERY VISUAL ELEMENT (graph, diagram, chart, grid, shape, table, figure):
1. Set "has_diagram": true
2. In "diagram_description", provide COMPLETE DATA:

   COORDINATES/GRIDS: Grid range, intervals, ALL points (x,y), ALL shape vertices
   SHAPES: Type, ALL vertices with coordinates, labels (A, B, C), colors
   CHARTS: Axis labels, ALL values, categories, scale
   TABLES: ALL headers, ALL cell values

Return ONLY valid JSON with complete data.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageContent
                }
              }
            ]
          }
        ];

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Vision API error for page ${i + 1}:`, response.status, errorText);
          
          if (response.status === 429) {
            return new Response(
              JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.', questions: [] }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          if (response.status === 402) {
            return new Response(
              JSON.stringify({ success: false, error: 'Payment required. Please add credits to your Lovable workspace.', questions: [] }),
              { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          continue;
        }

        const data = await response.json();
        const pageContent = data.choices?.[0]?.message?.content || '{}';
        
        try {
          // Extract JSON from response (may be wrapped in markdown code blocks)
          let jsonContent = pageContent;
          const jsonMatch = pageContent.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) {
            jsonContent = jsonMatch[1].trim();
          } else {
            // Try to find raw JSON object
            const rawJsonMatch = pageContent.match(/\{[\s\S]*\}/);
            if (rawJsonMatch) {
              jsonContent = rawJsonMatch[0];
            }
          }
          
          const parsed = JSON.parse(jsonContent);
          if (parsed.questions && Array.isArray(parsed.questions)) {
            // Log diagram extractions
            const diagramQuestions = parsed.questions.filter((q: any) => q.has_diagram);
            if (diagramQuestions.length > 0) {
              console.log(`Page ${i + 1}: Found ${diagramQuestions.length} questions with diagrams`);
              diagramQuestions.forEach((q: any) => {
                console.log(`  Q${q.question_number}: ${q.diagram_description?.substring(0, 100)}...`);
              });
            }
            allQuestions.push(...parsed.questions);
          }
          if (parsed.metadata && i === 0) {
            metadata = { ...metadata, ...parsed.metadata };
          }
        } catch (e) {
          console.error(`Failed to parse page ${i + 1} response:`, e);
          console.log('Raw response:', pageContent.substring(0, 500));
        }
      }

      // Deduplicate and sort questions by question_number
      const uniqueQuestions = allQuestions.reduce((acc, q) => {
        const key = `${q.question_number}-${q.question_text?.substring(0, 50)}`;
        if (!acc.map.has(key)) {
          acc.map.set(key, true);
          acc.list.push(q);
        }
        return acc;
      }, { map: new Map(), list: [] as any[] }).list;

      uniqueQuestions.sort((a, b) => {
        const numA = parseInt(a.question_number) || 0;
        const numB = parseInt(b.question_number) || 0;
        return numA - numB;
      });

      metadata.total_questions = uniqueQuestions.length;
      const diagramCount = uniqueQuestions.filter((q: any) => q.has_diagram).length;
      console.log(`Vision extraction complete: ${uniqueQuestions.length} unique questions, ${diagramCount} with diagrams`);

      return new Response(
        JSON.stringify({
          success: true,
          data: { metadata, questions: uniqueQuestions },
          questions: uniqueQuestions,
          parsed_count: uniqueQuestions.length,
          diagram_count: diagramCount,
          actionMode: 'parse'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback to text-based parsing
    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No content provided', questions: [] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Parsing ${content.length} chars in ${parseMode} mode using Gemini`);

    const userPrompt = `Extract ALL questions from this exam paper: ${fileName || 'document'}

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
      "diagram_description": "none",
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
5. If question text is unreadable, set question_text: "unreadable"
6. If no diagram present, set diagram_description: "none"

DOCUMENT CONTENT:
${content}`;

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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.', questions: [] }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Payment required. Please add credits to your Lovable workspace.', questions: [] }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Lovable AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || '';

    console.log('Gemini response received, parsing JSON...');

    let parsed;
    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      let jsonContent = aiContent;
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim();
      } else {
        const rawJsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (rawJsonMatch) {
          jsonContent = rawJsonMatch[0];
        }
      }
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('Raw AI response:', aiContent.substring(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse AI response', questions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      JSON.stringify({ success: false, error: error.message, questions: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
