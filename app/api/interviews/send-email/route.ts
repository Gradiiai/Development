import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { generateInterviewEmailTemplate, generateInterviewEmailText, generateEmailSubject } from "@/lib/services/email/templates";

// Email configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    // Additional settings for better deliverability
    tls: {
      rejectUnauthorized: false,
    },
  });
};

// Validation schema for email data
interface InterviewEmailData {
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
  // Removed tempPassword field
  isNewCandidate?: boolean; // Flag to indicate if this is a new candidate
}

// Validate email data
const validateEmailData = (data: any): InterviewEmailData | null => {
  const required = [
    'candidateName',
    'candidateEmail', 
    'jobPosition',
    'companyName',
    'interviewDate',
    'interviewTime',
    'interviewMode',
    'interviewLink'
  ];

  for (const field of required) {
    if (!data[field] || typeof data[field] !== 'string' || data[field].trim() === '') {
      return null;
    }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.candidateEmail)) {
    return null;
  }

  return {
    candidateName: data.candidateName,
    candidateEmail: data.candidateEmail,
    jobPosition: data.jobPosition,
    companyName: data.companyName,
    interviewDate: data.interviewDate,
    interviewTime: data.interviewTime,
    interviewMode: data.interviewMode,
    interviewLink: data.interviewLink,
    interviewType: data.interviewType || 'behavioral',
    additionalInfo: data.additionalInfo || undefined,
  } as InterviewEmailData;
};

// Format date for better readability
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};

// Format time for better readability
const formatTime = (timeString: string): string => {
  try {
    // Handle both HH:MM and HH:MM:SS formats
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return timeString;
  }
};

export async function POST(request: NextRequest) {
  try {
    // Check if required environment variables are set
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.error('SMTP credentials not configured');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email service not configured. Please contact administrator.' 
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    
    // Validate input data
    const emailData = validateEmailData(body);
    if (!emailData) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid or missing required fields. Please check all interview details.' 
        },
        { status: 400 }
      );
    }

    // Create transporter
    const transporter = createTransporter();

    // Verify SMTP connection
    try {
      await transporter.verify();
    } catch (error) {
      console.error('SMTP connection failed:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email service temporarily unavailable. Please try again later.' 
        },
        { status: 500 }
      );
    }

    // Format date and time
    const formattedDate = formatDate(emailData.interviewDate);
    const formattedTime = formatTime(emailData.interviewTime);

    // Debug: Log what email data we received
    console.log(`📧 [SEND-EMAIL] Processing email for ${emailData.candidateEmail}:`);
    console.log(`📧 [SEND-EMAIL] Sending interview email to: ${emailData.candidateEmail}`);
    console.log(`📧 [SEND-EMAIL] isNewCandidate: ${emailData.isNewCandidate}`);

    // Generate email content
    const emailHtml = generateInterviewEmailTemplate({
      candidateName: emailData.candidateName,
      candidateEmail: emailData.candidateEmail,
      jobPosition: emailData.jobPosition,
      interviewDate: formattedDate,
      interviewTime: formattedTime,
      interviewLink: emailData.interviewLink,
      companyName: emailData.companyName,
      interviewMode: emailData.interviewMode,
      interviewType: emailData.interviewType,
      additionalInfo: emailData.additionalInfo,
      candidateLoginLink: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/candidate/signin?email=${encodeURIComponent(emailData.candidateEmail)}`,
      // Removed tempPassword field
      isNewCandidate: emailData.isNewCandidate,
    });

    const emailText = generateInterviewEmailText({
      candidateName: emailData.candidateName,
      candidateEmail: emailData.candidateEmail,
      jobPosition: emailData.jobPosition,
      interviewDate: formattedDate,
      interviewTime: formattedTime,
      interviewLink: emailData.interviewLink,
      companyName: emailData.companyName,
      interviewMode: emailData.interviewMode,
      interviewType: emailData.interviewType,
      additionalInfo: emailData.additionalInfo,
      candidateLoginLink: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/candidate/signin?email=${encodeURIComponent(emailData.candidateEmail)}`,
      // Removed tempPassword field
      isNewCandidate: emailData.isNewCandidate,
    });

    const subject = generateEmailSubject(emailData.jobPosition, emailData.interviewDate, emailData.interviewType);

    // Email options
    const mailOptions = {
      from: {
        name: emailData.companyName || 'Gradii',
        address: process.env.SMTP_USER,
      },
      to: emailData.candidateEmail,
      subject: subject,
      html: emailHtml,
      text: emailText,
      // Headers for better deliverability
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'X-Mailer': 'Gradii Platform',
        'X-MimeOLE': 'Produced By Gradii',
      },
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Interview email sent successfully:', {
      messageId: info.messageId,
      candidateEmail: emailData.candidateEmail,
      jobPosition: emailData.jobPosition,
    });

    return NextResponse.json({
      success: true,
      message: `Interview invitation email sent successfully to ${emailData.candidateName} for ${emailData.jobPosition} position`,
      messageId: info.messageId,
    });

  } catch (error) {
    console.error('Error sending interview email:', error);
    
    // Return user-friendly error message
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send interview invitation. Please try again or contact support.' 
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    // Check if SMTP is configured
    const isConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASSWORD);
    
    return NextResponse.json({
      status: 'ok',
      emailServiceConfigured: isConfigured,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: 'Service unavailable' },
      { status: 500 }
    );
  }
}