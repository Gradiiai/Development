import Redis from 'ioredis';

// Function to get Redis configuration (called at runtime)
function getRedisConfig() {
  if (process.env.REDIS_URL) {
    // Only log in development to avoid spam in production builds
    if (process.env.NODE_ENV === 'development') {
      console.log('🔗 Using Redis URL:', process.env.REDIS_URL.replace(/:[^:@]*@/, ':***@'));
    }
    return {
      connectionName: 'InterviewAI',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 5,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 20000,
      commandTimeout: 10000,
      db: 0,
      family: 4, // Force IPv4
      // Redis Cloud configuration - try without TLS first
      // Most Redis Cloud instances use TLS on port 6380, not 10280
    };
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.log('🏠 Using local Redis configuration');
    }
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      username: process.env.REDIS_USERNAME || 'default',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      db: 0,
    };
  }
}

// Create Redis client instance
let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    const config = getRedisConfig();
    
    if (process.env.REDIS_URL) {
      // For Redis Cloud connections
      redis = new Redis(process.env.REDIS_URL, config);
    } else {
      // For local Redis
      redis = new Redis(config);
    }
    
    redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });
    
    redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
    });
    
    redis.on('close', () => {
      console.log('🔌 Redis connection closed');
    });
    
    redis.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
  }
  
  return redis;
}

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

// Export the client for direct use
export { redis };