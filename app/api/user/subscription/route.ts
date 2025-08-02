import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from "@/auth";;
import { db } from '@/lib/database/connection';
import { companies, users, Interview, CodingInterview } from '@/lib/database/schema';
import { eq, and, count, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company information
    const userWithCompany = await db
      .select({
        userId: users.id,
        userEmail: users.email,
        companyId: users.companyId,
        companyName: companies.name,
        subscriptionPlan: companies.subscriptionPlan,
        subscriptionStatus: companies.subscriptionStatus,
        monthlyRevenue: companies.monthlyRevenue,
        yearlyRevenue: companies.yearlyRevenue,
        maxUsers: companies.maxUsers,
        maxInterviews: companies.maxInterviews,
        subscriptionStartDate: companies.subscriptionStartDate,
        subscriptionEndDate: companies.subscriptionEndDate,
      })
      .from(users)
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!userWithCompany.length || !userWithCompany[0].companyId) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const companyData = userWithCompany[0];

    // Get current usage statistics
    const [currentUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        companyData.companyId ? eq(users.companyId, companyData.companyId) : sql`1=0`,
        eq(users.isActive, true)
      ));

    const [currentInterviews] = await db
      .select({ count: count() })
      .from(Interview)
      .where(companyData.companyId ? eq(Interview.companyId, companyData.companyId) : sql`1=0`);

    const [currentCodingInterviews] = await db
      .select({ count: count() })
      .from(CodingInterview)
      .where(companyData.companyId ? eq(CodingInterview.companyId, companyData.companyId) : sql`1=0`);

    const totalInterviews = (currentInterviews?.count || 0) + (currentCodingInterviews?.count || 0);

    const subscriptionData = {
      subscriptionPlan: companyData.subscriptionPlan || 'free',
      subscriptionStatus: companyData.subscriptionStatus || 'active',
      monthlyRevenue: companyData.monthlyRevenue || 0,
      yearlyRevenue: companyData.yearlyRevenue || 0,
      maxUsers: companyData.maxUsers || 5,
      maxInterviews: companyData.maxInterviews || 10,
      subscriptionStartDate: companyData.subscriptionStartDate?.toISOString() || null,
      subscriptionEndDate: companyData.subscriptionEndDate?.toISOString() || null,
      currentUsers: currentUsers?.count || 0,
      currentInterviews: totalInterviews,
      companyName: companyData.companyName,
    };

    return NextResponse.json(subscriptionData);
  } catch (error) {
    console.error('Error fetching subscription data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Get user's company
    const userWithCompany = await db
      .select({
        companyId: users.companyId,
        role: users.role,
      })
      .from(users)
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!userWithCompany.length || !userWithCompany[0].companyId) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const { companyId, role } = userWithCompany[0];

    // Only company admins can modify subscription
    if (role !== 'company') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    if (action === 'cancel') {
      await db
        .update(companies)
        .set({
          subscriptionStatus: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(companies.id, companyId));

      return NextResponse.json({ message: 'Subscription cancelled successfully' });
    }

    if (action === 'reactivate') {
      await db
        .update(companies)
        .set({
          subscriptionStatus: 'active',
          updatedAt: new Date(),
        })
        .where(eq(companies.id, companyId));

      return NextResponse.json({ message: 'Subscription reactivated successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}