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
    let currentOptionFeedback: { [key: number]: { type: string; message: string } } = {};
    let correctAnswer = '';
    
    let i = 0;
    let inTableSection = false;
    let optionRowData: { number: string, option: string, explanation: string, type: string }[] = [];
    
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
          
          questions.push({
            question_text: currentQuestion.question_text!,
            options: [...currentOptions],
            correct_answer: Math.max(0, correctIndex).toString(),
            explanation: '',
            incorrect_type: 0,
            option_feedback: currentOptionFeedback
          });
        }
        
        // Reset for new question
        currentQuestion = {};
        currentOptions = [];
        currentOptionFeedback = {};
        correctAnswer = '';
        inTableSection = false;
        optionRowData = [];
        
        // Try to extract question text from same line
        const questionMatch = line.match(/^Question\s+\d+:?\s*(.*)/i);
        if (questionMatch && questionMatch[1]) {
          currentQuestion.question_text = questionMatch[1].trim();
        }
      }
      // Question text (line after "Question X:" if not already captured)
      else if (!currentQuestion.question_text && 
               !lower.includes('option') &&
               !lower.includes('explanation') &&
               !lower.includes('type') &&
               !line.match(/^\d+\./) &&
               !lower.includes('correct answer')) {
        currentQuestion.question_text = line;
      }
      // Table headers detection - start collecting table data
      else if (lower.includes('option no') || 
               (lower.includes('options') && lower.includes('explanation') && lower.includes('type'))) {
        inTableSection = true;
      }
      // Collect table rows - each option with its data
      else if (inTableSection && line.match(/^\d+\.?$/)) {
        // This is an option number line, collect the next few lines as the row data
        const optionNumber = line.replace('.', '');
        let option = '';
        let explanation = '';
        let type = '';
        
        // Get option text (next line)
        if (i + 1 < lines.length) {
          option = lines[i + 1];
          i++; // consume this line
        }
        
        // Get explanation (skip non-explanatory lines)
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j];
          if (nextLine && (nextLine.toLowerCase().includes('wrong') || nextLine.toLowerCase().includes('correct'))) {
            explanation = nextLine;
            i = j; // consume this line
            break;
          }
          j++;
        }
        
        // Get type (look for pattern like "2 (Calculation Error)")
        j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j];
          if (nextLine && nextLine.match(/^\d+\s*\([^)]+\)/)) {
            type = nextLine;
            i = j; // consume this line
            break;
          }
          j++;
        }
        
        optionRowData.push({ number: optionNumber, option, explanation, type });
      }
      // Process table data when we encounter "Correct Answer" or next question
      else if ((lower.includes('correct answer') || lower.startsWith('question')) && optionRowData.length > 0) {
        // Process all collected option data
        optionRowData.forEach((rowData, index) => {
          currentOptions.push(rowData.option);
          
          // Parse type to get error category
          let errorType = 'concept-error';
          if (rowData.type) {
            const typeMatch = rowData.type.match(/^\d+\s*\(([^)]+)\)/);
            if (typeMatch) {
              const typeText = typeMatch[1].toLowerCase();
              if (typeText.includes('correct')) {
                errorType = 'correct';
              } else if (typeText.includes('calculation')) {
                errorType = 'calculation-error';
              } else if (typeText.includes('interpretation')) {
                errorType = 'interpretation-error';
              } else if (typeText.includes('carelessness')) {
                errorType = 'carelessness';
              } else if (typeText.includes('concept')) {
                errorType = 'concept-error';
              }
            }
          }
          
          currentOptionFeedback[index] = {
            type: errorType,
            message: rowData.explanation || ''
          };
        });
        
        // Reset table data
        optionRowData = [];
        inTableSection = false;
        
        // Parse correct answer if this line contains it
        if (lower.includes('correct answer')) {
          const answerMatch = line.match(/\d+/);
          if (answerMatch) {
            correctAnswer = answerMatch[0];
          } else if (i + 1 < lines.length) {
            // Check next line for answer
            const nextLine = lines[i + 1];
            const nextMatch = nextLine.match(/^\d+$/);
            if (nextMatch) {
              correctAnswer = nextMatch[0];
              i++; // consume next line
            }
          }
        }
        
        // If this is a new question line, don't increment i as we need to process it
        if (lower.startsWith('question')) {
          i--; // Back up to process this question line
        }
      }
      
      i++;
    }
    
    // Save last question if we have collected option data
    if (currentQuestion.question_text && optionRowData.length > 0) {
      // Process remaining option data
      optionRowData.forEach((rowData, index) => {
        currentOptions.push(rowData.option);
        
        let errorType = 'concept-error';
        if (rowData.type) {
          const typeMatch = rowData.type.match(/^\d+\s*\(([^)]+)\)/);
          if (typeMatch) {
            const typeText = typeMatch[1].toLowerCase();
            if (typeText.includes('correct')) {
              errorType = 'correct';
            } else if (typeText.includes('calculation')) {
              errorType = 'calculation-error';
            } else if (typeText.includes('interpretation')) {
              errorType = 'interpretation-error';
            } else if (typeText.includes('carelessness')) {
              errorType = 'carelessness';
            } else if (typeText.includes('concept')) {
              errorType = 'concept-error';
            }
          }
        }
        
        currentOptionFeedback[index] = {
          type: errorType,
          message: rowData.explanation || ''
        };
      });
      
      const correctIndex = correctAnswer ? parseInt(correctAnswer) - 1 : 0;
      
      questions.push({
        question_text: currentQuestion.question_text!,
        options: [...currentOptions],
        correct_answer: Math.max(0, correctIndex).toString(),
        explanation: '',
        incorrect_type: 0,
        option_feedback: currentOptionFeedback
      });
    }
    // Or save if we already have processed options
    else if (currentQuestion.question_text && currentOptions.length > 0) {
      const correctIndex = correctAnswer ? parseInt(correctAnswer) - 1 : 0;
      
      questions.push({
        question_text: currentQuestion.question_text!,
        options: [...currentOptions],
        correct_answer: Math.max(0, correctIndex).toString(),
        explanation: '',
        incorrect_type: 0,
        option_feedback: currentOptionFeedback
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