/**
 * Email template utilities for Gradii platform
 * Generates professional, responsive HTML email templates
 */

interface EmailTemplateData {
  candidateName: string;
  candidateEmail: string;
  jobPosition: string;
  companyName: string;
  interviewDate: string;
  interviewTime: string;
  interviewMode: string;
  interviewLink: string;
  interviewType?: "behavioral" | "coding" | "combo";
  additionalInfo?: string;
  candidateLoginLink?: string;
  // Removed tempPassword field
  isNewCandidate?: boolean; // Flag to indicate if this is a new candidate
}

// OTP Email Template Data
interface OtpEmailData {
  title: string;
  content: string;
  otp: string;
  footer: string;
}

// Sign up/Sign in Email Data
interface AuthEmailData {
  email: string;
  purpose: 'signup' | 'signin' | 'candidate_access';
  otp: string;
}

/**
 * Generates a professional interview invitation email template
 * Features:
 * - Responsive design for mobile and desktop
 * - Professional branding with Gradii colors
 * - Clear call-to-action button
 * - Accessible HTML structure
 * - Inline CSS for maximum email client compatibility
 */
export const generateInterviewEmailTemplate = (data: EmailTemplateData): string => {
  const {
    candidateName,
    jobPosition,
    companyName,
    interviewDate,
    interviewTime,
    interviewMode,
    interviewLink,
    interviewType = "behavioral",
    additionalInfo
  } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Gradii - Interview Invitation - ${jobPosition}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155;">
    <!-- Email Container -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <!-- Main Email Content -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
                    
                    <!-- Header Section -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); padding: 40px 30px; text-align: center;">
                            <!-- Logo/Brand -->
                            <div style="margin-bottom: 20px;">
                                <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 12px 20px; border-radius: 8px; backdrop-filter: blur(10px);">
                                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                                        🤖 Gradii
                                    </h1>
                                </div>
                            </div>
                            <h2 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; line-height: 1.3;">
                                Interview Invitation
                            </h2>
                            <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                                You're one step closer to joining our team!
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <!-- Greeting -->
                            <h3 style="margin: 0 0 20px 0; color: #1e293b; font-size: 20px; font-weight: 600;">
                                Hi ${candidateName},
                            </h3>
                            
                            <!-- Main Message -->
                            <p style="margin: 0 0 25px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                                We're excited to invite you to your upcoming ${interviewType === 'coding' ? 'coding ' : interviewType === 'combo' ? 'comprehensive ' : ''}interview for the <strong style="color: #0d9488;">${jobPosition}</strong> position at <strong style="color: #0d9488;">${companyName}</strong>.
                            </p>
                            
                            <!-- Interview Details Card -->
                            <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfeff 100%); border: 1px solid #a7f3d0; border-radius: 12px; padding: 25px; margin: 25px 0;">
                                <h4 style="margin: 0 0 20px 0; color: #065f46; font-size: 18px; font-weight: 600;">
                                    ${interviewType === 'coding' ? '💻' : interviewType === 'combo' ? '🎯' : '📋'} Interview Details
                                </h4>
                                
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td style="padding: 8px 0; vertical-align: top; width: 80px;">
                                            <span style="color: #059669; font-weight: 600; font-size: 16px;">📅</span>
                                        </td>
                                        <td style="padding: 8px 0; vertical-align: top; width: 80px;">
                                            <strong style="color: #065f46; font-size: 14px;">Date:</strong>
                                        </td>
                                        <td style="padding: 8px 0; vertical-align: top;">
                                            <span style="color: #374151; font-size: 14px;">${interviewDate}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; vertical-align: top;">
                                            <span style="color: #059669; font-weight: 600; font-size: 16px;">🕒</span>
                                        </td>
                                        <td style="padding: 8px 0; vertical-align: top;">
                                            <strong style="color: #065f46; font-size: 14px;">Time:</strong>
                                        </td>
                                        <td style="padding: 8px 0; vertical-align: top;">
                                            <span style="color: #374151; font-size: 14px;">${interviewTime}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; vertical-align: top;">
                                            <span style="color: #059669; font-weight: 600; font-size: 16px;">📍</span>
                                        </td>
                                        <td style="padding: 8px 0; vertical-align: top;">
                                            <strong style="color: #065f46; font-size: 14px;">Mode:</strong>
                                        </td>
                                        <td style="padding: 8px 0; vertical-align: top;">
                                            <span style="color: #374151; font-size: 14px;">${interviewMode}</span>
                                        </td>
                                    </tr>
                                    ${additionalInfo ? `<tr>
                                        <td style="padding: 8px 0; vertical-align: top;">
                                            <span style="color: #059669; font-weight: 600; font-size: 16px;">${interviewType === 'coding' ? '⚙️' : interviewType === 'combo' ? '🔧' : 'ℹ️'}</span>
                                        </td>
                                        <td style="padding: 8px 0; vertical-align: top;">
                                            <strong style="color: #065f46; font-size: 14px;">Additional Info:</strong>
                                        </td>
                                        <td style="padding: 8px 0; vertical-align: top;">
                                            <span style="color: #374151; font-size: 14px;">${additionalInfo}</span>
                                        </td>
                                    </tr>` : ''}
                                </table>
                            </div>
                            
                            <!-- Candidate Portal Section -->
                            <div style="background: linear-gradient(135deg, #fef7ff 0%, #f3e8ff 100%); border: 1px solid #c084fc; border-radius: 12px; padding: 25px; margin: 25px 0;">
                                <h4 style="margin: 0 0 15px 0; color: #7c3aed; font-size: 18px; font-weight: 600;">
                                    🔐 Your Candidate Portal
                                </h4>
                                <p style="margin: 0 0 20px 0; color: #6b46c1; font-size: 14px; line-height: 1.5;">
                                    Access your dedicated candidate dashboard to view your resume, interview details, and start your interview when ready.
                                </p>
                                <div style="text-align: center;">
                                    <a href="${data.candidateLoginLink || `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/candidate/signin?email=${encodeURIComponent(data.candidateEmail)}`}" 
                                       style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);"
                                       target="_blank">
                                        🏠 Access Candidate Portal
                                    </a>
                                </div>
                            </div>
                            
                            ${data.isNewCandidate ? `
                            <!-- Account Created Section -->
                            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-radius: 12px; padding: 25px; margin: 25px 0;">
                                <h4 style="margin: 0 0 15px 0; color: #92400e; font-size: 18px; font-weight: 600;">
                                    🔑 Account Created
                                </h4>
                                <p style="margin: 0 0 15px 0; color: #b45309; font-size: 14px; line-height: 1.5;">
                                    We've created a candidate account for you. Please use the login link below to access the interview platform.
                                </p>
                                <div style="background: #ffffff; border-radius: 8px; padding: 15px; margin: 15px 0;">
                                    <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Email:</strong> ${data.candidateEmail}</p>
                                </div>
                            </div>
                            ` : ''}
                            
                            <!-- Instructions -->
                            <p style="margin: 25px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                                ${data.isNewCandidate ? 'Please log in to your candidate portal first, then you can' : 'You can'} access your interview from your candidate portal or click the direct link below when it's time for your interview.
                            </p>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 35px 0;">
                                <a href="${interviewLink}" 
                                   style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3); transition: all 0.3s ease;"
                                   target="_blank">
                                    🚀 Join Interview
                                </a>
                            </div>
                            
                            <!-- Additional Info -->
                            <div style="background-color: #f8fafc; border-left: 4px solid #0d9488; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                                <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;">
                                    <strong style="color: #1e293b;">💡 Tip:</strong> We recommend joining the interview 5-10 minutes early to test your audio and video setup. If you have any technical issues or questions, please don't hesitate to contact our support team.
                                </p>
                            </div>
                            
                            <!-- Closing -->
                            <p style="margin: 30px 0 10px 0; color: #475569; font-size: 16px;">
                                We look forward to meeting you and learning more about your experience!
                            </p>
                            
                            <p style="margin: 10px 0 0 0; color: #475569; font-size: 16px;">
                                Best regards,<br>
                                <strong style="color: #0d9488;">${companyName} Team</strong>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
                                This email was sent by <strong>Gradii</strong> on behalf of <strong>${companyName}</strong>
                            </p>
                            <p style="margin: 0 0 15px 0; color: #64748b; font-size: 12px;">
                                If you have any questions about this interview, please contact the hiring team directly.
                            </p>
                            
                            <!-- Social Links (Optional) -->
                            <div style="margin: 20px 0;">
                                <a href="#" style="display: inline-block; margin: 0 10px; color: #0d9488; text-decoration: none; font-size: 12px;">
                                    Privacy Policy
                                </a>
                                <span style="color: #cbd5e1;">|</span>
                                <a href="#" style="display: inline-block; margin: 0 10px; color: #0d9488; text-decoration: none; font-size: 12px;">
                                    Terms of Service
                                </a>
                                <span style="color: #cbd5e1;">|</span>
                                <a href="#" style="display: inline-block; margin: 0 10px; color: #0d9488; text-decoration: none; font-size: 12px;">
                                    Contact Support
                                </a>
                            </div>
                            
                            <p style="margin: 15px 0 0 0; color: #94a3b8; font-size: 11px;">
                                © ${new Date().getFullYear()} Gradii. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    
    <!-- Mobile Responsive Styles -->
    <style type="text/css">
        @media only screen and (max-width: 600px) {
            .email-container {
                width: 100% !important;
                max-width: 100% !important;
            }
            .email-content {
                padding: 20px !important;
            }
            .email-header {
                padding: 30px 20px !important;
            }
            .cta-button {
                padding: 14px 24px !important;
                font-size: 15px !important;
            }
            .details-table td {
                display: block !important;
                width: 100% !important;
                padding: 4px 0 !important;
            }
        }
        
        @media only screen and (max-width: 480px) {
            .email-header h1 {
                font-size: 20px !important;
            }
            .email-header h2 {
                font-size: 24px !important;
            }
            .main-title {
                font-size: 18px !important;
            }
        }
    </style>
</body>
</html>
  `;
};

/**
 * Generates a simple text-only version of the interview invitation
 * Used as fallback for email clients that don't support HTML
 */
export const generateInterviewEmailText = (data: EmailTemplateData): string => {
  const {
    candidateName,
    jobPosition,
    companyName,
    interviewDate,
    interviewTime,
    interviewMode,
    interviewLink,
  } = data;

  return `
INTERVIEW INVITATION - ${jobPosition.toUpperCase()}
${'='.repeat(50)}

Hi ${candidateName},

We're excited to invite you to your upcoming interview for the ${jobPosition} position at ${companyName}.

INTERVIEW DETAILS:
📅 Date: ${interviewDate}
🕒 Time: ${interviewTime}
📍 Mode: ${interviewMode}

${data.isNewCandidate ? `ACCOUNT CREATED:
📧 Email: ${data.candidateEmail}

We've created a candidate account for you. Please log in to your candidate portal first: ${data.candidateLoginLink || `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/candidate/signin`}

` : ''}To join your interview, please visit:
${interviewLink}

IMPORTANT NOTES:
• Please join 5-10 minutes early to test your setup
• Ensure you have a stable internet connection
• Have your resume and any questions ready
• Contact support if you encounter any technical issues

We look forward to meeting you and learning more about your experience!

Best regards,
${companyName} Team

---
This email was sent by Gradii on behalf of ${companyName}
If you have questions about this interview, please contact the hiring team directly.

© ${new Date().getFullYear()} Gradii. All rights reserved.
  `;
};

/**
 * Generates a follow-up reminder email template
 * Can be sent 24 hours before the interview
 */
export const generateInterviewReminderTemplate = (data: EmailTemplateData): string => {
  const {
    candidateName,
    jobPosition,
    companyName,
    interviewDate,
    interviewTime,
    interviewMode,
    interviewLink,
  } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gradii - Interview Reminder - ${jobPosition}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">⏰ Interview Reminder</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px;">
                            <h3 style="margin: 0 0 20px 0; color: #1e293b; font-size: 20px;">Hi ${candidateName},</h3>
                            <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px;">
                                This is a friendly reminder about your upcoming interview for the <strong>${jobPosition}</strong> position at <strong>${companyName}</strong>.
                            </p>
                            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0; color: #92400e; font-weight: 600;">📅 ${interviewDate} at ${interviewTime}</p>
                                <p style="margin: 5px 0 0 0; color: #92400e;">Mode: ${interviewMode}</p>
                            </div>
                            <div style="text-align: center; margin: 25px 0;">
                                <a href="${interviewLink}" style="display: inline-block; background: #f59e0b; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600;">Join Interview</a>
                            </div>
                            <p style="margin: 20px 0 0 0; color: #475569; font-size: 14px;">
                                Best regards,<br><strong>${companyName} Team</strong>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `;
};

/**
 * Email template validation utility
 * Ensures all required data is present before generating templates
 */
export const validateEmailTemplateData = (data: Partial<EmailTemplateData>): data is EmailTemplateData => {
  const requiredFields: (keyof EmailTemplateData)[] = [
    'candidateName',
    'candidateEmail',
    'jobPosition',
    'companyName',
    'interviewDate',
    'interviewTime',
    'interviewMode',
    'interviewLink'
  ];

  return requiredFields.every(field => 
    data[field] && 
    typeof data[field] === 'string' && 
    data[field]!.trim().length > 0
  );
};

/**
 * Generates email subject line for interview invitations
 */
export const generateEmailSubject = (jobPosition: string, interviewDate: string, interviewType: string = "behavioral"): string => {
  const typePrefix = interviewType === "coding" ? "Coding Interview" : "Interview";
  return `${typePrefix} Scheduled for ${jobPosition} – Gradii`;
};

/**
 * Utility to sanitize email content and prevent XSS
 */
export const sanitizeEmailContent = (content: string): string => {
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * ============================================
 * OTP AND AUTHENTICATION EMAIL TEMPLATES
 * ============================================
 * Consolidated from lib/services/email/otp.ts
 */

/**
 * Professional OTP email template for signup, signin, and candidate access
 */
export const generateOtpEmailTemplate = (data: OtpEmailData): string => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            padding: 40px 30px;
            text-align: center;
        }
        
        .logo {
            font-family: 'Playfair Display', serif;
            font-size: 32px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .tagline {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.9);
            font-weight: 300;
            letter-spacing: 1px;
        }
        
        .content {
            padding: 50px 40px;
            text-align: center;
        }
        
        .title {
            font-family: 'Playfair Display', serif;
            font-size: 28px;
            font-weight: 600;
            color: #1a202c;
            margin-bottom: 20px;
        }
        
        .description {
            font-size: 16px;
            color: #4a5568;
            line-height: 1.6;
            margin-bottom: 40px;
        }
        
        .otp-container {
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            border: 2px solid #e2e8f0;
            border-radius: 16px;
            padding: 30px;
            margin: 30px 0;
            position: relative;
        }
        
        .otp-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        }
        
        .otp-label {
            font-size: 12px;
            font-weight: 600;
            color: #718096;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 15px;
        }
        
        .otp-code {
            font-family: 'Inter', monospace;
            font-size: 42px;
            font-weight: 700;
            color: #2d3748;
            letter-spacing: 8px;
            margin: 0;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .expiry-notice {
            font-size: 14px;
            color: #e53e3e;
            font-weight: 500;
            margin-top: 30px;
            padding: 15px;
            background: rgba(254, 226, 226, 0.5);
            border-radius: 10px;
            border-left: 4px solid #e53e3e;
        }
        
        .security-notice {
            font-size: 14px;
            color: #718096;
            margin-top: 30px;
            padding: 20px;
            background: #f7fafc;
            border-radius: 10px;
            border-left: 4px solid #4299e1;
        }
        
        .footer {
            background: #1a202c;
            color: #a0aec0;
            padding: 30px 40px;
            text-align: center;
            font-size: 14px;
            line-height: 1.6;
        }
        
        .footer-logo {
            font-family: 'Playfair Display', serif;
            font-size: 20px;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">👑 Gradii Elite</div>
            <div class="tagline">Premium Recruitment Platform</div>
        </div>
        
        <div class="content">
            <h1 class="title">${data.title}</h1>
            <p class="description">${data.content}</p>
            
            <div class="otp-container">
                <div class="otp-label">Your Verification Code</div>
                <div class="otp-code">${data.otp}</div>
            </div>
            
            <div class="expiry-notice">
                ⏰ This code expires in 10 minutes for your security
            </div>
            
            <div class="security-notice">
                🔒 ${data.footer}
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-logo">Gradii</div>
            <p>Elite recruitment solutions for modern enterprises</p>
            <p style="margin-top: 10px; font-size: 12px; opacity: 0.7;">
                © ${new Date().getFullYear()} Gradii. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
`;

/**
 * Generate OTP email based on purpose (signup, signin, candidate access)
 */
export const generateAuthEmail = (data: AuthEmailData): { subject: string; html: string } => {
  let title: string;
  let content: string;
  let footer: string;
  let subject: string;

  switch (data.purpose) {
    case 'signup':
      subject = '👑 Welcome to Gradii Elite - Verify Your Royal Access';
      title = 'Welcome to Excellence';
      content = 'Your journey to elite recruitment begins here. Please verify your distinguished email address to unlock your premium access to Gradii.';
      footer = 'If you did not request this verification, please disregard this message. Your account security is our paramount concern.';
      break;
      
    case 'signin':
      subject = '🔐 Your Gradii Access Code - Secure Entry';
      title = 'Secure Access Request';
      content = 'Welcome back to your exclusive Gradii experience. Use the verification code below to access your premium account.';
      footer = 'If you did not initiate this sign-in request, please secure your account immediately and contact our support team.';
      break;
      
    case 'candidate_access':
      subject = '🎯 Your Interview Awaits - Gradii Access Code';
      title = 'Interview Access Code';
      content = 'You have been invited for an interview. Use this verification code to access your candidate portal and begin your interview journey.';
      footer = 'This code is specifically for your interview access. Do not share it with anyone else.';
      break;
  }

  const html = generateOtpEmailTemplate({
    title,
    content,
    otp: data.otp,
    footer
  });

  return { subject, html };
};