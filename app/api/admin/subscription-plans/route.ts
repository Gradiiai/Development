import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { subscriptionPlans } from '@/lib/database/schema';
import { eq, desc } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';

// GET - Fetch all subscription plans
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plans = await db
      .select()
      .from(subscriptionPlans)
      .orderBy(desc(subscriptionPlans.createdAt));

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new subscription plan
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
      isActive 
    } = body;

    // Validate required fields
    if (!planName || monthlyPrice === undefined || yearlyPrice === undefined || 
        maxInterviews === undefined || maxUsers === undefined) {
      return NextResponse.json({ 
        error: 'Plan name, monthly price, yearly price, max interviews, and max users are required' 
      }, { status: 400 });
    }

    // Check if plan already exists
    const existingPlan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.planName, planName))
      .limit(1);

    if (existingPlan.length > 0) {
      return NextResponse.json({ error: 'Plan with this name already exists' }, { status: 400 });
    }

    // Create Stripe product and prices
    let stripeProductId, stripeMonthlyPriceId, stripeYearlyPriceId;
    
    try {
      // Create Stripe product
      const product = await stripe.products.create({
        name: planName,
        description: description || `${planName} subscription plan`,
        metadata: {
          maxInterviews: maxInterviews.toString(),
          maxUsers: maxUsers.toString(),
        },
      });
      stripeProductId = product.id;

      // Create monthly price
      const monthlyPriceObj = await stripe.prices.create({
        product: stripeProductId,
        unit_amount: monthlyPrice * 100, // Convert to cents
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        metadata: {
          billingPeriod: 'monthly',
        },
      });
      stripeMonthlyPriceId = monthlyPriceObj.id;

      // Create yearly price
      const yearlyPriceObj = await stripe.prices.create({
        product: stripeProductId,
        unit_amount: yearlyPrice * 100, // Convert to cents
        currency: 'usd',
        recurring: {
          interval: 'year',
        },
        metadata: {
          billingPeriod: 'yearly',
        },
      });
      stripeYearlyPriceId = yearlyPriceObj.id;
    } catch (stripeError) {
      console.error('Error creating Stripe product/prices:', stripeError);
      return NextResponse.json({ 
        error: 'Failed to create Stripe product. Please check your Stripe configuration.' 
      }, { status: 500 });
    }

    // Create plan in database
    const newPlan = await db
      .insert(subscriptionPlans)
      .values({
        planName,
        description,
        monthlyPrice,
        yearlyPrice,
        maxInterviews,
        maxUsers,
        features: features || null,
        isActive: isActive !== undefined ? isActive : true,
      })
      .returning();

    return NextResponse.json({ plan: newPlan[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update subscription plan
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
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    // Build update data object
    const updateData: any = {};
    if (planName !== undefined) updateData.planName = planName;
    if (description !== undefined) updateData.description = description;
    if (monthlyPrice !== undefined) updateData.monthlyPrice = monthlyPrice;
    if (yearlyPrice !== undefined) updateData.yearlyPrice = yearlyPrice;
    if (maxInterviews !== undefined) updateData.maxInterviews = maxInterviews;
    if (maxUsers !== undefined) updateData.maxUsers = maxUsers;
    if (features !== undefined) updateData.features = features;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Update timestamp
    updateData.updatedAt = new Date();

    const updatedPlan = await db
      .update(subscriptionPlans)
      .set(updateData)
      .where(eq(subscriptionPlans.id, id))
      .returning();

    if (updatedPlan.length === 0) {
      return NextResponse.json({ error: 'Subscription plan not found' }, { status: 404 });
    }

    return NextResponse.json({ plan: updatedPlan[0] });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete subscription plan
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('id');

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    // Delete plan
    const deletedPlan = await db
      .delete(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId))
      .returning();

    if (deletedPlan.length === 0) {
      return NextResponse.json({ error: 'Subscription plan not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Subscription plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}