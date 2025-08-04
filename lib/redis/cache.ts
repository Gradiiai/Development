import { getRedisClient } from './connection';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix
  serialize?: boolean; // Whether to JSON serialize/deserialize
}

export class RedisCache {
  private redis = getRedisClient();
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
      const {
        ttl = this.DEFAULT_TTL,
        prefix = this.DEFAULT_PREFIX,
        serialize = true,
      } = options;

      const fullKey = `${prefix}${key}`;
      const serializedValue = serialize ? JSON.stringify(value) : String(value);

      if (ttl > 0) {
        await this.redis.setex(fullKey, ttl, serializedValue);
      } else {
        await this.redis.set(fullKey, serializedValue);
      }

      return true;
    } catch (error) {
      console.error('Cache set error:', error);
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
      const {
        prefix = this.DEFAULT_PREFIX,
        serialize = true,
      } = options;

      const fullKey = `${prefix}${key}`;
      const value = await this.redis.get(fullKey);

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
      const fullKey = `${prefix}${key}`;
      const result = await this.redis.del(fullKey);
      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string, prefix: string = this.DEFAULT_PREFIX): Promise<boolean> {
    try {
      const fullKey = `${prefix}${key}`;
      const result = await this.redis.exists(fullKey);
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
      const fullKey = `${prefix}${key}`;
      return await this.redis.ttl(fullKey);
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
      const fullKey = `${prefix}${key}`;
      const result = await this.redis.expire(fullKey, ttl);
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
      const {
        prefix = this.DEFAULT_PREFIX,
        serialize = true,
      } = options;

      const fullKeys = keys.map(key => `${prefix}${key}`);
      const values = await this.redis.mget(...fullKeys);

      return values.map(value => {
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
      const {
        prefix = this.DEFAULT_PREFIX,
        serialize = true,
      } = options;

      const pipeline = this.redis.pipeline();

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
      const {
        ttl = this.DEFAULT_TTL,
        prefix = this.DEFAULT_PREFIX,
      } = options;

      const fullKey = `${prefix}${key}`;
      
      let result: number;
      if (increment === 1) {
        result = await this.redis.incr(fullKey);
      } else {
        result = await this.redis.incrby(fullKey, increment);
      }

      // Set TTL if this is a new key
      if (result === increment && ttl > 0) {
        await this.redis.expire(fullKey, ttl);
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
      const {
        ttl = this.DEFAULT_TTL,
        prefix = this.DEFAULT_PREFIX,
      } = options;

      const fullKey = `${prefix}${key}`;
      
      let result: number;
      if (decrement === 1) {
        result = await this.redis.decr(fullKey);
      } else {
        result = await this.redis.decrby(fullKey, decrement);
      }

      // Set TTL if this is a new key
      if (result === -decrement && ttl > 0) {
        await this.redis.expire(fullKey, ttl);
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
      const fullPattern = `${prefix}${pattern}`;
      const keys = await this.redis.keys(fullPattern);
      return keys.map(key => key.replace(prefix, ''));
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
      const keys = await this.redis.keys(`${prefix}*`);
      if (keys.length === 0) return 0;
      
      const result = await this.redis.del(...keys);
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
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
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