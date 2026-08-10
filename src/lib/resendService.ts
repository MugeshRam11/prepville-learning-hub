/**
 * Resend Email Integration Service
 * Key: re_CAF5fjsw_BUHR9wnp9MrgayMKZMw8Tc7Z
 */

export const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || 're_CAF5fjsw_BUHR9wnp9MrgayMKZMw8Tc7Z';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send email via Resend API
 */
export const sendResendEmail = async (options: SendEmailOptions) => {
  const { to, subject, html, from = 'The Prep Ville <onboarding@resend.dev>' } = options;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to send email via Resend');
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Resend email error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send OTP Verification email via Resend
 */
export const sendOtpEmailResend = async (email: string, otpCode: string, isParent: boolean = false) => {
  const subject = isParent
    ? 'The Prep Ville - Parent Verification Code'
    : 'The Prep Ville - Email Verification Code';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
        <h2 style="color: #2563eb; margin: 0; font-size: 24px; font-weight: 800;">The Prep Ville</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Learning & Evaluation Platform</p>
      </div>
      <div style="padding: 24px 0; text-align: center;">
        <p style="color: #334155; font-size: 15px; font-weight: 600; margin-bottom: 16px;">
          Your ${isParent ? 'Parent' : 'Student'} verification code is:
        </p>
        <div style="background: #eff6ff; padding: 18px 28px; text-align: center; border-radius: 12px; border: 1px solid #bfdbfe; display: inline-block; margin: 0 auto;">
          <span style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #2563eb; font-family: monospace;">${otpCode}</span>
        </div>
        <p style="color: #64748b; font-size: 13px; margin-top: 20px;">This code will expire in <strong>10 minutes</strong>.</p>
      </div>
      <div style="padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">If you didn't request this code, please ignore this message.</p>
      </div>
    </div>
  `;

  return sendResendEmail({ to: email, subject, html });
};
