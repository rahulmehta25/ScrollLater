import { Redis } from '@upstash/redis'

// Initialize Redis client with Upstash
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

export class CacheManager {
  private static instance: CacheManager;
  private defaultTTL = 3600; // 1 hour
  private enabled: boolean;

  constructor() {
    this.enabled = !!redis;
    if (!this.enabled) {
      console.warn('Cache disabled: Redis configuration not found');
    }
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !redis) return null;
    
    try {
      const data = await redis.get(key);
      return data as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.enabled || !redis) return;
    
    try {
      await redis.set(key, value, { ex: ttl || this.defaultTTL });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.enabled || !redis) return;
    
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    if (!this.enabled || !redis) return;
    
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  // Implement cache-aside pattern
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const fresh = await fetcher();
    
    // Store in cache for next time
    await this.set(key, fresh, ttl);
    
    return fresh;
  }

  // Batch get operation
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.enabled || !redis) return keys.map(() => null);
    
    try {
      const values = await redis.mget(...keys);
      return values as (T | null)[];
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  // Batch set operation
  async mset(items: { key: string; value: any; ttl?: number }[]): Promise<void> {
    if (!this.enabled || !redis) return;
    
    try {
      const pipeline = redis.pipeline();
      for (const item of items) {
        pipeline.set(item.key, item.value, { ex: item.ttl || this.defaultTTL });
      }
      await pipeline.exec();
    } catch (error) {
      console.error('Cache mset error:', error);
    }
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    if (!this.enabled || !redis) return false;
    
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  // Get remaining TTL for a key
  async ttl(key: string): Promise<number> {
    if (!this.enabled || !redis) return -1;
    
    try {
      return await redis.ttl(key);
    } catch (error) {
      console.error('Cache ttl error:', error);
      return -1;
    }
  }

  // Increment a counter
  async incr(key: string, ttl?: number): Promise<number> {
    if (!this.enabled || !redis) return 0;
    
    try {
      const value = await redis.incr(key);
      if (ttl) {
        await redis.expire(key, ttl);
      }
      return value;
    } catch (error) {
      console.error('Cache incr error:', error);
      return 0;
    }
  }

  // Clear all cache (use with caution)
  async flush(): Promise<void> {
    if (!this.enabled || !redis) return;
    
    try {
      await redis.flushdb();
    } catch (error) {
      console.error('Cache flush error:', error);
    }
  }
}

// Export singleton instance
export const cache = CacheManager.getInstance();

// Cache key generators for consistency
export const cacheKeys = {
  session: (authHeader: string) => `session:${authHeader}`,
  entry: (entryId: string, userId: string) => `entry:${entryId}:${userId}`,
  entries: (userId: string, page: number) => `entries:${userId}:${page}`,
  analysis: (entryId: string, hash: string) => `analysis:${entryId}:${hash}`,
  queue: (entryId: string, taskType: string) => `queue:${entryId}:${taskType}`,
  userProfile: (userId: string) => `profile:${userId}`,
  stats: (userId: string) => `stats:${userId}`,
  aiUsage: (userId: string, date: string) => `ai-usage:${userId}:${date}`,
};