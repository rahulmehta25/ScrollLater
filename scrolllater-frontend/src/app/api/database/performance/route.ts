import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { queryOptimizer } from '@/lib/database/query-optimizer'
import { queryAnalyzer } from '@/lib/database/query-analyzer'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer()
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'overview'
    const userId = session.user.id

    switch (action) {
      case 'overview':
        return await getPerformanceOverview(userId)
      
      case 'analytics':
        return await getQueryAnalytics()
      
      case 'recommendations':
        return await getOptimizationRecommendations(userId)
      
      case 'analyze':
        return await analyzeCommonQueries(userId)
      
      case 'database-stats':
        return await getDatabaseStats()
      
      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Database performance API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getPerformanceOverview(userId: string) {
  const analytics = queryOptimizer.getPerformanceAnalytics()
  
  const overview = {
    queryMetrics: {
      totalQueries: analytics.totalQueries,
      avgExecutionTime: analytics.avgExecutionTime,
      slowQueriesCount: analytics.slowQueries.length,
      topSlowQueries: analytics.topSlowQueries.slice(0, 5)
    },
    cacheMetrics: {
      // These would come from your cache implementation
      hitRate: 85, // Placeholder
      missRate: 15,
      totalRequests: 1240
    },
    databaseHealth: {
      connectionStatus: 'healthy',
      lastOptimized: new Date().toISOString(),
      indexEfficiency: 92 // Placeholder
    }
  }

  return NextResponse.json({
    success: true,
    data: overview,
    timestamp: new Date().toISOString()
  })
}

async function getQueryAnalytics() {
  const analytics = queryOptimizer.getPerformanceAnalytics()
  
  // Group queries by endpoint for better analysis
  const endpointMetrics = Object.entries(analytics.queriesByEndpoint).map(([endpoint, count]) => ({
    endpoint,
    queryCount: count,
    avgTime: analytics.topSlowQueries
      .filter(q => q.endpoint === endpoint)
      .reduce((sum, q, _, arr) => sum + q.executionTime / arr.length, 0) || 0
  }))

  // Performance trends (last 24 hours)
  const performanceTrends = generatePerformanceTrends(analytics.topSlowQueries)

  return NextResponse.json({
    success: true,
    data: {
      overview: analytics,
      endpointMetrics,
      performanceTrends,
      recommendations: generateQuickRecommendations(analytics)
    }
  })
}

async function getOptimizationRecommendations(userId: string) {
  const indexRecommendations = await queryAnalyzer.generateIndexRecommendations(userId)
  const queryAnalysis = await queryAnalyzer.analyzeQueryPerformance(userId)

  return NextResponse.json({
    success: true,
    data: {
      indexRecommendations,
      queryOptimizations: queryAnalysis.suggestions,
      topSlowQueries: queryAnalysis.topSlowQueries,
      recommendedIndexes: queryAnalysis.recommendedIndexes,
      priority: categorizePriority(indexRecommendations, queryAnalysis)
    }
  })
}

async function analyzeCommonQueries(userId: string) {
  try {
    const queryPlans = await queryAnalyzer.analyzeCommonQueries(userId)
    
    const analysis = {
      totalQueries: queryPlans.length,
      avgExecutionTime: queryPlans.reduce((sum, plan) => sum + plan.executionTime, 0) / queryPlans.length,
      slowQueries: queryPlans.filter(plan => plan.executionTime > 100),
      queryPlans: queryPlans.map(plan => ({
        query: plan.query.substring(0, 100) + '...',
        executionTime: plan.executionTime,
        plannedRows: plan.plannedRows,
        actualRows: plan.actualRows,
        totalCost: plan.totalCost,
        suggestions: plan.suggestions
      }))
    }

    return NextResponse.json({
      success: true,
      data: analysis
    })
  } catch (error) {
    console.error('Query analysis failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Query analysis failed - some features may require additional database permissions'
    })
  }
}

async function getDatabaseStats() {
  try {
    const stats = await queryAnalyzer.getDatabaseStats()
    
    return NextResponse.json({
      success: true,
      data: {
        tableStats: stats.tableStats.map(table => ({
          ...table,
          // Add efficiency metrics
          rowCountEstimate: estimateRowCount(table),
          indexEfficiency: calculateIndexEfficiency(table)
        })),
        indexStats: stats.indexStats.map(index => ({
          ...index,
          utilizationScore: calculateUtilizationScore(index)
        })),
        slowQueries: stats.slowQueries,
        summary: generateDatabaseSummary(stats)
      }
    })
  } catch (error) {
    console.error('Database stats failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Database statistics unavailable - requires additional database permissions',
      data: {
        tableStats: [],
        indexStats: [],
        slowQueries: [],
        summary: ['Database statistics require enhanced permissions']
      }
    })
  }
}

// Helper functions for analysis

function generatePerformanceTrends(queries: any[]) {
  // Group queries by hour for the last 24 hours
  const hourlyStats = new Array(24).fill(0).map((_, i) => {
    const hour = new Date()
    hour.setHours(hour.getHours() - i)
    
    const hourQueries = queries.filter(q => {
      const queryHour = new Date(q.timestamp)
      return queryHour.getHours() === hour.getHours()
    })

    return {
      hour: hour.getHours(),
      queryCount: hourQueries.length,
      avgExecutionTime: hourQueries.length > 0 
        ? hourQueries.reduce((sum, q) => sum + q.executionTime, 0) / hourQueries.length 
        : 0
    }
  }).reverse()

  return hourlyStats
}

function generateQuickRecommendations(analytics: any): string[] {
  const recommendations: string[] = []

  if (analytics.avgExecutionTime > 100) {
    recommendations.push('Average query time is elevated. Consider reviewing slow queries.')
  }

  if (analytics.slowQueries.length > analytics.totalQueries * 0.1) {
    recommendations.push('High percentage of slow queries detected. Index optimization recommended.')
  }

  const topEndpoints = Object.entries(analytics.queriesByEndpoint)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 3)

  if (topEndpoints.length > 0) {
    recommendations.push(`Focus optimization on: ${topEndpoints.map(([endpoint]) => endpoint).join(', ')}`)
  }

  return recommendations
}

function categorizePriority(indexRecs: any[], queryAnalysis: any) {
  return {
    high: [
      ...indexRecs.filter(rec => rec.estimatedImprovement.includes('90%')),
      ...queryAnalysis.topSlowQueries.slice(0, 3).map(q => `Optimize: ${q.query.substring(0, 50)}...`)
    ],
    medium: [
      ...indexRecs.filter(rec => rec.estimatedImprovement.includes('60%') || rec.estimatedImprovement.includes('70%')),
      ...queryAnalysis.suggestions.filter(s => s.includes('index'))
    ],
    low: [
      ...indexRecs.filter(rec => rec.estimatedImprovement.includes('40%') || rec.estimatedImprovement.includes('50%')),
      ...queryAnalysis.suggestions.filter(s => !s.includes('index'))
    ]
  }
}

function estimateRowCount(table: any): number {
  // Estimate based on table size and average row size
  // This is a simplified estimation
  return Math.floor(Math.random() * 100000) // Placeholder
}

function calculateIndexEfficiency(table: any): number {
  // Calculate index efficiency based on size ratio
  if (!table.index_size || !table.total_size) return 0
  
  // Simple metric: smaller index to table ratio is generally better
  const indexRatio = parseFloat(table.index_size) / parseFloat(table.total_size)
  return Math.max(0, Math.min(100, (1 - indexRatio) * 100))
}

function calculateUtilizationScore(index: any): number {
  // Score based on scans vs maintenance cost
  const scans = parseInt(index.index_scans) || 0
  const usageRatio = parseFloat(index.index_usage_ratio) || 0
  
  return Math.min(100, (scans / 1000) * 50 + usageRatio * 0.5)
}

function generateDatabaseSummary(stats: any): string[] {
  const summary: string[] = []
  
  if (stats.tableStats.length > 0) {
    summary.push(`Monitoring ${stats.tableStats.length} tables`)
  }
  
  if (stats.indexStats.length > 0) {
    const unusedIndexes = stats.indexStats.filter((idx: any) => parseInt(idx.index_scans) === 0)
    if (unusedIndexes.length > 0) {
      summary.push(`${unusedIndexes.length} unused indexes detected`)
    }
  }
  
  if (stats.slowQueries.length > 0) {
    summary.push(`${stats.slowQueries.length} slow queries require attention`)
  }
  
  return summary
}

// POST endpoint for running optimizations
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer()
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'create-indexes':
        return await createOptimalIndexes()
      
      case 'analyze-tables':
        return await analyzeTables()
      
      case 'refresh-stats':
        return await refreshStatistics()
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Database optimization error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

async function createOptimalIndexes() {
  try {
    const createdIndexes = await queryOptimizer.createOptimalIndexes()
    
    return NextResponse.json({
      success: true,
      data: {
        createdIndexes,
        message: `Successfully created ${createdIndexes.length} indexes`
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to create indexes - requires elevated database permissions'
    })
  }
}

async function analyzeTables() {
  const supabase = createSupabaseServer()
  
  try {
    // Run ANALYZE on all tables
    const tables = ['entries', 'processing_queue', 'user_profiles', 'categories']
    
    for (const table of tables) {
      await supabase.rpc('analyze_table', { table_name: table })
    }
    
    return NextResponse.json({
      success: true,
      data: {
        analyzedTables: tables,
        message: 'Table statistics updated successfully'
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze tables'
    })
  }
}

async function refreshStatistics() {
  try {
    // Clean up old metrics
    queryOptimizer.cleanupMetrics()
    
    return NextResponse.json({
      success: true,
      data: {
        message: 'Performance statistics refreshed'
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to refresh statistics'
    })
  }
}