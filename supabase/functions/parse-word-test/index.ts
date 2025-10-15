import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ParsedQuestion {
  question_text: string;
  category?: string;
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  word_limit?: number;
  answer_key: string;
  question_image_url?: string;
  has_sub_questions?: boolean;
  sub_questions?: Array<{
    label: string;
    text: string;
    marks: number;
    answer_key: string;
    image_url?: string;
  }>;
}

interface ParsedTest {
  test_name: string;
  subject: string;
  topic?: string;
  questions: ParsedQuestion[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Processing file:', file.name, 'Size:', file.size, 'Type:', file.type);

    // Validate file type
    if (!file.name.endsWith('.doc') && !file.name.endsWith('.docx')) {
      return new Response(
        JSON.stringify({ error: 'Invalid file format. Only .doc and .docx files are supported.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Convert file to base64 for AI processing
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64 = btoa(String.fromCharCode(...uint8Array));

    console.log('File converted to base64, calling Lovable AI...');

    // Call Lovable AI with structured output
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Act as a professional educational assessment analyst. Your sole task is to meticulously analyze the provided document (which is a mock test or exam paper) and output a perfectly structured JSON object that captures the entire test structure. Do not include any text or conversation outside of the JSON block. Ensure all required fields are present and accurate based on the document's content.`
          },
          {
            role: 'user',
            content: `Analyze the following document and extract the full mock test structure, including:

1. **Test Metadata:** The Title, the most appropriate Subject ('mathematics', 'science', 'language_literature', 'social_studies', 'physics', 'chemistry', 'biology'), and the specific Topic.
2. **Main Questions:** A complete, ordered list of questions. For each question, extract the main text, total marks, the primary category (e.g., 'Long Answer', 'MCQ', 'Short Answer'), estimated difficulty, and the full Answer Key/Solution.
3. **Sub-Questions:** Accurately identify and extract all sub-parts (like a, b, i, ii) for any question marked as having sub-questions. For each sub-question, extract its label, text, individual marks, and individual answer key.
4. **Visual Assets:** If an image, graph, or chart is present for a question or sub-question, note its presence as a descriptive placeholder text in the respective image_url field (e.g., "Image of a Circuit Diagram is required").

File type: ${file.type}
File name: ${file.name}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_test_structure',
              description: 'Extract structured mock test data from the document',
              parameters: {
                type: 'object',
                properties: {
                  test_name: { type: 'string', description: 'The title of the test' },
                  subject: { 
                    type: 'string', 
                    enum: ['mathematics', 'science', 'language_literature', 'social_studies', 'physics', 'chemistry', 'biology'],
                    description: 'The subject category'
                  },
                  topic: { type: 'string', description: 'Specific topic covered' },
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        question_text: { type: 'string', description: 'The main question text' },
                        category: { type: 'string', description: 'Question type (e.g., MCQ, Long Answer)' },
                        marks: { type: 'number', description: 'Total marks for this question' },
                        difficulty: { 
                          type: 'string', 
                          enum: ['easy', 'medium', 'hard'],
                          description: 'Difficulty level'
                        },
                        word_limit: { type: 'number', description: 'Word limit if specified' },
                        answer_key: { type: 'string', description: 'Complete answer/solution' },
                        question_image_url: { type: 'string', description: 'Description if image is present' },
                        has_sub_questions: { type: 'boolean', description: 'Whether question has sub-parts' },
                        sub_questions: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              label: { type: 'string', description: 'Sub-question label (a, b, i, ii)' },
                              text: { type: 'string', description: 'Sub-question text' },
                              marks: { type: 'number', description: 'Marks for this sub-question' },
                              answer_key: { type: 'string', description: 'Answer for this sub-question' },
                              image_url: { type: 'string', description: 'Description if image is present' }
                            },
                            required: ['label', 'text', 'marks', 'answer_key']
                          }
                        }
                      },
                      required: ['question_text', 'marks', 'difficulty', 'answer_key']
                    }
                  }
                },
                required: ['test_name', 'subject', 'questions']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_test_structure' } }
      })
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error('AI processing failed');
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    // Extract structured data from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('No structured data returned from AI');
    }

    const parsedTest: ParsedTest = JSON.parse(toolCall.function.arguments);

    // Validate minimum questions
    if (!parsedTest.questions || parsedTest.questions.length < 1) {
      return new Response(
        JSON.stringify({ error: `At least 1 question required. Found ${parsedTest.questions?.length || 0} questions.` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Successfully parsed test:', parsedTest.test_name, 'with', parsedTest.questions.length, 'questions');

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: parsedTest,
        message: `Successfully parsed ${parsedTest.questions.length} questions using AI.`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error parsing Word file:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'Unknown error');
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error while parsing the Word file',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});