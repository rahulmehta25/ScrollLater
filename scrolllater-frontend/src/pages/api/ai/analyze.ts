import { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { AIProcessor } from '@/lib/ai-processor'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify authentication
    const supabase = createServerSupabaseClient({ req, res })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { content, url } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    // Initialize AI Processor with server-side API key
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenRouter API key not configured' })
    }

    const aiProcessor = new AIProcessor(apiKey)
    const analysis = await aiProcessor.analyzeContent(content, url)

    res.status(200).json({ analysis })
  } catch (error) {
    console.error('AI analysis error:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    })
  }
} 