import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { companies } from '@/lib/database/schema';
import { redirect } from 'next/navigation';
import SubscriptionsClient from './_components/SubscriptionsClient';

export default async function SubscriptionsPage() {
  const session = await getServerSessionWithAuth();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'super-admin' && session.user.role !== 'company') {
    redirect('/admin');
  }

  // Fetch subscription data from database with user count
  let subscriptionData: any[] = [];
  try {
    subscriptionData = await db
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
        maxInterviews: companies.maxInterviews,
        maxUsers: companies.maxUsers,
        createdAt: companies.createdAt,
        updatedAt: companies.updatedAt,
      })
      .from(companies);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    subscriptionData = [];
  }

  return (
    <SubscriptionsClient subscriptionData={subscriptionData} />
  );
}