import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to validate authentication
async function validateAuth(req: Request): Promise<{ user: any; error: string | null }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { user: null, error: 'Missing authorization header' };
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { user: null, error: 'Server configuration error' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const token = authHeader.replace('Bearer ', '');
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return { user: null, error: 'Invalid authentication token' };
  }

  return { user, error: null };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const { user, error: authError } = await validateAuth(req);
    if (authError) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: authError }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating daily motivation for user:', user.id);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { userName, date } = await req.json();
    
    // Generate motivational message
    const messageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a motivational coach for students. Generate short, inspiring daily wishes and motivational messages for students.'
          },
          {
            role: 'user',
            content: `Generate a unique motivational message for ${userName || 'a student'} for ${date}. Include a warm greeting, an inspiring quote or message about learning and growth (2-3 sentences max), and end with encouragement. Keep it positive, energetic, and education-focused.`
          }
        ],
      }),
    });

    if (!messageResponse.ok) {
      throw new Error(`Message generation failed: ${messageResponse.status}`);
    }

    const messageData = await messageResponse.json();
    const motivationalMessage = messageData.choices[0].message.content;

    // Generate illustration
    const themes = [
      'a student climbing a mountain of books toward a bright sunrise',
      'a rocket launching into space with books as fuel',
      'a lightbulb blooming like a flower with mathematical symbols around it',
      'a student planting seeds that grow into trees of knowledge',
      'colorful butterflies emerging from an open book',
      'a pathway of stars leading to a graduation cap in the sky',
      'a phoenix rising from books with vibrant flames of wisdom',
      'a tree with branches made of pencils bearing fruit of success'
    ];
    
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    
    const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `Create a beautiful, colorful, uplifting illustration: ${randomTheme}. Style: modern, vibrant, inspiring, educational theme, suitable for students. Bright colors, positive energy.`
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!imageResponse.ok) {
      console.error('Image generation failed:', imageResponse.status);
      // Return message without image if image generation fails
      return new Response(
        JSON.stringify({
          message: motivationalMessage,
          imageUrl: null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    return new Response(
      JSON.stringify({
        message: motivationalMessage,
        imageUrl: imageUrl || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in daily-motivation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
