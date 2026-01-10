import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Optimized system prompt - more concise for faster processing
const SYSTEM_PROMPT = `You are an exam document analyzer. Extract ALL elements from exam pages.

OUTPUT FORMAT (JSON only):
{
  "page_analysis": {"total_questions": N, "total_tables": N, "total_diagrams": N},
  "questions": [
    {
      "question_number": "1a",
      "parent_question": "1",
      "question_text": "Full text...",
      "marks": 3,
      "command_term": "Calculate",
      "has_table": false,
      "table_data": null,
      "has_diagram": true,
      "diagram_type": "coordinate_graph",
      "diagram_description": "x-y axis with curve",
      "diagram_bbox": {"x_min": 10, "y_min": 20, "x_max": 90, "y_max": 60}
    }
  ],
  "standalone_tables": [],
  "standalone_diagrams": []
}

RULES:
1. Each sub-question (a,b,c or i,ii,iii) = SEPARATE entry
2. Marks from [2], [2 marks], (2 marks)
3. Command terms: Calculate, Determine, Show, State, Explain
4. Diagram bbox as % coordinates (0-100)
5. Return VALID JSON only`;

// Use faster models with shorter timeout for better resource usage
const MODELS = {
  primary: 'google/gemini-2.5-flash-lite',  // Fastest
  fallback: 'google/gemini-2.5-flash',      // Fast + good
  advanced: 'google/gemini-2.5-pro'         // For single complex page
};

const PAGE_TIMEOUT = 15000;  // 15 seconds per page
const MAX_PAGES_PER_REQUEST = 5;  // Process max 5 pages per request
const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (supabaseUrl && supabaseKey) {
    return createClient(supabaseUrl, supabaseKey);
  }
  return null;
}

// Store parsing feedback (lightweight version)
async function storeParsingFeedback(
  questionsCount: number,
  modelUsed: string,
  success: boolean
) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    const { data: existing } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'ai_parser_learning_data')
      .single();
    
    const currentCount = existing?.setting_value?.total_pages_processed || 0;
    const successCount = existing?.setting_value?.success_count || 0;
    
    await supabase
      .from('admin_settings')
      .upsert({
        setting_key: 'ai_parser_learning_data',
        setting_type: 'json',
        setting_value: { 
          last_updated: new Date().toISOString(),
          total_pages_processed: currentCount + 1,
          success_count: successCount + (success ? 1 : 0),
          last_model: modelUsed,
          last_questions_extracted: questionsCount
        }
      }, { onConflict: 'setting_key' });
      
  } catch (e) {
    // Silent fail - don't block main processing
  }
}

// Optimized vision analysis - single model with timeout
async function analyzePageWithVision(
  apiKey: string,
  imageContent: string,
  pageIndex: number
): Promise<{ data: any; model_used: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PAGE_TIMEOUT);

  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODELS.primary,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Page ${pageIndex + 1}: Extract ALL questions, tables, diagrams. Each sub-question (a,b,c) is separate. Include marks and bounding boxes for diagrams.`
              },
              {
                type: 'image_url',
                image_url: { url: imageContent, detail: 'low' }  // Use 'low' for faster processing
              }
            ]
          }
        ],
        max_tokens: 2000  // Limit response size
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return { data, model_used: MODELS.primary };

  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // Try fallback model once
    if (!error.message.includes('aborted')) {
      try {
        const fallbackController = new AbortController();
        const fallbackTimeout = setTimeout(() => fallbackController.abort(), PAGE_TIMEOUT);
        
        const response = await fetch(LOVABLE_AI_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: MODELS.fallback,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              {
                role: 'user',
                content: [
                  { type: 'text', text: `Page ${pageIndex + 1}: Extract questions, tables, diagrams.` },
                  { type: 'image_url', image_url: { url: imageContent, detail: 'low' } }
                ]
              }
            ],
            max_tokens: 2000
          }),
          signal: fallbackController.signal
        });
        
        clearTimeout(fallbackTimeout);
        
        if (response.ok) {
          const data = await response.json();
          return { data, model_used: MODELS.fallback };
        }
      } catch {
        // Fallback also failed
      }
    }
    
    throw error;
  }
}

// Parse AI response
function parseAIResponse(content: string): any {
  try {
    const parsed = JSON.parse(content);
    return normalizeResponse(parsed);
  } catch {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const json = jsonMatch[1] || jsonMatch[0];
        return normalizeResponse(JSON.parse(json.trim()));
      } catch {}
    }
  }
  
  return {
    page_analysis: { total_questions: 0, total_tables: 0, total_diagrams: 0 },
    questions: [],
    standalone_tables: [],
    standalone_diagrams: []
  };
}

function normalizeResponse(parsed: any): any {
  if (parsed.question_number && !parsed.questions) {
    return {
      page_analysis: { total_questions: 1, total_tables: 0, total_diagrams: parsed.has_diagram ? 1 : 0 },
      questions: [parsed],
      standalone_tables: [],
      standalone_diagrams: []
    };
  }
  
  if (Array.isArray(parsed)) {
    return {
      page_analysis: { total_questions: parsed.length, total_tables: 0, total_diagrams: 0 },
      questions: parsed,
      standalone_tables: [],
      standalone_diagrams: []
    };
  }
  
  return {
    page_analysis: parsed.page_analysis || { total_questions: 0, total_tables: 0, total_diagrams: 0 },
    questions: parsed.questions || [],
    standalone_tables: parsed.standalone_tables || [],
    standalone_diagrams: parsed.standalone_diagrams || []
  };
}

// Flatten results
function flattenPageResults(pageResult: any, pageIndex: number, sourceImage: string, modelUsed: string): any[] {
  const results: any[] = [];
  
  for (const q of pageResult.questions || []) {
    results.push({
      question_number: q.question_number || "unknown",
      parent_question: q.parent_question || null,
      question_text: q.question_text || "",
      marks: q.marks || 1,
      command_term: q.command_term || null,
      has_sub_questions: false,
      graph_found: q.has_diagram || Boolean(q.diagram_bbox),
      graph_type: q.diagram_type || null,
      graph_description: q.diagram_description || null,
      graph_bounding_box: q.diagram_bbox || null,
      has_table: q.has_table || Boolean(q.table_data),
      table_data: q.table_data || null,
      page: pageIndex + 1,
      model_used: modelUsed,
      source_image: sourceImage,
      diagram_crop: q.diagram_bbox ? {
        source_image_index: pageIndex,
        bbox: q.diagram_bbox
      } : null
    });
  }
  
  for (const table of pageResult.standalone_tables || []) {
    results.push({
      question_number: `table_${table.table_id || 'T1'}`,
      question_text: table.description || "Standalone table",
      marks: 0,
      is_table: true,
      table_data: table.rows ? [table.headers, ...table.rows] : null,
      graph_found: false,
      page: pageIndex + 1,
      model_used: modelUsed,
      source_image: sourceImage
    });
  }
  
  for (const diagram of pageResult.standalone_diagrams || []) {
    results.push({
      question_number: `diagram_${diagram.diagram_id || 'D1'}`,
      question_text: diagram.description || "Standalone diagram",
      marks: 0,
      is_diagram: true,
      graph_found: true,
      graph_type: diagram.type,
      graph_description: diagram.description,
      graph_bounding_box: diagram.bbox,
      related_questions: diagram.related_questions || [],
      page: pageIndex + 1,
      model_used: modelUsed,
      source_image: sourceImage,
      diagram_crop: diagram.bbox ? { source_image_index: pageIndex, bbox: diagram.bbox } : null
    });
  }
  
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, parseMode = 'mock', fileName, images, startPage = 0 } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Process images with pagination
    if (images && images.length > 0) {
      const totalPages = images.length;
      const endPage = Math.min(startPage + MAX_PAGES_PER_REQUEST, totalPages);
      const pagesToProcess = images.slice(startPage, endPage);
      
      console.log(`Processing pages ${startPage + 1}-${endPage} of ${totalPages}`);
      
      const allQuestions: any[] = [];
      let modelsUsed: string[] = [];
      
      for (let i = 0; i < pagesToProcess.length; i++) {
        const absolutePageIndex = startPage + i;
        const pageImage = pagesToProcess[i];
        
        console.log(`Page ${absolutePageIndex + 1}/${totalPages}`);
        
        const imageContent = pageImage.startsWith('data:') 
          ? pageImage 
          : `data:image/jpeg;base64,${pageImage}`;

        try {
          const { data, model_used } = await analyzePageWithVision(
            LOVABLE_API_KEY,
            imageContent,
            absolutePageIndex
          );
          
          modelsUsed.push(model_used);
          
          const aiContent = data.choices?.[0]?.message?.content || '{}';
          const parsed = parseAIResponse(aiContent);
          
          console.log(`Page ${absolutePageIndex + 1}: ${parsed.questions?.length || 0} questions`);
          
          const pageResults = flattenPageResults(parsed, absolutePageIndex, imageContent, model_used);
          allQuestions.push(...pageResults);
          
          // Store lightweight feedback
          storeParsingFeedback(parsed.questions?.length || 0, model_used, true);
          
        } catch (e: any) {
          console.error(`Page ${absolutePageIndex + 1} failed:`, e.message);
          
          allQuestions.push({
            question_number: `page_${absolutePageIndex + 1}_error`,
            question_text: `Page ${absolutePageIndex + 1} failed`,
            graph_found: false,
            page: absolutePageIndex + 1,
            error: e.message
          });
        }
      }

      const hasMorePages = endPage < totalPages;
      const uniqueModels = [...new Set(modelsUsed)];
      
      console.log(`Batch complete: ${allQuestions.length} entries`);

      return new Response(
        JSON.stringify({
          success: true,
          all_pages: allQuestions,
          parsed_count: allQuestions.length,
          pagination: {
            start_page: startPage,
            end_page: endPage,
            total_pages: totalPages,
            has_more: hasMorePages,
            next_start_page: hasMorePages ? endPage : null
          },
          summary: {
            total_entries: allQuestions.length,
            pages_processed: pagesToProcess.length
          },
          models_used: uniqueModels
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Text-based parsing fallback
    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Text parsing ${content.length} chars`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PAGE_TIMEOUT);

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
          { role: 'user', content: `Extract ALL questions from: ${content.substring(0, 5000)}` }
        ],
        max_tokens: 2000
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || '';
    const parsed = parseAIResponse(aiContent);
    const allQuestions = flattenPageResults(parsed, 0, '', MODELS.primary);

    return new Response(
      JSON.stringify({
        success: true,
        all_pages: allQuestions,
        parsed_count: allQuestions.length,
        model_used: MODELS.primary
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Parser error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
