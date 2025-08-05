import { getRedisClient } from './connection';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix
  serialize?: boolean; // Whether to JSON serialize/deserialize
}

export class RedisCache {
  private async getRedis() {
    const client = await getRedisClient();
    
    // Double-check that the client is ready for operations
    if (client.status !== 'ready') {
      throw new Error('Redis client is not ready for operations');
    }
    
    return client;
  }
  private readonly DEFAULT_TTL = 60 * 60; // 1 hour
  private readonly DEFAULT_PREFIX = 'cache:';

  /**
   * Set a value in cache
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      const redis = await this.getRedis();
      const {
        ttl = this.DEFAULT_TTL,
        prefix = this.DEFAULT_PREFIX,
        serialize = true,
      } = options;

      const fullKey = `${prefix}${key}`;
      const serializedValue = serialize ? JSON.stringify(value) : String(value);

      if (ttl > 0) {
        await redis.setex(fullKey, ttl, serializedValue);
      } else {
        await redis.set(fullKey, serializedValue);
      }

      return true;
    } catch (error) {
      // Handle specific Redis connection errors
      if (error instanceof Error) {
        if (error.message.includes("Stream isn't writeable") || 
            error.message.includes("enableOfflineQueue options is false")) {
          console.error('Cache set error: Redis connection not ready, operation rejected');
        } else {
          console.error('Cache set error:', error);
        }
      } else {
        console.error('Cache set error:', error);
      }
      return false;
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(
    key: string,
    options: CacheOptions = {}
  ): Promise<T | null> {
    try {
      const redis = await this.getRedis();
      const {
        prefix = this.DEFAULT_PREFIX,
        serialize = true,
      } = options;

      const fullKey = `${prefix}${key}`;
      const value = await redis.get(fullKey);

      if (value === null) {
        return null;
      }

      if (serialize) {
        try {
          return JSON.parse(value) as T;
        } catch (parseError) {
          console.error('Cache parse error:', parseError);
          return null;
        }
      }

      return value as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string, prefix: string = this.DEFAULT_PREFIX): Promise<boolean> {
    try {
      const redis = await this.getRedis();
      const fullKey = `${prefix}${key}`;
      const result = await redis.del(fullKey);
      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete a value from cache (alias for del)
   */
  async delete(key: string, options: { prefix?: string } = {}): Promise<boolean> {
    const { prefix = this.DEFAULT_PREFIX } = options;
    return this.del(key, prefix);
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string, prefix: string = this.DEFAULT_PREFIX): Promise<boolean> {
    try {
      const redis = await this.getRedis();
      const fullKey = `${prefix}${key}`;
      const result = await redis.exists(fullKey);
      return result > 0;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  async ttl(key: string, prefix: string = this.DEFAULT_PREFIX): Promise<number> {
    try {
      const redis = await this.getRedis();
      const fullKey = `${prefix}${key}`;
      return await redis.ttl(fullKey);
    } catch (error) {
      console.error('Cache TTL error:', error);
      return -1;
    }
  }

  /**
   * Extend TTL for a key
   */
  async expire(
    key: string,
    ttl: number,
    prefix: string = this.DEFAULT_PREFIX
  ): Promise<boolean> {
    try {
      const redis = await this.getRedis();
      const fullKey = `${prefix}${key}`;
      const result = await redis.expire(fullKey, ttl);
      return result > 0;
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }

  /**
   * Get multiple values at once
   */
  async mget<T>(
    keys: string[],
    options: CacheOptions = {}
  ): Promise<(T | null)[]> {
    try {
      const redis = await this.getRedis();
      const {
        prefix = this.DEFAULT_PREFIX,
        serialize = true,
      } = options;

      const fullKeys = keys.map(key => `${prefix}${key}`);
      const values = await redis.mget(...fullKeys);

      return values.map((value: string | null) => {
        if (value === null) return null;
        
        if (serialize) {
          try {
            return JSON.parse(value) as T;
          } catch (parseError) {
            console.error('Cache mget parse error:', parseError);
            return null;
          }
        }
        
        return value as T;
      });
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values at once
   */
  async mset<T>(
    keyValuePairs: Array<{ key: string; value: T; ttl?: number }>,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      const redis = await this.getRedis();
      const {
        prefix = this.DEFAULT_PREFIX,
        serialize = true,
      } = options;

      const pipeline = redis.pipeline();

      for (const { key, value, ttl } of keyValuePairs) {
        const fullKey = `${prefix}${key}`;
        const serializedValue = serialize ? JSON.stringify(value) : String(value);
        const finalTtl = ttl || this.DEFAULT_TTL;

        if (finalTtl > 0) {
          pipeline.setex(fullKey, finalTtl, serializedValue);
        } else {
          pipeline.set(fullKey, serializedValue);
        }
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Increment a numeric value
   */
  async incr(
    key: string,
    increment: number = 1,
    options: CacheOptions = {}
  ): Promise<number> {
    try {
      const redis = await this.getRedis();
      const {
        ttl = this.DEFAULT_TTL,
        prefix = this.DEFAULT_PREFIX,
      } = options;

      const fullKey = `${prefix}${key}`;
      
      let result: number;
      if (increment === 1) {
        result = await redis.incr(fullKey);
      } else {
        result = await redis.incrby(fullKey, increment);
      }

      // Set TTL if this is a new key
      if (result === increment && ttl > 0) {
        await redis.expire(fullKey, ttl);
      }

      return result;
    } catch (error) {
      console.error('Cache incr error:', error);
      return 0;
    }
  }

  /**
   * Decrement a numeric value
   */
  async decr(
    key: string,
    decrement: number = 1,
    options: CacheOptions = {}
  ): Promise<number> {
    try {
      const redis = await this.getRedis();
      const {
        ttl = this.DEFAULT_TTL,
        prefix = this.DEFAULT_PREFIX,
      } = options;

      const fullKey = `${prefix}${key}`;
      
      let result: number;
      if (decrement === 1) {
        result = await redis.decr(fullKey);
      } else {
        result = await redis.decrby(fullKey, decrement);
      }

      // Set TTL if this is a new key
      if (result === -decrement && ttl > 0) {
        await redis.expire(fullKey, ttl);
      }

      return result;
    } catch (error) {
      console.error('Cache decr error:', error);
      return 0;
    }
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern: string, prefix: string = this.DEFAULT_PREFIX): Promise<string[]> {
    try {
      const redis = await this.getRedis();
      const fullPattern = `${prefix}${pattern}`;
      const keys = await redis.keys(fullPattern);
      return keys.map((key: string) => key.replace(prefix, ''));
    } catch (error) {
      console.error('Cache keys error:', error);
      return [];
    }
  }

  /**
   * Clear all cache entries with a specific prefix
   */
  async clear(prefix: string = this.DEFAULT_PREFIX): Promise<number> {
    try {
      const redis = await this.getRedis();
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length === 0) return 0;
      
      const result = await redis.del(...keys);
      return result;
    } catch (error) {
      console.error('Cache clear error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate?: number;
  }> {
    try {
      const redis = await this.getRedis();
      const info = await redis.info('memory');
      const keyspace = await redis.info('keyspace');
      
      // Parse memory usage
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'Unknown';
      
      // Parse total keys
      const keysMatch = keyspace.match(/keys=(\d+)/);
      const totalKeys = keysMatch ? parseInt(keysMatch[1]) : 0;

      return {
        totalKeys,
        memoryUsage,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        totalKeys: 0,
        memoryUsage: 'Unknown',
      };
    }
  }

  /**
   * Cache-aside pattern helper
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T | null> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key, options);
      if (cached !== null) {
        return cached;
      }

      // If not in cache, fetch the data
      const data = await fetcher();
      
      // Store in cache for next time
      await this.set(key, data, options);
      
      return data;
    } catch (error) {
      console.error('Cache getOrSet error:', error);
      return null;
    }
  }
}

// Export singleton instance
export const cache = new RedisCache();