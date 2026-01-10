import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced system prompt for detecting ALL questions with proper numbering (1, 1(i), 1(ii), 2, etc.)
const SYSTEM_PROMPT = `You are a specialized exam content extraction AI with enhanced visual analysis capabilities.

## YOUR TASK
Extract ALL exam questions from the page image. Questions are numbered like:
- Main questions: 1, 2, 3, 4...
- Sub-questions: 1(a), 1(b), 1(i), 1(ii), 1.a, 1.1, etc.
- Nested: 1(a)(i), 1(b)(ii), etc.

## CRITICAL: DETECT EVERY QUESTION
You MUST find and extract ALL questions visible on the page:
- Main numbered questions (1, 2, 3...)
- ALL sub-parts (a, b, c OR i, ii, iii OR 1, 2, 3)
- Each sub-question is a SEPARATE entry in the output

## GRAPH/DIAGRAM DETECTION
For EACH question, detect if it has an associated visual element:
- Coordinate planes, grids, axes (x-y graphs)
- Bar charts, line graphs, pie charts, histograms
- Venn diagrams, tree diagrams, flow charts
- Geometric figures (triangles, circles, shapes)
- Tables with data, matrices
- Any drawn or printed visual element

## BOUNDING BOX INSTRUCTIONS
When a graph/diagram is detected for a question:
1. Identify the EXACT boundaries of the visual element
2. Report coordinates as percentages (0-100) of image dimensions:
   - x_min: left edge percentage
   - y_min: top edge percentage  
   - x_max: right edge percentage
   - y_max: bottom edge percentage

## OUTPUT FORMAT (JSON array - return ALL questions found)
{
  "questions": [
    {
      "question_number": "1",
      "question_text": "main question text",
      "marks": 4,
      "has_sub_questions": true,
      "graph_found": false,
      "graph_bounding_box": null,
      "graph_type": null,
      "graph_description": null
    },
    {
      "question_number": "1(a)",
      "parent_question": "1",
      "question_text": "sub-question a text",
      "marks": 2,
      "has_sub_questions": false,
      "graph_found": true,
      "graph_type": "coordinate_plane",
      "graph_bounding_box": {"x_min": 15, "y_min": 40, "x_max": 85, "y_max": 75},
      "graph_description": "coordinate plane with x and y axes"
    },
    {
      "question_number": "1(b)",
      "parent_question": "1",
      "question_text": "sub-question b text",
      "marks": 2,
      "graph_found": false,
      "graph_bounding_box": null
    }
  ],
  "total_questions_found": 3,
  "page_has_diagrams": true
}

RULES:
- Extract EVERY visible question and sub-question
- Each sub-question (a, b, i, ii) is a SEPARATE entry
- Detect marks if shown (e.g., "[2]" or "[2 marks]")
- Be thorough - DO NOT miss any questions or diagrams
- Return valid JSON array with ALL questions`;

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
                  text: `ANALYZE EXAM PAGE ${pageIndex + 1} - EXTRACT ALL QUESTIONS WITH THEIR NUMBERING

CRITICAL INSTRUCTIONS:
1. Find EVERY question on this page (1, 2, 3... AND sub-questions a, b, i, ii, etc.)
2. Each sub-question (1a, 1b, 1(i), 1(ii)) is a SEPARATE entry
3. Detect marks for each question (e.g., [2], [3 marks])
4. For EACH question, check if it has an associated diagram/graph
5. If a diagram exists, provide PRECISE bounding box coordinates

Question numbering examples to detect:
- "1." or "1)" → question_number: "1"
- "(a)" or "a)" after question 1 → question_number: "1(a)"
- "(i)" or "i)" after question 1 → question_number: "1(i)"
- "2(a)(i)" → nested sub-question

Return a JSON object with a "questions" array containing ALL questions found.
Each question should have: question_number, question_text, marks, graph_found, graph_bounding_box, graph_type, graph_description.

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
          
          // Handle new multi-question format
          const pageQuestions = parsed.questions || [parsed];
          
          console.log(`Page ${i + 1} extracted with ${model_used}: ${pageQuestions.length} questions found`);
          
          // Process each question from the page
          for (const q of pageQuestions) {
            const questionData: any = {
              question_number: q.question_number || "not found",
              question_text: q.question_text || "unreadable",
              marks: q.marks || 1,
              has_sub_questions: Boolean(q.has_sub_questions),
              parent_question: q.parent_question || null,
              graph_found: Boolean(q.graph_found),
              graph_bounding_box: q.graph_bounding_box || null,
              graph_type: q.graph_type || null,
              graph_description: q.graph_description || null,
              page: i + 1,
              model_used,
              source_image: imageContent
            };
            
            // Enhanced crop metadata for graphs
            if (q.graph_found && q.graph_bounding_box) {
              const bbox = q.graph_bounding_box;
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
          }
          
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
