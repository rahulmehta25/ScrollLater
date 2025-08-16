import { createSupabaseServer } from '@/lib/supabase-server'

export interface QueryMetrics {
  queryId: string
  query: string
  executionTime: number
  rowsProcessed: number
  timestamp: Date
  userId?: string
  endpoint?: string
}

export interface PerformanceThresholds {
  slowQueryMs: number
  maxRowsWarning: number
  connectionTimeoutMs: number
}

/**
 * Database Query Optimizer and Monitor
 * Provides query optimization utilities and performance monitoring
 */
export class QueryOptimizer {
  private static instance: QueryOptimizer
  private metrics: QueryMetrics[] = []
  private thresholds: PerformanceThresholds
  private supabase = createSupabaseServer()

  private constructor() {
    this.thresholds = {
      slowQueryMs: 1000, // 1 second
      maxRowsWarning: 10000, // 10k rows
      connectionTimeoutMs: 30000 // 30 seconds
    }
  }

  static getInstance(): QueryOptimizer {
    if (!QueryOptimizer.instance) {
      QueryOptimizer.instance = new QueryOptimizer()
    }
    return QueryOptimizer.instance
  }

  /**
   * Execute query with performance monitoring
   */
  async executeWithMonitoring<T>(
    queryBuilder: () => any,
    context: {
      queryId: string
      userId?: string
      endpoint?: string
      description?: string
    }
  ): Promise<{ data: T; metrics: QueryMetrics }> {
    const startTime = Date.now()
    
    try {
      console.log(`[QUERY] Starting: ${context.queryId} - ${context.description || 'No description'}`)
      
      const result = await queryBuilder()
      const executionTime = Date.now() - startTime
      
      const metrics: QueryMetrics = {
        queryId: context.queryId,
        query: context.description || context.queryId,
        executionTime,
        rowsProcessed: Array.isArray(result.data) ? result.data.length : result.count || 1,
        timestamp: new Date(),
        userId: context.userId,
        endpoint: context.endpoint
      }

      // Store metrics for analysis
      this.metrics.push(metrics)

      // Log performance warnings
      this.checkPerformanceThresholds(metrics)

      console.log(`[QUERY] Completed: ${context.queryId} - ${executionTime}ms`)

      return {
        data: result.data || result,
        metrics
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      console.error(`[QUERY] Failed: ${context.queryId} - ${executionTime}ms`, error)
      throw error
    }
  }

  /**
   * Check if query performance exceeds thresholds
   */
  private checkPerformanceThresholds(metrics: QueryMetrics): void {
    const warnings: string[] = []

    if (metrics.executionTime > this.thresholds.slowQueryMs) {
      warnings.push(`Slow query detected: ${metrics.executionTime}ms`)
    }

    if (metrics.rowsProcessed > this.thresholds.maxRowsWarning) {
      warnings.push(`Large result set: ${metrics.rowsProcessed} rows`)
    }

    if (warnings.length > 0) {
      console.warn(`[QUERY_PERFORMANCE] ${metrics.queryId}:`, warnings.join(', '))
      
      // In production, you might want to send this to a monitoring service
      if (process.env.NODE_ENV === 'production') {
        this.sendPerformanceAlert(metrics, warnings)
      }
    }
  }

  /**
   * Send performance alerts to monitoring service
   */
  private sendPerformanceAlert(metrics: QueryMetrics, warnings: string[]): void {
    // Placeholder for integration with monitoring services
    console.log('[PERFORMANCE_ALERT]', {
      queryId: metrics.queryId,
      warnings,
      metrics
    })
  }

  /**
   * Get performance analytics
   */
  getPerformanceAnalytics(): {
    totalQueries: number
    avgExecutionTime: number
    slowQueries: QueryMetrics[]
    topSlowQueries: QueryMetrics[]
    queriesByEndpoint: Record<string, number>
  } {
    const slowQueries = this.metrics.filter(m => m.executionTime > this.thresholds.slowQueryMs)
    const topSlowQueries = [...this.metrics]
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10)

    const queriesByEndpoint = this.metrics.reduce((acc, metric) => {
      if (metric.endpoint) {
        acc[metric.endpoint] = (acc[metric.endpoint] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const avgExecutionTime = this.metrics.length > 0
      ? this.metrics.reduce((sum, m) => sum + m.executionTime, 0) / this.metrics.length
      : 0

    return {
      totalQueries: this.metrics.length,
      avgExecutionTime: Math.round(avgExecutionTime),
      slowQueries,
      topSlowQueries,
      queriesByEndpoint
    }
  }

  /**
   * Optimize entries queries with proper indexes
   */
  async getOptimizedEntries(filters: {
    userId: string
    status?: string
    category?: string
    tags?: string[]
    search?: string
    dateFrom?: string
    dateTo?: string
    limit?: number
    offset?: number
  }) {
    return this.executeWithMonitoring(
      async () => {
        let query = this.supabase
          .from('entries')
          .select(`
            id,
            title,
            content,
            url,
            ai_summary,
            ai_category,
            user_category,
            ai_tags,
            user_tags,
            status,
            priority,
            created_at,
            updated_at,
            scheduled_for,
            estimated_read_time
          `, { count: 'exact' })
          .eq('user_id', filters.userId)

        // Apply filters in order of selectivity (most selective first)
        if (filters.status) {
          query = query.eq('status', filters.status)
        }

        if (filters.category) {
          query = query.or(`ai_category.eq.${filters.category},user_category.eq.${filters.category}`)
        }

        if (filters.dateFrom && filters.dateTo) {
          query = query.gte('created_at', filters.dateFrom).lte('created_at', filters.dateTo)
        } else if (filters.dateFrom) {
          query = query.gte('created_at', filters.dateFrom)
        } else if (filters.dateTo) {
          query = query.lte('created_at', filters.dateTo)
        }

        // Full-text search should be applied last
        if (filters.search) {
          query = query.textSearch('search_vector', filters.search)
        }

        // Tag filtering
        if (filters.tags && filters.tags.length > 0) {
          query = query.overlaps('ai_tags', filters.tags)
        }

        // Pagination
        query = query
          .order('created_at', { ascending: false })
          .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 20) - 1)

        return await query
      },
      {
        queryId: 'get_optimized_entries',
        userId: filters.userId,
        description: `Get entries with filters: ${JSON.stringify(filters)}`
      }
    )
  }

  /**
   * Batch insert entries with optimized performance
   */
  async batchInsertEntries(entries: any[], batchSize = 100) {
    const results = []
    
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize)
      
      const result = await this.executeWithMonitoring(
        async () => {
          return await this.supabase
            .from('entries')
            .insert(batch)
            .select()
        },
        {
          queryId: `batch_insert_entries_${i}`,
          description: `Batch insert ${batch.length} entries`
        }
      )
      
      results.push(...result.data)
      
      // Small delay between batches to avoid overwhelming the database
      if (i + batchSize < entries.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    return results
  }

  /**
   * Get aggregated statistics with efficient queries
   */
  async getUserStats(userId: string) {
    return this.executeWithMonitoring(
      async () => {
        // Use a single query with aggregation instead of multiple queries
        const { data, error } = await this.supabase
          .rpc('get_user_entry_stats', { p_user_id: userId })

        if (error) throw error
        return data
      },
      {
        queryId: 'get_user_stats',
        userId,
        description: 'Get aggregated user statistics'
      }
    )
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  cleanupMetrics(maxAge = 24 * 60 * 60 * 1000): void { // 24 hours
    const cutoff = new Date(Date.now() - maxAge)
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoff)
  }

  /**
   * Create database indexes for better performance
   */
  async createOptimalIndexes(): Promise<string[]> {
    const indexQueries = [
      // Composite index for common query patterns
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entries_user_status_created 
       ON entries(user_id, status, created_at DESC)`,
      
      // Index for category searches
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entries_user_category 
       ON entries(user_id, COALESCE(user_category, ai_category))`,
      
      // Index for scheduled entries
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entries_user_scheduled 
       ON entries(user_id, scheduled_for) WHERE status = 'scheduled'`,
      
      // Index for tag searches (GIN index for array operations)
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entries_tags_gin 
       ON entries USING GIN((ai_tags || user_tags))`,
      
      // Partial index for active entries only
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entries_active 
       ON entries(user_id, created_at DESC) 
       WHERE status IN ('inbox', 'scheduled')`,
      
      // Index for priority sorting
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entries_user_priority 
       ON entries(user_id, priority, created_at DESC)`
    ]

    const createdIndexes: string[] = []
    
    for (const indexQuery of indexQueries) {
      try {
        await this.supabase.rpc('execute_sql', { sql: indexQuery })
        const indexName = indexQuery.match(/idx_\w+/)?.[0] || 'unknown'
        createdIndexes.push(indexName)
        console.log(`[INDEX] Created: ${indexName}`)
      } catch (error) {
        console.warn(`[INDEX] Failed to create index:`, error)
      }
    }
    
    return createdIndexes
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  async analyzeQueryPerformance(userId?: string): Promise<{
    suggestions: string[]
    topSlowQueries: QueryMetrics[]
    recommendedIndexes: string[]
  }> {
    const analytics = this.getPerformanceAnalytics()
    const suggestions: string[] = []
    const recommendedIndexes: string[] = []

    // Analyze slow queries
    if (analytics.slowQueries.length > 0) {
      suggestions.push(`Found ${analytics.slowQueries.length} slow queries. Consider query optimization.`)
    }

    if (analytics.avgExecutionTime > 500) {
      suggestions.push('Average query time is high. Review database indexes and query patterns.')
      recommendedIndexes.push('Consider adding composite indexes for frequent query patterns')
    }

    // Analyze query patterns
    const searchQueries = this.metrics.filter(m => m.query.includes('search'))
    if (searchQueries.length > 0) {
      const avgSearchTime = searchQueries.reduce((sum, q) => sum + q.executionTime, 0) / searchQueries.length
      if (avgSearchTime > 1000) {
        suggestions.push('Full-text search queries are slow. Ensure search_vector index is optimized.')
        recommendedIndexes.push('GIN index on search_vector column')
      }
    }

    return {
      suggestions,
      topSlowQueries: analytics.topSlowQueries,
      recommendedIndexes
    }
  }
}

// Export singleton
export const queryOptimizer = QueryOptimizer.getInstance()

/**
 * Database function to get user statistics efficiently
 * This should be created in Supabase as a stored procedure
 */
export const USER_STATS_FUNCTION = `
CREATE OR REPLACE FUNCTION get_user_entry_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_entries', COUNT(*),
    'by_status', json_object_agg(status, status_count),
    'by_category', json_object_agg(category, category_count),
    'avg_read_time', AVG(estimated_read_time),
    'total_read_time', SUM(estimated_read_time),
    'last_updated', MAX(updated_at)
  ) INTO result
  FROM (
    SELECT 
      status,
      COUNT(*) as status_count,
      COALESCE(user_category, ai_category, 'Uncategorized') as category,
      COUNT(*) as category_count,
      estimated_read_time,
      updated_at
    FROM entries 
    WHERE user_id = p_user_id
    GROUP BY status, category, estimated_read_time, updated_at
  ) stats;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
`