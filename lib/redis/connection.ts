import Redis, { Cluster } from 'ioredis';

// Connection state management
let redis: Redis | null = null;
let isConnecting = false;
let connectionPromise: Promise<Redis> | null = null;

// Function to get Redis configuration (called at runtime)
function getRedisConfig() {
  const baseConfig = {
    connectionName: 'GradiiAI-Enterprise',
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 1, // Further reduced to prevent client limit issues
    lazyConnect: false,
    keepAlive: 30000,
    connectTimeout: 15000,
    commandTimeout: 8000,
    db: 0,
    family: 4, // Force IPv4
    // Connection pool settings to prevent "max clients reached"
    maxLoadingTimeout: 10000,
    enableAutoPipelining: false, // Disabled to reduce connection overhead
    // Reconnection settings optimized for Redis Cloud
    retryDelayOnClusterDown: 1000,
    // Health check settings
    enableReadyCheck: true,
    // Prevent connection leaks - critical for Redis Cloud
    enableOfflineQueue: false,
    // Additional Redis Cloud optimizations
    autoResubscribe: false, // Disable auto-resubscribe to prevent connection buildup
    autoResendUnfulfilledCommands: false, // Prevent command queuing
    // Connection management
    disconnectTimeout: 2000, // Quick disconnect on errors
    // Reduce connection overhead
    showFriendlyErrorStack: false,
  };

  if (process.env.REDIS_URL) {
    // Only log in development to avoid spam in production builds
    if (process.env.NODE_ENV === 'development') {
      console.log('🔗 Using Azure Redis Enterprise (GradiiAI):', process.env.REDIS_URL.replace(/:[^:@]*@/, ':***@'));
    }
    // Check if the Redis URL includes TLS (rediss://) or not (redis://)
    const requiresTLS = process.env.REDIS_URL.startsWith('rediss://');
    
    const cloudConfig: any = {
      ...baseConfig,
      // Redis Cloud specific settings for your instance
      connectTimeout: 20000,
      commandTimeout: 10000,
      // Additional Redis Cloud optimizations
      maxLoadingTimeout: 15000,
      retryDelayOnFailover: 300,
    };

    // Only add TLS config if the URL indicates secure connection
    if (requiresTLS) {
      cloudConfig.tls = {
        // TLS settings for Redis Cloud
        checkServerIdentity: () => undefined, // Disable hostname verification
        rejectUnauthorized: false, // Accept self-signed certificates
      };
    }

    return cloudConfig;
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.log('🏠 Using local Redis configuration');
    }
    return {
      ...baseConfig,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      username: process.env.REDIS_USERNAME || 'default',
    };
  }
}

// Create Redis client instance with proper error handling
async function createRedisConnection(): Promise<Redis> {
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  isConnecting = true;
  
  connectionPromise = new Promise<Redis>((resolve, reject) => {
    const config = getRedisConfig();
    let client: Redis;
    
    if (process.env.REDIS_URL) {
      client = new Redis(process.env.REDIS_URL, config);
    } else {
      client = new Redis(config);
    }

    // Set up event handlers
    client.on('connect', () => {
      console.log('✅ Redis Cloud (Gradii-redis) connected successfully');
      isConnecting = false;
      resolve(client);
    });
    
    client.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
      
      // Handle specific Redis Cloud error types
      if (error.message.includes('max number of clients reached')) {
        console.error('🚨 Redis client limit reached - implementing immediate recovery');
        // Immediate cleanup and recovery for Redis Cloud
        try {
          client.disconnect(false); // Force disconnect without waiting
        } catch (disconnectError) {
          console.error('Error during force disconnect:', disconnectError);
        }
        redis = null;
        connectionPromise = null;
        isConnecting = false;
        
        // Don't attempt immediate reconnection to avoid further client limit issues
        console.log('⏸️ Pausing reconnection attempts to allow Redis Cloud to recover');
        return; // Exit early to prevent reconnection loop
      }
      
      if ((error as any).code === 'ECONNRESET') {
        console.error('🔌 Redis connection reset - Redis Cloud connection dropped');
        // Reset connection state but don't force immediate reconnection
        try {
          client.disconnect(false);
        } catch (disconnectError) {
          console.error('Error during disconnect after ECONNRESET:', disconnectError);
        }
        redis = null;
        connectionPromise = null;
        isConnecting = false;
      }
      
      if ((error as any).code === 'ETIMEDOUT') {
        console.error('⏰ Redis connection timeout - Redis Cloud may be overloaded');
      }
      
      if (error.message.includes('NOAUTH')) {
        console.error('🔐 Redis authentication failed - check credentials');
      }
      
      if ((error as any).code === 'ERR_SSL_WRONG_VERSION_NUMBER' || error.message.includes('wrong version number')) {
        console.error('🔒 SSL/TLS version mismatch - Redis Cloud TLS configuration issue');
        console.error('💡 Suggestion: Check if your Redis Cloud instance requires TLS (rediss://) or not (redis://)');
        // Force disconnect and reset connection state
        try {
          client.disconnect(false);
        } catch (disconnectError) {
          console.error('Error during disconnect after SSL error:', disconnectError);
        }
        redis = null;
        connectionPromise = null;
        isConnecting = false;
        return; // Exit early to prevent reconnection loop
      }
    });
    
    client.on('close', () => {
      console.log('🔌 Redis Cloud connection closed');
      // Reset connection state
      redis = null;
      connectionPromise = null;
      isConnecting = false;
    });
    
    client.on('reconnecting', (delay: number) => {
      console.log(`🔄 Redis Cloud reconnecting in ${delay}ms...`);
    });

    client.on('ready', () => {
      console.log('🎯 Redis Cloud client ready for commands');
    });

    client.on('end', () => {
      console.log('🔚 Redis Cloud connection ended');
      redis = null;
      connectionPromise = null;
      isConnecting = false;
    });

    // Handle connection timeout
    setTimeout(() => {
      if (isConnecting) {
        isConnecting = false;
        connectionPromise = null;
        reject(new Error('Redis connection timeout'));
      }
    }, 15000);
  });

  try {
    redis = await connectionPromise;
    return redis;
  } catch (error) {
    isConnecting = false;
    connectionPromise = null;
    throw error;
  }
}

export async function getRedisClient(): Promise<Redis> {
  const startTime = Date.now();
  console.log(`[Redis] getRedisClient called - Current status: ${redis ? redis.status : 'none'}`);
  
  // If we have a ready connection, return it
  if (redis && redis.status === 'ready') {
    console.log(`[Redis] Returning existing ready connection in ${Date.now() - startTime}ms`);
    return redis;
  }
  
  // If we're already connecting, wait for that connection
  if (isConnecting && connectionPromise) {
    try {
      const client = await connectionPromise;
      // Ensure the client is actually ready before returning
      if (client.status === 'ready') {
        console.log(`[Redis] Returning from promise (ready) in ${Date.now() - startTime}ms`);
        return client;
      }
      // If not ready, wait for ready state
      await waitForReady(client);
      console.log(`[Redis] Returning after waitForReady in ${Date.now() - startTime}ms`);
      return client;
    } catch (error) {
      console.error('Failed to get Redis client from existing promise:', error);
      // Reset state and try again
      isConnecting = false;
      connectionPromise = null;
      redis = null;
    }
  }
  
  // If connection exists but not ready, wait for it to be ready
  if (redis && redis.status === 'connecting') {
    try {
      await waitForReady(redis);
      console.log(`[Redis] Returning after waiting for connecting status in ${Date.now() - startTime}ms`);
      return redis;
    } catch (error) {
      console.error('Error waiting for existing connection:', error);
      // Reset and create new connection
      redis = null;
      connectionPromise = null;
      isConnecting = false;
    }
  }
  
  // Create new connection and wait for it to be ready
  console.log('[Redis] Creating new connection...');
  const client = await createRedisConnection();
  await waitForReady(client);
  console.log(`[Redis] New connection created and ready in ${Date.now() - startTime}ms`);
  return client;
}

// Helper function to wait for Redis client to be ready
async function waitForReady(client: Redis, timeout: number = 10000): Promise<void> {
  if (client.status === 'ready') {
    return;
  }
  
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Redis client failed to become ready within ${timeout}ms`));
    }, timeout);
    
    const onReady = () => {
      clearTimeout(timeoutId);
      client.off('error', onError);
      resolve();
    };
    
    const onError = (error: Error) => {
      clearTimeout(timeoutId);
      client.off('ready', onReady);
      reject(error);
    };
    
    client.once('ready', onReady);
    client.once('error', onError);
  });
}

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = await getRedisClient();
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
    try {
      await redis.quit();
    } catch (error) {
      console.error('Error during Redis shutdown:', error);
      // Force disconnect if quit fails
      redis.disconnect();
    } finally {
      redis = null;
      connectionPromise = null;
      isConnecting = false;
    }
  }
}

// Get current connection status
export function getRedisStatus(): string {
  return redis ? redis.status : 'disconnected';
}

// Force reconnection (useful for recovery)
export async function forceReconnect(): Promise<Redis> {
  await closeRedisConnection();
  return getRedisClient();
}

// Export the client for direct use (deprecated - use getRedisClient instead)
export { redis };