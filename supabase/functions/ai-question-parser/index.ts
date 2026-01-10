import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Ultra-fast system prompt
const SYSTEM_PROMPT = `Extract exam questions. Return ONLY valid JSON:
{"questions":[{"question_number":"1a","question_text":"...","marks":2,"command_term":"Calculate","has_diagram":false,"diagram_description":null,"interactive_type":"math_input"}]}

RULES:
- Each sub-question (a,b,c) = SEPARATE entry
- Detect interactive_type: graph_plot, drag_drop, image_drop, arrange_order, math_input, multiple_choice, text_equation
- marks from [2] or (2 marks)
- Return VALID JSON only`;

// Only use fastest models
const MODEL = 'google/gemini-2.5-flash-lite';
const PAGE_TIMEOUT = 12000;  // 12 seconds
const MAX_PAGES_PER_REQUEST = 3;  // Process max 3 pages at a time
const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

async function analyzePageWithVision(
  apiKey: string,
  imageContent: string,
  pageIndex: number
): Promise<any> {
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
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Page ${pageIndex + 1}: Extract questions, marks, interactive_type (graph_plot/drag_drop/math_input/etc)` },
              { type: 'image_url', image_url: { url: imageContent, detail: 'low' } }
            ]
          }
        ],
        max_tokens: 1500
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API: ${response.status}`);
    }

    return await response.json();

  } catch (error: any) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function parseAIResponse(content: string): any[] {
  try {
    const parsed = JSON.parse(content);
    if (parsed.questions && Array.isArray(parsed.questions)) {
      return parsed.questions;
    }
    if (Array.isArray(parsed)) return parsed;
    if (parsed.question_number) return [parsed];
  } catch {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const json = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(json.trim());
        if (parsed.questions) return parsed.questions;
        if (Array.isArray(parsed)) return parsed;
        return [parsed];
      } catch {}
    }
  }
  return [];
}

// Map detected type to AnswerBlockType
function mapInteractiveType(detected: string | undefined): string {
  const typeMap: Record<string, string> = {
    'graph': 'graph_plot',
    'graph_plot': 'graph_plot',
    'graph_interaction': 'graph_plot',
    'plot': 'graph_plot',
    'coordinate': 'graph_plot',
    'drag': 'drag_drop',
    'drag_drop': 'drag_drop',
    'drag_drop_match': 'drag_drop',
    'match': 'drag_drop',
    'venn': 'image_drop',
    'image_drop': 'image_drop',
    'image_drop_zone': 'image_drop',
    'tree_diagram': 'image_drop',
    'arrange': 'arrange_order',
    'arrange_order': 'arrange_order',
    'step': 'arrange_order',
    'step_builder': 'arrange_order',
    'order': 'arrange_order',
    'math': 'smart_math',
    'math_input': 'smart_math',
    'calculate': 'smart_math',
    'mcq': 'multiple_choice',
    'multiple_choice': 'multiple_choice',
    'select': 'multiple_choice'
  };
  
  if (!detected) return 'text_equation';
  
  const lower = detected.toLowerCase();
  for (const [key, value] of Object.entries(typeMap)) {
    if (lower.includes(key)) return value;
  }
  
  return 'text_equation';
}

function flattenResults(questions: any[], pageIndex: number, imageContent: string): any[] {
  return questions.map(q => ({
    question_number: q.question_number || q.number || 'unknown',
    parent_question: q.parent_question || null,
    question_text: q.question_text || q.text || '',
    marks: q.marks || 1,
    command_term: q.command_term || null,
    has_sub_questions: false,
    graph_found: q.has_diagram || Boolean(q.diagram_description),
    graph_description: q.diagram_description || null,
    has_table: q.has_table || false,
    table_data: q.table_data || null,
    interactive_type: mapInteractiveType(q.interactive_type || q.answer_type),
    answer_block_type: mapInteractiveType(q.interactive_type || q.answer_type),
    page: pageIndex + 1,
    source_image: imageContent
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, images, startPage = 0 } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Process images with pagination
    if (images && images.length > 0) {
      const totalPages = images.length;
      const endPage = Math.min(startPage + MAX_PAGES_PER_REQUEST, totalPages);
      const pagesToProcess = images.slice(startPage, endPage);
      
      console.log(`Processing ${startPage + 1}-${endPage} of ${totalPages}`);
      
      const allQuestions: any[] = [];
      
      // Process pages sequentially to avoid resource limits
      for (let i = 0; i < pagesToProcess.length; i++) {
        const absolutePageIndex = startPage + i;
        const pageImage = pagesToProcess[i];
        
        const imageContent = pageImage.startsWith('data:') 
          ? pageImage 
          : `data:image/jpeg;base64,${pageImage}`;

        try {
          const data = await analyzePageWithVision(
            LOVABLE_API_KEY,
            imageContent,
            absolutePageIndex
          );
          
          const aiContent = data.choices?.[0]?.message?.content || '{}';
          const questions = parseAIResponse(aiContent);
          
          console.log(`Page ${absolutePageIndex + 1}: ${questions.length} questions`);
          
          const pageResults = flattenResults(questions, absolutePageIndex, imageContent);
          allQuestions.push(...pageResults);
          
        } catch (e: any) {
          console.error(`Page ${absolutePageIndex + 1}:`, e.message);
          
          allQuestions.push({
            question_number: `page_${absolutePageIndex + 1}_error`,
            question_text: `Failed to parse page ${absolutePageIndex + 1}`,
            graph_found: false,
            page: absolutePageIndex + 1,
            error: e.message,
            interactive_type: 'text_equation',
            answer_block_type: 'text_equation'
          });
        }
      }

      const hasMorePages = endPage < totalPages;
      
      console.log(`Done: ${allQuestions.length} entries`);

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
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Text-based parsing
    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PAGE_TIMEOUT);

    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Extract questions: ${content.substring(0, 3000)}` }
        ],
        max_tokens: 1500
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || '';
    const questions = parseAIResponse(aiContent);
    const allQuestions = flattenResults(questions, 0, '');

    return new Response(
      JSON.stringify({
        success: true,
        all_pages: allQuestions,
        parsed_count: allQuestions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
