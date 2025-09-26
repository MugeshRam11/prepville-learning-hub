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
}

interface ParsedTest {
  test_name: string;
  category: string;
  questions: ParsedQuestion[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

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

    // Convert file to ArrayBuffer for mammoth
    const arrayBuffer = await file.arrayBuffer();
    console.log('ArrayBuffer created, size:', arrayBuffer.byteLength);
    
    // Parse Word document using mammoth
    let mammoth;
    try {
      mammoth = await import('https://esm.sh/mammoth@1.6.0');
    } catch (importError) {
      console.error('Failed to import mammoth:', importError);
      throw new Error('Failed to load document parser');
    }
    
    console.log('Mammoth imported successfully');
    
    let result;
    try {
      result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    } catch (parseError) {
      console.error('Mammoth parsing error:', parseError);
      throw new Error('Failed to parse Word document. Please ensure the file is not corrupted and follows the correct format.');
    }
    
    const text = result.value;

    console.log('Extracted text from Word file:', text.substring(0, 500) + '...');

    // Parse the extracted text to find test structure
    const parsedTest = parseWordContent(text);

    if (!parsedTest) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse Word document. Please ensure it follows the required template format.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate minimum questions (allow 1 or more for testing)
    if (parsedTest.questions.length < 1) {
      return new Response(
        JSON.stringify({ error: `At least 1 question required. Found ${parsedTest.questions.length} questions.` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: parsedTest,
        message: `Successfully parsed ${parsedTest.questions.length} questions from the Word file.`
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

function parseWordContent(text: string): ParsedTest | null {
  try {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let testName = '';
    let category = '';
    let subject = '';
    let topic = '';
    const questions: ParsedQuestion[] = [];
    
    let currentQuestion: Partial<ParsedQuestion> = {};
    let i = 0;
    
    // Extract header information
    while (i < lines.length && !lines[i].toLowerCase().includes('question')) {
      const line = lines[i].toLowerCase();
      
      if (line.includes('mock test title') || line.includes('title')) {
        testName = extractValue(lines[i]);
      } else if (line.includes('subject')) {
        subject = extractValue(lines[i]);
        category = subject; // Use subject as category
      } else if (line.includes('topic')) {
        topic = extractValue(lines[i]);
      }
      i++;
    }
    
    while (i < lines.length) {
      const line = lines[i];
      const lower = line.toLowerCase();
      
      // Question detection
      if (lower.includes('question') && /question\s+\d+/i.test(line)) {
        // Save previous question if complete
        if (currentQuestion.question_text && currentQuestion.answer_key) {
          questions.push({
            question_text: currentQuestion.question_text,
            category: currentQuestion.category || 'General',
            marks: currentQuestion.marks || 1,
            difficulty: currentQuestion.difficulty || 'medium',
            word_limit: currentQuestion.word_limit,
            answer_key: currentQuestion.answer_key
          });
        }
        
        // Reset for new question
        currentQuestion = {
          marks: 1,
          difficulty: 'medium'
        };
      }
      // Extract question fields
      else if (lower.includes('question text')) {
        currentQuestion.question_text = extractValue(lines[i]);
      }
      else if (lower.includes('category')) {
        currentQuestion.category = extractValue(lines[i]);
      }
      else if (lower.includes('marks')) {
        const marksStr = extractValue(lines[i]);
        currentQuestion.marks = parseInt(marksStr) || 1;
      }
      else if (lower.includes('difficulty')) {
        const difficultyStr = extractValue(lines[i]).toLowerCase();
        if (difficultyStr.includes('easy')) {
          currentQuestion.difficulty = 'easy';
        } else if (difficultyStr.includes('hard')) {
          currentQuestion.difficulty = 'hard';
        } else {
          currentQuestion.difficulty = 'medium';
        }
      }
      else if (lower.includes('word limit')) {
        const wordLimitStr = extractValue(lines[i]);
        const wordLimit = parseInt(wordLimitStr);
        if (!isNaN(wordLimit)) {
          currentQuestion.word_limit = wordLimit;
        }
      }
      else if (lower.includes('answer key')) {
        currentQuestion.answer_key = extractValue(lines[i]);
      }
      
      i++;
    }
    
    // Save last question
    if (currentQuestion.question_text && currentQuestion.answer_key) {
      questions.push({
        question_text: currentQuestion.question_text,
        category: currentQuestion.category || 'General',
        marks: currentQuestion.marks || 1,
        difficulty: currentQuestion.difficulty || 'medium',
        word_limit: currentQuestion.word_limit,
        answer_key: currentQuestion.answer_key
      });
    }
    
    console.log('Parsed questions:', questions);
    
    if (questions.length === 0) {
      return null;
    }
    
    return {
      test_name: testName || 'Untitled Test',
      category: category || subject || 'General',
      questions: questions
    };
    
  } catch (error) {
    console.error('Error in parseWordContent:', error);
    return null;
  }
}

function extractValue(line: string): string {
  // Extract value after colon or brackets
  const colonIndex = line.indexOf(':');
  if (colonIndex !== -1) {
    let value = line.substring(colonIndex + 1).trim();
    // Remove brackets if present
    value = value.replace(/^\[|\]$/g, '');
    return value;
  }
  
  // Look for bracketed values
  const bracketMatch = line.match(/\[(.*?)\]/);
  if (bracketMatch) {
    return bracketMatch[1].trim();
  }
  
  // Try to extract after common patterns
  const patterns = ['mock test title', 'title', 'subject', 'topic', 'category', 'marks', 'difficulty', 'word limit', 'answer key'];
  for (const pattern of patterns) {
    const index = line.toLowerCase().indexOf(pattern);
    if (index !== -1) {
      let value = line.substring(index + pattern.length).replace(/[:=-]/g, '').trim();
      // Remove brackets if present
      value = value.replace(/^\[|\]$/g, '');
      return value;
    }
  }
  
  return line.trim();
}