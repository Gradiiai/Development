import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { subscriptionPlans, users } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!user || user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all active subscription plans
    const plans = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true));

    const syncResults = [];

    for (const plan of plans) {
      try {
        // Create Stripe product
        const product = await stripe.products.create({
          name: plan.planName,
          description: plan.description || `${plan.planName} subscription plan`,
          metadata: {
            planId: plan.id,
            maxInterviews: plan.maxInterviews.toString(),
            maxUsers: plan.maxUsers.toString(),
          },
        });
        const productId = product.id;

        // Create monthly price
        const monthlyPrice = await stripe.prices.create({
          product: productId,
          unit_amount: plan.monthlyPrice * 100, // Convert to cents
          currency: 'usd',
          recurring: {
            interval: 'month',
          },
          metadata: {
            planId: plan.id,
            billingPeriod: 'monthly',
          },
        });
        const monthlyPriceId = monthlyPrice.id;

        // Create yearly price
        const yearlyPrice = await stripe.prices.create({
          product: productId,
          unit_amount: plan.yearlyPrice * 100, // Convert to cents
          currency: 'usd',
          recurring: {
            interval: 'year',
          },
          metadata: {
            planId: plan.id,
            billingPeriod: 'yearly',
          },
        });
        const yearlyPriceId = yearlyPrice.id;

        syncResults.push({
          planId: plan.id,
          planName: plan.planName,
          status: 'success',
          stripeProductId: productId,
          stripeMonthlyPriceId: monthlyPriceId,
          stripeYearlyPriceId: yearlyPriceId,
        });
      } catch (error) {
        console.error(`Error syncing plan ${plan.id}:`, error);
        syncResults.push({
          planId: plan.id,
          planName: plan.planName,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      message: 'Stripe sync completed',
      results: syncResults,
    });
  } catch (error) {
    console.error('Error syncing with Stripe:', error);
    return NextResponse.json(
      { error: 'Failed to sync with Stripe' },
      { status: 500 }
    );
  }
}