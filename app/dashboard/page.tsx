
import { getServerSessionWithAuth } from '@/auth';
import { Inter } from "next/font/google";
import {
  Activity,
  Code,
  Users,
  Clock,
  Target,
  Award,
  Loader2,
  Calendar,
  Briefcase,
  LineChart,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Zap,
} from "lucide-react";
import InterviewList from "./_components/InterviewList";
import CodingInterviewList from "./_components/CodingInterviewList";
import AnalyticsSection from "./_components/AnalyticsSection";
import { db } from "@/lib/database/connection";
import { motion } from "framer-motion";
import { Interview, CodingInterview, jobCampaigns, candidates, companies } from "@/lib/database/schema";
import { desc, eq, count, inArray } from "drizzle-orm";
import DashboardClient from "./_components/DashboardClient";

const inter = Inter({ subsets: ["latin"] });

// Types
type CodingInterviewData = {
  id: number;
  codingQuestions: string;
  interviewId: string;
  interviewTopic: string;
  difficultyLevel: string;
  problemDescription: string;
  timeLimit: number;
  programmingLanguage: string;
  createdBy: string;
  createdAt: Date;
};

export default async function Dashboard() {
  const session = await getServerSessionWithAuth();

  if (!session?.user?.email) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please sign in to access your dashboard.</p>
        </div>
      </div>
    );
  }

  try {
    // Fetch user's interviews and coding interviews
    const codingInterviews = await db
      .select()
      .from(CodingInterview)
      .where(eq(CodingInterview.createdBy, session.user.id || ''));

    const interviews = await db
      .select()
      .from(Interview)
      .where(eq(Interview.createdBy, session.user.id || ''));

    // Fetch job campaigns
    const userJobCampaigns = await db
      .select()
      .from(jobCampaigns)
      .where(eq(jobCampaigns.companyId, session.user.companyId || ''))
      .orderBy(desc(jobCampaigns.createdAt))
      .limit(10);

    // Fetch candidates for all company campaigns
    const campaignIds = userJobCampaigns.map(campaign => campaign.id);
    const userCandidates = campaignIds.length > 0
      ? await db
          .select()
          .from(candidates)
          .where(inArray(candidates.campaignId, campaignIds))
          .orderBy(desc(candidates.appliedAt))
          .limit(10)
      : [];

    // Calculate enhanced stats
    const totalInterviews = interviews.length;
    const totalSessions = codingInterviews.length + totalInterviews;
    const upcomingInterviews = interviews.filter(
      (interview) => interview.interviewStatus === "scheduled"
    ).length;
    const pendingFeedback = interviews.filter(
      (interview) => interview.interviewStatus === "completed" && !interview.interviewQuestions
    ).length;
    const completedInterviews = interviews.filter(
      (interview) => interview.interviewStatus === "completed"
    );
    const completionRate = totalSessions > 0
            ? Math.round((completedInterviews.length / totalSessions) * 100)
            : 0;

    const totalCandidates = userCandidates.length;
    const totalJobCampaigns = userJobCampaigns.length;
    const activeJobs = userJobCampaigns.filter(job => job.status === 'active').length;
    const hiredCandidates = userCandidates.filter(candidate => candidate.status === 'hired').length;

    const enhancedStats = {
      totalInterviews,
      completionRate,
      totalSessions,
      upcomingInterviews,
      pendingFeedback,
      totalCandidates,
      totalJobCampaigns,
      activeJobs,
      hiredCandidates,
    };

    // Create recent activity data
    const recentActivity = [
      ...interviews.slice(0, 3).map(interview => ({
        id: interview.id,
        type: 'interview' as const,
        title: `Interview scheduled: ${interview.jobPosition}`,
        timestamp: interview.createdAt,
        status: interview.interviewStatus
      })),
      ...userJobCampaigns.slice(0, 2).map(job => ({
        id: job.id,
        type: 'job' as const,
        title: `Job posted: ${job.jobTitle}`,
        timestamp: job.createdAt,
        status: job.status
      })),
      ...userCandidates.slice(0, 2).map(candidate => ({
        id: candidate.id,
        type: 'candidate' as const,
        title: `New candidate: ${candidate.name}`,
        timestamp: candidate.appliedAt,
        status: candidate.status
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);

    // Create chart data based on real data
    const candidateStatusCounts = userCandidates.reduce((acc, candidate) => {
      const status = candidate.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const chartData = {
      interviewTrends: [],
      candidateStatus: Object.entries(candidateStatusCounts).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        count,
        fill: status === 'applied' ? '#3b82f6' : 
              status === 'screening' ? '#f59e0b' : 
              status === 'interview' ? '#10b981' : 
              status === 'hired' ? '#8b5cf6' : '#6b7280'
      })),
      conversionRates: [],
      usageStats: [
        { metric: 'Interviews Created', value: totalInterviews, percentage: Math.min((totalInterviews / 50) * 100, 100) },
        { metric: 'Candidates Processed', value: totalCandidates, percentage: Math.min((totalCandidates / 200) * 100, 100) },
        { metric: 'Jobs Posted', value: totalJobCampaigns, percentage: Math.min((totalJobCampaigns / 20) * 100, 100) }
      ]
    };

    // Create subscription data from user's company
    const userCompany = session.user.companyId ? await db
      .select()
      .from(companies)
      .where(eq(companies.id, session.user.companyId))
      .limit(1) : [];

    const subscription = {
      plan: userCompany[0]?.subscriptionPlan || 'free',
      status: userCompany[0]?.subscriptionStatus || 'active',
      candidates: totalCandidates,
      maxCandidates: 1000,
      expiryDate: userCompany[0]?.subscriptionEndDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };

    return (
      <DashboardClient 
        session={session} 
        stats={enhancedStats} 
        interviews={interviews}
        codingInterviews={codingInterviews}
        jobCampaigns={userJobCampaigns}
        candidates={userCandidates}
        recentActivity={recentActivity}
        chartData={chartData}
        subscription={subscription}
      />
    );
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Dashboard</h1>
          <p className="text-gray-600">There was an error loading your dashboard. Please try again later.</p>
        </div>
      </div>
    );
  }
}
