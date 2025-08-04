import { getRedisClient } from './connection';
import { v4 as uuidv4 } from 'uuid';

export interface SessionData {
  userId: string;
  email: string;
  companyId?: string;
  role: string;
  lastActivity: number;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: any; // Allow additional session data
}

export interface JobCampaignSession {
  campaignId: string;
  jobDetails: any;
  scoringParameters: any;
  currentStep: number;
  lastModified: number;
  userId: string;
}

export class RedisSessionManager {
  private redis = getRedisClient();
  private readonly SESSION_PREFIX = 'session:';
  private readonly JOB_CAMPAIGN_PREFIX = 'job_campaign:';
  private readonly OAUTH_STATE_PREFIX = 'oauth_state:';
  private readonly DEFAULT_TTL = 60 * 60 * 24; // 24 hours
  private readonly JOB_CAMPAIGN_TTL = 60 * 60 * 24 * 7; // 7 days
  private readonly OAUTH_STATE_TTL = 60 * 10; // 10 minutes

  // Session Management
  async createSession(sessionData: SessionData): Promise<string> {
    const sessionId = uuidv4();
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    
    const data = {
      ...sessionData,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    await this.redis.setex(key, this.DEFAULT_TTL, JSON.stringify(data));
    
    // Also store user-to-session mapping for quick lookups
    await this.redis.setex(
      `user_session:${sessionData.userId}`,
      this.DEFAULT_TTL,
      sessionId
    );

    return sessionId;
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    const data = await this.redis.get(key);
    
    if (!data) return null;
    
    try {
      const sessionData = JSON.parse(data) as SessionData;
      
      // Update last activity
      sessionData.lastActivity = Date.now();
      await this.redis.setex(key, this.DEFAULT_TTL, JSON.stringify(sessionData));
      
      return sessionData;
    } catch (error) {
      console.error('Error parsing session data:', error);
      return null;
    }
  }

  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<boolean> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    const existingData = await this.redis.get(key);
    
    if (!existingData) return false;
    
    try {
      const sessionData = JSON.parse(existingData) as SessionData;
      const updatedData = {
        ...sessionData,
        ...updates,
        lastActivity: Date.now(),
      };
      
      await this.redis.setex(key, this.DEFAULT_TTL, JSON.stringify(updatedData));
      return true;
    } catch (error) {
      console.error('Error updating session:', error);
      return false;
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    const sessionData = await this.getSession(sessionId);
    
    if (sessionData) {
      // Remove user-to-session mapping
      await this.redis.del(`user_session:${sessionData.userId}`);
    }
    
    const result = await this.redis.del(key);
    return result > 0;
  }

  async getUserSession(userId: string): Promise<string | null> {
    return await this.redis.get(`user_session:${userId}`);
  }

  // Job Campaign Session Management
  async saveJobCampaignSession(userId: string, campaignData: JobCampaignSession): Promise<void> {
    const key = `${this.JOB_CAMPAIGN_PREFIX}${userId}`;
    const data = {
      ...campaignData,
      lastModified: Date.now(),
      userId,
    };

    await this.redis.setex(key, this.JOB_CAMPAIGN_TTL, JSON.stringify(data));
  }

  async getJobCampaignSession(userId: string): Promise<JobCampaignSession | null> {
    const key = `${this.JOB_CAMPAIGN_PREFIX}${userId}`;
    const data = await this.redis.get(key);
    
    if (!data) return null;
    
    try {
      return JSON.parse(data) as JobCampaignSession;
    } catch (error) {
      console.error('Error parsing job campaign session:', error);
      return null;
    }
  }

  async deleteJobCampaignSession(userId: string): Promise<boolean> {
    const key = `${this.JOB_CAMPAIGN_PREFIX}${userId}`;
    const result = await this.redis.del(key);
    return result > 0;
  }

  // OAuth State Management
  async storeOAuthState(companyId: string, state: string, provider: string): Promise<void> {
    const key = `${this.OAUTH_STATE_PREFIX}${companyId}:${state}`;
    const data = {
      provider,
      companyId,
      createdAt: Date.now(),
    };

    await this.redis.setex(key, this.OAUTH_STATE_TTL, JSON.stringify(data));
  }

  async validateOAuthState(companyId: string, state: string): Promise<{ valid: boolean; provider?: string }> {
    const key = `${this.OAUTH_STATE_PREFIX}${companyId}:${state}`;
    const data = await this.redis.get(key);
    
    if (!data) {
      return { valid: false };
    }
    
    try {
      const stateData = JSON.parse(data);
      // Delete the state after validation (one-time use)
      await this.redis.del(key);
      
      return {
        valid: true,
        provider: stateData.provider,
      };
    } catch (error) {
      console.error('Error validating OAuth state:', error);
      return { valid: false };
    }
  }

  // Utility methods
  async getAllUserSessions(userId: string): Promise<string[]> {
    const pattern = `${this.SESSION_PREFIX}*`;
    const keys = await this.redis.keys(pattern);
    const userSessions: string[] = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        try {
          const sessionData = JSON.parse(data) as SessionData;
          if (sessionData.userId === userId) {
            userSessions.push(key.replace(this.SESSION_PREFIX, ''));
          }
        } catch (error) {
          // Skip invalid session data
        }
      }
    }

    return userSessions;
  }

  async cleanupExpiredSessions(): Promise<number> {
    const pattern = `${this.SESSION_PREFIX}*`;
    const keys = await this.redis.keys(pattern);
    let cleanedCount = 0;

    for (const key of keys) {
      const ttl = await this.redis.ttl(key);
      if (ttl === -1) {
        // Key exists but has no expiration, set one
        await this.redis.expire(key, this.DEFAULT_TTL);
      } else if (ttl === -2) {
        // Key doesn't exist, skip
        continue;
      }
    }

    return cleanedCount;
  }

  // Session statistics
  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    jobCampaignSessions: number;
  }> {
    const [sessionKeys, jobCampaignKeys] = await Promise.all([
      this.redis.keys(`${this.SESSION_PREFIX}*`),
      this.redis.keys(`${this.JOB_CAMPAIGN_PREFIX}*`),
    ]);

    // Count active sessions (last activity within 1 hour)
    let activeSessions = 0;
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    for (const key of sessionKeys) {
      const data = await this.redis.get(key);
      if (data) {
        try {
          const sessionData = JSON.parse(data) as SessionData;
          if (sessionData.lastActivity > oneHourAgo) {
            activeSessions++;
          }
        } catch (error) {
          // Skip invalid session data
        }
      }
    }

    return {
      totalSessions: sessionKeys.length,
      activeSessions,
      jobCampaignSessions: jobCampaignKeys.length,
    };
  }
}

// Export singleton instance
export const sessionManager = new RedisSessionManager();