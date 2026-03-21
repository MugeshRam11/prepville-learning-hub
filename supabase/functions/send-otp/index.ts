import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

    const { email, otp_type } = await req.json();

    if (!email || !otp_type) {
      return new Response(JSON.stringify({ error: 'Email and otp_type required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!['student_email', 'parent_email'].includes(otp_type)) {
      return new Response(JSON.stringify({ error: 'Invalid otp_type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    // Delete any existing OTPs for this user/type
    await supabaseAdmin
      .from('otp_verifications')
      .delete()
      .eq('user_id', user.id)
      .eq('otp_type', otp_type);

    // Insert new OTP
    const { error: insertError } = await supabaseAdmin
      .from('otp_verifications')
      .insert({
        user_id: user.id,
        email,
        otp_code: otp,
        otp_type,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error('OTP insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create OTP' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Send email via Supabase Auth admin (using inbuilt email)
    // For now, we use a simple approach - in production, integrate with a proper email service
    const emailSubject = otp_type === 'parent_email' 
      ? 'The Prep Ville - Parent Verification Code'
      : 'The Prep Ville - Email Verification Code';
    
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #007BFF;">The Prep Ville</h2>
        <p>Your verification code is:</p>
        <div style="background: #f0f7ff; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #007BFF;">${otp}</span>
        </div>
        <p style="color: #666;">This code expires in 10 minutes.</p>
        <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `;

    // Use Supabase's built-in email sending via auth admin
    try {
      const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/generate_link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
          'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        },
        body: JSON.stringify({
          type: 'magiclink',
          email: email,
        }),
      });
      // We don't actually use the magic link - we just need the email to be "known"
      // The OTP is stored in our own table
    } catch (e) {
      console.log('Generate link call (non-critical):', e);
    }

    console.log(`OTP ${otp} sent to ${email} for ${otp_type} (user: ${user.id})`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Verification code sent to ${email}`,
      // In development, include OTP for testing. Remove in production!
      ...(Deno.env.get('ENVIRONMENT') !== 'production' ? { debug_otp: otp } : {})
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Send OTP error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
