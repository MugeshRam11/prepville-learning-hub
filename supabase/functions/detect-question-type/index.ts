import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuestionInput {
  id: string;
  question_text: string;
  diagram_description?: string;
  marks: number;
  answer_key?: string;
}

interface DetectedType {
  questionId: string;
  questionType: 'graph_interaction' | 'drag_drop_match' | 'image_drop_zone' | 'step_builder' | 'math_input' | 'text_input';
  confidence: number;
  reasoning: string;
  interactionData?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questions } = await req.json();
    
    if (!questions || !Array.isArray(questions)) {
      throw new Error('Questions array is required');
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const results: DetectedType[] = [];

    // Process questions in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      
      const detectionPrompt = `You are an expert at analyzing mathematics exam questions and determining the best interactive format for digital assessment.

Analyze each question and determine the most appropriate interactive question type from these options:

1. **graph_interaction** - For questions requiring:
   - Plotting points on a coordinate grid
   - Drawing lines, curves, or functions
   - Working with graphs, coordinates, x/y axes
   - Keywords: plot, draw, graph, coordinate, sketch the line, show on grid

2. **drag_drop_match** - For questions requiring:
   - Matching items (equations to graphs, terms to definitions)
   - Pairing related concepts
   - Keywords: match, pair, connect, correspond

3. **image_drop_zone** - For questions with:
   - Labeling diagrams (triangles, shapes, geometric figures)
   - Placing values on images (angles, measurements)
   - Keywords: label, identify on diagram, mark on figure

4. **step_builder** - For questions requiring:
   - Ordering solution steps
   - Arranging logical sequences
   - Showing working/method marks
   - Keywords: arrange, order the steps, show working, solve step by step

5. **math_input** - For questions requiring:
   - Numerical calculations
   - Algebraic expressions as answers
   - Fraction/decimal/percentage answers
   - Keywords: calculate, find, evaluate, determine, what is the value

6. **text_input** - For questions requiring:
   - Written explanations
   - Descriptive answers
   - Justify, explain, describe type questions

Questions to analyze:
${batch.map((q, idx) => `
[Question ${idx + 1}]
ID: ${q.id}
Text: ${q.question_text}
Diagram/Context: ${q.diagram_description || 'None'}
Marks: ${q.marks}
`).join('\n')}

Respond with ONLY a JSON array (no markdown):
[
  {
    "questionId": "the question id",
    "questionType": "one of the 6 types above",
    "confidence": 0.0 to 1.0,
    "reasoning": "brief explanation why this type was chosen"
  }
]`;

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { 
                role: "system", 
                content: "You are an expert at categorizing mathematics exam questions for digital interactive assessment. Always respond with valid JSON only." 
              },
              { role: "user", content: detectionPrompt }
            ],
            temperature: 0.1,
          }),
        });

        if (response.status === 429) {
          console.error('Rate limit hit, using fallback detection');
          // Fallback to rule-based detection
          for (const q of batch) {
            results.push(fallbackDetection(q));
          }
          continue;
        }

        if (response.status === 402) {
          throw new Error('Payment required - please add funds to your Lovable AI workspace');
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error('AI detection error:', errorText);
          // Fallback to rule-based detection
          for (const q of batch) {
            results.push(fallbackDetection(q));
          }
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        
        try {
          const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
          const detected = JSON.parse(cleanContent);
          
          if (Array.isArray(detected)) {
            results.push(...detected);
          }
        } catch (parseError) {
          console.error('Failed to parse AI response:', content);
          // Fallback
          for (const q of batch) {
            results.push(fallbackDetection(q));
          }
        }

      } catch (batchError) {
        console.error('Batch processing error:', batchError);
        for (const q of batch) {
          results.push(fallbackDetection(q));
        }
      }

      // Small delay between batches to avoid rate limits
      if (i + batchSize < questions.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`Detected types for ${results.length} questions`);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in detect-question-type:', error);
    
    const status = error instanceof Error && error.message.includes('Payment required') ? 402 : 
                   error instanceof Error && error.message.includes('Rate limit') ? 429 : 500;
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Fallback rule-based detection
function fallbackDetection(question: QuestionInput): DetectedType {
  const text = question.question_text.toLowerCase();
  const diagram = (question.diagram_description || '').toLowerCase();
  
  // Graph interaction
  if (
    text.includes('plot') ||
    text.includes('draw the graph') ||
    text.includes('draw the line') ||
    text.includes('sketch') ||
    diagram.includes('coordinate') ||
    diagram.includes('x-axis') ||
    diagram.includes('parabola')
  ) {
    return {
      questionId: question.id,
      questionType: 'graph_interaction',
      confidence: 0.7,
      reasoning: 'Contains graph/plot keywords (fallback detection)'
    };
  }
  
  // Drag & Drop
  if (text.includes('match') || text.includes('pair') || text.includes('corresponding')) {
    return {
      questionId: question.id,
      questionType: 'drag_drop_match',
      confidence: 0.7,
      reasoning: 'Contains matching keywords (fallback detection)'
    };
  }
  
  // Step builder
  if (text.includes('arrange') || text.includes('order') || text.includes('steps')) {
    return {
      questionId: question.id,
      questionType: 'step_builder',
      confidence: 0.7,
      reasoning: 'Contains step ordering keywords (fallback detection)'
    };
  }
  
  // Math input (most common for calculations)
  if (
    text.includes('calculate') ||
    text.includes('find') ||
    text.includes('evaluate') ||
    text.includes('determine') ||
    text.includes('solve')
  ) {
    return {
      questionId: question.id,
      questionType: 'math_input',
      confidence: 0.7,
      reasoning: 'Contains calculation keywords (fallback detection)'
    };
  }
  
  // Default to text input
  return {
    questionId: question.id,
    questionType: 'text_input',
    confidence: 0.5,
    reasoning: 'Default text input (fallback detection)'
  };
}
