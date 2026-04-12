import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// ENHANCED IB MATHEMATICS QUESTION PARSER v3
// Features:
// 1. Extracts ALL questions per page (1a, 1b, 2, 3a, 3b, etc.)
// 2. Detects multiple diagrams per page with precise bounding boxes
// 3. Extracts structured table data (headers, rows, empty cells)
// 4. Pattern-based interactive type detection
// 5. Saves parsing patterns for learning
// ============================================

const SYSTEM_PROMPT = `You are an IB Mathematics eAssessment question parser. Extract ALL questions from each page with EXACT accuracy.

CRITICAL RULES:
1. Extract EVERY question and sub-question visible (1a, 1b, 1c, 2, 3a, 3b, 3c, 3d, 3e, etc.)
2. Each sub-question (a, b, c, i, ii) is a SEPARATE entry in the array
3. Return question_number EXACTLY as shown: "1a", "1b", "2", "3a", "3b", etc.
4. Set parent_question for sub-questions: "1" for "1a", "3" for "3a", etc.

QUESTION NUMBER PATTERNS:
- Main questions: "1", "2", "3", "Question 1", "Q1"
- Sub-questions: "1a", "1b", "1c", "1(a)", "1(i)", "(a)", "(b)", "(i)", "(ii)"
- Nested: "1a(i)", "1a(ii)", "2b(i)"
- Extract the label shown: "Question 1a" → "1a", "(b)" after "2" → "2b"

DIAGRAM DETECTION - CRITICAL:
Detect ALL visual elements on each page:
1. VENN DIAGRAMS: Overlapping circles, sets A/B, intersections A∩B, unions A∪B
   - diagram_type: "venn"
   - Look for: "Set A represents", "A ∩ B", "Complete the Venn diagram"
   
2. COORDINATE GRAPHS: x-y axes, grid lines, plotted functions, shaded regions
   - diagram_type: "coordinate_graph"
   - Look for: f(x), y=mx+c, "Plot", "Draw", "Shade the region"
   
3. TABLES: Any grid with rows/columns, data tables, frequency tables
   - diagram_type: "table"
   - has_table: true
   - Extract table_data as 2D array
   
4. TREE DIAGRAMS: Branching probability structures
   - diagram_type: "tree"
   
5. PIE CHARTS: Circular segments with percentages
   - diagram_type: "pie_chart"
   
6. GEOMETRIC FIGURES: Triangles, circles, 3D shapes, angles
   - diagram_type: "geometric"
   
7. BOX PLOTS: Box-and-whisker diagrams, quartiles
   - diagram_type: "box_plot"
   
8. BAR/HISTOGRAM: Vertical/horizontal bars, frequency distributions
   - diagram_type: "bar_chart"

For EACH diagram, return bounding_box as percentages (0-100):
{
  "x_min": 10,  // Left edge percentage
  "y_min": 20,  // Top edge percentage  
  "x_max": 90,  // Right edge percentage
  "y_max": 80   // Bottom edge percentage
}

TABLE EXTRACTION - CRITICAL:
For ANY table visible on the page:
1. Set has_table: true
2. Extract table_data as 2D array: [["Header1","Header2"],["Row1Col1","Row1Col2"],...]
3. Mark empty cells requiring student input as "" or "[BLANK]"
4. Identify table_type: "frequency" | "two_way" | "function" | "data" | "probability"
5. Include table_bounding_box with x_min, y_min, x_max, y_max

Example table extraction:
A frequency table showing: | Grade | 1 | 2 | 3 | 4 |
                          | Count | 3 | 5 | 8 | 4 |
Should extract as: [["Grade","1","2","3","4"],["Count","3","5","8","4"]]

INTERACTIVE TYPE MAPPING:
Based on question content, set interactive_type to:
- "drag_drop": Match expressions, arrange items, "Drag and drop", "Place in correct order"
- "image_drop": Venn diagrams, tree diagrams, label diagrams, "Complete the Venn diagram"
- "graph_plot": Plot points, draw graphs, shade regions, "Plot the function"
- "table_input": Complete tables, fill missing values, frequency tables
- "smart_math": Calculate, solve, evaluate, simplify, determine, find the value
- "multiple_choice": Select option A/B/C/D, "Which of the following"
- "arrange_order": Step-by-step solutions, proof ordering
- "text_equation": Explain, describe, comment, justify, short answer

DRAGGABLE ITEMS EXTRACTION:
When "Drag and drop" or "Draggable" appears:
- Extract ALL draggable items/expressions listed
- Return as draggable_items array: ["3x+4", "2x+1+x+3", "(4x+2)-(x-2)"]

MCQ OPTIONS EXTRACTION:
When options A/B/C/D are present:
- Extract options: {"A": "text", "B": "text", "C": "text", "D": "text"}
- If options are images: option_images: {"A": true, "B": true, ...}
- Include descriptions: option_descriptions: {"A": "Triangle with 28cm", ...}

MARKS EXTRACTION:
- Look for: "[2]", "(2 marks)", "(2)", "2 marks"
- Default to 1 if not specified

RETURN FORMAT (JSON only):
{
  "questions": [
    {
      "question_number": "1a",
      "parent_question": "1",
      "question_text": "Exact question text verbatim",
      "marks": 2,
      "command_term": "Calculate|Determine|Find|Explain|Describe|Show|State|Sketch",
      
      "graph_found": true,
      "diagram_type": "venn|coordinate_graph|tree|pie_chart|geometric|table|box_plot",
      "diagram_description": "Detailed description of what the diagram shows",
      "graph_bounding_box": {"x_min": 10, "y_min": 20, "x_max": 90, "y_max": 80},
      
      "has_table": true,
      "table_data": [["Header1","Header2"],["Val1","Val2"]],
      "table_type": "frequency|two_way|function|data|probability",
      "table_bounding_box": {"x_min": 15, "y_min": 30, "x_max": 85, "y_max": 60},
      
      "options": {"A": "option A text", "B": "option B text"} or null,
      "option_images": {"A": true, "B": false} or null,
      "option_descriptions": {"A": "Description of image A"} or null,
      "draggable_items": ["item1", "item2", "item3"] or null,
      
      "interactive_type": "smart_math",
      "parsing_verified": true
    }
  ],
  "detected_patterns": {
    "has_venn_diagrams": true,
    "has_coordinate_graphs": false,
    "has_tables": true,
    "has_drag_drop": true,
    "total_diagrams": 3,
    "question_numbering_style": "1a,1b,2,3a"
  }
}

STRICT VALIDATION:
- Return ONLY valid JSON
- Each visible question/sub-question = ONE entry
- If text is unclear: parsing_verified = false
- Never invent questions not visible on page
- Ignore headers, footers, page numbers, timer elements`;

// Models configuration
const PRIMARY_MODEL = 'google/gemini-2.5-flash';
const FALLBACK_MODEL = 'google/gemini-2.5-pro';
const PAGE_TIMEOUT = 45000;  // 45 seconds for complex pages
const MAX_PAGES_PER_REQUEST = 3;  // Process 3 pages per batch
const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// IB pattern detection for automatic type mapping
const INTERACTIVE_PATTERNS = {
  drag_drop: [
    /drag\s*(and|&)?\s*drop/i,
    /draggable/i,
    /match\s*(the|each)?/i,
    /place\s*(in|the)\s*(correct|right)/i,
    /arrange\s*(in|the)\s*order/i,
    /select\s*the\s*expressions?/i,
    /identify\s*(the)?\s*(two|three|four)\s*expressions?/i,
  ],
  image_drop: [
    /complete\s*(the)?\s*venn/i,
    /venn\s*diagram/i,
    /label\s*(the)?\s*(diagram|figure)/i,
    /tree\s*diagram/i,
    /complete\s*(the)?\s*(diagram|figure)/i,
    /insert\s*(your)?\s*answers?\s*(in|into)\s*(the)?\s*diagram/i,
    /determine\s*(the)?\s*missing\s*values?\s*(and)?\s*complete/i,
  ],
  graph_plot: [
    /plot\s*(the)?\s*(point|graph|function)/i,
    /draw\s*(the)?\s*(graph|line|curve)/i,
    /shade\s*(the)?\s*(region|area)/i,
    /sketch\s*(the)?\s*(graph|function)/i,
    /on\s*(the)?\s*(graph|axes|grid)/i,
    /coordinate\s*(plane|grid|system)/i,
    /y\s*=\s*[\w\d\+\-\*\/\^]+/i,
    /f\s*\(\s*x\s*\)/i,
  ],
  table_input: [
    /complete\s*(the)?\s*table/i,
    /fill\s*(in)?\s*(the)?\s*table/i,
    /missing\s*values?\s*(in|from)?\s*(the)?\s*table/i,
    /frequency\s*table/i,
    /two-?way\s*table/i,
    /copy\s*(and)?\s*complete/i,
    /input\s*output\s*table/i,
  ],
  multiple_choice: [
    /which\s*(of\s*(the|these))?\s*(following)?/i,
    /select\s*(the)?\s*(correct|best|right)/i,
    /choose\s*(the)?/i,
    /option\s*[A-D]/i,
  ],
  smart_math: [
    /calculate/i,
    /determine/i,
    /find\s*(the)?\s*(value|length|area|volume)/i,
    /solve/i,
    /evaluate/i,
    /simplify/i,
    /show\s*(that|working)/i,
    /work\s*out/i,
    /compute/i,
  ],
  arrange_order: [
    /step\s*by\s*step/i,
    /show\s*(your)?\s*working/i,
    /proof/i,
    /in\s*order/i,
    /sequence\s*(of)?\s*steps/i,
  ],
  text_equation: [
    /explain/i,
    /describe/i,
    /comment/i,
    /justify/i,
    /state/i,
    /write\s*down/i,
    /interpret/i,
  ]
};

// Detect interactive type from question text
function detectInteractiveType(text: string, hasTable: boolean, diagramType: string | null): string {
  if (!text) return 'text_equation';
  
  const lowerText = text.toLowerCase();
  
  // Check for explicit table requirements
  if (hasTable || /complete\s*(the)?\s*table/i.test(text)) {
    return 'table_input';
  }
  
  // Check for Venn/tree diagrams
  if (diagramType === 'venn' || diagramType === 'tree') {
    return 'image_drop';
  }
  
  // Check for coordinate graphs
  if (diagramType === 'coordinate_graph' && /plot|draw|shade|sketch/i.test(text)) {
    return 'graph_plot';
  }
  
  // Check all patterns
  for (const [type, patterns] of Object.entries(INTERACTIVE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return type;
      }
    }
  }
  
  return 'text_equation';
}

// Extract command term from question text
function extractCommandTerm(text: string): string | null {
  const commandTerms = [
    'Calculate', 'Determine', 'Find', 'Solve', 'Evaluate', 'Simplify',
    'Show', 'Prove', 'Demonstrate', 'Explain', 'Describe', 'Comment',
    'Justify', 'State', 'Write', 'Sketch', 'Draw', 'Plot', 'Compare',
    'Contrast', 'Identify', 'Classify', 'Predict', 'Suggest', 'Outline',
    'Analyse', 'Analyze', 'Discuss', 'Examine', 'Interpret', 'Apply'
  ];
  
  for (const term of commandTerms) {
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    if (regex.test(text)) {
      return term;
    }
  }
  
  return null;
}

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
                text: `EXAM PAGE ${pageIndex + 1} - EXTRACT ALL QUESTIONS:

INSTRUCTIONS:
1. Read EVERY question number visible: 1a, 1b, 1c, 2, 3a, 3b, 3c, 3d, 3e...
2. Each sub-question (a, b, c) = SEPARATE JSON entry
3. Detect ALL diagrams: Venn, graphs, tables, geometric figures
4. For each diagram: provide precise bounding_box percentages
5. Extract table data as 2D arrays
6. Identify interactive type for each question

CRITICAL: Do NOT merge sub-questions. "1a", "1b", "1c" = 3 separate entries.

Return valid JSON only with the "questions" array.` 
              },
              { type: 'image_url', image_url: { url: imageContent, detail: 'high' } }
            ]
          }
        ],
        max_tokens: 6000,
        temperature: 0.1
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error ${response.status}:`, errorText);
      throw new Error(`API: ${response.status}`);
    }

    return await response.json();

  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // Try fallback model on timeout or error
    if (!useFallback && (error.name === 'AbortError' || error.message.includes('timeout'))) {
      console.log(`Page ${pageIndex + 1}: Retrying with fallback model ${FALLBACK_MODEL}`);
      return analyzePageWithVision(apiKey, imageContent, pageIndex, true);
    }
    
    throw error;
  }
}

function parseAIResponse(content: string): { questions: any[], patterns: any } {
  try {
    const parsed = JSON.parse(content);
    if (parsed.questions && Array.isArray(parsed.questions)) {
      return { 
        questions: parsed.questions, 
        patterns: parsed.detected_patterns || {} 
      };
    }
    if (Array.isArray(parsed)) {
      return { questions: parsed, patterns: {} };
    }
    if (parsed.question_number) {
      return { questions: [parsed], patterns: {} };
    }
  } catch {
    // Try extracting JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const json = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(json.trim());
        if (parsed.questions) {
          return { 
            questions: parsed.questions, 
            patterns: parsed.detected_patterns || {} 
          };
        }
        if (Array.isArray(parsed)) {
          return { questions: parsed, patterns: {} };
        }
        return { questions: [parsed], patterns: {} };
      } catch {}
    }
  }
  return { questions: [], patterns: {} };
}

// Map detected type to valid AnswerBlockType
function mapToAnswerBlockType(detected: string | undefined, questionText?: string, hasTable?: boolean, diagramType?: string): string {
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
    'table': 'table_input',
    'table_input': 'table_input',
    'table_fill': 'table_input',
    'frequency': 'table_input',
    'two_way': 'table_input',
    'complete_table': 'table_input',
    'text': 'text_equation',
    'text_equation': 'text_equation',
    'explain': 'text_equation',
    'describe': 'text_equation'
  };
  
  // Priority 1: Explicit table flag
  if (hasTable) {
    return 'table_input';
  }
  
  // Priority 2: Diagram type mapping
  if (diagramType === 'venn' || diagramType === 'tree') {
    return 'image_drop';
  }
  if (diagramType === 'coordinate_graph') {
    // Check if it requires interaction
    if (questionText && /plot|draw|shade|sketch/i.test(questionText)) {
      return 'graph_plot';
    }
  }
  
  // Priority 3: Detected type from AI
  if (detected) {
    const lower = detected.toLowerCase();
    for (const [key, value] of Object.entries(typeMap)) {
      if (lower.includes(key)) return value;
    }
  }
  
  // Priority 4: Pattern detection from question text
  if (questionText) {
    return detectInteractiveType(questionText, false, diagramType || null);
  }
  
  return 'text_equation';
}

function flattenResults(questions: any[], pageIndex: number, imageContent: string): any[] {
  return questions.map(q => {
    const hasTable = q.has_table || Boolean(q.table_data);
    const diagramType = q.diagram_type || null;
    const interactiveType = mapToAnswerBlockType(
      q.interactive_type || q.answer_type, 
      q.question_text, 
      hasTable,
      diagramType
    );
    const commandTerm = q.command_term || extractCommandTerm(q.question_text || '');
    
    // Normalize question number
    let questionNumber = q.question_number || q.number || 'unknown';
    if (typeof questionNumber === 'string') {
      // Remove "Question" prefix: "Question 1a" → "1a"
      questionNumber = questionNumber.replace(/^question\s*/i, '').trim();
    }
    
    // Extract parent question number
    let parentQuestion = q.parent_question || null;
    if (!parentQuestion && typeof questionNumber === 'string') {
      const match = questionNumber.match(/^(\d+)/);
      if (match && questionNumber.length > match[1].length) {
        parentQuestion = match[1];
      }
    }
    
    return {
      question_number: questionNumber,
      parent_question: parentQuestion,
      question_text: q.question_text || q.text || '',
      marks: q.marks || 1,
      command_term: commandTerm,
      has_sub_questions: false,
      
      // MCQ options
      options: q.options || null,
      option_images: q.option_images || null,
      option_descriptions: q.option_descriptions || null,
      option_bounding_boxes: q.option_bounding_boxes || null,
      
      // Draggable items
      draggable_items: q.draggable_items || null,
      
      // Diagram detection
      graph_found: q.graph_found || Boolean(q.diagram_type || q.graph_bounding_box || q.diagram_description),
      graph_bounding_box: q.graph_bounding_box || null,
      graph_description: q.diagram_description || q.graph_description || null,
      diagram_type: diagramType,
      
      // Table detection
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
      page: pageIndex + 1
      // NOTE: source_image removed to avoid response bloat — client already has page images locally
    };
  });
}

// Save parsing patterns to admin_settings for learning
async function saveParsingPatterns(patterns: any, questions: any[]) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) return;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Compile statistics
    const stats = {
      total_questions: questions.length,
      interactive_types: questions.reduce((acc: any, q) => {
        const type = q.interactive_type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
      diagram_types: questions.reduce((acc: any, q) => {
        if (q.diagram_type) {
          acc[q.diagram_type] = (acc[q.diagram_type] || 0) + 1;
        }
        return acc;
      }, {}),
      tables_found: questions.filter(q => q.has_table).length,
      diagrams_found: questions.filter(q => q.graph_found).length,
      verified_count: questions.filter(q => q.parsing_verified).length,
      ...patterns,
      last_updated: new Date().toISOString()
    };
    
    // Upsert to admin_settings
    await supabase.from('admin_settings').upsert({
      setting_key: 'ai_parser_patterns',
      setting_type: 'json',
      setting_value: stats,
      description: 'Learned patterns from AI question parser',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'setting_key'
    });
    
    console.log('Saved parsing patterns:', JSON.stringify(stats).substring(0, 200));
  } catch (e) {
    console.error('Failed to save patterns:', e);
  }
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
      
      console.log(`📄 Processing pages ${startPage + 1}-${endPage} of ${totalPages}`);
      
      const allQuestions: any[] = [];
      const allPatterns: any = {};
      let verifiedCount = 0;
      let graphCount = 0;
      let tableCount = 0;
      
      // Process pages sequentially to avoid rate limits
      for (let i = 0; i < pagesToProcess.length; i++) {
        const absolutePageIndex = startPage + i;
        const pageImage = pagesToProcess[i];
        
        const imageContent = pageImage.startsWith('data:') 
          ? pageImage 
          : `data:image/jpeg;base64,${pageImage}`;

        try {
          console.log(`🔍 Analyzing page ${absolutePageIndex + 1}...`);
          
          const data = await analyzePageWithVision(
            LOVABLE_API_KEY,
            imageContent,
            absolutePageIndex
          );
          
          const aiContent = data.choices?.[0]?.message?.content || '{}';
          const { questions, patterns } = parseAIResponse(aiContent);
          
          console.log(`✅ Page ${absolutePageIndex + 1}: ${questions.length} questions extracted`);
          
          // Merge patterns
          Object.assign(allPatterns, patterns);
          
          const pageResults = flattenResults(questions, absolutePageIndex, imageContent);
          
          // Count statistics
          pageResults.forEach(q => {
            if (q.parsing_verified) verifiedCount++;
            if (q.graph_found) graphCount++;
            if (q.has_table) tableCount++;
          });
          
          allQuestions.push(...pageResults);
          
        } catch (e: any) {
          console.error(`❌ Page ${absolutePageIndex + 1} error:`, e.message);
          
          allQuestions.push({
            question_number: `page_${absolutePageIndex + 1}_error`,
            question_text: `Failed to parse page ${absolutePageIndex + 1}: ${e.message}`,
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
      
      // Save patterns for learning (async, non-blocking)
      saveParsingPatterns(allPatterns, allQuestions).catch(console.error);
      
      // Log summary
      const interactiveTypes = [...new Set(allQuestions.map(q => q.interactive_type))];
      const diagramTypes = [...new Set(allQuestions.filter(q => q.diagram_type).map(q => q.diagram_type))];
      
      console.log(`📊 Summary: ${allQuestions.length} questions, ${verifiedCount} verified`);
      console.log(`   Diagrams: ${graphCount} | Tables: ${tableCount}`);
      console.log(`   Types: ${interactiveTypes.join(', ')}`);
      console.log(`   Diagram types: ${diagramTypes.join(', ') || 'none'}`);

      return new Response(
        JSON.stringify({
          success: true,
          all_pages: allQuestions,
          parsed_count: allQuestions.length,
          verified_count: verifiedCount,
          graph_count: graphCount,
          table_count: tableCount,
          interactive_types: interactiveTypes,
          diagram_types: diagramTypes,
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

    // Text-based parsing fallback
    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No content provided' }),
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
          { role: 'user', content: `Extract ALL questions from this text. Each sub-question (a,b,c) = separate entry:\n\n${content.substring(0, 8000)}` }
        ],
        max_tokens: 4000
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || '';
    const { questions, patterns } = parseAIResponse(aiContent);
    const allQuestions = flattenResults(questions, 0, '');
    
    // Save patterns
    saveParsingPatterns(patterns, allQuestions).catch(console.error);

    return new Response(
      JSON.stringify({
        success: true,
        all_pages: allQuestions,
        parsed_count: allQuestions.length,
        verified_count: allQuestions.filter(q => q.parsing_verified).length,
        graph_count: allQuestions.filter(q => q.graph_found).length,
        table_count: allQuestions.filter(q => q.has_table).length,
        interactive_types: [...new Set(allQuestions.map(q => q.interactive_type))]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Parser error:', error.message);
    
    // Handle rate limits
    if (error.message?.includes('429') || error.message?.includes('rate')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded. Please wait and try again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
