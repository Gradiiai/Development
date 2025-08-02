import { getServerSessionWithAuth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/database/connection';
import { companies, users, Interview, subscriptionTransactions, adminActivityLogs, candidateUsers, candidateApplications, candidateDocuments, jobCampaigns } from '@/lib/database/schema';
import { logAdminActivity } from '@/lib/admin/admin-activity-logger';
import { count, eq, desc, sql, gte } from 'drizzle-orm';
import AdminClient from './_components/AdminClient';

export default async function AdminDashboard() {
  const session = await getServerSessionWithAuth();
  
  if (!session || (session.user.role !== 'super-admin' && session.user.role !== 'company')) {
    redirect('/dashboard');
  }

  // Get overall statistics
  const [totalCompanies] = await db.select({ count: count() }).from(companies);
  const [totalUsers] = await db.select({ count: count() }).from(users);
  const [totalInterviews] = await db.select({ count: count() }).from(Interview);
  
  // Get candidate statistics
  const [totalCandidates] = await db.select({ count: count() }).from(candidateUsers);
  const [totalApplications] = await db.select({ count: count() }).from(candidateApplications);
  const [totalResumes] = await db.select({ count: count() }).from(candidateDocuments).where(eq(candidateDocuments.documentType, 'resume'));
  const [totalJobCampaigns] = await db.select({ count: count() }).from(jobCampaigns);

  // Get subscription statistics
  const [activeSubscriptions] = await db
    .select({ count: count() })
    .from(companies)
    .where(eq(companies.subscriptionStatus, 'active'));

  const [totalRevenue] = await db
    .select({ 
      total: sql<number>`COALESCE(SUM(${subscriptionTransactions.transactionAmount}), 0)`
    })
    .from(subscriptionTransactions)
    .where(eq(subscriptionTransactions.paymentStatus, 'completed'));

  // Get recent companies with user counts
  const recentCompanies = await db
    .select({
      id: companies.id,
      name: companies.name,
      domain: companies.domain,
      subscriptionPlan: companies.subscriptionPlan,
      subscriptionStatus: companies.subscriptionStatus,
      createdAt: companies.createdAt,
      userCount: count(users.id),
    })
    .from(companies)
    .leftJoin(users, eq(companies.id, users.companyId))
    .groupBy(companies.id, companies.name, companies.domain, companies.subscriptionPlan, companies.subscriptionStatus, companies.createdAt)
    .orderBy(desc(companies.createdAt))
    .limit(5);

  // Get interview completion stats
  const [completedInterviews] = await db
    .select({ count: count() })
    .from(Interview)
    .where(eq(Interview.interviewStatus, 'completed'));

  const [pendingInterviews] = await db
    .select({ count: count() })
    .from(Interview)
    .where(eq(Interview.interviewStatus, 'in-progress'));

  // Get recent admin activities
  const recentActivities = await db
    .select({
      id: adminActivityLogs.id,
      activityType: adminActivityLogs.activityType,
      description: adminActivityLogs.description,
      userName: users.name,
      createdAt: adminActivityLogs.createdAt,
    })
    .from(adminActivityLogs)
    .leftJoin(users, eq(adminActivityLogs.userId, users.id))
    .orderBy(desc(adminActivityLogs.createdAt))
    .limit(10);

  // Get monthly growth data (last 6 months)
  const monthlyGrowth = await db
    .select({
      month: sql<string>`DATE_TRUNC('month', ${users.createdAt})`,
      userCount: count(users.id),
    })
    .from(users)
    .where(sql`${users.createdAt} >= NOW() - INTERVAL '6 months'`)
    .groupBy(sql`DATE_TRUNC('month', ${users.createdAt})`)
    .orderBy(sql`DATE_TRUNC('month', ${users.createdAt})`);

  // Get today's statistics
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [todayUsers] = await db
    .select({ count: count() })
    .from(users)
    .where(gte(users.createdAt, today));

  const [todayInterviews] = await db
    .select({ count: count() })
    .from(Interview)
    .where(gte(Interview.createdAt, today));
    
  // Get today's candidate statistics
  const [todayCandidates] = await db
    .select({ count: count() })
    .from(candidateUsers)
    .where(gte(candidateUsers.createdAt, today));

  const [todayApplications] = await db
    .select({ count: count() })
    .from(candidateApplications)
    .where(gte(candidateApplications.appliedAt, today));

  const [todayRevenue] = await db
    .select({ 
      total: sql<number>`COALESCE(SUM(${subscriptionTransactions.transactionAmount}), 0)`
    })
    .from(subscriptionTransactions)
    .where(
      sql`${subscriptionTransactions.createdAt} >= ${today} AND ${subscriptionTransactions.paymentStatus} = 'completed'`
    );

  const stats = {
    totalCompanies: totalCompanies.count,
    totalUsers: totalUsers.count,
    totalInterviews: totalInterviews.count,
    totalCandidates: totalCandidates.count,
    totalApplications: totalApplications.count,
    totalResumes: totalResumes.count,
    totalJobCampaigns: totalJobCampaigns.count,
    activeSubscriptions: activeSubscriptions.count,
    totalRevenue: totalRevenue.total || 0,
    completedInterviews: completedInterviews.count,
    pendingInterviews: pendingInterviews.count,
    todayUsers: todayUsers.count,
    todayInterviews: todayInterviews.count,
    todayCandidates: todayCandidates.count,
    todayApplications: todayApplications.count,
    todayRevenue: todayRevenue.total || 0,
    recentCompanies,
    recentActivities,
    monthlyGrowth,
  };

  return (
    <AdminClient 
      session={session}
      stats={stats}
    />
  );
}