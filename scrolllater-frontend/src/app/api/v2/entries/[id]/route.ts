import { NextRequest } from 'next/server'
import { withErrorHandler, createSuccessResponse } from '@/lib/middleware/error-handler'
import { authMiddleware } from '@/lib/security/auth-middleware'
import { EntriesService } from '@/lib/services/entries.service'
import { ServiceError, ServiceErrorCode } from '@/lib/services/base.service'

const entriesService = new EntriesService(process.env.OPENROUTER_API_KEY)

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/v2/entries/[id]
 * Retrieve a specific entry
 */
export const GET = withErrorHandler(async (request: NextRequest, context, { params }: RouteParams) => {
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
  const entryId = params.id

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(entryId)) {
    throw new ServiceError(
      'Invalid entry ID format',
      ServiceErrorCode.VALIDATION_ERROR,
      400
    )
  }

  const result = await entriesService.getEntry(entryId, userId)

  if (!result.success) {
    throw result.error
  }

  return createSuccessResponse(result.data, context)
})

/**
 * PUT /api/v2/entries/[id]
 * Update a specific entry
 */
export const PUT = withErrorHandler(async (request: NextRequest, context, { params }: RouteParams) => {
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
  const entryId = params.id
  const body = await request.json()

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(entryId)) {
    throw new ServiceError(
      'Invalid entry ID format',
      ServiceErrorCode.VALIDATION_ERROR,
      400
    )
  }

  // Validate update data
  const allowedFields = [
    'title', 'content', 'userCategory', 'userTags', 'userNotes', 
    'priority', 'status', 'scheduledFor'
  ]
  
  const updateData: any = {}
  Object.keys(body).forEach(key => {
    if (allowedFields.includes(key)) {
      updateData[key] = body[key]
    }
  })

  // Validate specific fields
  if (updateData.priority && (updateData.priority < 1 || updateData.priority > 5)) {
    throw new ServiceError(
      'Priority must be between 1 and 5',
      ServiceErrorCode.VALIDATION_ERROR,
      400
    )
  }

  if (updateData.status && !['inbox', 'scheduled', 'completed', 'archived'].includes(updateData.status)) {
    throw new ServiceError(
      'Invalid status. Must be one of: inbox, scheduled, completed, archived',
      ServiceErrorCode.VALIDATION_ERROR,
      400
    )
  }

  if (updateData.scheduledFor) {
    const scheduledDate = new Date(updateData.scheduledFor)
    if (isNaN(scheduledDate.getTime())) {
      throw new ServiceError(
        'Invalid scheduledFor date format',
        ServiceErrorCode.VALIDATION_ERROR,
        400
      )
    }
  }

  if (updateData.content && updateData.content.length > 50000) {
    throw new ServiceError(
      'Content too large. Maximum 50,000 characters allowed',
      ServiceErrorCode.VALIDATION_ERROR,
      400
    )
  }

  const result = await entriesService.updateEntry(entryId, userId, updateData)

  if (!result.success) {
    throw result.error
  }

  return createSuccessResponse(result.data, context)
})

/**
 * DELETE /api/v2/entries/[id]
 * Delete a specific entry
 */
export const DELETE = withErrorHandler(async (request: NextRequest, context, { params }: RouteParams) => {
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
  const entryId = params.id

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(entryId)) {
    throw new ServiceError(
      'Invalid entry ID format',
      ServiceErrorCode.VALIDATION_ERROR,
      400
    )
  }

  const result = await entriesService.deleteEntry(entryId, userId)

  if (!result.success) {
    throw result.error
  }

  return createSuccessResponse(
    { deleted: true, id: entryId },
    context,
    200
  )
})

/**
 * PATCH /api/v2/entries/[id]/schedule
 * Schedule a specific entry
 */
export const PATCH = withErrorHandler(async (request: NextRequest, context, { params }: RouteParams) => {
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
  const entryId = params.id
  const body = await request.json()

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(entryId)) {
    throw new ServiceError(
      'Invalid entry ID format',
      ServiceErrorCode.VALIDATION_ERROR,
      400
    )
  }

  // Handle different actions
  const action = body.action

  switch (action) {
    case 'schedule':
      if (!body.scheduledFor) {
        throw new ServiceError(
          'scheduledFor is required for schedule action',
          ServiceErrorCode.VALIDATION_ERROR,
          400
        )
      }
      
      const result = await entriesService.scheduleEntry(
        entryId,
        userId,
        body.scheduledFor,
        body.calendarEventId
      )

      if (!result.success) {
        throw result.error
      }

      return createSuccessResponse(result.data, context)

    case 'complete':
      const completeResult = await entriesService.completeEntry(entryId, userId)

      if (!completeResult.success) {
        throw completeResult.error
      }

      return createSuccessResponse(completeResult.data, context)

    case 'archive':
      const archiveResult = await entriesService.archiveEntry(entryId, userId)

      if (!archiveResult.success) {
        throw archiveResult.error
      }

      return createSuccessResponse(archiveResult.data, context)

    default:
      throw new ServiceError(
        'Invalid action. Must be one of: schedule, complete, archive',
        ServiceErrorCode.VALIDATION_ERROR,
        400
      )
  }
})