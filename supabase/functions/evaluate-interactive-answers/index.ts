import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Answer {
  questionId: string;
  answer: any;
  questionType: string;
}

interface EvaluationResult {
  questionId: string;
  isCorrect: boolean;
  partialCredit: number; // 0-1 scale
  marksAwarded: number;
  totalMarks: number;
  feedback: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { answers, testId } = await req.json();
    
    if (!answers || !Array.isArray(answers)) {
      throw new Error('Answers array is required');
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch questions with answer keys
    const questionIds = answers.map(a => a.questionId);
    const { data: questions, error: questionsError } = await supabase
      .from('mock_questions')
      .select('id, question_text, answer_key, marks, diagram_description')
      .in('id', questionIds);

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      throw new Error('Failed to fetch questions');
    }

    const results: EvaluationResult[] = [];
    let totalScore = 0;
    let totalPossibleMarks = 0;

    for (const studentAnswer of answers) {
      const question = questions?.find(q => q.id === studentAnswer.questionId);
      
      if (!question) {
        console.warn(`Question ${studentAnswer.questionId} not found`);
        continue;
      }

      totalPossibleMarks += question.marks;

      // Use AI to evaluate the answer
      const evaluationPrompt = `You are an IB MYP Mathematics exam evaluator. Evaluate the student's answer against the expected answer.

Question: ${question.question_text}

Expected Answer/Key: ${question.answer_key || 'Not provided - use mathematical logic to verify'}

Diagram/Context: ${question.diagram_description || 'None'}

Student's Answer: ${JSON.stringify(studentAnswer.answer)}

Question Type: ${studentAnswer.questionType}

Evaluate the answer and respond with ONLY a JSON object (no markdown, no explanation):
{
  "isCorrect": boolean,
  "partialCredit": number between 0 and 1 (0 = wrong, 0.5 = partially correct, 1 = fully correct),
  "feedback": "Brief constructive feedback for the student"
}

For graph_interaction: Check if points/lines match the expected coordinates and equation.
For math_input: Check if the numerical/algebraic answer is mathematically equivalent.
For step_builder: Check if steps are in logical order.
For drag_drop_match: Check if matches are correct.
For text_input: Evaluate based on key concepts.`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                content: "You are an expert mathematics exam evaluator. Respond only with valid JSON." 
              },
              { role: "user", content: evaluationPrompt }
            ],
            temperature: 0.1,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error('AI evaluation error:', errorText);
          
          // Fallback evaluation
          results.push({
            questionId: studentAnswer.questionId,
            isCorrect: false,
            partialCredit: 0,
            marksAwarded: 0,
            totalMarks: question.marks,
            feedback: "Unable to evaluate automatically. Please review with your teacher."
          });
          continue;
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || '';
        
        // Parse the JSON response
        let evaluation;
        try {
          // Remove markdown code blocks if present
          const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
          evaluation = JSON.parse(cleanContent);
        } catch (parseError) {
          console.error('Failed to parse AI response:', content);
          evaluation = {
            isCorrect: false,
            partialCredit: 0,
            feedback: "Evaluation pending manual review."
          };
        }

        const marksAwarded = Math.round(question.marks * evaluation.partialCredit * 10) / 10;
        totalScore += marksAwarded;

        results.push({
          questionId: studentAnswer.questionId,
          isCorrect: evaluation.isCorrect,
          partialCredit: evaluation.partialCredit,
          marksAwarded,
          totalMarks: question.marks,
          feedback: evaluation.feedback
        });

      } catch (evalError) {
        console.error('Evaluation error for question:', studentAnswer.questionId, evalError);
        results.push({
          questionId: studentAnswer.questionId,
          isCorrect: false,
          partialCredit: 0,
          marksAwarded: 0,
          totalMarks: question.marks,
          feedback: "Error during evaluation. Please try again."
        });
      }
    }

    const response = {
      results,
      summary: {
        totalScore,
        totalPossibleMarks,
        percentage: totalPossibleMarks > 0 ? Math.round((totalScore / totalPossibleMarks) * 100) : 0,
        questionsEvaluated: results.length
      }
    };

    console.log('Evaluation complete:', response.summary);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in evaluate-interactive-answers:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
