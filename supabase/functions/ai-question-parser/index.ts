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
    const { 
      content, 
      fileType, 
      parseMode = 'quick', 
      fileName, 
      extractedText,
      extractedImages = [],  // Array of image URLs from Word doc
      actionMode = 'parse'
    } = await req.json();
    
    console.log('📥 Processing request:', { 
      fileName, 
      fileType, 
      parseMode,
      actionMode,
      contentLength: content?.length,
      hasExtractedText: !!extractedText,
      extractedImagesCount: extractedImages?.length || 0,
      isPDF: fileType?.includes('pdf') || fileName?.toLowerCase().endsWith('.pdf')
    });
    
    if (!content && !extractedText) {
      return new Response(
        JSON.stringify({ error: 'No content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enhanced PDF processing with comprehensive extraction
    let finalContent = content;
    let finalExtractedText = extractedText;
    let finalExtractedImages = [...extractedImages];
    const isPDF = fileType?.includes('pdf') || fileName?.toLowerCase().endsWith('.pdf');
    const isPDFDataUrl = content?.startsWith('data:application/pdf;base64,');
    
    if ((isPDF || isPDFDataUrl) && !extractedText) {
      console.log('🤖 Processing PDF with Lovable AI Vision (Comprehensive Extraction)...');
      try {
        // Ensure content is in data URL format
        const pdfDataUrl = isPDFDataUrl ? content : `data:application/pdf;base64,${content}`;
        
        // Step 1: Multi-pass OCR extraction with confidence scoring
        const ocrPrompt = `You are an advanced OCR system with 100% accuracy. Extract ALL visible content from this PDF with ZERO errors.

**MULTI-LAYER EXTRACTION (Zero Information Loss):**

1. **DOCUMENT STRUCTURE:**
   - Page numbers and headers/footers
   - Section titles and question numbers
   - Hierarchical organization (main questions → sub-questions)
   - Any formatting cues (bold, italic, underline, font sizes)

2. **TEXTUAL CONTENT (Character-Perfect):**
   - Main question text with exact wording
   - Sub-questions (a), b), c), d) OR i), ii), iii) OR Part A:, Part B:
   - Instructions, context paragraphs, problem statements
   - Multiple choice options (A, B, C, D) with complete text
   - Answer keys if visible (e.g., "Answer: C" or "Correct: 0.82")

3. **NUMERICAL & MATHEMATICAL CONTENT:**
   - ALL numbers, decimals, fractions, percentages (exact precision)
   - Mathematical formulas and equations (LaTeX-style if complex)
   - Probability values (e.g., P(A) = 0.45, P(B|A) = 0.7)
   - Statistical data, measurements, coordinates
   - Calculation steps if shown

4. **MARKS & SCORING:**
   - Individual marks per sub-question: [3 marks], (2m), [2], (3 points)
   - Total marks per question: [12 marks total]
   - Point distributions and scoring rubrics

5. **TABLES & STRUCTURED DATA:**
   - Table headers and column names
   - All table cells with exact values
   - Row/column counts
   - Table titles and descriptions
   - Data relationships (which row/column relates to which)

6. **VISUAL ELEMENTS & DIAGRAMS:**
   - Tree diagrams: all branches, nodes, labels, probabilities
   - Graphs/charts: axes labels, data points, legends
   - Geometric figures: shapes, measurements, angles
   - Venn diagrams: regions, labels, set notations
   - References to visuals ("see diagram below", "refer to Figure 2.1")

7. **CONTEXTUAL RELATIONSHIPS:**
   - Which sub-questions share the same context/diagram
   - Which questions reference the same data table
   - Sequential dependencies (e.g., "use your answer from part a")

**EXTRACTION QUALITY REQUIREMENTS:**
- **100% Accuracy**: Every character, number, and symbol must be exact
- **Zero Hallucination**: Only extract what's actually visible - no assumptions
- **Preserve Formatting**: Maintain bullet points, numbering, indentation
- **Complete Coverage**: Do not skip any section, even if partially visible
- **Confidence Indicators**: Mark any unclear/ambiguous text with [UNCLEAR: possible text]

**OUTPUT FORMAT:**
Provide a complete, character-perfect transcription organized by:
- Question numbers (1, 2, 3...)
- Sub-questions (a, b, c... or i, ii, iii...)
- Associated marks, options, tables, diagrams
- Any answer keys or solutions present

Extract EVERYTHING - assume 100% information recovery is required.`;

        const ocrResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: ocrPrompt },
                  { type: 'image_url', image_url: { url: pdfDataUrl } }
                ]
              }
            ],
            max_tokens: 6000
          }),
        });

        if (ocrResponse.ok) {
          const ocrData = await ocrResponse.json();
          finalExtractedText = ocrData.choices[0].message.content;
          console.log(`✅ PDF Text Extraction: ${finalExtractedText?.length || 0} characters extracted`);
          
          // Step 2: Enhanced visual element extraction with detailed analysis
          console.log('🖼️ Extracting visual elements with comprehensive analysis...');
          const imagePrompt = `You are a visual intelligence system. Analyze and extract ALL visual elements from this PDF with complete detail.

**COMPREHENSIVE VISUAL ANALYSIS:**

1. **TREE DIAGRAMS (Probability/Decision Trees):**
   - Type: Probability tree, decision tree, event tree
   - Structure: Number of levels/branches
   - Node labels: All text at each node
   - Branch labels: All probabilities/outcomes on branches
   - Numerical values: Exact probabilities (e.g., 0.45, 2/5, 45%)
   - Related question: Which question number references this diagram

2. **DATA TABLES:**
   - Table title/caption
   - Column headers (exact text)
   - Row headers (exact text)
   - All cell values (complete data extraction)
   - Number of rows × columns
   - Missing/incomplete cells (mark as [EMPTY])
   - Related question: Which question uses this table

3. **GRAPHS & CHARTS:**
   - Type: Bar chart, line graph, pie chart, scatter plot, histogram
   - Axes labels: X-axis and Y-axis titles
   - Scale/units: Numerical ranges and increments
   - Data points: Exact values from graph
   - Legend: All legend entries and color coding
   - Title: Graph title
   - Related question: Which question analyzes this graph

4. **GEOMETRIC DIAGRAMS:**
   - Type: Triangle, circle, polygon, 3D shape
   - Measurements: All labeled dimensions, angles, lengths
   - Labels: All vertex/point labels (A, B, C, etc.)
   - Relationships: Parallel lines, right angles, congruence marks
   - Related question: Which geometry question uses this

5. **VENN DIAGRAMS:**
   - Number of sets/circles
   - Set labels (A, B, C, Universe)
   - Region values: Numbers in each intersection
   - Related question: Which set theory question references this

6. **OTHER VISUAL ELEMENTS:**
   - Type: Image, photograph, illustration, symbol
   - Description: What it shows
   - Purpose: Why it's included
   - Related question: Which question needs this visual

**EXTRACTION FORMAT (for each visual element):**

Visual Element #[Number]:
- Type: [specific type]
- Question Reference: Q[number] or Q[number][letter] (e.g., Q1, Q2a)
- Detailed Description: [complete description]
- Key Data: [all extractable data]
- OCR Text: [any text visible in the visual]
- Confidence: [High/Medium/Low based on clarity]

**CRITICAL REQUIREMENTS:**
- Extract EVERY visual element - zero omissions
- Transcribe ALL text visible in diagrams/tables
- Capture ALL numerical values with exact precision
- Identify which questions reference each visual
- Mark unclear elements but still provide best extraction

List ALL visual elements systematically.`;

          const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: imagePrompt },
                    { type: 'image_url', image_url: { url: pdfDataUrl } }
                  ]
                }
              ],
              max_tokens: 2000
            }),
          });

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            const imageDescription = imageData.choices[0].message.content;
            console.log(`✅ Visual Elements Identified (${imageDescription.length} chars):\n${imageDescription.substring(0, 500)}...`);
            
            // Append comprehensive visual context to extracted text
            finalExtractedText += `\n\n=== VISUAL ELEMENTS IN DOCUMENT ===\n${imageDescription}\n=== END VISUAL ELEMENTS ===`;
            
            // Log extraction metrics
            const textWords = finalExtractedText.split(/\s+/).length;
            const textLines = finalExtractedText.split('\n').length;
            console.log(`📊 Extraction Metrics: ${textWords} words, ${textLines} lines, ${finalExtractedText.length} chars`);
          } else {
            console.warn('⚠️ Visual element extraction failed, proceeding with text only');
          }
        } else {
          const errorText = await ocrResponse.text();
          console.error('⚠️ PDF OCR failed:', ocrResponse.status, errorText);
          console.log('⚠️ Using raw content');
          finalExtractedText = '[PDF content - please process with base64]';
        }
      } catch (ocrError) {
        console.error('❌ PDF processing error:', ocrError);
        console.log('⚠️ Falling back to raw content processing');
        finalExtractedText = '[PDF content - error during extraction]';
      }
    }

    // Get appropriate prompts based on action mode
    const systemPrompt = getSystemPrompt(actionMode, parseMode, extractedImages);
    const userPrompt = getUserPrompt(actionMode, parseMode, fileName, fileType, finalContent, finalExtractedText, extractedImages);

    console.log(`🤖 Calling Gemini AI for ${actionMode} (${parseMode} mode)...`);
    
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
    const parsedContent = aiData.choices[0].message.content;
    
    let parsedData;
    try {
      parsedData = JSON.parse(parsedContent);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      return new Response(
        JSON.stringify({ error: 'AI response format invalid', details: String(e) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate based on action mode
    if (actionMode === 'parse') {
      const questions = parsedData.questions || [];
      if (questions.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No questions found in the content' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Post-processing validation and quality checks
      console.log(`🔍 Validating ${questions.length} parsed questions...`);
      
      let validationWarnings: string[] = [];
      questions.forEach((q: any, idx: number) => {
        // Validate required fields
        if (!q.question_text || q.question_text.trim().length === 0) {
          validationWarnings.push(`Q${idx + 1}: Missing question text`);
        }
        
        // Validate MCQ questions have options
        if (q.question_type === 'mcq' && (!q.options || q.options.length !== 4)) {
          validationWarnings.push(`Q${idx + 1}: MCQ must have exactly 4 options`);
        }
        
        // Validate marks are positive numbers
        if (q.marks && (typeof q.marks !== 'number' || q.marks <= 0)) {
          validationWarnings.push(`Q${idx + 1}: Invalid marks value`);
        }
        
        // Check if sub-questions structure is valid
        if (q.has_sub_questions) {
          if (!q.sub_questions || !Array.isArray(q.sub_questions) || q.sub_questions.length === 0) {
            validationWarnings.push(`Q${idx + 1}: Marked as having sub-questions but none found`);
            q.has_sub_questions = false;
          } else {
            // Validate sub-question structure
            q.sub_questions.forEach((sq: any, sqIdx: number) => {
              if (!sq.label || !sq.text) {
                validationWarnings.push(`Q${idx + 1}${sq.label || sqIdx}: Invalid sub-question structure`);
              }
            });
          }
        }
      });
      
      if (validationWarnings.length > 0) {
        console.warn(`⚠️ Validation warnings (${validationWarnings.length}):\n${validationWarnings.slice(0, 5).join('\n')}`);
      } else {
        console.log('✅ All questions passed validation checks');
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
            const solvePrompt = `You are an expert problem solver specializing in ${question.difficulty || 'medium'}-level questions. Solve this question with 100% accuracy.

**QUESTION:**
${question.question_text}

${question.question_image_url ? `**VISUAL ELEMENT:** ${question.question_image_url}
[Analyze the image carefully - it contains critical information for solving]` : ''}

${question.marks ? `**MARKS:** ${question.marks} marks` : ''}
${question.difficulty ? `**DIFFICULTY:** ${question.difficulty}` : ''}

**SOLVING REQUIREMENTS:**
1. **Analyze Comprehensively**: Understand what's being asked
2. **Use All Information**: Text + image + context
3. **Show Reasoning**: Think through the problem logically
4. **Verify Accuracy**: Double-check calculations
5. **Provide Final Answer**: Clear, concise, complete answer

**ANSWER FORMAT GUIDELINES:**
- **Numerical**: Exact value (e.g., "0.82", "94", "3.14")
- **Percentage**: Include % symbol (e.g., "82%")
- **Multiple Values**: Comma-separated (e.g., "94, 29, 150")
- **Text**: Complete sentence or phrase
- **Boolean**: "true" or "false"
- **Multiple Choice**: Just the letter (e.g., "C")

**IMPORTANT:**
- For multi-part answers, provide all parts
- For probability: use decimal format unless specified otherwise
- For statistics: include units if applicable
- Keep answer concise but complete

Solve and provide ONLY the final answer.`;

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
                const subSolvePrompt = `You are an expert problem solver. Solve this sub-question part with complete accuracy.

**MAIN QUESTION CONTEXT:**
${question.question_text}

${question.question_image_url ? `**SHARED VISUAL:** ${question.question_image_url}
[This diagram/table applies to all sub-questions]` : ''}

**SUB-QUESTION ${subQuestion.label}:**
${subQuestion.text}

${subQuestion.marks ? `**MARKS:** ${subQuestion.marks} marks` : ''}

**SOLVING STRATEGY:**
1. **Use Main Context**: This sub-question builds on the main question setup
2. **Refer to Visuals**: If a diagram/table is shared, extract relevant data
3. **Solve Specific Part**: Focus on what this sub-question asks
4. **Verify Against Marks**: Answer complexity should match mark allocation
5. **Provide Clear Answer**: Concise, complete, unambiguous

**ANSWER FORMAT:**
- Match the expected format (number, percentage, text, etc.)
- Include units if applicable
- For calculations, provide the final result
- For multi-value answers, separate with commas

Solve sub-question ${subQuestion.label} and provide ONLY the final answer.`;

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
      
      // Calculate extraction quality metrics
      const totalMainQuestions = questions.length;
      const questionsWithAnswers = questions.filter((q: any) => q.correct_answer && q.correct_answer.trim()).length;
      const questionsWithImages = questions.filter((q: any) => q.question_image_url).length;
      const totalSubQuestions = questions.reduce((sum: number, q: any) => sum + (q.sub_questions?.length || 0), 0);
      const subQuestionsWithAnswers = questions.reduce((sum: number, q: any) => {
        return sum + (q.sub_questions?.filter((sq: any) => sq.answer && sq.answer.trim()).length || 0);
      }, 0);
      
      console.log(`✅ Successfully parsed ${totalMainQuestions} questions (${questionsNeedingSolving.length} main + ${totalSubQuestionsSolved} sub auto-solved)`);
      console.log(`📊 Quality Metrics:
  - Main Q with answers: ${questionsWithAnswers}/${totalMainQuestions} (${Math.round(questionsWithAnswers/totalMainQuestions*100)}%)
  - Sub-Q with answers: ${subQuestionsWithAnswers}/${totalSubQuestions} (${totalSubQuestions > 0 ? Math.round(subQuestionsWithAnswers/totalSubQuestions*100) : 0}%)
  - Questions with images: ${questionsWithImages}/${totalMainQuestions} (${Math.round(questionsWithImages/totalMainQuestions*100)}%)
  - Extracted images count: ${extractedImages?.length || 0}`);
    } else {
      console.log(`✅ Successfully completed ${actionMode} action`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        actionMode,
        data: parsedData,
        parsed_count: actionMode === 'parse' ? (parsedData.questions?.length || 0) : null
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

function getSystemPrompt(actionMode: string, parseMode: string, extractedImages?: string[]): string {
  const hasImages = extractedImages && extractedImages.length > 0;
  const imageCount = hasImages ? extractedImages.length : 0;
  const imageUrls = hasImages ? extractedImages.join(', ') : 'none';
  let imageContext = '';
  
  if (hasImages) {
    imageContext = '\n\n📸 **IMAGE HANDLING**: ' + imageCount + ' images were extracted from the document at URLs: ' + imageUrls + '. You MUST intelligently assign these image URLs to the appropriate questions based on context clues in the text (e.g., "see diagram", "refer to image", question numbers, etc.).';
  }
  
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
  const mockPrompt = `You are an expert educational document parser with OCR-like capabilities. Parse ANY document format and extract ALL questions with complete structure.

**MULTI-FORMAT PARSING (docTR-like OCR + AI):**
- **PDF**: Extract from formatted text, tables, and layouts
- **Images**: Perform intelligent OCR - recognize handwritten/printed text
- **Word (.docx)**: Parse formatted documents, tables, diagrams WITH IMAGE SUPPORT
- **CSV**: Intelligently map columns to question components
- **Text**: Handle numbered lists, bullets, paragraphs

**IMAGE EXTRACTION & ASSIGNMENT (MANDATORY):**` + imageContext + `
When images are provided, you MUST analyze and assign them intelligently:
1. **Direct References**: Look for "diagram below", "tree diagram", "table shown", "graph", "figure"
2. **Contextual Matching**: Match images to questions by content (e.g., probability tree image → probability question)
3. **Sequential Assignment**: If unsure, assign images in order they appear to questions in order
4. **Visual Elements**: ALL diagrams, tables, graphs, charts, figures MUST have corresponding image URLs
5. **Sub-questions with shared images**: If sub-questions a), b), c) all refer to same diagram, assign image to main question
6. **Multiple images per question**: If one question has multiple diagrams/tables, assign the most relevant primary image

**ADAPTIVE PARSING (CSV/DOC/PDF Support):**
- **CSV Files**: 
  - Parse headers intelligently (question, answer, options, marks, etc.)
  - Handle any column names/order (flexible mapping)
  - Extract question_text, correct_answer, difficulty, marks
  - Generate MCQ options if only answer provided
  - Support both comma and semicolon delimiters
- **Word Documents**: 
  - Extract from structured/unstructured text
  - Parse tables and embedded images
  - Flatten sub-questions into separate items (Quick mode)
  - Preserve sub-question structure (Mock mode)
- **PDF Files**: 
  - Use extracted OCR text with visual context
  - Identify tables, tree diagrams, graphs from descriptions
  - Match questions to visual elements
  - Extract marks from notation like [3 marks], (2m), etc.

**CRITICAL SUB-QUESTION DETECTION & MARKS CALCULATION:**
- **Sub-Question Formats**: Look for a), b), c), d) OR i), ii), iii) OR (a), (b), (c) OR Part a:, Part b:
- **Marks Extraction**: Each sub-question has marks like [3 marks], [2 marks], (3 marks), (2m)
- **Main Question Marks**: SUM of ALL sub-question marks = main question total_marks
- **Example**: Question 1 with:
  - a) [3 marks]
  - b) [2 marks]  
  - c) [4 marks]
  - d) [3 marks]
  → Main question marks = 3+2+4+3 = 12 marks total
- **Set has_sub_questions: true** when sub-parts exist
- **Main question_text**: Context/setup ONLY (not the actual questions to answer)
- **sub_questions array**: Contains ALL actual question parts with {label, text, marks, answer}
- **Each sub-question needs**: label ("a", "b", "c"), text (the actual question), marks (integer), answer (if provided)

**TREE DIAGRAM & VISUAL ELEMENT HANDLING:**
- **Tree Diagrams**: Questions with "tree diagram", "complete the tree", "probability tree" MUST reference diagram
- **Shared Visuals**: If multiple sub-questions (a,b,c,d) reference same diagram, note it in main question
- **Visual Context**: Include visual element descriptions in question context for AI understanding
- **Marks Validation**: Verify marks sum correctly - don't guess, extract from document

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

**CRITICAL: QUICK TEST FORMAT REQUIREMENTS:**
- **100% MCQ FORMAT**: EVERY question MUST have exactly 4 options (A, B, C, D) - NO EXCEPTIONS
- **AUTO-GENERATE OPTIONS**: If original question is short answer/essay, create plausible MCQ options based on the correct answer
- **NO SUB-QUESTIONS ALLOWED**: If document has sub-questions (a, b, c), convert EACH ONE into a SEPARATE complete question
- **FLATTEN STRUCTURE**: Question 1a, 1b, 1c should become Question 1, Question 2, Question 3
- **STANDALONE QUESTIONS**: Each question must be completely independent with its own context
- **100% IMAGE ASSIGNMENT**: ALL extracted images MUST be assigned to questions - ZERO images should be left unassigned

**MANDATORY MCQ OPTION GENERATION:**
- If question has an answer but no options → CREATE 4 plausible options (1 correct + 3 distractors)
- Distractors should be realistic but clearly wrong
- For numerical answers: use similar numbers with different values
- For text answers: use related but incorrect concepts
- EXAMPLE: Answer is "94" → Options: ["A. 94", "B. 84", "C. 104", "D. 74"]

**100% IMAGE EXTRACTION & ASSIGNMENT (MANDATORY):**` + imageContext + `
YOU MUST assign ALL ` + imageCount + ` extracted images to questions:
1. **Direct References**: "see diagram", "refer to figure", "tree diagram", "table shown", "graph"
2. **Contextual Matching**: Match images to questions by topic (probability tree → probability question)
3. **Distribute All Images**: EVERY image must be assigned - spread them across relevant questions
4. **Priority Assignment**: Tables/diagrams mentioned in text get highest priority
5. **No Unassigned Images**: Count your assignments - must equal total extracted images
6. **Image URLs**: Use exact URLs from extracted images list: ` + imageUrls + `

**ADAPTIVE PARSING (works like docTR OCR + AI):**
- **CSV/Text**: Parse column headers and rows intelligently
- **PDF**: Extract from formatted layouts + images
- **Images**: Perform OCR to recognize text + extract visual elements
- **Word**: Parse structured documents and FLATTEN all sub-questions + extract embedded images

**CSV PARSING INTELLIGENCE:**
- **Flexible Headers**: Recognize these column variations:
  - Question: "question", "question_text", "q", "problem", "item"
  - Answer: "answer", "correct_answer", "key", "solution", "correct"  
  - Options: "options", "choices", "option_a/b/c/d", "a/b/c/d"
  - Marks: "marks", "points", "score", "weight"
  - Difficulty: "difficulty", "level", "diff"
  - Type: "type", "question_type", "category"
- **Auto-Generate**: If answer exists but no options, create 4 MCQ options
- **Delimiters**: Support comma, semicolon, tab separators
- **Quote Handling**: Parse quoted fields with internal commas
- **Empty Rows**: Skip empty rows, don't count as questions
- **Example CSV Format**:
  question,answer,marks,difficulty
  "What is 2+2?","4",1,"easy"
  "Calculate probability","0.75",3,"medium"

**FLATTENING EXAMPLE:**
Original: "Question 1: A survey shows... a) Find missing values [answer: 94, 29, 150] b) Calculate probability [answer: 0.82]"
Output: 
- Question 1: "A survey shows... Find the missing values in the table." 
  → options: ["A. 94, 29, 150", "B. 84, 19, 140", "C. 104, 39, 160", "D. 74, 29, 130"]
  → question_image_url: "[table image URL if available]"
- Question 2: "A survey shows... Calculate the probability that a person is a student or travels by train." 
  → options: ["A. 0.82", "B. 0.72", "C. 0.92", "D. 0.62"]
  → question_image_url: "[same table image or null]"

**VALID SUBJECTS:** "mathematics", "science", "english", "history" (default: mathematics if unclear)

**IMAGE ASSIGNMENT VALIDATION:**
Before returning JSON, verify:
- Count of question_image_url fields with non-null values = ` + imageCount + `
- Every extracted image URL appears at least once in questions array
- No images are left unassigned

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
      "question_text": "string (complete standalone question with all context)",
      "question_type": "mcq",
      "question_image_url": "string (assign from extracted images if relevant, null otherwise)",
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
  extractedImages?: string[]
): string {
  const hasImages = extractedImages && extractedImages.length > 0;
  const imgCount = hasImages ? extractedImages.length : 0;
  const imgUrls = hasImages ? extractedImages.join(', ') : 'none';
  
  const fileContext = fileName ? '\n📁 File: ' + fileName + ' (' + fileType + ')' : '';
  const textPreview = extractedText 
    ? '\n\n📄 Pre-extracted Text (' + extractedText.length + ' characters):\n' + extractedText.substring(0, 2500) + (extractedText.length > 2500 ? '\n...(truncated)' : '')
    : '';
  
  let imageContext = '';
  if (hasImages) {
    const imageList = extractedImages.map((url: string, i: number) => 'Image ' + (i + 1) + ': ' + url).join('\n');
    imageContext = '\n\n📸 Extracted Images (' + imgCount + ' total):\n' + imageList;
  }

  if (actionMode === 'summarize') {
    return `Analyze and summarize this educational document.${fileContext}${textPreview}

${!extractedText ? `Content to summarize:\n${content}` : ''}

Create a comprehensive, well-structured summary with key topics, main points, and learning objectives.
Return pure JSON only (no markdown, no explanations).`;
  }

  if (actionMode === 'extract_data') {
    return `Extract all structured data from this document.${fileContext}${textPreview}

${!extractedText ? `Content to analyze:\n${content}` : ''}

Extract entities, tables, key facts, and categorize all data points with high accuracy.
Return pure JSON only (no markdown, no explanations).`;
  }

  if (actionMode === 'quiz') {
    return `Generate high-quality quiz questions from this educational content.${fileContext}${textPreview}

${!extractedText ? `Content to convert into quiz:\n${content}` : ''}

Create a comprehensive quiz with multiple question types, varying difficulty, plausible distractors, and detailed explanations.
Return pure JSON only (no markdown, no explanations).`;
  }

  // Default: parse mode
  return `Parse this educational document and extract ALL questions with complete details.${fileContext}${textPreview}${imageContext}

${extractedText ? 'Use the pre-extracted text above for accurate parsing.' : 'Content to parse:'}
${!extractedText ? content : ''}

**PARSING INSTRUCTIONS:**
- **CSV**: Parse column headers and map to question components intelligently
- **Word/PDF**: Extract from formatted text, tables, and structured layouts
- **Images**: Perform OCR and extract all visible text and questions
- **Handle All Formats**: Numbered lists (1, 2, 3), bullet points, tables, paragraphs
- **Auto-detect Structure**: Question types, options, answers, sub-questions
- **Normalize Answers**: Convert all formats (1/2/3/4, A/B/C/D, a/b/c/d) to A/B/C/D
- **Extract EVERYTHING**: Never skip questions due to format issues - use defaults if needed

${parseMode === 'quick' ? `\n**🎯 QUICK TEST MODE - CRITICAL REQUIREMENTS:**
1. **100% MCQ FORMAT**: EVERY question MUST have exactly 4 options (A, B, C, D)
2. **AUTO-GENERATE OPTIONS**: If no options exist, create them based on the correct answer
   - For numerical answers: create similar numbers with variations
   - For text answers: create plausible but incorrect alternatives
3. **FLATTEN SUB-QUESTIONS**: Convert Question 1a, 1b, 1c into separate Question 1, 2, 3
4. **STANDALONE CONTEXT**: Each question must include all necessary context from parent
5. **NO SHORT ANSWER**: Convert ALL question types to MCQ with 4 options\n` : ''}

` + (hasImages ? `

**📸 100% IMAGE ASSIGNMENT (CRITICAL - ` + imgCount + ` IMAGES TOTAL)**:
YOU MUST ASSIGN ALL ` + imgCount + ` IMAGES - ZERO IMAGES SHOULD BE LEFT UNASSIGNED!

**Available Image URLs:**
` + extractedImages.map((url: string, i: number) => (i + 1) + '. ' + url).join('\n') + `

**Assignment Strategy:**
1. **Direct References First**: Look for text like "see diagram", "refer to figure", "tree diagram", "table", "graph", "chart"
2. **Contextual Matching**: Match images to questions by content (probability tree → probability question, table → data question)
3. **Distribute ALL Images**: Every single image must appear in at least one question's question_image_url field
4. **Shared Images OK**: Multiple questions can reference the same image if they all relate to it
5. **Verify 100%**: Before finishing, count - did you assign all ` + imgCount + ` images?

**Examples of Good Assignment:**
- Question mentions "tree diagram" → assign tree image URL
- Question has table data → assign table image URL
- Question about probability with tree reference → assign tree image URL
- Multiple parts (a,b,c) referencing same diagram → assign same image to each flattened question

**VALIDATION CHECK:**
After assigning, verify that all ` + imgCount + ` image URLs appear in your questions array.
Count of non-null question_image_url values should equal ` + imgCount + `.
` : '') + `

` + (parseMode === 'quick' && hasImages ? `

**⚠️ QUICK TEST + IMAGES CHECKLIST:**
✓ Every question has exactly 4 MCQ options (A, B, C, D)
✓ All ` + imgCount + ` images are assigned to questions
✓ Sub-questions are flattened into separate standalone questions
✓ Each question includes necessary context
✓ No short answer or essay questions remain
` : '') + `

${parseMode === 'mock' ? `\n**SUB-QUESTION EXTRACTION (CRITICAL)**:
1. Detect sub-parts labeled as: a), b), c), d) OR (a), (b), (c) OR i), ii), iii)
2. If found, set "has_sub_questions": true and populate "sub_questions" array
3. Each sub-question needs: label (just letter/number), text, marks, answer
4. Main question should contain setup/context, sub-questions contain the actual parts
5. Extract marks for each sub-part (e.g., "[2 marks]", "[3 marks]")
6. Example: "Question 1: A park café..." with "a) Complete the tree diagram [3 marks]" → Main Q + sub_questions array` : ''}

Return pure JSON only (no markdown blocks, no explanations).`;
}
