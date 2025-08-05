import { getRedisClient } from './connection';
import { NextRequest } from 'next/server';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
}

export class RedisRateLimiter {
  private _redis: any = null;
  
  private get redis() {
    if (!this._redis) {
      this._redis = getRedisClient();
    }
    return this._redis;
  }
  private readonly RATE_LIMIT_PREFIX = 'rate_limit:';

  /**
   * Check if request is within rate limit
   */
  async checkRateLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = `${this.RATE_LIMIT_PREFIX}${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // Count current requests in window
      pipeline.zcard(key);
      
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      
      // Set expiration
      pipeline.expire(key, Math.ceil(config.windowMs / 1000));
      
      const results = await pipeline.exec();
      
      if (!results) {
        throw new Error('Redis pipeline execution failed');
      }

      const currentCount = (results[1][1] as number) || 0;
      const totalHits = currentCount + 1;
      const remaining = Math.max(0, config.maxRequests - totalHits);
      const resetTime = now + config.windowMs;

      return {
        allowed: totalHits <= config.maxRequests,
        remaining,
        resetTime,
        totalHits,
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
        totalHits: 1,
      };
    }
  }

  /**
   * Reset rate limit for a specific identifier
   */
  async resetRateLimit(identifier: string): Promise<boolean> {
    try {
      const key = `${this.RATE_LIMIT_PREFIX}${identifier}`;
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      console.error('Failed to reset rate limit:', error);
      return false;
    }
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getRateLimitStatus(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = `${this.RATE_LIMIT_PREFIX}${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Clean up expired entries and count current requests
      await this.redis.zremrangebyscore(key, 0, windowStart);
      const currentCount = await this.redis.zcard(key);
      
      const remaining = Math.max(0, config.maxRequests - currentCount);
      const resetTime = now + config.windowMs;

      return {
        allowed: currentCount < config.maxRequests,
        remaining,
        resetTime,
        totalHits: currentCount,
      };
    } catch (error) {
      console.error('Failed to get rate limit status:', error);
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: now + config.windowMs,
        totalHits: 0,
      };
    }
  }

  /**
   * Increment rate limit counter (for successful/failed requests)
   */
  async incrementRateLimit(
    identifier: string,
    config: RateLimitConfig,
    increment: number = 1
  ): Promise<RateLimitResult> {
    const key = `${this.RATE_LIMIT_PREFIX}${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      const pipeline = this.redis.pipeline();
      
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // Add increments
      for (let i = 0; i < increment; i++) {
        pipeline.zadd(key, now + i, `${now + i}-${Math.random()}`);
      }
      
      // Count total requests
      pipeline.zcard(key);
      
      // Set expiration
      pipeline.expire(key, Math.ceil(config.windowMs / 1000));
      
      const results = await pipeline.exec();
      
      if (!results) {
        throw new Error('Redis pipeline execution failed');
      }

      const totalHits = (results[results.length - 2][1] as number) || 0;
      const remaining = Math.max(0, config.maxRequests - totalHits);
      const resetTime = now + config.windowMs;

      return {
        allowed: totalHits <= config.maxRequests,
        remaining,
        resetTime,
        totalHits,
      };
    } catch (error) {
      console.error('Failed to increment rate limit:', error);
      return {
        allowed: true,
        remaining: config.maxRequests - increment,
        resetTime: now + config.windowMs,
        totalHits: increment,
      };
    }
  }

  /**
   * Get rate limit statistics for monitoring
   */
  async getRateLimitStats(): Promise<{
    totalKeys: number;
    topLimitedIPs: Array<{ ip: string; hits: number }>;
  }> {
    try {
      const keys = await this.redis.keys(`${this.RATE_LIMIT_PREFIX}*`);
      const ipStats: Record<string, number> = {};

      for (const key of keys) {
        const ip = key.replace(this.RATE_LIMIT_PREFIX, '');
        const hits = await this.redis.zcard(key);
        ipStats[ip] = hits;
      }

      const topLimitedIPs = Object.entries(ipStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([ip, hits]) => ({ ip, hits }));

      return {
        totalKeys: keys.length,
        topLimitedIPs,
      };
    } catch (error) {
      console.error('Failed to get rate limit stats:', error);
      return {
        totalKeys: 0,
        topLimitedIPs: [],
      };
    }
  }

  /**
   * Clean up expired rate limit entries
   */
  async cleanupExpiredEntries(): Promise<number> {
    try {
      const keys = await this.redis.keys(`${this.RATE_LIMIT_PREFIX}*`);
      let cleanedCount = 0;

      for (const key of keys) {
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000); // Clean entries older than 1 hour
        
        const removed = await this.redis.zremrangebyscore(key, 0, oneHourAgo);
        cleanedCount += removed;
        
        // Remove empty keys
        const count = await this.redis.zcard(key);
        if (count === 0) {
          await this.redis.del(key);
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Failed to cleanup expired entries:', error);
      return 0;
    }
  }
}

/**
 * Utility function to get client IP from request
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Fallback to a default IP for development
  return '127.0.0.1';
}

/**
 * Default key generator for rate limiting
 */
export function defaultKeyGenerator(request: NextRequest): string {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const path = new URL(request.url).pathname;
  
  // Create a composite key for more granular rate limiting
  return `${ip}:${path}`;
}

/**
 * Middleware wrapper for rate limiting
 */
export function withRedisRateLimit(config: RateLimitConfig) {
  const rateLimiter = new RedisRateLimiter();
  
  return function (handler: Function) {
    return async function (request: NextRequest, ...args: any[]): Promise<Response> {
      const keyGenerator = config.keyGenerator || defaultKeyGenerator;
      const identifier = keyGenerator(request);
      
      const rateLimit = await rateLimiter.checkRateLimit(identifier, config);
      
      if (!rateLimit.allowed) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            resetTime: rateLimit.resetTime,
            remaining: rateLimit.remaining,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': rateLimit.remaining.toString(),
              'X-RateLimit-Reset': rateLimit.resetTime.toString(),
              'Retry-After': Math.ceil(config.windowMs / 1000).toString(),
            },
          }
        );
      }
      
      // Add rate limit headers to successful responses
      const response = await handler(request, ...args);
      
      if (response instanceof Response) {
        response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
        response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString());
      }
      
      return response;
    };
  };
}

// Export singleton instance
export const rateLimiter = new RedisRateLimiter();