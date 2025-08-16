import { NextRequest } from 'next/server'
import { withErrorHandler, createSuccessResponse } from '@/lib/middleware/error-handler'
import { authMiddleware } from '@/lib/security/auth-middleware'
import { EntriesService } from '@/lib/services/entries.service'
import { ServiceError, ServiceErrorCode } from '@/lib/services/base.service'
import { AIProcessor, TaskType } from '@/lib/ai-processor'
import { getAIQueueManager } from '@/lib/ai-queue-manager'

const entriesService = new EntriesService(process.env.OPENROUTER_API_KEY)

/**
 * POST /api/ai/analyze (v1 - Legacy endpoint)
 * Analyze entry content with AI
 * 
 * @deprecated Use /api/v2/ai/analyze instead
 */
export const POST = withErrorHandler(async (request: NextRequest, context) => {
  // Validate authentication
  const authResult = await authMiddleware.validateAuth(request)
  if (!authResult.isAuthenticated) {
    throw new ServiceError(
      'Authentication required',
      ServiceErrorCode.UNAUTHORIZED,
      401
    )
  }

  const userId = authResult.session!.user.id
  const body = await request.json()
  const { entryId, content, url, useQueue = true } = body

  // Validate required fields
  if (!entryId || !content) {
    throw new ServiceError(
      'Missing required fields: entryId and content',
      ServiceErrorCode.VALIDATION_ERROR,
      400
    )
  }

  // Verify entry exists and belongs to user
  const entryResult = await entriesService.getEntry(entryId, userId)
  if (!entryResult.success) {
    throw entryResult.error
  }

  // If using queue, enqueue the task and return immediately
  if (useQueue) {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new ServiceError(
        'AI processing not available',
        ServiceErrorCode.EXTERNAL_SERVICE_ERROR,
        503
      )
    }

    const queueManager = getAIQueueManager(process.env.OPENROUTER_API_KEY)
    const taskId = await queueManager.enqueueTask(
      entryId,
      userId,
      TaskType.BATCH_ANALYZE,
      5
    )

    if (!taskId) {
      throw new ServiceError(
        'Failed to enqueue AI processing task',
        ServiceErrorCode.EXTERNAL_SERVICE_ERROR,
        500
      )
    }

    return createSuccessResponse(
      {
        queued: true,
        taskId,
        message: 'Analysis task has been queued for processing'
      },
      context,
      200,
      { 
        processingMode: 'queued',
        estimatedCompletion: new Date(Date.now() + 30000).toISOString() // 30 seconds estimate
      }
    )
  }

  // Direct processing (synchronous)
  if (!process.env.OPENROUTER_API_KEY) {
    throw new ServiceError(
      'AI processing not available',
      ServiceErrorCode.EXTERNAL_SERVICE_ERROR,
      503
    )
  }

  const aiProcessor = new AIProcessor(process.env.OPENROUTER_API_KEY)
  const analysis = await aiProcessor.analyzeContent(content, url)

  // Update the entry with AI analysis results
  const updateResult = await entriesService.updateEntry(entryId, userId, {
    title: analysis.title,
    ai_summary: analysis.summary,
    ai_category: analysis.category,
    ai_tags: analysis.tags,
    // Map additional fields that may not be in the service interface
    ...(analysis.sentiment && { sentiment: analysis.sentiment }),
    ...(analysis.urgency && { urgency: analysis.urgency }),
    ...(analysis.estimatedReadTime && { estimated_read_time: analysis.estimatedReadTime })
  })

  if (!updateResult.success) {
    throw updateResult.error
  }

  return createSuccessResponse(
    {
      analysis,
      entry: updateResult.data
    },
    context,
    200,
    {
      processingMode: 'direct',
      processingTime: context.timestamp
    }
  )
})