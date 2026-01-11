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
6. TABLE FILL: Empty cells to complete, "Complete the table", data tables, frequency tables, two-way tables
7. 3D GEOMETRY: "Volume", "Surface area", 3D shapes, isometric views
8. MCQ/SELECTION: "Select", "Option A/B/C/D", "Choose", multiple options to pick from
9. STEP BUILDER: "Show your working", "Step by step", multi-part calculation
10. MATH INPUT: "Calculate", "Determine", "Find the value", "Solve", "Simplify"

TABLE DETECTION - CRITICAL:
Detect ANY visible tables including:
- Data tables with rows/columns
- Frequency tables (value | frequency)
- Two-way tables / contingency tables
- Input-output function tables (x | f(x))
- Probability distribution tables
- Statistics tables (mean, median, mode)
- Tally charts and frequency distributions
- Tables with empty cells to fill

For EACH detected table:
1. Set has_table: true
2. Extract table_data as 2D array: [["header1","header2"],["row1col1","row1col2"],...]
3. Mark empty cells as "" (empty string)
4. Identify table_type: "frequency" | "two_way" | "function" | "probability" | "statistics" | "data"
5. Return table_bounding_box: {x_min, y_min, x_max, y_max} as percentages

EXTRACTION RULES:
1. Question Number: Extract EXACTLY as shown (e.g., "1a", "2(i)", "3b")
2. Question Text: Copy VERBATIM - no paraphrasing
3. Visual Detection: 
   - graph_found=true if: coordinate grid, Venn, tree diagram, pie chart, 3D shape, geometric figure
   - Return bounding_box as {x_min, y_min, x_max, y_max} percentages (0-100)
4. Draggable Items: Extract ALL draggable expressions/options shown
5. MCQ Options: Extract A, B, C, D options exactly. For IMAGE-BASED options:
   - Set option_images: {"A": true, "B": true, ...} if options are visual figures
   - Include option_descriptions: {"A": "Triangle with 28cm side", "B": "Rectangle rotated"} 
6. Marks: From [2], (2 marks), (2), or "(X marks)" format

INTERACTIVE TYPE MAPPING:
- graph_plot: coordinate grids, plot points, draw lines, shade inequalities
- drag_drop: match expressions, arrange items, select correct options, ratios
- image_drop: Venn diagrams, tree diagrams, label geometric figures
- arrange_order: step-by-step solutions, proof ordering
- multiple_choice: Option A/B/C/D selection, "Select which"
- smart_math: calculate, solve, evaluate, simplify, determine
- table_input: complete table, fill missing values, frequency table, two-way table
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
      "option_images": {"A": true, "B": true, "C": true, "D": false} or null,
      "option_descriptions": {"A": "Figure showing...", "B": "Diagram with..."} or null,
      "option_bounding_boxes": {"A": {"x_min": 0, "y_min": 0, "x_max": 50, "y_max": 50}} or null,
      "draggable_items": ["item1", "item2"] or null,
      "graph_found": true,
      "graph_bounding_box": {"x_min": 10, "y_min": 20, "x_max": 90, "y_max": 80},
      "diagram_description": "Venn diagram with sets A and B, showing intersection",
      "diagram_type": "venn|coordinate_graph|tree|pie_chart|3d_shape|table|geometric",
      "has_table": true,
      "table_data": [["x","f(x)"],["1","2"],["","5"]],
      "table_type": "function",
      "table_bounding_box": {"x_min": 20, "y_min": 30, "x_max": 80, "y_max": 60},
      "interactive_type": "table_input",
      "parsing_verified": true
    }
  ]
}

STRICT RULES:
- Each sub-question (a,b,c,i,ii) = SEPARATE entry
- Include parent_question reference (e.g., "1" for "1a")
- marks from visible mark allocation
- Extract ALL visible draggable expressions
- ALWAYS detect and extract tables with their data
- Ignore headers, footers, page numbers, timers
- If text is unclear: parsing_verified=false
- Return ONLY valid JSON`;

// Use gemini-2.5-flash for best Vision quality, pro as fallback for complex diagrams
const PRIMARY_MODEL = 'google/gemini-2.5-flash';
const FALLBACK_MODEL = 'google/gemini-2.5-pro';
const PAGE_TIMEOUT = 30000;  // 30 seconds for high-res images
const MAX_PAGES_PER_REQUEST = 2;  // Fewer pages but better quality
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
                text: `EXAM PAGE ${pageIndex + 1} - FULL IMAGE ANALYSIS:
                
1. Read ALL visible text exactly as shown
2. For each question: extract number, text, marks, command term
3. Detect ALL visuals: graphs, Venn diagrams, tree diagrams, tables, geometric figures
4. For each visual: return bounding_box as {x_min, y_min, x_max, y_max} percentages
5. Extract MCQ options A/B/C/D if present
6. Identify interactive_type for each question
7. Set parsing_verified=false if ANY text is unclear

Return valid JSON only.` 
              },
              { type: 'image_url', image_url: { url: imageContent, detail: 'high' } }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.1  // Low temperature for accurate extraction
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
function mapInteractiveType(detected: string | undefined, questionText?: string, hasTable?: boolean): string {
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
    'select': 'multiple_choice',
    // Table types
    'table': 'table_input',
    'table_input': 'table_input',
    'table_fill': 'table_input',
    'frequency': 'table_input',
    'two_way': 'table_input',
    'complete_table': 'table_input'
  };
  
  // Check for explicit table flag first
  if (hasTable) {
    return 'table_input';
  }
  
  if (detected) {
    const lower = detected.toLowerCase();
    for (const [key, value] of Object.entries(typeMap)) {
      if (lower.includes(key)) return value;
    }
  }
  
  // Auto-detect from question text
  if (questionText) {
    const lower = questionText.toLowerCase();
    // Table detection patterns - check first
    if (lower.includes('complete the table') || lower.includes('fill in the table') || 
        lower.includes('complete this table') || lower.includes('frequency table') ||
        lower.includes('two-way table') || lower.includes('missing values in the table') ||
        lower.includes('copy and complete')) {
      return 'table_input';
    }
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
    const hasTable = q.has_table || Boolean(q.table_data);
    const interactiveType = mapInteractiveType(q.interactive_type || q.answer_type, q.question_text, hasTable);
    
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
      diagram_type: q.diagram_type || null,
      
      // Table detection - enhanced
      has_table: hasTable,
      table_data: q.table_data || null,
      table_type: q.table_type || null,
      table_bounding_box: q.table_bounding_box || null,
      
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
