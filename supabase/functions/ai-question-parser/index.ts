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
4. If a graph exists, provide PRECISE bounding box coordinates (x_min, y_min, x_max, y_max) as percentages (0-100) of image dimensions.
5. Ignore headers, footers, timers, buttons, navigation, and page decorations.
6. If no graph exists, set graph_found=false and bounding_box null.

Return ONLY valid JSON in this exact format:
{
  "question_number": "",
  "question_text": "",
  "graph_found": false,
  "graph_bounding_box": null
}

If graph IS found, include PRECISE bounding box:
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

BOUNDING BOX GUIDELINES:
- x_min: left edge percentage (0-100)
- y_min: top edge percentage (0-100)
- x_max: right edge percentage (0-100)
- y_max: bottom edge percentage (0-100)
- Be precise - include only the graph/diagram area, not surrounding text

ERROR HANDLING:
- If question text is unreadable: question_text = "unreadable"
- If question number not found: question_number = "not found"
- If graph detection fails: graph_found = false, graph_bounding_box = null`;

// Timeout settings (milliseconds)
const PRIMARY_MODEL_TIMEOUT = 15000; // 15 seconds for GPT-4o
const FALLBACK_MODEL = 'gpt-4o-mini'; // Faster fallback model

// Helper: Fetch with timeout and model fallback
async function fetchWithFallback(
  apiKey: string,
  messages: any[],
  primaryModel: string = 'gpt-4o',
  timeout: number = PRIMARY_MODEL_TIMEOUT
): Promise<{ data: any; model_used: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    console.log(`Trying ${primaryModel} with ${timeout}ms timeout...`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: primaryModel,
        messages,
        temperature: 0,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return { data, model_used: primaryModel };

  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // If timeout or error, try fallback model
    if (error.name === 'AbortError' || error.message.includes('API error')) {
      console.log(`${primaryModel} timed out or failed, switching to ${FALLBACK_MODEL}...`);
      
      const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: FALLBACK_MODEL,
          messages,
          temperature: 0,
          max_tokens: 2000,
          response_format: { type: "json_object" }
        }),
      });

      if (!fallbackResponse.ok) {
        throw new Error(`Fallback API error: ${fallbackResponse.status}`);
      }

      const data = await fallbackResponse.json();
      return { data, model_used: FALLBACK_MODEL };
    }
    
    throw error;
  }
}

// Helper: Crop base64 image to bounding box region
function cropImageDataUrl(
  dataUrl: string,
  bbox: { x_min: number; y_min: number; x_max: number; y_max: number }
): string {
  // Return original if bounding box covers most of the image
  if (bbox.x_max - bbox.x_min > 80 && bbox.y_max - bbox.y_min > 80) {
    return dataUrl;
  }
  
  // We'll let the client handle cropping since we can't use canvas in Deno easily
  // Return metadata with the crop instructions
  return dataUrl;
}

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

    // If images are provided, use Vision API with GPT-4o (with fallback)
    if (images && images.length > 0) {
      console.log(`Processing ${images.length} page images with Vision AI`);
      
      const allQuestions: any[] = [];
      let modelsUsed: string[] = [];
      
      // Process each page image
      for (let i = 0; i < images.length; i++) {
        const pageImage = images[i];
        console.log(`Processing page ${i + 1}/${images.length}...`);
        
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
- Provide PRECISE bounding box as percentage coordinates (0-100):
  - x_min: left edge of ONLY the graph region
  - y_min: top edge of ONLY the graph region  
  - x_max: right edge of ONLY the graph region
  - y_max: bottom edge of ONLY the graph region
  
IMPORTANT: The bounding box should contain ONLY the graph/diagram, NOT the entire page.

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

        try {
          // Use fetch with timeout and fallback
          const { data, model_used } = await fetchWithFallback(
            OPENAI_API_KEY,
            messages,
            'gpt-4o',
            PRIMARY_MODEL_TIMEOUT
          );
          
          modelsUsed.push(model_used);
          
          const pageContent = data.choices?.[0]?.message?.content || '{}';
          const parsed = JSON.parse(pageContent);
          console.log(`Page ${i + 1} extracted with ${model_used}:`, parsed);
          
          // Build the question object
          const questionData: any = {
            question_number: parsed.question_number || "not found",
            question_text: parsed.question_text || "unreadable",
            graph_found: Boolean(parsed.graph_found),
            graph_bounding_box: parsed.graph_bounding_box || null,
            page: i + 1,
            model_used
          };
          
          // If graph found with bounding box, include crop metadata
          if (parsed.graph_found && parsed.graph_bounding_box) {
            questionData.diagram_crop = {
              source_image_index: i,
              bbox: parsed.graph_bounding_box,
              // Client can use this to crop the image
              crop_instructions: `Crop from (${parsed.graph_bounding_box.x_min}%, ${parsed.graph_bounding_box.y_min}%) to (${parsed.graph_bounding_box.x_max}%, ${parsed.graph_bounding_box.y_max}%)`
            };
          }
          
          allQuestions.push(questionData);
          
        } catch (e: any) {
          console.error(`Failed to process page ${i + 1}:`, e);
          
          if (e.message?.includes('Rate limit') || e.message?.includes('429')) {
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
        }
      }

      // Return first question from all pages (PDR spec: first question only)
      const firstQuestion = allQuestions[0] || {
        question_number: "not found",
        question_text: "unreadable",
        graph_found: false,
        graph_bounding_box: null
      };

      // Determine unique models used
      const uniqueModels = [...new Set(modelsUsed)];
      
      console.log(`Vision extraction complete: ${allQuestions.length} pages processed`);
      console.log(`Models used: ${uniqueModels.join(', ')}`);

      return new Response(
        JSON.stringify({
          success: true,
          ...firstQuestion,
          all_pages: allQuestions,
          parsed_count: allQuestions.length,
          models_used: uniqueModels,
          fallback_triggered: uniqueModels.includes(FALLBACK_MODEL)
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

    console.log(`Parsing ${content.length} chars in ${parseMode} mode`);

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

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ];

    // Use fetch with timeout and fallback for text parsing too
    const { data, model_used } = await fetchWithFallback(
      OPENAI_API_KEY,
      messages,
      'gpt-4o',
      PRIMARY_MODEL_TIMEOUT
    );

    const aiContent = data.choices?.[0]?.message?.content || '';
    console.log(`Response received from ${model_used}, parsing JSON...`);

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

    console.log(`Successfully extracted first question with ${model_used}:`, parsed);

    return new Response(
      JSON.stringify({
        success: true,
        question_number: parsed.question_number || "not found",
        question_text: parsed.question_text || "unreadable",
        graph_found: Boolean(parsed.graph_found),
        graph_bounding_box: parsed.graph_bounding_box || null,
        model_used,
        fallback_triggered: model_used === FALLBACK_MODEL
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
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
