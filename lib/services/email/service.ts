import * as nodemailer from 'nodemailer';
import { generateInterviewEmailTemplate, generateInterviewEmailText, generateEmailSubject } from './templates';

interface EmailData {
  candidateName: string;
  candidateEmail: string;
  jobPosition: string;
  companyName: string;
  interviewDate: string;
  interviewTime: string;
  interviewMode: string;
  interviewLink: string;
  interviewType?: 'behavioral' | 'coding';
  additionalInfo?: string;
}

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

// Simple email sending function
export async function sendSimpleEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.error('SMTP credentials not configured');
      return {
        success: false,
        error: 'Email service not configured. Please contact administrator.'
      };
    }

    const transporter = createTransporter();
    
    const info = await transporter.sendMail({
      from: `"Gradii" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      html: options.html,
    });

    console.log('Email sent successfully:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: 'Failed to send email. Please try again later.'
    };
  }
}

// Send email function
export async function sendEmail(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if SMTP is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.error('SMTP credentials not configured');
      return {
        success: false,
        error: 'Email service not configured. Please contact administrator.'
      };
    }

    const transporter = createTransporter();
    
    // Generate email content
    const htmlContent = generateInterviewEmailTemplate(emailData);
    const textContent = generateInterviewEmailText(emailData);
    const subject = generateEmailSubject(emailData.jobPosition, emailData.interviewDate, emailData.interviewType);

    // Send email
    const info = await transporter.sendMail({
      from: `"Gradii" <${process.env.SMTP_USER}>`,
      to: emailData.candidateEmail,
      subject: subject,
      text: textContent,
      html: htmlContent,
    });

    console.log('Email sent successfully:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: 'Failed to send email. Please try again later.'
    };
  }
}

// Send email to multiple recipients (for interviewers)
export async function sendEmailToInterviewers(
  interviewerEmails: string[],
  emailData: Omit<EmailData, 'candidateEmail'> & { candidateEmail?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      return {
        success: false,
        error: 'Email service not configured.'
      };
    }

    const transporter = createTransporter();
    
    // Generate interviewer notification content
    const subject = `Interview Scheduled: ${emailData.jobPosition} - ${emailData.interviewDate}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Interview Scheduled</h2>
        <p>A new interview has been scheduled:</p>
        <ul>
          <li><strong>Candidate:</strong> ${emailData.candidateName}</li>
          <li><strong>Position:</strong> ${emailData.jobPosition}</li>
          <li><strong>Date:</strong> ${emailData.interviewDate}</li>
          <li><strong>Time:</strong> ${emailData.interviewTime}</li>
          <li><strong>Mode:</strong> ${emailData.interviewMode}</li>
          ${emailData.interviewLink ? `<li><strong>Link:</strong> <a href="${emailData.interviewLink}">${emailData.interviewLink}</a></li>` : ''}
        </ul>
        ${emailData.additionalInfo ? `<p><strong>Additional Information:</strong> ${emailData.additionalInfo}</p>` : ''}
        <p>Please make sure to be available at the scheduled time.</p>
        <p>Best regards,<br>Gradii Team</p>
      </div>
    `;

    // Send to all interviewers
    const emailPromises = interviewerEmails.map(email => 
      transporter.sendMail({
        from: `"Gradii" <${process.env.SMTP_USER}>`,
        to: email,
        subject: subject,
        html: htmlContent,
      })
    );

    await Promise.all(emailPromises);
    return { success: true };
  } catch (error) {
    console.error('Error sending emails to interviewers:', error);
    return {
      success: false,
      error: 'Failed to send emails to interviewers.'
    };
  }
}