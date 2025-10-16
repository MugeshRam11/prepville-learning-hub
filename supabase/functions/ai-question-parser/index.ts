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
      extractedImagesCount: extractedImages?.length || 0
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

    // Get appropriate prompts based on action mode
    const systemPrompt = getSystemPrompt(actionMode, parseMode, extractedImages);
    const userPrompt = getUserPrompt(actionMode, parseMode, fileName, fileType, content, extractedText, extractedImages);

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
      console.log(`✅ Successfully parsed ${questions.length} questions`);
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
  const imageContext = hasImages 
    ? `\n\n📸 **IMAGE HANDLING**: ${extractedImages.length} images were extracted from the document at URLs: ${extractedImages.join(', ')}. You MUST intelligently assign these image URLs to the appropriate questions based on context clues in the text (e.g., "see diagram", "refer to image", question numbers, etc.).`
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
  const mockPrompt = `You are an expert educational document parser with OCR-like capabilities. Parse ANY document format and extract ALL questions with complete structure.

**MULTI-FORMAT PARSING (docTR-like OCR + AI):**
- **PDF**: Extract from formatted text, tables, and layouts
- **Images**: Perform intelligent OCR - recognize handwritten/printed text
- **Word (.docx)**: Parse formatted documents, tables, diagrams WITH IMAGE SUPPORT
- **CSV**: Intelligently map columns to question components
- **Text**: Handle numbered lists, bullets, paragraphs

**IMAGE EXTRACTION & ASSIGNMENT:**${imageContext}
When images are provided, you MUST:
1. Analyze the text for image references (e.g., "see diagram", "refer to figure", "image shows")
2. Match images to questions based on proximity, question numbers, or contextual clues
3. Assign the correct image URL to the "question_image_url" field
4. If multiple images exist for one question, assign the first relevant one
5. If unsure, assign images sequentially to questions in order

**ADAPTIVE PARSING RULES:**
1. **Format-Agnostic**: Handle any document structure
2. **Flexible Column Detection**: Recognize data even with different column names
3. **Auto-detect Question Types**: MCQ, True/False, Short Answer, Essay, Fill-in-blank
4. **Smart Option Extraction**: Handle options in any format (1/2/3/4, A/B/C/D, bullets)
5. **Answer Normalization**: Convert all answer formats to A/B/C/D standard
6. **Missing Data Handling**: Use sensible defaults, never skip questions
7. **Sub-question Support**: Detect and structure multi-part questions
8. **Image Association**: Link images to questions intelligently

**CRITICAL SUB-QUESTION DETECTION:**
- Look for sub-questions labeled as: a), b), c), d) OR i), ii), iii), iv) OR (a), (b), (c)
- Each sub-question should have its own text and marks allocation
- If a question has sub-parts, set "has_sub_questions": true
- Extract each sub-question with: label (e.g., "a"), text, marks, and answer (if provided)
- The main question_text should contain the context/setup, sub_questions array contains the parts
- Example: "Question 1" with parts a), b), c) → 1 main question + 3 sub-questions

**TABLE & GRAPH EXTRACTION:**
- If text mentions "tree diagram", "table", "graph", "chart", "figure" → assign relevant image
- Tables in text should be preserved in question_text, AND linked image should be assigned
- Probability trees, data tables, charts MUST have images assigned from extracted images list

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

  const quickPrompt = `You are an expert educational document parser. Extract ALL questions from ANY document format with maximum flexibility.

**ADAPTIVE PARSING (works like docTR OCR + AI):**
- **CSV/Text**: Parse column headers and rows intelligently
- **PDF**: Extract from formatted layouts
- **Images**: Perform OCR to recognize text
- **Word**: Parse structured documents

**PARSING RULES:**
1. **Format-Agnostic**: Handle any structure
2. **Flexible Recognition**: Identify questions with varying formats
3. **Auto-detect Types**: MCQ, True/False, Short Answer
4. **Smart Defaults**: Use reasonable values for missing data
5. **Never Skip**: Extract every question regardless of format issues

**VALID SUBJECTS:** "mathematics", "science", "english", "history" (default: mathematics if unclear)

Return JSON:
{
  "quiz_metadata": {
    "title": "string (default: 'Quick Practice Quiz')",
    "subject": "mathematics|science|english|history (default: mathematics)",
    "difficulty": "easy|medium|hard (default: medium)"
  },
  "questions": [
    {
      "question_text": "string",
      "question_type": "mcq|true_false|short_answer",
      "options": ["text", "text", "text", "text"] (for MCQ),
      "correct_answer": "A|B|C|D|true|false|text",
      "explanation": "string (optional)",
      "difficulty": "easy|medium|hard (default: medium)"
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
  const fileContext = fileName ? `\n📁 File: ${fileName} (${fileType})` : '';
  const textPreview = extractedText 
    ? `\n\n📄 Pre-extracted Text (${extractedText.length} characters):\n${extractedText.substring(0, 2500)}${extractedText.length > 2500 ? '\n...(truncated)' : ''}`
    : '';
  const imageContext = extractedImages && extractedImages.length > 0
    ? `\n\n📸 Extracted Images (${extractedImages.length} total):\n${extractedImages.map((url, i) => `Image ${i + 1}: ${url}`).join('\n')}`
    : '';

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

${extractedImages && extractedImages.length > 0 ? `\n**IMAGE ASSIGNMENT (CRITICAL)**:
You have ${extractedImages.length} extracted images. You MUST:
1. Look for references in text like "see diagram", "refer to figure", "tree diagram", "table", "graph", "chart"
2. Assign images to questions based on context and proximity
3. Use question_image_url field with the full URL from the extracted images list
4. If a question mentions an image/diagram/table/tree diagram, assign the most relevant image URL
5. For probability trees, data tables, charts → ALWAYS assign an image
6. Distribute images logically across questions (don't leave all null)

**SUB-QUESTION EXTRACTION (CRITICAL)**:
1. Detect sub-parts labeled as: a), b), c), d) OR (a), (b), (c) OR i), ii), iii)
2. If found, set "has_sub_questions": true and populate "sub_questions" array
3. Each sub-question needs: label (just letter/number), text, marks, answer
4. Main question should contain setup/context, sub-questions contain the actual parts
5. Extract marks for each sub-part (e.g., "[2 marks]", "[3 marks]")
6. Example: "Question 1: A park café..." with "a) Complete the tree diagram [3 marks]" → Main Q + sub_questions array` : ''}

Return pure JSON only (no markdown blocks, no explanations).`;
}
