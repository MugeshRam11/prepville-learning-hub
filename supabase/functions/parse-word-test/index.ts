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
    const rawLines = text.split('\n').map(line => line.trim());
    const lines = rawLines.filter(line => line.length > 0);

    // Small helpers
    const isHeader = (s: string) => {
      const t = s.toLowerCase();
      return t.startsWith('option no') || t === 'options' || t === 'explanation' || t === 'type' || t.includes('option no.') || t.includes('option no');
    };
    const getNextNonEmptyLine = (arr: string[], startIdx: number) => {
      let idx = startIdx + 1;
      while (idx < arr.length) {
        const v = arr[idx]?.trim();
        if (v) return { value: v, index: idx };
        idx++;
      }
      return { value: '', index: startIdx };
    };

    // Extract test name and category from the beginning
    let testName = '';
    let category = '';

    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const lower = lines[i].toLowerCase();
      if (lower.includes('test name') || lower.includes('title')) {
        testName = extractValue(lines[i]);
      }
      if (lower.includes('category') || lower.includes('subject')) {
        category = extractValue(lines[i]);
      }
    }

    if (!testName) testName = 'Imported Quick Test';
    if (!category) category = 'General';

    const questions: ParsedQuestion[] = [];
    let currentQuestion: Partial<ParsedQuestion> = {};
    let questionText = '';
    let options: string[] = [];
    let collectingOptions = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lower = line.toLowerCase();

      // Detect question start
      const qStart = line.match(/^Question\s+\d+/i);
      if (qStart) {
        // Save previous question if exists
        if (currentQuestion.question_text && options.length > 0) {
          questions.push({
            question_text: currentQuestion.question_text,
            options: [...options],
            correct_answer: currentQuestion.correct_answer || '1',
            explanation: currentQuestion.explanation || '',
            incorrect_type: currentQuestion.incorrect_type || 0,
          });
        }

        // Reset state for new question
        currentQuestion = {};
        options = [];
        questionText = '';
        collectingOptions = false;

        // Try to extract question text from same line
        const questionMatch = line.match(/^Question\s+\d+:?\s*(.*)/i);
        if (questionMatch && questionMatch[1]) {
          questionText = questionMatch[1].trim();
          if (questionText) currentQuestion.question_text = questionText;
        }
        continue;
      }

      // Skip table headers
      if (isHeader(line)) {
        continue;
      }

      // Build up question text until options begin
      if (!collectingOptions && !/^\d+\./.test(line)) {
        // Stop accumulating if we see a clear separator heading
        if (lower.startsWith('correct answer')) {
          // Handle cases where the answer is on next line
          let answer = extractValue(line);
          if (!answer || answer === '( option or text)') {
            const next = getNextNonEmptyLine(lines, i);
            answer = next.value;
            i = next.index; // advance to the consumed line
          }
          currentQuestion.correct_answer = answer;
          continue;
        }

        // Otherwise treat as part of the question text
        questionText = questionText ? questionText + ' ' + line : line;
        currentQuestion.question_text = questionText;
        continue;
      }

      // Options parsing (supports both "1. text" and "1." followed by text on next line)
      const optionMatch = line.match(/^(\d+)\.?\s*(.*)$/);
      if (optionMatch) {
        collectingOptions = true;
        let optText = optionMatch[2]?.trim() || '';
        if (!optText) {
          // Some templates put the option text on the next non-empty line
          const next = getNextNonEmptyLine(lines, i);
          optText = next.value;
          i = next.index; // consume the line we used
        }
        options.push(optText);
        continue;
      }

      // Correct answer may also appear after options
      if (lower.includes('correct answer')) {
        let answer = extractValue(line);
        if (!answer || answer === '( option or text)') {
          const next = getNextNonEmptyLine(lines, i);
          answer = next.value;
          i = next.index;
        }
        currentQuestion.correct_answer = answer;
        continue;
      }

      // Explanation for entire question (optional)
      if (lower.startsWith('explanation')) {
        const exp = extractValue(line);
        if (exp) currentQuestion.explanation = exp;
        continue;
      }

      // Generic incorrect type line (fallback). If not present, default stays 0
      if (lower.includes('incorrect type') || lower.startsWith('type:')) {
        const t = extractIncorrectType(line);
        currentQuestion.incorrect_type = t;
        continue;
      }
    }

    // Push the last question, if any
    if (currentQuestion.question_text && options.length > 0) {
      questions.push({
        question_text: currentQuestion.question_text,
        options: [...options],
        correct_answer: currentQuestion.correct_answer || '1',
        explanation: currentQuestion.explanation || '',
        incorrect_type: currentQuestion.incorrect_type || 0,
      });
    }

    console.log('Parsed questions:', questions);

    return {
      test_name: testName,
      category: category,
      questions: questions,
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