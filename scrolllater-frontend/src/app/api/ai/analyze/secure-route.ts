import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/security/auth-middleware'
import { inputSanitizer, enhancedSchemas } from '@/lib/security/input-sanitizer'
import { AIProcessor, TaskType } from '@/lib/ai-processor'
import { getAIQueueManager } from '@/lib/ai-queue-manager'
import { checkRateLimit, getUserIdentifier, getClientIP } from '@/lib/rate-limiter'
import { apiRateLimiters } from '@/lib/rate-limiter'
import { z } from 'zod'

// Request validation schema
const analyzeRequestSchema = z.object({
  entryId: z.string().uuid('Invalid entry ID format'),
  content: enhancedSchemas.entryForm.shape.content,
  url: enhancedSchemas.entryForm.shape.url,
  useQueue: z.boolean().default(true)
})

/**
 * Secure AI analysis endpoint with comprehensive security measures
 * Implements OWASP API security best practices
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Apply authentication middleware
    const authError = await authMiddleware.middleware(request, {
      requireAuth: true,
      requireCSRF: true,
      validateOrigin: true
    })

    if (authError) {
      return authError
    }

    // Get authenticated session
    const { session } = await authMiddleware.validateAuth(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Step 2: Rate limiting
    const clientIP = getClientIP(request)
    const identifier = getUserIdentifier(session.user.id, clientIP)
    
    const rateLimitResult = await checkRateLimit(
      identifier,
      apiRateLimiters?.ai
    )

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: new Date(rateLimitResult.reset).toISOString()
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString()
          }
        }
      )
    }

    // Step 3: Input validation and sanitization
    let body
    try {
      const rawBody = await request.json()
      
      // Validate input size
      inputSanitizer.validateObjectDepth(rawBody)
      
      // Parse and validate with schema
      body = analyzeRequestSchema.parse(rawBody)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Invalid input',
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message
            }))
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { entryId, content, url, useQueue } = body

    // Step 4: Authorization - Verify resource ownership
    const supabase = await authMiddleware.createSecureSupabaseClient(request)
    
    const { data: entry, error: entryError } = await supabase
      .from('entries')
      .select('id, user_id')
      .eq('id', entryId)
      .eq('user_id', session.user.id)
      .single()

    if (entryError || !entry) {
      // Log potential unauthorized access attempt
      console.warn('Unauthorized access attempt:', {
        userId: session.user.id,
        entryId,
        ip: clientIP,
        timestamp: new Date().toISOString()
      })
      
      return NextResponse.json(
        { error: 'Entry not found or access denied' },
        { status: 404 }
      )
    }

    // Step 5: Process request with queue
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

      // Return secure response
      return authMiddleware.createSecureResponse({
        success: true,
        queued: true,
        taskId,
        message: 'Analysis task has been queued for processing'
      })
    }

    // Step 6: Direct processing (with additional security)
    const aiProcessor = new AIProcessor(process.env.OPENROUTER_API_KEY!)
    
    // Sanitize content before AI processing
    const sanitizedContent = inputSanitizer.sanitizeText(content)
    const sanitizedUrl = url ? inputSanitizer.sanitizeURL(url) : undefined
    
    const analysis = await aiProcessor.analyzeContent(sanitizedContent, sanitizedUrl)

    // Step 7: Update database with sanitized results
    const { error: updateError } = await supabase
      .from('entries')
      .update({
        title: inputSanitizer.sanitizeText(analysis.title || ''),
        ai_summary: inputSanitizer.sanitizeText(analysis.summary || ''),
        ai_category: inputSanitizer.sanitizeText(analysis.category || ''),
        tags: analysis.tags?.map(tag => inputSanitizer.sanitizeText(tag)) || [],
        sentiment: analysis.sentiment,
        urgency: analysis.urgency,
        estimated_read_time: analysis.estimatedReadTime,
        updated_at: new Date().toISOString()
      })
      .eq('id', entryId)
      .eq('user_id', session.user.id) // Double-check ownership

    if (updateError) {
      console.error('Database update error:', {
        error: updateError,
        userId: session.user.id,
        entryId
      })
      
      return NextResponse.json(
        { error: 'Failed to update entry' },
        { status: 500 }
      )
    }

    // Step 8: Audit logging
    console.info('AI analysis completed:', {
      userId: session.user.id,
      entryId,
      ip: clientIP,
      timestamp: new Date().toISOString(),
      tokensUsed: analysis.tokensUsed
    })

    // Return secure response
    return authMiddleware.createSecureResponse({
      success: true,
      analysis: {
        title: analysis.title,
        summary: analysis.summary,
        category: analysis.category,
        tags: analysis.tags,
        sentiment: analysis.sentiment,
        urgency: analysis.urgency,
        estimatedReadTime: analysis.estimatedReadTime
      }
    })

  } catch (error) {
    // Log error securely (no sensitive data)
    console.error('API error:', {
      endpoint: '/api/ai/analyze',
      method: 'POST',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    // Return generic error to prevent information leakage
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    )
  }
}