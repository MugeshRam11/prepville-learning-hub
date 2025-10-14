import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, message, conversationHistory } = await req.json();
    
    const HUGGINGFACE_API_KEY = Deno.env.get('HUGGINGFACE_API_KEY');
    if (!HUGGINGFACE_API_KEY) {
      throw new Error('HUGGINGFACE_API_KEY is not configured');
    }

    // Build context-aware prompt
    const systemPrompt = `You are an expert ${subject} tutor helping students prepare for exams. Your role is to:
- Provide clear, step-by-step explanations
- Use simple language suitable for exam preparation
- Give practical examples and study tips
- Break down complex concepts into easy-to-understand parts
- Encourage students and build their confidence

Keep responses concise (2-3 paragraphs max) and focused on the question asked.`;

    // Build conversation context
    let conversationContext = systemPrompt + "\n\n";
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext += "Previous conversation:\n";
      conversationHistory.slice(-4).forEach((msg: any) => {
        conversationContext += `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content}\n`;
      });
    }
    conversationContext += `\nStudent: ${message}\nTutor:`;

    console.log('Calling Hugging Face API for subject:', subject);

    const response = await fetch(
      'https://api-inference.huggingface.co/models/google/flan-t5-large',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: conversationContext,
          parameters: {
            max_new_tokens: 250,
            temperature: 0.7,
            top_p: 0.9,
            return_full_text: false,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face API error:', response.status, errorText);
      
      if (response.status === 503) {
        return new Response(
          JSON.stringify({ 
            error: 'The AI model is currently loading. Please try again in a moment.' 
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const tutorResponse = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;

    if (!tutorResponse) {
      throw new Error('No response generated from the model');
    }

    console.log('Successfully generated response');

    return new Response(
      JSON.stringify({ 
        response: tutorResponse,
        subject: subject 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in chatbot function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        details: 'Please try again or contact support if the issue persists.'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
