import { db } from '@/lib/database/connection';
import { campaignInterviews, candidates, interviewSetups, jobCampaigns } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
// Removed client-side JWT generation - now using server-side API

export interface AutoScheduleConfig {
  enabled: boolean;
  scoreThreshold: number;
  schedulingDelay: number; // Hours to wait before scheduling first interview
  intervalBetweenRounds: number; // Hours between interview rounds
  defaultStartTime: string; // Default start time (e.g., '10:00')
  timezone: string;
  autoEmailNotification: boolean;
}

export interface SchedulingResult {
  success: boolean;
  message: string;
  scheduledCount: number;
  interviews?: any[];
  error?: string;
}

/**
 * Check if a candidate is eligible for auto-scheduling
 */
export async function checkAutoScheduleEligibility(
  candidateId: string,
  campaignId: string,
  resumeScore: number,
  config: AutoScheduleConfig
): Promise<{ eligible: boolean; reason?: string; details?: any }> {
  try {
    // Check if auto-scheduling is enabled
    if (!config.enabled) {
      return { eligible: false, reason: 'Auto-scheduling is disabled for this campaign' };
    }

    // Check score threshold
    if (resumeScore < config.scoreThreshold) {
      return { 
        eligible: false, 
        reason: `Score ${resumeScore}% is below threshold ${config.scoreThreshold}%` 
      };
    }

    // Verify candidate exists
    const candidate = await db.select()
      .from(candidates)
      .where(and(
        eq(candidates.id, candidateId),
        eq(candidates.campaignId, campaignId)
      ))
      .limit(1);

    if (candidate.length === 0) {
      return { eligible: false, reason: 'Candidate not found or not associated with campaign' };
    }

    // Check if interviews already exist
    const existingInterviews = await db.select()
      .from(campaignInterviews)
      .where(and(
        eq(campaignInterviews.candidateId, candidateId),
        eq(campaignInterviews.campaignId, campaignId)
      ));

    if (existingInterviews.length > 0) {
      return { 
        eligible: false, 
        reason: 'Interviews already scheduled',
        details: { existingInterviews: existingInterviews.length }
      };
    }

    // Check if interview setups exist
    const setups = await db.select()
      .from(interviewSetups)
      .where(eq(interviewSetups.campaignId, campaignId))
      .orderBy(interviewSetups.roundNumber);

    if (setups.length === 0) {
      return { eligible: false, reason: 'No interview setups configured for campaign' };
    }

    return { 
      eligible: true, 
      details: { 
        candidate: candidate[0],
        availableRounds: setups.length,
        setups 
      }
    };

  } catch (error) {
    console.error('Error checking auto-schedule eligibility:', error);
    return { eligible: false, reason: 'System error during eligibility check' };
  }
}

/**
 * Generate interview schedule based on configuration
 */
export function generateInterviewSchedule(
  setups: any[],
  config: AutoScheduleConfig
): Date[] {
  const schedules: Date[] = [];
  const baseDate = new Date();
  
  // Add initial delay
  baseDate.setHours(baseDate.getHours() + config.schedulingDelay);
  
  // Parse default start time
  const [hours, minutes] = config.defaultStartTime.split(':').map(Number);
  
  for (let i = 0; i < setups.length; i++) {
    const scheduledDate = new Date(baseDate);
    
    // Add interval between rounds (except for first round)
    if (i > 0) {
      scheduledDate.setHours(scheduledDate.getHours() + (config.intervalBetweenRounds * i));
    }
    
    // Set to default start time
    scheduledDate.setHours(hours, minutes, 0, 0);
    
    // Ensure it's a weekday (Monday-Friday)
    while (scheduledDate.getDay() === 0 || scheduledDate.getDay() === 6) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }
    
    schedules.push(new Date(scheduledDate));
  }
  
  return schedules;
}

/**
 * Generate interview link based on type
 */
export function generateInterviewLink(
  candidateId: string,
  candidateEmail: string,
  setupId: string,
  interviewType: 'behavioral' | 'mcq' | 'combo' | 'coding',
  interviewId?: string
): string {
  // Use provided interviewId or generate one based on setupId and candidateId
  const finalInterviewId = interviewId || `${setupId}_${candidateId}_${Date.now()}`;
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const encodedEmail = encodeURIComponent(candidateEmail);
  
  // Generate direct interview link based on type
  switch (interviewType) {
    case 'coding':
      return `${baseUrl}/candidate/interview/${finalInterviewId}/coding?email=${encodedEmail}`;
    case 'mcq':
      return `${baseUrl}/candidate/interview/${finalInterviewId}/mcq?email=${encodedEmail}`;
    case 'behavioral':
      return `${baseUrl}/candidate/interview/${finalInterviewId}/behavioral?email=${encodedEmail}`;
    case 'combo':
      return `${baseUrl}/candidate/interview/${finalInterviewId}/combo?email=${encodedEmail}`;
    default:
      return `${baseUrl}/candidate/interview/${finalInterviewId}/behavioral?email=${encodedEmail}`;
  }
}

/**
 * Generate secure interview token
 */
// Token generation removed - using email-only authentication

/**
 * Get default auto-scheduling configuration
 */
export function getDefaultAutoScheduleConfig(): AutoScheduleConfig {
  return {
    enabled: true,
    scoreThreshold: 80,
    schedulingDelay: 24, // 24 hours delay
    intervalBetweenRounds: 24, // 24 hours between rounds
    defaultStartTime: '10:00',
    timezone: 'UTC',
    autoEmailNotification: true
  };
}

/**
 * Parse auto-schedule configuration from campaign data
 */
export function parseAutoScheduleConfig(campaignData: any): AutoScheduleConfig {
  const defaultConfig = getDefaultAutoScheduleConfig();
  
  if (!campaignData.autoScheduleConfig) {
    return defaultConfig;
  }
  
  try {
    const config = typeof campaignData.autoScheduleConfig === 'string' 
      ? JSON.parse(campaignData.autoScheduleConfig)
      : campaignData.autoScheduleConfig;
    
    return {
      enabled: config.enabled ?? defaultConfig.enabled,
      scoreThreshold: config.scoreThreshold ?? defaultConfig.scoreThreshold,
      schedulingDelay: config.schedulingDelay ?? defaultConfig.schedulingDelay,
      intervalBetweenRounds: config.intervalBetweenRounds ?? defaultConfig.intervalBetweenRounds,
      defaultStartTime: config.defaultStartTime ?? defaultConfig.defaultStartTime,
      timezone: config.timezone ?? defaultConfig.timezone,
      autoEmailNotification: config.autoEmailNotification ?? defaultConfig.autoEmailNotification
    };
  } catch (error) {
    console.error('Error parsing auto-schedule config:', error);
    return defaultConfig;
  }
}

/**
 * Validate auto-schedule configuration
 */
export function validateAutoScheduleConfig(config: Partial<AutoScheduleConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (config.scoreThreshold !== undefined) {
    if (config.scoreThreshold < 0 || config.scoreThreshold > 100) {
      errors.push('Score threshold must be between 0 and 100');
    }
  }
  
  if (config.schedulingDelay !== undefined) {
    if (config.schedulingDelay < 0 || config.schedulingDelay > 168) { // Max 1 week
      errors.push('Scheduling delay must be between 0 and 168 hours');
    }
  }
  
  if (config.intervalBetweenRounds !== undefined) {
    if (config.intervalBetweenRounds < 1 || config.intervalBetweenRounds > 168) {
      errors.push('Interval between rounds must be between 1 and 168 hours');
    }
  }
  
  if (config.defaultStartTime !== undefined) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(config.defaultStartTime)) {
      errors.push('Default start time must be in HH:MM format (24-hour)');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Log auto-scheduling activity
 */
export async function logAutoScheduleActivity(
  candidateId: string,
  campaignId: string,
  action: string,
  details: any,
  success: boolean
) {
  try {
    // In a real implementation, you might want to store this in a dedicated audit log table
    console.log('Auto-Schedule Activity:', {
      timestamp: new Date().toISOString(),
      candidateId,
      campaignId,
      action,
      details,
      success
    });
  } catch (error) {
    console.error('Error logging auto-schedule activity:', error);
  }
}

/**
 * Get auto-scheduling statistics for a campaign
 */
export async function getAutoScheduleStats(campaignId: string) {
  try {
    // Get all candidates for the campaign
    const allCandidates = await db.select()
      .from(candidates)
      .where(eq(candidates.campaignId, campaignId));
    
    // Get candidates with scheduled interviews
    const candidatesWithInterviews = await db.select({
      candidateId: campaignInterviews.candidateId
    })
    .from(campaignInterviews)
    .where(eq(campaignInterviews.campaignId, campaignId));
    
    const uniqueCandidatesWithInterviews = new Set(
      candidatesWithInterviews.map(c => c.candidateId)
    );
    
    return {
      totalCandidates: allCandidates.length,
      candidatesWithInterviews: uniqueCandidatesWithInterviews.size,
      autoScheduleRate: allCandidates.length > 0 
        ? (uniqueCandidatesWithInterviews.size / allCandidates.length) * 100 
        : 0
    };
  } catch (error) {
    console.error('Error getting auto-schedule stats:', error);
    return {
      totalCandidates: 0,
      candidatesWithInterviews: 0,
      autoScheduleRate: 0
    };
  }
}