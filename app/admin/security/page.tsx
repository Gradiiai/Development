import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { users } from '@/lib/database/schema';
import { count } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import SecurityClient from './_components/SecurityClient';

export default async function SecurityPage() {
  const session = await getServerSessionWithAuth();
  
  if (!session || (session.user.role !== 'super-admin' && session.user.role !== 'company')) {
    redirect('/dashboard');
  }

  // Get total users count for security stats
  const totalUsers = await db.select({ count: count() }).from(users);
  const userCount = totalUsers[0]?.count || 0;

  const securityStats = [
    {
      title: 'Total Users',
      value: userCount.toString(),
      icon: 'Activity',
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    {
      title: 'Security Alerts',
      value: '0',
      icon: 'AlertTriangle',
      gradient: 'from-red-500 to-pink-500',
      bgGradient: 'from-red-50 to-pink-50',
    },
    {
      title: 'Blocked IPs',
      value: '0',
      icon: 'Ban',
      gradient: 'from-orange-500 to-red-500',
      bgGradient: 'from-orange-50 to-red-50',
    },
    {
      title: 'Security Settings',
      value: '6',
      icon: 'Shield',
      gradient: 'from-emerald-500 to-teal-500',
      bgGradient: 'from-emerald-50 to-teal-50',
    },
  ];

  const securitySettings = [
    {
      title: 'Two-Factor Authentication',
      description: 'Require 2FA for all admin accounts',
      enabled: true,
      critical: true,
    },
    {
      title: 'Password Complexity',
      description: 'Enforce strong password requirements',
      enabled: true,
      critical: true,
    },
    {
      title: 'Session Timeout',
      description: 'Auto-logout after 30 minutes of inactivity',
      enabled: true,
      critical: false,
    },
    {
      title: 'IP Whitelist',
      description: 'Restrict admin access to specific IP ranges',
      enabled: false,
      critical: false,
    },
    {
      title: 'Login Notifications',
      description: 'Email notifications for new login attempts',
      enabled: true,
      critical: false,
    },
    {
      title: 'API Rate Limiting',
      description: 'Limit API requests per user per minute',
      enabled: true,
      critical: false,
    },
  ];

  const securityLogs = [
    {
      id: 1,
      type: 'System Initialized',
      user: 'system',
      ip: 'localhost',
      location: 'Server',
      device: 'System',
      timestamp: new Date().toISOString().replace('T', ' ').split('.')[0],
      severity: 'info',
    },
  ];

  const activeThreats: any[] = [];

  return (
    <SecurityClient 
      session={session}
      securityStats={securityStats}
      securitySettings={securitySettings}
      securityLogs={securityLogs}
      activeThreats={activeThreats}
    />
  );
}