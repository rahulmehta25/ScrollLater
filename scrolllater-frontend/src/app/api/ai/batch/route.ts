import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { AIProcessor } from '@/lib/ai-processor'

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
    const { entries, batchSize = 5 } = body

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid entries array' },
        { status: 400 }
      )
    }

    // Verify all entries belong to the user
    const entryIds = entries.map(e => e.id)
    const { data: verifiedEntries, error: verifyError } = await supabase
      .from('entries')
      .select('id')
      .in('id', entryIds)
      .eq('user_id', session.user.id)

    if (verifyError || !verifiedEntries || verifiedEntries.length !== entries.length) {
      return NextResponse.json(
        { error: 'Some entries not found or access denied' },
        { status: 404 }
      )
    }

    // Process entries in batches
    const aiProcessor = new AIProcessor(process.env.OPENROUTER_API_KEY!)
    const results = await aiProcessor.batchAnalyzeContent(entries, batchSize)

    // Update entries with analysis results
    const updatePromises = Array.from(results.entries()).map(async ([entryId, analysis]) => {
      const { error } = await supabase
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

      return { entryId, success: !error, error }
    })

    const updateResults = await Promise.all(updatePromises)
    
    // Get usage statistics
    const usageStats = aiProcessor.getUsageStats()

    return NextResponse.json({
      success: true,
      processed: results.size,
      results: Object.fromEntries(results),
      updateResults,
      usageStats
    })

  } catch (error) {
    console.error('Error in batch processing:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}