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
    const { entryIds, userPreferences, useQueue = true } = body

    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid entryIds array' },
        { status: 400 }
      )
    }

    // Fetch entries and verify ownership
    const { data: entries, error: entriesError } = await supabase
      .from('entries')
      .select('id, content, ai_category, urgency, user_id')
      .in('id', entryIds)
      .eq('user_id', session.user.id)

    if (entriesError || !entries || entries.length === 0) {
      return NextResponse.json(
        { error: 'Entries not found or access denied' },
        { status: 404 }
      )
    }

    // Get user preferences or use defaults
    const preferences = userPreferences || {
      availableHours: [{ start: '09:00', end: '17:00' }],
      preferredDuration: 30,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }

    // If using queue, enqueue tasks for each entry
    if (useQueue) {
      const queueManager = getAIQueueManager(process.env.OPENROUTER_API_KEY!)
      const taskIds = []

      for (const entry of entries) {
        const taskId = await queueManager.enqueueTask(
          entry.id,
          session.user.id,
          TaskType.SCHEDULE_SUGGEST,
          7 // Higher priority for scheduling
        )
        if (taskId) {
          taskIds.push(taskId)
        }
      }

      return NextResponse.json({
        success: true,
        queued: true,
        taskIds,
        message: `${taskIds.length} scheduling tasks have been queued`
      })
    }

    // Direct processing (synchronous)
    const aiProcessor = new AIProcessor(process.env.OPENROUTER_API_KEY!)
    
    const entriesForScheduling = entries.map(entry => ({
      content: entry.content || '',
      category: entry.ai_category || 'General',
      urgency: entry.urgency || 'medium'
    }))

    const suggestions = await aiProcessor.generateSchedulingSuggestions(
      entriesForScheduling,
      preferences
    )

    // Map suggestions back to entry IDs
    const schedulingSuggestions = suggestions.map((suggestion, index) => ({
      ...suggestion,
      entryId: entries[index]?.id
    }))

    return NextResponse.json({
      success: true,
      suggestions: schedulingSuggestions
    })

  } catch (error) {
    console.error('Error in scheduling suggestions:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}