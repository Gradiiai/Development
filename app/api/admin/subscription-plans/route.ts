import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { subscriptionPlans, companies } from '@/lib/database/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { stripe, createStripeProduct, syncPlanWithStripe } from '@/lib/stripe';
import { z } from 'zod';

// Validation schema for subscription plans
const subscriptionPlanSchema = z.object({
  planName: z.string().min(1, 'Plan name is required').max(100, 'Plan name too long'),
  description: z.string().optional(),
  monthlyPrice: z.number().min(0, 'Monthly price must be non-negative'),
  yearlyPrice: z.number().min(0, 'Yearly price must be non-negative'),
  maxInterviews: z.number().min(-1, 'Max interviews must be -1 (unlimited) or positive'),
  maxUsers: z.number().min(-1, 'Max users must be -1 (unlimited) or positive'),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  createStripeProduct: z.boolean().optional().default(true),
  updateStripeProduct: z.boolean().optional().default(false),
  stripeMonthlyPriceId: z.string().optional(),
  stripeYearlyPriceId: z.string().optional()
});

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
    
    // Validate input data
    const validationResult = subscriptionPlanSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 });
    }

    const validatedData = validationResult.data;

    // Check if plan already exists
    const existingPlan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.planName, validatedData.planName))
      .limit(1);

    if (existingPlan.length > 0) {
      return NextResponse.json({ error: 'Plan with this name already exists' }, { status: 400 });
    }

    // Create Stripe product and prices (skip for Custom plan or if explicitly disabled)
    let stripeProductId, stripeMonthlyPriceId, stripeYearlyPriceId;
    
    if (validatedData.createStripeProduct && 
        validatedData.planName !== 'Custom' && 
        validatedData.monthlyPrice > 0) {
      try {
        const stripeData = await createStripeProduct({
          name: validatedData.planName,
          description: validatedData.description || `${validatedData.planName} subscription plan`,
          monthlyPrice: validatedData.monthlyPrice,
          yearlyPrice: validatedData.yearlyPrice
        });
        
        stripeProductId = stripeData.product.id;
        stripeMonthlyPriceId = stripeData.monthlyPrice.id;
        stripeYearlyPriceId = stripeData.yearlyPrice.id;
      } catch (stripeError) {
        console.error('Error creating Stripe product/prices:', stripeError);
        return NextResponse.json({ 
          error: 'Failed to create Stripe product. Please check your Stripe configuration.',
          details: stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error'
        }, { status: 500 });
      }
    }

    // Create plan in database
    const newPlan = await db
      .insert(subscriptionPlans)
      .values({
        planName: validatedData.planName,
        description: validatedData.description,
        monthlyPrice: validatedData.monthlyPrice,
        yearlyPrice: validatedData.yearlyPrice,
        maxInterviews: validatedData.maxInterviews,
        maxUsers: validatedData.maxUsers,
        features: validatedData.features || null,
        isActive: validatedData.isActive !== undefined ? validatedData.isActive : true,
        stripeProductId,
        stripeMonthlyPriceId,
        stripeYearlyPriceId
      })
      .returning();

    return NextResponse.json({ 
      plan: newPlan[0],
      message: 'Subscription plan created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    // Get existing plan
    const existingPlan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id))
      .limit(1);

    if (existingPlan.length === 0) {
      return NextResponse.json({ error: 'Subscription plan not found' }, { status: 404 });
    }

    const currentPlan = existingPlan[0];

    // Validate update data (partial validation)
    const partialSchema = subscriptionPlanSchema.partial();
    const validationResult = partialSchema.safeParse(updateFields);
    
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 });
    }

    const validatedData = validationResult.data;

    // Check if plan name is being changed and if it conflicts
    if (validatedData.planName && validatedData.planName !== currentPlan.planName) {
      const nameConflict = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.planName, validatedData.planName))
        .limit(1);

      if (nameConflict.length > 0) {
        return NextResponse.json({ error: 'Plan with this name already exists' }, { status: 400 });
      }
    }

    // Update Stripe product if prices changed and Stripe integration exists
    if (currentPlan.stripeProductId && 
        (validatedData.monthlyPrice !== undefined || validatedData.yearlyPrice !== undefined)) {
      try {
        // Update Stripe product metadata
        await stripe.products.update(currentPlan.stripeProductId, {
          name: validatedData.planName || currentPlan.planName,
          description: validatedData.description || currentPlan.description || undefined,
          metadata: {
            maxInterviews: (validatedData.maxInterviews || currentPlan.maxInterviews).toString(),
            maxUsers: (validatedData.maxUsers || currentPlan.maxUsers).toString(),
          },
        });

        // Create new prices if pricing changed
        let newStripeMonthlyPriceId = currentPlan.stripeMonthlyPriceId;
        let newStripeYearlyPriceId = currentPlan.stripeYearlyPriceId;

        if (validatedData.monthlyPrice !== undefined && validatedData.monthlyPrice !== currentPlan.monthlyPrice) {
          const newMonthlyPrice = await stripe.prices.create({
            product: currentPlan.stripeProductId,
            unit_amount: validatedData.monthlyPrice * 100,
            currency: 'usd',
            recurring: { interval: 'month' },
            metadata: { billingPeriod: 'monthly' },
          });
          newStripeMonthlyPriceId = newMonthlyPrice.id;
          
          // Archive old price
          if (currentPlan.stripeMonthlyPriceId) {
            await stripe.prices.update(currentPlan.stripeMonthlyPriceId, { active: false });
          }
        }

        if (validatedData.yearlyPrice !== undefined && validatedData.yearlyPrice !== currentPlan.yearlyPrice) {
          const newYearlyPrice = await stripe.prices.create({
            product: currentPlan.stripeProductId,
            unit_amount: validatedData.yearlyPrice * 100,
            currency: 'usd',
            recurring: { interval: 'year' },
            metadata: { billingPeriod: 'yearly' },
          });
          newStripeYearlyPriceId = newYearlyPrice.id;
          
          // Archive old price
          if (currentPlan.stripeYearlyPriceId) {
            await stripe.prices.update(currentPlan.stripeYearlyPriceId, { active: false });
          }
        }

        // Update Stripe price IDs in validated data
        if (newStripeMonthlyPriceId !== currentPlan.stripeMonthlyPriceId) {
          (validatedData as any).stripeMonthlyPriceId = newStripeMonthlyPriceId;
        }
        if (newStripeYearlyPriceId !== currentPlan.stripeYearlyPriceId) {
          (validatedData as any).stripeYearlyPriceId = newStripeYearlyPriceId;
        }
      } catch (stripeError) {
        console.error('Error updating Stripe product:', stripeError);
        // Continue with database update even if Stripe fails
        console.warn('Continuing with database update despite Stripe error');
      }
    }

    // Update plan in database
    const updateData = {
      ...validatedData,
      updatedAt: new Date()
    };

    const updatedPlan = await db
      .update(subscriptionPlans)
      .set(updateData)
      .where(eq(subscriptionPlans.id, id))
      .returning();

    return NextResponse.json({ 
      plan: updatedPlan[0],
      message: 'Subscription plan updated successfully'
    });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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

    // Get the plan to delete (for Stripe cleanup)
    const [planToDelete] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId))
      .limit(1);

    if (!planToDelete) {
      return NextResponse.json({ error: 'Subscription plan not found' }, { status: 404 });
    }

    // Check if any companies are using this plan
    const companiesUsingPlan = await db
      .select({ count: sql<number>`count(*)` })
      .from(companies)
      .where(eq(companies.subscriptionPlan, planToDelete.planName));

    if (companiesUsingPlan[0]?.count > 0) {
      return NextResponse.json({ 
        error: `Cannot delete plan. ${companiesUsingPlan[0].count} companies are currently using this plan.`,
        details: 'Please migrate companies to another plan before deleting.'
      }, { status: 400 });
    }

    // Archive Stripe product if it exists (don't delete to preserve billing history)
    if (planToDelete.stripeProductId) {
      try {
        await stripe.products.update(planToDelete.stripeProductId, {
          active: false,
          metadata: {
            archived: 'true',
            archivedAt: new Date().toISOString(),
            archivedBy: session.user.email || 'admin'
          }
        });
        
        // Archive associated prices
        if (planToDelete.stripeMonthlyPriceId) {
          await stripe.prices.update(planToDelete.stripeMonthlyPriceId, { active: false });
        }
        if (planToDelete.stripeYearlyPriceId) {
          await stripe.prices.update(planToDelete.stripeYearlyPriceId, { active: false });
        }
      } catch (stripeError) {
        console.warn('Failed to archive Stripe product:', stripeError);
        // Continue with database deletion even if Stripe fails
      }
    }

    // Delete plan from database
    const deletedPlan = await db
      .delete(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId))
      .returning();

    return NextResponse.json({ 
      message: 'Subscription plan deleted successfully',
      plan: deletedPlan[0]
    });
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}