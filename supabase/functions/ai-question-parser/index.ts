import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// ENHANCED IB MATHEMATICS QUESTION PARSER v4
// Features:
// 1. Normalized output: main_question + sub_questions hierarchy
// 2. Image/diagram as separate fields (never embedded in text)
// 3. Exact math/LaTeX preservation
// 4. Bounding box extraction for all visual elements
// 5. Interactive type detection
// ============================================

const SYSTEM_PROMPT = `You are an IB Mathematics eAssessment question parser. Extract ALL questions from each page and normalize them into a hierarchical structure.

CRITICAL NORMALIZATION RULES:
You MUST adapt ALL input into this structure:
- One MAIN QUESTION (the shared passage/stem, or empty if none exists)
- Multiple SUB QUESTIONS (a, b, c...)

Rules:
1. If the document contains "Question 1a", "1b", "1c":
   → Treat them as SUB QUESTIONS of ONE MAIN QUESTION (number "1")
   → Convert: 1a → a, 1b → b, 1c → c
   
2. If a shared passage/context exists before the sub-questions:
   → Put it in "main_question_text"
   → Example: "A city council is surveying..." → main_question_text

3. If NO shared passage exists (sub-questions are standalone):
   → Set main_question_text = ""

4. Standalone questions without sub-parts (e.g., "Question 2" with no 2a, 2b):
   → main_question_text = the question text
   → sub_questions = [] (empty array)

QUESTION NUMBER PATTERNS:
- Main questions: "1", "2", "3", "Question 1", "Q1"
- Sub-questions: "1a", "1b", "1c", "1(a)", "1(i)", "(a)", "(b)", "(i)", "(ii)"
- Nested: "1a(i)", "1a(ii)", "2b(i)"

MATH & EQUATION PRESERVATION - CRITICAL:
- Preserve math EXACTLY as written
- Do NOT convert to plain text
- Keep all symbols: θ, π, ∈, ≤, ≥, ∞, ∑, ∫, √, etc.
- Keep formatting like (i), (ii)
- Keep LaTeX delimiters: $...$, $$...$$
- Keep fractions, exponents, subscripts as-is

IMAGE & DIAGRAM HANDLING - CRITICAL:
- NEVER embed images inside text
- Extract images as SEPARATE fields: "main_image" for main question, "image" for sub-questions
- If an image/diagram belongs to ALL sub-questions → assign to main question
- If an image/diagram belongs to ONE sub-question → assign to that sub-question
- Do NOT crop or split images
- For EVERY visual element detected, provide bounding box

DIAGRAM DETECTION:
Detect ALL visual elements:
1. VENN DIAGRAMS: overlapping circles, sets, intersections → diagram_type: "venn"
2. COORDINATE GRAPHS: x-y axes, plotted functions → diagram_type: "coordinate_graph"
3. TABLES: grids with rows/columns → diagram_type: "table", extract table_data as 2D array
4. TREE DIAGRAMS: branching probability → diagram_type: "tree"
5. PIE CHARTS: circular segments → diagram_type: "pie_chart"
6. GEOMETRIC FIGURES: triangles, circles, angles → diagram_type: "geometric"
7. BOX PLOTS: box-and-whisker → diagram_type: "box_plot"
8. BAR/HISTOGRAM: vertical/horizontal bars → diagram_type: "bar_chart"

BOUNDING BOX - MANDATORY for ALL diagrams:
{
  "x_min": 10, "y_min": 20, "x_max": 90, "y_max": 80
}
Percentages (0-100) of page dimensions. ALWAYS provide when graph_found is true.

TABLE EXTRACTION:
- has_table: true
- table_data: 2D array [["Header1","Header2"],["Val1","Val2"]]
- Empty cells: "" or "[BLANK]"
- table_type: "frequency" | "two_way" | "function" | "data" | "probability"

INTERACTIVE TYPE MAPPING:
Based on content, set interactive_type to:
- "drag_drop": Match expressions, arrange items, "Drag and drop"
- "image_drop": Venn diagrams, tree diagrams, label diagrams
- "graph_plot": Plot points, draw graphs, shade regions
- "table_input": Complete tables, fill missing values
- "smart_math": Calculate, solve, evaluate, simplify, determine
- "multiple_choice": Select option A/B/C/D
- "arrange_order": Step-by-step solutions, proof ordering
- "text_equation": Explain, describe, comment, justify

MCQ OPTIONS: Extract as {"A": "text", "B": "text", "C": "text", "D": "text"}
DRAGGABLE ITEMS: Extract as array: ["item1", "item2", "item3"]
MARKS: Look for [2], (2 marks), (2). Default to 1.

RETURN FORMAT (JSON only):
{
  "question_groups": [
    {
      "question_number": 1,
      "main_question_text": "Shared passage or context (empty string if none)",
      "main_image": null,
      "graph_found": false,
      "diagram_type": null,
      "diagram_description": null,
      "graph_bounding_box": null,
      "has_table": false,
      "table_data": null,
      "table_type": null,
      "sub_questions": [
        {
          "label": "a",
          "original_label": "1a",
          "text": "Exact question text verbatim",
          "marks": 2,
          "command_term": "Calculate",
          "image": null,
          "graph_found": false,
          "diagram_type": null,
          "diagram_description": null,
          "graph_bounding_box": null,
          "has_table": false,
          "table_data": null,
          "table_type": null,
          "table_bounding_box": null,
          "interactive_type": "smart_math",
          "options": null,
          "draggable_items": null,
          "parsing_verified": true
        }
      ]
    }
  ],
  "detected_patterns": {
    "has_venn_diagrams": false,
    "has_coordinate_graphs": false,
    "has_tables": false,
    "has_drag_drop": false,
    "total_diagrams": 0,
    "question_numbering_style": "1a,1b,2,3a"
  }
}

STRICT RULES:
- Return ONLY valid JSON
- NEVER merge separate sub-questions into one
- NEVER rewrite or simplify question content
- NEVER lose math formatting
- If text is unclear: parsing_verified = false
- Never invent questions not visible on page
- Ignore headers, footers, page numbers, timer elements`;

// Models configuration
const PRIMARY_MODEL = 'google/gemini-2.5-flash';
const FALLBACK_MODEL = 'google/gemini-2.5-pro';
const PAGE_TIMEOUT = 45000;
const MAX_PAGES_PER_REQUEST = 3;
const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// IB pattern detection for automatic type mapping
const INTERACTIVE_PATTERNS = {
  drag_drop: [
    /drag\s*(and|&)?\s*drop/i, /draggable/i, /match\s*(the|each)?/i,
    /place\s*(in|the)\s*(correct|right)/i, /arrange\s*(in|the)\s*order/i,
    /select\s*the\s*expressions?/i, /identify\s*(the)?\s*(two|three|four)\s*expressions?/i,
  ],
  image_drop: [
    /complete\s*(the)?\s*venn/i, /venn\s*diagram/i, /label\s*(the)?\s*(diagram|figure)/i,
    /tree\s*diagram/i, /complete\s*(the)?\s*(diagram|figure)/i,
    /insert\s*(your)?\s*answers?\s*(in|into)\s*(the)?\s*diagram/i,
    /determine\s*(the)?\s*missing\s*values?\s*(and)?\s*complete/i,
  ],
  graph_plot: [
    /plot\s*(the)?\s*(point|graph|function)/i, /draw\s*(the)?\s*(graph|line|curve)/i,
    /shade\s*(the)?\s*(region|area)/i, /sketch\s*(the)?\s*(graph|function)/i,
    /on\s*(the)?\s*(graph|axes|grid)/i, /coordinate\s*(plane|grid|system)/i,
    /y\s*=\s*[\w\d\+\-\*\/\^]+/i, /f\s*\(\s*x\s*\)/i,
  ],
  table_input: [
    /complete\s*(the)?\s*table/i, /fill\s*(in)?\s*(the)?\s*table/i,
    /missing\s*values?\s*(in|from)?\s*(the)?\s*table/i, /frequency\s*table/i,
    /two-?way\s*table/i, /copy\s*(and)?\s*complete/i, /input\s*output\s*table/i,
  ],
  multiple_choice: [
    /which\s*(of\s*(the|these))?\s*(following)?/i, /select\s*(the)?\s*(correct|best|right)/i,
    /choose\s*(the)?/i, /option\s*[A-D]/i,
  ],
  smart_math: [
    /calculate/i, /determine/i, /find\s*(the)?\s*(value|length|area|volume)/i,
    /solve/i, /evaluate/i, /simplify/i, /show\s*(that|working)/i, /work\s*out/i, /compute/i,
  ],
  arrange_order: [
    /step\s*by\s*step/i, /show\s*(your)?\s*working/i, /proof/i,
    /in\s*order/i, /sequence\s*(of)?\s*steps/i,
  ],
  text_equation: [
    /explain/i, /describe/i, /comment/i, /justify/i, /state/i,
    /write\s*down/i, /interpret/i,
  ]
};

function detectInteractiveType(text: string, hasTable: boolean, diagramType: string | null): string {
  if (!text) return 'text_equation';
  if (hasTable || /complete\s*(the)?\s*table/i.test(text)) return 'table_input';
  if (diagramType === 'venn' || diagramType === 'tree') return 'image_drop';
  if (diagramType === 'coordinate_graph' && /plot|draw|shade|sketch/i.test(text)) return 'graph_plot';
  
  for (const [type, patterns] of Object.entries(INTERACTIVE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) return type;
    }
  }
  return 'text_equation';
}

function extractCommandTerm(text: string): string | null {
  const commandTerms = [
    'Calculate', 'Determine', 'Find', 'Solve', 'Evaluate', 'Simplify',
    'Show', 'Prove', 'Demonstrate', 'Explain', 'Describe', 'Comment',
    'Justify', 'State', 'Write', 'Sketch', 'Draw', 'Plot', 'Compare',
    'Contrast', 'Identify', 'Classify', 'Predict', 'Suggest', 'Outline',
    'Analyse', 'Analyze', 'Discuss', 'Examine', 'Interpret', 'Apply'
  ];
  for (const term of commandTerms) {
    if (new RegExp(`\\b${term}\\b`, 'i').test(text)) return term;
  }
  return null;
}

function mapToAnswerBlockType(detected: string | undefined, questionText?: string, hasTable?: boolean, diagramType?: string): string {
  const typeMap: Record<string, string> = {
    'graph': 'graph_plot', 'graph_plot': 'graph_plot', 'graph_interaction': 'graph_plot',
    'plot': 'graph_plot', 'coordinate': 'graph_plot', 'shade': 'graph_plot', 'draw': 'graph_plot',
    'drag': 'drag_drop', 'drag_drop': 'drag_drop', 'drag_drop_match': 'drag_drop',
    'match': 'drag_drop', 'arrange': 'drag_drop',
    'venn': 'image_drop', 'image_drop': 'image_drop', 'image_drop_zone': 'image_drop',
    'tree_diagram': 'image_drop', 'tree': 'image_drop', 'label': 'image_drop',
    'step': 'arrange_order', 'arrange_order': 'arrange_order', 'order': 'arrange_order',
    'sequence': 'arrange_order',
    'math': 'smart_math', 'math_input': 'smart_math', 'calculate': 'smart_math',
    'solve': 'smart_math', 'evaluate': 'smart_math', 'simplify': 'smart_math', 'smart_math': 'smart_math',
    'mcq': 'multiple_choice', 'multiple_choice': 'multiple_choice', 'select': 'multiple_choice',
    'table': 'table_input', 'table_input': 'table_input', 'table_fill': 'table_input',
    'frequency': 'table_input', 'two_way': 'table_input', 'complete_table': 'table_input',
    'text': 'text_equation', 'text_equation': 'text_equation',
    'explain': 'text_equation', 'describe': 'text_equation'
  };
  
  if (hasTable) return 'table_input';
  if (diagramType === 'venn' || diagramType === 'tree') return 'image_drop';
  if (diagramType === 'coordinate_graph' && questionText && /plot|draw|shade|sketch/i.test(questionText)) return 'graph_plot';
  
  if (detected) {
    const lower = detected.toLowerCase();
    for (const [key, value] of Object.entries(typeMap)) {
      if (lower.includes(key)) return value;
    }
  }
  
  if (questionText) return detectInteractiveType(questionText, false, diagramType || null);
  return 'text_equation';
}

async function analyzePageWithVision(
  apiKey: string, imageContent: string, pageIndex: number, useFallback = false
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
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: `EXAM PAGE ${pageIndex + 1} - EXTRACT AND NORMALIZE ALL QUESTIONS:

INSTRUCTIONS:
1. Read EVERY question number visible: 1a, 1b, 1c, 2, 3a, 3b, etc.
2. GROUP sub-questions under their MAIN question number
3. Convert 1a → label "a", 1b → label "b", etc.
4. If a shared passage/context exists → put in main_question_text
5. If NO shared passage → main_question_text = ""
6. Detect ALL diagrams with bounding boxes
7. Images/diagrams go as SEPARATE fields, NEVER embedded in text
8. Preserve ALL math exactly as written
9. CRITICAL: graph_found = true requires graph_bounding_box

Return valid JSON with "question_groups" array.` 
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
    if (!useFallback && (error.name === 'AbortError' || error.message.includes('timeout'))) {
      console.log(`Page ${pageIndex + 1}: Retrying with fallback model ${FALLBACK_MODEL}`);
      return analyzePageWithVision(apiKey, imageContent, pageIndex, true);
    }
    throw error;
  }
}

function parseAIResponse(content: string): { questionGroups: any[], flatQuestions: any[], patterns: any } {
  let parsed: any = null;
  
  try {
    parsed = JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse((jsonMatch[1] || jsonMatch[0]).trim());
      } catch {}
    }
  }

  if (!parsed) return { questionGroups: [], flatQuestions: [], patterns: {} };

  const patterns = parsed.detected_patterns || {};

  // Handle new grouped format
  if (parsed.question_groups && Array.isArray(parsed.question_groups)) {
    return { questionGroups: parsed.question_groups, flatQuestions: [], patterns };
  }

  // Handle legacy flat format — convert to grouped
  let flatQuestions: any[] = [];
  if (parsed.questions && Array.isArray(parsed.questions)) {
    flatQuestions = parsed.questions;
  } else if (Array.isArray(parsed)) {
    flatQuestions = parsed;
  } else if (parsed.question_number) {
    flatQuestions = [parsed];
  }

  // Group flat questions by parent_question
  const groups: Record<string, any> = {};
  const standalone: any[] = [];

  for (const q of flatQuestions) {
    const qNum = String(q.question_number || '').replace(/^question\s*/i, '').trim();
    const parentMatch = qNum.match(/^(\d+)/);
    const parent = q.parent_question || (parentMatch && qNum.length > parentMatch[1].length ? parentMatch[1] : null);

    if (parent) {
      if (!groups[parent]) {
        groups[parent] = {
          question_number: parseInt(parent),
          main_question_text: '',
          main_image: null,
          graph_found: false,
          diagram_type: null,
          diagram_description: null,
          graph_bounding_box: null,
          has_table: false,
          table_data: null,
          sub_questions: []
        };
      }
      const label = qNum.replace(/^\d+/, '').replace(/[()]/g, '').trim() || `${groups[parent].sub_questions.length + 1}`;
      groups[parent].sub_questions.push({
        label,
        original_label: qNum,
        text: q.question_text || q.text || '',
        marks: q.marks || 1,
        command_term: q.command_term || null,
        image: null,
        graph_found: q.graph_found || false,
        diagram_type: q.diagram_type || null,
        diagram_description: q.diagram_description || q.graph_description || null,
        graph_bounding_box: q.graph_bounding_box || null,
        has_table: q.has_table || false,
        table_data: q.table_data || null,
        table_type: q.table_type || null,
        table_bounding_box: q.table_bounding_box || null,
        interactive_type: q.interactive_type || 'text_equation',
        options: q.options || null,
        draggable_items: q.draggable_items || null,
        parsing_verified: q.parsing_verified !== false,
      });
    } else {
      standalone.push(q);
    }
  }

  // Convert standalone questions to groups
  for (const q of standalone) {
    const qNum = String(q.question_number || '').replace(/^question\s*/i, '').trim();
    const num = parseInt(qNum) || Object.keys(groups).length + standalone.indexOf(q) + 1;
    if (!groups[String(num)]) {
      groups[String(num)] = {
        question_number: num,
        main_question_text: q.question_text || q.text || '',
        main_image: null,
        graph_found: q.graph_found || false,
        diagram_type: q.diagram_type || null,
        diagram_description: q.diagram_description || null,
        graph_bounding_box: q.graph_bounding_box || null,
        has_table: q.has_table || false,
        table_data: q.table_data || null,
        sub_questions: []
      };
    }
  }

  const questionGroups = Object.values(groups).sort((a: any, b: any) => a.question_number - b.question_number);
  return { questionGroups, flatQuestions: [], patterns };
}

// Process grouped results into the flat format expected by the client
function processGroupedResults(questionGroups: any[], pageIndex: number): any[] {
  const results: any[] = [];

  for (const group of questionGroups) {
    const qNum = group.question_number;

    if (group.sub_questions && group.sub_questions.length > 0) {
      // Main question entry (parent)
      results.push({
        question_number: String(qNum),
        parent_question: null,
        question_text: group.main_question_text || '',
        marks: group.sub_questions.reduce((sum: number, sq: any) => sum + (sq.marks || 1), 0),
        command_term: null,
        has_sub_questions: true,
        
        options: null,
        option_images: null,
        option_descriptions: null,
        option_bounding_boxes: null,
        draggable_items: null,

        graph_found: group.graph_found || false,
        graph_bounding_box: group.graph_bounding_box || null,
        graph_description: group.diagram_description || null,
        diagram_type: group.diagram_type || null,
        main_image: group.main_image || null,

        has_table: group.has_table || false,
        table_data: group.table_data || null,
        table_type: group.table_type || null,
        table_bounding_box: group.table_bounding_box || null,

        interactive_type: 'text_equation',
        answer_block_type: 'text_equation',
        parsing_verified: true,
        page: pageIndex + 1,
      });

      // Sub-question entries
      for (const sq of group.sub_questions) {
        const hasTable = sq.has_table || Boolean(sq.table_data);
        const diagramType = sq.diagram_type || null;
        const interactiveType = mapToAnswerBlockType(
          sq.interactive_type, sq.text, hasTable, diagramType
        );
        const commandTerm = sq.command_term || extractCommandTerm(sq.text || '');

        results.push({
          question_number: `${qNum}${sq.label}`,
          parent_question: String(qNum),
          question_text: sq.text || '',
          marks: sq.marks || 1,
          command_term: commandTerm,
          has_sub_questions: false,

          options: sq.options || null,
          option_images: sq.option_images || null,
          option_descriptions: sq.option_descriptions || null,
          option_bounding_boxes: null,
          draggable_items: sq.draggable_items || null,

          graph_found: sq.graph_found || false,
          graph_bounding_box: sq.graph_bounding_box || null,
          graph_description: sq.diagram_description || null,
          diagram_type: diagramType,
          sub_image: sq.image || null,

          has_table: hasTable,
          table_data: sq.table_data || null,
          table_type: sq.table_type || null,
          table_bounding_box: sq.table_bounding_box || null,

          interactive_type: interactiveType,
          answer_block_type: interactiveType,
          parsing_verified: sq.parsing_verified !== false,
          page: pageIndex + 1,
        });
      }
    } else {
      // Standalone question (no sub-questions)
      const hasTable = group.has_table || Boolean(group.table_data);
      const diagramType = group.diagram_type || null;
      const interactiveType = mapToAnswerBlockType(
        group.interactive_type, group.main_question_text, hasTable, diagramType
      );
      const commandTerm = extractCommandTerm(group.main_question_text || '');

      results.push({
        question_number: String(qNum),
        parent_question: null,
        question_text: group.main_question_text || '',
        marks: group.marks || 1,
        command_term: commandTerm,
        has_sub_questions: false,

        options: group.options || null,
        option_images: null,
        option_descriptions: null,
        option_bounding_boxes: null,
        draggable_items: group.draggable_items || null,

        graph_found: group.graph_found || false,
        graph_bounding_box: group.graph_bounding_box || null,
        graph_description: group.diagram_description || null,
        diagram_type: diagramType,
        main_image: group.main_image || null,

        has_table: hasTable,
        table_data: group.table_data || null,
        table_type: group.table_type || null,
        table_bounding_box: group.table_bounding_box || null,

        interactive_type: interactiveType,
        answer_block_type: interactiveType,
        parsing_verified: true,
        page: pageIndex + 1,
      });
    }
  }

  return results;
}

// Legacy flat processing (fallback)
function flattenResults(questions: any[], pageIndex: number): any[] {
  return questions.map(q => {
    const hasTable = q.has_table || Boolean(q.table_data);
    const diagramType = q.diagram_type || null;
    const interactiveType = mapToAnswerBlockType(
      q.interactive_type || q.answer_type, q.question_text, hasTable, diagramType
    );
    const commandTerm = q.command_term || extractCommandTerm(q.question_text || '');
    
    let questionNumber = q.question_number || q.number || 'unknown';
    if (typeof questionNumber === 'string') {
      questionNumber = questionNumber.replace(/^question\s*/i, '').trim();
    }
    
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
      options: q.options || null,
      option_images: q.option_images || null,
      option_descriptions: q.option_descriptions || null,
      option_bounding_boxes: q.option_bounding_boxes || null,
      draggable_items: q.draggable_items || null,
      graph_found: q.graph_found || Boolean(q.diagram_type || q.graph_bounding_box || q.diagram_description),
      graph_bounding_box: q.graph_bounding_box || null,
      graph_description: q.diagram_description || q.graph_description || null,
      diagram_type: diagramType,
      has_table: hasTable,
      table_data: q.table_data || null,
      table_type: q.table_type || null,
      table_bounding_box: q.table_bounding_box || null,
      interactive_type: interactiveType,
      answer_block_type: interactiveType,
      parsing_verified: q.parsing_verified !== false,
      page: pageIndex + 1,
    };
  });
}

async function saveParsingPatterns(patterns: any, questions: any[]) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) return;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const stats = {
      total_questions: questions.length,
      interactive_types: questions.reduce((acc: any, q) => {
        const type = q.interactive_type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
      diagram_types: questions.reduce((acc: any, q) => {
        if (q.diagram_type) acc[q.diagram_type] = (acc[q.diagram_type] || 0) + 1;
        return acc;
      }, {}),
      tables_found: questions.filter(q => q.has_table).length,
      diagrams_found: questions.filter(q => q.graph_found).length,
      verified_count: questions.filter(q => q.parsing_verified).length,
      ...patterns,
      last_updated: new Date().toISOString()
    };
    
    await supabase.from('admin_settings').upsert({
      setting_key: 'ai_parser_patterns',
      setting_type: 'json',
      setting_value: stats,
      description: 'Learned patterns from AI question parser v4',
      updated_at: new Date().toISOString()
    }, { onConflict: 'setting_key' });
    
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
      
      for (let i = 0; i < pagesToProcess.length; i++) {
        const absolutePageIndex = startPage + i;
        const pageImage = pagesToProcess[i];
        
        const imageContent = pageImage.startsWith('data:') 
          ? pageImage 
          : `data:image/jpeg;base64,${pageImage}`;

        try {
          console.log(`🔍 Analyzing page ${absolutePageIndex + 1}...`);
          
          const data = await analyzePageWithVision(LOVABLE_API_KEY, imageContent, absolutePageIndex);
          const aiContent = data.choices?.[0]?.message?.content || '{}';
          const { questionGroups, flatQuestions, patterns } = parseAIResponse(aiContent);
          
          Object.assign(allPatterns, patterns);
          
          let pageResults: any[];
          if (questionGroups.length > 0) {
            pageResults = processGroupedResults(questionGroups, absolutePageIndex);
            console.log(`✅ Page ${absolutePageIndex + 1}: ${questionGroups.length} question groups (${pageResults.length} total entries)`);
          } else if (flatQuestions.length > 0) {
            pageResults = flattenResults(flatQuestions, absolutePageIndex);
            console.log(`✅ Page ${absolutePageIndex + 1}: ${flatQuestions.length} flat questions`);
          } else {
            pageResults = [];
            console.log(`⚠️ Page ${absolutePageIndex + 1}: No questions found`);
          }
          
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
      saveParsingPatterns(allPatterns, allQuestions).catch(console.error);
      
      const interactiveTypes = [...new Set(allQuestions.map(q => q.interactive_type))];
      const diagramTypes = [...new Set(allQuestions.filter(q => q.diagram_type).map(q => q.diagram_type))];
      
      console.log(`📊 Summary: ${allQuestions.length} entries, ${verifiedCount} verified`);
      console.log(`   Diagrams: ${graphCount} | Tables: ${tableCount}`);
      console.log(`   Types: ${interactiveTypes.join(', ')}`);

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
          { role: 'user', content: `Extract and NORMALIZE all questions from this text into question_groups format. Group sub-questions (1a, 1b, 1c) under their main question:\n\n${content.substring(0, 8000)}` }
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
    const { questionGroups, flatQuestions, patterns } = parseAIResponse(aiContent);
    
    let allQuestions: any[];
    if (questionGroups.length > 0) {
      allQuestions = processGroupedResults(questionGroups, 0);
    } else {
      allQuestions = flattenResults(flatQuestions, 0);
    }
    
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
