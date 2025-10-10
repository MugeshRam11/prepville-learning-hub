import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BackfillRequest {
  userId?: string;
  startDate: string; // YYYY-MM-DD format
  endDate?: string; // YYYY-MM-DD format, defaults to today
}

Deno.serve(async (req) => {
  console.log('Backfill streak function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get user from auth header
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid or missing user authentication');
    }

    const body: BackfillRequest = await req.json();
    
    if (!body.startDate) {
      throw new Error('startDate is required (YYYY-MM-DD format)');
    }

    // Use the authenticated user's ID or allow override for admins
    const targetUserId = body.userId || user.id;
    const startDate = body.startDate;
    const endDate = body.endDate || new Date().toISOString().split('T')[0];

    console.log(`Backfilling streak for user ${targetUserId} from ${startDate} to ${endDate}`);

    // Call the backfill function
    const { data, error } = await supabase.rpc('backfill_user_streak', {
      user_uuid: targetUserId,
      start_date: startDate,
      end_date: endDate
    });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Backfill completed:', data);

    const result = data && data.length > 0 ? data[0] : { processed_days: 0, final_streak: 0, final_best: 0 };

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully backfilled ${result.processed_days} days of streak data`,
        data: {
          processedDays: result.processed_days,
          finalStreak: result.final_streak,
          finalBest: result.final_best
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in backfill-streak function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});