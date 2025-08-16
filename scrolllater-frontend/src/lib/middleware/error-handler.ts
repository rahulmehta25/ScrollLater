import { NextRequest, NextResponse } from 'next/server'
import { ServiceError, ServiceErrorCode } from '@/lib/services/base.service'
import { RepositoryError } from '@/lib/repositories/base.repository'

export interface ErrorResponse {
  error: {
    message: string
    code: string
    statusCode: number
    timestamp: string
    requestId?: string
    details?: any
  }
}

export interface RequestContext {
  requestId: string
  userId?: string
  path: string
  method: string
  userAgent?: string
  ip?: string
  timestamp: string
}

/**
 * Global Error Handler for API Routes
 * Provides consistent error responses and logging
 */
export class ApiErrorHandler {
  private static instance: ApiErrorHandler

  static getInstance(): ApiErrorHandler {
    if (!ApiErrorHandler.instance) {
      ApiErrorHandler.instance = new ApiErrorHandler()
    }
    return ApiErrorHandler.instance
  }

  /**
   * Handle errors and return standardized error responses
   */
  handleError(
    error: unknown,
    context: RequestContext
  ): NextResponse<ErrorResponse> {
    const errorResponse = this.createErrorResponse(error, context)
    this.logError(error, context, errorResponse)
    
    return NextResponse.json(errorResponse, {
      status: errorResponse.error.statusCode,
      headers: this.getErrorHeaders(context)
    })
  }

  /**
   * Create standardized error response
   */
  private createErrorResponse(
    error: unknown,
    context: RequestContext
  ): ErrorResponse {
    const timestamp = new Date().toISOString()

    // Service errors (business logic errors)
    if (error instanceof ServiceError) {
      return {
        error: {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
          timestamp,
          requestId: context.requestId,
          details: this.sanitizeDetails(error.details)
        }
      }
    }

    // Repository errors (data layer errors)
    if (error instanceof RepositoryError) {
      const statusCode = this.mapRepositoryErrorToStatus(error.code)
      return {
        error: {
          message: error.message,
          code: error.code,
          statusCode,
          timestamp,
          requestId: context.requestId
        }
      }
    }

    // Validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return {
        error: {
          message: error.message,
          code: ServiceErrorCode.VALIDATION_ERROR,
          statusCode: 400,
          timestamp,
          requestId: context.requestId
        }
      }
    }

    // Next.js/Runtime errors
    if (error instanceof Error) {
      // Don't expose internal error details in production
      const message = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message

      return {
        error: {
          message,
          code: ServiceErrorCode.INTERNAL_ERROR,
          statusCode: 500,
          timestamp,
          requestId: context.requestId,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      }
    }

    // Unknown errors
    return {
      error: {
        message: 'An unexpected error occurred',
        code: ServiceErrorCode.INTERNAL_ERROR,
        statusCode: 500,
        timestamp,
        requestId: context.requestId
      }
    }
  }

  /**
   * Map repository error codes to HTTP status codes
   */
  private mapRepositoryErrorToStatus(code: string): number {
    const mapping: Record<string, number> = {
      'NOT_FOUND': 404,
      'DUPLICATE_KEY': 409,
      'FOREIGN_KEY_VIOLATION': 422,
      'VALIDATION_ERROR': 400,
      'PERMISSION_DENIED': 403,
      'DATABASE_ERROR': 500
    }

    return mapping[code] || 500
  }

  /**
   * Sanitize error details for security
   */
  private sanitizeDetails(details: any): any {
    if (!details) return undefined

    // Remove sensitive information
    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'authorization',
      'cookie', 'session', 'private', 'api_key'
    ]

    if (typeof details === 'object') {
      const sanitized = { ...details }
      
      Object.keys(sanitized).forEach(key => {
        const lowerKey = key.toLowerCase()
        if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
          sanitized[key] = '[REDACTED]'
        }
      })

      return sanitized
    }

    return details
  }

  /**
   * Log error with appropriate level and context
   */
  private logError(
    error: unknown,
    context: RequestContext,
    errorResponse: ErrorResponse
  ): void {
    const logData = {
      ...context,
      error: {
        message: errorResponse.error.message,
        code: errorResponse.error.code,
        statusCode: errorResponse.error.statusCode,
        stack: error instanceof Error ? error.stack : undefined
      },
      environment: process.env.NODE_ENV
    }

    // Log level based on error severity
    if (errorResponse.error.statusCode >= 500) {
      console.error('[API_ERROR]', JSON.stringify(logData, null, 2))
      
      // In production, you might want to send this to an error tracking service
      if (process.env.NODE_ENV === 'production') {
        this.sendToErrorTrackingService(logData)
      }
    } else if (errorResponse.error.statusCode >= 400) {
      console.warn('[API_WARNING]', JSON.stringify(logData, null, 2))
    } else {
      console.info('[API_INFO]', JSON.stringify(logData, null, 2))
    }
  }

  /**
   * Send critical errors to external monitoring service
   */
  private sendToErrorTrackingService(logData: any): void {
    // Placeholder for integration with services like Sentry, LogRocket, etc.
    try {
      // Example: Sentry.captureException(error, { extra: logData })
      // Example: LogRocket.captureException(error)
      console.log('[ERROR_TRACKING] Would send to external service:', logData.error.message)
    } catch (trackingError) {
      console.error('[ERROR_TRACKING] Failed to send error to tracking service:', trackingError)
    }
  }

  /**
   * Get security headers for error responses
   */
  private getErrorHeaders(context: RequestContext): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-Request-ID': context.requestId,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  }
}

/**
 * Utility function to create request context
 */
export function createRequestContext(request: NextRequest): RequestContext {
  return {
    requestId: crypto.randomUUID(),
    path: request.nextUrl.pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent') || undefined,
    ip: request.headers.get('x-forwarded-for') || 
        request.headers.get('x-real-ip') || 
        'unknown',
    timestamp: new Date().toISOString()
  }
}

/**
 * Wrapper function for API route error handling
 */
export function withErrorHandler<T = any>(
  handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest): Promise<NextResponse<T | ErrorResponse>> => {
    const context = createRequestContext(request)
    const errorHandler = ApiErrorHandler.getInstance()

    try {
      return await handler(request, context)
    } catch (error) {
      return errorHandler.handleError(error, context)
    }
  }
}

/**
 * Success response helper
 */
export function createSuccessResponse<T>(
  data: T,
  context: RequestContext,
  statusCode = 200,
  metadata?: Record<string, any>
): NextResponse {
  const response = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
      ...metadata
    }
  }

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': context.requestId
    }
  })
}

/**
 * Rate limiting error
 */
export class RateLimitError extends ServiceError {
  constructor(message = 'Rate limit exceeded', retryAfter?: number) {
    super(message, ServiceErrorCode.RATE_LIMIT_EXCEEDED, 429)
    
    if (retryAfter) {
      this.details = { retryAfter }
    }
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends ServiceError {
  constructor(message = 'Authentication required') {
    super(message, ServiceErrorCode.UNAUTHORIZED, 401)
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends ServiceError {
  constructor(message = 'Access forbidden') {
    super(message, ServiceErrorCode.FORBIDDEN, 403)
  }
}

// Export singleton
export const apiErrorHandler = ApiErrorHandler.getInstance()