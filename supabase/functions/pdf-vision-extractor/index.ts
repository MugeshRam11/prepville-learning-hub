import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= ENHANCED OCR EXTRACTION with Image Storage =============
// This function:
// 1. Extracts RAW OCR text from images using Gemini vision
// 2. Detects and classifies visual elements (graphs, diagrams, tables)
// 3. Stores page images to Supabase Storage for GPT-4 Vision access
// 4. Returns structured data with image URLs for real-time AI sync

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      imageBase64, 
      pageNumber, 
      fileName, 
      extractionMode = 'enhanced',
      storePageImage = true  // New: Store page image for GPT-4 Vision
    } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing imageBase64' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`📄 [Enhanced OCR] Processing page ${pageNumber} of ${fileName}`);
    console.log(`📊 Extraction mode: ${extractionMode}, Store image: ${storePageImage}`);

    // STAGE 1: Store page image to Supabase Storage for GPT-4 Vision access
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
        const storagePath = `pdf-pages/${cleanFileName}-page${pageNumber}-${timestamp}-${random}.png`;

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
          console.log(`✅ Stored page ${pageNumber} image: ${storedImageUrl}`);
        } else {
          console.warn(`⚠️ Failed to store image: ${uploadError?.message}`);
        }
      } catch (storageError) {
        console.warn('⚠️ Image storage failed:', storageError);
        // Continue without storage - non-critical
      }
    }

    // STAGE 2: Enhanced OCR + Visual Analysis with Gemini
    const enhancedOcrPrompt = `### 🔥 ENHANCED OCR + VISUAL ANALYSIS (Stage 1)

You are analyzing a PDF page image. Your job is to:
1. Extract ALL visible text with HIGH ACCURACY (OCR)
2. Detect and classify ALL visual elements (graphs, diagrams, tables, charts)
3. Extract labels, values, and structure from visual elements

⚠️ CRITICAL RULES:
1. Extract ALL text EXACTLY as it appears
2. Preserve mathematical symbols: ∪ ∩ ≤ ≥ √ π Σ ∫ etc.
3. Do NOT solve any problems
4. Do NOT interpret meaning
5. DETECT all graphs, diagrams, tables, charts
6. EXTRACT labels and values from visual elements
7. Mark blank spaces as [BLANK]
8. Note any unclear text with [unclear]

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
      "description": "brief structural description without interpretation",
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
  "question_boundaries": [
    {
      "question_marker": "1. or Q1 or Question 1",
      "position_in_text": "approximate position",
      "has_associated_visual": true/false,
      "visual_element_id": "visual_${pageNumber}_1" or null
    }
  ],
  "ocr_quality": "high|medium|low",
  "quality_notes": ["any issues with scan quality, blur, etc."]
}

### INPUT: Page ${pageNumber} of ${fileName || 'document'}
Analyze this exam/assessment page comprehensively.`;

    // Call Gemini for enhanced OCR + visual analysis
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: enhancedOcrPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`Lovable AI request failed: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log(`🤖 Raw AI response length: ${content.length}`);

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = content;
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim();
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim();
    }

    let extractedData;
    try {
      extractedData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Failed to parse:', jsonText.substring(0, 500));
      // Return basic structure with raw text
      extractedData = {
        page_number: pageNumber,
        raw_text: content,
        has_visual_elements: false,
        visual_elements: [],
        text_regions: [],
        question_boundaries: [],
        ocr_quality: 'low',
        quality_notes: ['Failed to parse structured output, raw text preserved']
      };
    }

    // Build normalized output with image URL
    const normalizedOutput = {
      page_number: extractedData.page_number || pageNumber,
      raw_text: extractedData.raw_text || '',
      
      // NEW: Stored image URL for GPT-4 Vision real-time sync
      page_image_url: storedImageUrl,
      
      // Visual elements detection
      has_visual_elements: extractedData.has_visual_elements || 
        (extractedData.visual_elements && extractedData.visual_elements.length > 0),
      visual_elements: extractedData.visual_elements || [],
      
      // Text regions for structure
      text_regions: extractedData.text_regions || [],
      
      // Question boundaries for parsing
      question_boundaries: extractedData.question_boundaries || [],
      
      // OCR quality
      ocr_quality: extractedData.ocr_quality || 'medium',
      quality_notes: extractedData.quality_notes || [],
      
      // Legacy fields for backward compatibility
      text: extractedData.raw_text || extractedData.text || '',
      diagram: {
        type: extractedData.visual_elements?.[0]?.type || null,
        shapes: [],
        labels: extractedData.visual_elements?.flatMap((v: any) => v.labels || []) || [],
        blanks: extractedData.visual_elements?.flatMap((v: any) => 
          v.has_blanks ? (v.blank_positions || ['blank_detected']) : []
        ) || []
      }
    };

    console.log(`✅ [Enhanced OCR] Page ${pageNumber} complete:`, {
      textLength: normalizedOutput.raw_text.length,
      hasVisuals: normalizedOutput.has_visual_elements,
      visualCount: normalizedOutput.visual_elements.length,
      imageStored: !!storedImageUrl,
      quality: normalizedOutput.ocr_quality
    });

    return new Response(
      JSON.stringify(normalizedOutput),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [Enhanced OCR] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to extract OCR from image'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
