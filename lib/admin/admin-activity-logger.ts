import { db } from '@/lib/database/connection';
import { adminActivityLogs } from '@/lib/database/schema';

interface LogAdminActivityParams {
  userId: string;
  activityType: string;
  description: string;
  metadata?: Record<string, any>;
}

/**
 * Log admin activity to the database
 */
export async function logAdminActivity({
  userId,
  activityType,
  description,
  metadata
}: LogAdminActivityParams): Promise<void> {
  try {
    await db.insert(adminActivityLogs).values({
      userId,
      activityType,
      description,
      metadata: metadata ? JSON.stringify(metadata) : null,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error logging admin activity:', error);
    // Don't throw error to avoid breaking the main operation
  }
}

/**
 * Get recent admin activities
 */
export async function getRecentAdminActivities(limit: number = 10) {
  try {
    const activities = await db
      .select({
        id: adminActivityLogs.id,
        userId: adminActivityLogs.userId,
        activityType: adminActivityLogs.activityType,
        description: adminActivityLogs.description,
        metadata: adminActivityLogs.metadata,
        createdAt: adminActivityLogs.createdAt,
      })
      .from(adminActivityLogs)
      .orderBy(adminActivityLogs.createdAt)
      .limit(limit);

    return activities;
  } catch (error) {
    console.error('Error fetching admin activities:', error);
    return [];
  }
}