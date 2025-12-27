import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * PDF OCR EXTRACTOR - Pure OCR Only
 * 
 * This function performs ONLY OCR extraction:
 * - Raw text extraction
 * - Image/graph/diagram detection
 * - Table extraction
 * - Page-wise output
 * 
 * NO AI reasoning, parsing, or interpretation is performed.
 * Output is raw structured data only.
 */

interface VisualElement {
  element_id: string;
  type: 'graph' | 'diagram' | 'figure' | 'table' | 'chart' | 'image' | 'unknown';
  position: string;
  bounding_box: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null;
  raw_description: string;
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
      storePageImage = true
    } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing imageBase64', ocr_status: 'failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OCR_API_KEY = Deno.env.get('OCR_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OCR_API_KEY) {
      console.error('❌ OCR_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          error: 'OCR API key not configured', 
          ocr_status: 'failed',
          page_number: pageNumber 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📄 [OCR] Processing page ${pageNumber} of ${fileName || 'document'}`);

    // STAGE 1: Store page image to Supabase Storage
    let storedImageUrl: string | null = null;
    
    if (storePageImage && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Convert base64 to blob
        const byteCharacters = atob(imageBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });

        // Generate unique filename
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const cleanFileName = (fileName || 'document').replace(/[^a-zA-Z0-9]/g, '_');
        const storagePath = `ocr-pages/${cleanFileName}-page${pageNumber}-${timestamp}-${random}.png`;

        // Upload to Supabase storage
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

    // STAGE 2: Pure OCR Extraction with Mistral Pixtral API
    // This prompt is strictly for OCR - NO interpretation or reasoning
    const ocrPrompt = `STRICT OCR EXTRACTION - NO INTERPRETATION

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

IMPORTANT: Output ONLY the JSON. No explanations.`;

    let ocrResult: OCROutput;
    let retryCount = 0;
    const maxRetries = 1;

    while (retryCount <= maxRetries) {
      try {
        // Use Mistral Pixtral API for OCR
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OCR_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'pixtral-large-latest',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: ocrPrompt },
                  {
                    type: 'image_url',
                    image_url: `data:image/png;base64,${imageBase64}`
                  }
                ]
              }
            ],
            max_tokens: 8000,
            temperature: 0
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.warn(`⚠️ Rate limit hit on page ${pageNumber}, retry ${retryCount + 1}`);
            if (retryCount < maxRetries) {
              retryCount++;
              await new Promise(r => setTimeout(r, 2000));
              continue;
            }
            throw new Error('Rate limit exceeded after retry');
          }
          if (response.status === 402) {
            throw new Error('Payment required - add credits to Lovable AI workspace');
          }
          const errorText = await response.text();
          console.error('OCR API error:', response.status, errorText);
          throw new Error(`OCR request failed: ${response.status}`);
        }

        const aiResult = await response.json();
        const content = aiResult.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error('Empty OCR response');
        }

        console.log(`📝 OCR response received for page ${pageNumber} (${content.length} chars)`);

        // Extract JSON from response
        let jsonText = content;
        if (jsonText.includes('```json')) {
          jsonText = jsonText.split('```json')[1].split('```')[0].trim();
        } else if (jsonText.includes('```')) {
          jsonText = jsonText.split('```')[1].split('```')[0].trim();
        }

        let parsedOcr;
        try {
          parsedOcr = JSON.parse(jsonText);
        } catch (parseError) {
          console.warn('⚠️ JSON parse failed, using raw text');
          parsedOcr = {
            raw_text: content,
            visual_elements: [],
            has_tables: false,
            table_count: 0,
            has_math: false,
            text_quality: 'partial'
          };
        }

        // Build standardized OCR output
        const extractedImages: VisualElement[] = (parsedOcr.visual_elements || []).map((elem: any, idx: number) => ({
          element_id: elem.element_id || `elem_${pageNumber}_${idx + 1}`,
          type: elem.type || 'unknown',
          position: elem.position || 'unknown',
          bounding_box: elem.bounding_box || null,
          raw_description: elem.raw_description || ''
        }));

        ocrResult = {
          page_number: pageNumber,
          raw_text: parsedOcr.raw_text || '',
          extracted_images: extractedImages,
          page_image_url: storedImageUrl,
          ocr_status: 'success',
          error_message: null
        };

        console.log(`✅ [OCR] Page ${pageNumber} complete:`, {
          textLength: ocrResult.raw_text.length,
          imagesFound: extractedImages.length,
          imageStored: !!storedImageUrl
        });

        break; // Success, exit retry loop

      } catch (apiError) {
        console.error(`❌ OCR API error (attempt ${retryCount + 1}):`, apiError);
        if (retryCount >= maxRetries) {
          // Return partial result with error
          ocrResult = {
            page_number: pageNumber,
            raw_text: '',
            extracted_images: [],
            page_image_url: storedImageUrl,
            ocr_status: 'failed',
            error_message: apiError instanceof Error ? apiError.message : 'OCR failed'
          };
        }
        retryCount++;
      }
    }

    return new Response(
      JSON.stringify(ocrResult!),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [OCR] Critical error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'OCR extraction failed',
        ocr_status: 'failed',
        page_number: 0,
        raw_text: '',
        extracted_images: [],
        page_image_url: null,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
