import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// Diagram type detection and enhanced prompt generation
function buildDiagramPrompt(description: string, questionText: string, diagramType?: string): string {
  const detectedType = diagramType || detectDiagramType(description + ' ' + questionText);
  
  const baseStyle = `
CRITICAL REQUIREMENTS:
- Ultra clean, professional educational diagram
- Pure white background for printing
- High contrast black lines and text
- NO watermarks, NO AI artifacts, NO gradients
- Precise mathematical accuracy
- Clear, readable labels (14pt minimum)
- Suitable for examination paper`;

  const typePrompts: Record<string, string> = {
    'coordinate_plane': `
Create a precise COORDINATE PLANE/CARTESIAN GRID diagram:
- Draw clean X and Y axes with arrows at ends
- Include evenly spaced grid lines (light gray)
- Number the axes clearly (-5 to 5 or as needed)
- Mark origin (0,0) clearly
- If function/line specified, plot it accurately with correct slope/intercept
- Use distinct colors for different lines if multiple
${baseStyle}`,

    'graph_function': `
Create a mathematical FUNCTION GRAPH diagram:
- Precise coordinate system with labeled axes
- Smooth, accurate curve for the function
- Mark key points (intercepts, maxima, minima, asymptotes)
- Include equation label near the curve
- Use dotted lines to show asymptotes if any
${baseStyle}`,

    'venn_diagram': `
Create a clear VENN DIAGRAM:
- Draw perfect circles with thin black outlines
- Clear overlap regions if multiple sets
- Label each set clearly outside the circles
- Shade or color regions as needed (use light pastel fills)
- Include universal set rectangle if needed
- Label elements in appropriate regions
${baseStyle}`,

    'bar_chart': `
Create a professional BAR CHART/GRAPH:
- Clean axes with clear labels
- Uniform bar widths with small gaps between
- Clear value labels on or above bars
- Legend if multiple data series
- Title at top
- Y-axis starts at 0 with regular intervals
${baseStyle}`,

    'pie_chart': `
Create a clean PIE CHART:
- Perfect circle divided into segments
- Clear labels with percentages
- Distinct but professional colors for segments
- Legend with category names
- Title above the chart
${baseStyle}`,

    'line_graph': `
Create a precise LINE GRAPH:
- Clean axes with labels and units
- Data points marked clearly
- Smooth line connecting points
- Multiple lines in different colors with legend
- Grid lines for easy reading
${baseStyle}`,

    'geometric': `
Create an accurate GEOMETRIC FIGURE:
- Precise shapes with clean lines
- All angles and lengths labeled where relevant
- Right angle symbols for 90° angles
- Parallel marks for parallel lines
- Tick marks for equal lengths
- Points labeled with capital letters (A, B, C...)
${baseStyle}`,

    'triangle': `
Create a precise TRIANGLE diagram:
- Clean, straight sides
- Vertices labeled (A, B, C)
- Side lengths labeled if given
- Angles marked with arcs and values
- Right angle symbol if 90°
- Height/altitude shown with dashed line if relevant
${baseStyle}`,

    'circle_geometry': `
Create a CIRCLE GEOMETRY diagram:
- Perfect circle with thin outline
- Center point marked
- Radius, diameter, chord labeled as needed
- Tangent lines shown clearly
- Sectors/segments shaded distinctly
- Angle at center marked with arc
${baseStyle}`,

    'tree_diagram': `
Create a clear PROBABILITY TREE DIAGRAM:
- Branches from left to right
- Each branch labeled with probability
- Outcomes at end of branches
- Branches at same level aligned
- Multiplication shown along paths
${baseStyle}`,

    'number_line': `
Create a NUMBER LINE diagram:
- Horizontal line with arrow at right end
- Evenly spaced tick marks
- Clear number labels below
- Points or intervals marked as needed
- Open/closed circles for inequalities
${baseStyle}`,

    'flowchart': `
Create a clear FLOWCHART diagram:
- Standard flowchart shapes (rectangles, diamonds, ovals)
- Clear arrows showing flow direction
- Text inside shapes
- Start/End ovals, Decision diamonds, Process rectangles
- Clean connecting lines
${baseStyle}`,

    'table': `
Create a clean DATA TABLE:
- Clear grid lines
- Header row highlighted or bold
- Aligned columns
- Readable cell content
- Title above table
${baseStyle}`,

    'default': `
Create a clear EDUCATIONAL DIAGRAM:
- Professional, exam-quality illustration
- Clear labels and annotations
- Precise geometric accuracy where needed
- Black lines on white background
${baseStyle}`
  };

  const selectedPrompt = typePrompts[detectedType] || typePrompts['default'];
  
  return `${selectedPrompt}

DIAGRAM CONTEXT:
Question: ${questionText}

SPECIFIC REQUIREMENTS:
${description}

OUTPUT: Generate a single, clean, high-resolution diagram image (1024x1024 recommended).`;
}

function detectDiagramType(text: string): string {
  const lower = text.toLowerCase();
  
  if (lower.includes('coordinate') || lower.includes('cartesian') || lower.includes('x-axis') || lower.includes('y-axis') || lower.includes('plot')) {
    return 'coordinate_plane';
  }
  if (lower.includes('function') || lower.includes('f(x)') || lower.includes('parabola') || lower.includes('curve')) {
    return 'graph_function';
  }
  if (lower.includes('venn')) {
    return 'venn_diagram';
  }
  if (lower.includes('bar chart') || lower.includes('bar graph') || lower.includes('histogram')) {
    return 'bar_chart';
  }
  if (lower.includes('pie chart') || lower.includes('pie graph')) {
    return 'pie_chart';
  }
  if (lower.includes('line graph') || lower.includes('time series')) {
    return 'line_graph';
  }
  if (lower.includes('triangle') || lower.includes('△')) {
    return 'triangle';
  }
  if (lower.includes('circle') && (lower.includes('radius') || lower.includes('diameter') || lower.includes('chord') || lower.includes('tangent'))) {
    return 'circle_geometry';
  }
  if (lower.includes('angle') || lower.includes('parallel') || lower.includes('perpendicular') || lower.includes('polygon') || lower.includes('quadrilateral')) {
    return 'geometric';
  }
  if (lower.includes('tree diagram') || lower.includes('probability tree')) {
    return 'tree_diagram';
  }
  if (lower.includes('number line')) {
    return 'number_line';
  }
  if (lower.includes('flowchart') || lower.includes('flow chart') || lower.includes('process')) {
    return 'flowchart';
  }
  if (lower.includes('table') || lower.includes('data')) {
    return 'table';
  }
  
  return 'default';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, questionNumber, diagramType, questionText } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Generating diagram for question ${questionNumber}, type: ${diagramType || 'auto-detect'}`);

    // Build enhanced prompt based on diagram type
    const enhancedPrompt = buildDiagramPrompt(prompt, questionText || '', diagramType);

    // Use Gemini image generation model with enhanced prompt
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        modalities: ['image', 'text']
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Image generation failed:', response.status, errorText);
      throw new Error(`Image generation failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Generation response received');

    // Extract base64 image from response
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error('No image in response:', JSON.stringify(data).substring(0, 500));
      throw new Error('No image generated');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Convert base64 to blob
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // Generate filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const filename = `generated-diagram-q${questionNumber}-${timestamp}-${random}.png`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('question-images')
      .upload(filename, imageBytes, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('question-images')
      .getPublicUrl(filename);

    console.log(`Diagram generated and uploaded: ${filename}`);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: urlData.publicUrl,
        filename
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Generate diagram error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
