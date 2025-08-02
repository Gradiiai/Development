import { getServerSessionWithAuth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/database/connection';
import { users, companies, Interview, CodingInterview } from '@/lib/database/schema';
import { eq, and, count, sql, desc } from 'drizzle-orm';
import LimitsClient from './_components/LimitsClient';

export default async function LimitsPage() {
  const session = await getServerSessionWithAuth();

  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  try {
    // Get user data with company information
    const userData = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        companyId: users.companyId,
        companyName: companies.name,
        subscriptionPlan: companies.subscriptionPlan,
        subscriptionStatus: companies.subscriptionStatus,
        maxUsers: companies.maxUsers,
        maxInterviews: companies.maxInterviews,
        monthlyRevenue: companies.monthlyRevenue,
        yearlyRevenue: companies.yearlyRevenue,
        subscriptionStartDate: companies.subscriptionStartDate,
        subscriptionEndDate: companies.subscriptionEndDate,
      })
      .from(users)
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!userData.length || !userData[0].companyId) {
      redirect('/dashboard');
    }

    const user = userData[0];

    // Get current usage statistics
    const [currentUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(user.companyId ? and(
        eq(users.companyId, user.companyId),
        eq(users.isActive, true)
      ) : sql`1=0`);

    const [currentInterviews] = await db
      .select({ count: count() })
      .from(Interview)
      .where(user.companyId ? eq(Interview.companyId, user.companyId) : sql`1=0`);

    const [currentCodingInterviews] = await db
      .select({ count: count() })
      .from(CodingInterview)
      .where(user.companyId ? eq(CodingInterview.companyId, user.companyId) : sql`1=0`);

    // Get recent interviews for activity tracking
    const recentInterviews = await db
      .select({
        id: Interview.id,
        candidateName: Interview.candidateName,
        position: Interview.jobPosition,
        status: Interview.interviewStatus,
        createdAt: Interview.createdAt,
        type: sql`'behavioral'`,
      })
      .from(Interview)
      .where(user.companyId ? eq(Interview.companyId, user.companyId) : sql`1=0`)
      .orderBy(desc(Interview.createdAt))
      .limit(10);

    const recentCodingInterviews = await db
      .select({
        id: CodingInterview.id,
        candidateName: CodingInterview.candidateName,
        position: CodingInterview.interviewTopic,
        status: CodingInterview.interviewStatus,
        createdAt: CodingInterview.createdAt,
        difficulty: CodingInterview.difficultyLevel,
      })
      .from(CodingInterview)
      .where(user.companyId ? eq(CodingInterview.companyId, user.companyId) : sql`1=0`)
      .orderBy(desc(CodingInterview.createdAt))
      .limit(10);

    const totalInterviews = (currentInterviews?.count || 0) + (currentCodingInterviews?.count || 0);

    const limitsData = {
      user: {
        name: user.name || '',
        email: user.email,
        role: user.role || 'company',
        companyName: user.companyName || '',
      },
      subscription: {
        plan: user.subscriptionPlan || 'free',
        status: user.subscriptionStatus || 'active',
        monthlyRevenue: user.monthlyRevenue || 0,
        yearlyRevenue: user.yearlyRevenue || 0,
        startDate: user.subscriptionStartDate?.toISOString() || null,
        endDate: user.subscriptionEndDate?.toISOString() || null,
      },
      limits: {
        maxUsers: user.maxUsers || 5,
        maxInterviews: user.maxInterviews || 10,
        currentUsers: currentUsers?.count || 0,
        currentInterviews: totalInterviews,
        behavioralInterviews: currentInterviews?.count || 0,
        codingInterviews: currentCodingInterviews?.count || 0,
      },
      recentActivity: {
        interviews: recentInterviews.map(interview => ({
          id: interview.id.toString(),
          candidateName: interview.candidateName || 'Unknown',
          position: interview.position || 'Unknown',
          status: interview.status || 'scheduled',
          type: 'behavioral' as const,
          createdAt: typeof interview.createdAt === 'string' ? interview.createdAt : new Date(interview.createdAt).toISOString(),
        })),
        codingInterviews: recentCodingInterviews.map(interview => ({
          id: interview.id.toString(),
          candidateName: interview.candidateName || 'Unknown',
          position: interview.position || 'Unknown',
          status: interview.status || 'scheduled',
          difficulty: interview.difficulty || 'medium',
          type: 'coding' as const,
          createdAt: typeof interview.createdAt === 'string' ? interview.createdAt : new Date(interview.createdAt).toISOString(),
        })),
      },
    };

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Usage Limits & Activity
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Monitor your current usage and subscription limits
            </p>
          </div>

          <LimitsClient data={limitsData} />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching limits data:', error);
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              Error Loading Limits
            </h2>
            <p className="text-red-600">
              There was an error loading your usage limits. Please try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }
}