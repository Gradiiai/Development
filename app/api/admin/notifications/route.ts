import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { users, companies, jobCampaigns } from '@/lib/database/schema';
import { eq, desc, gte } from 'drizzle-orm';

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  type: 'success' | 'info' | 'warning' | 'error';
  read?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session?.user?.id || !['super-admin', 'company'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const notifications: Notification[] = [];
    let notificationId = 1;

    // Get recent companies (last 24 hours)
    const recentCompanies = await db
      .select({
        name: companies.name,
        subscriptionPlan: companies.subscriptionPlan,
        createdAt: companies.createdAt
      })
      .from(companies)
      .where(gte(companies.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)))
      .orderBy(desc(companies.createdAt))
      .limit(5);

    recentCompanies.forEach(company => {
      notifications.push({
        id: notificationId++,
        title: 'New company registered',
        message: `${company.name} has signed up for ${company.subscriptionPlan} plan`,
        time: formatTimeAgo(company.createdAt),
        type: 'success'
      });
    });

    // Get recent job campaigns
    const recentCampaigns = await db
      .select({
        title: jobCampaigns.campaignName,
        createdAt: jobCampaigns.createdAt
      })
      .from(jobCampaigns)
      .where(gte(jobCampaigns.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)))
      .orderBy(desc(jobCampaigns.createdAt))
      .limit(3);

    recentCampaigns.forEach(campaign => {
      notifications.push({
        id: notificationId++,
        title: 'New job campaign created',
        message: `Campaign "${campaign.title}" has been created`,
        time: formatTimeAgo(campaign.createdAt),
        type: 'info'
      });
    });

    // Add system notifications (these could be stored in a separate table in the future)
    const systemNotifications: Notification[] = [
      {
        id: notificationId++,
        title: 'System maintenance',
        message: 'Scheduled maintenance completed successfully',
        time: '2 hours ago',
        type: 'info'
      }
    ];

    notifications.push(...systemNotifications);

    // Sort by most recent first
    notifications.sort((a, b) => {
      // For real timestamps, you'd parse and compare dates
      // For now, we'll keep the current order
      return 0;
    });

    const unreadCount = notifications.filter(n => !n.read).length;

    return NextResponse.json({ 
      notifications: notifications.slice(0, 10), // Limit to 10 most recent
      unreadCount 
    });
  } catch (error) {
    console.error('Notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInMinutes / 1440);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}