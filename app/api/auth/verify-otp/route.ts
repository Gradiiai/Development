import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyOTP, incrementOTPAttempt } from '@/lib/services/email/otp';
import { db } from '@/lib/database/connection';
import { users } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const verifyOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  purpose: z.enum(['signup', 'signin'], {
    errorMap: () => ({ message: 'Purpose must be either signup or signin' }),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp, purpose } = verifyOTPSchema.parse(body);

    // Verify OTP
    const verification = await verifyOTP(email.toLowerCase(), otp, purpose);
    
    if (!verification.success) {
      // Increment attempt count for failed verification
      await incrementOTPAttempt(email.toLowerCase(), purpose);
      
      return NextResponse.json(
        { error: verification.error || 'OTP verification failed' },
        { status: 400 }
      );
    }

    if (purpose === 'signup') {
      // For signup, just return success - user creation will happen in signup flow
      return NextResponse.json(
        {
          message: 'OTP verified successfully',
          verified: true,
          purpose: 'signup',
        },
        { status: 200 }
      );
    } else if (purpose === 'signin') {
      // For signin, authenticate the user
      const user = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          companyId: users.companyId,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (!user[0] || !user[0].isActive) {
        return NextResponse.json(
          { error: 'User not found or inactive' },
          { status: 404 }
        );
      }

      // Update last login
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user[0].id));

      // Create a temporary token for the frontend to use with NextAuth
      const tempToken = jwt.sign(
        {
          userId: user[0].id,
          email: user[0].email,
          purpose: 'otp_signin',
        },
        process.env.AUTH_SECRET || 'fallback-secret',
        { expiresIn: '5m' }
      );

      return NextResponse.json(
        {
          message: 'OTP verified successfully',
          verified: true,
          purpose: 'signin',
          user: {
            id: user[0].id,
            email: user[0].email,
            name: user[0].name,
            role: user[0].role,
            companyId: user[0].companyId,
          },
          tempToken,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid purpose' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Verify OTP error:', error);

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