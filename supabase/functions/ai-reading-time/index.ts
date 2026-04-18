/**
 * @fileoverview Reading time estimation edge function
 * @description Calculates estimated reading/viewing time for content based on
 *              word count, content type, and complexity factors.
 *
 * @example
 * POST /functions/v1/ai-reading-time
 * {
 *   "entryId": "uuid",
 *   "content": "Content to estimate...",
 *   "url": "https://example.com/article",
 *   "contentType": "article"
 * }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import {
  handleCors,
  jsonResponse,
  errorResponse,
  createAuthenticatedClient,
  detectContentType,
  estimateReadingTime,
  parseRequestBody,
  validateRequired,
} from '../_shared/utils.ts'
import type {
  ContentType,
  ReadingTimeEstimate,
} from '../_shared/types.ts'

interface ReadingTimeRequest {
  entryId: string
  content: string
  url?: string
  contentType?: ContentType
}

interface ReadingTimeResponse {
  success: boolean
  estimate?: ReadingTimeEstimate & {
    /** Human-readable format */
    formatted: string
    /** Content type detected/used */
    detectedType: ContentType
  }
  error?: string
}

/**
 * Format reading time as human-readable string
 */
function formatReadingTime(minutes: number): string {
  if (minutes < 1) return 'Less than a minute'
  if (minutes === 1) return '1 minute'
  if (minutes < 60) return `${minutes} minutes`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`
  }

  return `${hours}h ${remainingMinutes}m`
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    // Authenticate user
    const { client, user, error: authError } = await createAuthenticatedClient(req)
    if (authError) {
      return errorResponse('Unauthorized', 401)
    }

    // Parse request body
    const { body, error: parseError } = await parseRequestBody<ReadingTimeRequest>(req)
    if (parseError) {
      return errorResponse(parseError, 400)
    }

    // Validate required fields
    const validationError = validateRequired(body as Record<string, unknown>, ['content'])
    if (validationError) {
      return errorResponse(validationError, 400)
    }

    const { entryId, content, url, contentType: requestedType } = body

    // Detect content type
    const detectedType = requestedType || detectContentType(url, content)

    // Estimate reading time
    const estimate = estimateReadingTime(content, detectedType, url)

    // Update entry if entryId provided
    if (entryId) {
      await client
        .from('entries')
        .update({
          ai_reading_time: estimate.minutes,
          ai_content_type: detectedType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entryId)
        .eq('user_id', user.id)
    }

    const response: ReadingTimeResponse = {
      success: true,
      estimate: {
        ...estimate,
        formatted: formatReadingTime(estimate.minutes),
        detectedType,
      },
    }

    return jsonResponse(response)
  } catch (error) {
    console.error('Error in ai-reading-time function:', error)

    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
})
