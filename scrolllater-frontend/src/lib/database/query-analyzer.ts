import { createSupabaseServer } from '@/lib/supabase-server'

export interface QueryPlan {
  query: string
  executionPlan: any
  executionTime: number
  planTime: number
  totalCost: number
  actualRows: number
  plannedRows: number
  bufferHits?: number
  bufferReads?: number
  suggestions: string[]
}

export interface IndexRecommendation {
  table: string
  columns: string[]
  indexType: 'btree' | 'gin' | 'gist' | 'hash'
  reason: string
  estimatedImprovement: string
  createStatement: string
}

/**
 * Query Analyzer for PostgreSQL EXPLAIN ANALYZE
 * Provides query plan analysis and optimization recommendations
 */
export class QueryAnalyzer {
  private supabase = createSupabaseServer()

  /**
   * Analyze a query using EXPLAIN ANALYZE
   */
  async analyzeQuery(
    query: string,
    parameters: any[] = []
  ): Promise<QueryPlan> {
    try {
      // Execute EXPLAIN ANALYZE
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`
      
      const startTime = Date.now()
      const { data, error } = await this.supabase.rpc('execute_explain_query', {
        query_text: explainQuery,
        parameters
      })
      const executionTime = Date.now() - startTime

      if (error) {
        throw new Error(`Failed to analyze query: ${error.message}`)
      }

      const plan = data[0]?.['QUERY PLAN'][0]
      
      if (!plan) {
        throw new Error('No query plan returned')
      }

      // Extract key metrics
      const executionPlan = plan['Plan']
      const planTime = plan['Planning Time'] || 0
      const actualExecutionTime = plan['Execution Time'] || 0
      const totalCost = executionPlan['Total Cost'] || 0
      const actualRows = executionPlan['Actual Rows'] || 0
      const plannedRows = executionPlan['Plan Rows'] || 0

      // Generate optimization suggestions
      const suggestions = this.generateSuggestions(executionPlan, query)

      return {
        query,
        executionPlan,
        executionTime: actualExecutionTime,
        planTime,
        totalCost,
        actualRows,
        plannedRows,
        bufferHits: plan['Buffers']?.['Shared Hit Blocks'],
        bufferReads: plan['Buffers']?.['Shared Read Blocks'],
        suggestions
      }
    } catch (error) {
      console.error('Query analysis failed:', error)
      throw error
    }
  }

  /**
   * Analyze common ScrollLater queries
   */
  async analyzeCommonQueries(userId: string): Promise<QueryPlan[]> {
    const commonQueries = [
      {
        name: 'Get user entries paginated',
        query: `
          SELECT * FROM entries 
          WHERE user_id = $1 
          ORDER BY created_at DESC 
          LIMIT 20 OFFSET 0
        `,
        params: [userId]
      },
      {
        name: 'Search entries by text',
        query: `
          SELECT * FROM entries 
          WHERE user_id = $1 
          AND search_vector @@ to_tsquery('english', $2)
          ORDER BY created_at DESC
        `,
        params: [userId, 'test']
      },
      {
        name: 'Get entries by status',
        query: `
          SELECT * FROM entries 
          WHERE user_id = $1 AND status = $2 
          ORDER BY created_at DESC
        `,
        params: [userId, 'inbox']
      },
      {
        name: 'Get entries by category',
        query: `
          SELECT * FROM entries 
          WHERE user_id = $1 
          AND (ai_category = $2 OR user_category = $2)
          ORDER BY created_at DESC
        `,
        params: [userId, 'Read Later']
      },
      {
        name: 'Get scheduled entries',
        query: `
          SELECT * FROM entries 
          WHERE user_id = $1 
          AND status = 'scheduled' 
          AND scheduled_for BETWEEN NOW() AND NOW() + INTERVAL '7 days'
          ORDER BY scheduled_for ASC
        `,
        params: [userId]
      },
      {
        name: 'Get processing queue stats',
        query: `
          SELECT status, COUNT(*) as count, AVG(processing_time_ms) as avg_time
          FROM processing_queue 
          WHERE user_id = $1
          GROUP BY status
        `,
        params: [userId]
      }
    ]

    const results: QueryPlan[] = []
    
    for (const queryDef of commonQueries) {
      try {
        console.log(`Analyzing: ${queryDef.name}`)
        const plan = await this.analyzeQuery(queryDef.query, queryDef.params)
        plan.query = `${queryDef.name}: ${plan.query}`
        results.push(plan)
      } catch (error) {
        console.error(`Failed to analyze ${queryDef.name}:`, error)
      }
    }

    return results
  }

  /**
   * Generate optimization suggestions based on query plan
   */
  private generateSuggestions(plan: any, query: string): string[] {
    const suggestions: string[] = []

    // Check for sequential scans
    if (this.hasSequentialScan(plan)) {
      suggestions.push('Sequential scan detected. Consider adding an index on the filtered columns.')
    }

    // Check for nested loops with high cost
    if (this.hasExpensiveNestedLoop(plan)) {
      suggestions.push('Expensive nested loop join detected. Consider adding indexes on join columns.')
    }

    // Check for sort operations
    if (this.hasExpensiveSort(plan)) {
      suggestions.push('Expensive sort operation detected. Consider adding an index that matches the ORDER BY clause.')
    }

    // Check for bitmap heap scans
    if (this.hasBitmapHeapScan(plan)) {
      suggestions.push('Bitmap heap scan detected. This might benefit from a more selective index.')
    }

    // Check for high planning time
    if (plan['Planning Time'] > 10) {
      suggestions.push('High planning time detected. Consider using prepared statements for frequently executed queries.')
    }

    // Check buffer efficiency
    if (plan['Buffers']) {
      const hitRatio = plan['Buffers']['Shared Hit Blocks'] / 
        (plan['Buffers']['Shared Hit Blocks'] + plan['Buffers']['Shared Read Blocks'] || 1)
      
      if (hitRatio < 0.9) {
        suggestions.push(`Low buffer hit ratio (${(hitRatio * 100).toFixed(1)}%). Consider increasing shared_buffers or optimizing the query.`)
      }
    }

    // Check for full-text search optimization
    if (query.includes('search_vector')) {
      suggestions.push('Using full-text search. Ensure the GIN index on search_vector is optimized and up-to-date.')
    }

    // Check for array operations
    if (query.includes('ai_tags') || query.includes('user_tags')) {
      suggestions.push('Array operations detected. Ensure GIN indexes are in place for array columns.')
    }

    return suggestions
  }

  /**
   * Check if plan contains sequential scan
   */
  private hasSequentialScan(plan: any): boolean {
    if (plan['Node Type'] === 'Seq Scan') {
      return true
    }
    
    if (plan['Plans']) {
      return plan['Plans'].some((subPlan: any) => this.hasSequentialScan(subPlan))
    }
    
    return false
  }

  /**
   * Check for expensive nested loop joins
   */
  private hasExpensiveNestedLoop(plan: any): boolean {
    if (plan['Node Type'] === 'Nested Loop' && plan['Total Cost'] > 1000) {
      return true
    }
    
    if (plan['Plans']) {
      return plan['Plans'].some((subPlan: any) => this.hasExpensiveNestedLoop(subPlan))
    }
    
    return false
  }

  /**
   * Check for expensive sort operations
   */
  private hasExpensiveSort(plan: any): boolean {
    if (plan['Node Type'] === 'Sort' && plan['Total Cost'] > 100) {
      return true
    }
    
    if (plan['Plans']) {
      return plan['Plans'].some((subPlan: any) => this.hasExpensiveSort(subPlan))
    }
    
    return false
  }

  /**
   * Check for bitmap heap scans
   */
  private hasBitmapHeapScan(plan: any): boolean {
    if (plan['Node Type'] === 'Bitmap Heap Scan') {
      return true
    }
    
    if (plan['Plans']) {
      return plan['Plans'].some((subPlan: any) => this.hasBitmapHeapScan(subPlan))
    }
    
    return false
  }

  /**
   * Generate index recommendations
   */
  async generateIndexRecommendations(userId: string): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = []
    
    // Analyze query patterns from the last 24 hours (if we had query logs)
    // For now, we'll provide common recommendations based on the schema
    
    recommendations.push({
      table: 'entries',
      columns: ['user_id', 'status', 'created_at'],
      indexType: 'btree',
      reason: 'Common filtering pattern in dashboard queries',
      estimatedImprovement: '50-80% faster dashboard loading',
      createStatement: 'CREATE INDEX CONCURRENTLY idx_entries_user_status_created ON entries(user_id, status, created_at DESC);'
    })

    recommendations.push({
      table: 'entries',
      columns: ['user_id', 'scheduled_for'],
      indexType: 'btree',
      reason: 'Scheduled entries lookup optimization',
      estimatedImprovement: '60-90% faster scheduled entries queries',
      createStatement: 'CREATE INDEX CONCURRENTLY idx_entries_user_scheduled ON entries(user_id, scheduled_for) WHERE status = \'scheduled\';'
    })

    recommendations.push({
      table: 'entries',
      columns: ['ai_tags', 'user_tags'],
      indexType: 'gin',
      reason: 'Array operations for tag filtering',
      estimatedImprovement: '70-95% faster tag-based searches',
      createStatement: 'CREATE INDEX CONCURRENTLY idx_entries_tags_gin ON entries USING GIN((ai_tags || user_tags));'
    })

    recommendations.push({
      table: 'processing_queue',
      columns: ['status', 'priority', 'created_at'],
      indexType: 'btree',
      reason: 'Queue processing optimization',
      estimatedImprovement: '40-70% faster queue operations',
      createStatement: 'CREATE INDEX CONCURRENTLY idx_processing_queue_status_priority ON processing_queue(status, priority DESC, created_at ASC) WHERE status IN (\'pending\', \'processing\');'
    })

    return recommendations
  }

  /**
   * Get database statistics for optimization
   */
  async getDatabaseStats(): Promise<{
    tableStats: any[]
    indexStats: any[]
    slowQueries: any[]
  }> {
    try {
      // Get table statistics
      const { data: tableStats } = await this.supabase.rpc('get_table_stats')
      
      // Get index usage statistics
      const { data: indexStats } = await this.supabase.rpc('get_index_stats')
      
      // Get slow query statistics (if pg_stat_statements is enabled)
      const { data: slowQueries } = await this.supabase.rpc('get_slow_queries')

      return {
        tableStats: tableStats || [],
        indexStats: indexStats || [],
        slowQueries: slowQueries || []
      }
    } catch (error) {
      console.error('Failed to get database stats:', error)
      return {
        tableStats: [],
        indexStats: [],
        slowQueries: []
      }
    }
  }

  /**
   * Generate comprehensive optimization report
   */
  async generateOptimizationReport(userId?: string): Promise<{
    queryPlans: QueryPlan[]
    indexRecommendations: IndexRecommendation[]
    databaseStats: any
    overallSummary: string[]
  }> {
    console.log('Generating database optimization report...')
    
    const [queryPlans, indexRecommendations, databaseStats] = await Promise.all([
      userId ? this.analyzeCommonQueries(userId) : Promise.resolve([]),
      this.generateIndexRecommendations(userId || ''),
      this.getDatabaseStats()
    ])

    const overallSummary = this.generateOverallSummary(queryPlans, indexRecommendations, databaseStats)

    return {
      queryPlans,
      indexRecommendations,
      databaseStats,
      overallSummary
    }
  }

  /**
   * Generate overall optimization summary
   */
  private generateOverallSummary(
    queryPlans: QueryPlan[],
    indexRecommendations: IndexRecommendation[],
    databaseStats: any
  ): string[] {
    const summary: string[] = []

    // Analyze query performance
    const slowQueries = queryPlans.filter(plan => plan.executionTime > 100)
    if (slowQueries.length > 0) {
      summary.push(`Found ${slowQueries.length} slow queries that take >100ms to execute`)
    }

    // Index recommendations
    if (indexRecommendations.length > 0) {
      summary.push(`${indexRecommendations.length} index optimizations recommended`)
    }

    // Overall performance assessment
    const avgExecutionTime = queryPlans.length > 0 
      ? queryPlans.reduce((sum, plan) => sum + plan.executionTime, 0) / queryPlans.length
      : 0

    if (avgExecutionTime > 50) {
      summary.push('Query performance could be improved with better indexing')
    } else if (avgExecutionTime < 20) {
      summary.push('Query performance is excellent')
    } else {
      summary.push('Query performance is good')
    }

    return summary
  }
}

// Export singleton
export const queryAnalyzer = new QueryAnalyzer()

/**
 * Database functions that should be created in Supabase for analysis
 */
export const ANALYSIS_FUNCTIONS = `
-- Function to execute EXPLAIN queries safely
CREATE OR REPLACE FUNCTION execute_explain_query(query_text text, parameters text[] DEFAULT '{}')
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    -- This is a simplified version - in production, you'd want more safety checks
    EXECUTE query_text INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get table statistics
CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE (
    table_name text,
    row_count bigint,
    total_size text,
    index_size text,
    toast_size text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        n_tup_ins + n_tup_upd + n_tup_del as row_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as toast_size
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get index usage statistics
CREATE OR REPLACE FUNCTION get_index_stats()
RETURNS TABLE (
    index_name text,
    table_name text,
    index_scans bigint,
    index_size text,
    index_usage_ratio numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        indexrelname as index_name,
        tablename as table_name,
        idx_scan as index_scans,
        pg_size_pretty(pg_relation_size(indexrelname::regclass)) as index_size,
        CASE 
            WHEN idx_scan = 0 THEN 0
            ELSE ROUND((idx_scan::numeric / (seq_scan + idx_scan + 1)) * 100, 2)
        END as index_usage_ratio
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get slow queries (requires pg_stat_statements extension)
CREATE OR REPLACE FUNCTION get_slow_queries()
RETURNS TABLE (
    query text,
    calls bigint,
    total_time numeric,
    mean_time numeric,
    max_time numeric
) AS $$
BEGIN
    -- Check if pg_stat_statements exists
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
        RETURN QUERY
        SELECT 
            substr(pss.query, 1, 100) as query,
            pss.calls,
            ROUND(pss.total_exec_time::numeric, 2) as total_time,
            ROUND(pss.mean_exec_time::numeric, 2) as mean_time,
            ROUND(pss.max_exec_time::numeric, 2) as max_time
        FROM pg_stat_statements pss
        WHERE pss.mean_exec_time > 10
        ORDER BY pss.mean_exec_time DESC
        LIMIT 10;
    ELSE
        -- Return empty result if extension is not available
        RETURN;
    END IF;
END;
$$ LANGUAGE plpgsql;
`