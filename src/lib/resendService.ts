/**
 * Resend Email Integration Service with Branded Templates & Logging
 * Sender: The Prep Ville <no-reply@respond.theprepville.com>
 * Note: Direct browser dispatch requires VITE_RESEND_API_KEY.
 * For production security, email dispatch should be executed via Supabase Edge Functions.
 */

import {
  generateSignupConfirmationEmail,
  generateOtpEmail,
  generatePasswordResetEmail,
  RESEND_DEFAULT_SENDER,
} from './emailTemplates';

export const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || '';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send email via Resend API with logging
 */
export const sendResendEmail = async (options: SendEmailOptions) => {
  const { to, subject, html, from = RESEND_DEFAULT_SENDER } = options;

  if (!RESEND_API_KEY) {
    console.warn('[Resend Email Warning] VITE_RESEND_API_KEY is not configured on the client. Email dispatch suppressed.');
    return { success: false, error: 'Email service client configuration missing' };
  }

  console.log(`[Resend Email Dispatch] Sending "${subject}" to:`, to);

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
      console.error('[Resend Email Error]', data);
      throw new Error(data.message || 'Failed to send email via Resend');
    }

    console.log('[Resend Email Success] Delivered message ID:', data.id);
    return { success: true, data };
  } catch (error: any) {
    console.error('[Resend Email Exception]', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send Signup Confirmation email via Resend
 */
export const sendSignupConfirmationEmailResend = async (email: string, confirmUrl: string, name?: string) => {
  const template = generateSignupConfirmationEmail({ name, confirmUrl });
  return sendResendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
  });
};

/**
 * Send OTP Verification email via Resend
 */
export const sendOtpEmailResend = async (email: string, otpCode: string, isParent: boolean = false) => {
  const template = generateOtpEmail({ otpCode, isParent });
  return sendResendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
  });
};

/**
 * Send Password Reset email via Resend
 */
export const sendPasswordResetEmailResend = async (email: string, resetUrl: string) => {
  const template = generatePasswordResetEmail({ resetUrl });
  return sendResendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
  });
};
