import type { Adapter, AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from "@auth/core/adapters";
import { getRedisClient } from "@/lib/redis/connection";
import { v4 as uuidv4 } from "uuid";

export interface RedisAdapterConfig {
  prefix?: string;
  userPrefix?: string;
  accountPrefix?: string;
  sessionPrefix?: string;
  verificationTokenPrefix?: string;
  userTTL?: number;
  sessionTTL?: number;
  verificationTokenTTL?: number;
}

const defaultConfig: Required<RedisAdapterConfig> = {
  prefix: "auth:",
  userPrefix: "user:",
  accountPrefix: "account:",
  sessionPrefix: "session:",
  verificationTokenPrefix: "verification:",
  userTTL: 60 * 60 * 24 * 365, // 1 year
  sessionTTL: 60 * 60 * 24 * 30, // 30 days
  verificationTokenTTL: 60 * 60 * 24, // 24 hours
};

export function RedisAdapter(config: RedisAdapterConfig = {}): Adapter {
  const c = { ...defaultConfig, ...config };
  
  // Get Redis client with error handling
  const getRedis = () => {
    try {
      return getRedisClient();
    } catch (error) {
      console.error('Failed to get Redis client:', error);
      throw new Error('Redis connection failed');
    }
  };

  const getUserKey = (id: string) => `${c.prefix}${c.userPrefix}${id}`;
  const getAccountKey = (provider: string, providerAccountId: string) => 
    `${c.prefix}${c.accountPrefix}${provider}:${providerAccountId}`;
  const getSessionKey = (sessionToken: string) => `${c.prefix}${c.sessionPrefix}${sessionToken}`;
  const getVerificationKey = (identifier: string, token: string) => 
    `${c.prefix}${c.verificationTokenPrefix}${identifier}:${token}`;
  const getUserByEmailKey = (email: string) => `${c.prefix}user_email:${email}`;
  const getUserByAccountKey = (provider: string, providerAccountId: string) => 
    `${c.prefix}user_account:${provider}:${providerAccountId}`;

  return {
    async createUser(user: Omit<AdapterUser, "id">): Promise<AdapterUser> {
      const id = uuidv4();
      const newUser: AdapterUser = { ...user, id };
      
      const userKey = getUserKey(id);
      const emailKey = getUserByEmailKey(user.email);
      
      const redis = getRedis();
      await redis.pipeline()
        .setex(userKey, c.userTTL, JSON.stringify(newUser))
        .setex(emailKey, c.userTTL, id)
        .exec();
      
      return newUser;
    },

    async getUser(id: string): Promise<AdapterUser | null> {
      const userKey = getUserKey(id);
      const redis = getRedis();
      const userData = await redis.get(userKey);
      
      if (!userData) return null;
      
      try {
        return JSON.parse(userData) as AdapterUser;
      } catch {
        return null;
      }
    },

    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      const emailKey = getUserByEmailKey(email);
      const redis = getRedis();
      const userId = await redis.get(emailKey);
      
      if (!userId) return null;
      
      return this.getUser!(userId);
    },

    async getUserByAccount({ provider, providerAccountId }): Promise<AdapterUser | null> {
      const accountKey = getUserByAccountKey(provider, providerAccountId);
      const redis = getRedis();
      const userId = await redis.get(accountKey);
      
      if (!userId) return null;
      
      return this.getUser!(userId);
    },

    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">): Promise<AdapterUser> {
      const existingUser = await this.getUser!(user.id);
      if (!existingUser) throw new Error("User not found");
      
      const updatedUser = { ...existingUser, ...user };
      const userKey = getUserKey(user.id);
      
      const redis = getRedis();
      await redis.setex(userKey, c.userTTL, JSON.stringify(updatedUser));
      
      return updatedUser;
    },

    async deleteUser(userId: string): Promise<void> {
      const user = await this.getUser!(userId);
      if (!user) return;
      
      const userKey = getUserKey(userId);
      const emailKey = getUserByEmailKey(user.email);
      
      const redis = getRedis();
      await redis.pipeline()
        .del(userKey)
        .del(emailKey)
        .exec();
    },

    async linkAccount(account: AdapterAccount): Promise<AdapterAccount> {
      const accountKey = getAccountKey(account.provider, account.providerAccountId);
      const userAccountKey = getUserByAccountKey(account.provider, account.providerAccountId);
      
      const redis = getRedis();
      await redis.pipeline()
        .setex(accountKey, c.userTTL, JSON.stringify(account))
        .setex(userAccountKey, c.userTTL, account.userId)
        .exec();
      
      return account;
    },

    async unlinkAccount({ provider, providerAccountId }): Promise<void> {
      const accountKey = getAccountKey(provider, providerAccountId);
      const userAccountKey = getUserByAccountKey(provider, providerAccountId);
      
      const redis = getRedis();
      await redis.pipeline()
        .del(accountKey)
        .del(userAccountKey)
        .exec();
    },

    async createSession(session: { sessionToken: string; userId: string; expires: Date }): Promise<AdapterSession> {
      const sessionKey = getSessionKey(session.sessionToken);
      const sessionData: AdapterSession = {
        ...session,
        expires: session.expires,
      };
      
      const redis = getRedis();
      const ttl = Math.floor((session.expires.getTime() - Date.now()) / 1000);
      await redis.setex(sessionKey, ttl > 0 ? ttl : c.sessionTTL, JSON.stringify(sessionData));
      
      return sessionData;
    },

    async getSessionAndUser(sessionToken: string): Promise<{ session: AdapterSession; user: AdapterUser } | null> {
      const sessionKey = getSessionKey(sessionToken);
      const redis = getRedis();
      const sessionData = await redis.get(sessionKey);
      
      if (!sessionData) return null;
      
      try {
        const session = JSON.parse(sessionData) as AdapterSession;
        
        // Check if session is expired
        if (new Date(session.expires) < new Date()) {
          await redis.del(sessionKey);
          return null;
        }
        
        const user = await this.getUser!(session.userId);
        if (!user) return null;
        
        return { session, user };
      } catch {
        return null;
      }
    },

    async updateSession(session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">): Promise<AdapterSession> {
      const sessionKey = getSessionKey(session.sessionToken);
      const redis = getRedis();
      const existingData = await redis.get(sessionKey);
      
      if (!existingData) throw new Error("Session not found");
      
      try {
        const existingSession = JSON.parse(existingData) as AdapterSession;
        const updatedSession = { ...existingSession, ...session };
        
        const ttl = Math.floor((updatedSession.expires.getTime() - Date.now()) / 1000);
        await redis.setex(sessionKey, ttl > 0 ? ttl : c.sessionTTL, JSON.stringify(updatedSession));
        
        return updatedSession;
      } catch {
        throw new Error("Invalid session data");
      }
    },

    async deleteSession(sessionToken: string): Promise<void> {
      const sessionKey = getSessionKey(sessionToken);
      const redis = getRedis();
      await redis.del(sessionKey);
    },

    async createVerificationToken(token: VerificationToken): Promise<VerificationToken> {
      const tokenKey = getVerificationKey(token.identifier, token.token);
      const ttl = Math.floor((token.expires.getTime() - Date.now()) / 1000);
      
      const redis = getRedis();
      await redis.setex(tokenKey, ttl > 0 ? ttl : c.verificationTokenTTL, JSON.stringify(token));
      
      return token;
    },

    async useVerificationToken({ identifier, token }): Promise<VerificationToken | null> {
      const tokenKey = getVerificationKey(identifier, token);
      const redis = getRedis();
      const tokenData = await redis.get(tokenKey);
      
      if (!tokenData) return null;
      
      // Delete the token after use
      await redis.del(tokenKey);
      
      try {
        const verificationToken = JSON.parse(tokenData) as VerificationToken;
        
        // Check if token is expired
        if (new Date(verificationToken.expires) < new Date()) {
          return null;
        }
        
        return verificationToken;
      } catch {
        return null;
      }
    },
  };
}