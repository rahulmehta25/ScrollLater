import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { AIProcessor } from '@/lib/ai-processor'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Extract the user's access token from the incoming request (for logging only)
    const userToken = req.headers['authorization']?.replace('Bearer ', '')

    // Optionally log the user token for debugging
    if (!userToken) {
      console.warn('No user token provided to AI analysis endpoint')
    }

    const { entryId, content, url } = req.body

    if (!entryId || !content) {
      return res.status(400).json({ error: 'Missing required fields: entryId and content' })
    }

    // Fetch the entry (no RLS restriction with service role)
    const { data: entry, error: entryError } = await supabase
      .from('entries')
      .select('id, user_id')
      .eq('id', entryId)
      .single()

    if (entryError || !entry) {
      return res.status(404).json({ error: 'Entry not found or access denied' })
    }

    // Initialize AI processor
    const aiProcessor = new AIProcessor(process.env.OPENROUTER_API_KEY!)

    // Analyze content with AI
    const analysis = await aiProcessor.analyzeContent(content, url)

    // Update the entry with AI analysis results
    const { error: updateError } = await supabase
      .from('entries')
      .update({
        title: analysis.title,
        ai_summary: analysis.summary,
        ai_category: analysis.category,
        ai_tags: analysis.tags,
        ai_confidence_score: analysis.confidence,
        updated_at: new Date().toISOString()
      })
      .eq('id', entryId)

    if (updateError) {
      console.error('Database update error:', updateError)
      return res.status(500).json({ error: 'Failed to update entry with AI analysis' })
    }

    // Return the analysis results
    return res.status(200).json({
      success: true,
      analysis: {
        title: analysis.title,
        summary: analysis.summary,
        category: analysis.category,
        tags: analysis.tags,
        confidence: analysis.confidence,
        sentiment: analysis.sentiment,
        urgency: analysis.urgency,
        estimatedReadTime: analysis.estimatedReadTime,
        suggestedScheduling: analysis.suggestedScheduling
      }
    })

  } catch (error) {
    console.error('Error in AI analysis:', error)
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    })
  }
} 