import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ParsedQuestion {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  incorrect_type: number;
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

    // Validate minimum questions
    if (parsedTest.questions.length < 5) {
      return new Response(
        JSON.stringify({ error: `Minimum 5 questions required. Found ${parsedTest.questions.length} questions.` }),
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
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error while parsing the Word file',
        details: error.message 
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
    
    // Extract test name and category from the beginning
    let testName = '';
    let category = '';
    
    // Look for test name and category patterns
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('test name') || line.includes('title')) {
        testName = extractValue(lines[i]);
      }
      if (line.includes('category') || line.includes('subject')) {
        category = extractValue(lines[i]);
      }
    }

    // Default values if not found
    if (!testName) testName = 'Imported Quick Test';
    if (!category) category = 'General';

    const questions: ParsedQuestion[] = [];
    let currentQuestion: Partial<ParsedQuestion> = {};
    let questionText = '';
    let options: string[] = [];
    let collectingOptions = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect question start
      if (line.match(/^Question\s+\d+/i)) {
        // Save previous question if exists
        if (currentQuestion.question_text && options.length > 0) {
          questions.push({
            question_text: currentQuestion.question_text,
            options: [...options],
            correct_answer: currentQuestion.correct_answer || '1',
            explanation: currentQuestion.explanation || '',
            incorrect_type: currentQuestion.incorrect_type || 0
          });
        }

        // Start new question
        currentQuestion = {};
        options = [];
        questionText = '';
        collectingOptions = false;
        
        // Extract question text (might be on same line or next line)
        const questionMatch = line.match(/^Question\s+\d+:?\s*(.*)/i);
        if (questionMatch && questionMatch[1]) {
          questionText = questionMatch[1];
        }
        continue;
      }

      // Collect question text if we're in a question and haven't started options
      if (currentQuestion !== null && !collectingOptions && !line.match(/^\d+\./)) {
        if (questionText) {
          questionText += ' ' + line;
        } else {
          questionText = line;
        }
        currentQuestion.question_text = questionText;
        continue;
      }

      // Detect options (numbered list: 1., 2., etc.)
      const optionMatch = line.match(/^(\d+)\.\s*(.*)/);
      if (optionMatch) {
        collectingOptions = true;
        options.push(optionMatch[2]);
        continue;
      }

      // Detect correct answer
      if (line.toLowerCase().includes('correct answer')) {
        const answer = extractValue(line);
        currentQuestion.correct_answer = answer;
        continue;
      }

      // Detect explanation
      if (line.toLowerCase().includes('explanation')) {
        const explanation = extractValue(line);
        currentQuestion.explanation = explanation;
        continue;
      }

      // Detect incorrect type
      if (line.toLowerCase().includes('type') || line.toLowerCase().includes('incorrect type')) {
        const typeValue = extractIncorrectType(line);
        currentQuestion.incorrect_type = typeValue;
        continue;
      }
    }

    // Don't forget the last question
    if (currentQuestion.question_text && options.length > 0) {
      questions.push({
        question_text: currentQuestion.question_text,
        options: [...options],
        correct_answer: currentQuestion.correct_answer || '1',
        explanation: currentQuestion.explanation || '',
        incorrect_type: currentQuestion.incorrect_type || 0
      });
    }

    console.log('Parsed questions:', questions);

    return {
      test_name: testName,
      category: category,
      questions: questions
    };

  } catch (error) {
    console.error('Error in parseWordContent:', error);
    return null;
  }
}

function extractValue(line: string): string {
  // Extract value after colon or other separators
  const colonIndex = line.indexOf(':');
  if (colonIndex !== -1) {
    return line.substring(colonIndex + 1).trim();
  }
  
  // Try to extract after common patterns
  const patterns = ['test name', 'category', 'subject', 'correct answer', 'explanation', 'answer'];
  for (const pattern of patterns) {
    const index = line.toLowerCase().indexOf(pattern);
    if (index !== -1) {
      return line.substring(index + pattern.length).replace(/[:=-]/g, '').trim();
    }
  }
  
  return line.trim();
}

function extractIncorrectType(line: string): number {
  const text = line.toLowerCase();
  
  // Look for numeric type first
  const numMatch = text.match(/(\d+)/);
  if (numMatch) {
    return parseInt(numMatch[1]);
  }
  
  // Look for text patterns
  if (text.includes('concept')) return 1;
  if (text.includes('calculation')) return 2;
  if (text.includes('interpretation')) return 3;
  if (text.includes('carelessness')) return 4;
  if (text.includes('subjective')) return 5;
  
  return 0; // Default to correct
}