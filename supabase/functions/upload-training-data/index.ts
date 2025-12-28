import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to validate authentication and admin role
async function validateAdminAuth(req: Request): Promise<{ user: any; error: string | null }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { user: null, error: 'Missing authorization header' };
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return { user: null, error: 'Server configuration error' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const token = authHeader.replace('Bearer ', '');
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return { user: null, error: 'Invalid authentication token' };
  }

  // Check if user is admin
  const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await serviceSupabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { user: null, error: 'Admin access required' };
  }

  return { user, error: null };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate admin authentication
    const { user, error: authError } = await validateAdminAuth(req);
    if (authError) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: authError }),
        { status: authError === 'Admin access required' ? 403 : 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin user uploading training data:', user.id);

    const { jsonlData } = await req.json();
    
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabaseClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Parse JSONL (each line is a separate JSON object)
    const lines = jsonlData.split('\n').filter((line: string) => line.trim());
    const knowledgeEntries: any[] = [];

    for (const line of lines) {
      try {
        const conversation = JSON.parse(line);
        const messages = conversation.messages;
        
        // Extract user questions and assistant responses
        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          
          if (msg.role === 'user' && i + 1 < messages.length && messages[i + 1].role === 'assistant') {
            const userQuestion = msg.content;
            const assistantResponse = messages[i + 1].content;
            
            // Extract subject/topic from question or use generic
            let subject = 'Math';
            let topic = 'General';
            let difficulty = 'Medium';
            
            // Try to identify subject from content
            if (userQuestion.toLowerCase().includes('algebra') || userQuestion.toLowerCase().includes('equation')) {
              topic = 'Algebra';
            } else if (userQuestion.toLowerCase().includes('geometry')) {
              topic = 'Geometry';
            } else if (userQuestion.toLowerCase().includes('calculus') || userQuestion.toLowerCase().includes('derivative')) {
              topic = 'Calculus';
            } else if (userQuestion.toLowerCase().includes('programming') || userQuestion.toLowerCase().includes('python')) {
              subject = 'Computer Science';
              topic = 'Programming';
            }
            
            // Create knowledge entry
            const entry = {
              subject: subject,
              topic: topic,
              difficulty_level: difficulty,
              question_text: userQuestion.substring(0, 500), // Limit length
              correct_answer: 'See explanation',
              explanation: assistantResponse.substring(0, 2000), // Limit length
              common_mistakes: JSON.stringify([
                'Not breaking down complex concepts',
                'Skipping fundamental steps',
                'Not asking clarifying questions'
              ]),
              hints: JSON.stringify([
                'Start with what you know',
                'Break the problem into smaller parts',
                'Look for patterns or similarities to previous problems'
              ]),
              related_concepts: ['Problem Solving', 'Step-by-Step Learning', 'Conceptual Understanding']
            };
            
            knowledgeEntries.push(entry);
          }
        }
      } catch (parseError) {
        console.error('Error parsing line:', parseError);
      }
    }

    // Insert into knowledge base in batches
    const batchSize = 10;
    let inserted = 0;
    
    for (let i = 0; i < knowledgeEntries.length; i += batchSize) {
      const batch = knowledgeEntries.slice(i, i + batchSize);
      
      const { error } = await supabaseClient
        .from('ai_knowledge_base')
        .insert(batch);
      
      if (error) {
        console.error('Error inserting batch:', error);
      } else {
        inserted += batch.length;
      }
    }

    console.log(`Successfully inserted ${inserted} knowledge entries by admin ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        inserted: inserted,
        total: knowledgeEntries.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in upload-training-data function:', error);
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
