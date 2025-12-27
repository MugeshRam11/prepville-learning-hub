import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.24.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    
    // Handle JSON request for comprehensive PDF parsing
    if (contentType.includes('application/json')) {
      const { mode, pageImageUrl, pageNumber, pageText } = await req.json();
      
      if (mode === 'pdf-diagram-detection' && pageImageUrl) {
        console.log(`🔍 Step 1/3: AI analyzing PDF page ${pageNumber} for complete diagram extraction...`);
        
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (!LOVABLE_API_KEY) {
          return new Response(
            JSON.stringify({ error: 'AI service not configured' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        try {
          // Step 1: Comprehensive diagram detection with enhanced prompt
          const detectionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [{
                role: 'user',
                content: [
                  {
                    type: 'text',
                text: `PDF PAGE DIAGRAM DETECTION

Analyze this image and detect visual diagrams (Venn, tree, graph, table, chart, figure).

CRITICAL: If you detect ANY diagram, you MUST provide bounding box coordinates!

Return ONLY this JSON (keep it short):

If diagram found:
{
  "hasDiagram": true,
  "diagrams": [{
    "type": "venn_diagram",
    "description": "Venn diagram with sets A and B",
    "boundingBox": {"x": 50, "y": 100, "width": 800, "height": 600},
    "confidence": "high"
  }],
  "pageType": "question_with_diagram"
}

If NO diagram:
{
  "hasDiagram": false,
  "diagrams": [],
  "pageType": "text_only"
}

RULES:
- Keep descriptions under 10 words
- Provide x, y, width, height in pixels
- Add 50px padding around diagrams
- Types: venn_diagram, tree_diagram, graph, table, flowchart, illustration, other
- If you see a diagram, diagrams array MUST have at least one item with boundingBox`
                  },
                  {
                    type: 'image_url',
                    image_url: { url: pageImageUrl }
                  }
                ]
              }],
              max_tokens: 500,
              temperature: 0.1,
              response_format: { type: "json_object" }
            })
          });
          
          if (!detectionResponse.ok) {
            const errorText = await detectionResponse.text();
            console.error('❌ AI detection failed:', detectionResponse.status, errorText);
            return new Response(
              JSON.stringify({ hasDiagram: false, error: 'AI detection failed' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const aiData = await detectionResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '{"hasDiagram": false}';
          
          console.log(`📄 Raw AI response length: ${content.length} chars`);
          
          // Sanitize JSON to remove control characters
          const sanitizedContent = content
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
            .replace(/\r?\n/g, ' ')
            .replace(/\t/g, ' ')
            .replace(/\s+/g, ' ');
          
          let result;
          try {
            result = JSON.parse(sanitizedContent);
            
            if (result.hasDiagram === true && (!result.diagrams || result.diagrams.length === 0)) {
              console.warn('⚠️ AI returned hasDiagram=true but empty diagrams array, treating as no diagram');
              result.hasDiagram = false;
              result.pageType = 'text_only';
            }
          } catch (parseError) {
            console.error('❌ JSON parse error:', parseError);
            console.error('📄 Content snippet:', sanitizedContent.substring(0, 500));
            result = { hasDiagram: false, diagrams: [], pageType: 'text_only' };
          }
          
          console.log(`✅ Step 1 Complete - Detection result for page ${pageNumber}:`, JSON.stringify(result, null, 2));
          
          // Step 2: If diagrams detected, enhance with OCR analysis
          if (result.hasDiagram && result.diagrams && result.diagrams.length > 0) {
            console.log(`🔍 Step 2/3: Enhanced OCR analysis for ${result.diagrams.length} detected diagrams...`);
            
            try {
              const ocrResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'google/gemini-2.5-flash',
                  messages: [{
                    role: 'user',
                    content: [
                      {
                        type: 'text',
                        text: `STEP 2: OCR TEXT EXTRACTION

Extract ALL text visible in this image, including:
- Question numbers and text
- Labels and annotations on diagrams
- Values, probabilities, or measurements
- Any instructions or notes

Return ONLY the extracted text, maintaining the reading order (top-to-bottom, left-to-right).`
                      },
                      {
                        type: 'image_url',
                        image_url: { url: pageImageUrl }
                      }
                    ]
                  }],
                  max_tokens: 1500
                })
              });

              if (ocrResponse.ok) {
                const ocrData = await ocrResponse.json();
                const extractedText = ocrData.choices?.[0]?.message?.content || '';
                result.extractedText = extractedText;
                console.log(`✅ Step 2 Complete - Extracted text (${extractedText.length} chars)`);
              }
            } catch (ocrError) {
              console.warn('⚠️ OCR extraction failed, continuing without text:', ocrError);
            }

            // Step 3: Structure question parsing
            console.log(`🔍 Step 3/3: Parsing question structure...`);
            
            try {
              const structureResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'google/gemini-2.5-flash',
                  messages: [{
                    role: 'user',
                    content: `STEP 3: QUESTION STRUCTURE PARSING

Analyze this text and identify the question structure:
${result.extractedText || pageText || 'No text available'}

Return JSON:
{
  "questions": [
    {
      "questionNumber": "string",
      "questionText": "string",
      "parts": ["a)", "b)", etc.],
      "hasDiagram": true/false,
      "topic": "probability|algebra|geometry|statistics|etc."
    }
  ]
}`
                  }],
                  max_tokens: 1000,
                  response_format: { type: "json_object" }
                })
              });

              if (structureResponse.ok) {
                const structureData = await structureResponse.json();
                const structureContent = structureData.choices?.[0]?.message?.content || '{}';
                const parsedStructure = JSON.parse(structureContent);
                result.questionStructure = parsedStructure;
                console.log(`✅ Step 3 Complete - Parsed ${parsedStructure.questions?.length || 0} questions`);
              }
            } catch (structureError) {
              console.warn('⚠️ Question structure parsing failed:', structureError);
            }
          }
          
          console.log(`🎉 COMPLETE: All 3 steps finished for page ${pageNumber}`);
          
          return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
          
        } catch (aiError) {
          console.error('❌ AI analysis error:', aiError);
          return new Response(
            JSON.stringify({ 
              hasDiagram: false, 
              error: aiError instanceof Error ? aiError.message : 'Unknown error' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      // JSON request but not a recognized mode - return error
      return new Response(
        JSON.stringify({ error: 'Invalid JSON request mode' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle FormData request for Word document processing
    if (!contentType.includes('multipart/form-data')) {
      return new Response(
        JSON.stringify({ error: 'Invalid content type. Expected multipart/form-data or application/json' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📄 Processing Word document:', file.name, '| Size:', file.size);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to base64 safely for large files (chunk by chunk)
    const chunkSize = 8192;
    let base64Data = '';
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      base64Data += btoa(String.fromCharCode.apply(null, Array.from(chunk)));
    }
    
    console.log(`📄 Calling document parsing API for comprehensive extraction...`);

    const extractedImages: string[] = [];

    // Use Anthropic's document parsing to extract ALL images including tables and diagrams
    try {
      const anthropic = new Anthropic({
        apiKey: Deno.env.get('ANTHROPIC_API_KEY') || '',
      });

      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: 'Extract all visual elements (images, diagrams, tables) from this document. Return just a count of images found.'
            }
          ],
        }],
      });

      console.log(`📊 Document parsing complete, now extracting images from ZIP...`);
    } catch (parseError) {
      console.log(`⚠️ Document parsing not available, using ZIP extraction only:`, parseError);
    }

    // Extract images from .docx ZIP structure and analyze them for answer keys
    try {
      const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;
      const zip = await JSZip.loadAsync(uint8Array);
      
      // Look for images in word/media folder
      const mediaFolder = zip.folder('word/media');
      
      if (mediaFolder) {
        const mediaFiles = Object.keys(zip.files).filter(name => name.startsWith('word/media/'));
        
        console.log(`📸 Found ${mediaFiles.length} media files in Word document:`, mediaFiles);
        
        for (const fileName of mediaFiles) {
          const file = zip.files[fileName];
          if (!file.dir) {
            try {
              // Extract image data
              const imageData = await file.async('uint8array');
              
              // Skip if empty
              if (imageData.length === 0) {
                console.log(`⚠️ Skipping empty file: ${fileName}`);
                continue;
              }
              
              // Determine content type from file extension
              const ext = fileName.split('.').pop()?.toLowerCase();
              const contentTypeMap: Record<string, string> = {
                'png': 'image/png',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'gif': 'image/gif',
                'bmp': 'image/bmp',
                'webp': 'image/webp',
                'emf': 'image/x-emf',
                'wmf': 'image/x-wmf',
                'svg': 'image/svg+xml'
              };
              const contentType = contentTypeMap[ext || 'png'] || 'image/png';
              
              // Generate unique filename
              const timestamp = Date.now();
              const random = Math.random().toString(36).substring(7);
              const storageName = `word-img-${timestamp}-${random}.${ext || 'png'}`;
              
              console.log(`📤 Uploading image: ${fileName} (${imageData.length} bytes) as ${storageName}`);
              
              // Upload to Supabase storage
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('question-images')
                .upload(storageName, imageData, {
                  contentType,
                  cacheControl: '3600',
                  upsert: false
                });
              
              if (uploadError) {
                console.error(`❌ Image upload error for ${fileName}:`, uploadError);
                continue;
              }
              
              // Get public URL
              const { data: urlData } = supabase.storage
                .from('question-images')
                .getPublicUrl(storageName);
              
              if (urlData.publicUrl) {
                extractedImages.push(urlData.publicUrl);
                console.log(`✅ Image uploaded successfully: ${storageName} → ${urlData.publicUrl}`);
              }
            } catch (fileError) {
              console.error(`❌ Error processing file ${fileName}:`, fileError);
              continue;
            }
          }
        }
      } else {
        console.log('⚠️ No media folder found in Word document');
      }
    } catch (zipError) {
      console.error('❌ Error extracting images from ZIP:', zipError);
    }

    // Use AI to analyze images and extract answer keys
    const imageAnalysis: any[] = [];
    if (extractedImages.length > 0) {
      console.log(`🤖 Analyzing ${extractedImages.length} images for answer keys...`);
      try {
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (LOVABLE_API_KEY) {
          for (const imageUrl of extractedImages) {
            try {
              const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'google/gemini-2.5-flash',
                  messages: [{
                    role: 'user',
                    content: [
                      {
                        type: 'text',
                        text: 'Analyze this question image and extract: 1) The question text 2) Any visible answer or solution. If there is an answer key, solution, or correct answer shown in the image, extract it. Return ONLY the answer/solution text, or "NO_ANSWER" if no answer is visible.'
                      },
                      {
                        type: 'image_url',
                        image_url: { url: imageUrl }
                      }
                    ]
                  }],
                  max_tokens: 500
                })
              });

              if (response.ok) {
                const aiData = await response.json();
                const extractedAnswer = aiData.choices?.[0]?.message?.content || 'NO_ANSWER';
                console.log(`✅ Image analysis complete for ${imageUrl}: ${extractedAnswer.substring(0, 100)}`);
                imageAnalysis.push({
                  imageUrl,
                  extractedAnswer: extractedAnswer !== 'NO_ANSWER' ? extractedAnswer : null
                });
              }
            } catch (analyzeError) {
              console.error(`⚠️ Failed to analyze image ${imageUrl}:`, analyzeError);
              imageAnalysis.push({ imageUrl, extractedAnswer: null });
            }
          }
        }
      } catch (aiError) {
        console.error('⚠️ AI analysis unavailable:', aiError);
      }
    }

    // Extract text using a simple XML parsing approach
    let extractedText = '';
    try {
      const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;
      const zip = await JSZip.loadAsync(uint8Array);
      const docXml = await zip.file('word/document.xml')?.async('string');
      
      if (docXml) {
        // Extract text from XML (simple approach - removes all tags)
        extractedText = docXml
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        console.log(`✅ Extracted ${extractedText.length} characters of text`);
      }
    } catch (textError) {
      console.error('Error extracting text:', textError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        images: extractedImages,
        text: extractedText,
        imageCount: extractedImages.length,
        textLength: extractedText.length,
        imageAnalysis: imageAnalysis.length > 0 ? imageAnalysis : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in extract-doc-images:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'Failed to extract images from document'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
