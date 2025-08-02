import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { companies, subscriptionTransactions } from '@/lib/database/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.email, session.user.email))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Get company's transaction history
    const transactions = await db
      .select()
      .from(subscriptionTransactions)
      .where(eq(subscriptionTransactions.companyId, company.id))
      .orderBy(desc(subscriptionTransactions.createdAt))
      .limit(50); // Limit to last 50 transactions

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}