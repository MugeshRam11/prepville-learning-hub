import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// AI QUESTION PARSER v5
// - OpenAI GPT-4o with function calling (structured output)
// - Regex-first sub-question grouping
// - Cross-page merge
// - Math normalization
// ============================================

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const PRIMARY_MODEL = 'gpt-4o';
const FALLBACK_MODEL = 'gpt-4o-mini';
const PAGE_TIMEOUT = 60000;
const MAX_PAGES_PER_REQUEST = 3;

// ============ SYSTEM PROMPT ============

const SYSTEM_PROMPT = `You are an IB Mathematics exam question parser. Extract ALL questions from the page image.

RULES:
1. Extract every question and sub-question visible on the page.
2. Preserve math EXACTLY as written. Keep all symbols: θ, π, ∈, ≤, ≥, ∞, ∑, ∫, √, fractions, exponents, subscripts.
3. Keep LaTeX delimiters ($...$, $$...$$) if present.
4. NEVER merge, rewrite, or simplify question content.
5. NEVER embed images inside text — report them via bounding boxes.
6. For marks, look for [2], (2 marks), (2). Default to 1.
7. Detect command terms: Calculate, Determine, Find, Solve, Evaluate, Simplify, Show, Explain, Describe, Justify, State, Sketch, Draw, Plot, etc.
8. Detect diagrams/graphs and provide bounding boxes as percentages (0-100) of page dimensions.
9. Detect tables and extract as 2D arrays.
10. For MCQs, extract options as {"A":"text","B":"text","C":"text","D":"text"}.
11. Ignore page headers, footers, page numbers, timer elements.
12. If text is unclear, set parsing_verified to false.`;

// ============ TOOL SCHEMA (Function Calling) ============

const EXTRACT_QUESTIONS_TOOL = {
  type: "function",
  function: {
    name: "extract_questions",
    description: "Extract all questions from the exam page into a structured format",
    parameters: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          description: "All questions and sub-questions found on the page",
          items: {
            type: "object",
            properties: {
              question_number: {
                type: "string",
                description: "The question number exactly as shown: '1', '1a', '1b', '2', '2(i)', '3a(ii)', etc."
              },
              question_text: {
                type: "string",
                description: "The exact question text, preserving all math symbols and formatting"
              },
              marks: {
                type: "number",
                description: "Number of marks for this question. Default 1."
              },
              command_term: {
                type: "string",
                description: "IB command term: Calculate, Determine, Find, Solve, Explain, etc.",
                enum: ["Calculate", "Determine", "Find", "Solve", "Evaluate", "Simplify", "Show", "Prove", "Explain", "Describe", "Justify", "State", "Sketch", "Draw", "Plot", "Compare", "Identify", "Classify", "Predict", "Suggest", "Outline", "Analyse", "Discuss", "Interpret", "Apply", "Write", "Comment", null]
              },
              is_context_stem: {
                type: "boolean",
                description: "True if this is a shared passage/context for sub-questions, not a question itself"
              },
              interactive_type: {
                type: "string",
                enum: ["drag_drop", "image_drop", "graph_plot", "table_input", "smart_math", "multiple_choice", "arrange_order", "text_equation"],
                description: "The type of interactive answer expected"
              },
              options: {
                type: "object",
                description: "MCQ options if multiple choice. Keys: A, B, C, D",
                properties: {
                  A: { type: "string" },
                  B: { type: "string" },
                  C: { type: "string" },
                  D: { type: "string" }
                },
                nullable: true
              },
              draggable_items: {
                type: "array",
                items: { type: "string" },
                description: "Items to drag and drop, if applicable",
                nullable: true
              },
              graph_found: {
                type: "boolean",
                description: "Whether a graph/diagram is associated with this question"
              },
              diagram_type: {
                type: "string",
                enum: ["venn", "coordinate_graph", "table", "tree", "pie_chart", "geometric", "box_plot", "bar_chart", null],
                description: "Type of diagram if found",
                nullable: true
              },
              diagram_description: {
                type: "string",
                description: "Brief description of the diagram",
                nullable: true
              },
              graph_bounding_box: {
                type: "object",
                properties: {
                  x_min: { type: "number" },
                  y_min: { type: "number" },
                  x_max: { type: "number" },
                  y_max: { type: "number" }
                },
                description: "Bounding box as percentages (0-100) of page dimensions",
                nullable: true
              },
              has_table: {
                type: "boolean",
                description: "Whether this question contains a table"
              },
              table_data: {
                type: "array",
                items: { type: "array", items: { type: "string" } },
                description: "2D array of table data if has_table is true",
                nullable: true
              },
              table_type: {
                type: "string",
                enum: ["frequency", "two_way", "function", "data", "probability", null],
                nullable: true
              },
              parsing_verified: {
                type: "boolean",
                description: "False if text was unclear or uncertain"
              }
            },
            required: ["question_number", "question_text", "marks", "is_context_stem", "interactive_type", "graph_found", "has_table", "parsing_verified"]
          }
        }
      },
      required: ["questions"]
    }
  }
};

// ============ MATH NORMALIZATION LAYER ============

function normalizeMath(text: string): string {
  if (!text) return text;

  const unicodeToLatex: Record<string, string> = {
    '≤': '\\leq', '≥': '\\geq', '≠': '\\neq', '≈': '\\approx',
    '×': '\\times', '÷': '\\div', '±': '\\pm', '∓': '\\mp',
    '√': '\\sqrt{}', '∞': '\\infty', '∴': '\\therefore', '∵': '\\because',
    'π': '\\pi', 'θ': '\\theta', 'α': '\\alpha', 'β': '\\beta',
    'γ': '\\gamma', 'δ': '\\delta', 'λ': '\\lambda', 'μ': '\\mu',
    'σ': '\\sigma', 'φ': '\\phi', 'ω': '\\omega', 'ε': '\\epsilon',
    'Σ': '\\Sigma', 'Δ': '\\Delta', 'Ω': '\\Omega', 'Π': '\\Pi',
    '∈': '\\in', '∉': '\\notin', '⊂': '\\subset', '⊃': '\\supset',
    '∪': '\\cup', '∩': '\\cap', '∅': '\\emptyset',
    '∫': '\\int', '∑': '\\sum', '∏': '\\prod',
    '→': '\\to', '←': '\\leftarrow', '↔': '\\leftrightarrow',
    '⇒': '\\Rightarrow', '⇐': '\\Leftarrow', '⇔': '\\Leftrightarrow',
    '²': '^{2}', '³': '^{3}', '⁴': '^{4}', '⁻': '^{-}', '⁺': '^{+}',
    '₀': '_{0}', '₁': '_{1}', '₂': '_{2}', '₃': '_{3}',
    '½': '\\frac{1}{2}', '⅓': '\\frac{1}{3}', '¼': '\\frac{1}{4}',
    '¾': '\\frac{3}{4}', '⅔': '\\frac{2}{3}',
    '°': '^{\\circ}',
  };

  let output = text;

  // Replace unicode math symbols with LaTeX equivalents
  for (const [unicode, latex] of Object.entries(unicodeToLatex)) {
    output = output.replaceAll(unicode, latex);
  }

  // Don't re-wrap text that already has LaTeX delimiters
  // Just ensure existing delimiters are preserved
  return output;
}

// ============ REGEX-FIRST QUESTION GROUPING ENGINE ============

function normalizeQuestionNumber(raw: string): string {
  return raw
    .replace(/^question\s*/i, '')
    .replace(/^q\s*/i, '')
    .replace(/[().]/g, '')
    .replace(/\s/g, '')
    .toLowerCase()
    .trim();
}

function extractParentNumber(normalized: string): string | null {
  const match = normalized.match(/^(\d+)/);
  return match ? match[1] : null;
}

function extractSubLabel(normalized: string, parentNum: string): string | null {
  if (normalized === parentNum) return null;
  const sub = normalized.slice(parentNum.length);
  return sub || null;
}

interface GroupedQuestion {
  question_number: string;
  parent_question: string | null;
  question_text: string;
  marks: number;
  command_term: string | null;
  has_sub_questions: boolean;
  options: any;
  option_images: any;
  option_descriptions: any;
  option_bounding_boxes: any;
  draggable_items: any;
  graph_found: boolean;
  graph_bounding_box: any;
  graph_description: string | null;
  diagram_type: string | null;
  main_image: any;
  sub_image: any;
  has_table: boolean;
  table_data: any;
  table_type: string | null;
  table_bounding_box: any;
  interactive_type: string;
  answer_block_type: string;
  parsing_verified: boolean;
  page: number;
}

function groupQuestions(flatQuestions: any[], pageIndex: number): GroupedQuestion[] {
  // Step 1: Normalize and identify parents vs children
  const groups: Record<string, { 
    parent: any | null, 
    contextStem: string,
    children: any[] 
  }> = {};

  for (const q of flatQuestions) {
    const rawNum = String(q.question_number || '').trim();
    const normalized = normalizeQuestionNumber(rawNum);
    const parentNum = extractParentNumber(normalized);
    
    if (!parentNum) {
      // Can't determine parent — treat as standalone
      const key = `standalone_${rawNum}`;
      groups[key] = { parent: q, contextStem: '', children: [] };
      continue;
    }

    const subLabel = extractSubLabel(normalized, parentNum);

    if (!groups[parentNum]) {
      groups[parentNum] = { parent: null, contextStem: '', children: [] };
    }

    if (!subLabel) {
      // This IS the parent question
      if (q.is_context_stem) {
        groups[parentNum].contextStem = q.question_text || '';
      } else {
        groups[parentNum].parent = q;
      }
    } else {
      // This is a sub-question
      groups[parentNum].children.push({ ...q, _subLabel: subLabel, _originalNum: rawNum });
    }
  }

  // Step 2: Build output
  const results: GroupedQuestion[] = [];

  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const numA = parseInt(a) || 999;
    const numB = parseInt(b) || 999;
    return numA - numB;
  });

  for (const key of sortedKeys) {
    const group = groups[key];
    const hasChildren = group.children.length > 0;
    const parentNum = key.startsWith('standalone_') ? key.replace('standalone_', '') : key;

    if (hasChildren) {
      // Emit parent entry
      const parentQ = group.parent;
      const contextText = group.contextStem || (parentQ?.question_text) || '';
      
      results.push({
        question_number: parentNum,
        parent_question: null,
        question_text: normalizeMath(contextText),
        marks: group.children.reduce((sum, c) => sum + (c.marks || 1), 0),
        command_term: null,
        has_sub_questions: true,
        options: null,
        option_images: null,
        option_descriptions: null,
        option_bounding_boxes: null,
        draggable_items: null,
        graph_found: parentQ?.graph_found || false,
        graph_bounding_box: clampBoundingBox(parentQ?.graph_bounding_box),
        graph_description: parentQ?.diagram_description || null,
        diagram_type: parentQ?.diagram_type || null,
        main_image: null,
        sub_image: null,
        has_table: parentQ?.has_table || false,
        table_data: parentQ?.table_data || null,
        table_type: parentQ?.table_type || null,
        table_bounding_box: null,
        interactive_type: 'text_equation',
        answer_block_type: 'text_equation',
        parsing_verified: true,
        page: pageIndex + 1,
      });

      // Emit children
      for (const child of group.children) {
        const interactiveType = resolveInteractiveType(child);
        results.push({
          question_number: `${parentNum}${child._subLabel}`,
          parent_question: parentNum,
          question_text: normalizeMath(child.question_text || ''),
          marks: child.marks || 1,
          command_term: child.command_term || extractCommandTerm(child.question_text || ''),
          has_sub_questions: false,
          options: child.options || null,
          option_images: null,
          option_descriptions: null,
          option_bounding_boxes: null,
          draggable_items: child.draggable_items || null,
          graph_found: child.graph_found || false,
          graph_bounding_box: clampBoundingBox(child.graph_bounding_box),
          graph_description: child.diagram_description || null,
          diagram_type: child.diagram_type || null,
          main_image: null,
          sub_image: null,
          has_table: child.has_table || false,
          table_data: child.table_data || null,
          table_type: child.table_type || null,
          table_bounding_box: null,
          interactive_type: interactiveType,
          answer_block_type: interactiveType,
          parsing_verified: child.parsing_verified !== false,
          page: pageIndex + 1,
        });
      }
    } else {
      // Standalone question
      const q = group.parent || { question_text: group.contextStem, marks: 1 };
      const interactiveType = resolveInteractiveType(q);
      results.push({
        question_number: parentNum,
        parent_question: null,
        question_text: normalizeMath(q.question_text || ''),
        marks: q.marks || 1,
        command_term: q.command_term || extractCommandTerm(q.question_text || ''),
        has_sub_questions: false,
        options: q.options || null,
        option_images: null,
        option_descriptions: null,
        option_bounding_boxes: null,
        draggable_items: q.draggable_items || null,
        graph_found: q.graph_found || false,
        graph_bounding_box: clampBoundingBox(q.graph_bounding_box),
        graph_description: q.diagram_description || null,
        diagram_type: q.diagram_type || null,
        main_image: null,
        sub_image: null,
        has_table: q.has_table || false,
        table_data: q.table_data || null,
        table_type: q.table_type || null,
        table_bounding_box: null,
        interactive_type: interactiveType,
        answer_block_type: interactiveType,
        parsing_verified: q.parsing_verified !== false,
        page: pageIndex + 1,
      });
    }
  }

  return results;
}

// ============ CROSS-PAGE MERGE ============

function mergeAcrossPages(allQuestions: GroupedQuestion[]): GroupedQuestion[] {
  const parentMap: Record<string, number> = {}; // question_number -> index in merged
  const merged: GroupedQuestion[] = [];

  for (const q of allQuestions) {
    if (q.parent_question) {
      // This is a sub-question — check if its parent already exists
      const parentIdx = parentMap[q.parent_question];
      if (parentIdx !== undefined) {
        // Parent exists, just add this child
        merged.push(q);
      } else {
        // Parent doesn't exist yet — create a synthetic parent
        const syntheticParent: GroupedQuestion = {
          question_number: q.parent_question,
          parent_question: null,
          question_text: '',
          marks: 0,
          command_term: null,
          has_sub_questions: true,
          options: null, option_images: null, option_descriptions: null, option_bounding_boxes: null,
          draggable_items: null,
          graph_found: false, graph_bounding_box: null, graph_description: null, diagram_type: null,
          main_image: null, sub_image: null,
          has_table: false, table_data: null, table_type: null, table_bounding_box: null,
          interactive_type: 'text_equation', answer_block_type: 'text_equation',
          parsing_verified: true,
          page: q.page,
        };
        parentMap[q.parent_question] = merged.length;
        merged.push(syntheticParent);
        merged.push(q);
      }
    } else {
      // Parent or standalone question
      const existingIdx = parentMap[q.question_number];
      if (existingIdx !== undefined) {
        // Merge: update the existing parent with richer data
        const existing = merged[existingIdx];
        if (!existing.question_text && q.question_text) {
          existing.question_text = q.question_text;
        }
        if (q.graph_found) {
          existing.graph_found = true;
          existing.graph_bounding_box = existing.graph_bounding_box || q.graph_bounding_box;
          existing.diagram_type = existing.diagram_type || q.diagram_type;
        }
        // Mark as having sub-questions if children exist later
        existing.has_sub_questions = existing.has_sub_questions || q.has_sub_questions;
      } else {
        parentMap[q.question_number] = merged.length;
        merged.push(q);
      }
    }
  }

  // Recalculate parent marks
  for (const [qNum, idx] of Object.entries(parentMap)) {
    const parent = merged[idx];
    if (parent.has_sub_questions) {
      const childMarks = merged
        .filter(q => q.parent_question === qNum)
        .reduce((sum, q) => sum + (q.marks || 1), 0);
      if (childMarks > 0) parent.marks = childMarks;
    }
  }

  return merged;
}

// ============ HELPER FUNCTIONS ============

function clampBoundingBox(box: any): any {
  if (!box) return null;
  return {
    x_min: Math.max(0, Math.min(100, box.x_min || 0)),
    y_min: Math.max(0, Math.min(100, box.y_min || 0)),
    x_max: Math.max(0, Math.min(100, box.x_max || 100)),
    y_max: Math.max(0, Math.min(100, box.y_max || 100)),
  };
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

// IB pattern detection for interactive type
const INTERACTIVE_PATTERNS: Record<string, RegExp[]> = {
  drag_drop: [
    /drag\s*(and|&)?\s*drop/i, /match\s*(the|each)?/i,
    /place\s*(in|the)\s*(correct|right)/i, /arrange\s*(in|the)\s*order/i,
  ],
  image_drop: [
    /complete\s*(the)?\s*venn/i, /venn\s*diagram/i, /label\s*(the)?\s*(diagram|figure)/i,
    /tree\s*diagram/i, /complete\s*(the)?\s*(diagram|figure)/i,
  ],
  graph_plot: [
    /plot\s*(the)?\s*(point|graph|function)/i, /draw\s*(the)?\s*(graph|line|curve)/i,
    /shade\s*(the)?\s*(region|area)/i, /sketch\s*(the)?\s*(graph|function)/i,
    /on\s*(the)?\s*(graph|axes|grid)/i,
  ],
  table_input: [
    /complete\s*(the)?\s*table/i, /fill\s*(in)?\s*(the)?\s*table/i,
    /missing\s*values?\s*(in|from)?\s*(the)?\s*table/i, /frequency\s*table/i,
  ],
  multiple_choice: [
    /which\s*(of\s*(the|these))?\s*(following)?/i, /select\s*(the)?\s*(correct|best)/i,
    /choose\s*(the)?/i,
  ],
  smart_math: [
    /calculate/i, /determine/i, /find\s*(the)?\s*(value|length|area|volume)/i,
    /solve/i, /evaluate/i, /simplify/i, /show\s*(that|working)/i, /work\s*out/i,
  ],
  arrange_order: [
    /step\s*by\s*step/i, /show\s*(your)?\s*working/i, /proof/i,
  ],
  text_equation: [
    /explain/i, /describe/i, /comment/i, /justify/i, /state/i, /write\s*down/i,
  ]
};

function resolveInteractiveType(q: any): string {
  const text = q.question_text || '';
  const hasTable = q.has_table || Boolean(q.table_data);
  const diagramType = q.diagram_type || null;

  // AI-provided type takes priority if it's valid
  if (q.interactive_type && q.interactive_type !== 'text_equation') {
    return q.interactive_type;
  }

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

// ============ OPENAI API CALL WITH FUNCTION CALLING ============

async function analyzePageWithOpenAI(
  apiKey: string, imageContent: string, pageIndex: number, useFallback = false
): Promise<any[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PAGE_TIMEOUT);
  const model = useFallback ? FALLBACK_MODEL : PRIMARY_MODEL;

  try {
    const response = await fetch(OPENAI_URL, {
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
                text: `EXAM PAGE ${pageIndex + 1} — Extract ALL questions and sub-questions. Return each question/sub-question as a separate entry with its exact question_number (e.g., "1", "1a", "1b", "2", "2(i)"). For shared passages/context, set is_context_stem=true.`
              },
              { type: 'image_url', image_url: { url: imageContent, detail: 'high' } }
            ]
          }
        ],
        tools: [EXTRACT_QUESTIONS_TOOL],
        tool_choice: { type: "function", function: { name: "extract_questions" } },
        max_tokens: 8000,
        temperature: 0.1
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API Error ${response.status}:`, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      if (response.status === 402) {
        throw new Error('Payment required');
      }
      throw new Error(`OpenAI API: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== 'extract_questions') {
      console.error('No valid tool call in response');
      // Fallback: try parsing content as JSON
      const content = data.choices?.[0]?.message?.content || '';
      return parseFallbackContent(content);
    }

    const args = JSON.parse(toolCall.function.arguments);
    return args.questions || [];

  } catch (error: any) {
    clearTimeout(timeoutId);
    if (!useFallback && (error.name === 'AbortError' || error.message.includes('timeout'))) {
      console.log(`Page ${pageIndex + 1}: Retrying with fallback model ${FALLBACK_MODEL}`);
      return analyzePageWithOpenAI(apiKey, imageContent, pageIndex, true);
    }
    throw error;
  }
}

// Fallback JSON parser for edge cases
function parseFallbackContent(content: string): any[] {
  try {
    const parsed = JSON.parse(content);
    return parsed.questions || (Array.isArray(parsed) ? parsed : []);
  } catch {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse((jsonMatch[1] || jsonMatch[0]).trim());
        return parsed.questions || (Array.isArray(parsed) ? parsed : []);
      } catch {}
    }
  }
  return [];
}

// ============ TEXT-BASED PARSING (non-vision) ============

async function parseTextWithOpenAI(apiKey: string, content: string): Promise<any[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PAGE_TIMEOUT);

  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: PRIMARY_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Extract all questions from this exam text. Return each question/sub-question separately:\n\n${content.substring(0, 12000)}` }
        ],
        tools: [EXTRACT_QUESTIONS_TOOL],
        tool_choice: { type: "function", function: { name: "extract_questions" } },
        max_tokens: 8000,
        temperature: 0.1
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`OpenAI API: ${response.status}`);

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return [];
    
    const args = JSON.parse(toolCall.function.arguments);
    return args.questions || [];
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ============ STATS SAVING ============

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
      parser_version: 'v5-openai-toolcall',
      ...patterns,
      last_updated: new Date().toISOString()
    };
    
    await supabase.from('admin_settings').upsert({
      setting_key: 'ai_parser_patterns',
      setting_type: 'json',
      setting_value: stats,
      description: 'Learned patterns from AI question parser v5',
      updated_at: new Date().toISOString()
    }, { onConflict: 'setting_key' });
  } catch (e) {
    console.error('Failed to save patterns:', e);
  }
}

// ============ MAIN HANDLER ============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, images, startPage = 0 } = await req.json();

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured. Please add your OpenAI API key.');
    }

    // ======== IMAGE-BASED PARSING ========
    if (images && images.length > 0) {
      const totalPages = images.length;
      const endPage = Math.min(startPage + MAX_PAGES_PER_REQUEST, totalPages);
      const pagesToProcess = images.slice(startPage, endPage);
      
      console.log(`📄 [v5] Processing pages ${startPage + 1}-${endPage} of ${totalPages} via OpenAI ${PRIMARY_MODEL}`);
      
      const allPageQuestions: GroupedQuestion[] = [];
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
          console.log(`🔍 Analyzing page ${absolutePageIndex + 1} with OpenAI...`);
          
          // Step 1: AI extracts flat questions via function calling
          const rawQuestions = await analyzePageWithOpenAI(OPENAI_API_KEY, imageContent, absolutePageIndex);
          
          console.log(`   AI returned ${rawQuestions.length} raw entries`);

          // Step 2: Regex-first grouping engine
          const grouped = groupQuestions(rawQuestions, absolutePageIndex);
          
          console.log(`✅ Page ${absolutePageIndex + 1}: ${grouped.length} entries after grouping`);
          
          grouped.forEach(q => {
            if (q.parsing_verified) verifiedCount++;
            if (q.graph_found) graphCount++;
            if (q.has_table) tableCount++;
          });
          
          allPageQuestions.push(...grouped);
          
        } catch (e: any) {
          console.error(`❌ Page ${absolutePageIndex + 1} error:`, e.message);
          allPageQuestions.push({
            question_number: `page_${absolutePageIndex + 1}_error`,
            parent_question: null,
            question_text: `Failed to parse page ${absolutePageIndex + 1}: ${e.message}`,
            marks: 0,
            command_term: null,
            has_sub_questions: false,
            options: null, option_images: null, option_descriptions: null, option_bounding_boxes: null,
            draggable_items: null,
            graph_found: false, graph_bounding_box: null, graph_description: null, diagram_type: null,
            main_image: null, sub_image: null,
            has_table: false, table_data: null, table_type: null, table_bounding_box: null,
            interactive_type: 'text_equation',
            answer_block_type: 'text_equation',
            parsing_verified: false,
            page: absolutePageIndex + 1,
          });
        }
      }

      // Step 3: Cross-page merge
      const mergedQuestions = mergeAcrossPages(allPageQuestions);

      const hasMorePages = endPage < totalPages;
      saveParsingPatterns({}, mergedQuestions).catch(console.error);
      
      const interactiveTypes = [...new Set(mergedQuestions.map(q => q.interactive_type))];
      const diagramTypes = [...new Set(mergedQuestions.filter(q => q.diagram_type).map(q => q.diagram_type))];
      
      console.log(`📊 Summary: ${mergedQuestions.length} entries, ${verifiedCount} verified, ${graphCount} diagrams, ${tableCount} tables`);

      return new Response(
        JSON.stringify({
          success: true,
          all_pages: mergedQuestions,
          parsed_count: mergedQuestions.length,
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

    // ======== TEXT-BASED PARSING ========
    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawQuestions = await parseTextWithOpenAI(OPENAI_API_KEY, content);
    const grouped = groupQuestions(rawQuestions, 0);
    const merged = mergeAcrossPages(grouped);
    
    saveParsingPatterns({}, merged).catch(console.error);

    return new Response(
      JSON.stringify({
        success: true,
        all_pages: merged,
        parsed_count: merged.length,
        verified_count: merged.filter(q => q.parsing_verified).length,
        graph_count: merged.filter(q => q.graph_found).length,
        table_count: merged.filter(q => q.has_table).length,
        interactive_types: [...new Set(merged.map(q => q.interactive_type))]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Parser error:', error.message);
    
    if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded. Please wait and try again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (error.message?.includes('402') || error.message?.includes('Payment')) {
      return new Response(
        JSON.stringify({ success: false, error: 'OpenAI payment required. Please check your API billing.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
