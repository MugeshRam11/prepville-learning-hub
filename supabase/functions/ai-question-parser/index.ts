import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced system prompt for comprehensive page analysis - detect ALL questions, tables, diagrams
const SYSTEM_PROMPT = `You are an expert exam document analyzer with LSTM-like memory for learning extraction patterns.

## YOUR MISSION
Analyze exam pages with EXTREME PRECISION. Extract EVERY element visible:
- ALL questions (main and sub-questions)
- ALL tables with their data
- ALL diagrams/graphs with bounding boxes
- ALL marks/points for each question

## QUESTION DETECTION RULES
Questions are numbered in various formats - DETECT ALL:
1. Main: "1.", "1)", "Question 1", "Q1"
2. Sub-parts: "a)", "(a)", "a.", "1(a)", "1a"
3. Roman: "i)", "(i)", "i.", "1(i)", "1(a)(i)"
4. Nested: "1.1", "1.1.1", "1a(i)", "1(a)(i)"

CRITICAL: Each sub-question is a SEPARATE entry. If you see:
- "Question 1a" and "Question 1b" → TWO separate entries
- "1(i)", "1(ii)", "1(iii)" → THREE separate entries

## TABLE DETECTION
Tables contain structured data in rows/columns. For each table:
1. Extract headers and cell content
2. Provide table_data as array of rows
3. Note if table relates to a specific question

## DIAGRAM/GRAPH DETECTION
Visual elements include:
- Coordinate planes (x-y axes, grids)
- Charts (bar, line, pie, histogram)
- Geometric shapes (triangles, circles, polygons)
- Flow diagrams, tree diagrams, Venn diagrams
- Sine/cosine curves, function graphs
- Any drawn/printed visual element

For EACH diagram, provide PRECISE bounding box as percentage coordinates:
- x_min: left edge (0-100)
- y_min: top edge (0-100)
- x_max: right edge (0-100)
- y_max: bottom edge (0-100)

## OUTPUT FORMAT (JSON)
{
  "page_analysis": {
    "total_questions": 5,
    "total_tables": 2,
    "total_diagrams": 3
  },
  "questions": [
    {
      "question_number": "1a",
      "parent_question": "1",
      "question_text": "Full question text here...",
      "marks": 3,
      "command_term": "Calculate",
      "has_table": true,
      "table_data": [["Header1", "Header2"], ["Row1Col1", "Row1Col2"]],
      "has_diagram": true,
      "diagram_type": "flow_diagram",
      "diagram_description": "Algorithm flow diagram showing X, X', D, S",
      "diagram_bbox": {"x_min": 10, "y_min": 20, "x_max": 90, "y_max": 60}
    },
    {
      "question_number": "1b",
      "parent_question": "1",
      "question_text": "Write down X and X' as sum of multiples...",
      "marks": 2,
      "command_term": "Write down",
      "has_table": true,
      "table_data": [["100 x 4", "10 x 3", "1 x 7", "437"]],
      "has_diagram": false
    }
  ],
  "standalone_tables": [
    {
      "table_id": "T1",
      "description": "Age distribution data",
      "headers": ["Age (A)", "Percentage"],
      "rows": [["0 < A ≤ 20", "23"], ["20 < A ≤ 40", "32"]],
      "bbox": {"x_min": 5, "y_min": 30, "x_max": 50, "y_max": 70}
    }
  ],
  "standalone_diagrams": [
    {
      "diagram_id": "D1",
      "type": "sine_curve",
      "description": "Tide height h(t) vs time graph",
      "bbox": {"x_min": 15, "y_min": 40, "x_max": 85, "y_max": 80},
      "related_questions": ["6a", "6b", "6c"]
    }
  ]
}

## EXTRACTION RULES
1. Extract EVERY question visible - don't miss any!
2. Parse marks from "[2]", "[2 marks]", "(2 marks)", etc.
3. Identify command terms: Calculate, Determine, Show, Write down, State, Explain, etc.
4. Link diagrams to their related questions
5. Tables inside questions go in table_data; standalone tables in standalone_tables
6. Return VALID JSON only - no markdown, no explanation`;

// Primary and fallback models using Lovable AI Gateway (Gemini)
const MODELS = {
  primary: 'google/gemini-2.5-flash',  // Fast + good vision
  fallback: 'google/gemini-2.5-flash-lite',  // Faster fallback
  advanced: 'google/gemini-2.5-pro'  // For complex multi-question pages
};

const PRIMARY_TIMEOUT = 30000;  // 30 seconds for complex pages
const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// Initialize Supabase client for learning storage
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (supabaseUrl && supabaseKey) {
    return createClient(supabaseUrl, supabaseKey);
  }
  return null;
}

// Store parsing feedback for learning (LSTM-like pattern storage)
async function storeParsingFeedback(
  pageData: any,
  extractedQuestions: any[],
  modelUsed: string,
  success: boolean
) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    // Store in admin_settings as parsing_feedback
    const feedbackEntry = {
      timestamp: new Date().toISOString(),
      model_used: modelUsed,
      success,
      questions_extracted: extractedQuestions.length,
      patterns: extractedQuestions.map(q => ({
        number_format: q.question_number,
        has_diagram: q.has_diagram || q.diagram_bbox,
        has_table: q.has_table || q.table_data,
        marks: q.marks,
        command_term: q.command_term
      }))
    };
    
    console.log('Storing parsing feedback for learning:', feedbackEntry);
    
    // Get existing feedback
    const { data: existing } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'ai_parser_learning_data')
      .single();
    
    const currentFeedback = existing?.setting_value?.feedback || [];
    currentFeedback.push(feedbackEntry);
    
    // Keep only last 100 entries
    const trimmedFeedback = currentFeedback.slice(-100);
    
    await supabase
      .from('admin_settings')
      .upsert({
        setting_key: 'ai_parser_learning_data',
        setting_type: 'json',
        setting_value: { 
          feedback: trimmedFeedback,
          last_updated: new Date().toISOString(),
          total_pages_processed: (existing?.setting_value?.total_pages_processed || 0) + 1,
          success_rate: trimmedFeedback.filter((f: any) => f.success).length / trimmedFeedback.length
        }
      }, { onConflict: 'setting_key' });
      
  } catch (e) {
    console.error('Failed to store parsing feedback:', e);
  }
}

// Multi-model vision analysis with comprehensive extraction
async function analyzePageWithVision(
  apiKey: string,
  imageContent: string,
  pageIndex: number,
  useAdvanced: boolean = false
): Promise<{ data: any; model_used: string; retry_count: number }> {
  // Use advanced model for complex multi-question pages
  const models = useAdvanced 
    ? [MODELS.advanced, MODELS.primary, MODELS.fallback]
    : [MODELS.primary, MODELS.advanced, MODELS.fallback];
  
  let lastError: Error | null = null;
  let retryCount = 0;

  for (const model of models) {
    try {
      console.log(`Page ${pageIndex + 1}: Attempting analysis with ${model}...`);
      
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
                  text: `ANALYZE PAGE ${pageIndex + 1} - COMPREHENSIVE EXTRACTION

EXTRACT EVERYTHING ON THIS PAGE:

1. ALL QUESTIONS - Find every question number visible:
   - Look for "Question 1a", "1(a)", "a)", "(i)", etc.
   - Each sub-question (a, b, c OR i, ii, iii) is SEPARATE
   - Extract the FULL text of each question
   - Find marks: [2], [3 marks], (2 marks), etc.

2. ALL TABLES - Extract table content:
   - Headers and all rows
   - Data values, numbers, text
   - Note which question the table belongs to

3. ALL DIAGRAMS/GRAPHS - Detect and locate:
   - Coordinate planes, grids, axes
   - Charts (bar, line, pie), curves (sine, function graphs)
   - Geometric shapes, flow diagrams
   - Provide PRECISE bounding box coordinates (x_min, y_min, x_max, y_max as %)

IMPORTANT:
- Count EVERY question number you see (1a, 1b, 2, 3a, 3b, etc.)
- Don't merge questions - keep them separate
- Tables embedded in questions should have table_data filled
- Diagrams shared by multiple questions should list related_questions

Return the structured JSON with page_analysis, questions, standalone_tables, standalone_diagrams.`
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
      console.log(`${model} responded successfully for page ${pageIndex + 1}`);
      
      return { data, model_used: model, retry_count: retryCount };

    } catch (error: any) {
      lastError = error;
      retryCount++;
      console.error(`${model} failed for page ${pageIndex + 1}:`, error.message);
      
      if (error.message.includes('Rate limit') || error.message.includes('Payment required')) {
        throw error;
      }
      
      continue;
    }
  }

  throw lastError || new Error('All vision models failed');
}

// Parse AI response to structured JSON with validation
function parseAIResponse(content: string): any {
  try {
    // Try direct JSON parse
    const parsed = JSON.parse(content);
    return validateAndNormalize(parsed);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return validateAndNormalize(JSON.parse(jsonMatch[1].trim()));
      } catch {}
    }
    
    // Try to find JSON object in text
    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return validateAndNormalize(JSON.parse(objectMatch[0]));
      } catch {}
    }
  }
  
  // Return default structure if parsing fails
  return {
    page_analysis: { total_questions: 0, total_tables: 0, total_diagrams: 0 },
    questions: [{
      question_number: "parse_failed",
      question_text: "Failed to parse page content",
      marks: 0,
      has_diagram: false,
      has_table: false
    }],
    standalone_tables: [],
    standalone_diagrams: []
  };
}

// Validate and normalize parsed response
function validateAndNormalize(parsed: any): any {
  // Handle old format (single question or questions array directly)
  if (parsed.question_number && !parsed.questions) {
    return {
      page_analysis: { total_questions: 1, total_tables: 0, total_diagrams: parsed.graph_found ? 1 : 0 },
      questions: [{
        question_number: parsed.question_number,
        question_text: parsed.question_text,
        marks: parsed.marks || 1,
        has_diagram: parsed.graph_found,
        diagram_type: parsed.graph_type,
        diagram_description: parsed.graph_description,
        diagram_bbox: parsed.graph_bounding_box,
        parent_question: parsed.parent_question
      }],
      standalone_tables: [],
      standalone_diagrams: []
    };
  }
  
  // Handle array of questions without wrapper
  if (Array.isArray(parsed)) {
    return {
      page_analysis: { total_questions: parsed.length, total_tables: 0, total_diagrams: 0 },
      questions: parsed,
      standalone_tables: [],
      standalone_diagrams: []
    };
  }
  
  // Handle old format with just questions array
  if (parsed.questions && !parsed.page_analysis) {
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [parsed.questions];
    return {
      page_analysis: { 
        total_questions: questions.length, 
        total_tables: parsed.standalone_tables?.length || 0, 
        total_diagrams: questions.filter((q: any) => q.has_diagram || q.diagram_bbox || q.graph_found).length
      },
      questions: questions.map((q: any) => ({
        ...q,
        has_diagram: q.has_diagram || q.graph_found || Boolean(q.diagram_bbox),
        diagram_bbox: q.diagram_bbox || q.graph_bounding_box
      })),
      standalone_tables: parsed.standalone_tables || [],
      standalone_diagrams: parsed.standalone_diagrams || []
    };
  }
  
  // Already in correct format
  return {
    page_analysis: parsed.page_analysis || { total_questions: 0, total_tables: 0, total_diagrams: 0 },
    questions: parsed.questions || [],
    standalone_tables: parsed.standalone_tables || [],
    standalone_diagrams: parsed.standalone_diagrams || []
  };
}

// Flatten page results to individual question entries
function flattenPageResults(pageResult: any, pageIndex: number, sourceImage: string, modelUsed: string): any[] {
  const results: any[] = [];
  
  // Process questions
  for (const q of pageResult.questions || []) {
    results.push({
      question_number: q.question_number || "unknown",
      parent_question: q.parent_question || null,
      question_text: q.question_text || "",
      marks: q.marks || 1,
      command_term: q.command_term || null,
      has_sub_questions: false,
      
      // Diagram info
      graph_found: q.has_diagram || Boolean(q.diagram_bbox),
      graph_type: q.diagram_type || q.graph_type || null,
      graph_description: q.diagram_description || q.graph_description || null,
      graph_bounding_box: q.diagram_bbox || q.graph_bounding_box || null,
      
      // Table info
      has_table: q.has_table || Boolean(q.table_data),
      table_data: q.table_data || null,
      
      // Metadata
      page: pageIndex + 1,
      model_used: modelUsed,
      source_image: sourceImage,
      
      // Crop instructions if diagram exists
      diagram_crop: q.diagram_bbox ? {
        source_image_index: pageIndex,
        bbox: q.diagram_bbox,
        crop_instructions: `Crop from (${q.diagram_bbox.x_min}%, ${q.diagram_bbox.y_min}%) to (${q.diagram_bbox.x_max}%, ${q.diagram_bbox.y_max}%)`,
        estimated_size: {
          width_percent: q.diagram_bbox.x_max - q.diagram_bbox.x_min,
          height_percent: q.diagram_bbox.y_max - q.diagram_bbox.y_min
        }
      } : null
    });
  }
  
  // Add standalone tables as entries
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
  
  // Add standalone diagrams as entries
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
      diagram_crop: diagram.bbox ? {
        source_image_index: pageIndex,
        bbox: diagram.bbox,
        crop_instructions: `Crop from (${diagram.bbox.x_min}%, ${diagram.bbox.y_min}%) to (${diagram.bbox.x_max}%, ${diagram.bbox.y_max}%)`
      } : null
    });
  }
  
  return results;
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

    // Process images with comprehensive vision analysis
    if (images && images.length > 0) {
      console.log(`Processing ${images.length} pages with enhanced AI parser (all questions, tables, diagrams)`);
      
      const allQuestions: any[] = [];
      let modelsUsed: string[] = [];
      let totalRetries = 0;
      let totalQuestionsFound = 0;
      let totalTablesFound = 0;
      let totalDiagramsFound = 0;
      
      for (let i = 0; i < images.length; i++) {
        const pageImage = images[i];
        console.log(`\n=== Processing page ${i + 1}/${images.length} ===`);
        
        const imageContent = pageImage.startsWith('data:') 
          ? pageImage 
          : `data:image/jpeg;base64,${pageImage}`;

        try {
          const { data, model_used, retry_count } = await analyzePageWithVision(
            LOVABLE_API_KEY,
            imageContent,
            i,
            useAdvancedModel || images.length > 5 // Use advanced for large documents
          );
          
          modelsUsed.push(model_used);
          totalRetries += retry_count;
          
          const aiContent = data.choices?.[0]?.message?.content || '{}';
          const parsed = parseAIResponse(aiContent);
          
          console.log(`Page ${i + 1} analysis:`, {
            questions: parsed.page_analysis?.total_questions || parsed.questions?.length || 0,
            tables: parsed.page_analysis?.total_tables || parsed.standalone_tables?.length || 0,
            diagrams: parsed.page_analysis?.total_diagrams || 0
          });
          
          // Flatten and add all results from this page
          const pageResults = flattenPageResults(parsed, i, imageContent, model_used);
          allQuestions.push(...pageResults);
          
          // Update totals
          totalQuestionsFound += parsed.questions?.length || 0;
          totalTablesFound += parsed.standalone_tables?.length || 0;
          totalDiagramsFound += parsed.questions?.filter((q: any) => q.has_diagram || q.diagram_bbox).length || 0;
          
          // Store feedback for learning
          await storeParsingFeedback(
            { page: i + 1, fileName },
            parsed.questions || [],
            model_used,
            true
          );
          
        } catch (e: any) {
          console.error(`Failed to process page ${i + 1}:`, e);
          
          if (e.message?.includes('Rate limit')) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'Rate limit exceeded. Please try again later.',
                all_pages: allQuestions,
                partial: true
              }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          if (e.message?.includes('Payment required')) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'API credits exhausted. Please add credits.',
                all_pages: allQuestions,
                partial: true
              }),
              { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Add placeholder for failed page
          allQuestions.push({
            question_number: `page_${i + 1}_error`,
            question_text: `Page ${i + 1} processing failed: ${e.message}`,
            graph_found: false,
            page: i + 1,
            error: e.message
          });
        }
      }

      const uniqueModels = [...new Set(modelsUsed)];
      
      console.log(`\n=== EXTRACTION COMPLETE ===`);
      console.log(`Total entries: ${allQuestions.length}`);
      console.log(`Questions found: ${totalQuestionsFound}`);
      console.log(`Tables found: ${totalTablesFound}`);
      console.log(`Diagrams found: ${totalDiagramsFound}`);
      console.log(`Models used: ${uniqueModels.join(', ')}`);

      // Return first question for backwards compatibility + full results
      const firstQuestion = allQuestions[0] || {
        question_number: "not found",
        question_text: "No content extracted",
        graph_found: false
      };

      return new Response(
        JSON.stringify({
          success: true,
          ...firstQuestion,
          all_pages: allQuestions,
          parsed_count: allQuestions.length,
          summary: {
            total_entries: allQuestions.length,
            questions: totalQuestionsFound,
            tables: totalTablesFound,
            diagrams: totalDiagramsFound,
            pages_processed: images.length
          },
          models_used: uniqueModels,
          total_retries: totalRetries,
          fallback_triggered: uniqueModels.length > 1 || totalRetries > 0
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
          graph_found: false
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Text parsing ${content.length} chars in ${parseMode} mode`);

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
            content: `Extract ALL questions from this exam document: ${fileName || 'document'}

Find every question number, sub-question, marks, and note any mentioned diagrams or tables.

Return the full JSON structure with page_analysis, questions, standalone_tables, standalone_diagrams.

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

    console.log(`Text extraction complete:`, parsed.page_analysis);

    const allQuestions = flattenPageResults(parsed, 0, '', MODELS.primary);
    const firstQuestion = allQuestions[0] || {
      question_number: "not found",
      question_text: "unreadable",
      graph_found: false
    };

    return new Response(
      JSON.stringify({
        success: true,
        ...firstQuestion,
        all_pages: allQuestions,
        parsed_count: allQuestions.length,
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
        question_number: "error",
        question_text: error.message,
        graph_found: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
