import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { users, companies, Interview, subscriptionPlans, subscriptionTransactions } from '@/lib/database/schema';
import { logAdminActivity } from '@/lib/admin/admin-activity-logger';
import { eq, count, desc, gte, lte, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || !['super-admin', 'company'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const companyId = searchParams.get('companyId');
    const type = searchParams.get('type') || 'overview';

    // Build date filter
    let dateFilter: any[] = [];
    if (startDate) {
      dateFilter.push(gte(users.createdAt, new Date(startDate)));
    }
    if (endDate) {
      dateFilter.push(lte(users.createdAt, new Date(endDate)));
    }

    // Build company filter
    let companyFilter: any[] = [];
    if (companyId) {
      companyFilter.push(eq(users.companyId, companyId));
    }

    const whereConditions = [...dateFilter, ...companyFilter];

    if (type === 'overview') {
      // Get overview statistics
      const [totalUsers] = await db
        .select({ count: count() })
        .from(users)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

      const [totalCompanies] = await db
        .select({ count: count() })
        .from(companies);

      const [totalInterviews] = await db
        .select({ count: count() })
        .from(Interview);

      const [totalRevenue] = await db
        .select({ 
          total: sql<number>`COALESCE(SUM(${subscriptionTransactions.transactionAmount}), 0)`
        })
        .from(subscriptionTransactions)
        .where(eq(subscriptionTransactions.paymentStatus, 'completed'));

      return NextResponse.json({
        totalUsers: totalUsers.count,
        totalCompanies: totalCompanies.count,
        totalInterviews: totalInterviews.count,
        totalRevenue: totalRevenue.total || 0,
      });
    }

    if (type === 'signups') {
      // Get monthly signups data
      const monthlySignups = await db
        .select({
          month: sql<string>`DATE_TRUNC('month', ${users.createdAt})`,
          count: count(),
        })
        .from(users)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .groupBy(sql`DATE_TRUNC('month', ${users.createdAt})`)
        .orderBy(sql`DATE_TRUNC('month', ${users.createdAt})`);

      return NextResponse.json({ monthlySignups });
    }

    if (type === 'interviews') {
      // Get interview statistics
      const interviewStats = await db
        .select({
          month: sql<string>`DATE_TRUNC('month', ${Interview.createdAt})`,
          count: count(),
        })
        .from(Interview)
        .groupBy(sql`DATE_TRUNC('month', ${Interview.createdAt})`)
        .orderBy(sql`DATE_TRUNC('month', ${Interview.createdAt})`);

      return NextResponse.json({ interviewStats });
    }

    if (type === 'subscriptions') {
      // Get subscription distribution
      const subscriptionDistribution = await db
        .select({
          plan: subscriptionPlans.planName,
          count: count(),
        })
        .from(companies)
        .leftJoin(subscriptionPlans, eq(companies.subscriptionPlan, subscriptionPlans.planName))
        .groupBy(subscriptionPlans.planName)
        .orderBy(count());

      return NextResponse.json({ subscriptionDistribution });
    }

    if (type === 'revenue') {
      // Get monthly revenue data
      const monthlyRevenue = await db
        .select({
          month: sql<string>`DATE_TRUNC('month', ${subscriptionTransactions.createdAt})`,
          revenue: sql<number>`SUM(${subscriptionTransactions.transactionAmount})`,
        })
        .from(subscriptionTransactions)
        .where(eq(subscriptionTransactions.paymentStatus, 'completed'))
        .groupBy(sql`DATE_TRUNC('month', ${subscriptionTransactions.createdAt})`)
        .orderBy(sql`DATE_TRUNC('month', ${subscriptionTransactions.createdAt})`);

      return NextResponse.json({ monthlyRevenue });
    }

    if (type === 'detailed') {
      // Get comprehensive analytics data for the analytics dashboard
      const [totalUsers] = await db
        .select({ count: count() })
        .from(users);

      const [totalCompanies] = await db
        .select({ count: count() })
        .from(companies);

      const [totalInterviews] = await db
        .select({ count: count() })
        .from(Interview);

      // Get subscription distribution with colors
      const subscriptionData = await db
        .select({
          plan: companies.subscriptionPlan,
          count: count(),
        })
        .from(companies)
        .groupBy(companies.subscriptionPlan);

      // Add colors to subscription data
      const subscriptionDataWithColors = subscriptionData.map(item => ({
        plan: item.plan || 'free',
        count: item.count,
        color: item.plan === 'enterprise' ? '#8b5cf6' : 
               item.plan === 'professional' ? '#3b82f6' : 
               item.plan === 'starter' ? '#10b981' : '#6b7280'
      }));

      // Get monthly growth data (last 6 months)
      const monthlyGrowthData = await Promise.all(
        Array.from({ length: 6 }, async (_, i) => {
          const monthStart = new Date();
          monthStart.setMonth(monthStart.getMonth() - (5 - i));
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);
          
          const monthEnd = new Date(monthStart);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          
          const [companiesCount] = await db.select({ count: count() }).from(companies)
            .where(and(
              gte(companies.createdAt, monthStart),
              lte(companies.createdAt, monthEnd)
            ));
          
          const [usersCount] = await db.select({ count: count() }).from(users)
            .where(and(
              gte(users.createdAt, monthStart),
              lte(users.createdAt, monthEnd)
            ));
          
          const [interviewsCount] = await db.select({ count: count() }).from(Interview)
            .where(and(
              gte(Interview.createdAt, monthStart),
              lte(Interview.createdAt, monthEnd)
            ));
          
          return {
            month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
            companies: companiesCount.count || 0,
            users: usersCount.count || 0,
            interviews: interviewsCount.count || 0
          };
        })
      );

      // Get interview trends data (last 7 days)
      const interviewTrendsData = await Promise.all(
        Array.from({ length: 7 }, async (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          date.setHours(0, 0, 0, 0);
          
          const nextDate = new Date(date);
          nextDate.setDate(nextDate.getDate() + 1);
          
          const [interviewCount] = await db.select({ count: count() }).from(Interview)
            .where(and(
              gte(Interview.createdAt, date),
              lte(Interview.createdAt, nextDate)
            ));
          
          return {
            time: date.toLocaleDateString('en-US', { weekday: 'short' }),
            interviews: interviewCount.count || 0
          };
        })
      );

      return NextResponse.json({
        totalUsers: totalUsers.count,
        totalCompanies: totalCompanies.count,
        totalInterviews: totalInterviews.count,
        subscriptionData: subscriptionDataWithColors,
        monthlyGrowthData,
        interviewTrendsData
      });
    }

    return NextResponse.json({ error: 'Invalid analytics type' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}