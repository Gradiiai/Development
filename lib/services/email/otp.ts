import { db } from '@/lib/database/connection';
import { otpCodes } from '@/lib/database/schema';
import { eq, and, lt } from 'drizzle-orm';
import nodemailer from 'nodemailer';

// Generate a 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

// OTP templates moved to centralized templates.ts file

// Send OTP via email
export async function sendOTPEmail(
  email: string,
  otp: string,
  purpose: 'signup' | 'signin' | 'candidate_access',
  candidateName?: string
): Promise<boolean> {
  try {
    const transporter = createTransporter();
    
    let subject: string;
    let htmlContent: string;
    
    // Use centralized template from templates.ts
    const { generateAuthEmail } = await import('./templates');
    const emailContent = generateAuthEmail({
      email,
      purpose,
      otp
    });
    
    subject = emailContent.subject;
    htmlContent = emailContent.html;

    
    await transporter.sendMail({
      from: `"Gradii" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject,
      html: htmlContent,
    });
    
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
}

// Store OTP in database
export async function storeOTP(
  email: string,
  otp: string,
  purpose: 'signup' | 'signin' | 'candidate_access'
): Promise<boolean> {
  try {
    // Delete any existing OTPs for this email and purpose
    await db
      .delete(otpCodes)
      .where(
        and(
          eq(otpCodes.email, email),
          eq(otpCodes.purpose, purpose)
        )
      );
    
    // Store new OTP with 5-minute expiry
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    await db.insert(otpCodes).values({
      email,
      otp,
      purpose,
      expiresAt,
    });
    
    return true;
  } catch (error) {
    console.error('Error storing OTP:', error);
    return false;
  }
}

// Verify OTP
export async function verifyOTP(
  email: string,
  otp: string,
  purpose: 'signup' | 'signin' | 'candidate_access'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find the OTP record
    const otpRecord = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.email, email),
          eq(otpCodes.purpose, purpose),
          eq(otpCodes.otp, otp)
        )
      )
      .limit(1);
    
    if (!otpRecord[0]) {
      return { success: false, error: 'Invalid OTP' };
    }
    
    const record = otpRecord[0];
    
    // Check if OTP is already used
    if (record.usedAt) {
      return { success: false, error: 'OTP already used' };
    }
    
    // Check if OTP is expired
    if (new Date() > record.expiresAt) {
      return { success: false, error: 'OTP expired' };
    }
    
    // Check attempts
    if ((record.attempts ?? 0) >= (record.maxAttempts ?? 5)) {
      return { success: false, error: 'Too many attempts' };
    }
    
    // Mark OTP as used
    await db
      .update(otpCodes)
      .set({ usedAt: new Date() })
      .where(eq(otpCodes.id, record.id));
    
    return { success: true };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { success: false, error: 'Verification failed' };
  }
}

// Increment OTP attempt count
export async function incrementOTPAttempt(
  email: string,
  purpose: 'signup' | 'signin' | 'candidate_access'
): Promise<void> {
  try {
    // First get the current record
    const currentRecord = await db
      .select({ attempts: otpCodes.attempts })
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.email, email),
          eq(otpCodes.purpose, purpose)
        )
      )
      .limit(1);
    
    if (currentRecord[0]) {
      const newAttempts = (currentRecord[0].attempts ?? 0) + 1;
      await db
        .update(otpCodes)
        .set({ attempts: newAttempts })
        .where(
          and(
            eq(otpCodes.email, email),
            eq(otpCodes.purpose, purpose)
          )
        );
    }
  } catch (error) {
    console.error('Error incrementing OTP attempt:', error);
  }
}

// Clean up expired OTPs
export async function cleanupExpiredOTPs(): Promise<void> {
  try {
    await db
      .delete(otpCodes)
      .where(lt(otpCodes.expiresAt, new Date()));
  } catch (error) {
    console.error('Error cleaning up expired OTPs:', error);
  }
}