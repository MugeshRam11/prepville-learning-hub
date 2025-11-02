import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { extractedText, fileName, operation } = await req.json();

    console.log(`📋 Pipeline operation: ${operation || 'full'}`);

    let result: any = { success: true };

    // Step 1: Convert to Word
    if (operation === 'convert' || !operation) {
      console.log('🔄 Converting to Word format...');
      
      const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;
      const zip = new JSZip();

      const escapedText = (extractedText || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

      const wordContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>${escapedText}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

      zip.file('word/document.xml', wordContent);
      zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
      
      zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

      const docxBlob = await zip.generateAsync({ type: 'uint8array' });
      
      result.word = {
        success: true,
        size: docxBlob.length,
        fileName: (fileName || 'document').replace('.pdf', '.docx')
      };

      // If we only want to convert, return the Word document
      if (operation === 'convert') {
        return new Response(docxBlob, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${result.word.fileName}"`,
          }
        });
      }
    }

    // Step 2: Parse with AI
    if (operation === 'parse' || !operation) {
      console.log('🤖 Parsing with AI...');
      
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        throw new Error('AI service not configured');
      }

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'user',
            content: `Parse the following document and extract all questions in a structured format.

Document content:
${extractedText}

Return JSON in this format:
{
  "questions": [
    {
      "question_number": "1",
      "question_text": "question text here",
      "option_a": "option A",
      "option_b": "option B",
      "option_c": "option C",
      "option_d": "option D",
      "correct_answer": "A",
      "explanation": "explanation here",
      "difficulty": "medium",
      "topic": "topic name"
    }
  ],
  "metadata": {
    "total_questions": 0,
    "subject": "subject name"
  }
}`
          }],
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI error:', errorText);
        throw new Error(`AI parsing failed: ${response.status}`);
      }

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      result.parse = {
        success: true,
        questions: parsed.questions || [],
        metadata: parsed.metadata || {},
        count: parsed.questions?.length || 0
      };
    }

    console.log('✅ Pipeline completed successfully');

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Pipeline error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Pipeline processing failed',
        stack: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
