import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database/connection';
import { campaignAnalytics, jobCampaigns } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: campaignId } = await params;

    // Verify campaign belongs to user's company
    const campaign = await db
      .select()
      .from(jobCampaigns)
      .where(
        and(
          eq(jobCampaigns.id, campaignId),
          eq(jobCampaigns.companyId, session.user.companyId!)
        )
      )
      .limit(1);

    if (!campaign.length) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get analytics data
    const analytics = await db
      .select()
      .from(campaignAnalytics)
      .where(eq(campaignAnalytics.campaignId, campaignId))
      .limit(1);

    if (!analytics.length) {
      // Return default analytics if none exist
      return NextResponse.json({
        id: '',
        campaignId,
        totalApplications: 0,
        firstRoundInterviews: 0,
        firstRoundShortlisted: 0,
        secondRoundInterviews: 0,
        secondRoundShortlisted: 0,
        thirdRoundInterviews: 0,
        thirdRoundShortlisted: 0,
        finalHires: 0,
        averageScore: 0,
        conversionRate: 0,
        timeToHire: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return NextResponse.json(analytics[0]);
  } catch (error) {
    console.error('Error fetching campaign analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: campaignId } = await params;
    const body = await request.json();

    // Verify campaign belongs to user's company
    const campaign = await db
      .select()
      .from(jobCampaigns)
      .where(
        and(
          eq(jobCampaigns.id, campaignId),
          eq(jobCampaigns.companyId, session.user.companyId!)
        )
      )
      .limit(1);

    if (!campaign.length) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Update or create analytics
    const existingAnalytics = await db
      .select()
      .from(campaignAnalytics)
      .where(eq(campaignAnalytics.campaignId, campaignId))
      .limit(1);

    if (existingAnalytics.length) {
      // Update existing analytics
      const updated = await db
        .update(campaignAnalytics)
        .set({
          ...body,
          updatedAt: new Date()
        })
        .where(eq(campaignAnalytics.campaignId, campaignId))
        .returning();

      return NextResponse.json(updated[0]);
    } else {
      // Create new analytics
      const created = await db
        .insert(campaignAnalytics)
        .values({
          campaignId,
          ...body,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return NextResponse.json(created[0]);
    }
  } catch (error) {
    console.error('Error updating campaign analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}