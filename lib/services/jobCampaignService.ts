import { sessionManager } from '@/lib/redis';

export interface JobCampaignDraft {
  campaignId?: string;
  jobDetails?: {
    title: string;
    description: string;
    requirements: string[];
    location: string;
    type: 'full-time' | 'part-time' | 'contract' | 'internship';
    salaryRange?: {
      min: number;
      max: number;
      currency: string;
    };
  };
  scoringParameters?: {
    skills: { name: string; weight: number }[];
    experience: { min: number; max: number; weight: number };
    education: { level: string; weight: number }[];
    location: { preferred: string[]; weight: number };
  };
  currentStep?: number;
}

export interface JobCampaignState {
  campaignId: string | null;
  jobDetails: JobCampaignDraft['jobDetails'] | null;
  scoringParameters: JobCampaignDraft['scoringParameters'] | null;
  currentStep: number;
}

export class JobCampaignService {
  /**
   * Save job campaign draft for a user
   */
  static async saveDraft(
    userId: string,
    draft: JobCampaignDraft
  ): Promise<void> {
    await sessionManager.saveJobCampaignSession(userId, {
      campaignId: draft.campaignId || `draft_${Date.now()}`,
      jobDetails: draft.jobDetails || null,
      scoringParameters: draft.scoringParameters || null,
      currentStep: draft.currentStep || 1,
      lastModified: Date.now(),
      userId,
    });
  }

  /**
   * Load job campaign draft for a user
   */
  static async loadDraft(userId: string): Promise<JobCampaignDraft | null> {
    const session = await sessionManager.getJobCampaignSession(userId);
    
    if (!session) {
      return null;
    }

    return {
      campaignId: session.campaignId || undefined,
      jobDetails: session.jobDetails || undefined,
      scoringParameters: session.scoringParameters || undefined,
      currentStep: session.currentStep || 1,
    };
  }

  /**
   * Clear job campaign draft for a user
   */
  static async clearDraft(userId: string): Promise<void> {
    await sessionManager.deleteJobCampaignSession(userId);
  }

  /**
   * Set current job campaign ID for a user
   */
  static async setCurrentCampaignId(
    userId: string,
    campaignId: string
  ): Promise<void> {
    const existingSession = await sessionManager.getJobCampaignSession(userId);
    
    await sessionManager.saveJobCampaignSession(userId, {
      ...existingSession,
      campaignId,
      jobDetails: existingSession?.jobDetails || null,
      scoringParameters: existingSession?.scoringParameters || null,
      currentStep: existingSession?.currentStep || 1,
      lastModified: Date.now(),
      userId,
    });
  }

  /**
   * Get current job campaign ID for a user
   */
  static async getCurrentCampaignId(userId: string): Promise<string | null> {
    const session = await sessionManager.getJobCampaignSession(userId);
    return session?.campaignId || null;
  }

  /**
   * Update job details in draft
   */
  static async updateJobDetails(
    userId: string,
    jobDetails: JobCampaignDraft['jobDetails']
  ): Promise<void> {
    const existingSession = await sessionManager.getJobCampaignSession(userId);
    
    await sessionManager.saveJobCampaignSession(userId, {
      ...existingSession,
      campaignId: existingSession?.campaignId || `draft_${Date.now()}`,
      jobDetails,
      scoringParameters: existingSession?.scoringParameters || null,
      currentStep: existingSession?.currentStep || 1,
      lastModified: Date.now(),
      userId,
    });
  }

  /**
   * Update scoring parameters in draft
   */
  static async updateScoringParameters(
    userId: string,
    scoringParameters: JobCampaignDraft['scoringParameters']
  ): Promise<void> {
    const existingSession = await sessionManager.getJobCampaignSession(userId);
    
    await sessionManager.saveJobCampaignSession(userId, {
      ...existingSession,
      campaignId: existingSession?.campaignId || `draft_${Date.now()}`,
      jobDetails: existingSession?.jobDetails || null,
      scoringParameters,
      currentStep: existingSession?.currentStep || 1,
      lastModified: Date.now(),
      userId,
    });
  }

  /**
   * Update current step in draft
   */
  static async updateCurrentStep(
    userId: string,
    currentStep: number
  ): Promise<void> {
    const existingSession = await sessionManager.getJobCampaignSession(userId);
    
    await sessionManager.saveJobCampaignSession(userId, {
      ...existingSession,
      campaignId: existingSession?.campaignId || `draft_${Date.now()}`,
      jobDetails: existingSession?.jobDetails || null,
      scoringParameters: existingSession?.scoringParameters || null,
      currentStep,
      lastModified: Date.now(),
      userId,
    });
  }

  /**
   * Get complete job campaign state
   */
  static async getJobCampaignState(userId: string): Promise<JobCampaignState> {
    const session = await sessionManager.getJobCampaignSession(userId);
    
    return {
      campaignId: session?.campaignId || null,
      jobDetails: session?.jobDetails || null,
      scoringParameters: session?.scoringParameters || null,
      currentStep: session?.currentStep || 1,
    };
  }

  /**
   * Check if user has an active draft
   */
  static async hasDraft(userId: string): Promise<boolean> {
    const session = await sessionManager.getJobCampaignSession(userId);
    return session !== null;
  }

  /**
   * Get draft last updated timestamp
   */
  static async getDraftLastUpdated(userId: string): Promise<Date | null> {
    const session = await sessionManager.getJobCampaignSession(userId);
    return session?.lastModified ? new Date(session.lastModified) : null;
  }
}