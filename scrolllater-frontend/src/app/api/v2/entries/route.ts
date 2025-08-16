import { NextRequest } from 'next/server'
import { withErrorHandler, createRequestContext, createSuccessResponse } from '@/lib/middleware/error-handler'
import { authMiddleware } from '@/lib/security/auth-middleware'
import { apiVersioning } from '@/lib/middleware/api-versioning'
import { EntriesService } from '@/lib/services/entries.service'
import { PaginationParams } from '@/lib/repositories/base.repository'
import { ServiceError, ServiceErrorCode } from '@/lib/services/base.service'

const entriesService = new EntriesService(process.env.OPENROUTER_API_KEY)

/**
 * GET /api/v2/entries
 * Retrieve entries with filtering and pagination
 */
export const GET = withErrorHandler(async (request: NextRequest, context) => {
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
  const searchParams = request.nextUrl.searchParams

  // Parse pagination parameters
  const pagination: PaginationParams = {
    page: parseInt(searchParams.get('page') || '1'),
    limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100), // Max 100 items
    sortBy: searchParams.get('sort_by') || 'created_at',
    sortOrder: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc'
  }

  // Parse filters
  const filters = {
    status: searchParams.get('status') || undefined,
    category: searchParams.get('category') || undefined,
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
    priority: searchParams.get('priority') ? parseInt(searchParams.get('priority')!) : undefined,
    dateFrom: searchParams.get('date_from') || undefined,
    dateTo: searchParams.get('date_to') || undefined
  }

  // Search query
  const query = searchParams.get('q') || undefined

  // Get entries
  const result = query 
    ? await entriesService.searchEntries(userId, query, { filters, pagination })
    : await entriesService.getEntries(userId, { filters, pagination })

  if (!result.success) {
    throw result.error
  }

  return createSuccessResponse(
    result.data,
    context,
    200,
    {
      filters: Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined)
      ),
      pagination
    }
  )
})

/**
 * POST /api/v2/entries
 * Create a new entry
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

  // Validate required fields
  if (!body.content || !body.originalInput) {
    throw new ServiceError(
      'Missing required fields: content and originalInput are required',
      ServiceErrorCode.VALIDATION_ERROR,
      400
    )
  }

  // Validate content length
  if (body.content.length > 50000) { // 50KB limit
    throw new ServiceError(
      'Content too large. Maximum 50,000 characters allowed',
      ServiceErrorCode.VALIDATION_ERROR,
      400
    )
  }

  const createData = {
    content: body.content,
    url: body.url,
    originalInput: body.originalInput,
    source: body.source || 'api',
    userCategory: body.userCategory,
    userTags: Array.isArray(body.userTags) ? body.userTags : [],
    userNotes: body.userNotes,
    priority: body.priority ? Math.max(1, Math.min(5, body.priority)) : 3
  }

  const processWithAI = body.processWithAI !== false // Default to true

  const result = await entriesService.createEntry(userId, createData, processWithAI)

  if (!result.success) {
    throw result.error
  }

  return createSuccessResponse(
    result.data,
    context,
    201,
    {
      aiProcessing: processWithAI ? 'queued' : 'disabled'
    }
  )
})

/**
 * PATCH /api/v2/entries (Bulk operations)
 * Update multiple entries
 */
export const PATCH = withErrorHandler(async (request: NextRequest, context) => {
  // Check if bulk operations feature is available in this version
  const version = apiVersioning.extractVersion(request)
  if (!apiVersioning.isFeatureAvailable('bulk-operations', version)) {
    throw new ServiceError(
      'Bulk operations not available in this API version',
      ServiceErrorCode.VALIDATION_ERROR,
      400
    )
  }

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

  // Validate bulk operation request
  if (!Array.isArray(body.entryIds) || body.entryIds.length === 0) {
    throw new ServiceError(
      'entryIds array is required and must not be empty',
      ServiceErrorCode.VALIDATION_ERROR,
      400
    )
  }

  if (body.entryIds.length > 50) { // Limit bulk operations
    throw new ServiceError(
      'Maximum 50 entries can be updated in a single request',
      ServiceErrorCode.VALIDATION_ERROR,
      400
    )
  }

  if (!body.updateData || typeof body.updateData !== 'object') {
    throw new ServiceError(
      'updateData object is required',
      ServiceErrorCode.VALIDATION_ERROR,
      400
    )
  }

  const result = await entriesService.bulkUpdateEntries(
    userId,
    body.entryIds,
    body.updateData
  )

  if (!result.success) {
    throw result.error
  }

  return createSuccessResponse(result.data, context, 200)
})

/**
 * DELETE /api/v2/entries (Bulk delete)
 * Delete multiple entries
 */
export const DELETE = withErrorHandler(async (request: NextRequest, context) => {
  // Check if bulk operations feature is available in this version
  const version = apiVersioning.extractVersion(request)
  if (!apiVersioning.isFeatureAvailable('bulk-operations', version)) {
    throw new ServiceError(
      'Bulk operations not available in this API version',
      ServiceErrorCode.VALIDATION_ERROR,
      400
    )
  }

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

  // Validate bulk delete request
  if (!Array.isArray(body.entryIds) || body.entryIds.length === 0) {
    throw new ServiceError(
      'entryIds array is required and must not be empty',
      ServiceErrorCode.VALIDATION_ERROR,
      400
    )
  }

  if (body.entryIds.length > 50) { // Limit bulk operations
    throw new ServiceError(
      'Maximum 50 entries can be deleted in a single request',
      ServiceErrorCode.VALIDATION_ERROR,
      400
    )
  }

  const result = await entriesService.bulkDeleteEntries(userId, body.entryIds)

  if (!result.success) {
    throw result.error
  }

  return createSuccessResponse(result.data, context, 200)
})