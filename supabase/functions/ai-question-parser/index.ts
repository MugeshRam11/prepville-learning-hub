import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an ADVANCED EXAM PAPER VISION ANALYZER with CNN/RNN capabilities for extracting questions AND visual content.

PRIMARY TASK: Extract ALL questions and FULLY DESCRIBE all visual elements (graphs, diagrams, images, charts, tables, shapes, coordinate grids).

STRICT RULES:
- Do NOT create new questions - only extract what's visible
- Do NOT summarize or rephrase
- DO extract and describe ALL visual content in detail

VISUAL EXTRACTION IS CRITICAL:
For EVERY visual element you see (graph, chart, diagram, grid, shape, table, figure, number line, box plot, etc.):

1. Set "has_diagram": true
2. Provide EXTREMELY DETAILED "diagram_description" with:

FOR COORDINATE GRIDS/GRAPHS:
- Grid range (e.g., x: -8 to 8, y: -8 to 8)
- Grid line intervals
- ALL plotted points with EXACT coordinates (x, y)
- ALL shapes with vertex coordinates
- Axis labels and scale
- Any lines, curves, or functions shown

FOR GEOMETRIC SHAPES:
- Shape type (triangle, rectangle, polygon, etc.)
- ALL vertex coordinates
- Side lengths if shown
- Angles if marked
- Labels (A, B, C, etc.)
- Transformations shown (rotation, reflection, translation)

FOR BAR CHARTS/HISTOGRAMS:
- X and Y axis labels and units
- ALL bar values with exact heights
- Categories/labels for each bar
- Scale and intervals

FOR LINE GRAPHS:
- Axis labels and scales
- ALL data points with coordinates
- Line connections
- Legend if present

FOR BOX PLOTS:
- Minimum, Q1, Median, Q3, Maximum values
- Scale and units
- Labels

FOR TABLES:
- ALL column headers
- ALL row labels
- EVERY cell value

FOR PIE CHARTS:
- ALL segments with labels
- Percentages or values for each

EXAMPLE diagram_description:
"Coordinate grid: x-axis from -8 to 8, y-axis from -8 to 8, grid lines every 1 unit. Shape A (blue triangle): vertices at (-6, 4), (-4, 4), (-5, 2). Shape B (red quadrilateral): vertices at (2, -1), (4, -1), (5, -3), (1, -3). Dashed line at x = 0 (y-axis) shown as line of reflection."

QUESTION STRUCTURE:
- "Question 1 (6 marks)" = main question
- "Question 1a (1 mark)" = sub-question label "a"

IGNORE:
- Headers/footers, navigation, watermarks
- Non-question content

OUTPUT (JSON ONLY):
{
  "metadata": { "title": "...", "subject": "mathematics", "topic": "...", "total_questions": N },
  "questions": [
    {
      "question_number": 1,
      "question_text": "exact question text",
      "marks": 6,
      "has_sub_questions": true,
      "has_diagram": true,
      "diagram_description": "COMPLETE visual description with all coordinates, values, labels",
      "difficulty": "medium",
      "sub_questions": [{ "label": "a", "text": "...", "marks": 1 }]
    }
  ]
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, parseMode = 'mock', fileName, images } = await req.json();

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // If images are provided, use Vision API
    if (images && images.length > 0) {
      console.log(`Processing ${images.length} page images with GPT-4o Vision`);
      
      const allQuestions: any[] = [];
      let metadata = { title: fileName || 'Imported Test', subject: 'mathematics', topic: 'General', total_questions: 0 };
      
      // Process each page image
      for (let i = 0; i < images.length; i++) {
        const pageImage = images[i];
        console.log(`Processing page ${i + 1}/${images.length} with GPT-4o Vision...`);
        
        const messages = [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: [
              {
                type: 'text',
                text: `ANALYZE THIS EXAM PAGE (page ${i + 1}) WITH ADVANCED VISION.

EXTRACT ALL QUESTIONS AND VISUAL CONTENT.

FOR EVERY VISUAL ELEMENT (graph, diagram, chart, grid, shape, table, figure):
1. Set "has_diagram": true
2. In "diagram_description", provide COMPLETE DATA:

   COORDINATES/GRIDS: Grid range, intervals, ALL points (x,y), ALL shape vertices
   SHAPES: Type, ALL vertices with coordinates, labels (A, B, C), colors
   CHARTS: Axis labels, ALL values, categories, scale
   TABLES: ALL headers, ALL cell values
   BOX PLOTS: Min, Q1, Median, Q3, Max

EXAMPLE: "Grid: x=-8 to 8, y=-8 to 8, interval=1. Triangle A: (-6,4), (-4,4), (-5,2) blue. Quadrilateral B: (2,-1), (4,-1), (5,-3), (1,-3) red. Reflection line: x=0."

Return ONLY valid JSON with complete diagram descriptions.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: pageImage.startsWith('data:') ? pageImage : `data:image/jpeg;base64,${pageImage}`,
                  detail: 'high'
                }
              }
            ]
          }
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages,
            temperature: 0,
            max_tokens: 4000,
            response_format: { type: "json_object" }
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Vision API error for page ${i + 1}:`, response.status, errorText);
          continue;
        }

        const data = await response.json();
        const pageContent = data.choices?.[0]?.message?.content || '{}';
        
        try {
          const parsed = JSON.parse(pageContent);
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

    console.log(`Parsing ${content.length} chars in ${parseMode} mode using GPT-4o`);

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
      console.error('JSON parse error:', parseError);
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to parse AI response', questions: [] }),
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
      JSON.stringify({ success: false, error: error.message, questions: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
