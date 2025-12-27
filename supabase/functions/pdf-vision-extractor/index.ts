import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * PDF VISION EXTRACTOR
 * 
 * Supports two modes:
 * 1. OCR-only mode (extractionMode: 'ocr') - Pure OCR, no AI reasoning
 * 2. Enhanced mode (extractionMode: 'enhanced') - OCR + visual analysis
 * 
 * API Key stored server-side only (LOVABLE_API_KEY)
 */

interface VisualElement {
  element_id: string;
  type: string;
  position: string;
  bounding_box: { top: number; left: number; width: number; height: number } | null;
  raw_description: string;
  labels?: string[];
  values?: string[];
}

interface OCROutput {
  page_number: number;
  raw_text: string;
  extracted_images: VisualElement[];
  page_image_url: string | null;
  ocr_status: 'success' | 'partial' | 'failed';
  error_message: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      imageBase64, 
      pageNumber, 
      fileName, 
      extractionMode = 'ocr', // Default to OCR-only mode
      storePageImage = true
    } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing imageBase64', ocr_status: 'failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OCR_API_KEY = Deno.env.get('OCR_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // For OCR mode, prefer OCR_API_KEY; for enhanced mode, use LOVABLE_API_KEY
    const apiKey = extractionMode === 'ocr' ? (OCR_API_KEY || LOVABLE_API_KEY) : LOVABLE_API_KEY;
    
    if (!apiKey) {
      console.error('❌ API key not configured');
      return new Response(
        JSON.stringify({ error: 'OCR service not configured', ocr_status: 'failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📄 [${extractionMode.toUpperCase()}] Processing page ${pageNumber} of ${fileName || 'document'}`);

    // STAGE 1: Store page image to Supabase Storage
    let storedImageUrl: string | null = null;
    
    if (storePageImage && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        const byteCharacters = atob(imageBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });

        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const cleanFileName = (fileName || 'document').replace(/[^a-zA-Z0-9]/g, '_');
        const storagePath = `pdf-pages/${cleanFileName}-page${pageNumber}-${timestamp}-${random}.png`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('question-images')
          .upload(storagePath, blob, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false
          });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from('question-images')
            .getPublicUrl(storagePath);
          
          storedImageUrl = urlData.publicUrl;
          console.log(`✅ Stored page ${pageNumber} image`);
        } else {
          console.warn(`⚠️ Image storage warning: ${uploadError?.message}`);
        }
      } catch (storageError) {
        console.warn('⚠️ Image storage failed (non-critical):', storageError);
      }
    }

    // STAGE 2: OCR Extraction
    let prompt: string;
    
    if (extractionMode === 'ocr') {
      // STRICT OCR MODE - No AI reasoning or interpretation
      prompt = `STRICT OCR EXTRACTION - NO INTERPRETATION

Extract ONLY what is visible on this page. Do NOT interpret, solve, or modify any content.

EXTRACTION RULES:
1. Extract ALL visible text exactly as written
2. Preserve original formatting and line breaks  
3. Detect visual elements (graphs, diagrams, tables, figures)
4. Report element types and positions
5. Do NOT solve equations or problems
6. Do NOT explain or interpret content
7. Mark unclear text as [unclear]
8. Mark blank spaces as [BLANK]

OUTPUT FORMAT (JSON only):
{
  "raw_text": "<exact text as it appears, preserving layout>",
  "visual_elements": [
    {
      "element_id": "elem_1",
      "type": "graph|diagram|figure|table|chart|image",
      "position": "top-left|top-center|top-right|middle-left|center|middle-right|bottom-left|bottom-center|bottom-right",
      "bounding_box": {"top": 0, "left": 0, "width": 100, "height": 100},
      "raw_description": "brief physical description only - no interpretation"
    }
  ],
  "has_tables": true/false,
  "table_count": 0,
  "has_math": true/false,
  "text_quality": "clear|partial|poor"
}

IMPORTANT: Output ONLY the JSON. No explanations or commentary.`;
    } else {
      // ENHANCED MODE - OCR + Visual Analysis (legacy behavior)
      prompt = `### ENHANCED OCR + VISUAL ANALYSIS

You are analyzing a PDF page image. Your job is to:
1. Extract ALL visible text with HIGH ACCURACY (OCR)
2. Detect and classify ALL visual elements (graphs, diagrams, tables, charts)
3. Extract labels, values, and structure from visual elements

⚠️ CRITICAL RULES:
1. Extract ALL text EXACTLY as it appears
2. Preserve mathematical symbols: ∪ ∩ ≤ ≥ √ π Σ ∫ etc.
3. Do NOT solve any problems
4. DETECT all graphs, diagrams, tables, charts
5. EXTRACT labels and values from visual elements
6. Mark blank spaces as [BLANK]
7. Note any unclear text with [unclear]

📋 OUTPUT FORMAT (JSON only):
{
  "page_number": ${pageNumber},
  "raw_text": "<all extracted text preserving layout>",
  "has_visual_elements": true/false,
  "visual_elements": [
    {
      "element_id": "visual_${pageNumber}_1",
      "type": "venn_diagram|tree_diagram|bar_chart|line_graph|pie_chart|table|coordinate_graph|geometry_figure|other",
      "position": "top|middle|bottom|left|right|center",
      "labels": ["list", "of", "extracted", "labels"],
      "values": ["extracted", "numerical", "values"],
      "description": "brief structural description",
      "has_blanks": true/false,
      "blank_positions": ["A", "B"] or []
    }
  ],
  "text_regions": [
    {
      "region_type": "question|header|footer|body|instruction|option|answer_key",
      "content": "text in this region",
      "confidence": "high|medium|low"
    }
  ],
  "ocr_quality": "high|medium|low",
  "quality_notes": ["any issues with scan quality, blur, etc."]
}

### INPUT: Page ${pageNumber} of ${fileName || 'document'}`;
    }

    // API call with retry logic
    let result: any;
    let retryCount = 0;
    const maxRetries = 1;

    while (retryCount <= maxRetries) {
      try {
        // Use Mistral Pixtral for OCR mode, Lovable AI Gateway for enhanced mode
        const apiUrl = extractionMode === 'ocr' && OCR_API_KEY
          ? 'https://api.mistral.ai/v1/chat/completions'
          : 'https://ai.gateway.lovable.dev/v1/chat/completions';
        
        const model = extractionMode === 'ocr' && OCR_API_KEY
          ? 'pixtral-large-latest'
          : 'google/gemini-2.5-flash';
        
        // Build image content based on API
        const imageContent = extractionMode === 'ocr' && OCR_API_KEY
          ? { type: 'image_url', image_url: `data:image/png;base64,${imageBase64}` }
          : { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } };
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  imageContent
                ]
              }
            ],
            max_tokens: extractionMode === 'ocr' ? 8000 : 4000,
            temperature: 0
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.warn(`⚠️ Rate limit hit on page ${pageNumber}`);
            if (retryCount < maxRetries) {
              retryCount++;
              await new Promise(r => setTimeout(r, 2000));
              continue;
            }
            return new Response(
              JSON.stringify({ error: 'Rate limit exceeded', ocr_status: 'failed' }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          if (response.status === 402) {
            return new Response(
              JSON.stringify({ error: 'Payment required - add credits', ocr_status: 'failed' }),
              { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          const errorText = await response.text();
          console.error('API error:', response.status, errorText);
          throw new Error(`API request failed: ${response.status}`);
        }

        const aiResult = await response.json();
        const content = aiResult.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error('Empty response from OCR service');
        }

        console.log(`📝 Response received for page ${pageNumber} (${content.length} chars)`);

        // Extract JSON from response
        let jsonText = content;
        if (jsonText.includes('```json')) {
          jsonText = jsonText.split('```json')[1].split('```')[0].trim();
        } else if (jsonText.includes('```')) {
          jsonText = jsonText.split('```')[1].split('```')[0].trim();
        }

        try {
          result = JSON.parse(jsonText);
        } catch (parseError) {
          console.warn('⚠️ JSON parse failed, using raw content');
          result = {
            raw_text: content,
            visual_elements: [],
            text_quality: 'partial'
          };
        }

        break; // Success

      } catch (apiError) {
        console.error(`❌ API error (attempt ${retryCount + 1}):`, apiError);
        if (retryCount >= maxRetries) {
          return new Response(
            JSON.stringify({
              page_number: pageNumber,
              raw_text: '',
              extracted_images: [],
              page_image_url: storedImageUrl,
              ocr_status: 'failed',
              error_message: apiError instanceof Error ? apiError.message : 'OCR failed'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        retryCount++;
      }
    }

    // Build output based on extraction mode
    let output: any;

    if (extractionMode === 'ocr') {
      // OCR-only output format (per PDR spec)
      const extractedImages: VisualElement[] = (result.visual_elements || []).map((elem: any, idx: number) => ({
        element_id: elem.element_id || `elem_${pageNumber}_${idx + 1}`,
        type: elem.type || 'unknown',
        position: elem.position || 'unknown',
        bounding_box: elem.bounding_box || null,
        raw_description: elem.raw_description || ''
      }));

      output = {
        page_number: pageNumber,
        raw_text: result.raw_text || '',
        extracted_images: extractedImages,
        page_image_url: storedImageUrl,
        ocr_status: 'success' as const,
        error_message: null
      } satisfies OCROutput;
    } else {
      // Enhanced mode output (legacy format)
      output = {
        page_number: result.page_number || pageNumber,
        raw_text: result.raw_text || '',
        page_image_url: storedImageUrl,
        has_visual_elements: result.has_visual_elements || 
          (result.visual_elements && result.visual_elements.length > 0),
        visual_elements: result.visual_elements || [],
        text_regions: result.text_regions || [],
        ocr_quality: result.ocr_quality || 'medium',
        quality_notes: result.quality_notes || [],
        // Legacy fields
        text: result.raw_text || result.text || '',
        diagram: {
          type: result.visual_elements?.[0]?.type || null,
          shapes: [],
          labels: result.visual_elements?.flatMap((v: any) => v.labels || []) || [],
          blanks: result.visual_elements?.flatMap((v: any) => 
            v.has_blanks ? (v.blank_positions || ['blank_detected']) : []
          ) || []
        }
      };
    }

    console.log(`✅ [${extractionMode.toUpperCase()}] Page ${pageNumber} complete:`, {
      textLength: output.raw_text?.length || 0,
      imagesFound: output.extracted_images?.length || output.visual_elements?.length || 0,
      imageStored: !!storedImageUrl
    });

    return new Response(
      JSON.stringify(output),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Critical error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        ocr_status: 'failed',
        page_number: 0,
        raw_text: '',
        extracted_images: [],
        page_image_url: null,
        error_message: error instanceof Error ? error.message : 'Extraction failed'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
