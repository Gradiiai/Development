import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { companies, users, subscriptionPlans, subscriptionTransactions } from '@/lib/database/schema';
import { eq, desc, count, ilike, and, or } from 'drizzle-orm';
import { logAdminActivity } from '@/lib/admin/admin-activity-logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || !['super-admin', 'company'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'companies';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const plan = searchParams.get('plan') || '';
    const offset = (page - 1) * limit;

    if (type === 'plans') {
      // Get all subscription plans
      const plans = await db
        .select({
          id: subscriptionPlans.id,
          name: subscriptionPlans.planName,
          description: subscriptionPlans.description,
          monthlyPrice: subscriptionPlans.monthlyPrice,
          yearlyPrice: subscriptionPlans.yearlyPrice,
          features: subscriptionPlans.features,
          isActive: subscriptionPlans.isActive,
          createdAt: subscriptionPlans.createdAt,
        })
        .from(subscriptionPlans)
        .orderBy(desc(subscriptionPlans.createdAt));

      return NextResponse.json({ plans });
    }

    if (type === 'transactions') {
      // Build search conditions
      let whereConditions: any[] = [];
      
      if (search) {
        whereConditions.push(
          ilike(companies.name, `%${search}%`)
        );
      }

      // Get subscription transactions with company info
      const transactions = await db
        .select({
          id: subscriptionTransactions.id,
          companyId: subscriptionTransactions.companyId,
          companyName: companies.name,
          planId: subscriptionTransactions.planId,
          planName: subscriptionPlans.planName,
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
        .orderBy(desc(subscriptionTransactions.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const [totalResult] = await db
        .select({ count: count() })
        .from(subscriptionTransactions)
        .leftJoin(companies, eq(subscriptionTransactions.companyId, companies.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

      return NextResponse.json({
        transactions,
        pagination: {
          page,
          limit,
          total: totalResult.count,
          totalPages: Math.ceil(totalResult.count / limit),
        },
      });
    }

    // Default: Get company subscriptions
    let whereConditions: any[] = [];
    
    if (search) {
      whereConditions.push(
        or(
          ilike(companies.name, `%${search}%`),
          ilike(companies.domain, `%${search}%`)
        )
      );
    }
    
    if (status) {
      whereConditions.push(eq(companies.subscriptionStatus, status));
    }
    
    if (plan) {
      whereConditions.push(eq(companies.subscriptionPlan, plan));
    }

    const subscriptions = await db
      .select({
        id: companies.id,
        name: companies.name,
        domain: companies.domain,
        subscriptionPlan: companies.subscriptionPlan,
        subscriptionStatus: companies.subscriptionStatus,
        monthlyRevenue: companies.monthlyRevenue,
        yearlyRevenue: companies.yearlyRevenue,
        subscriptionStartDate: companies.subscriptionStartDate,
        subscriptionEndDate: companies.subscriptionEndDate,
        createdAt: companies.createdAt,
        userCount: count(users.id),
      })
      .from(companies)
      .leftJoin(users, eq(companies.id, users.companyId))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(companies.id, companies.name, companies.domain, companies.subscriptionPlan, companies.subscriptionStatus, companies.monthlyRevenue, companies.yearlyRevenue, companies.subscriptionStartDate, companies.subscriptionEndDate, companies.createdAt)
      .orderBy(desc(companies.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count() })
      .from(companies)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    return NextResponse.json({
      subscriptions,
      pagination: {
        page,
        limit,
        total: totalResult.count,
        totalPages: Math.ceil(totalResult.count / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update subscription
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      companyId, 
      subscriptionPlan, 
      subscriptionStatus, 
      maxUsers, 
      maxInterviews, 
      monthlyRevenue, 
      yearlyRevenue, 
      subscriptionStartDate, 
      subscriptionEndDate 
    } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Validate subscription plan against database
    if (subscriptionPlan) {
      const planExists = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.planName, subscriptionPlan))
        .limit(1);
      
      if (planExists.length === 0) {
        return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 });
      }
    }

    // Validate subscription status
    const validStatuses = ['active', 'inactive', 'cancelled', 'expired'];
    if (subscriptionStatus && !validStatuses.includes(subscriptionStatus)) {
      return NextResponse.json({ error: 'Invalid subscription status' }, { status: 400 });
    }

    // Build update data object
    const updateData: any = {};
    if (subscriptionPlan !== undefined) updateData.subscriptionPlan = subscriptionPlan;
    if (subscriptionStatus !== undefined) updateData.subscriptionStatus = subscriptionStatus;
    if (maxUsers !== undefined) updateData.maxUsers = maxUsers;
    if (maxInterviews !== undefined) updateData.maxInterviews = maxInterviews;
    if (monthlyRevenue !== undefined) updateData.monthlyRevenue = monthlyRevenue;
    if (yearlyRevenue !== undefined) updateData.yearlyRevenue = yearlyRevenue;
    if (subscriptionStartDate !== undefined) {
      updateData.subscriptionStartDate = subscriptionStartDate ? new Date(subscriptionStartDate) : null;
    }
    if (subscriptionEndDate !== undefined) {
      updateData.subscriptionEndDate = subscriptionEndDate ? new Date(subscriptionEndDate) : null;
    }
    
    // Update timestamp
    updateData.updatedAt = new Date();

    const updatedCompany = await db
      .update(companies)
      .set(updateData)
      .where(eq(companies.id, companyId))
      .returning();

    if (updatedCompany.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Log admin activity
    await logAdminActivity({
        userId: session.user.id!,
      activityType: 'subscription_update',
      description: `Updated subscription for company: ${updatedCompany[0].name}`,
      metadata: { companyId, subscriptionPlan, subscriptionStatus },
    });

    return NextResponse.json({ company: updatedCompany[0] });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new company with subscription
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      domain, 
      subscriptionPlan, 
      subscriptionStatus, 
      maxUsers, 
      maxInterviews, 
      monthlyRevenue, 
      yearlyRevenue, 
      subscriptionStartDate, 
      subscriptionEndDate 
    } = body;

    // Validate required fields
    if (!name || !domain) {
      return NextResponse.json({ error: 'Company name and domain are required' }, { status: 400 });
    }

    // Check if company already exists
    const existingCompany = await db.select().from(companies).where(eq(companies.domain, domain)).limit(1);
    if (existingCompany.length > 0) {
      return NextResponse.json({ error: 'Company with this domain already exists' }, { status: 400 });
    }

    // Get plan defaults from database
    const plan = subscriptionPlan || 'free';
    const planData = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.planName, plan))
      .limit(1);
    
    const defaults = planData.length > 0 ? {
      monthlyRevenue: planData[0].monthlyPrice,
      yearlyRevenue: planData[0].yearlyPrice,
      maxUsers: planData[0].maxUsers,
      maxInterviews: planData[0].maxInterviews
    } : {
      monthlyRevenue: 0,
      yearlyRevenue: 0,
      maxUsers: 5,
      maxInterviews: 10
    };

    // Create company
    const newCompany = await db.insert(companies).values({
      name,
      domain,
      subscriptionPlan: plan,
      subscriptionStatus: subscriptionStatus || 'active',
      maxUsers: maxUsers !== undefined ? maxUsers : defaults.maxUsers,
      maxInterviews: maxInterviews !== undefined ? maxInterviews : defaults.maxInterviews,
      monthlyRevenue: monthlyRevenue !== undefined ? monthlyRevenue : defaults.monthlyRevenue,
      yearlyRevenue: yearlyRevenue !== undefined ? yearlyRevenue : defaults.yearlyRevenue,
      subscriptionStartDate: subscriptionStartDate ? new Date(subscriptionStartDate) : new Date(),
      subscriptionEndDate: subscriptionEndDate ? new Date(subscriptionEndDate) : null,
    }).returning();

    // Log admin activity
    await logAdminActivity({
      userId: session.user.id!,
      activityType: 'company_subscription_creation',
      description: `Created company with subscription: ${name}`,
      metadata: { companyId: newCompany[0].id, companyName: name, subscriptionPlan: plan },
    });

    return NextResponse.json({ company: newCompany[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}