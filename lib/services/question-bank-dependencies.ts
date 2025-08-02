import { db } from '@/lib/database/connection';
import { 
  questionBankUsage, 
  questionBanks, 
  interviewSetups, 
  jobCampaigns,
  campaignInterviews 
} from '@/lib/database/schema';
import { eq, and, count, sql } from 'drizzle-orm';

export interface QuestionBankDependency {
  campaignId: string;
  campaignName: string;
  setupId?: string;
  roundNumber?: number;
  roundName?: string;
  usageType: string;
  questionsUsed: number | null;
  lastUsedAt: Date | null;
  status: 'active' | 'paused' | 'completed' | 'draft';
}

export interface QuestionBankUsageInfo {
  totalCampaigns: number;
  activeCampaigns: number;
  totalInterviews: number;
  canDelete: boolean;
  dependencies: QuestionBankDependency[];
  blockingReasons: string[];
}

/**
 * Check if a question bank can be safely deleted
 */

export async function checkQuestionBankDependencies(
  questionBankId: string,
  companyId: string
): Promise<QuestionBankUsageInfo> {
  try {
    // Get all campaigns using this question bank

    const usageData = await db
      .select({
        campaignId: questionBankUsage.campaignId,
        campaignName: jobCampaigns.campaignName,
        campaignStatus: jobCampaigns.status,
        setupId: questionBankUsage.setupId,
        roundNumber: questionBankUsage.roundNumber,
        usageType: questionBankUsage.usageType,
        questionsUsed: questionBankUsage.questionsUsed,
        lastUsedAt: questionBankUsage.lastUsedAt,
        roundName: interviewSetups.roundName,
      })
      .from(questionBankUsage)
      .innerJoin(jobCampaigns, eq(questionBankUsage.campaignId, jobCampaigns.id))
      .leftJoin(interviewSetups, eq(questionBankUsage.setupId, interviewSetups.id))
      .where(and(
        eq(questionBankUsage.questionBankId, questionBankId),
        eq(jobCampaigns.companyId, companyId)
      ));

    // Get count of interviews that have used this question bank
    const interviewCount = await db
      .select({ count: count() })
      .from(campaignInterviews)
      .innerJoin(questionBankUsage, eq(campaignInterviews.campaignId, questionBankUsage.campaignId))
      .where(and(
        eq(questionBankUsage.questionBankId, questionBankId),
        eq(campaignInterviews.status, 'completed')
      ));

    const dependencies: QuestionBankDependency[] = usageData.map(usage => ({
      campaignId: usage.campaignId,
      campaignName: usage.campaignName,
      setupId: usage.setupId || undefined,
      roundNumber: usage.roundNumber || undefined,
      roundName: usage.roundName || undefined,
      usageType: usage.usageType,
      questionsUsed: usage.questionsUsed,
      lastUsedAt: usage.lastUsedAt,
      status: usage.campaignStatus as 'active' | 'paused' | 'completed' | 'draft'
    }));

    const activeCampaigns = dependencies.filter(dep => dep.status === 'active').length;
    const totalCampaigns = dependencies.length;
    const totalInterviews = interviewCount[0]?.count || 0;

    // Determine if deletion is allowed
    const blockingReasons: string[] = [];
    
    if (activeCampaigns > 0) {
      blockingReasons.push(`${activeCampaigns} active campaign(s) are currently using this question bank`);
    }
    
    if (totalInterviews > 0) {
      blockingReasons.push(`${totalInterviews} completed interview(s) have used questions from this bank`);
    }

    const canDelete = blockingReasons.length === 0;

    return {
      totalCampaigns,
      activeCampaigns,
      totalInterviews,
      canDelete,
      dependencies,
      blockingReasons
    };

  } 
  
  catch (error) {
    console.error('Error checking question bank dependencies:', error);
    throw new Error('Failed to check question bank dependencies');
  }
}

/**
 * Track usage of a question bank by a campaign
 */
export async function trackQuestionBankUsage({
  questionBankId,
  campaignId,
  setupId,
  usageType,
  roundNumber,
  questionsUsed = 0
}: {
  questionBankId: string;
  campaignId: string;
  setupId?: string;
  usageType: 'primary' | 'secondary' | 'mixed';
  roundNumber?: number;
  questionsUsed?: number;
}) {
  try {
    // Check if usage already exists
    const existingUsage = await db
      .select()
      .from(questionBankUsage)
      .where(and(
        eq(questionBankUsage.questionBankId, questionBankId),
        eq(questionBankUsage.campaignId, campaignId),
        setupId ? eq(questionBankUsage.setupId, setupId) : sql`setup_id IS NULL`
      ))
      .limit(1);

    if (existingUsage.length > 0) {
      // Update existing usage
      await db
        .update(questionBankUsage)
        .set({
          usageType,
          roundNumber,
          questionsUsed,
          lastUsedAt: new Date()
        })
        .where(eq(questionBankUsage.id, existingUsage[0].id));
    } else {
      // Create new usage record
      await db
        .insert(questionBankUsage)
        .values({
          questionBankId,
          campaignId,
          setupId,
          usageType,
          roundNumber,
          questionsUsed,
          lastUsedAt: new Date()
        });
    }

    // Update usage count in question bank
    await db
      .update(questionBanks)
      .set({
        usageCount: sql`usage_count + 1`,
        lastUsedAt: new Date()
      })
      .where(eq(questionBanks.id, questionBankId));

  } catch (error) {
    console.error('Error tracking question bank usage:', error);
    throw new Error('Failed to track question bank usage');
  }
}

/**
 * Remove usage tracking when a campaign is deleted or modified
 */
export async function removeQuestionBankUsage(
  questionBankId: string,
  campaignId: string,
  setupId?: string
) {
  try {
    const whereConditions = [
      eq(questionBankUsage.questionBankId, questionBankId),
      eq(questionBankUsage.campaignId, campaignId)
    ];

    if (setupId) {
      whereConditions.push(eq(questionBankUsage.setupId, setupId));
    }

    await db
      .delete(questionBankUsage)
      .where(and(...whereConditions));

    // Update usage count in question bank
    const remainingUsage = await db
      .select({ count: count() })
      .from(questionBankUsage)
      .where(eq(questionBankUsage.questionBankId, questionBankId));

    await db
      .update(questionBanks)
      .set({
        usageCount: remainingUsage[0]?.count || 0
      })
      .where(eq(questionBanks.id, questionBankId));

  } catch (error) {
    console.error('Error removing question bank usage:', error);
    throw new Error('Failed to remove question bank usage');
  }
}

/**
 * Get usage analytics for a question bank
 */
export async function getQuestionBankAnalytics(
  questionBankId: string,
  companyId: string
) {
  try {
    const analytics = await db
      .select({
        totalUsage: count(questionBankUsage.id),
        avgQuestionsUsed: sql<number>`AVG(${questionBankUsage.questionsUsed})`,
        lastUsed: sql<Date>`MAX(${questionBankUsage.lastUsedAt})`,
        activeCampaigns: sql<number>`COUNT(CASE WHEN ${jobCampaigns.status} = 'active' THEN 1 END)`,
        completedInterviews: sql<number>`COUNT(CASE WHEN ${campaignInterviews.status} = 'completed' THEN 1 END)`
      })
      .from(questionBankUsage)
      .innerJoin(jobCampaigns, eq(questionBankUsage.campaignId, jobCampaigns.id))
      .leftJoin(campaignInterviews, eq(questionBankUsage.campaignId, campaignInterviews.campaignId))
      .where(and(
        eq(questionBankUsage.questionBankId, questionBankId),
        eq(jobCampaigns.companyId, companyId)
      ))
      .groupBy(questionBankUsage.questionBankId);

    return analytics[0] || {
      totalUsage: 0,
      avgQuestionsUsed: 0,
      lastUsed: null,
      activeCampaigns: 0,
      completedInterviews: 0
    };

  } catch (error) {
    console.error('Error getting question bank analytics:', error);
    throw new Error('Failed to get question bank analytics');
  }
}