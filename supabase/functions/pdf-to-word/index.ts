import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel } from "npm:docx@8.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📄 Starting PDF to Word conversion...');
    
    const { extractedText, extractedImages, fileName } = await req.json();
    
    console.log(`📝 Processing: ${fileName}`);
    console.log(`📊 Text length: ${extractedText?.length || 0} chars`);
    console.log(`🖼️ Images count: ${extractedImages?.length || 0}`);

    // Create document sections
    const docSections = [];
    
    // Add title
    docSections.push(
      new Paragraph({
        text: "Extracted Content from PDF",
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 }
      })
    );

    // Add source info
    docSections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Source: ${fileName}`,
            italics: true,
            size: 20
          })
        ],
        spacing: { after: 200 }
      })
    );

    docSections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Extracted: ${new Date().toLocaleString()}`,
            italics: true,
            size: 20
          })
        ],
        spacing: { after: 400 }
      })
    );

    // Add extracted images first (if any)
    if (extractedImages && extractedImages.length > 0) {
      docSections.push(
        new Paragraph({
          text: "Extracted Images",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        })
      );

      for (let i = 0; i < extractedImages.length; i++) {
        const imageUrl = extractedImages[i];
        console.log(`🖼️ Processing image ${i + 1}: ${imageUrl}`);

        try {
          // Fetch image from URL
          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) {
            console.error(`Failed to fetch image: ${imageUrl}`);
            continue;
          }

          const imageBuffer = await imageResponse.arrayBuffer();
          const uint8Array = new Uint8Array(imageBuffer);

          // Add image caption
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Image ${i + 1}:`,
                  bold: true
                })
              ],
              spacing: { before: 200, after: 100 }
            })
          );

          // Add image to document
          docSections.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: uint8Array,
                  transformation: {
                    width: 500,
                    height: 400
                  }
                })
              ],
              spacing: { after: 200 }
            })
          );
        } catch (error) {
          console.error(`Error adding image ${i + 1}:`, error);
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `[Image ${i + 1} could not be embedded]`,
                  italics: true,
                  color: "999999"
                })
              ],
              spacing: { after: 200 }
            })
          );
        }
      }
    }

    // Add extracted text
    if (extractedText && extractedText.trim()) {
      docSections.push(
        new Paragraph({
          text: "Extracted Text",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        })
      );

      // Split text into paragraphs
      const textParagraphs = extractedText.split('\n\n');
      
      for (const para of textParagraphs) {
        if (para.trim()) {
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: para.trim(),
                  size: 22
                })
              ],
              spacing: { after: 200 }
            })
          );
        }
      }
    }

    // Create the document
    const doc = new Document({
      sections: [{
        properties: {},
        children: docSections
      }]
    });

    // Generate the Word file
    console.log('📦 Generating Word document...');
    const buffer = await Packer.toBuffer(doc);
    
    console.log(`✅ Word document created: ${buffer.byteLength} bytes`);

    // Return the Word file
    return new Response(buffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName.replace('.pdf', '')}_extracted.docx"`
      }
    });

  } catch (error) {
    console.error('❌ Error in pdf-to-word:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to convert PDF to Word document'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
