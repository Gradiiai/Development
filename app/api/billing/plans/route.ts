import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { subscriptionPlans } from '@/lib/database/schema';
import { eq, asc } from 'drizzle-orm';

// GET - Fetch all active subscription plans (public endpoint)
export async function GET(request: NextRequest) {
  try {
    // Fetch all active subscription plans ordered by price
    const plans = await db
      .select({
        id: subscriptionPlans.id,
        planName: subscriptionPlans.planName,
        description: subscriptionPlans.description,
        monthlyPrice: subscriptionPlans.monthlyPrice,
        yearlyPrice: subscriptionPlans.yearlyPrice,
        maxInterviews: subscriptionPlans.maxInterviews,
        maxUsers: subscriptionPlans.maxUsers,
        features: subscriptionPlans.features,
        isActive: subscriptionPlans.isActive,
        createdAt: subscriptionPlans.createdAt,
        updatedAt: subscriptionPlans.updatedAt
      })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(asc(subscriptionPlans.monthlyPrice));

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription plans' },
      { status: 500 }
    );
  }
}

// POST - Create new subscription plan (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      planName,
      description,
      monthlyPrice,
      yearlyPrice,
      maxInterviews,
      maxUsers,
      features,
      isActive = true
    } = body;

    // Validate required fields
    if (!planName || monthlyPrice === undefined || yearlyPrice === undefined) {
      return NextResponse.json(
        { error: 'Plan name, monthly price, and yearly price are required' },
        { status: 400 }
      );
    }

    // Check if plan name already exists
    const existingPlan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.planName, planName.toLowerCase()))
      .limit(1);

    if (existingPlan.length > 0) {
      return NextResponse.json(
        { error: 'A plan with this name already exists' },
        { status: 400 }
      );
    }

    // Create new plan
    const [newPlan] = await db
      .insert(subscriptionPlans)
      .values({
        planName: planName.toLowerCase(),
        description,
        monthlyPrice,
        yearlyPrice,
        maxInterviews: maxInterviews || 0,
        maxUsers: maxUsers || 0,
        features: features || [],
        isActive
      })
      .returning();

    return NextResponse.json({ plan: newPlan }, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription plan' },
      { status: 500 }
    );
  }
}

// PUT - Update subscription plan (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      planName,
      description,
      monthlyPrice,
      yearlyPrice,
      maxInterviews,
      maxUsers,
      features,
      isActive
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = { updatedAt: new Date() };
    if (planName !== undefined) updateData.planName = planName.toLowerCase();
    if (description !== undefined) updateData.description = description;
    if (monthlyPrice !== undefined) updateData.monthlyPrice = monthlyPrice;
    if (yearlyPrice !== undefined) updateData.yearlyPrice = yearlyPrice;
    if (maxInterviews !== undefined) updateData.maxInterviews = maxInterviews;
    if (maxUsers !== undefined) updateData.maxUsers = maxUsers;
    if (features !== undefined) updateData.features = features;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update plan
    const [updatedPlan] = await db
      .update(subscriptionPlans)
      .set(updateData)
      .where(eq(subscriptionPlans.id, id))
      .returning();

    if (!updatedPlan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ plan: updatedPlan });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription plan' },
      { status: 500 }
    );
  }
}