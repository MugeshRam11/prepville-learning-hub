import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced MCQ extraction prompt based on IB eAssessment patterns
const SYSTEM_PROMPT = `You are an IB Mathematics eAssessment question extraction AI. Extract ALL questions with exact accuracy.

QUESTION PATTERNS TO DETECT:
1. DRAG & DROP: "Drag and drop", "Select the expressions", "Match", "Place in correct order", "Draggable expressions/items"
2. VENN DIAGRAM: "Venn diagram", "Set A represents", "A ∩ B", "Complete the diagram", "Determine missing values"  
3. COORDINATE GRAPH: "Plot", "Draw the graph", "Shade the region", "y = mx + c", coordinate axes visible
4. PIE CHART: Percentage sectors, "pie chart shows", "distribution"
5. TREE DIAGRAM: Branches showing probabilities, "probability tree", sequential outcomes
6. TABLE FILL: Empty cells to complete, "Complete the table", data tables
7. 3D GEOMETRY: "Volume", "Surface area", 3D shapes, isometric views
8. MCQ/SELECTION: "Select", "Option A/B/C/D", "Choose", multiple options to pick from
9. STEP BUILDER: "Show your working", "Step by step", multi-part calculation
10. MATH INPUT: "Calculate", "Determine", "Find the value", "Solve", "Simplify"

EXTRACTION RULES:
1. Question Number: Extract EXACTLY as shown (e.g., "1a", "2(i)", "3b")
2. Question Text: Copy VERBATIM - no paraphrasing
3. Visual Detection: 
   - graph_found=true if: coordinate grid, Venn, tree diagram, pie chart, 3D shape, geometric figure
   - Return bounding_box as {x_min, y_min, x_max, y_max} percentages (0-100)
4. Draggable Items: Extract ALL draggable expressions/options shown
5. MCQ Options: Extract A, B, C, D options exactly
6. Marks: From [2], (2 marks), (2), or "(X marks)" format

INTERACTIVE TYPE MAPPING:
- graph_plot: coordinate grids, plot points, draw lines, shade inequalities
- drag_drop: match expressions, arrange items, select correct options, ratios
- image_drop: Venn diagrams, tree diagrams, label geometric figures
- arrange_order: step-by-step solutions, proof ordering
- multiple_choice: Option A/B/C/D selection, "Select which"
- smart_math: calculate, solve, evaluate, simplify, determine
- text_equation: explain, describe, comment, justify

RETURN FORMAT - Valid JSON only:
{
  "questions": [
    {
      "question_number": "1a",
      "question_text": "exact question text including any instructions",
      "marks": 2,
      "command_term": "Calculate",
      "options": {"A": "option text", "B": "", "C": "", "D": ""} or null,
      "draggable_items": ["item1", "item2"] or null,
      "graph_found": true,
      "graph_bounding_box": {"x_min": 10, "y_min": 20, "x_max": 90, "y_max": 80},
      "diagram_description": "Venn diagram with sets A and B, showing intersection",
      "diagram_type": "venn|coordinate_graph|tree|pie_chart|3d_shape|table|geometric",
      "interactive_type": "drag_drop",
      "parsing_verified": true
    }
  ]
}

STRICT RULES:
- Each sub-question (a,b,c,i,ii) = SEPARATE entry
- Include parent_question reference (e.g., "1" for "1a")
- marks from visible mark allocation
- Extract ALL visible draggable expressions
- Ignore headers, footers, page numbers, timers
- If text is unclear: parsing_verified=false
- Return ONLY valid JSON`;

// Use flash-lite for speed, flash for fallback
const PRIMARY_MODEL = 'google/gemini-2.5-flash-lite';
const FALLBACK_MODEL = 'google/gemini-2.5-flash';
const PAGE_TIMEOUT = 15000;  // 15 seconds
const MAX_PAGES_PER_REQUEST = 3;
const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

async function analyzePageWithVision(
  apiKey: string,
  imageContent: string,
  pageIndex: number,
  useFallback: boolean = false
): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PAGE_TIMEOUT);
  const model = useFallback ? FALLBACK_MODEL : PRIMARY_MODEL;

  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: `Page ${pageIndex + 1}: Extract ALL questions with exact text, marks, MCQ options (if any), graph/diagram bounding boxes, and interactive_type. Verify parsing accuracy.` 
              },
              { type: 'image_url', image_url: { url: imageContent, detail: 'high' } }
            ]
          }
        ],
        max_tokens: 2500
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
    
    // Try fallback model on timeout or error
    if (!useFallback && (error.name === 'AbortError' || error.message.includes('timeout'))) {
      console.log(`Page ${pageIndex + 1}: Retrying with fallback model`);
      return analyzePageWithVision(apiKey, imageContent, pageIndex, true);
    }
    
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
    // Try extracting JSON from markdown code blocks
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
function mapInteractiveType(detected: string | undefined, questionText?: string): string {
  const typeMap: Record<string, string> = {
    'graph': 'graph_plot',
    'graph_plot': 'graph_plot',
    'graph_interaction': 'graph_plot',
    'plot': 'graph_plot',
    'coordinate': 'graph_plot',
    'shade': 'graph_plot',
    'draw': 'graph_plot',
    'drag': 'drag_drop',
    'drag_drop': 'drag_drop',
    'drag_drop_match': 'drag_drop',
    'match': 'drag_drop',
    'arrange': 'drag_drop',
    'venn': 'image_drop',
    'image_drop': 'image_drop',
    'image_drop_zone': 'image_drop',
    'tree_diagram': 'image_drop',
    'tree': 'image_drop',
    'label': 'image_drop',
    'step': 'arrange_order',
    'arrange_order': 'arrange_order',
    'order': 'arrange_order',
    'sequence': 'arrange_order',
    'math': 'smart_math',
    'math_input': 'smart_math',
    'calculate': 'smart_math',
    'solve': 'smart_math',
    'evaluate': 'smart_math',
    'simplify': 'smart_math',
    'smart_math': 'smart_math',
    'mcq': 'multiple_choice',
    'multiple_choice': 'multiple_choice',
    'select': 'multiple_choice'
  };
  
  if (detected) {
    const lower = detected.toLowerCase();
    for (const [key, value] of Object.entries(typeMap)) {
      if (lower.includes(key)) return value;
    }
  }
  
  // Auto-detect from question text
  if (questionText) {
    const lower = questionText.toLowerCase();
    if (lower.includes('plot') || lower.includes('draw the graph') || lower.includes('shade')) return 'graph_plot';
    if (lower.includes('match') || lower.includes('drag') || lower.includes('arrange')) return 'drag_drop';
    if (lower.includes('venn') || lower.includes('tree diagram') || lower.includes('label')) return 'image_drop';
    if (lower.includes('calculate') || lower.includes('solve') || lower.includes('find the value')) return 'smart_math';
    if (lower.includes('which of') || lower.includes('select') || lower.includes('choose')) return 'multiple_choice';
    if (lower.includes('step') || lower.includes('show your working')) return 'arrange_order';
  }
  
  return 'text_equation';
}

function flattenResults(questions: any[], pageIndex: number, imageContent: string): any[] {
  return questions.map(q => {
    const interactiveType = mapInteractiveType(q.interactive_type || q.answer_type, q.question_text);
    
    return {
      question_number: q.question_number || q.number || 'unknown',
      parent_question: q.parent_question || null,
      question_text: q.question_text || q.text || '',
      marks: q.marks || 1,
      command_term: q.command_term || null,
      has_sub_questions: false,
      
      // MCQ options if present
      options: q.options || null,
      
      // Graph/diagram detection
      graph_found: q.graph_found || q.has_diagram || Boolean(q.diagram_description || q.graph_bounding_box),
      graph_bounding_box: q.graph_bounding_box || null,
      graph_description: q.diagram_description || q.graph_description || null,
      
      // Table detection  
      has_table: q.has_table || false,
      table_data: q.table_data || null,
      
      // Interactive type mapping
      interactive_type: interactiveType,
      answer_block_type: interactiveType,
      
      // Verification
      parsing_verified: q.parsing_verified !== false,
      
      // Metadata
      page: pageIndex + 1,
      source_image: imageContent
    };
  });
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
      let verifiedCount = 0;
      let graphCount = 0;
      
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
          
          // Count verified and graph questions
          pageResults.forEach(q => {
            if (q.parsing_verified) verifiedCount++;
            if (q.graph_found) graphCount++;
          });
          
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
            answer_block_type: 'text_equation',
            parsing_verified: false
          });
        }
      }

      const hasMorePages = endPage < totalPages;
      
      console.log(`Done: ${allQuestions.length} entries, ${verifiedCount} verified, ${graphCount} with graphs`);

      return new Response(
        JSON.stringify({
          success: true,
          all_pages: allQuestions,
          parsed_count: allQuestions.length,
          verified_count: verifiedCount,
          graph_count: graphCount,
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
        model: PRIMARY_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Extract ALL questions with exact text: ${content.substring(0, 5000)}` }
        ],
        max_tokens: 2500
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
        parsed_count: allQuestions.length,
        verified_count: allQuestions.filter(q => q.parsing_verified).length,
        graph_count: allQuestions.filter(q => q.graph_found).length
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
