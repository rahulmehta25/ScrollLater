import { NextRequest, NextResponse } from 'next/server'
import { AIProcessor } from '@/lib/ai-processor'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing AI Integration...')
    
    // Initialize AI Processor
    const processor = new AIProcessor(process.env.OPENROUTER_API_KEY!)
    
    // Test content analysis
    const testContent = "This is a test article about productivity. It discusses various techniques like time-blocking, the Pomodoro technique, and prioritization methods. The article emphasizes the importance of regular breaks and maintaining work-life balance."
    const testUrl = "https://example.com/productivity-article"
    
    console.log('Input:', testContent)
    
    const result = await processor.analyzeContent(testContent, testUrl)
    
    console.log('AI Response:', result)
    
    return NextResponse.json({
      success: true,
      test: 'AI Integration Test',
      input: testContent,
      output: result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('AI Test Error:', error)
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