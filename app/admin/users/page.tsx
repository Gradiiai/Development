import { getServerSessionWithAuth } from '@/auth';
import { redirect } from 'next/navigation';
import UsersClient from './_components/UsersClient';

export default async function UsersPage() {
  const session = await getServerSessionWithAuth();
  
  if (!session?.user || !['super-admin', 'company'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Users Management</h2>
      </div>
      <UsersClient session={session} />
    </div>
  );
}