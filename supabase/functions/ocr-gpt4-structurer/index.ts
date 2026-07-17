import { logAiUsage, extractUsage } from '../_shared/aiUsage.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= OUTPUT FORMAT =============
interface StructuredQuestion {
  question_number: string;
  question_text: string;
  sub_questions: Array<{
    label: string;
    text: string;
    marks: number | null;
  }> | null;
  marks: number | null;
  page_numbers: number[];
  associated_images: string[];
  raw_ocr_reference: string;
  instructions: string | null;
  difficulty_flag: 'clear' | 'unclear' | 'low_confidence';
}

interface StructuredOutput {
  questions: StructuredQuestion[];
  metadata: {
    total_questions: number;
    total_marks: number | null;
    subject: string | null;
    exam_title: string | null;
    pages_processed: number;
  };
  warnings: string[];
}

// ============= GPT-4 STRUCTURING PROMPT =============
const GPT4_STRUCTURING_SYSTEM_PROMPT = `You are an EXAM-GRADE OCR STRUCTURER powered by GPT-4.

🎯 YOUR SOLE PURPOSE:
Take RAW OCR text and ORGANIZE it into a clean, structured JSON format.

⚠️ CRITICAL RULES (NEVER VIOLATE):
1. Do NOT solve any questions
2. Do NOT infer or guess missing text
3. Do NOT rewrite or simplify questions
4. Do NOT generate answers
5. If OCR text is unclear → KEEP IT AS-IS and flag it
6. PRESERVE mathematical symbols, equations, and special characters exactly
7. ONLY reference image IDs, never describe or interpret diagrams

📋 YOUR RESPONSIBILITIES:
1. IDENTIFY question boundaries (Q1, Q2, Question 1, 1., (1), etc.)
2. GROUP sub-questions correctly (a, b, c, i, ii, iii)
3. SEPARATE instructions from actual questions
4. DETECT marks patterns: (2 marks), [5M], 2M, (2), [2 marks]
5. PRESERVE original question order and numbering
6. DETECT questions split across pages and MERGE them
7. LINK image references to nearest questions by ID only
8. FLAG unclear/low-confidence OCR text

📊 STRICT JSON OUTPUT FORMAT:
{
  "questions": [
    {
      "question_number": "1",
      "question_text": "exact OCR text - never modified",
      "sub_questions": [
        { "label": "a", "text": "sub-question text exactly as OCR", "marks": 2 }
      ],
      "marks": 5,
      "page_numbers": [1, 2],
      "associated_images": ["img_1_diagram"],
      "raw_ocr_reference": "original OCR snippet for traceability",
      "instructions": "any instructions preceding this question",
      "difficulty_flag": "clear|unclear|low_confidence"
    }
  ],
  "metadata": {
    "total_questions": 10,
    "total_marks": 50,
    "subject": "Mathematics|Science|null",
    "exam_title": "detected title or null",
    "pages_processed": 3
  },
  "warnings": ["Page 2: Some text may be unclear due to scan quality"]
}

🚫 WHAT YOU MUST NEVER DO:
- Generate placeholder answers
- Simplify mathematical notation
- Add interpretation to diagrams
- Merge separate questions incorrectly
- Skip any detected question content
- Add explanations or commentary

✅ WHAT YOU MUST ALWAYS DO:
- Preserve exact OCR text including errors (but flag them)
- Keep all mathematical symbols: ∪ ∩ ∈ ⊂ ≤ ≥ √ π Σ ∫ etc.
- Maintain question numbering exactly as detected
- Include page break information
- Reference images by ID only
- Add warnings for any quality issues detected`;

// ============= MAIN HANDLER =============
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      raw_ocr_text, 
      page_metadata,
      image_references,
      file_name 
    } = await req.json();

    if (!raw_ocr_text) {
      return new Response(
        JSON.stringify({ error: 'No raw OCR text provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📄 [GPT-4 Structurer] Processing: ${file_name || 'unknown'}`);
    console.log(`📊 Raw OCR length: ${raw_ocr_text.length} characters`);
    console.log(`📸 Image references: ${image_references?.length || 0}`);
    console.log(`📑 Pages: ${page_metadata?.length || 'unknown'}`);

    // Build user prompt with all context
    const userPrompt = buildUserPrompt(raw_ocr_text, page_metadata, image_references, file_name);

    // Call GPT-4o for structuring
    console.log('🤖 Calling OpenAI GPT-4o for structuring...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: GPT4_STRUCTURING_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 4096,
        temperature: 0.1 // Low temperature for consistent, accurate parsing
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI GPT-4o error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402 || response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'OpenAI API authentication failed. Check API key.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`GPT-4o request failed: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;

    // Real-cost tracking for the admin Billing section — never blocks structuring.
    const { promptTokens, completionTokens } = extractUsage(aiResult);
    await logAiUsage({
      functionName: 'ocr-gpt4-structurer',
      model: 'gpt-4o',
      promptTokens,
      completionTokens,
    });

    if (!content) {
      throw new Error('No content in GPT-4o response');
    }

    console.log(`📏 GPT-4o response length: ${content.length} characters`);

    // Parse and validate the structured output
    let structuredData: StructuredOutput;
    try {
      structuredData = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content:', content.substring(0, 500));
      throw new Error('Failed to parse GPT-4o structured output as JSON');
    }

    // Validate the output structure
    const validationResult = validateStructuredOutput(structuredData);
    if (!validationResult.valid) {
      console.warn('⚠️ Validation warnings:', validationResult.warnings);
      // Add validation warnings to output
      structuredData.warnings = [
        ...(structuredData.warnings || []),
        ...validationResult.warnings
      ];
    }

    // Log audit information
    console.log(`✅ [GPT-4 Structurer] Complete:`, {
      questions_extracted: structuredData.questions?.length || 0,
      total_marks: structuredData.metadata?.total_marks,
      pages_processed: structuredData.metadata?.pages_processed,
      warnings_count: structuredData.warnings?.length || 0
    });

    // Audit log for traceability
    const auditLog = {
      timestamp: new Date().toISOString(),
      file_name,
      input_length: raw_ocr_text.length,
      output_questions: structuredData.questions?.length || 0,
      model: 'gpt-4o',
      warnings: structuredData.warnings
    };
    console.log('[Audit]', JSON.stringify(auditLog));

    return new Response(
      JSON.stringify({
        success: true,
        data: structuredData,
        audit: auditLog
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [GPT-4 Structurer] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to structure OCR output with GPT-4'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============= HELPER FUNCTIONS =============

function buildUserPrompt(
  rawOcrText: string,
  pageMetadata: Array<{ page: number; content_length: number }> | undefined,
  imageReferences: Array<{ id: string; page: number; type: string }> | undefined,
  fileName: string | undefined
): string {
  let prompt = `📁 Document: ${fileName || 'Unknown Document'}\n\n`;

  // Add page metadata if available
  if (pageMetadata && pageMetadata.length > 0) {
    prompt += `📑 Page Information:\n`;
    pageMetadata.forEach(p => {
      prompt += `- Page ${p.page}: ${p.content_length} characters\n`;
    });
    prompt += `\n`;
  }

  // Add image references if available
  if (imageReferences && imageReferences.length > 0) {
    prompt += `📸 Available Images (reference by ID only, do not describe):\n`;
    imageReferences.forEach(img => {
      prompt += `- ID: "${img.id}" (Page ${img.page}, Type: ${img.type})\n`;
    });
    prompt += `\n`;
  }

  // Add the raw OCR text
  prompt += `📄 RAW OCR TEXT (structure this without modification):\n`;
  prompt += `---BEGIN OCR---\n`;
  prompt += rawOcrText;
  prompt += `\n---END OCR---\n\n`;

  prompt += `🎯 TASK: Structure the above OCR text into the required JSON format.
Remember:
- Do NOT solve questions
- Do NOT infer missing text
- PRESERVE all text exactly as shown
- FLAG unclear sections
- LINK images by ID only
- Output ONLY valid JSON`;

  return prompt;
}

function validateStructuredOutput(data: StructuredOutput): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check questions array exists
  if (!data.questions || !Array.isArray(data.questions)) {
    warnings.push('Missing or invalid questions array');
    return { valid: false, warnings };
  }

  // Check each question has required fields
  data.questions.forEach((q, index) => {
    if (!q.question_number) {
      warnings.push(`Question ${index + 1}: Missing question_number`);
    }
    if (!q.question_text) {
      warnings.push(`Question ${index + 1}: Missing question_text`);
    }
    if (!q.page_numbers || q.page_numbers.length === 0) {
      warnings.push(`Question ${index + 1}: Missing page_numbers`);
    }
    if (!q.raw_ocr_reference) {
      warnings.push(`Question ${index + 1}: Missing raw_ocr_reference for traceability`);
    }

    // Validate sub-questions if present
    if (q.sub_questions && Array.isArray(q.sub_questions)) {
      q.sub_questions.forEach((sq, sqIndex) => {
        if (!sq.label) {
          warnings.push(`Question ${q.question_number}, sub-question ${sqIndex + 1}: Missing label`);
        }
        if (!sq.text) {
          warnings.push(`Question ${q.question_number}, sub-question ${sqIndex + 1}: Missing text`);
        }
      });
    }
  });

  // Check metadata
  if (!data.metadata) {
    warnings.push('Missing metadata object');
  } else {
    if (typeof data.metadata.total_questions !== 'number') {
      warnings.push('Missing or invalid total_questions in metadata');
    }
    if (data.metadata.total_questions !== data.questions.length) {
      warnings.push(`Metadata mismatch: total_questions (${data.metadata.total_questions}) != actual (${data.questions.length})`);
    }
  }

  return { valid: warnings.length === 0, warnings };
}
