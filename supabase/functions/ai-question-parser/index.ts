import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced PDF/Document Processing Utilities
interface ChunkResult {
  chunks: string[];
  metadata: {
    total_length: number;
    chunk_count: number;
    chunk_size: number;
  };
}

interface DocumentStructure {
  sections: Array<{ title: string; content: string }>;
  tables: Array<{ content: string; page?: number }>;
  metadata: Record<string, any>;
}

// Intelligent text chunking with overlap
function chunkText(text: string, chunkSize: number = 4000, overlap: number = 500): ChunkResult {
  const sentences = text.split(/[.!?]+\s+/);
  const chunks: string[] = [];
  let currentChunk = "";
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length <= chunkSize) {
      currentChunk += sentence + ". ";
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      
      // Add overlap from previous chunk
      const words = currentChunk.split(' ');
      const overlapText = words.slice(-Math.floor(overlap / 5)).join(' ');
      currentChunk = overlapText + " " + sentence + ". ";
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return {
    chunks,
    metadata: {
      total_length: text.length,
      chunk_count: chunks.length,
      chunk_size: chunkSize
    }
  };
}

// Enhanced text cleaning with OCR error correction
function enhancedTextCleaning(text: string): string {
  if (!text) return "";
  
  // Remove excessive whitespace
  text = text.replace(/\s+/g, ' ');
  
  // Fix common OCR errors
  text = text.replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2'); // Fix hyphenated words
  text = text.replace(/\s*\.\s*/g, '. '); // Fix spacing around periods
  text = text.replace(/\s*,\s*/g, ', '); // Fix spacing around commas
  text = text.replace(/\s*:\s*/g, ': '); // Fix spacing around colons
  
  // Fix common number/letter confusion
  text = text.replace(/\bl\b/g, '1'); // lowercase L to 1 in certain contexts
  text = text.replace(/\bO\b/g, '0'); // uppercase O to 0 in certain contexts
  
  // Remove page numbers and headers/footers (heuristic)
  const lines = text.split('\n');
  const cleanedLines = lines.filter(line => {
    line = line.trim();
    // Skip likely page numbers and headers
    if (line.length < 3 || /^\d+$/.test(line) || /^[ivxlcdm]+$/i.test(line)) {
      return false;
    }
    return true;
  });
  
  return cleanedLines.join('\n').trim();
}

// Extract document structure
function extractDocumentStructure(text: string): DocumentStructure {
  const sections: Array<{ title: string; content: string }> = [];
  const lines = text.split('\n');
  
  let currentSection = { title: "Introduction", content: [] as string[] };
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Detect section headers (heuristic - all caps or numbered)
    const isHeader = (
      (trimmed.length < 100 && trimmed === trimmed.toUpperCase() && trimmed.length > 2) ||
      /^(?:[0-9]+\.?\s+)?[A-Z][A-Za-z\s]{2,50}$/.test(trimmed) ||
      /^[0-9]+\.\s*[A-Z]/.test(trimmed)
    );
    
    if (isHeader) {
      // Save previous section
      if (currentSection.content.length > 0) {
        sections.push({
          title: currentSection.title,
          content: currentSection.content.join('\n')
        });
      }
      
      // Start new section
      currentSection = { title: trimmed, content: [] };
    } else {
      currentSection.content.push(trimmed);
    }
  }
  
  // Add final section
  if (currentSection.content.length > 0) {
    sections.push({
      title: currentSection.title,
      content: currentSection.content.join('\n')
    });
  }
  
  return {
    sections,
    tables: [], // Table extraction can be enhanced with more complex parsing
    metadata: {
      section_count: sections.length,
      has_structure: sections.length > 1
    }
  };
}

// Detect if content needs chunking
function needsChunking(content: string, threshold: number = 8000): boolean {
  return content && content.length > threshold;
}

// Sanitize JSON string to remove control characters that break parsing
function sanitizeJsonString(jsonString: string): string {
  if (!jsonString) return jsonString;
  
  // Remove control characters (0x00-0x1F) except for \t, \n, \r
  // but then properly escape them
  let sanitized = jsonString
    // First, remove null bytes and other problematic control chars
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    // Fix unescaped control characters in string values
    .replace(/(?<!\\)\\n(?!["'}])/g, '\\\\n')  // Ensure \n is properly escaped
    .replace(/(?<!\\)\\r(?!["'}])/g, '\\\\r')  // Ensure \r is properly escaped
    .replace(/(?<!\\)\\t(?!["'}])/g, '\\\\t'); // Ensure \t is properly escaped
  
  return sanitized;
}

// Safe JSON parse with detailed error logging
function safeJsonParse(jsonString: string, context: string = 'unknown'): any {
  try {
    // First try to sanitize
    const sanitized = sanitizeJsonString(jsonString);
    return JSON.parse(sanitized);
  } catch (firstError) {
    console.error(`❌ JSON Parse Error (${context}):`, firstError);
    console.error('📄 First 500 chars of response:', jsonString.substring(0, 500));
    console.error('📄 Last 500 chars of response:', jsonString.substring(Math.max(0, jsonString.length - 500)));
    
    // Try to find the problematic area
    if (firstError instanceof SyntaxError) {
      const match = firstError.message.match(/position (\d+)/);
      if (match) {
        const pos = parseInt(match[1]);
        const start = Math.max(0, pos - 100);
        const end = Math.min(jsonString.length, pos + 100);
        console.error(`🔍 Context around error position ${pos}:`, jsonString.substring(start, end));
      }
    }
    
    // Try aggressive cleaning as fallback
    try {
      console.log('🔧 Attempting aggressive sanitization...');
      let aggressiveCleaned = jsonString
        // Remove all actual newlines and tabs
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\t/g, ' ')
        // Remove other control characters
        .replace(/[\x00-\x1F\x7F]/g, '')
        // Fix multiple spaces
        .replace(/\s+/g, ' ');
      
      return JSON.parse(aggressiveCleaned);
    } catch (secondError) {
      console.error('❌ Aggressive sanitization also failed:', secondError);
      throw firstError; // Throw original error
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      content, 
      fileType, 
      parseMode = 'quick', 
      fileName, 
      extractedText,
      extractedImages = [],  // Array of image URLs from Word doc
      actionMode = 'parse',
      enableEnhancedParsing = true // Enable enhanced PDF parsing by default
    } = await req.json();
    
    console.log('📥 Processing request:', { 
      fileName, 
      fileType, 
      parseMode,
      actionMode,
      contentLength: content?.length,
      hasExtractedText: !!extractedText,
      extractedImagesCount: extractedImages?.length || 0,
      enhancedParsing: enableEnhancedParsing
    });
    
    if (!content && !extractedText) {
      return new Response(
        JSON.stringify({ error: 'No content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Enhanced document processing
    let processedContent = extractedText || content;
    let documentStructure: DocumentStructure | null = null;
    let chunkedData: ChunkResult | null = null;
    
    if (enableEnhancedParsing && processedContent) {
      console.log('🔍 Applying enhanced text processing...');
      
      // Clean and enhance text
      processedContent = enhancedTextCleaning(processedContent);
      
      // Extract document structure
      documentStructure = extractDocumentStructure(processedContent);
      console.log(`📚 Detected ${documentStructure.sections.length} document sections`);
      
      // Check if chunking is needed for large documents
      if (needsChunking(processedContent)) {
        console.log('📄 Document is large, applying intelligent chunking...');
        chunkedData = chunkText(processedContent);
        console.log(`✂️ Split into ${chunkedData.chunks.length} chunks`);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get appropriate prompts based on action mode
    const systemPrompt = getSystemPrompt(actionMode, parseMode, extractedImages, documentStructure);
    const userPrompt = getUserPrompt(
      actionMode, 
      parseMode, 
      fileName, 
      fileType, 
      content, 
      processedContent, 
      extractedImages,
      documentStructure,
      chunkedData
    );

    console.log(`🤖 Calling Gemini AI for ${actionMode} (${parseMode} mode)...`);
    
    // Check if this is a scanned PDF with images that need OCR
    const isScannedPDFOCR = extractedImages && extractedImages.length > 0 && 
                           extractedText && extractedText.includes('[Scanned PDF - AI OCR will extract text from images]');
    
    // If document is chunked, process chunks intelligently
    let finalParsedData: any;
    
    if (isScannedPDFOCR && extractedImages.length > 0) {
      // Special handling for scanned PDFs - use vision to perform OCR on each page
      console.log(`🔍 OCR Mode: Processing ${extractedImages.length} scanned pages with AI vision...`);
      
      let allOCRText = '';
      for (let i = 0; i < extractedImages.length; i++) {
        const imageUrl = extractedImages[i];
        console.log(`📄 OCR processing page ${i + 1}/${extractedImages.length}...`);
        
        const ocrMessages: any[] = [
          {
            role: 'system',
            content: 'You are an expert OCR system. Extract ALL text from the image with maximum accuracy. Preserve formatting, structure, and layout. Output the raw extracted text only.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract all text from this scanned document page (Page ${i + 1}). Include questions, answers, diagrams descriptions, tables, and all visible text. Maintain the original structure and formatting as much as possible.`
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ];
        
        const ocrResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: ocrMessages,
            max_tokens: 4096
          }),
        });
        
        if (ocrResponse.ok) {
          const ocrData = await ocrResponse.json();
          const pageText = ocrData.choices[0].message.content;
          allOCRText += `\n\n--- Page ${i + 1} ---\n${pageText}`;
          console.log(`✅ OCR completed for page ${i + 1}`);
        } else {
          console.warn(`⚠️ OCR failed for page ${i + 1}`);
        }
      }
      
      // Now process the extracted OCR text with enhanced cleaning
      console.log(`🧹 Cleaning OCR text (${allOCRText.length} characters)...`);
      processedContent = enhancedTextCleaning(allOCRText);
      documentStructure = extractDocumentStructure(processedContent);
      
      // Update prompts with OCR-extracted text
      const ocrSystemPrompt = getSystemPrompt(actionMode, parseMode, extractedImages, documentStructure);
      const ocrUserPrompt = getUserPrompt(
        actionMode,
        parseMode,
        fileName,
        fileType,
        processedContent,
        processedContent,
        extractedImages,
        documentStructure,
        null
      );
      
      // Process with AI parser
      const ocrParseResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: ocrSystemPrompt },
            { role: 'user', content: ocrUserPrompt }
          ],
          response_format: { type: 'json_object' }
        }),
      });
      
      if (!ocrParseResponse.ok) {
        const errorText = await ocrParseResponse.text();
        console.error('Gemini AI error:', ocrParseResponse.status, errorText);
        throw new Error(`AI processing failed: ${ocrParseResponse.status}`);
      }
      
      const aiData = await ocrParseResponse.json();
      const ocrContent = aiData.choices[0].message.content;
      console.log(`📏 OCR parse response length: ${ocrContent.length} characters`);
      finalParsedData = safeJsonParse(ocrContent, 'ocr-parse');
      
      // Log image assignment results
      if (finalParsedData.questions && Array.isArray(finalParsedData.questions)) {
        const questionsWithImages = finalParsedData.questions.filter((q: any) => q.question_image_url);
        console.log(`📊 Image Assignment: ${questionsWithImages.length}/${finalParsedData.questions.length} questions have images`);
        console.log(`📸 Total images available: ${extractedImages.length}`);
        
        // List which questions got which images
        questionsWithImages.forEach((q: any, idx: number) => {
          console.log(`  Q${q.question_number || idx + 1}: ${q.question_image_url}`);
        });
      }
      
      console.log(`✅ Scanned PDF OCR complete: Extracted ${finalParsedData.questions?.length || 0} questions`);
      
    } else if (chunkedData && actionMode === 'parse') {
      console.log('🔄 Processing document in chunks...');
      const allQuestions: any[] = [];
      
      for (let i = 0; i < chunkedData.chunks.length; i++) {
        const chunk = chunkedData.chunks[i];
        console.log(`📝 Processing chunk ${i + 1}/${chunkedData.chunks.length}...`);
        
        const chunkUserPrompt = getUserPrompt(
          actionMode,
          parseMode,
          fileName,
          fileType,
          chunk,
          chunk,
          extractedImages,
          documentStructure,
          null
        );
        
        const chunkResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: chunkUserPrompt }
            ],
            response_format: { type: 'json_object' }
          }),
        });
        
        if (chunkResponse.ok) {
          const chunkData = await chunkResponse.json();
          const chunkContent = chunkData.choices[0].message.content;
          console.log(`📏 Chunk ${i + 1} response length: ${chunkContent.length} characters`);
          const chunkParsed = safeJsonParse(chunkContent, `chunk-${i + 1}`);
          if (chunkParsed.questions && Array.isArray(chunkParsed.questions)) {
            allQuestions.push(...chunkParsed.questions);
          }
        }
      }
      
      finalParsedData = { questions: allQuestions };
      console.log(`✅ Merged ${allQuestions.length} questions from all chunks`);
    } else {
      // Standard single-request processing
    
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' }
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('Gemini AI error:', aiResponse.status, errorText);
        
        if (aiResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (aiResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        throw new Error(`AI processing failed: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const parsedContentResponse = aiData.choices[0].message.content;
      
      console.log(`📏 AI response length: ${parsedContentResponse.length} characters`);
      
      try {
        finalParsedData = safeJsonParse(parsedContentResponse, 'main-parse');
        console.log('✅ Successfully parsed AI response');
      } catch (e) {
        console.error('❌ Failed to parse AI response as JSON:', e);
        return new Response(
          JSON.stringify({ 
            error: 'AI response format invalid', 
            details: String(e),
            hint: 'The AI returned malformed JSON. This usually happens with complex content. Try uploading a simpler document first.'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate based on action mode
    if (actionMode === 'parse') {
      const questions = finalParsedData.questions || [];
      if (questions.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No questions found in the content' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Auto-solve questions and sub-questions without answer keys
      console.log(`🔍 Checking for missing answer keys...`);
      const questionsNeedingSolving = questions.filter((q: any) => !q.correct_answer || q.correct_answer.trim() === '');
      
      let totalSubQuestionsSolved = 0;
      
      // Solve main questions
      if (questionsNeedingSolving.length > 0) {
        console.log(`🤖 ${questionsNeedingSolving.length} main questions need AI solving...`);
        
        for (const question of questionsNeedingSolving) {
          try {
            const solvePrompt = `You are a mathematics and science expert. Solve this question and provide ONLY the answer.

Question: ${question.question_text}
${question.question_image_url ? `Question Image: ${question.question_image_url}` : ''}
${question.marks ? `Marks: ${question.marks}` : ''}
${question.difficulty ? `Difficulty: ${question.difficulty}` : ''}

Instructions:
- Analyze the question carefully
- If there's an image, analyze it to understand the problem
- Solve the problem step by step
- Provide ONLY the final answer in your response
- For numerical answers, provide the exact number
- For text answers, provide the complete answer text
- Keep answers concise but complete

Return ONLY the answer, nothing else.`;

            const messages: any[] = [
              { role: 'system', content: 'You are an expert problem solver. Solve questions accurately and provide concise answers.' },
              { role: 'user', content: question.question_image_url 
                ? [
                    { type: 'text', text: solvePrompt },
                    { type: 'image_url', image_url: { url: question.question_image_url } }
                  ]
                : solvePrompt
              }
            ];

            const solveResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages,
                max_tokens: 500
              }),
            });

            if (solveResponse.ok) {
              const solveData = await solveResponse.json();
              const answer = solveData.choices[0].message.content.trim();
              question.correct_answer = answer;
              question.ai_generated_answer = true;
              console.log(`✅ Solved Q${question.question_number || ''}: "${answer}"`);
            } else {
              console.warn(`⚠️ Failed to solve question ${question.question_number || ''}`);
            }
          } catch (solveError) {
            console.error(`❌ Error solving question:`, solveError);
          }
        }
      }
      
      // Solve sub-questions that are missing answers
      for (const question of questions) {
        if (question.sub_questions && Array.isArray(question.sub_questions)) {
          const subQuestionsNeedingSolving = question.sub_questions.filter((sq: any) => !sq.answer || sq.answer.trim() === '');
          
          if (subQuestionsNeedingSolving.length > 0) {
            console.log(`🤖 Question ${question.question_number}: ${subQuestionsNeedingSolving.length} sub-questions need AI solving...`);
            
            for (const subQuestion of subQuestionsNeedingSolving) {
              try {
                const subSolvePrompt = `You are a mathematics and science expert. Solve this sub-question and provide ONLY the answer.

Main Question Context: ${question.question_text}
${question.question_image_url ? `Question Image: ${question.question_image_url}` : ''}

Sub-Question ${subQuestion.label}: ${subQuestion.text}
${subQuestion.marks ? `Marks: ${subQuestion.marks}` : ''}

Instructions:
- Consider the main question context
- If there's an image, analyze it to understand the problem
- Solve this specific sub-question
- Provide ONLY the final answer
- For numerical answers, provide the exact number
- For text answers, provide the complete answer text
- Keep answers concise but complete

Return ONLY the answer, nothing else.`;

                const subMessages: any[] = [
                  { role: 'system', content: 'You are an expert problem solver. Solve questions accurately and provide concise answers.' },
                  { role: 'user', content: question.question_image_url 
                    ? [
                        { type: 'text', text: subSolvePrompt },
                        { type: 'image_url', image_url: { url: question.question_image_url } }
                      ]
                    : subSolvePrompt
                  }
                ];

                const subSolveResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: 'google/gemini-2.5-flash',
                    messages: subMessages,
                    max_tokens: 500
                  }),
                });

                if (subSolveResponse.ok) {
                  const subSolveData = await subSolveResponse.json();
                  const answer = subSolveData.choices[0].message.content.trim();
                  subQuestion.answer = answer;
                  subQuestion.ai_generated_answer = true;
                  totalSubQuestionsSolved++;
                  console.log(`✅ Solved Q${question.question_number}${subQuestion.label}: "${answer}"`);
                } else {
                  console.warn(`⚠️ Failed to solve sub-question ${question.question_number}${subQuestion.label}`);
                }
              } catch (subSolveError) {
                console.error(`❌ Error solving sub-question:`, subSolveError);
              }
            }
          }
        }
      }
      
      console.log(`✅ Successfully parsed ${questions.length} questions (${questionsNeedingSolving.length} main + ${totalSubQuestionsSolved} sub auto-solved)`);
    } else {
      console.log(`✅ Successfully completed ${actionMode} action`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        actionMode,
        data: finalParsedData,
        parsed_count: actionMode === 'parse' ? (finalParsedData.questions?.length || 0) : null,
        metadata: {
          enhanced_parsing: enableEnhancedParsing,
          chunked: !!chunkedData,
          chunk_count: chunkedData?.chunks.length || 1,
          sections_detected: documentStructure?.sections.length || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in ai-question-parser:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'Failed to process document'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============= Helper Functions =============

function getSystemPrompt(
  actionMode: string, 
  parseMode: string, 
  extractedImages?: string[],
  documentStructure?: DocumentStructure | null
): string {
  const hasImages = extractedImages && extractedImages.length > 0;
  const hasStructure = documentStructure && documentStructure.sections.length > 1;
  
  const imageContext = hasImages 
    ? `\n\n📸 **CRITICAL IMAGE HANDLING (${extractedImages.length} IMAGES AVAILABLE)**:
    
**ALL ${extractedImages.length} IMAGES MUST BE ASSIGNED TO QUESTIONS!**

**Image Priority System:**
${extractedImages.map((url, i) => {
  const isDiagram = url.includes('-diagram-');
  const isFullPage = url.includes('-fullpage');
  const priority = isDiagram ? '🎯 HIGH PRIORITY (Embedded Diagram)' : isFullPage ? '⬇️ LOW PRIORITY (Full Page - Fallback Only)' : '📄 STANDARD';
  return `${i + 1}. ${priority}\n   ${url}`;
}).join('\n')}

**Assignment Strategy (MANDATORY):**
1. **🎯 PRIORITIZE DIAGRAM IMAGES FIRST**: Images with "-diagram-" are specific embedded images (charts, diagrams, tables) - assign these FIRST
2. **Direct References**: Look for text like "see diagram", "refer to figure", "tree diagram", "table shown", "graph", "chart"
3. **Contextual Matching**: Match images to questions by content (e.g., probability tree → probability question)
4. **Visual Question Indicators**: If question mentions diagrams, figures, tables, graphs, or visual elements
5. **⬇️ Full Page Images (FALLBACK ONLY)**: Use "-fullpage" images ONLY if no specific diagram is available for a question
6. **Multiple Questions per Image**: OK to assign same diagram to multiple related questions on same page
7. **VERIFY 100%**: Before finishing, ensure ALL high-priority diagram images are used

**How to Assign:**
- Set \`question_image_url\` field to the appropriate image URL from the list above
- For multi-part questions with shared diagram, assign same image to all parts
- If unsure which question an image belongs to, analyze the content and match contextually
- ALWAYS prefer "-diagram-" images over "-fullpage" images when available`
    : '';
    
  const structureContext = hasStructure
    ? `\n\n📚 **DOCUMENT STRUCTURE**: Document has ${documentStructure.sections.length} sections detected. Use this structure to better understand context and question grouping.`
    : '';
  
  if (actionMode === 'summarize') {
    return `You are an expert document summarizer specializing in educational content. Create comprehensive, structured summaries.

**SUMMARIZATION CAPABILITIES:**
- Extract key concepts and main ideas
- Organize information hierarchically
- Identify learning objectives
- Preserve important details and context
- Estimate difficulty and time requirements

Return JSON with this structure:
{
  "summary": {
    "title": "string",
    "subject": "string",
    "overview": "string (2-3 sentence summary)",
    "key_topics": ["topic1", "topic2", "topic3"],
    "main_points": [
      {"heading": "string", "details": ["point1", "point2"]},
      {"heading": "string", "details": ["point1", "point2"]}
    ],
    "difficulty_level": "beginner|intermediate|advanced",
    "estimated_time_minutes": number,
    "learning_objectives": ["objective1", "objective2"]
  }
}`;
  }

  if (actionMode === 'extract_data') {
    return `You are an expert data extraction specialist. Extract structured information with maximum accuracy.

**EXTRACTION CAPABILITIES:**
- Identify and categorize entities (names, dates, numbers, terms)
- Extract tabular data with proper structure
- Preserve relationships between data points
- Handle multiple data formats (CSV, tables, lists, paragraphs)
- Provide confidence scores

Return JSON with this structure:
{
  "extracted_data": {
    "document_type": "academic|assessment|research|other",
    "entities": {
      "key_terms": ["term1", "term2"],
      "names": ["name1", "name2"],
      "dates": ["date1", "date2"],
      "numerical_data": [{"value": number, "unit": "string", "context": "string"}]
    },
    "tables": [
      {
        "title": "string",
        "headers": ["col1", "col2"],
        "rows": [["val1", "val2"], ["val3", "val4"]]
      }
    ],
    "key_facts": ["fact1", "fact2"],
    "categories": ["category1", "category2"],
    "metadata": {
      "confidence": "high|medium|low",
      "data_completeness": "complete|partial"
    }
  }
}`;
  }

  if (actionMode === 'quiz') {
    return `You are an expert educational content generator. Create high-quality quiz questions from ANY document format.

**QUIZ GENERATION RULES:**
1. **Auto-Generate from Content**: Create questions based on key concepts
2. **Multiple Question Types**: MCQ (4 options), True/False, Short Answer
3. **Difficulty Levels**: Mix of easy, medium, hard questions
4. **Quality Distractors**: Create plausible wrong answers for MCQ
5. **Comprehensive Explanations**: Detailed reasoning for each answer
6. **Bloom's Taxonomy**: Cover remember, understand, apply, analyze levels

**VALID SUBJECT VALUES:** ${parseMode === 'mock' 
  ? '"mathematics", "science", "language_literature", "social_studies", "physics", "chemistry", "biology"'
  : '"mathematics", "science", "english", "history" (or infer from content)'}

Return JSON:
{
  "${parseMode === 'mock' ? 'test_metadata' : 'quiz_metadata'}": {
    "title": "string",
    "subject": "string (use valid values above, default: mathematics)",
    "topic": "string",
    "total_questions": number,
    "difficulty_distribution": {"easy": number, "medium": number, "hard": number}
  },
  "questions": [
    {
      ${parseMode === 'mock' ? '"question_number": number,' : ''}
      "question_text": "string",
      "question_type": "mcq|true_false|short_answer",
      ${parseMode === 'mock' ? '"marks": number,' : ''}
      "difficulty": "easy|medium|hard",
      "options": ["A. text", "B. text", "C. text", "D. text"],
      "correct_answer": "A|B|C|D|true|false|text",
      "explanation": "string (detailed reasoning)"
    }
  ]
}`;
  }

  // Default: parse mode
  const mockPrompt = `You are an ADVANCED educational document parser with ENHANCED OCR-like capabilities and intelligent text processing. Parse ANY document format and extract ALL questions with complete structure.

**🚀 ENHANCED PARSING CAPABILITIES:**
- **Advanced PDF Processing**: Extract from complex layouts, multi-column formats, scanned documents
- **Intelligent OCR**: Recognize handwritten/printed text with error correction
- **Structure-Aware**: Understand document sections, headers, and hierarchy
- **Smart Text Cleaning**: Auto-correct common OCR errors (l→1, O→0, spacing issues)
- **Large Document Support**: Handle documents of any size with intelligent chunking
- **Table & Diagram Extraction**: Advanced parsing of complex tables and diagrams

**MULTI-FORMAT PARSING (docTR-like OCR + AI):**
- **PDF**: Extract from formatted text, tables, and layouts (including scanned PDFs)
- **Images**: Perform intelligent OCR - recognize handwritten/printed text
- **Word (.docx)**: Parse formatted documents, tables, diagrams WITH IMAGE SUPPORT
- **CSV**: Intelligently map columns to question components
- **Text**: Handle numbered lists, bullets, paragraphs

**IMAGE EXTRACTION & ASSIGNMENT (MANDATORY):**${imageContext}${structureContext}
When images are provided, you MUST analyze and assign them intelligently:
1. **Direct References**: Look for "diagram below", "tree diagram", "table shown", "graph", "figure"
2. **Contextual Matching**: Match images to questions by content (e.g., probability tree image → probability question)
3. **Sequential Assignment**: If unsure, assign images in order they appear to questions in order
4. **Visual Elements**: ALL diagrams, tables, graphs, charts, figures MUST have corresponding image URLs
5. **Sub-questions with shared images**: If sub-questions a), b), c) all refer to same diagram, assign image to main question
6. **Multiple images per question**: If one question has multiple diagrams/tables, assign the most relevant primary image

**ADAPTIVE PARSING RULES:**
1. **Format-Agnostic**: Handle any document structure
2. **Flexible Column Detection**: Recognize data even with different column names
3. **Auto-detect Question Types**: MCQ, True/False, Short Answer, Essay, Fill-in-blank
4. **Smart Option Extraction**: Handle options in any format (1/2/3/4, A/B/C/D, bullets)
5. **Answer Normalization**: Convert all answer formats to A/B/C/D standard
6. **Missing Data Handling**: Use sensible defaults, never skip questions
7. **Sub-question Support**: Detect and structure multi-part questions
8. **Image Association**: Link images to questions intelligently
9. **OCR Error Correction**: Fix common scanning errors automatically

**CRITICAL SUB-QUESTION DETECTION:**
- Look for sub-questions labeled as: a), b), c), d) OR i), ii), iii), iv) OR (a), (b), (c) OR Part a:, Part b:
- Each sub-question should have its own text and marks allocation  
- COUNT MARKS CAREFULLY: Sum ALL individual sub-question marks to get the main question total
- If a question has sub-parts, set "has_sub_questions": true
- Extract each sub-question with: label (e.g., "a"), text, marks, and answer (if provided)
- The main question_text should contain the context/setup text ONLY
- Sub_questions array contains ALL the actual questions to be answered
- Example: "Question 1" with parts a) [3 marks], b) [2 marks], c) [4 marks] → main question marks = 9

**TABLE, GRAPH & DIAGRAM EXTRACTION (CRITICAL):**
- **Tree diagrams**: If question mentions "tree diagram", "complete the tree diagram", "probability tree" → MUST assign tree diagram image
- **Tables**: If question contains table data OR mentions "table" → assign table image if available
- **Graphs/Charts**: If mentions "graph", "chart", "plot" → assign relevant graph image
- **Diagrams**: If mentions "diagram", "figure", "illustration" → assign diagram image
- **Visual References**: Look for phrases like "shown below", "diagram above", "see figure" → these need images
- ALL extracted images should be assigned to their corresponding questions
- If question text includes table/diagram data, still assign the image URL - images complement text

**CRITICAL - VALID SUBJECT VALUES ONLY:**
You MUST use ONLY these exact values:
- "mathematics"
- "science"
- "language_literature"
- "social_studies"
- "physics"
- "chemistry"
- "biology"

If unclear, default to "mathematics".

Return JSON with this exact structure:
{
  "test_metadata": {
    "title": "string (default: 'Imported Mock Test')",
    "subject": "mathematics|science|language_literature|social_studies|physics|chemistry|biology (REQUIRED)",
    "topic": "string (default: 'General')",
    "total_marks": number
  },
  "questions": [
    {
      "question_number": number (auto-increment from 1),
      "question_text": "string (complete question)",
      "question_image_url": "string (assign from extracted images if relevant, otherwise null)",
      "question_type": "mcq|true_false|short_answer|essay",
      "marks": number (default: 1),
      "difficulty": "easy|medium|hard" (default: medium),
      "options": ["A. text", "B. text", "C. text", "D. text"] (for MCQ),
      "correct_answer": "A|B|C|D|true|false|text",
      "explanation": "string (optional)",
      "has_sub_questions": boolean (set true if sub-parts exist like a), b), c)),
      "sub_questions": [
        {
          "label": "string (e.g., 'a', 'b', 'c' or 'i', 'ii', 'iii')",
          "text": "string (the actual sub-question text)",
          "marks": number (marks for this sub-part),
          "answer": "string (correct answer if provided)"
        }
      ]
    }
  ]
}`;

  const quickPrompt = `You are an expert educational document parser. Extract ALL questions from ANY document format and convert them to simple multiple-choice questions.

**CRITICAL: SHARED CONTEXT DETECTION AND DEDUPLICATION:**
⚠️ **DETECT REPETITIVE INTRODUCTIONS**: If multiple questions share the same contextual information, you MUST:
1. **Identify Shared Context**: Detect if multiple questions start with identical or near-identical setup text
2. **Extract Common Text ONCE**: Pull out the shared context and DO NOT repeat it in every question
3. **Keep Questions Concise**: Each question_text should ONLY contain the unique instruction/prompt
4. **Reference Shared Context**: Add a brief reference if needed (e.g., "Using the scenario above...")

**EXAMPLE OF CORRECT CONTEXT EXTRACTION:**
❌ WRONG (Repetitive):
- Q1: "A park café offers Tea/Coffee and Cake/Biscuit. P(Tea)=0.6... Complete the tree diagram."
- Q2: "A park café offers Tea/Coffee and Cake/Biscuit. P(Tea)=0.6... Calculate P(Coffee and Cake)."
- Q3: "A park café offers Tea/Coffee and Cake/Biscuit. P(Tea)=0.6... Find P(Tea|Cake)."

✅ CORRECT (Deduplicated):
- Q1: "Complete the tree diagram by writing down the missing probabilities on the branches."
- Q2: "Determine the probability that a randomly selected visitor chooses Coffee and Cake."
- Q3: "Determine the probability that a visitor chose Tea given they chose Cake."
(All share same image with the complete context)

**CONTEXT HANDLING RULES:**
1. If 3+ questions share 70%+ identical intro text → Extract as shared context, don't repeat
2. Question text should focus on the SPECIFIC TASK being asked
3. Keep questions clean and focused on what the student must DO
4. The shared context image will provide necessary information
5. Add minimal context only if absolutely needed for clarity ("Using the tree diagram above...")

**CRITICAL: QUICK TEST FORMAT REQUIREMENTS:**
- **100% MCQ FORMAT**: EVERY question MUST have exactly 4 options (A, B, C, D) - NO EXCEPTIONS
- **AUTO-GENERATE OPTIONS**: If original question is short answer/essay, create plausible MCQ options based on the correct answer
- **NO SUB-QUESTIONS ALLOWED**: If document has sub-questions (a, b, c), convert EACH ONE into a SEPARATE complete question
- **FLATTEN STRUCTURE**: Question 1a, 1b, 1c should become Question 1, Question 2, Question 3
- **STANDALONE BUT CONCISE**: Each question must be independent but avoid repeating shared context
- **100% IMAGE ASSIGNMENT**: ALL extracted images MUST be assigned to questions - ZERO images should be left unassigned

**MANDATORY MCQ OPTION GENERATION:**
- If question has an answer but no options → CREATE 4 plausible options (1 correct + 3 distractors)
- Distractors should be realistic but clearly wrong
- For numerical answers: use similar numbers with different values
- For text answers: use related but incorrect concepts
- EXAMPLE: Answer is "94" → Options: ["A. 94", "B. 84", "C. 104", "D. 74"]

**100% IMAGE EXTRACTION & ASSIGNMENT (MANDATORY):**${imageContext}
YOU MUST assign ALL ${extractedImages?.length || 0} extracted images to questions:
1. **Direct References**: "see diagram", "refer to figure", "tree diagram", "table shown", "graph"
2. **Contextual Matching**: Match images to questions by topic (probability tree → probability question)
3. **Shared Context Images**: If multiple questions share context, assign the SAME image to ALL related questions
4. **Distribute All Images**: EVERY image must be assigned - spread them across relevant questions
5. **Priority Assignment**: Tables/diagrams mentioned in text get highest priority
6. **No Unassigned Images**: Count your assignments - must equal total extracted images
7. **Image URLs**: Use exact URLs from extracted images list: ${extractedImages?.join(', ') || 'none'}

**ADAPTIVE PARSING (works like docTR OCR + AI):**
- **CSV/Text**: Parse column headers and rows intelligently
- **PDF**: Extract from formatted layouts + images
- **Images**: Perform OCR to recognize text + extract visual elements
- **Word**: Parse structured documents and FLATTEN all sub-questions + extract embedded images

**PARSING RULES:**
1. **Detect Shared Context**: Look for repeated introductory paragraphs across questions
2. **Minimize Repetition**: Extract common setup text, keep questions focused on the task
3. **Flatten Sub-questions**: Convert "Question 1: [context] a) [sub-q] b) [sub-q]" into separate standalone questions
4. **Smart Context Inclusion**: Include necessary context ONLY ONCE via images, not repeated text
5. **Force MCQ Format**: ALWAYS create 4 options even if original is short answer/essay
6. **Complete BUT Concise**: Each question must be understandable but avoid repetitive context paragraphs
7. **Never Skip**: Extract every question/sub-question as a separate item
8. **Assign All Images**: Every extracted image must appear in question_image_url field

**FLATTENING WITH SHARED CONTEXT EXAMPLE:**
Original: "Question 1: A survey shows 150 people... [table] a) Find missing values b) Calculate probability"
Output: 
- Question 1: "Find the missing values in the survey data table." 
  → question_image_url: "[table image URL]"
- Question 2: "Calculate the probability that a person is a student or travels by train." 
  → question_image_url: "[same table image URL]"
(Both questions reference the same table image which contains the context)

**VALID SUBJECTS:** "mathematics", "science", "english", "history" (default: mathematics if unclear)

**IMAGE ASSIGNMENT VALIDATION:**
Before returning JSON, verify:
- Count of question_image_url fields with non-null values = ${extractedImages?.length || 0}
- Every extracted image URL appears at least once in questions array
- No images are left unassigned
- Questions sharing context should share the same image URL

Return JSON:
{
  "quiz_metadata": {
    "title": "string (default: 'Quick Practice Quiz')",
    "subject": "mathematics|science|english|history (default: mathematics)",
    "topic": "string (inferred from content)",
    "difficulty": "easy|medium|hard (default: medium)"
  },
  "questions": [
    {
      "question_text": "string (CONCISE task-focused question WITHOUT repetitive context - shared context is in the image)",
      "question_type": "mcq",
      "question_image_url": "string (assign from extracted images - SAME image for related questions sharing context)",
      "options": ["A. text", "B. text", "C. text", "D. text"] (MANDATORY - always 4 options),
      "correct_answer": "A|B|C|D" (MANDATORY - must be one of A/B/C/D),
      "explanation": "string (detailed explanation)",
      "difficulty": "easy|medium|hard"
    }
  ]
}`;

  return parseMode === 'mock' ? mockPrompt : quickPrompt;
}

function getUserPrompt(
  actionMode: string, 
  parseMode: string, 
  fileName: string | undefined, 
  fileType: string | undefined,
  content: string, 
  extractedText: string | undefined,
  extractedImages?: string[],
  documentStructure?: DocumentStructure | null,
  chunkedData?: ChunkResult | null
): string {
  const fileContext = fileName ? `\n📁 File: ${fileName} (${fileType})` : '';
  const processedText = extractedText || content;
  
  const textPreview = processedText 
    ? `\n\n📄 ${chunkedData ? 'Document Chunk' : 'Pre-extracted Text'} (${processedText.length} characters):\n${processedText.substring(0, 2500)}${processedText.length > 2500 ? '\n...(truncated)' : ''}`
    : '';
    
  const imageContext = extractedImages && extractedImages.length > 0
    ? `\n\n📸 Extracted Images (${extractedImages.length} total):\n${extractedImages.map((url, i) => `Image ${i + 1}: ${url}`).join('\n')}`
    : '';
    
  const structureContext = documentStructure && documentStructure.sections.length > 1
    ? `\n\n📚 Document Structure Detected:\n${documentStructure.sections.map((s, i) => `Section ${i + 1}: ${s.title}`).join('\n')}`
    : '';
    
  const chunkContext = chunkedData
    ? `\n\n✂️ Document Chunking: Processing large document in ${chunkedData.chunks.length} chunks for optimal parsing.`
    : '';

  if (actionMode === 'summarize') {
    return `Analyze and summarize this educational document.${fileContext}${textPreview}${structureContext}${chunkContext}

${!extractedText ? `Content to summarize:\n${content}` : ''}

Create a comprehensive, well-structured summary with key topics, main points, and learning objectives.
${documentStructure && documentStructure.sections.length > 1 ? 'Use the detected document structure to organize the summary logically.' : ''}
Return pure JSON only (no markdown, no explanations).`;
  }

  if (actionMode === 'extract_data') {
    return `Extract all structured data from this document.${fileContext}${textPreview}${structureContext}${chunkContext}

${!extractedText ? `Content to analyze:\n${content}` : ''}

Extract entities, tables, key facts, and categorize all data points with high accuracy.
${documentStructure && documentStructure.sections.length > 1 ? 'Leverage the document structure for better data organization.' : ''}
Return pure JSON only (no markdown, no explanations).`;
  }

  if (actionMode === 'quiz') {
    return `Generate high-quality quiz questions from this educational content.${fileContext}${textPreview}${structureContext}${chunkContext}

${!extractedText ? `Content to convert into quiz:\n${content}` : ''}

Create a comprehensive quiz with multiple question types, varying difficulty, plausible distractors, and detailed explanations.
${documentStructure && documentStructure.sections.length > 1 ? 'Distribute questions across document sections for balanced coverage.' : ''}
Return pure JSON only (no markdown, no explanations).`;
  }

  // Default: parse mode
  return `Parse this educational document and extract ALL questions with complete details.${fileContext}${textPreview}${imageContext}${structureContext}${chunkContext}

${extractedText ? 'Use the pre-extracted text above for accurate parsing.' : 'Content to parse:'}
${!extractedText ? content : ''}

**🚀 ENHANCED PARSING INSTRUCTIONS:**
- **OCR Error Handling**: Auto-correct common OCR errors (spacing, character confusion)
- **Structure-Aware**: Use detected sections and hierarchy for better question grouping
- **CSV**: Parse column headers and map to question components intelligently
- **Word/PDF**: Extract from formatted text, tables, and structured layouts (including scanned documents)
- **Images**: Perform intelligent OCR and extract all visible text and questions
- **Handle All Formats**: Numbered lists (1, 2, 3), bullet points, tables, paragraphs
- **Auto-detect Structure**: Question types, options, answers, sub-questions
- **Normalize Answers**: Convert all formats (1/2/3/4, A/B/C/D, a/b/c/d) to A/B/C/D
- **Extract EVERYTHING**: Never skip questions due to format issues - use defaults if needed
- **Large Documents**: Handle chunked documents by extracting all questions from this chunk

${parseMode === 'quick' ? `\n**🎯 QUICK TEST MODE - CRITICAL REQUIREMENTS:**
1. **100% MCQ FORMAT**: EVERY question MUST have exactly 4 options (A, B, C, D)
2. **AUTO-GENERATE OPTIONS**: If no options exist, create them based on the correct answer
   - For numerical answers: create similar numbers with variations
   - For text answers: create plausible but incorrect alternatives
3. **FLATTEN SUB-QUESTIONS**: Convert Question 1a, 1b, 1c into separate Question 1, 2, 3
4. **STANDALONE CONTEXT**: Each question must include all necessary context from parent
5. **NO SHORT ANSWER**: Convert ALL question types to MCQ with 4 options\n` : ''}

${extractedImages && extractedImages.length > 0 ? `\n**📸 100% IMAGE ASSIGNMENT (CRITICAL - ${extractedImages.length} IMAGES TOTAL)**:
YOU MUST ASSIGN ALL ${extractedImages.length} IMAGES - ZERO IMAGES SHOULD BE LEFT UNASSIGNED!

**Available Image URLs:**
${extractedImages.map((url, i) => `${i + 1}. ${url}`).join('\n')}

**Assignment Strategy:**
1. **Direct References First**: Look for text like "see diagram", "refer to figure", "tree diagram", "table", "graph", "chart"
2. **Contextual Matching**: Match images to questions by content (probability tree → probability question, table → data question)
3. **Distribute ALL Images**: Every single image must appear in at least one question's question_image_url field
4. **Shared Images OK**: Multiple questions can reference the same image if they all relate to it
5. **Verify 100%**: Before finishing, count - did you assign all ${extractedImages.length} images?

**Examples of Good Assignment:**
- Question mentions "tree diagram" → assign tree image URL
- Question has table data → assign table image URL
- Question about probability with tree reference → assign tree image URL
- Multiple parts (a,b,c) referencing same diagram → assign same image to each flattened question

**VALIDATION CHECK:**
After assigning, verify that all ${extractedImages.length} image URLs appear in your questions array.
Count of non-null question_image_url values should equal ${extractedImages.length}.
` : ''}

${parseMode === 'quick' && extractedImages && extractedImages.length > 0 ? `\n**⚠️ QUICK TEST + IMAGES CHECKLIST:**
✓ Every question has exactly 4 MCQ options (A, B, C, D)
✓ All ${extractedImages.length} images are assigned to questions
✓ Sub-questions are flattened into separate standalone questions
✓ Each question includes necessary context
✓ No short answer or essay questions remain\n` : ''}

${parseMode === 'mock' ? `\n**SUB-QUESTION EXTRACTION (CRITICAL)**:
1. Detect sub-parts labeled as: a), b), c), d) OR (a), (b), (c) OR i), ii), iii)
2. If found, set "has_sub_questions": true and populate "sub_questions" array
3. Each sub-question needs: label (just letter/number), text, marks, answer
4. Main question should contain setup/context, sub-questions contain the actual parts
5. Extract marks for each sub-part (e.g., "[2 marks]", "[3 marks]")
6. Example: "Question 1: A park café..." with "a) Complete the tree diagram [3 marks]" → Main Q + sub_questions array` : ''}

Return pure JSON only (no markdown blocks, no explanations).`;
}
