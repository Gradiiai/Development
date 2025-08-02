import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateOTP, sendOTPEmail, storeOTP } from '@/lib/services/email/otp';
import { db } from '@/lib/database/connection';
import { users } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

const sendOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
  purpose: z.enum(['signup', 'signin'], {
    errorMap: () => ({ message: 'Purpose must be either signup or signin' }),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, purpose } = sendOTPSchema.parse(body);

    // For signup: check if user doesn't exist
    // For signin: check if user exists and has OTP enabled
    if (purpose === 'signup') {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existingUser.length > 0) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        );
      }
    } else if (purpose === 'signin') {
      const user = await db
        .select({
          id: users.id,
          email: users.email,
          otpLoginEnabled: users.otpLoginEnabled,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (!user[0]) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      if (!user[0].isActive) {
        return NextResponse.json(
          { error: 'Account is deactivated' },
          { status: 403 }
        );
      }

      if (!user[0].otpLoginEnabled) {
        return NextResponse.json(
          { error: 'OTP login is disabled for this account' },
          { status: 400 }
        );
      }
    }

    // Generate and send OTP
    const otp = generateOTP();
    
    // Store OTP in database
    const stored = await storeOTP(email.toLowerCase(), otp, purpose);
    if (!stored) {
      return NextResponse.json(
        { error: 'Failed to store OTP' },
        { status: 500 }
      );
    }

    // Send OTP via email
    const sent = await sendOTPEmail(email.toLowerCase(), otp, purpose);
    if (!sent) {
      return NextResponse.json(
        { error: 'Failed to send OTP email' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'OTP sent successfully',
        email: email.toLowerCase(),
        expiresIn: 300, // 5 minutes in seconds
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Send OTP error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}