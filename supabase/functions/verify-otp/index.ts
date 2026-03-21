import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { otp_code, otp_type } = await req.json();

    if (!otp_code || !otp_type) {
      return new Response(JSON.stringify({ error: 'OTP code and type required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find matching OTP
    const { data: otpRecord, error: findError } = await supabaseAdmin
      .from('otp_verifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('otp_type', otp_type)
      .eq('otp_code', otp_code)
      .eq('is_verified', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError || !otpRecord) {
      return new Response(JSON.stringify({ 
        error: 'Invalid or expired verification code. Please try again.' 
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Mark OTP as verified
    await supabaseAdmin
      .from('otp_verifications')
      .update({ is_verified: true })
      .eq('id', otpRecord.id);

    // Update profile verification status
    const updateField = otp_type === 'parent_email' 
      ? { parent_email_verified: true }
      : { student_email_verified: true };

    await supabaseAdmin
      .from('profiles')
      .update(updateField)
      .eq('id', user.id);

    console.log(`OTP verified for ${otp_type} (user: ${user.id})`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${otp_type === 'parent_email' ? 'Parent' : 'Student'} email verified successfully`
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Verify OTP error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
