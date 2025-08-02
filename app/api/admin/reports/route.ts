import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { users, companies, Interview, adminActivityLogs, subscriptionTransactions, subscriptionPlans } from '@/lib/database/schema';
import { eq, count, desc, gte, lte, and, sql } from 'drizzle-orm';
import { logAdminActivity } from '@/lib/admin/admin-activity-logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || !['super-admin', 'company'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'user-activity';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const companyId = searchParams.get('companyId');
    const format = searchParams.get('format') || 'json';

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

    if (type === 'user-activity') {
      // User Activity Report
      const whereConditions = [...dateFilter, ...companyFilter];
      
      const userActivity = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          status: sql<string>`CASE WHEN ${users.isActive} = true THEN 'active' ELSE 'inactive' END`,
          companyName: companies.name,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          interviewCount: count(Interview.id),
        })
        .from(users)
        .leftJoin(companies, eq(users.companyId, companies.id))
        .leftJoin(Interview, eq(users.id, Interview.createdBy))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .groupBy(users.id, users.name, users.email, users.role, users.isActive, companies.name, users.lastLoginAt, users.createdAt)
        .orderBy(desc(users.createdAt));

      // Log report generation
      await logAdminActivity({
        userId: session.user.id!,
        activityType: 'report_generation',
        description: 'Generated user activity report',
        metadata: { reportType: 'user-activity', format, filters: { startDate, endDate, companyId } },
      });

      if (format === 'csv') {
        // Convert to CSV format
        const csvHeaders = 'Name,Email,Role,Status,Company,Last Login,Created At,Interview Count\n';
        const csvData = userActivity.map(user => 
          `"${user.name}","${user.email}","${user.role}","${user.status}","${user.companyName || ''}","${user.lastLoginAt || ''}","${user.createdAt}","${user.interviewCount}"`
        ).join('\n');
        
        return new NextResponse(csvHeaders + csvData, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="user-activity-report.csv"',
          },
        });
      }

      return NextResponse.json({ userActivity });
    }

    if (type === 'interview-logs') {
      // Interview Logs Report
      let interviewDateFilter: any[] = [];
      if (startDate) {
        interviewDateFilter.push(gte(Interview.createdAt, new Date(startDate)));
      }
      if (endDate) {
        interviewDateFilter.push(lte(Interview.createdAt, new Date(endDate)));
      }

      let interviewCompanyFilter: any[] = [];
      if (companyId) {
        interviewCompanyFilter.push(eq(users.companyId, companyId));
      }

      const whereConditions = [...interviewDateFilter, ...interviewCompanyFilter];

      const interviewLogs = await db
        .select({
          id: Interview.id,
          jobPosition: Interview.jobPosition,
          status: Interview.interviewStatus,
          candidateName: Interview.candidateName,
          candidateEmail: Interview.candidateEmail,
          userName: users.name,
          userEmail: users.email,
          companyName: companies.name,
          createdAt: Interview.createdAt,
        })
        .from(Interview)
        .leftJoin(users, eq(Interview.createdBy, users.id))
        .leftJoin(companies, eq(users.companyId, companies.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(Interview.createdAt));

      // Log report generation
      await logAdminActivity({
        userId: session.user.id!,
        activityType: 'report_generation',
        description: 'Generated interview logs report',
        metadata: { reportType: 'interview-logs', format, filters: { startDate, endDate, companyId } },
      });

      if (format === 'csv') {
        const csvHeaders = 'Job Position,Status,Candidate Name,Candidate Email,User Name,User Email,Company,Created At\n';
        const csvData = interviewLogs.map(interview => 
          `"${interview.jobPosition || ''}","${interview.status}","${interview.candidateName || ''}","${interview.candidateEmail || ''}","${interview.userName || ''}","${interview.userEmail || ''}","${interview.companyName || ''}","${interview.createdAt}"`
        ).join('\n');
        
        return new NextResponse(csvHeaders + csvData, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="interview-logs-report.csv"',
          },
        });
      }

      return NextResponse.json({ interviewLogs });
    }

    if (type === 'subscription-summary') {
      // Subscription Summary Report
      let subscriptionDateFilter: any[] = [];
      if (startDate) {
        subscriptionDateFilter.push(gte(subscriptionTransactions.createdAt, new Date(startDate)));
      }
      if (endDate) {
        subscriptionDateFilter.push(lte(subscriptionTransactions.createdAt, new Date(endDate)));
      }

      let subscriptionCompanyFilter: any[] = [];
      if (companyId) {
        subscriptionCompanyFilter.push(eq(subscriptionTransactions.companyId, companyId));
      }

      const whereConditions = [...subscriptionDateFilter, ...subscriptionCompanyFilter];

      const subscriptionSummary = await db
        .select({
          id: subscriptionTransactions.id,
          companyName: companies.name,
          planName: sql<string>`COALESCE(${subscriptionPlans.planName}, 'Unknown Plan')`,
          amount: subscriptionTransactions.transactionAmount,
          currency: subscriptionTransactions.currency,
          status: subscriptionTransactions.paymentStatus,
          billingCycle: subscriptionTransactions.subscriptionPeriod,
          startDate: subscriptionTransactions.startDate,
          endDate: subscriptionTransactions.endDate,
          createdAt: subscriptionTransactions.createdAt,
        })
        .from(subscriptionTransactions)
        .leftJoin(companies, eq(subscriptionTransactions.companyId, companies.id))
        .leftJoin(subscriptionPlans, eq(subscriptionTransactions.planId, subscriptionPlans.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(subscriptionTransactions.createdAt));

      // Calculate summary statistics
      const totalRevenue = subscriptionSummary
        .filter(sub => sub.status === 'completed')
        .reduce((sum, sub) => sum + (sub.amount || 0), 0);

      const activeSubscriptions = subscriptionSummary
        .filter(sub => sub.status === 'active').length;

      // Log report generation
      await logAdminActivity({
        userId: session.user.id!,
        activityType: 'report_generation',
        description: 'Generated subscription summary report',
        metadata: { reportType: 'subscription-summary', format, filters: { startDate, endDate, companyId } },
      });

      if (format === 'csv') {
        const csvHeaders = 'Company,Plan,Amount,Currency,Status,Billing Cycle,Start Date,End Date,Created At\n';
        const csvData = subscriptionSummary.map(sub => 
          `"${sub.companyName || ''}","${sub.planName || ''}","${sub.amount || ''}","${sub.currency || ''}","${sub.status}","${sub.billingCycle || ''}","${sub.startDate || ''}","${sub.endDate || ''}","${sub.createdAt}"`
        ).join('\n');
        
        return new NextResponse(csvHeaders + csvData, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="subscription-summary-report.csv"',
          },
        });
      }

      return NextResponse.json({ 
        subscriptionSummary,
        statistics: {
          totalRevenue,
          activeSubscriptions,
          totalTransactions: subscriptionSummary.length,
        }
      });
    }

    if (type === 'admin-activity') {
      // Admin Activity Report
      let activityDateFilter: any[] = [];
      if (startDate) {
        activityDateFilter.push(gte(adminActivityLogs.createdAt, new Date(startDate)));
      }
      if (endDate) {
        activityDateFilter.push(lte(adminActivityLogs.createdAt, new Date(endDate)));
      }

      const adminActivity = await db
        .select({
          id: adminActivityLogs.id,
          activityType: adminActivityLogs.activityType,
          description: adminActivityLogs.description,
          metadata: adminActivityLogs.metadata,
          userName: users.name,
          userEmail: users.email,
          createdAt: adminActivityLogs.createdAt,
        })
        .from(adminActivityLogs)
        .leftJoin(users, eq(adminActivityLogs.userId, users.id))
        .where(activityDateFilter.length > 0 ? and(...activityDateFilter) : undefined)
        .orderBy(desc(adminActivityLogs.createdAt));

      // Log report generation
      await logAdminActivity({
        userId: session.user.id!,
        activityType: 'report_generation',
        description: 'Generated admin activity report',
        metadata: { reportType: 'admin-activity', format, filters: { startDate, endDate } },
      });

      if (format === 'csv') {
        const csvHeaders = 'Activity Type,Description,Admin Name,Admin Email,Created At\n';
        const csvData = adminActivity.map(activity => 
          `"${activity.activityType}","${activity.description}","${activity.userName || ''}","${activity.userEmail || ''}","${activity.createdAt}"`
        ).join('\n');
        
        return new NextResponse(csvHeaders + csvData, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="admin-activity-report.csv"',
          },
        });
      }

      return NextResponse.json({ adminActivity });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}