import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database/connection';
import { applicationStatusHistory, candidates, jobCampaigns } from '@/lib/database/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const candidateId = resolvedParams.id;

    // Verify candidate belongs to user's company campaigns
    const candidate = await db
      .select({
        candidateId: candidates.id,
        campaignId: candidates.campaignId,
        companyId: jobCampaigns.companyId
      })
      .from(candidates)
      .innerJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(
        and(
          eq(candidates.id, candidateId),
          eq(jobCampaigns.companyId, session.user.companyId!)
        )
      )
      .limit(1);

    if (!candidate.length) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // Get status history
    const history = await db
      .select()
      .from(applicationStatusHistory)
      .where(eq(applicationStatusHistory.candidateId, candidateId))
      .orderBy(desc(applicationStatusHistory.createdAt));

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching status history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const candidateId = resolvedParams.id;
    const body = await request.json();
    const { newStatus, reason, metadata } = body;

    if (!newStatus) {
      return NextResponse.json(
        { error: 'New status is required' },
        { status: 400 }
      );
    }

    // Verify candidate belongs to user's company campaigns
    const candidate = await db
      .select({
        candidateId: candidates.id,
        campaignId: candidates.campaignId,
        currentStatus: candidates.status,
        companyId: jobCampaigns.companyId
      })
      .from(candidates)
      .innerJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(
        and(
          eq(candidates.id, candidateId),
          eq(jobCampaigns.companyId, session.user.companyId!)
        )
      )
      .limit(1);

    if (!candidate.length) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const currentCandidate = candidate[0];

    // Create status history entry
    const historyEntry = await db
      .insert(applicationStatusHistory)
      .values({
        candidateId,
        campaignId: currentCandidate.campaignId,
        previousStatus: currentCandidate.currentStatus,
        newStatus,
        reason,
        changedBy: session.user.id,
        createdAt: new Date(),
        metadata
      })
      .returning();

    // Update candidate status
    await db
      .update(candidates)
      .set({
        status: newStatus,
        updatedAt: new Date()
      })
      .where(eq(candidates.id, candidateId));

    return NextResponse.json(historyEntry[0]);
  } catch (error) {
    console.error('Error creating status history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}