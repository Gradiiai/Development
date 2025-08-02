import { NextRequest } from 'next/server';
import { db } from '@/lib/database/connection';
import { eq, and, count, avg, gte, lte, sql, desc, ne } from 'drizzle-orm';
import {
  withV2Auth,
  createV2Response,
  createV2ErrorResponse,
  validateMethod,
  extractPagination
} from '../../middleware';
import {
  jobCampaigns,
  candidates,
  campaignInterviews,
  interviewSetups
} from '@/lib/database/schema';

/**
 * GET /api/v2/analytics/interviews
 * Get detailed interview analytics
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
    const interviewType = searchParams.get('interviewType');
    const status = searchParams.get('status');
    const { page, limit, offset } = extractPagination(request);

    // Build where conditions
    const whereConditions = [
      eq(jobCampaigns.companyId, authContext.token.companyId),
      // Exclude direct interview campaigns
      ne(jobCampaigns.campaignName, 'Direct Interview')
    ];
    
    if (dateFrom) {
      whereConditions.push(gte(campaignInterviews.createdAt, new Date(dateFrom)));
    }
    
    if (dateTo) {
      whereConditions.push(lte(campaignInterviews.createdAt, new Date(dateTo)));
    }
    
    if (campaignId) {
      whereConditions.push(eq(campaignInterviews.campaignId, campaignId));
    }
    
    if (interviewType) {
      whereConditions.push(eq(campaignInterviews.interviewType, interviewType));
    }
    
    if (status) {
      whereConditions.push(eq(campaignInterviews.status, status));
    }

    // Get interview statistics
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
        count: count(),
        averageScore: avg(campaignInterviews.score)
      })
      .from(campaignInterviews)
      .leftJoin(jobCampaigns, eq(campaignInterviews.campaignId, jobCampaigns.id))
      .where(and(...whereConditions))
      .groupBy(campaignInterviews.interviewType);

    // Get interviews by campaign
    const interviewsByCampaign = await db
      .select({
        campaignId: jobCampaigns.id,
        campaignName: jobCampaigns.campaignName,
        jobTitle: jobCampaigns.jobTitle,
        count: count(),
        averageScore: avg(campaignInterviews.score),
        completedCount: sql<number>`COUNT(CASE WHEN ${campaignInterviews.status} = 'completed' THEN 1 END)`,
        scheduledCount: sql<number>`COUNT(CASE WHEN ${campaignInterviews.status} = 'scheduled' THEN 1 END)`,
        inProgressCount: sql<number>`COUNT(CASE WHEN ${campaignInterviews.status} = 'in_progress' THEN 1 END)`
      })
      .from(campaignInterviews)
      .leftJoin(jobCampaigns, eq(campaignInterviews.campaignId, jobCampaigns.id))
      .where(and(...whereConditions))
      .groupBy(jobCampaigns.id, jobCampaigns.campaignName, jobCampaigns.jobTitle)
      .orderBy(desc(count()))
      .limit(10);

    // Get score distribution
    const scoreDistribution = await db
      .select({
        scoreRange: sql<string>`
          CASE 
            WHEN ${campaignInterviews.score} >= 90 THEN '90-100'
            WHEN ${campaignInterviews.score} >= 80 THEN '80-89'
            WHEN ${campaignInterviews.score} >= 70 THEN '70-79'
            WHEN ${campaignInterviews.score} >= 60 THEN '60-69'
            WHEN ${campaignInterviews.score} >= 50 THEN '50-59'
            ELSE '0-49'
          END
        `,
        count: count()
      })
      .from(campaignInterviews)
      .leftJoin(jobCampaigns, eq(campaignInterviews.campaignId, jobCampaigns.id))
      .where(and(
        ...whereConditions,
        eq(campaignInterviews.status, 'completed')
      ))
      .groupBy(sql`
        CASE 
          WHEN ${campaignInterviews.score} >= 90 THEN '90-100'
          WHEN ${campaignInterviews.score} >= 80 THEN '80-89'
          WHEN ${campaignInterviews.score} >= 70 THEN '70-79'
          WHEN ${campaignInterviews.score} >= 60 THEN '60-69'
          WHEN ${campaignInterviews.score} >= 50 THEN '50-59'
          ELSE '0-49'
        END
      `);

    // Get time-based analytics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyInterviews = await db
      .select({
        date: sql<string>`DATE(${campaignInterviews.createdAt})`,
        count: count(),
        completedCount: sql<number>`COUNT(CASE WHEN ${campaignInterviews.status} = 'completed' THEN 1 END)`
      })
      .from(campaignInterviews)
      .leftJoin(jobCampaigns, eq(campaignInterviews.campaignId, jobCampaigns.id))
      .where(and(
        ...whereConditions,
        gte(campaignInterviews.createdAt, thirtyDaysAgo)
      ))
      .groupBy(sql`DATE(${campaignInterviews.createdAt})`)
      .orderBy(sql`DATE(${campaignInterviews.createdAt})`);

    // Get average completion time for completed interviews
    const completionTimes = await db
      .select({
        averageMinutes: sql<number>`AVG(EXTRACT(EPOCH FROM (${campaignInterviews.completedAt} - ${campaignInterviews.scheduledAt})) / 60)`
      })
      .from(campaignInterviews)
      .leftJoin(jobCampaigns, eq(campaignInterviews.campaignId, jobCampaigns.id))
      .where(and(
        ...whereConditions,
        eq(campaignInterviews.status, 'completed')
      ));

    // Get detailed interview list with pagination
    const interviews = await db
      .select({
        id: campaignInterviews.id,
        candidateId: campaignInterviews.candidateId,
        candidateName: candidates.name,
        candidateEmail: candidates.email,
        campaignId: campaignInterviews.campaignId,
        campaignName: jobCampaigns.campaignName,
        jobTitle: jobCampaigns.jobTitle,
        interviewType: campaignInterviews.interviewType,
        status: campaignInterviews.status,
        score: campaignInterviews.score,
        scheduledAt: campaignInterviews.scheduledAt,
        completedAt: campaignInterviews.completedAt,
        createdAt: campaignInterviews.createdAt
      })
      .from(campaignInterviews)
      .leftJoin(jobCampaigns, eq(campaignInterviews.campaignId, jobCampaigns.id))
      .leftJoin(candidates, eq(campaignInterviews.candidateId, candidates.id))
      .where(and(...whereConditions))
      .orderBy(desc(campaignInterviews.createdAt))
      .limit(limit)
      .offset(offset);

    // Calculate overall statistics
    const completedInterviews = interviewsByStatus.find(item => item.status === 'completed')?.count || 0;
    const totalCount = totalInterviews[0]?.count || 0;
    const completionRate = totalCount > 0 ? (completedInterviews / totalCount) * 100 : 0;
    
    const overallAverageScore = await db
      .select({
        averageScore: avg(campaignInterviews.score)
      })
      .from(campaignInterviews)
      .leftJoin(jobCampaigns, eq(campaignInterviews.campaignId, jobCampaigns.id))
      .where(and(
        ...whereConditions,
        eq(campaignInterviews.status, 'completed')
      ));

    const analytics = {
      summary: {
        totalInterviews: totalCount,
        completedInterviews,
        completionRate: Math.round(completionRate * 100) / 100,
        averageScore: overallAverageScore[0]?.averageScore ? Math.round(Number(overallAverageScore[0].averageScore) * 100) / 100 : 0,
        averageCompletionTimeMinutes: completionTimes[0]?.averageMinutes ? Math.round(Number(completionTimes[0].averageMinutes) * 100) / 100 : 0
      },
      breakdown: {
        byStatus: interviewsByStatus.reduce((acc: any, item) => {
          acc[item.status || 'unknown'] = item.count;
          return acc;
        }, {}),
        byType: interviewsByType.map(item => ({
          type: item.type,
          count: item.count,
          averageScore: item.averageScore ? Math.round(Number(item.averageScore) * 100) / 100 : 0
        })),
        byCampaign: interviewsByCampaign.map(item => ({
          campaignId: item.campaignId,
          campaignName: item.campaignName,
          jobTitle: item.jobTitle,
          totalInterviews: item.count,
          completedInterviews: Number(item.completedCount),
          scheduledInterviews: Number(item.scheduledCount),
          inProgressInterviews: Number(item.inProgressCount),
          averageScore: item.averageScore ? Math.round(Number(item.averageScore) * 100) / 100 : 0
        })),
        scoreDistribution: scoreDistribution.reduce((acc: any, item) => {
          acc[item.scoreRange] = item.count;
          return acc;
        }, {})
      },
      trends: {
        dailyInterviews: dailyInterviews.map(item => ({
          date: item.date,
          totalInterviews: item.count,
          completedInterviews: Number(item.completedCount)
        }))
      },
      interviews,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      filters: {
        dateFrom,
        dateTo,
        campaignId,
        interviewType,
        status
      }
    };

    return createV2Response(
      analytics,
      200,
      'Interview analytics retrieved successfully'
    );

  } catch (error) {
    console.error('Error fetching interview analytics:', error);
    return createV2ErrorResponse(
      'Failed to fetch interview analytics',
      'FETCH_ANALYTICS_ERROR',
      500
    );
  }
}