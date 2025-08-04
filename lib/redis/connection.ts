import Redis from 'ioredis';

// Redis connection configuration from environment variables
const redisConfig = {
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
  db: 0, // Default database
};

// Create Redis client instance
let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(redisConfig);
    
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