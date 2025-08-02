import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { companies, subscriptionTransactions } from '@/lib/database/schema';
import { eq, isNotNull, and, lt } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';

// This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions, etc.)
// Add authentication header check for security
export async function POST(req: NextRequest) {
  try {
    // Verify cron job authentication
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting subscription sync job...');
    
    // Get all companies with active subscriptions
    const companiesWithSubscriptions = await db
      .select()
      .from(companies)
      .where(
        eq(companies.subscriptionStatus, 'active')
      );

    const syncResults = [];
    let successCount = 0;
    let errorCount = 0;

    for (const company of companiesWithSubscriptions) {
      try {
        // Check if subscription has expired
        if (company.subscriptionEndDate && company.subscriptionEndDate < new Date()) {
          await db
            .update(companies)
            .set({
              subscriptionStatus: 'expired',
              subscriptionPlan: 'free',
              maxInterviews: 10, // Default free plan limits
              maxUsers: 5,
              updatedAt: new Date(),
            })
            .where(eq(companies.id, company.id));

          syncResults.push({
            companyId: company.id,
            companyName: company.name,
            status: 'expired',
            action: 'moved_to_free_plan',
          });
        } else {
          syncResults.push({
            companyId: company.id,
            companyName: company.name,
            status: 'no_change',
          });
        }

        successCount++;
      } catch (error) {
        console.error(`Error syncing company ${company.id}:`, error);
        syncResults.push({
          companyId: company.id,
          companyName: company.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        errorCount++;
      }
    }

    // Handle expired subscriptions (companies without active Stripe subscriptions)
    const expiredCompanies = await db
      .select()
      .from(companies)
      .where(
        and(
          eq(companies.subscriptionStatus, 'active'),
          lt(companies.subscriptionEndDate, new Date())
        )
      );

    for (const company of expiredCompanies) {
      try {
        await db
          .update(companies)
          .set({
            subscriptionStatus: 'expired',
            subscriptionPlan: 'free',
            maxInterviews: 10, // Default free plan limits
            maxUsers: 5,
            updatedAt: new Date(),
          })
          .where(eq(companies.id, company.id));

        syncResults.push({
          companyId: company.id,
          companyName: company.name,
          status: 'expired',
          action: 'moved_to_free_plan',
        });
      } catch (error) {
        console.error(`Error handling expired subscription for company ${company.id}:`, error);
        errorCount++;
      }
    }

    console.log(`Subscription sync completed. Success: ${successCount}, Errors: ${errorCount}`);

    return NextResponse.json({
      message: 'Subscription sync completed',
      summary: {
        totalProcessed: companiesWithSubscriptions.length,
        successCount,
        errorCount,
        expiredCount: expiredCompanies.length,
      },
      results: syncResults,
    });
  } catch (error) {
    console.error('Subscription sync job failed:', error);
    return NextResponse.json(
      { error: 'Subscription sync failed' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Subscription sync cron job endpoint is healthy',
    timestamp: new Date().toISOString(),
  });
}