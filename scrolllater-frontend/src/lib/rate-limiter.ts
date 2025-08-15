import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Initialize Redis client
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Default rate limiter
export const rateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '60 s'),
      analytics: true,
      prefix: 'scrolllater',
    })
  : null;

// Different rate limiters for different endpoints
export const apiRateLimiters = redis
  ? {
      ai: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '60 s'),
        prefix: 'scrolllater:ai',
      }),
      auth: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '60 s'),
        prefix: 'scrolllater:auth',
      }),
      general: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, '60 s'),
        prefix: 'scrolllater:general',
      }),
      batch: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '300 s'), // 5 batch operations per 5 minutes
        prefix: 'scrolllater:batch',
      }),
      webhook: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '60 s'), // Higher limit for webhooks
        prefix: 'scrolllater:webhook',
      }),
    }
  : null;

// Rate limit check function with fallback
export async function checkRateLimit(
  identifier: string,
  limiter?: Ratelimit | null,
  fallbackLimit: number = 60
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  // If rate limiting is not configured, allow all requests
  if (!limiter) {
    return {
      success: true,
      limit: fallbackLimit,
      remaining: fallbackLimit,
      reset: Date.now() + 60000,
    };
  }

  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);
    return { success, limit, remaining, reset };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, be permissive to avoid blocking legitimate users
    return {
      success: true,
      limit: fallbackLimit,
      remaining: fallbackLimit,
      reset: Date.now() + 60000,
    };
  }
}

// IP extraction helper
export function getClientIP(request: Request): string {
  // Try various headers in order of preference
  const headers = [
    'x-real-ip',
    'x-forwarded-for',
    'x-client-ip',
    'x-cluster-client-ip',
    'cf-connecting-ip',
    'fastly-client-ip',
    'true-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded',
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // Handle comma-separated list (x-forwarded-for)
      const ip = value.split(',')[0].trim();
      if (ip) return ip;
    }
  }

  // Fallback to a default value
  return 'unknown';
}

// User-based rate limiting (more accurate than IP-based)
export function getUserIdentifier(userId?: string, ip?: string): string {
  if (userId) return `user:${userId}`;
  if (ip) return `ip:${ip}`;
  return 'anonymous';
}

// Cost-based rate limiting for AI operations
export class CostBasedRateLimiter {
  private costLimits = {
    daily: 100, // $1.00 per day per user
    monthly: 2000, // $20.00 per month per user
  };

  async checkCost(
    userId: string,
    estimatedCost: number
  ): Promise<{ allowed: boolean; dailyRemaining: number; monthlyRemaining: number }> {
    if (!redis) {
      return { allowed: true, dailyRemaining: this.costLimits.daily, monthlyRemaining: this.costLimits.monthly };
    }

    const today = new Date().toISOString().split('T')[0];
    const month = today.substring(0, 7);

    const dailyKey = `cost:${userId}:${today}`;
    const monthlyKey = `cost:${userId}:${month}`;

    try {
      // Get current usage
      const [dailyUsed, monthlyUsed] = await Promise.all([
        redis.get<number>(dailyKey) || 0,
        redis.get<number>(monthlyKey) || 0,
      ]);

      const dailyRemaining = this.costLimits.daily - (dailyUsed as number);
      const monthlyRemaining = this.costLimits.monthly - (monthlyUsed as number);

      if (dailyRemaining < estimatedCost || monthlyRemaining < estimatedCost) {
        return { allowed: false, dailyRemaining, monthlyRemaining };
      }

      // Update usage
      const pipeline = redis.pipeline();
      pipeline.incrby(dailyKey, Math.round(estimatedCost * 100)); // Store in cents
      pipeline.expire(dailyKey, 86400); // Expire after 24 hours
      pipeline.incrby(monthlyKey, Math.round(estimatedCost * 100));
      pipeline.expire(monthlyKey, 2592000); // Expire after 30 days
      await pipeline.exec();

      return { 
        allowed: true, 
        dailyRemaining: dailyRemaining - estimatedCost,
        monthlyRemaining: monthlyRemaining - estimatedCost
      };
    } catch (error) {
      console.error('Cost-based rate limit error:', error);
      return { allowed: true, dailyRemaining: this.costLimits.daily, monthlyRemaining: this.costLimits.monthly };
    }
  }

  async getUserUsage(userId: string): Promise<{
    daily: number;
    monthly: number;
    dailyLimit: number;
    monthlyLimit: number;
  }> {
    if (!redis) {
      return {
        daily: 0,
        monthly: 0,
        dailyLimit: this.costLimits.daily,
        monthlyLimit: this.costLimits.monthly,
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const month = today.substring(0, 7);

    try {
      const [daily, monthly] = await Promise.all([
        redis.get<number>(`cost:${userId}:${today}`) || 0,
        redis.get<number>(`cost:${userId}:${month}`) || 0,
      ]);

      return {
        daily: (daily as number) / 100, // Convert from cents
        monthly: (monthly as number) / 100,
        dailyLimit: this.costLimits.daily,
        monthlyLimit: this.costLimits.monthly,
      };
    } catch (error) {
      console.error('Get user usage error:', error);
      return {
        daily: 0,
        monthly: 0,
        dailyLimit: this.costLimits.daily,
        monthlyLimit: this.costLimits.monthly,
      };
    }
  }
}

export const costLimiter = new CostBasedRateLimiter();