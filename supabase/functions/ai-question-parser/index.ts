import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced system prompt for precise graph/diagram detection with CNN-like spatial analysis
const SYSTEM_PROMPT = `You are a specialized exam content extraction AI with enhanced visual analysis capabilities.

## YOUR TASK
Extract exam questions and detect diagrams/graphs with PRECISE bounding boxes from uploaded exam page images.

## GRAPH/DIAGRAM DETECTION (CRITICAL)
You MUST detect and report bounding boxes for ANY of these visual elements:
- Coordinate planes, grids, axes (x-y graphs)
- Bar charts, line graphs, pie charts, histograms
- Venn diagrams, tree diagrams, flow charts
- Geometric figures (triangles, circles, shapes)
- Box plots, scatter plots, data visualizations
- Tables with data, matrices
- Maps, images, illustrations
- Any drawn or printed visual element

## BOUNDING BOX INSTRUCTIONS
When a graph/diagram is detected:
1. Identify the EXACT boundaries of the visual element
2. Exclude surrounding text/questions - ONLY the visual region
3. Report coordinates as percentages (0-100) of image dimensions:
   - x_min: left edge percentage
   - y_min: top edge percentage  
   - x_max: right edge percentage
   - y_max: bottom edge percentage
4. Be PRECISE - tight bounding box around visual only

## OUTPUT FORMAT (JSON only)
{
  "question_number": "1" or "1a" or "not found",
  "question_text": "extracted question text or 'unreadable'",
  "graph_found": true/false,
  "graph_type": "coordinate_plane|bar_chart|line_graph|pie_chart|venn_diagram|geometric|table|image|other|null",
  "graph_bounding_box": {
    "x_min": 15,
    "y_min": 40,
    "x_max": 85,
    "y_max": 75
  } or null,
  "graph_description": "brief description of the visual element"
}

RULES:
- Extract FIRST visible question only
- If no visual: graph_found=false, graph_bounding_box=null
- Be thorough - DO NOT miss diagrams
- Focus on ACCURACY of bounding box coordinates`;

// Primary and fallback models using Lovable AI Gateway (Gemini)
const MODELS = {
  primary: 'google/gemini-2.5-flash',  // Fast + good vision
  fallback: 'google/gemini-2.5-flash-lite',  // Faster fallback
  advanced: 'google/gemini-2.5-pro'  // For complex images
};

const PRIMARY_TIMEOUT = 20000;  // 20 seconds
const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// Multi-model vision analysis with auto-switching
async function analyzeImageWithVision(
  apiKey: string,
  imageContent: string,
  pageIndex: number,
  useAdvanced: boolean = false
): Promise<{ data: any; model_used: string; retry_count: number }> {
  const models = useAdvanced 
    ? [MODELS.advanced, MODELS.primary, MODELS.fallback]
    : [MODELS.primary, MODELS.fallback, MODELS.advanced];
  
  let lastError: Error | null = null;
  let retryCount = 0;

  for (const model of models) {
    try {
      console.log(`Attempting vision analysis with ${model}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PRIMARY_TIMEOUT);

      const response = await fetch(LOVABLE_AI_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `ANALYZE EXAM PAGE ${pageIndex + 1} - EXTRACT QUESTION & DETECT ANY GRAPHS/DIAGRAMS

CRITICAL: Carefully scan the ENTIRE image for any visual elements:
- Look for graphs, charts, coordinate planes, grids
- Check for geometric figures, diagrams, illustrations
- Identify tables, box plots, Venn diagrams
- Find any drawn or printed visual content

If a visual element exists, provide PRECISE bounding box coordinates.
The bounding box should tightly wrap ONLY the visual element, not surrounding text.

Return valid JSON only.`
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
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`${model} error: ${response.status} - ${errorText}`);
        
        if (response.status === 429) {
          throw new Error('Rate limit exceeded');
        }
        if (response.status === 402) {
          throw new Error('Payment required - add credits');
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`${model} responded successfully`);
      
      return { data, model_used: model, retry_count: retryCount };

    } catch (error: any) {
      lastError = error;
      retryCount++;
      console.error(`${model} failed:`, error.message);
      
      if (error.message.includes('Rate limit') || error.message.includes('Payment required')) {
        throw error;
      }
      
      // Continue to next model
      continue;
    }
  }

  throw lastError || new Error('All vision models failed');
}

// Parse AI response to structured JSON
function parseAIResponse(content: string): any {
  try {
    // Try direct JSON parse
    return JSON.parse(content);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {}
    }
    
    // Try to find JSON object in text
    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {}
    }
  }
  
  // Return default structure
  return {
    question_number: "not found",
    question_text: "unreadable",
    graph_found: false,
    graph_bounding_box: null,
    graph_type: null,
    graph_description: null
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, parseMode = 'mock', fileName, images, useAdvancedModel = false } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Process images with Gemini Vision
    if (images && images.length > 0) {
      console.log(`Processing ${images.length} page images with Gemini Vision AI`);
      
      const allQuestions: any[] = [];
      let modelsUsed: string[] = [];
      let totalRetries = 0;
      
      for (let i = 0; i < images.length; i++) {
        const pageImage = images[i];
        console.log(`Processing page ${i + 1}/${images.length}...`);
        
        // Prepare image content
        const imageContent = pageImage.startsWith('data:') 
          ? pageImage 
          : `data:image/jpeg;base64,${pageImage}`;

        try {
          const { data, model_used, retry_count } = await analyzeImageWithVision(
            LOVABLE_API_KEY,
            imageContent,
            i,
            useAdvancedModel
          );
          
          modelsUsed.push(model_used);
          totalRetries += retry_count;
          
          const aiContent = data.choices?.[0]?.message?.content || '{}';
          const parsed = parseAIResponse(aiContent);
          
          console.log(`Page ${i + 1} extracted with ${model_used}:`, {
            question_number: parsed.question_number,
            graph_found: parsed.graph_found,
            graph_type: parsed.graph_type,
            has_bbox: !!parsed.graph_bounding_box
          });
          
          // Build comprehensive question data
          const questionData: any = {
            question_number: parsed.question_number || "not found",
            question_text: parsed.question_text || "unreadable",
            graph_found: Boolean(parsed.graph_found),
            graph_bounding_box: parsed.graph_bounding_box || null,
            graph_type: parsed.graph_type || null,
            graph_description: parsed.graph_description || null,
            page: i + 1,
            model_used,
            source_image: imageContent
          };
          
          // Enhanced crop metadata for graphs
          if (parsed.graph_found && parsed.graph_bounding_box) {
            const bbox = parsed.graph_bounding_box;
            questionData.diagram_crop = {
              source_image_index: i,
              bbox: bbox,
              crop_instructions: `Crop from (${bbox.x_min}%, ${bbox.y_min}%) to (${bbox.x_max}%, ${bbox.y_max}%)`,
              estimated_size: {
                width_percent: bbox.x_max - bbox.x_min,
                height_percent: bbox.y_max - bbox.y_min
              }
            };
          }
          
          allQuestions.push(questionData);
          
        } catch (e: any) {
          console.error(`Failed to process page ${i + 1}:`, e);
          
          if (e.message?.includes('Rate limit')) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'Rate limit exceeded. Please try again later.',
                all_pages: allQuestions
              }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          if (e.message?.includes('Payment required')) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'API credits exhausted. Please add credits.',
                all_pages: allQuestions
              }),
              { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Add placeholder for failed page
          allQuestions.push({
            question_number: "not found",
            question_text: `Page ${i + 1} processing failed: ${e.message}`,
            graph_found: false,
            graph_bounding_box: null,
            page: i + 1,
            error: e.message
          });
        }
      }

      const firstQuestion = allQuestions[0] || {
        question_number: "not found",
        question_text: "unreadable",
        graph_found: false,
        graph_bounding_box: null
      };

      const uniqueModels = [...new Set(modelsUsed)];
      
      console.log(`Vision extraction complete: ${allQuestions.length} pages, models: ${uniqueModels.join(', ')}, retries: ${totalRetries}`);

      return new Response(
        JSON.stringify({
          success: true,
          ...firstQuestion,
          all_pages: allQuestions,
          parsed_count: allQuestions.length,
          models_used: uniqueModels,
          total_retries: totalRetries,
          fallback_triggered: uniqueModels.length > 1 || totalRetries > 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback to text-based parsing (no images)
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

    console.log(`Text parsing ${content.length} chars in ${parseMode} mode`);

    // Use Gemini for text parsing too
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODELS.primary,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Extract the FIRST question from this exam document: ${fileName || 'document'}

If the text mentions any graph, diagram, chart, figure, or visual element, set graph_found=true but graph_bounding_box=null (since this is text-only).

Return valid JSON only.

DOCUMENT CONTENT:
${content}` 
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Text parsing failed:', response.status, errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || '';
    const parsed = parseAIResponse(aiContent);

    console.log(`Text extraction complete:`, parsed);

    return new Response(
      JSON.stringify({
        success: true,
        question_number: parsed.question_number || "not found",
        question_text: parsed.question_text || "unreadable",
        graph_found: Boolean(parsed.graph_found),
        graph_bounding_box: parsed.graph_bounding_box || null,
        graph_type: parsed.graph_type || null,
        graph_description: parsed.graph_description || null,
        model_used: MODELS.primary,
        fallback_triggered: false
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
