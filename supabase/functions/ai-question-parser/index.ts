import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an EXAM PAPER QUESTION EXTRACTOR using advanced computer vision (CNN/RNN).

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

CRITICAL - GRAPH/DIAGRAM/IMAGE EXTRACTION:
When you see ANY visual element (graph, chart, diagram, grid, box plot, coordinate plane, shape, figure, table, number line, etc.):
1. Set has_diagram: true
2. Provide DETAILED diagram_description including:
   - Type of visual (bar chart, line graph, coordinate grid, geometric shape, etc.)
   - All axis labels and scales
   - All data points, coordinates, or values shown
   - Colors, shading, or patterns used
   - Any labels, legends, or annotations
   - Shapes and their positions/transformations
   - Grid lines and their intervals
3. For graphs: List exact coordinates of plotted points
4. For shapes: Describe position, size, and any transformations shown
5. For box plots: Include min, Q1, median, Q3, max values
6. For tables: Transcribe all data in the table

Example diagram_description:
"Coordinate grid from -8 to 8 on both axes. Shape A is a triangle with vertices at (-6, 4), (-4, 4), (-5, 2). Shape B is a quadrilateral with vertices at (2, -1), (4, -1), (5, -3), (1, -3). Grid lines at every 1 unit."

WHAT TO IGNORE:
- Headers/footers (QuintoPrep, www.quintoprep.com, etc.)
- "Scroll down to continue"
- Formula sheets (unless part of a question)
- Navigation instructions
- Styling markers (B, I, U, x², Ω, Styles, etc.)
- Worked examples
- Instructions like "Use the tabs", "Click next"

OUTPUT FORMAT (STRICT JSON ONLY):
Return ONLY valid JSON. No markdown. No explanation. No extra text.

{
  "metadata": {
    "title": "extracted title",
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
      "has_diagram": true,
      "diagram_description": "DETAILED description of the visual with all data points, labels, coordinates",
      "difficulty": "medium",
      "sub_questions": [
        { "label": "a", "text": "exact sub-question text", "marks": 1 },
        { "label": "b", "text": "exact sub-question text", "marks": 3 }
      ]
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
                text: `ANALYZE THIS EXAM PAGE (page ${i + 1}) WITH COMPUTER VISION.

EXTRACT:
1. Question numbers and marks
2. Sub-questions (a, b, c, etc.)
3. Mathematical expressions and formulas

CRITICAL - FOR ANY VISUAL ELEMENTS (graphs, charts, diagrams, grids, shapes, tables):
- Set has_diagram: true
- In diagram_description, provide COMPLETE DATA:
  * Graph type and axis labels/scales
  * ALL plotted points with exact coordinates
  * ALL shape vertices and positions
  * ALL table data cells
  * Colors, shading, patterns
  * Grid intervals and range

Example: "Coordinate grid (-8 to 8 both axes). Triangle A: vertices (-6,4), (-4,4), (-5,2). Rectangle B: vertices (2,-1), (4,-1), (4,-3), (2,-3)."

Return JSON with questions found on this page.`
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
