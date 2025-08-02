import { NextRequest } from 'next/server';
import { db } from '@/lib/database/connection';
import { eq, and, count, avg, gte, lte, sql, ne } from 'drizzle-orm';
import {
  withV2Auth,
  createV2Response,
  createV2ErrorResponse,
  validateMethod
} from '../../middleware';
import {
  jobCampaigns,
  candidates,
  campaignInterviews,
  interviewSetups
} from '@/lib/database/schema';

/**
 * GET /api/v2/analytics/overview
 * Get overview analytics for the company
 */
export async function GET(request: NextRequest) {
  const authResult = await withV2Auth(request, ['read:analytics']);
  
  if ('error' in authResult && authResult.error) {
    return authResult.error;
  }
  
  if (!('authContext' in authResult) || !authResult.authContext) {
    return createV2ErrorResponse('Authentication failed', 'AUTH_FAILED', 401);
  }
  
  const authContext = authResult.authContext;
  
  const methodValidation = validateMethod(request, ['GET']);
  if (methodValidation) {
    return methodValidation;
  }

  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const campaignId = searchParams.get('campaignId');

    // Build where conditions
    const whereConditions = [
      eq(jobCampaigns.companyId, authContext.token.companyId),
      // Exclude direct interview campaigns
      ne(jobCampaigns.campaignName, 'Direct Interview')
    ];
    
    if (dateFrom) {
      whereConditions.push(gte(jobCampaigns.createdAt, new Date(dateFrom)));
    }
    
    if (dateTo) {
      whereConditions.push(lte(jobCampaigns.createdAt, new Date(dateTo)));
    }
    
    if (campaignId) {
      whereConditions.push(eq(jobCampaigns.id, campaignId));
    }

    // Get total campaigns
    const totalCampaigns = await db
      .select({ count: count() })
      .from(jobCampaigns)
      .where(and(...whereConditions));

    // Get active campaigns
    const activeCampaigns = await db
      .select({ count: count() })
      .from(jobCampaigns)
      .where(and(
        ...whereConditions,
        eq(jobCampaigns.status, 'active')
      ));

    // Get total candidates
    const totalCandidates = await db
      .select({ count: count() })
      .from(candidates)
      .leftJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(and(...whereConditions));

    // Get candidates by status
    const candidatesByStatus = await db
      .select({
        status: candidates.status,
        count: count()
      })
      .from(candidates)
      .leftJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(and(...whereConditions))
      .groupBy(candidates.status);

    // Get total interviews
    const totalInterviews = await db
      .select({ count: count() })
      .from(campaignInterviews)
      .leftJoin(jobCampaigns, eq(campaignInterviews.campaignId, jobCampaigns.id))
      .where(and(...whereConditions));

    // Get interviews by status
    const interviewsByStatus = await db
      .select({
        status: campaignInterviews.status,
        count: count()
      })
      .from(campaignInterviews)
      .leftJoin(jobCampaigns, eq(campaignInterviews.campaignId, jobCampaigns.id))
      .where(and(...whereConditions))
      .groupBy(campaignInterviews.status);

    // Get interviews by type
    const interviewsByType = await db
      .select({
        type: campaignInterviews.interviewType,
        count: count()
      })
      .from(campaignInterviews)
      .leftJoin(jobCampaigns, eq(campaignInterviews.campaignId, jobCampaigns.id))
      .where(and(...whereConditions))
      .groupBy(campaignInterviews.interviewType);

    // Get average scores
    const averageScores = await db
      .select({
        averageScore: avg(campaignInterviews.score)
      })
      .from(campaignInterviews)
      .leftJoin(jobCampaigns, eq(campaignInterviews.campaignId, jobCampaigns.id))
      .where(and(
        ...whereConditions,
        eq(campaignInterviews.status, 'completed')
      ));

    // Get completion rate
    const completedInterviews = await db
      .select({ count: count() })
      .from(campaignInterviews)
      .leftJoin(jobCampaigns, eq(campaignInterviews.campaignId, jobCampaigns.id))
      .where(and(
        ...whereConditions,
        eq(campaignInterviews.status, 'completed')
      ));

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentCandidates = await db
      .select({ count: count() })
      .from(candidates)
      .leftJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(and(
        ...whereConditions,
        gte(candidates.appliedAt, thirtyDaysAgo)
      ));

    const recentInterviews = await db
      .select({ count: count() })
      .from(campaignInterviews)
      .leftJoin(jobCampaigns, eq(campaignInterviews.campaignId, jobCampaigns.id))
      .where(and(
        ...whereConditions,
        gte(campaignInterviews.createdAt, thirtyDaysAgo)
      ));

    // Calculate metrics
    const totalInterviewCount = totalInterviews[0]?.count || 0;
    const completedInterviewCount = completedInterviews[0]?.count || 0;
    const completionRate = totalInterviewCount > 0 ? (completedInterviewCount / totalInterviewCount) * 100 : 0;
    
    const overview = {
      summary: {
        totalCampaigns: totalCampaigns[0]?.count || 0,
        activeCampaigns: activeCampaigns[0]?.count || 0,
        totalCandidates: totalCandidates[0]?.count || 0,
        totalInterviews: totalInterviewCount,
        completedInterviews: completedInterviewCount,
        completionRate: Math.round(completionRate * 100) / 100,
        averageScore: averageScores[0]?.averageScore ? Math.round(Number(averageScores[0].averageScore) * 100) / 100 : 0
      },
      breakdown: {
        candidatesByStatus: candidatesByStatus.reduce((acc: any, item) => {
          acc[item.status || 'unknown'] = item.count;
          return acc;
        }, {}),
        interviewsByStatus: interviewsByStatus.reduce((acc: any, item) => {
          acc[item.status || 'unknown'] = item.count;
          return acc;
        }, {}),
        interviewsByType: interviewsByType.reduce((acc: any, item) => {
          acc[item.type || 'unknown'] = item.count;
          return acc;
        }, {})
      },
      recentActivity: {
        newCandidatesLast30Days: recentCandidates[0]?.count || 0,
        newInterviewsLast30Days: recentInterviews[0]?.count || 0
      },
      filters: {
        dateFrom,
        dateTo,
        campaignId
      }
    };

    return createV2Response(
      overview,
      200,
      'Overview analytics retrieved successfully'
    );

  } catch (error) {
    console.error('Error fetching overview analytics:', error);
    return createV2ErrorResponse(
      'Failed to fetch overview analytics',
      'FETCH_ANALYTICS_ERROR',
      500
    );
  }
}