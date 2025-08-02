import { getServerSessionWithAuth } from '@/auth';
import { redirect } from 'next/navigation';
import AnalyticsClient from './_components/AnalyticsClient';

export default async function AnalyticsPage() {
  const session = await getServerSessionWithAuth();
  
  if (!session || !['super-admin', 'company'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  return <AnalyticsClient />;
}