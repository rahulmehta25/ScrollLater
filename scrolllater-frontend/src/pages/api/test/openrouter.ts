import type { NextApiRequest, NextApiResponse } from 'next'
import { AIProcessor } from '@/lib/ai-processor'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'OpenRouter API key not configured',
        status: 'missing_key'
      })
    }

    // Initialize AI processor
    const aiProcessor = new AIProcessor(apiKey)

    // Test with a simple content analysis
    const testContent = "This is a test entry to verify OpenRouter API connectivity and AI analysis functionality."
    
    console.log('Testing OpenRouter API connection...')
    const startTime = Date.now()
    
    const analysis = await aiProcessor.analyzeContent(testContent)
    const processingTime = Date.now() - startTime

    console.log('OpenRouter API test successful:', {
      processingTime: `${processingTime}ms`,
      analysis: analysis
    })

    return res.status(200).json({
      success: true,
      message: 'OpenRouter API connection successful',
      processingTime: `${processingTime}ms`,
      analysis: {
        title: analysis.title,
        summary: analysis.summary,
        category: analysis.category,
        tags: analysis.tags,
        confidence: analysis.confidence,
        sentiment: analysis.sentiment,
        urgency: analysis.urgency,
        estimatedReadTime: analysis.estimatedReadTime
      },
      status: 'connected'
    })

  } catch (error) {
    console.error('OpenRouter API test failed:', error)
    
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'connection_failed'
    })
  }
} 