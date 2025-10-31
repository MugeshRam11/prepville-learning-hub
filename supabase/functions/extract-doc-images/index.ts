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
    const contentType = req.headers.get('content-type');
    
    // Handle JSON request for PDF diagram detection
    if (contentType?.includes('application/json')) {
      const { mode, pageImageUrl, pageNumber } = await req.json();
      
      if (mode === 'pdf-diagram-detection' && pageImageUrl) {
        console.log(`🤖 AI analyzing PDF page ${pageNumber} for diagrams...`);
        
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (!LOVABLE_API_KEY) {
          return new Response(
            JSON.stringify({ error: 'AI service not configured' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
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
                    text: `Analyze this PDF page image and detect if it contains diagrams, charts, graphs, illustrations, or mathematical figures (not just plain text).

CRITICAL: For tree diagrams, flowcharts, and connected diagrams, you MUST capture the ENTIRE structure including:
- Starting nodes on the left/top
- ALL branches and connections
- ALL labels, text boxes, and probability values
- ALL endpoints on the right/bottom
- Any boxes with question marks or empty values that need to be filled in

If diagrams are present, provide bounding boxes for each COMPLETE diagram:
{
  "hasDiagram": true,
  "diagrams": [
    {
      "description": "brief description",
      "boundingBox": { "x": pixels, "y": pixels, "width": pixels, "height": pixels }
    }
  ]
}

If it's mostly plain text with no visual diagrams, return:
{ "hasDiagram": false }

IMPORTANT: Bounding boxes should capture the FULL extent of the diagram. For tree diagrams, this means from the leftmost starting point to the rightmost endpoints, and from the top branch to the bottom branch. Do NOT crop partial diagrams.`
                  },
                  {
                    type: 'image_url',
                    image_url: { url: pageImageUrl }
                  }
                ]
              }],
              max_tokens: 1000,
              response_format: { type: "json_object" }
            })
          });
          
          if (response.ok) {
            const aiData = await response.json();
            const content = aiData.choices?.[0]?.message?.content || '{"hasDiagram": false}';
            const result = JSON.parse(content);
            
            console.log(`✅ AI detection result for page ${pageNumber}:`, result);
            
            return new Response(
              JSON.stringify(result),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            console.error('AI analysis failed:', response.status, await response.text());
            return new Response(
              JSON.stringify({ hasDiagram: true, diagrams: [] }), // Fallback: assume diagram present
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (aiError) {
          console.error('AI analysis error:', aiError);
          return new Response(
            JSON.stringify({ hasDiagram: true, diagrams: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    
    // Handle FormData request for Word document processing
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
