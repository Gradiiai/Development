import { getServerSessionWithAuth } from '@/auth';
import { redirect } from 'next/navigation';
import CompaniesClient from './_components/CompaniesClient';

export default async function CompaniesPage() {
  const session = await getServerSessionWithAuth();
  
  if (!session || (session.user.role !== 'super-admin' && session.user.role !== 'company')) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">
            Manage and monitor all registered companies on the platform.
          </p>
        </div>
      </div>
      
      <CompaniesClient session={session} />
    </div>
  );
}