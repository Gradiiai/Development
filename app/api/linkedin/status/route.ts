import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database/connection';
import { linkedinIntegrations } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check for existing LinkedIn integration
    const integration = await db
      .select()
      .from(linkedinIntegrations)
      .where(
        and(
          eq(linkedinIntegrations.companyId, session.user.companyId),
          eq(linkedinIntegrations.isActive, true)
        )
      )
      .limit(1);

    if (integration.length === 0) {
      return NextResponse.json({
        isConnected: false,
        organizationId: null,
        profileId: null,
        tokenExpiry: null,
      });
    }

    const linkedinData = integration[0];

    // Check if token is expired
    const isExpired = new Date() >= new Date(linkedinData.expiresAt);

    if (isExpired) {
      // Mark as inactive if expired
      await db
        .update(linkedinIntegrations)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(linkedinIntegrations.id, linkedinData.id));

      return NextResponse.json({
        isConnected: false,
        organizationId: null,
        profileId: null,
        tokenExpiry: null,
      });
    }

    return NextResponse.json({
      isConnected: true,
      organizationId: linkedinData.organizationId,
      profileId: linkedinData.profileId,
      tokenExpiry: linkedinData.expiresAt,
      profileName: linkedinData.profileName,
      profileEmail: linkedinData.profileEmail,
    });

  } catch (error) {
    console.error('Error fetching LinkedIn status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}