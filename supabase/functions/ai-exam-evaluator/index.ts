import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvaluationRequest {
  questionId: string;
  questionText: string;
  referenceAnswer: string;
  studentAnswer: string;
  marks: number;
  subject: string;
  topic?: string;
  questionImageUrl?: string;
}

interface EvaluationResponse {
  questionId: string;
  inputAnswer: string;
  referenceAnswer: string;
  marksAwarded: number;
  totalMarks: number;
  evaluationType: string;
  comment: string;
  feedback: string;
  biasLevel: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questions }: { questions: EvaluationRequest[] } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const evaluations: EvaluationResponse[] = [];

    for (const question of questions) {
      const evaluationPrompt = `You are an AI examiner evaluating student exam answers. Follow this process:

**STEP 1: ANALYZE THE QUESTION**
First, carefully analyze the question and solve it yourself to determine the correct answer.
${question.questionImageUrl ? 'The question includes an image (graph/diagram) that you must analyze.' : ''}

**STEP 2: COMPARE WITH STUDENT ANSWER**
Compare your solution with the student's answer to evaluate correctness.

**STEP 3: ASSIGN MARKS FAIRLY**
Assign marks based on correctness:
- Fully correct = ${question.marks} marks (100%)
- Partially correct = ${Math.round(question.marks * 0.5)} to ${question.marks - 1} marks
- Incorrect = 0 to ${Math.round(question.marks * 0.4)} marks

**Question:** ${question.questionText}
**Reference Answer (for guidance):** ${question.referenceAnswer}
**Student Answer:** ${question.studentAnswer}
**Total Marks:** ${question.marks}
**Subject:** ${question.subject}
${question.topic ? `**Topic:** ${question.topic}` : ''}

Respond ONLY with a JSON object:
{
  "marksAwarded": <number>,
  "evaluationType": "Strict|Moderate|Lenient|AI-assisted",
  "comment": "Detailed examiner comment on correctness and mistakes",
  "feedback": "Excellent|Above Average|Average|Needs Improvement",
  "biasLevel": <number between 0.0 and 1.0>
}`;

      console.log(`Evaluating question ${question.questionId}...`);

      const messages: any[] = [
        { 
          role: 'system', 
          content: 'You are an expert examiner. First solve the question yourself, then evaluate the student answer by comparing it with your solution and the reference answer.' 
        }
      ];

      // If question has an image, include it in the message
      if (question.questionImageUrl) {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'text',
              text: evaluationPrompt
            },
            {
              type: 'image_url',
              image_url: {
                url: question.questionImageUrl
              }
            }
          ]
        });
      } else {
        messages.push({ role: 'user', content: evaluationPrompt });
      }

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages,
          temperature: 0.3
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', response.status, errorText);
        throw new Error(`AI evaluation failed: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;

      if (!aiResponse) {
        throw new Error('No evaluation generated');
      }

      console.log(`Raw AI response for question ${question.questionId}:`, aiResponse);

      let evaluationData;
      try {
        const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || aiResponse.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
        evaluationData = JSON.parse(jsonString);
      } catch (e) {
        console.error('Failed to parse evaluation JSON:', e);
        // Fallback: basic string matching
        const normalized = (text: string) => text.toLowerCase().trim().replace(/[.,!?;:\s]+/g, ' ');
        const studentNorm = normalized(question.studentAnswer);
        const refNorm = normalized(question.referenceAnswer);
        const isCorrect = studentNorm === refNorm || studentNorm.includes(refNorm) || refNorm.includes(studentNorm);
        
        evaluationData = {
          marksAwarded: isCorrect ? question.marks : 0,
          evaluationType: 'AI-assisted',
          comment: isCorrect ? 'Answer matches the reference answer.' : 'Answer does not match the reference answer.',
          feedback: isCorrect ? 'Excellent' : 'Needs Improvement',
          biasLevel: 0.5
        };
      }

      evaluations.push({
        questionId: question.questionId,
        inputAnswer: question.studentAnswer,
        referenceAnswer: question.referenceAnswer,
        marksAwarded: evaluationData.marksAwarded,
        totalMarks: question.marks,
        evaluationType: evaluationData.evaluationType,
        comment: evaluationData.comment,
        feedback: evaluationData.feedback,
        biasLevel: evaluationData.biasLevel
      });
    }

    console.log(`Evaluation complete for ${evaluations.length} questions`);

    return new Response(
      JSON.stringify({ evaluations }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in ai-exam-evaluator function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});