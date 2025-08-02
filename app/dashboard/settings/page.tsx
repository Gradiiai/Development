import { getServerSessionWithAuth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/database/connection';
import { users, companies } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import SettingsClient from './_components/SettingsClient';

export default async function SettingsPage() {
  const session = await getServerSessionWithAuth();

  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  try {
    // Get user data with company information
    const userData = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        otpLoginEnabled: users.otpLoginEnabled,
        companyId: users.companyId,
        companyName: companies.name,
        subscriptionPlan: companies.subscriptionPlan,
        subscriptionStatus: companies.subscriptionStatus,
        monthlyRevenue: companies.monthlyRevenue,
        yearlyRevenue: companies.yearlyRevenue,
        maxUsers: companies.maxUsers,
        maxInterviews: companies.maxInterviews,
        subscriptionStartDate: companies.subscriptionStartDate,
        subscriptionEndDate: companies.subscriptionEndDate,
      })
      .from(users)
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!userData.length) {
      redirect('/auth/signin');
    }

    const user = userData[0];

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your account settings and preferences
            </p>
          </div>

          <SettingsClient 
            user={{
              id: user.id,
              name: user.name || '',
              email: user.email,
              role: user.role || 'company',
              isActive: user.isActive || false,
              otpLoginEnabled: user.otpLoginEnabled || true,
              companyId: user.companyId,
              companyName: user.companyName || '',
              subscriptionPlan: user.subscriptionPlan || 'free',
              subscriptionStatus: user.subscriptionStatus || 'active',
              monthlyRevenue: user.monthlyRevenue || 0,
              yearlyRevenue: user.yearlyRevenue || 0,
              maxUsers: user.maxUsers || 5,
              maxInterviews: user.maxInterviews || 10,
              subscriptionStartDate: user.subscriptionStartDate?.toISOString() || null,
              subscriptionEndDate: user.subscriptionEndDate?.toISOString() || null,
            }}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching user data:', error);
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              Error Loading Settings
            </h2>
            <p className="text-red-600">
              There was an error loading your settings. Please try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }
}