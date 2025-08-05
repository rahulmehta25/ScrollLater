import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { AIProcessor, TaskType } from '@/lib/ai-processor'
import { getAIQueueManager } from '@/lib/ai-queue-manager'

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
    const { entryId, content, url, useQueue = true } = body

    if (!entryId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: entryId and content' },
        { status: 400 }
      )
    }

    // Verify the entry belongs to the user
    const { data: entry, error: entryError } = await supabase
      .from('entries')
      .select('id, user_id')
      .eq('id', entryId)
      .eq('user_id', session.user.id)
      .single()

    if (entryError || !entry) {
      return NextResponse.json(
        { error: 'Entry not found or access denied' },
        { status: 404 }
      )
    }

    // If using queue, enqueue the task and return immediately
    if (useQueue) {
      const queueManager = getAIQueueManager(process.env.OPENROUTER_API_KEY!)
      const taskId = await queueManager.enqueueTask(
        entryId,
        session.user.id,
        TaskType.BATCH_ANALYZE,
        5
      )

      if (!taskId) {
        return NextResponse.json(
          { error: 'Failed to enqueue task' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        queued: true,
        taskId,
        message: 'Analysis task has been queued for processing'
      })
    }

    // Direct processing (synchronous)
    const aiProcessor = new AIProcessor(process.env.OPENROUTER_API_KEY!)
    const analysis = await aiProcessor.analyzeContent(content, url)

    // Update the entry with AI analysis results
    const { error: updateError } = await supabase
      .from('entries')
      .update({
        title: analysis.title,
        ai_summary: analysis.summary,
        ai_category: analysis.category,
        tags: analysis.tags,
        sentiment: analysis.sentiment,
        urgency: analysis.urgency,
        estimated_read_time: analysis.estimatedReadTime,
        updated_at: new Date().toISOString()
      })
      .eq('id', entryId)

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update entry with AI analysis' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      analysis
    })

  } catch (error) {
    console.error('Error in AI analysis:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}