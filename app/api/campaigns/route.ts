import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { jobCampaigns, campaignInterviews, candidates } from '@/lib/database/schema';
import { eq, and, count, avg, desc, ne } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const companyId = session.user.companyId;

    // Fetch campaigns with aggregated statistics (exclude direct interview campaigns)
    const campaignsWithStats = await db
      .select({
        id: jobCampaigns.id,
        title: jobCampaigns.campaignName,
        description: jobCampaigns.jobDescription,
        status: jobCampaigns.status,
        createdAt: jobCampaigns.createdAt,
        jobTitle: jobCampaigns.jobTitle,
        department: jobCampaigns.department,
        location: jobCampaigns.location,
        numberOfOpenings: jobCampaigns.numberOfOpenings,
      })
      .from(jobCampaigns)
      .where(
        and(
          eq(jobCampaigns.companyId, companyId),
          ne(jobCampaigns.campaignName, 'Direct Interview')
        )
      )
      .orderBy(desc(jobCampaigns.createdAt));

    // For each campaign, get interview statistics
    const campaignsWithInterviewStats = await Promise.all(
      campaignsWithStats.map(async (campaign) => {
        // Get total candidates for this campaign
        const totalCandidatesResult = await db
          .select({ count: count() })
          .from(campaignInterviews)
          .where(eq(campaignInterviews.campaignId, campaign.id));

        const totalCandidates = totalCandidatesResult[0]?.count || 0;

        // Get completed interviews count
        const completedInterviewsResult = await db
          .select({ count: count() })
          .from(campaignInterviews)
          .where(
            and(
              eq(campaignInterviews.campaignId, campaign.id),
              eq(campaignInterviews.status, 'completed')
            )
          );

        const completedInterviews = completedInterviewsResult[0]?.count || 0;

        // Get pending interviews count
        const pendingInterviewsResult = await db
          .select({ count: count() })
          .from(campaignInterviews)
          .where(
            and(
              eq(campaignInterviews.campaignId, campaign.id),
              eq(campaignInterviews.status, 'scheduled')
            )
          );

        const pendingInterviews = pendingInterviewsResult[0]?.count || 0;

        // Get average score for completed interviews
        const averageScoreResult = await db
          .select({ avgScore: avg(campaignInterviews.score) })
          .from(campaignInterviews)
          .where(
            and(
              eq(campaignInterviews.campaignId, campaign.id),
              eq(campaignInterviews.status, 'completed')
            )
          );

        const averageScore = Number(averageScoreResult[0]?.avgScore) || 0;

        // Determine campaign status based on activity
        let campaignStatus: 'active' | 'paused' | 'completed' | 'draft' = 'draft';
        
        if (campaign.status === 'draft') {
          campaignStatus = 'draft';
        } else if (campaign.status === 'completed' || (totalCandidates > 0 && completedInterviews === totalCandidates)) {
          campaignStatus = 'completed';
        } else if (campaign.status === 'paused') {
          campaignStatus = 'paused';
        } else if (campaign.status === 'active') {
          campaignStatus = 'active';
        }

        return {
          id: campaign.id,
          title: campaign.title,
          description: campaign.description || `${campaign.jobTitle} position in ${campaign.department}`,
          status: campaignStatus,
          createdAt: campaign.createdAt,
          totalCandidates,
          completedInterviews,
          pendingInterviews,
          averageScore: Math.round(averageScore * 100) / 100, // Round to 2 decimal places
          jobTitle: campaign.jobTitle,
          department: campaign.department,
          location: campaign.location,
          numberOfOpenings: campaign.numberOfOpenings,
        };
      })
    );

    return NextResponse.json(campaignsWithInterviewStats);

  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { campaignId, status } = body;

    if (!campaignId || !status) {
      return NextResponse.json(
        { error: 'Campaign ID and status are required' },
        { status: 400 }
      );
    }

    if (!['active', 'paused', 'completed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be active, paused, or completed' },
        { status: 400 }
      );
    }

    // Update campaign status
    await db
      .update(jobCampaigns)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(jobCampaigns.id, campaignId),
          eq(jobCampaigns.companyId, session.user.companyId)
        )
      );

    return NextResponse.json({
      success: true,
      message: 'Campaign status updated successfully'
    });

  } catch (error) {
    console.error('Error updating campaign status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}