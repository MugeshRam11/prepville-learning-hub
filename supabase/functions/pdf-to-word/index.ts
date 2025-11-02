import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from "npm:docx@8.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AI-powered OCR and content extraction
async function extractContentWithAI(imageBase64: string): Promise<{
  text: string;
  hasTable: boolean;
  hasDiagram: boolean;
  description: string;
}> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.warn("LOVABLE_API_KEY not found, skipping AI extraction");
    return { text: "", hasTable: false, hasDiagram: false, description: "" };
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image and extract ALL content with high accuracy:
1. Extract ALL text exactly as shown (including numbers, symbols, formulas)
2. Identify if there are tables, diagrams, or charts
3. For tables: extract the structure and all cell values
4. For diagrams: provide detailed description
5. Preserve mathematical notation and special characters

Return in JSON format:
{
  "text": "all extracted text",
  "hasTable": true/false,
  "hasDiagram": true/false,
  "description": "description of visual elements"
}`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${imageBase64}`
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      console.error(`AI extraction failed: ${response.status}`);
      return { text: "", hasTable: false, hasDiagram: false, description: "" };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Try to parse JSON response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          text: parsed.text || "",
          hasTable: parsed.hasTable || false,
          hasDiagram: parsed.hasDiagram || false,
          description: parsed.description || ""
        };
      }
    } catch {
      // If JSON parsing fails, return the raw content as text
      return { text: content, hasTable: false, hasDiagram: false, description: "" };
    }

    return { text: content, hasTable: false, hasDiagram: false, description: "" };
  } catch (error) {
    console.error("AI extraction error:", error);
    return { text: "", hasTable: false, hasDiagram: false, description: "" };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📄 Starting PDF to Word conversion with AI OCR...');
    
    const { extractedText, extractedImages, fileName, pageImages } = await req.json();
    
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

    // Process pages with AI OCR
    if (pageImages && pageImages.length > 0) {
      docSections.push(
        new Paragraph({
          text: "AI-Extracted Content",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        })
      );

      for (let i = 0; i < pageImages.length; i++) {
        const pageData = pageImages[i];
        console.log(`📄 Processing page ${i + 1} with AI OCR...`);

        try {
          // Perform AI OCR on the page image
          const ocrResult = await extractContentWithAI(pageData.base64);
          
          // Add page header
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Page ${i + 1}`,
                  bold: true,
                  size: 28
                })
              ],
              spacing: { before: 300, after: 200 }
            })
          );

          // Add OCR extracted text
          if (ocrResult.text) {
            const textParagraphs = ocrResult.text.split('\n');
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
                    spacing: { after: 150 }
                  })
                );
              }
            }
          }

          // Add description if diagrams or tables detected
          if (ocrResult.hasDiagram || ocrResult.hasTable) {
            docSections.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `📊 Content Type: ${ocrResult.hasTable ? 'Table ' : ''}${ocrResult.hasDiagram ? 'Diagram' : ''}`,
                    bold: true,
                    color: "0066cc"
                  })
                ],
                spacing: { before: 200, after: 100 }
              })
            );

            if (ocrResult.description) {
              docSections.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: ocrResult.description,
                      italics: true,
                      size: 20
                    })
                  ],
                  spacing: { after: 200 }
                })
              );
            }
          }

          // Fetch and add the page image
          if (pageData.url) {
            try {
              const imageResponse = await fetch(pageData.url);
              if (imageResponse.ok) {
                const imageBuffer = await imageResponse.arrayBuffer();
                const uint8Array = new Uint8Array(imageBuffer);

                docSections.push(
                  new Paragraph({
                    children: [
                      new ImageRun({
                        data: uint8Array,
                        transformation: {
                          width: 550,
                          height: 700
                        }
                      })
                    ],
                    spacing: { before: 200, after: 400 }
                  })
                );
              }
            } catch (error) {
              console.error(`Error adding page ${i + 1} image:`, error);
            }
          }

        } catch (error) {
          console.error(`Error processing page ${i + 1}:`, error);
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `[Page ${i + 1} could not be processed]`,
                  italics: true,
                  color: "ff0000"
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
