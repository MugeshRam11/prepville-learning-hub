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

    const emailSubject = otp_type === 'parent_email' 
      ? 'The Prep Ville - Parent Verification Code'
      : 'The Prep Ville - Email Verification Code';
    
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; padding-bottom: 16px; border-b: 1px solid #e2e8f0;">
          <h2 style="color: #2563eb; margin: 0; font-size: 24px; font-weight: 800;">The Prep Ville</h2>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Learning & Evaluation Platform</p>
        </div>
        <div style="padding: 24px 0; text-align: center;">
          <p style="color: #334155; font-size: 15px; font-weight: 600; margin-bottom: 16px;">Your verification code is:</p>
          <div style="background: #eff6ff; padding: 18px 24px; text-align: center; border-radius: 12px; border: 1px border-blue-200; display: inline-block; margin: 0 auto;">
            <span style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #2563eb; font-family: monospace;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 13px; margin-top: 20px;">This verification code will expire in <strong>10 minutes</strong>.</p>
        </div>
        <div style="padding-top: 16px; border-t: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">If you didn't request this code, please ignore this email.</p>
        </div>
      </div>
    `;

    // Send email via Resend API
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || 're_CAF5fjsw_BUHR9wnp9MrgayMKZMw8Tc7Z';
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'The Prep Ville <onboarding@resend.dev>',
          to: [email],
          subject: emailSubject,
          html: emailBody,
        }),
      });

      const resendData = await resendRes.json();
      console.log('Resend email response:', resendData);
    } catch (e) {
      console.error('Error sending Resend email:', e);
    }

    console.log(`OTP ${otp} sent to ${email} for ${otp_type} (user: ${user.id})`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Verification code sent to ${email}`,
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
