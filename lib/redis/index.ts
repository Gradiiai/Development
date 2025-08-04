// Redis connection and utilities
export { getRedisClient, checkRedisHealth, closeRedisConnection } from './connection';

// Session management
export { 
  RedisSessionManager, 
  sessionManager,
  type SessionData,
  type JobCampaignSession 
} from './session';

// Rate limiting
export { 
  RedisRateLimiter, 
  rateLimiter,
  withRedisRateLimit,
  getClientIp,
  defaultKeyGenerator,
  type RateLimitConfig,
  type RateLimitResult 
} from './rate-limiter';

// Caching
export { 
  RedisCache, 
  cache,
  type CacheOptions 
} from './cache';

// Health check for all Redis services
export async function checkAllRedisServices(): Promise<{
  connection: boolean;
  session: boolean;
  rateLimit: boolean;
  cache: boolean;
}> {
  try {
    const { checkRedisHealth } = await import('./connection');
    const connectionHealth = await checkRedisHealth();
    
    // Test session service
    let sessionHealth = false;
    try {
      const { sessionManager } = await import('./session');
      await sessionManager.getSessionStats();
      sessionHealth = true;
    } catch (error) {
      console.error('Session service health check failed:', error);
    }
    
    // Test rate limiter service
    let rateLimitHealth = false;
    try {
      const { rateLimiter } = await import('./rate-limiter');
      await rateLimiter.getRateLimitStats();
      rateLimitHealth = true;
    } catch (error) {
      console.error('Rate limiter service health check failed:', error);
    }
    
    // Test cache service
    let cacheHealth = false;
    try {
      const { cache } = await import('./cache');
      await cache.getStats();
      cacheHealth = true;
    } catch (error) {
      console.error('Cache service health check failed:', error);
    }
    
    return {
      connection: connectionHealth,
      session: sessionHealth,
      rateLimit: rateLimitHealth,
      cache: cacheHealth,
    };
  } catch (error) {
    console.error('Redis services health check failed:', error);
    return {
      connection: false,
      session: false,
      rateLimit: false,
      cache: false,
    };
  }
}