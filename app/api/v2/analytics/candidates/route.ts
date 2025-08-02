import { NextRequest } from 'next/server';
import { db } from '@/lib/database/connection';
import { eq, and, count, avg, gte, lte, sql, desc } from 'drizzle-orm';
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
  campaignInterviews
} from '@/lib/database/schema';

/**
 * GET /api/v2/analytics/candidates
 * Get detailed candidate analytics
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
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const { page, limit, offset } = extractPagination(request);

    // Build where conditions
    const whereConditions = [eq(jobCampaigns.companyId, authContext.token.companyId)];
    
    if (dateFrom) {
      whereConditions.push(gte(candidates.appliedAt, new Date(dateFrom)));
    }
    
    if (dateTo) {
      whereConditions.push(lte(candidates.appliedAt, new Date(dateTo)));
    }
    
    if (campaignId) {
      whereConditions.push(eq(candidates.campaignId, campaignId));
    }
    
    if (status) {
      whereConditions.push(eq(candidates.status, status));
    }
    
    if (source) {
      whereConditions.push(eq(candidates.source, source));
    }

    // Get candidate statistics
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

    // Get candidates by source
    const candidatesBySource = await db
      .select({
        source: candidates.source,
        count: count()
      })
      .from(candidates)
      .leftJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(and(...whereConditions))
      .groupBy(candidates.source);

    // Get candidates by campaign
    const candidatesByCampaign = await db
      .select({
        campaignId: jobCampaigns.id,
        campaignName: jobCampaigns.campaignName,
        jobTitle: jobCampaigns.jobTitle,
        count: count(),
        appliedCount: sql<number>`COUNT(CASE WHEN ${candidates.status} = 'applied' THEN 1 END)`,
        screenedCount: sql<number>`COUNT(CASE WHEN ${candidates.status} = 'screened' THEN 1 END)`,
        interviewedCount: sql<number>`COUNT(CASE WHEN ${candidates.status} = 'interviewed' THEN 1 END)`,
        hiredCount: sql<number>`COUNT(CASE WHEN ${candidates.status} = 'hired' THEN 1 END)`,
        rejectedCount: sql<number>`COUNT(CASE WHEN ${candidates.status} = 'rejected' THEN 1 END)`
      })
      .from(candidates)
      .leftJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(and(...whereConditions))
      .groupBy(jobCampaigns.id, jobCampaigns.campaignName, jobCampaigns.jobTitle)
      .orderBy(desc(count()))
      .limit(10);

    // Get conversion funnel
    const conversionFunnel = await db
      .select({
        totalApplied: sql<number>`COUNT(*)`,
        screened: sql<number>`COUNT(CASE WHEN ${candidates.status} IN ('screened', 'interviewed', 'hired') THEN 1 END)`,
        interviewed: sql<number>`COUNT(CASE WHEN ${candidates.status} IN ('interviewed', 'hired') THEN 1 END)`,
        hired: sql<number>`COUNT(CASE WHEN ${candidates.status} = 'hired' THEN 1 END)`
      })
      .from(candidates)
      .leftJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(and(...whereConditions));

    // Get time-based analytics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyCandidates = await db
      .select({
        date: sql<string>`DATE(${candidates.appliedAt})`,
        count: count(),
        hiredCount: sql<number>`COUNT(CASE WHEN ${candidates.status} = 'hired' THEN 1 END)`
      })
      .from(candidates)
      .leftJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(and(
        ...whereConditions,
        gte(candidates.appliedAt, thirtyDaysAgo)
      ))
      .groupBy(sql`DATE(${candidates.appliedAt})`)
      .orderBy(sql`DATE(${candidates.appliedAt})`);

    // Get candidate performance metrics
    const candidatePerformance = await db
      .select({
        candidateId: candidates.id,
        candidateName: candidates.name,
        candidateEmail: candidates.email,
        campaignName: jobCampaigns.campaignName,
        jobTitle: jobCampaigns.jobTitle,
        status: candidates.status,
        source: candidates.source,
        appliedAt: candidates.appliedAt,
        interviewCount: sql<number>`COUNT(${campaignInterviews.id})`,
        averageScore: avg(campaignInterviews.score),
        highestScore: sql<number>`MAX(${campaignInterviews.score})`,
        lastInterviewDate: sql<Date>`MAX(${campaignInterviews.completedAt})`
      })
      .from(candidates)
      .leftJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .leftJoin(campaignInterviews, eq(candidates.id, campaignInterviews.candidateId))
      .where(and(...whereConditions))
      .groupBy(
        candidates.id,
        candidates.name,
        candidates.email,
        jobCampaigns.campaignName,
        jobCampaigns.jobTitle,
        candidates.status,
        candidates.source,
        candidates.appliedAt
      )
      .orderBy(desc(candidates.appliedAt))
      .limit(limit)
      .offset(offset);

    // Get top performing candidates
    const topPerformers = await db
      .select({
        candidateId: candidates.id,
        candidateName: candidates.name,
        candidateEmail: candidates.email,
        campaignName: jobCampaigns.campaignName,
        jobTitle: jobCampaigns.jobTitle,
        averageScore: avg(campaignInterviews.score),
        interviewCount: count(campaignInterviews.id)
      })
      .from(candidates)
      .leftJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .leftJoin(campaignInterviews, and(
        eq(candidates.id, campaignInterviews.candidateId),
        eq(campaignInterviews.status, 'completed')
      ))
      .where(and(...whereConditions))
      .groupBy(
        candidates.id,
        candidates.name,
        candidates.email,
        jobCampaigns.campaignName,
        jobCampaigns.jobTitle
      )
      .having(sql`COUNT(${campaignInterviews.id}) > 0`)
      .orderBy(desc(avg(campaignInterviews.score)))
      .limit(10);

    // Calculate conversion rates
    const totalApplied = conversionFunnel[0]?.totalApplied || 0;
    const screened = conversionFunnel[0]?.screened || 0;
    const interviewed = conversionFunnel[0]?.interviewed || 0;
    const hired = conversionFunnel[0]?.hired || 0;

    const screeningRate = totalApplied > 0 ? (screened / totalApplied) * 100 : 0;
    const interviewRate = screened > 0 ? (interviewed / screened) * 100 : 0;
    const hireRate = interviewed > 0 ? (hired / interviewed) * 100 : 0;
    const overallConversionRate = totalApplied > 0 ? (hired / totalApplied) * 100 : 0;

    const analytics = {
      summary: {
        totalCandidates: totalCandidates[0]?.count || 0,
        totalApplied,
        screened,
        interviewed,
        hired,
        screeningRate: Math.round(screeningRate * 100) / 100,
        interviewRate: Math.round(interviewRate * 100) / 100,
        hireRate: Math.round(hireRate * 100) / 100,
        overallConversionRate: Math.round(overallConversionRate * 100) / 100
      },
      breakdown: {
        byStatus: candidatesByStatus.reduce((acc: any, item) => {
          acc[item.status || 'unknown'] = item.count;
          return acc;
        }, {}),
        bySource: candidatesBySource.reduce((acc: any, item) => {
          acc[item.source || 'unknown'] = item.count;
          return acc;
        }, {}),
        byCampaign: candidatesByCampaign.map(item => ({
          campaignId: item.campaignId,
          campaignName: item.campaignName,
          jobTitle: item.jobTitle,
          totalCandidates: item.count,
          applied: Number(item.appliedCount),
          screened: Number(item.screenedCount),
          interviewed: Number(item.interviewedCount),
          hired: Number(item.hiredCount),
          rejected: Number(item.rejectedCount),
          conversionRate: item.count > 0 ? Math.round((Number(item.hiredCount) / item.count) * 10000) / 100 : 0
        }))
      },
      conversionFunnel: {
        applied: totalApplied,
        screened: {
          count: screened,
          rate: screeningRate
        },
        interviewed: {
          count: interviewed,
          rate: interviewRate
        },
        hired: {
          count: hired,
          rate: hireRate
        }
      },
      trends: {
        dailyCandidates: dailyCandidates.map(item => ({
          date: item.date,
          totalCandidates: item.count,
          hired: Number(item.hiredCount)
        }))
      },
      topPerformers: topPerformers.map(item => ({
        candidateId: item.candidateId,
        name: item.candidateName,
        email: item.candidateEmail,
        campaignName: item.campaignName,
        jobTitle: item.jobTitle,
        averageScore: item.averageScore ? Math.round(Number(item.averageScore) * 100) / 100 : 0,
        interviewCount: item.interviewCount
      })),
      candidates: candidatePerformance.map(item => ({
        candidateId: item.candidateId,
        name: item.candidateName,
        email: item.candidateEmail,
        campaignName: item.campaignName,
        jobTitle: item.jobTitle,
        status: item.status,
        source: item.source,
        appliedAt: item.appliedAt,
        interviewCount: Number(item.interviewCount),
        averageScore: item.averageScore ? Math.round(Number(item.averageScore) * 100) / 100 : null,
        highestScore: item.highestScore ? Number(item.highestScore) : null,
        lastInterviewDate: item.lastInterviewDate
      })),
      pagination: {
        page,
        limit,
        total: totalCandidates[0]?.count || 0,
        totalPages: Math.ceil((totalCandidates[0]?.count || 0) / limit)
      },
      filters: {
        dateFrom,
        dateTo,
        campaignId,
        status,
        source
      }
    };

    return createV2Response(
      analytics,
      200,
      'Candidate analytics retrieved successfully'
    );

  } catch (error) {
    console.error('Error fetching candidate analytics:', error);
    return createV2ErrorResponse(
      'Failed to fetch candidate analytics',
      'FETCH_ANALYTICS_ERROR',
      500
    );
  }
}