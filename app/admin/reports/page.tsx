import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { users, companies, Interview } from '@/lib/database/schema';
import { count } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import ReportsClient from './_components/ReportsClient';

export default async function ReportsPage() {
  const session = await getServerSessionWithAuth();
  
  if (!session || (session.user.role !== 'super-admin' && session.user.role !== 'company')) {
    redirect('/dashboard');
  }

  // Get stats for reports
  const [totalCompanies] = await db.select({ count: count() }).from(companies);
  const [totalUsers] = await db.select({ count: count() }).from(users);
  const [totalInterviews] = await db.select({ count: count() }).from(Interview);

  const stats = {
    totalCompanies: totalCompanies.count,
    totalUsers: totalUsers.count,
    totalInterviews: totalInterviews.count,
    availableReports: 12, // Static for now
  };

  const reportCategories = [
    {
      title: 'Company Analytics',
      description: 'Comprehensive company performance reports',
      icon: 'Building2',
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      reports: [
        { name: 'Company Overview', lastGenerated: '2 hours ago', size: '2.4 MB' },
        { name: 'Subscription Analytics', lastGenerated: '1 day ago', size: '1.8 MB' },
        { name: 'User Activity Report', lastGenerated: '3 days ago', size: '3.2 MB' },
      ],
    },
    {
      title: 'Interview Analytics',
      description: 'Interview performance and completion metrics',
      icon: 'Users',
      gradient: 'from-emerald-500 to-teal-500',
      bgGradient: 'from-emerald-50 to-teal-50',
      reports: [
        { name: 'Interview Completion Rates', lastGenerated: '1 hour ago', size: '1.9 MB' },
        { name: 'Candidate Performance', lastGenerated: '4 hours ago', size: '2.7 MB' },
        { name: 'Interview Feedback Analysis', lastGenerated: '1 day ago', size: '1.5 MB' },
      ],
    },
  ];

  const recentReports = [
    {
      name: 'Monthly Platform Report',
      type: 'Comprehensive',
      generatedBy: 'System',
      date: new Date().toISOString(),
      size: '4.2 MB',
      status: 'Ready',
      downloads: 23,
    },
    {
      name: 'User Analytics Report',
      type: 'User Analytics',
      generatedBy: 'Admin',
      date: new Date(Date.now() - 86400000).toISOString(),
      size: '2.8 MB',
      status: 'Ready',
      downloads: 15,
    },
    {
      name: 'Company Performance Report',
      type: 'Company Analytics',
      generatedBy: 'System',
      date: new Date(Date.now() - 172800000).toISOString(),
      size: '3.1 MB',
      status: 'Processing',
      downloads: 0,
    },
  ];

  return (
    <ReportsClient 
      session={session}
      stats={stats}
      reportCategories={reportCategories}
      recentReports={recentReports}
    />
  );
}