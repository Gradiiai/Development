import { redirect } from "next/navigation";
import { getServerSessionWithAuth } from '@/auth';
import DashboardSidebar from './_components/DashboardSidebar';
import DashboardHeader from './_components/DashboardHeader';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSessionWithAuth();

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <DashboardSidebar session={session} />
      
      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <DashboardHeader session={session} />
        
        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
