'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  BarChart3, 
  Settings, 
  CreditCard,
  FileText,
  Shield,
  ArrowLeft,
  Sparkles,
  Menu,
  X,
  ChevronRight,
  Key,
  Webhook,
  Bell,
  Database,
  Activity,
  Mail,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/shared/button';
import { Badge } from '@/components/ui/shared/badge';

const getInitialNavigation = () => [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, badge: null },
  { name: 'Companies', href: '/admin/companies', icon: Building2, badge: null },
  { name: 'Users', href: '/admin/users', icon: Users, badge: null },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, badge: null },
  { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard, badge: null },
  { name: 'API Keys', href: '/admin/api-keys', icon: Key, badge: null },
  { name: 'Webhooks', href: '/admin/webhooks', icon: Webhook, badge: null },
  { name: 'SSO', href: '/admin/sso', icon: Lock, badge: null },
  { name: 'Notifications', href: '/admin/notifications', icon: Bell, badge: null },
  { name: 'System Logs', href: '/admin/logs', icon: Activity, badge: null },
  { name: 'Email Templates', href: '/admin/email-templates', icon: Mail, badge: null },
  { name: 'Database', href: '/admin/database', icon: Database, badge: null },
  { name: 'Reports', href: '/admin/reports', icon: FileText, badge: null },
  { name: 'Security', href: '/admin/security', icon: Shield, badge: null, badgeVariant: 'destructive' },
  { name: 'Settings', href: '/admin/settings', icon: Settings, badge: null },
];

interface AdminSidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  onCollapseChange?: (collapsed: boolean) => void;
}

export function AdminSidebar({ isMobileOpen = false, onMobileClose, onCollapseChange }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [navigation, setNavigation] = useState(getInitialNavigation());
  const [loading, setLoading] = useState(true);

  // Fetch real counts for badges
  useEffect(() => {
    let isMounted = true;
    
    const fetchCounts = async () => {
      try {
        const response = await fetch('/api/admin/analytics?type=overview');
        if (response.ok && isMounted) {
          const data = await response.json();
          
          setNavigation(prev => prev.map(item => {
            switch (item.name) {
              case 'Companies':
                return { ...item, badge: data.totalCompanies?.toString() || null };
              case 'Users':
                return { ...item, badge: data.totalUsers?.toString() || null };
              case 'Subscriptions':
                return { ...item, badge: data.activeSubscriptions?.toString() || null };
              case 'Security':
                // This would come from security alerts API
                return { ...item, badge: '0' };
              default:
                return item;
            }
          }));
        }
      } catch (error) {
        console.error('Error fetching sidebar counts:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCounts();
    
    return () => {
      isMounted = false;
    };
  }, []);



  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-white via-gray-50/30 to-white backdrop-blur-sm border-r border-gray-200/60">
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200/60 bg-white/90 backdrop-blur-sm">
        {!isCollapsed && (
          <div>
            <Link href="/dashboard" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">AI</span>
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Admin Panel</span>
            </Link>
          </div>
        )}
        
        {/* Desktop Collapse Button */}
        <div className="hidden lg:block">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const newCollapsed = !isCollapsed;
              setIsCollapsed(newCollapsed);
              onCollapseChange?.(newCollapsed);
            }}
            className="text-gray-600 hover:bg-gray-100 p-1"
          >
            <div style={{ transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <ChevronRight className="w-4 h-4" />
            </div>
          </Button>
        </div>
        
        {/* Mobile Close Button */}
        <div className="lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMobileClose}
            className="text-gray-600 hover:bg-gray-100 p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <div key={item.name}>
              <Link
                href={item.href}
                className={`group relative flex items-center rounded-xl ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50/50 hover:border-blue-200/50'
                } ${
                  isCollapsed ? 'p-3 justify-center' : 'p-3'
                } border border-transparent hover:border-gray-200/60`}
              >
                <div className={`flex-shrink-0 p-2 rounded-lg ${
                  isActive 
                    ? 'bg-white/20 shadow-sm' 
                    : 'group-hover:bg-blue-100/50'
                }`}>
                  <item.icon className={`${
                    isActive ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'
                  } ${
                    isCollapsed ? 'h-6 w-6' : 'h-5 w-5'
                  }`} />
                </div>
                
                {!isCollapsed && (
                  <div className="ml-3 flex-1 flex items-center justify-between">
                    <span className={`font-semibold text-sm ${
                      isActive ? 'text-white' : 'text-gray-700 group-hover:text-gray-900'
                    }`}>
                      {item.name}
                    </span>
                    {item.badge && (
                      <span className={`ml-2 px-2.5 py-1 text-xs font-bold rounded-full shadow-sm ${
                        isActive
                          ? 'bg-white/25 text-white border border-white/30'
                          : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900/90 backdrop-blur-sm text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                    {item.name}
                    {item.badge && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            </div>
          );
        })}
      </nav>
      
      {/* Back to Dashboard */}
      <div className="p-3 border-t border-gray-200/60 bg-white/50 backdrop-blur-sm">
        <Link
          href="/dashboard"
          className="group flex items-center px-3 py-3 text-sm font-medium text-gray-600 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50/50 hover:text-blue-600 border border-transparent hover:border-blue-200/50 shadow-sm hover:shadow-md"
        >
          <div className={`p-1.5 rounded-lg bg-gray-100 group-hover:bg-blue-100 ${isCollapsed ? 'mx-auto' : 'mr-3'}`}>
            <ArrowLeft className="w-4 h-4 group-hover:text-blue-600" />
          </div>
          {!isCollapsed && (
            <span className="font-semibold">
              Back to Dashboard
            </span>
          )}
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        style={{ width: isCollapsed ? '80px' : '256px' }}
        className="hidden lg:flex flex-col h-full fixed left-0 top-0 z-30 shadow-xl transition-all duration-300"
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={onMobileClose}
          />
          
          {/* Mobile Sidebar */}
          <div className="fixed left-0 top-0 h-full w-80 z-50 lg:hidden shadow-2xl">
            <SidebarContent />
          </div>
        </>
      )}
    </>
  );
}