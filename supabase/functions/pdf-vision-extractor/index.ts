import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, pageNumber, fileName } = await req.json();

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

    console.log(`📄 Processing page ${pageNumber} of ${fileName}`);

    // Enhanced prompt for OCR + Diagram extraction
    const prompt = `### 🔥 FULL OCR + VISION EXTRACTOR

You are an OCR + Vision + Diagram Understanding AI.

Your job:
1. Read the input IMAGE.
2. Extract ALL text found in the page (including text in blank boxes, pink highlighted areas, or any filled-in content).
3. Extract ALL diagram shapes and structure:
   - Venn diagrams (circles, labels, intersection values)
   - Boxes, rectangles, underlines, arrows
   - Numeric labels inside shapes
   - Missing blanks or empty boxes (treat them as "blank_slot_1", "blank_slot_2", ...)
   - Text inside colored/highlighted boxes (pink, yellow, etc.)
4. Return a CLEAN and PURE JSON output.
5. Do NOT add explanation. Only JSON.

### 🎯 JSON FORMAT TO FOLLOW STRICTLY:
{
  "text": "<full OCR text including all visible text, numbers, and content in boxes>",
  "diagram": {
    "type": "<diagram_type: venn_diagram | tree_diagram | flowchart | table | boxes | null>",
    "shapes": [
      { "type": "circle", "id": "A", "x": 100, "y": 100, "r": 50 },
      { "type": "rectangle", "id": "blank1", "x": 200, "y": 150, "width": 80, "height": 40 }
    ],
    "labels": [
      { "text": "1", "x": 100, "y": 100, "context": "inside circle A" },
      { "text": "20", "x": 200, "y": 100, "context": "intersection" },
      { "text": "blank_slot", "x": 250, "y": 170, "context": "empty pink box" }
    ],
    "blanks": [
      "blank_slot_1",
      "blank_slot_2"
    ]
  }
}

### RULES (CRITICAL)
- Output ONLY JSON. No sentences or explanations.
- If diagram not found → "diagram": { "type": null, "shapes": [], "labels": [], "blanks": [] }
- Extract text from ALL visible elements including colored boxes
- If you see an empty box or placeholder → add to blanks array
- If number is inside a circle → include in labels with context
- Combine fragmented text lines into proper reading order
- Remove headers/footers/page numbers from main text

### INPUT BELOW (IMAGE)
Extract all content from this exam/assessment page.`;

    // Call Lovable AI with vision
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
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 3000,
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

    console.log(`🤖 Raw AI response:`, content);

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
      console.error('Failed to parse:', jsonText);
      // Return basic structure with raw text
      extractedData = {
        text: content,
        diagram: {
          type: null,
          shapes: [],
          labels: [],
          blanks: []
        }
      };
    }

    console.log(`✅ Successfully extracted from page ${pageNumber}:`, {
      textLength: extractedData.text?.length || 0,
      diagramType: extractedData.diagram?.type,
      shapesCount: extractedData.diagram?.shapes?.length || 0,
      labelsCount: extractedData.diagram?.labels?.length || 0,
      blanksCount: extractedData.diagram?.blanks?.length || 0
    });

    return new Response(
      JSON.stringify(extractedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Vision extraction error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to process image with vision AI'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
