import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

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
        JSON.stringify({ error: 'No PDF file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📄 Converting PDF to Word:', file.name, '| Size:', file.size);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Read PDF file
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Import pdfjs
    const pdfjsLib = await import('https://esm.sh/pdfjs-dist@4.0.379/build/pdf.mjs');
    
    // Load PDF
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    
    console.log(`📖 PDF has ${numPages} pages`);

    // Extract content from each page using AI OCR
    const pageContents: Array<{ pageNum: number; text: string; images: string[] }> = [];
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      console.log(`🔍 Processing page ${pageNum}/${numPages}...`);
      
      const page = await pdf.getPage(pageNum);
      
      // Render page to canvas for OCR
      const viewport = page.getViewport({ scale: 2.0 });
      
      // Create canvas using Deno Canvas or just use the image data
      // Since we're in Deno, we'll create a temporary image for AI analysis
      
      // Get page text content (basic extraction)
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      
      // For images, we'll need to render the page and send to AI
      // This is a simplified version - in production you'd render to an image
      
      pageContents.push({
        pageNum,
        text: pageText,
        images: []
      });
    }

    // Create Word document content
    let wordContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>`;

    for (const page of pageContents) {
      wordContent += `
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
      </w:pPr>
      <w:r>
        <w:t>Page ${page.pageNum}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>${page.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t>
      </w:r>
    </w:p>`;
    }

    wordContent += `
  </w:body>
</w:document>`;

    // Create a basic DOCX structure
    const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;
    const zip = new JSZip();
    
    // Add required Word document structure
    zip.file('word/document.xml', wordContent);
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
    
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

    // Generate DOCX file
    const docxBlob = await zip.generateAsync({ type: 'uint8array' });
    
    console.log(`✅ Word document created (${docxBlob.length} bytes)`);

    // Return the Word document
    return new Response(docxBlob, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '.docx')}"`,
      }
    });

  } catch (error) {
    console.error('❌ PDF to Word conversion error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
