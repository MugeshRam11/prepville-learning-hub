import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    const { extractedText, fileName, operation, testId } = await req.json();

    console.log(`📋 Pipeline operation: ${operation || 'parse'}`);

    let result: any = { success: true };

    // Step 2: Parse with AI
    if (operation === 'parse' || !operation) {
      console.log('🤖 Parsing with AI using structured output...');
      
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        throw new Error('AI service not configured');
      }

      const systemPrompt = `You are a document intelligence assistant that extracts structured questions from documents.

Your task:
• Extract question text, all options (A, B, C, D), correct answer, and explanation
• Return valid JSON with no duplicates or incomplete entries
• If fields are missing, use empty strings/arrays
• Infer difficulty level (easy/medium/hard) and topic when possible
• IMPORTANT: For math expressions, keep them simple. Convert LaTeX to plain text when possible (e.g., "2x + 3" instead of "$2x + 3$")
• Avoid complex LaTeX notation with multiple backslashes
• Be precise and ensure no extra commentary`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Extract all multiple-choice questions from this document:\n\n${extractedText}` }
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'extract_questions',
              description: 'Extract structured multiple-choice questions from document text',
              parameters: {
                type: 'object',
                properties: {
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        question: { type: 'string', description: 'The main question text' },
                        options: { 
                          type: 'array', 
                          items: { type: 'string' },
                          description: 'Array of answer choices (typically A, B, C, D)'
                        },
                        answer: { type: 'string', description: 'The correct answer text or letter' },
                        explanation: { type: 'string', description: 'Explanation of why the answer is correct' },
                        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
                        topic: { type: 'string', description: 'Subject or topic of the question' }
                      },
                      required: ['question', 'options', 'answer']
                    }
                  }
                },
                required: ['questions'],
                additionalProperties: false
              }
            }
          }],
          tool_choice: { type: 'function', function: { name: 'extract_questions' } }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI error:', errorText);
        throw new Error(`AI parsing failed: ${response.status}`);
      }

      const aiData = await response.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      
      if (!toolCall) {
        throw new Error('No structured output from AI');
      }

      // Sanitize the JSON string before parsing to handle LaTeX escaping issues
      let jsonString = toolCall.function.arguments;
      
      // Fix common LaTeX escaping issues
      jsonString = jsonString
        .replace(/\\\\\\\\/g, '\\\\')  // Fix quadruple backslashes
        .replace(/\\begin{pmatrix}/g, '[')  // Simplify matrix notation
        .replace(/\\end{pmatrix}/g, ']')
        .replace(/\\\\/g, '; ')  // Replace matrix row separators with semicolons
        .replace(/\\times/g, '×')  // Use multiplication symbol
        .replace(/\\div/g, '÷');  // Use division symbol

      let parsedData;
      try {
        parsedData = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('JSON parsing failed after sanitization:', parseError);
        console.error('Problematic JSON:', jsonString.substring(0, 500));
        throw new Error('AI response format invalid. Try a simpler document first.');
      }

      const questions = parsedData.questions || [];
      
      console.log(`✅ Parsed ${questions.length} questions`);

      // If testId is provided, save to database
      if (testId && questions.length > 0) {
        console.log(`💾 Saving ${questions.length} questions to database...`);
        
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Transform questions to match mock_questions schema
        const dbQuestions = questions.map((q: any, index: number) => ({
          mock_test_id: testId,
          question_number: index + 1,
          question_text: `${q.question}\n\nA) ${q.options[0] || ''}\nB) ${q.options[1] || ''}\nC) ${q.options[2] || ''}\nD) ${q.options[3] || ''}`,
          answer_key: q.answer || '',
          difficulty: q.difficulty || 'medium',
          marks: 1
        }));

        const { data: insertedQuestions, error: insertError } = await supabase
          .from('mock_questions')
          .insert(dbQuestions)
          .select();

        if (insertError) {
          console.error('Database insertion error:', insertError);
          throw new Error(`Failed to save questions: ${insertError.message}`);
        }

        console.log(`✅ Successfully saved ${insertedQuestions?.length || 0} questions`);
      }

      result.parse = {
        success: true,
        questions,
        metadata: {
          fileName,
          totalQuestions: questions.length,
          parsedAt: new Date().toISOString(),
          savedToDatabase: !!testId
        }
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
