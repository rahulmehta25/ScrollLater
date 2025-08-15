import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { cache } from './cache'

interface PooledClient {
  client: SupabaseClient;
  lastAccess: number;
}

class SupabasePool {
  private pool: Map<string, PooledClient> = new Map();
  private maxPoolSize = 10;
  private maxIdleTime = 300000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Only run cleanup in server environment
    if (typeof window === 'undefined') {
      this.startCleanup();
    }
  }

  private startCleanup() {
    // Cleanup idle connections every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 60000);
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.pool.clear();
  }

  getClient(authToken?: string): SupabaseClient {
    const key = authToken || 'anon';
    const now = Date.now();
    
    // Check if we have a cached client
    const pooledClient = this.pool.get(key);
    if (pooledClient) {
      pooledClient.lastAccess = now;
      return pooledClient.client;
    }
    
    // If pool is full, evict the oldest
    if (this.pool.size >= this.maxPoolSize) {
      this.evictOldest();
    }
    
    // Create new client
    const client = this.createClient(authToken);
    this.pool.set(key, { client, lastAccess: now });
    
    return client;
  }

  private createClient(authToken?: string): SupabaseClient {
    const options: any = {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      },
      realtime: {
        params: {
          eventsPerSecond: 2
        }
      }
    };

    // Add auth header if token provided
    if (authToken) {
      options.global = {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      };
    }

    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      authToken ? process.env.SUPABASE_SERVICE_ROLE_KEY! : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      options
    );
  }

  private cleanupIdleConnections() {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [key, pooledClient] of this.pool.entries()) {
      if (now - pooledClient.lastAccess > this.maxIdleTime) {
        toDelete.push(key);
      }
    }
    
    for (const key of toDelete) {
      this.pool.delete(key);
    }
    
    if (toDelete.length > 0) {
      console.log(`Cleaned up ${toDelete.length} idle Supabase connections`);
    }
  }

  private evictOldest() {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, pooledClient] of this.pool.entries()) {
      if (pooledClient.lastAccess < oldestTime) {
        oldestTime = pooledClient.lastAccess;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.pool.delete(oldestKey);
    }
  }

  getPoolStats() {
    const now = Date.now();
    const stats = {
      totalConnections: this.pool.size,
      activeConnections: 0,
      idleConnections: 0,
      avgIdleTime: 0
    };

    let totalIdleTime = 0;
    for (const pooledClient of this.pool.values()) {
      const idleTime = now - pooledClient.lastAccess;
      if (idleTime < 10000) { // Active if used in last 10 seconds
        stats.activeConnections++;
      } else {
        stats.idleConnections++;
        totalIdleTime += idleTime;
      }
    }

    if (stats.idleConnections > 0) {
      stats.avgIdleTime = Math.round(totalIdleTime / stats.idleConnections / 1000); // in seconds
    }

    return stats;
  }
}

// Create singleton pool instance
const supabasePool = typeof window === 'undefined' ? new SupabasePool() : null;

// Export function to get pooled client
export function createSupabaseServer(authToken?: string): SupabaseClient {
  // Use pooling only on server side
  if (supabasePool) {
    return supabasePool.getClient(authToken);
  }
  
  // Fallback to creating new client (client-side or pool not available)
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    }
  );
}

// Admin client with service role key
export function createSupabaseAdmin(): SupabaseClient {
  // Admin clients should not be pooled for security
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// Cached query wrapper for common queries
export async function cachedQuery<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  ttl: number = 300 // 5 minutes default
): Promise<T> {
  return cache.getOrSet(queryKey, queryFn, ttl);
}

// Batch query helper for reducing round trips
export async function batchQuery<T>(
  queries: Array<() => Promise<T>>
): Promise<T[]> {
  return Promise.all(queries);
}

// Optimized pagination helper
export async function paginatedQuery<T>(
  tableName: string,
  options: {
    select?: string;
    filter?: { column: string; value: any }[];
    orderBy?: { column: string; ascending?: boolean };
    pageSize?: number;
    page?: number;
  } = {}
): Promise<{ data: T[]; count: number; hasMore: boolean }> {
  const {
    select = '*',
    filter = [],
    orderBy,
    pageSize = 20,
    page = 1
  } = options;

  const supabase = createSupabaseServer();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from(tableName)
    .select(select, { count: 'exact' })
    .range(from, to);

  // Apply filters
  for (const f of filter) {
    query = query.eq(f.column, f.value);
  }

  // Apply ordering
  if (orderBy) {
    query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    data: data as T[],
    count: count || 0,
    hasMore: (count || 0) > to + 1
  };
}

// Connection pool stats endpoint (for monitoring)
export function getPoolStats() {
  if (supabasePool) {
    return supabasePool.getPoolStats();
  }
  return null;
}

// Cleanup function for graceful shutdown
export function cleanupSupabasePool() {
  if (supabasePool) {
    supabasePool.destroy();
  }
}