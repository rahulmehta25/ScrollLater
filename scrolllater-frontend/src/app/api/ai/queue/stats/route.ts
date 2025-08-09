import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { getAIQueueManager } from '@/lib/ai-queue-manager'

export async function GET() {
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

    const queueManager = getAIQueueManager(process.env.OPENROUTER_API_KEY!)
    
    // Get user-specific stats
    const stats = await queueManager.getStats(session.user.id)
    
    // Get recent errors for debugging
    const recentErrors = await queueManager.getRecentErrors(5)

    return NextResponse.json({
      success: true,
      stats,
      recentErrors
    })

  } catch (error) {
    console.error('Error fetching queue stats:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}