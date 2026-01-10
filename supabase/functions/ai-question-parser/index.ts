import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PDR-compliant system prompt for exam question extraction with bounding box
const SYSTEM_PROMPT = `You are a computer vision exam extraction AI.

From the uploaded exam page image:

1. Extract the first visible question number.
2. Extract the main question text exactly as written.
3. Detect if any graph, chart, diagram, or figure exists.
4. If a graph exists, estimate the bounding box coordinates (x_min, y_min, x_max, y_max) of the graph region in the image as percentages (0-100) of image dimensions.
5. Ignore headers, footers, timers, buttons, navigation, and page decorations.
6. If no graph exists, set graph_found=false and bounding_box null.

Return ONLY valid JSON in this exact format:
{
  "question_number": "",
  "question_text": "",
  "graph_found": false,
  "graph_bounding_box": null
}

If graph IS found, include bounding box like this:
{
  "question_number": "1a",
  "question_text": "Question text here...",
  "graph_found": true,
  "graph_bounding_box": {
    "x_min": 10,
    "y_min": 30,
    "x_max": 90,
    "y_max": 70
  }
}

ERROR HANDLING:
- If question text is unreadable: question_text = "unreadable"
- If question number not found: question_number = "not found"
- If graph detection fails: graph_found = false, graph_bounding_box = null`;

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

    // If images are provided, use Vision API with GPT-4o
    if (images && images.length > 0) {
      console.log(`Processing ${images.length} page images with GPT-4o Vision`);
      
      const allQuestions: any[] = [];
      
      // Process each page image
      for (let i = 0; i < images.length; i++) {
        const pageImage = images[i];
        console.log(`Processing page ${i + 1}/${images.length} with GPT-4o Vision...`);
        
        // Prepare image content for OpenAI
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

Extract the FIRST visible question ONLY.

For any graph, diagram, chart, grid, coordinate plane, Venn diagram, box plot, or visual element:
- Set graph_found = true
- Estimate the bounding box as percentage coordinates (0-100) of the image:
  - x_min: left edge of graph region
  - y_min: top edge of graph region  
  - x_max: right edge of graph region
  - y_max: bottom edge of graph region

If NO graph/diagram exists, set graph_found = false and graph_bounding_box = null.

Return ONLY valid JSON:
{
  "question_number": "",
  "question_text": "",
  "graph_found": false,
  "graph_bounding_box": null
}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageContent,
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
            max_tokens: 2000,
            response_format: { type: "json_object" }
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Vision API error for page ${i + 1}:`, response.status, errorText);
          
          if (response.status === 429) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'Rate limit exceeded. Please try again later.', 
                question_number: "not found",
                question_text: "unreadable",
                graph_found: false,
                graph_bounding_box: null
              }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          continue;
        }

        const data = await response.json();
        const pageContent = data.choices?.[0]?.message?.content || '{}';
        
        try {
          const parsed = JSON.parse(pageContent);
          console.log(`Page ${i + 1} extracted:`, parsed);
          
          // Add the extracted question with new format
          allQuestions.push({
            question_number: parsed.question_number || "not found",
            question_text: parsed.question_text || "unreadable",
            graph_found: Boolean(parsed.graph_found),
            graph_bounding_box: parsed.graph_bounding_box || null,
            page: i + 1
          });
        } catch (e) {
          console.error(`Failed to parse page ${i + 1} response:`, e);
          console.log('Raw response:', pageContent.substring(0, 500));
        }
      }

      // Return first question from all pages (PDR spec: first question only)
      const firstQuestion = allQuestions[0] || {
        question_number: "not found",
        question_text: "unreadable",
        graph_found: false,
        graph_bounding_box: null
      };

      console.log(`Vision extraction complete: ${allQuestions.length} pages processed`);

      return new Response(
        JSON.stringify({
          success: true,
          ...firstQuestion,
          all_pages: allQuestions,
          parsed_count: allQuestions.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback to text-based parsing
    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No content provided',
          question_number: "not found",
          question_text: "unreadable",
          graph_found: false,
          graph_bounding_box: null
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Parsing ${content.length} chars in ${parseMode} mode using GPT-4o`);

    const userPrompt = `Extract the FIRST question from this exam paper: ${fileName || 'document'}

Return JSON with this exact structure:
{
  "question_number": "",
  "question_text": "",
  "graph_found": false,
  "graph_bounding_box": null
}

PARSING RULES:
1. Extract ONLY the first visible question
2. If question number not found, set question_number: "not found"
3. If question text is unreadable, set question_text: "unreadable"
4. If diagram/graph mentioned in text, set graph_found: true, graph_bounding_box: null (since no image)
5. Otherwise set graph_found: false, graph_bounding_box: null

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
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Rate limit exceeded. Please try again later.',
            question_number: "not found",
            question_text: "unreadable",
            graph_found: false,
            graph_bounding_box: null
          }),
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
          JSON.stringify({ 
            success: false, 
            error: 'Failed to parse AI response',
            question_number: "not found",
            question_text: "unreadable",
            graph_found: false,
            graph_bounding_box: null
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Successfully extracted first question:`, parsed);

    return new Response(
      JSON.stringify({
        success: true,
        question_number: parsed.question_number || "not found",
        question_text: parsed.question_text || "unreadable",
        graph_found: Boolean(parsed.graph_found),
        graph_bounding_box: parsed.graph_bounding_box || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Parser error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        question_number: "not found",
        question_text: "unreadable",
        graph_found: false,
        graph_bounding_box: null
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
