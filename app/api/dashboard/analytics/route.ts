import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database/db';
import { candidateInterviewHistory, Interview, CodingInterview, candidateUsers, companies, jobCampaigns, candidates, candidateApplications } from '@/lib/database/schema';
import { eq, and, gte, desc, count, avg, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeRange = parseInt(searchParams.get('timeRange') || '30');
    const interviewType = searchParams.get('type') || 'all';

    const companyId = session.user.companyId;
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - timeRange);

    // Get all interview history for the company
    const interviewHistoryQuery = db
      .select({
        id: candidateInterviewHistory.id,
        interviewId: candidateInterviewHistory.interviewId,
        candidateId: candidateInterviewHistory.candidateId,
        status: candidateInterviewHistory.status,
        score: candidateInterviewHistory.score,
        maxScore: candidateInterviewHistory.maxScore,
        duration: candidateInterviewHistory.duration,
        feedback: candidateInterviewHistory.feedback,
        startedAt: candidateInterviewHistory.startedAt,
        completedAt: candidateInterviewHistory.completedAt,
        candidateName: sql<string>`CONCAT(${candidateUsers.firstName}, ' ', ${candidateUsers.lastName})`,
        candidateEmail: candidateUsers.email,
        interviewType: sql<string>`COALESCE(${Interview.interviewType}, 'coding', 'unknown')`,
        interviewTitle: sql<string>`COALESCE(${Interview.jobPosition}, ${CodingInterview.interviewTopic}, 'Interview')`,
        campaignTitle: jobCampaigns.campaignName,
        candidateStatus: sql<string>`COALESCE(${candidates.status}, ${candidateApplications.status}, 'pending')`,
      })
      .from(candidateInterviewHistory)
      .leftJoin(candidateUsers, eq(candidateInterviewHistory.candidateId, candidateUsers.id))
      .leftJoin(Interview, eq(candidateInterviewHistory.interviewId, Interview.interviewId))
      .leftJoin(CodingInterview, eq(candidateInterviewHistory.interviewId, CodingInterview.interviewId))
      .leftJoin(jobCampaigns, eq(Interview.campaignId, jobCampaigns.id))
      .leftJoin(candidates, eq(candidateInterviewHistory.candidateId, candidates.id))
      .leftJoin(candidateApplications, eq(candidateInterviewHistory.candidateId, candidateApplications.id))
      .where(
        and(
          sql`(${Interview.companyId} = ${companyId} OR ${CodingInterview.companyId} = ${companyId})`,
          gte(candidateInterviewHistory.completedAt, dateThreshold)
        )
      )
      .orderBy(desc(candidateInterviewHistory.completedAt));

    const interviewHistory = await interviewHistoryQuery;

    // Filter by interview type if specified
    const filteredHistory = interviewType === 'all' 
      ? interviewHistory 
      : interviewHistory.filter(h => h.interviewType === interviewType);

    // Calculate overview metrics
    const totalInterviews = filteredHistory.length;
    const completedInterviews = filteredHistory.filter(h => h.status === 'completed').length;
    const averageScore = completedInterviews > 0 
      ? filteredHistory
          .filter(h => h.status === 'completed' && h.score && h.maxScore)
          .reduce((sum, h) => sum + ((h.score! / h.maxScore!) * 100), 0) / completedInterviews
      : 0;

    // Calculate average time per question (assuming 10 questions per interview on average)
    const averageTimePerQuestion = completedInterviews > 0
      ? filteredHistory
          .filter(h => h.status === 'completed' && h.duration)
          .reduce((sum, h) => sum + (h.duration! / 10), 0) / completedInterviews
      : 0;

    const completionRate = totalInterviews > 0 ? (completedInterviews / totalInterviews) * 100 : 0;
    const topPerformers = filteredHistory.filter(h => 
      h.status === 'completed' && h.score && h.maxScore && (h.score / h.maxScore) >= 0.8
    ).length;

    // Prepare interview results data
    const interviewResults = filteredHistory
      .filter(h => h.status === 'completed')
      .map(h => {
        const scorePercentage = h.score && h.maxScore ? (h.score / h.maxScore) * 100 : 0;
        let performance: 'excellent' | 'good' | 'average' | 'poor' = 'poor';
        
        if (scorePercentage >= 90) performance = 'excellent';
        else if (scorePercentage >= 75) performance = 'good';
        else if (scorePercentage >= 60) performance = 'average';

        // Parse answers to calculate accuracy for MCQ
        let accuracy = 0;
        if (h.feedback && h.interviewType === 'mcq') {
          try {
            const answers = JSON.parse(h.feedback);
            const totalQuestions = Object.keys(answers).length;
            if (totalQuestions > 0) {
              accuracy = (h.score! / h.maxScore!) * 100;
            }
          } catch (e) {
            accuracy = scorePercentage;
          }
        } else {
          accuracy = scorePercentage;
        }

        // Map candidate status to approval status
        const getApprovalStatus = (status: string): 'pending' | 'approved' | 'rejected' => {
          switch (status?.toLowerCase()) {
            case 'hired':
            case 'approved':
              return 'approved';
            case 'rejected':
            case 'declined':
              return 'rejected';
            default:
              return 'pending';
          }
        };

        return {
          id: h.id,
          candidateId: h.candidateId,
          candidateName: h.candidateName || 'Unknown',
          candidateEmail: h.candidateEmail || '',
          type: h.interviewType || 'unknown',
          title: h.interviewTitle || 'Interview',
          score: Math.round(scorePercentage),
          maxScore: h.maxScore || 0,
          scoreText: `${Math.round(scorePercentage)}%`,
          timeSpent: h.duration || 0,
          completedAt: h.completedAt?.toISOString() || '',
          status: h.status,
          accuracy,
          performance,
          approvalStatus: getApprovalStatus(h.candidateStatus || 'pending')
        };
      });

    // Performance metrics by type
    const typeGroups = filteredHistory.reduce((acc, h) => {
      const type = h.interviewType || 'unknown';
      if (!acc[type]) {
        acc[type] = { total: 0, completed: 0, totalScore: 0, maxScore: 0 };
      }
      acc[type].total++;
      if (h.status === 'completed') {
        acc[type].completed++;
        if (h.score && h.maxScore) {
          acc[type].totalScore += h.score;
          acc[type].maxScore += h.maxScore;
        }
      }
      return acc;
    }, {} as Record<string, any>);

    const performanceByType = Object.entries(typeGroups).map(([type, data]) => ({
      type,
      averageScore: data.maxScore > 0 ? (data.totalScore / data.maxScore) * 100 : 0,
      completionRate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
      count: data.total
    }));

    // Performance by time range (daily for last 30 days, weekly for longer periods)
    const timeRangeData = [];
    const isDaily = timeRange <= 30;
    const groupSize = isDaily ? 1 : 7; // 1 day or 7 days

    for (let i = timeRange; i >= 0; i -= groupSize) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - i);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - groupSize);

      const periodData = filteredHistory.filter(h => {
        const completedDate = h.completedAt ? new Date(h.completedAt) : null;
        return completedDate && completedDate >= startDate && completedDate < endDate;
      });

      const completedInPeriod = periodData.filter(h => h.status === 'completed');
      const avgScore = completedInPeriod.length > 0
        ? completedInPeriod
            .filter(h => h.score && h.maxScore)
            .reduce((sum, h) => sum + ((h.score! / h.maxScore!) * 100), 0) / completedInPeriod.length
        : 0;

      timeRangeData.push({
        date: endDate.toISOString().split('T')[0],
        interviews: periodData.length,
        averageScore: Math.round(avgScore * 10) / 10
      });
    }

    // Score distribution
    const scoreRanges = [
      { range: '90-100%', min: 90, max: 100 },
      { range: '75-89%', min: 75, max: 89 },
      { range: '60-74%', min: 60, max: 74 },
      { range: '40-59%', min: 40, max: 59 },
      { range: '0-39%', min: 0, max: 39 }
    ];

    const scoreDistribution = scoreRanges.map(range => {
      const count = filteredHistory.filter(h => {
        if (h.status !== 'completed' || !h.score || !h.maxScore) return false;
        const percentage = (h.score / h.maxScore) * 100;
        return percentage >= range.min && percentage <= range.max;
      }).length;

      return {
        range: range.range,
        count
      };
    });

    const analyticsData = {
      overview: {
        totalInterviews,
        completedInterviews,
        averageScore: Math.round(averageScore * 10) / 10,
        averageTimePerQuestion: Math.round(averageTimePerQuestion * 10) / 10,
        completionRate: Math.round(completionRate * 10) / 10,
        topPerformers
      },
      interviewResults,
      performanceMetrics: {
        byType: performanceByType,
        byTimeRange: timeRangeData,
        scoreDistribution
      }
    };

    return NextResponse.json(analyticsData);

  } catch (error) {
    console.error('Error fetching interview analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}