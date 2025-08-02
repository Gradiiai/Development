import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { subscriptionTransactions, companies, subscriptionPlans } from '@/lib/database/schema';
import { eq, desc, and } from 'drizzle-orm';

// GET - Fetch all subscription transactions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || session.user?.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const baseQuery = db
      .select({
        id: subscriptionTransactions.id,
        companyId: subscriptionTransactions.companyId,
        companyName: companies.name,
        planId: subscriptionTransactions.planId,
        planName: subscriptionPlans.planName,
        transactionAmount: subscriptionTransactions.transactionAmount,
        currency: subscriptionTransactions.currency,
        paymentMethod: subscriptionTransactions.paymentMethod,
        paymentStatus: subscriptionTransactions.paymentStatus,
        transactionId: subscriptionTransactions.transactionId,
        subscriptionPeriod: subscriptionTransactions.subscriptionPeriod,
        startDate: subscriptionTransactions.startDate,
        endDate: subscriptionTransactions.endDate,
        createdAt: subscriptionTransactions.createdAt,
        paymentProcessor: subscriptionTransactions.paymentProcessor,
        receiptUrl: subscriptionTransactions.receiptUrl,
      })
      .from(subscriptionTransactions)
      .leftJoin(companies, eq(subscriptionTransactions.companyId, companies.id))
      .leftJoin(subscriptionPlans, eq(subscriptionTransactions.planId, subscriptionPlans.id));

    const transactions = companyId
      ? await baseQuery
          .where(eq(subscriptionTransactions.companyId, companyId))
          .orderBy(desc(subscriptionTransactions.createdAt))
          .limit(limit)
          .offset(offset)
      : await baseQuery
          .orderBy(desc(subscriptionTransactions.createdAt))
          .limit(limit)
          .offset(offset);

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error fetching subscription transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new subscription transaction
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || session.user?.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      companyId, 
      planId, 
      transactionAmount, 
      currency, 
      paymentMethod, 
      paymentStatus, 
      transactionId, 
      subscriptionPeriod, 
      startDate, 
      endDate, 
      paymentProcessor, 
      receiptUrl, 
      metadata 
    } = body;

    // Validate required fields
    if (!companyId || !planId || transactionAmount === undefined || !paymentStatus || !subscriptionPeriod || !startDate || !endDate) {
      return NextResponse.json({ 
        error: 'Company ID, plan ID, transaction amount, payment status, subscription period, start date, and end date are required' 
      }, { status: 400 });
    }

    // Check if company exists
    const existingCompany = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (existingCompany.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check if plan exists
    const existingPlan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId))
      .limit(1);

    if (existingPlan.length === 0) {
      return NextResponse.json({ error: 'Subscription plan not found' }, { status: 404 });
    }

    // Create transaction
    const newTransaction = await db
      .insert(subscriptionTransactions)
      .values({
        companyId,
        planId,
        transactionAmount,
        currency: currency || 'USD',
        paymentMethod,
        paymentStatus,
        transactionId,
        subscriptionPeriod,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        paymentProcessor,
        receiptUrl,
        metadata,
      })
      .returning();

    // Update company subscription details
    await db
      .update(companies)
      .set({
        subscriptionPlan: existingPlan[0].planName,
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(startDate),
        subscriptionEndDate: new Date(endDate),
        maxInterviews: existingPlan[0].maxInterviews,
        maxUsers: existingPlan[0].maxUsers,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));

    return NextResponse.json({ transaction: newTransaction[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription transaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update subscription transaction
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      id,
      paymentStatus, 
      transactionId, 
      receiptUrl, 
      metadata 
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    // Build update data object
    const updateData: any = {};
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (transactionId !== undefined) updateData.transactionId = transactionId;
    if (receiptUrl !== undefined) updateData.receiptUrl = receiptUrl;
    if (metadata !== undefined) updateData.metadata = metadata;
    
    // Update timestamp
    updateData.updatedAt = new Date();

    const updatedTransaction = await db
      .update(subscriptionTransactions)
      .set(updateData)
      .where(eq(subscriptionTransactions.id, id))
      .returning();

    if (updatedTransaction.length === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // If payment status is updated to 'success', update company subscription status
    if (paymentStatus === 'success') {
      const transaction = updatedTransaction[0];
      await db
        .update(companies)
        .set({
          subscriptionStatus: 'active',
          updatedAt: new Date(),
        })
        .where(eq(companies.id, transaction.companyId));
    }

    return NextResponse.json({ transaction: updatedTransaction[0] });
  } catch (error) {
    console.error('Error updating subscription transaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}