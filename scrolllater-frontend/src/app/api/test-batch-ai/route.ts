import { NextRequest, NextResponse } from 'next/server'
import { AIProcessor } from '@/lib/ai-processor'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Batch AI Processing...')
    
    // Initialize AI Processor
    const processor = new AIProcessor(process.env.OPENROUTER_API_KEY!)
    
    // Test batch processing
    const testBatch = [
      {
        id: 'entry-1',
        content: 'Learn about React hooks and how to use them effectively in modern web development',
        url: 'https://example.com/react-hooks'
      },
      {
        id: 'entry-2',
        content: 'Understanding machine learning algorithms and their applications in real-world scenarios',
        url: 'https://example.com/ml-guide'
      },
      {
        id: 'entry-3',
        content: 'Quick recipe for a healthy smoothie with fruits and vegetables',
        url: 'https://example.com/smoothie-recipe'
      }
    ]
    
    console.log('Processing batch of', testBatch.length, 'entries...')
    
    // Process entries concurrently
    const results = await Promise.all(
      testBatch.map(async (entry) => {
        const analysis = await processor.analyzeContent(entry.content, entry.url)
        return {
          id: entry.id,
          analysis
        }
      })
    )
    
    console.log('Batch processing complete!')
    
    return NextResponse.json({
      success: true,
      test: 'Batch AI Processing Test',
      totalProcessed: results.length,
      results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Batch AI Test Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    )
  }
}