import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { users } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateOtpPreferenceSchema = z.object({
  otpLoginEnabled: z.boolean(),
});

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { otpLoginEnabled } = updateOtpPreferenceSchema.parse(body);

    // Update user's OTP preference in the database
    await db
      .update(users)
      .set({ 
        otpLoginEnabled,
        updatedAt: new Date()
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({
      success: true,
      message: `OTP login ${otpLoginEnabled ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    console.error('Error updating OTP preference:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}