import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { companies, users } from '@/lib/database/schema';
import { eq, count, desc, ilike, or, and } from 'drizzle-orm';
import { logAdminActivity } from '@/lib/admin/admin-activity-logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const plan = searchParams.get('plan') || '';
    const status = searchParams.get('status') || '';
    const offset = (page - 1) * limit;

    // Build where conditions
    let whereConditions: any[] = [];
    
    if (search) {
      whereConditions.push(
        or(
          ilike(companies.name, `%${search}%`),
          ilike(companies.domain, `%${search}%`)
        )
      );
    }
    
    if (plan) {
      whereConditions.push(eq(companies.subscriptionPlan, plan));
    }
    
    if (status) {
      whereConditions.push(eq(companies.subscriptionStatus, status));
    }

    // Get companies with user counts
    const companiesData = await db
      .select({
        id: companies.id,
        name: companies.name,
        domain: companies.domain,
        industry: companies.industry,
        subscriptionPlan: companies.subscriptionPlan,
        subscriptionStatus: companies.subscriptionStatus,
        createdAt: companies.createdAt,
        userCount: count(users.id),
      })
      .from(companies)
      .leftJoin(users, eq(companies.id, users.companyId))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(companies.id, companies.name, companies.domain, companies.industry, companies.subscriptionPlan, companies.subscriptionStatus, companies.createdAt)
      .orderBy(desc(companies.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count() })
      .from(companies)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    return NextResponse.json({
      companies: companiesData,
      total: totalResult.count,
      page,
      limit,
      totalPages: Math.ceil(totalResult.count / limit),
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, domain, industry, subscriptionPlan, userLimit, interviewLimit } = body;

    if (!name) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    const [newCompany] = await db
      .insert(companies)
      .values({
        name,
        domain: domain || null,
        industry: industry || null,
        subscriptionPlan: subscriptionPlan || 'free',
        subscriptionStatus: 'active',
        maxUsers: userLimit || 5,
        maxInterviews: interviewLimit || 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Log admin activity
    await logAdminActivity({
      userId: session.user.id!,
      activityType: 'company_creation',
      description: `Created company: ${name}`,
      metadata: { companyId: newCompany.id, companyName: name },
    });

    return NextResponse.json(newCompany, { status: 201 });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, domain, industry, subscriptionPlan, subscriptionStatus, userLimit, interviewLimit } = body;

    if (!id) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const [updatedCompany] = await db
      .update(companies)
      .set({
        ...(name && { name }),
        ...(domain !== undefined && { domain }),
        ...(industry !== undefined && { industry }),
        ...(subscriptionPlan && { subscriptionPlan }),
        ...(subscriptionStatus && { subscriptionStatus }),
        ...(userLimit && { maxUsers: userLimit }),
        ...(interviewLimit && { maxInterviews: interviewLimit }),
        updatedAt: new Date(),
      })
      .where(eq(companies.id, id))
      .returning();

    if (!updatedCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Log admin activity
    await logAdminActivity({
      userId: session.user.id!,
      activityType: 'company_update',
      description: `Updated company: ${name}`,
      metadata: { companyId: id, companyName: name },
    });

    return NextResponse.json(updatedCompany);
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Get company name for logging
    const [company] = await db
      .select({ name: companies.name })
      .from(companies)
      .where(eq(companies.id, id));

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    await db.delete(companies).where(eq(companies.id, id));

    // Log admin activity
    await logAdminActivity({
      userId: session.user.id!,
      activityType: 'company_deletion',
      description: `Deleted company: ${company.name}`,
      metadata: { companyId: id, companyName: company.name },
    });

    return NextResponse.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}