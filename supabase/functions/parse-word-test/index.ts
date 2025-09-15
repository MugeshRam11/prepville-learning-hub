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
  option_feedback?: { [key: number]: { type: string; message: string } };
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
    
    let testName = '';
    let category = '';
    const questions: ParsedQuestion[] = [];
    
    let currentQuestion: Partial<ParsedQuestion> = {};
    let currentOptions: string[] = [];
    let correctAnswer = '';
    
    let i = 0;
    let inTableSection = false;
    
    // Extract test name and category from initial lines
    while (i < lines.length && !lines[i].toLowerCase().includes('question')) {
      if (lines[i] && !testName) {
        testName = lines[i];
      } else if (lines[i] && !category) {
        category = lines[i];
      }
      i++;
    }
    
    while (i < lines.length) {
      const line = lines[i];
      const lower = line.toLowerCase();
      
      // Question detection
      if (lower.startsWith('question')) {
        // Save previous question if exists
        if (currentQuestion.question_text && currentOptions.length > 0) {
          const correctIndex = correctAnswer ? parseInt(correctAnswer) - 1 : 0;
          
          // Create default feedback for all options
          const optionFeedback: { [key: number]: { type: string; message: string } } = {};
          currentOptions.forEach((option, index) => {
            if (index === correctIndex) {
              optionFeedback[index] = { 
                type: 'correct', 
                message: `Correct! The answer is ${option}.` 
              };
            } else {
              optionFeedback[index] = { 
                type: 'concept-error', 
                message: `Incorrect. The correct answer is ${currentOptions[correctIndex]}.` 
              };
            }
          });
          
          questions.push({
            question_text: currentQuestion.question_text!,
            options: [...currentOptions],
            correct_answer: Math.max(0, correctIndex).toString(),
            explanation: '',
            incorrect_type: 0,
            option_feedback: optionFeedback
          });
        }
        
        // Reset for new question
        currentQuestion = {};
        currentOptions = [];
        correctAnswer = '';
        inTableSection = false;
        
        // Extract question text - try same line first
        const questionMatch = line.match(/^Question\s+\d+:?\s*(.*)/i);
        if (questionMatch && questionMatch[1].trim()) {
          currentQuestion.question_text = questionMatch[1].trim();
        }
      }
      // Question text (line after "Question X:" if not already captured)
      else if (!currentQuestion.question_text && 
               !lower.includes('option') &&
               !lower.includes('correct answer') &&
               !line.match(/^\d+\.?$/) &&
               !line.match(/^\d+\s/)) {
        currentQuestion.question_text = line;
      }
      // Table headers detection
      else if (lower.includes('option no') && lower.includes('options')) {
        inTableSection = true;
      }
      // Skip table header row with just "Option No." and "Options"
      else if (inTableSection && (lower === 'option no.' || lower === 'options')) {
        // Skip header cells
      }
      // Option number followed by option text
      else if (inTableSection && line.match(/^\d+\.?$/)) {
        // This is just the option number, get the option text from next line
        if (i + 1 < lines.length) {
          const optionText = lines[i + 1].trim();
          // Make sure it's not another number or table element
          if (optionText && !optionText.match(/^\d+\.?$/) && !optionText.toLowerCase().includes('correct answer')) {
            currentOptions.push(optionText);
            i++; // consume the option text line
          }
        }
      }
      // Option pattern: "1. 5" or "1.5" (number followed by option)
      else if (inTableSection && line.match(/^\d+\.?\s*\S+$/)) {
        const match = line.match(/^\d+\.?\s*(.+)$/);
        if (match) {
          currentOptions.push(match[1].trim());
        }
      }
      // Correct answer detection
      else if (lower.includes('correct answer')) {
        inTableSection = false;
        
        // Try to extract answer from same line
        const answerMatch = line.match(/correct answer[^0-9]*(\d+)/i);
        if (answerMatch) {
          correctAnswer = answerMatch[1];
        } else if (i + 1 < lines.length) {
          // Check next line for answer
          const nextLine = lines[i + 1].trim();
          if (nextLine.match(/^\d+$/)) {
            correctAnswer = nextLine;
            i++; // consume next line
          }
        }
      }
      
      i++;
    }
    
    // Save last question
    if (currentQuestion.question_text && currentOptions.length > 0) {
      const correctIndex = correctAnswer ? parseInt(correctAnswer) - 1 : 0;
      
      // Create default feedback for all options
      const optionFeedback: { [key: number]: { type: string; message: string } } = {};
      currentOptions.forEach((option, index) => {
        if (index === correctIndex) {
          optionFeedback[index] = { 
            type: 'correct', 
            message: `Correct! The answer is ${option}.` 
          };
        } else {
          optionFeedback[index] = { 
            type: 'concept-error', 
            message: `Incorrect. The correct answer is ${currentOptions[correctIndex]}.` 
          };
        }
      });
      
      questions.push({
        question_text: currentQuestion.question_text!,
        options: [...currentOptions],
        correct_answer: Math.max(0, correctIndex).toString(),
        explanation: '',
        incorrect_type: 0,
        option_feedback: optionFeedback
      });
    }
    
    console.log('Parsed questions:', questions);
    
    if (questions.length === 0) {
      return null;
    }
    
    return {
      test_name: testName || 'Untitled Test',
      category: category || 'General',
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