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

    const isParent = otp_type === 'parent_email';
    const emailSubject = isParent 
      ? 'The Prep Ville - Parent Verification Code'
      : 'The Prep Ville - Email Verification Code';
    
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);">
          <!-- Header Banner with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%); padding: 36px 32px 28px 32px; text-align: center;">
              <img src="https://student.theprepville.com/logo.png" alt="The Prep Ville" width="170" style="max-width: 170px; height: auto; display: inline-block;" onerror="this.style.display='none';" />
              <h1 style="color: #ffffff; margin: 12px 0 0 0; font-size: 22px; font-weight: 800; tracking-tight: -0.02em;">The Prep Ville</h1>
              <span style="display: inline-block; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); color: #e0e7ff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 14px; border-radius: 9999px; margin-top: 10px;">
                Learning & Evaluation Platform
              </span>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px; background-color: #ffffff;">
              <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0;">${isParent ? 'Parent Verification Code' : 'Email Verification Code'} 🔐</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
                Here is your 6-digit verification code to complete ${isParent ? 'parent email verification' : 'email verification'} for <strong>The Prep Ville</strong>:
              </p>

              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%); border: 2px solid #6366f1; border-radius: 16px; padding: 22px; text-align: center; margin: 24px 0;">
                <span style="font-size: 11px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 8px;">Your Verification Code</span>
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 12px; color: #4338ca; display: block; margin-left: 12px;">${otp}</span>
              </div>

              <!-- Security Warning -->
              <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #64748b;">
                ⏱️ <strong>Time Sensitive:</strong> This code expires in <strong>10 minutes</strong>. Please do not share this code with anyone.
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; line-height: 1.5;">
              <p style="margin: 0 0 6px 0; font-weight: 600; color: #64748b;">The Prep Ville Learning Hub</p>
              <p style="margin: 0 0 10px 0;">Official Student & Admin Portal • <a href="https://student.theprepville.com" style="color: #4f46e5; text-decoration: none; font-weight: 600;">student.theprepville.com</a></p>
              <p style="margin: 0; font-size: 11px; color: #cbd5e1;">© 2026 The Prep Ville. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
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
          from: 'The Prep Ville <no-reply@respond.theprepville.com>',
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

    console.log(`[Resend OTP Dispatch] Code ${otp} sent to ${email} for ${otp_type} (user: ${user.id})`);

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
