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
    const contentType = req.headers.get('content-type');
    
    // Handle file upload for conversion
    if (contentType?.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return new Response(
          JSON.stringify({ error: 'No file provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`📄 Converting ${file.name} using RapidAPI DocConverter...`);

      const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY');
      if (!RAPIDAPI_KEY) {
        return new Response(
          JSON.stringify({ error: 'RapidAPI key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        // Read file as base64
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        // Call RapidAPI DocConverter
        const convertResponse = await fetch(
          'https://docconverter-pro-one-api-for-all-your-document-conversions.p.rapidapi.com/convert/pdf',
          {
            method: 'POST',
            headers: {
              'x-rapidapi-key': RAPIDAPI_KEY,
              'x-rapidapi-host': 'docconverter-pro-one-api-for-all-your-document-conversions.p.rapidapi.com',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              file: base64,
              outputFormat: 'docx',
              fileName: file.name
            })
          }
        );

        if (!convertResponse.ok) {
          const errorText = await convertResponse.text();
          console.error('RapidAPI conversion error:', convertResponse.status, errorText);
          throw new Error(`Conversion failed: ${convertResponse.status}`);
        }

        const convertedData = await convertResponse.arrayBuffer();
        
        console.log(`✅ Converted successfully (${convertedData.byteLength} bytes)`);

        return new Response(convertedData, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '.docx')}"`,
          }
        });

      } catch (error) {
        console.error('Conversion error:', error);
        return new Response(
          JSON.stringify({ 
            error: error instanceof Error ? error.message : 'Conversion failed' 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle JSON request for parsing
    const { extractedText, fileName, operation } = await req.json();

    console.log(`📋 Pipeline operation: ${operation || 'parse'}`);

    let result: any = { success: true };

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
