'use client';

import { useState, useEffect } from 'react';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CreateCompanyModal } from '@/components/admin/CreateCompanyModal';
import { CreateUserModal } from '@/components/admin/CreateUserModal';
import { CreateReportModal } from '@/components/admin/CreateReportModal';
import { SubscriptionModal } from '@/components/admin/SubscriptionModal';
import { Button } from '@/components/ui/shared/button';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Menu } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Modal states
  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isCreateReportModalOpen, setIsCreateReportModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  
  // Data states
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState({ activeSubscriptions: 0, totalUsers: 0 });
  
  // Fetch companies for user modal
  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/admin/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  };

  // Fetch stats for header
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/analytics?type=overview');
      if (response.ok) {
        const data = await response.json();
        setStats({
          activeSubscriptions: data.activeSubscriptions || 0,
          totalUsers: data.totalUsers || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Floating action button handlers
  const handleCreateCompany = () => {
    setIsCreateCompanyModalOpen(true);
  };

  const handleCreateUser = () => {
    fetchCompanies();
    setIsCreateUserModalOpen(true);
  };

  const handleCreateReport = () => {
    setIsCreateReportModalOpen(true);
  };

  const handleCreateSubscription = () => {
    setIsSubscriptionModalOpen(true);
  };

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || (session.user.role !== 'super-admin' && session.user.role !== 'company')) {
      redirect('/dashboard');
    }
    
    // Fetch initial stats
    fetchStats();
  }, [session, status]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || (session.user.role !== 'super-admin' && session.user.role !== 'company')) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-30">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="bg-white/90 backdrop-blur-sm shadow-lg"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      <AdminSidebar 
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        onCollapseChange={setIsSidebarCollapsed}
      />
      
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <AdminHeader user={session.user} stats={stats} />
        
        {/* Breadcrumb Navigation */}
        <div className="px-4 lg:px-6 py-3 bg-white/50 backdrop-blur-sm border-b border-gray-200/50">
          <div className="max-w-7xl mx-auto">
            <Breadcrumb />
          </div>
        </div>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        
        {/* Floating Action Button */}
        <FloatingActionButton
          onCreateCompany={handleCreateCompany}
          onCreateUser={handleCreateUser}
          onCreateReport={handleCreateReport}
          onCreateSubscription={handleCreateSubscription}
        />
        
        {/* Modals */}
        <CreateCompanyModal
          isOpen={isCreateCompanyModalOpen}
          onClose={() => setIsCreateCompanyModalOpen(false)}
        />
        
        <CreateUserModal
           isOpen={isCreateUserModalOpen}
           onClose={() => setIsCreateUserModalOpen(false)}
           onUserCreated={() => {
             // Refresh data if needed
           }}
           companies={companies}
         />
        
        <CreateReportModal
          isOpen={isCreateReportModalOpen}
          onClose={() => setIsCreateReportModalOpen(false)}
        />
        
        <SubscriptionModal
           isOpen={isSubscriptionModalOpen}
           onClose={() => setIsSubscriptionModalOpen(false)}
           company={null}
         />
      </div>
    </div>
  );
}