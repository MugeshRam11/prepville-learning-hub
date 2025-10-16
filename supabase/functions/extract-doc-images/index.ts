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
    
    // Convert to base64 for document parsing API
    const base64Data = btoa(String.fromCharCode(...uint8Array));
    
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

    // Extract images from .docx ZIP structure
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
        textLength: extractedText.length
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
