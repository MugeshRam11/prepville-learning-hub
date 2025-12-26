import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= RAW OCR EXTRACTION (Stage 1 of Pipeline) =============
// This function extracts RAW OCR text from images
// The output is then passed to GPT-4 for structuring (Stage 2)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, pageNumber, fileName, extractionMode = 'raw' } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing imageBase64' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`📄 [OCR Stage 1] Processing page ${pageNumber} of ${fileName}`);
    console.log(`📊 Extraction mode: ${extractionMode}`);

    // RAW OCR PROMPT - Extracts text without structuring
    // GPT-4 will handle structuring in Stage 2
    const rawOcrPrompt = `### 🔥 RAW OCR EXTRACTION (Stage 1)

You are a HIGH-ACCURACY OCR system. Your ONLY job is to extract ALL visible text from this image.

⚠️ CRITICAL RULES:
1. Extract ALL text EXACTLY as it appears - no modifications
2. Preserve line breaks and spacing
3. Preserve mathematical symbols and equations exactly: ∪ ∩ ≤ ≥ √ π Σ ∫ etc.
4. Do NOT interpret or explain anything
5. Do NOT solve any problems
6. Do NOT restructure or organize the text
7. Include text from ALL areas: headers, footers, margins, tables, diagrams, boxes
8. If text is unclear, include it with [unclear] marker
9. Mark empty boxes or blanks as [BLANK]
10. Note diagram presence but do NOT describe content

📋 OUTPUT FORMAT (JSON only):
{
  "page_number": ${pageNumber},
  "raw_text": "<all extracted text preserving original layout>",
  "text_regions": [
    {
      "region_type": "header|body|footer|table|diagram_label|margin",
      "content": "text in this region",
      "position": "top|middle|bottom|left|right",
      "confidence": "high|medium|low"
    }
  ],
  "diagrams_detected": [
    {
      "id": "diagram_${pageNumber}_1",
      "type": "venn|tree|graph|table|chart|figure|unknown",
      "position": "description of location on page",
      "labels_visible": ["list", "of", "visible", "labels"],
      "has_blank_spaces": true/false
    }
  ],
  "ocr_quality": "high|medium|low",
  "quality_notes": ["any issues with scan quality, blur, etc."]
}

### INPUT: Page ${pageNumber} of ${fileName || 'document'}
Extract ALL text from this exam/assessment page.`;

    // Call Lovable AI for raw OCR extraction
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
              { type: 'text', text: rawOcrPrompt },
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
        text_regions: [],
        diagrams_detected: [],
        ocr_quality: 'low',
        quality_notes: ['Failed to parse structured output, raw text preserved']
      };
    }

    // Ensure consistent output structure
    const normalizedOutput = {
      page_number: extractedData.page_number || pageNumber,
      raw_text: extractedData.raw_text || '',
      text_regions: extractedData.text_regions || [],
      diagrams_detected: extractedData.diagrams_detected || [],
      ocr_quality: extractedData.ocr_quality || 'medium',
      quality_notes: extractedData.quality_notes || [],
      // Legacy fields for backward compatibility
      text: extractedData.raw_text || extractedData.text || '',
      diagram: {
        type: extractedData.diagrams_detected?.[0]?.type || null,
        shapes: [],
        labels: extractedData.diagrams_detected?.[0]?.labels_visible?.map((l: string, i: number) => ({
          text: l,
          context: 'extracted label'
        })) || [],
        blanks: extractedData.diagrams_detected?.flatMap((d: any) => 
          d.has_blank_spaces ? ['blank_detected'] : []
        ) || []
      }
    };

    console.log(`✅ [OCR Stage 1] Page ${pageNumber} complete:`, {
      textLength: normalizedOutput.raw_text.length,
      regionsCount: normalizedOutput.text_regions.length,
      diagramsCount: normalizedOutput.diagrams_detected.length,
      quality: normalizedOutput.ocr_quality
    });

    return new Response(
      JSON.stringify(normalizedOutput),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [OCR Stage 1] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to extract OCR from image'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
