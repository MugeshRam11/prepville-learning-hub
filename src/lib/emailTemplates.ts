/**
 * Premium Branded Email Templates for The Prep Ville
 * Supports HTML rendering with logo, gradient banners, CTA buttons, and responsive layouts.
 */

export const PREPVILLE_LOGO_URL = 'https://student.theprepville.com/logo.png';
export const PREPVILLE_SITE_URL = 'https://student.theprepville.com';
export const SENDER_EMAIL = 'The Prep Ville <no-reply@respond.theprepville.com>';
export const RESEND_DEFAULT_SENDER = 'The Prep Ville <no-reply@respond.theprepville.com>';

/**
 * Base HTML wrapper with responsive styles and branded header/footer
 */
export const renderBaseEmailLayout = ({
  title,
  preheader,
  contentHtml,
}: {
  title: string;
  preheader?: string;
  contentHtml: string;
}): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f1f5f9;
      padding: 40px 16px;
    }
    .main-card {
      max-width: 540px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
      border: 1px solid #e2e8f0;
    }
    .header-banner {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%);
      padding: 36px 32px 30px 32px;
      text-align: center;
      position: relative;
    }
    .logo-img {
      max-width: 170px;
      height: auto;
      display: inline-block;
    }
    .badge-pill {
      display: inline-block;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #e0e7ff;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 4px 14px;
      border-radius: 9999px;
      margin-top: 14px;
    }
    .content-body {
      padding: 36px 32px;
      background-color: #ffffff;
    }
    .heading {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 12px 0;
      line-height: 1.3;
    }
    .paragraph {
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
      margin: 0 0 20px 0;
    }
    .otp-box {
      background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
      border: 2px border #6366f1;
      border-radius: 16px;
      padding: 22px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 900;
      letter-spacing: 12px;
      color: #4338ca;
      display: block;
      margin-left: 12px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
      color: #ffffff !important;
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 12px;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
      margin: 20px 0;
      text-align: center;
    }
    .security-note {
      background-color: #f8fafc;
      border-left: 4px solid #6366f1;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 13px;
      color: #64748b;
      margin-top: 24px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #f1f5f9;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .footer a {
      color: #4f46e5;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
  <div class="wrapper">
    <div class="main-card">
      <!-- Header with Logo -->
      <div class="header-banner">
        <img src="${PREPVILLE_LOGO_URL}" alt="The Prep Ville" class="logo-img" onerror="this.onerror=null; this.src='https://student.theprepville.com/favicon.png';" />
        <div style="clear: both;"></div>
        <span class="badge-pill">Learning & Evaluation Platform</span>
      </div>

      <!-- Main Content -->
      <div class="content-body">
        ${contentHtml}
      </div>

      <!-- Footer -->
      <div class="footer">
        <p style="margin: 0 0 6px 0; font-weight: 600; color: #64748b;">The Prep Ville Learning Hub</p>
        <p style="margin: 0 0 12px 0;">Official Student & Admin Portal • <a href="${PREPVILLE_SITE_URL}">${PREPVILLE_SITE_URL}</a></p>
        <p style="margin: 0; font-size: 11px; color: #cbd5e1;">© 2026 The Prep Ville. All rights reserved. If you have questions, contact <a href="mailto:support@theprepville.com">support@theprepville.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Generate Signup Confirmation / Welcome Email HTML
 */
export const generateSignupConfirmationEmail = ({
  name,
  confirmUrl,
}: {
  name?: string;
  confirmUrl: string;
}): { subject: string; html: string } => {
  const subject = 'Welcome to The Prep Ville! Confirm Your Signup';
  const preheader = 'Please confirm your email address to complete registration on The Prep Ville.';

  const contentHtml = `
    <h1 class="heading">Confirm Your Signup 👋</h1>
    <p class="paragraph">Hello ${name || 'Student'},</p>
    <p class="paragraph">
      Thank you for joining <strong>The Prep Ville</strong>! To complete your registration and activate your student account, please confirm your email address below.
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${confirmUrl}" class="cta-button" target="_blank">Confirm My Account</a>
    </div>

    <div class="security-note">
      🔒 <strong>Security Note:</strong> This confirmation link expires in 24 hours. If you did not sign up for an account on The Prep Ville, you can safely ignore this email.
    </div>

    <p class="paragraph" style="margin-top: 24px; font-size: 13px; color: #94a3b8;">
      If the button above doesn't work, copy and paste this link into your browser:<br/>
      <a href="${confirmUrl}" style="color: #4f46e5; word-break: break-all;">${confirmUrl}</a>
    </p>
  `;

  return {
    subject,
    html: renderBaseEmailLayout({ title: subject, preheader, contentHtml }),
  };
};

/**
 * Generate OTP Code Verification Email HTML
 */
export const generateOtpEmail = ({
  otpCode,
  isParent = false,
}: {
  otpCode: string;
  isParent?: boolean;
}): { subject: string; html: string } => {
  const subject = isParent
    ? 'The Prep Ville - Parent Email Verification Code'
    : 'The Prep Ville - Email Verification Code';
  const preheader = `Your 6-digit verification code is ${otpCode}. It expires in 10 minutes.`;

  const contentHtml = `
    <h1 class="heading">${isParent ? 'Parent Email Verification' : 'Email Verification Code'} 🔐</h1>
    <p class="paragraph">
      Here is your single-use verification code to complete ${isParent ? 'parent account verification' : 'email verification'} on <strong>The Prep Ville</strong>:
    </p>

    <div class="otp-box">
      <span style="font-size: 12px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 8px;">Your 6-Digit Code</span>
      <span class="otp-code">${otpCode}</span>
    </div>

    <div class="security-note">
      ⏱️ <strong>Time Sensitive:</strong> This code will expire in <strong>10 minutes</strong>. Do not share this code with anyone.
    </div>
  `;

  return {
    subject,
    html: renderBaseEmailLayout({ title: subject, preheader, contentHtml }),
  };
};

/**
 * Generate Password Reset Email HTML
 */
export const generatePasswordResetEmail = ({
  resetUrl,
}: {
  resetUrl: string;
}): { subject: string; html: string } => {
  const subject = 'The Prep Ville - Reset Your Password';
  const preheader = 'Use this secure link to reset your PrepVille account password.';

  const contentHtml = `
    <h1 class="heading">Reset Your Password 🔑</h1>
    <p class="paragraph">
      We received a request to reset the password for your <strong>The Prep Ville</strong> account. Click the button below to create a new password.
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${resetUrl}" class="cta-button" target="_blank">Reset Password</a>
    </div>

    <div class="security-note">
      🛡️ If you did not request a password reset, your account is safe and no action is required.
    </div>

    <p class="paragraph" style="margin-top: 24px; font-size: 13px; color: #94a3b8;">
      Or paste this link into your browser:<br/>
      <a href="${resetUrl}" style="color: #4f46e5; word-break: break-all;">${resetUrl}</a>
    </p>
  `;

  return {
    subject,
    html: renderBaseEmailLayout({ title: subject, preheader, contentHtml }),
  };
};
