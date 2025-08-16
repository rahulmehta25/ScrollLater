/**
 * Base Service Interface
 * Provides common service operations and error handling
 */

export interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: ServiceError
  metadata?: Record<string, any>
}

export class ServiceError extends Error {
  constructor(
    message: string,
    public code: ServiceErrorCode,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}

export enum ServiceErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

/**
 * Base Service Class with common functionality
 */
export abstract class BaseService {
  protected logger: Logger

  constructor(logger?: Logger) {
    this.logger = logger || new ConsoleLogger()
  }

  /**
   * Wrap repository operations with service-level error handling
   */
  protected async execute<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<ServiceResult<T>> {
    try {
      const data = await operation()
      this.logger.info(`${context} - Success`, { data })
      return { success: true, data }
    } catch (error) {
      this.logger.error(`${context} - Error`, { error })
      
      if (error instanceof ServiceError) {
        return { success: false, error }
      }

      // Convert repository errors to service errors
      if (error instanceof Error && error.name === 'RepositoryError') {
        const serviceError = this.mapRepositoryError(error as any)
        return { success: false, error: serviceError }
      }

      // Unexpected errors
      const serviceError = new ServiceError(
        'Internal service error',
        ServiceErrorCode.INTERNAL_ERROR,
        500,
        error
      )
      return { success: false, error: serviceError }
    }
  }

  /**
   * Map repository errors to service errors
   */
  private mapRepositoryError(repositoryError: any): ServiceError {
    const codeMapping: Record<string, { code: ServiceErrorCode; statusCode: number }> = {
      'NOT_FOUND': { code: ServiceErrorCode.NOT_FOUND, statusCode: 404 },
      'DUPLICATE_KEY': { code: ServiceErrorCode.DUPLICATE_RESOURCE, statusCode: 409 },
      'VALIDATION_ERROR': { code: ServiceErrorCode.VALIDATION_ERROR, statusCode: 400 },
      'PERMISSION_DENIED': { code: ServiceErrorCode.FORBIDDEN, statusCode: 403 }
    }

    const mapping = codeMapping[repositoryError.code] || {
      code: ServiceErrorCode.INTERNAL_ERROR,
      statusCode: 500
    }

    return new ServiceError(
      repositoryError.message,
      mapping.code,
      mapping.statusCode,
      repositoryError.originalError
    )
  }

  /**
   * Validate required fields
   */
  protected validateRequired(data: Record<string, any>, requiredFields: string[]): void {
    const missing = requiredFields.filter(field => 
      data[field] === undefined || data[field] === null || data[field] === ''
    )

    if (missing.length > 0) {
      throw new ServiceError(
        `Missing required fields: ${missing.join(', ')}`,
        ServiceErrorCode.VALIDATION_ERROR,
        400
      )
    }
  }

  /**
   * Validate user permissions
   */
  protected validateUserAccess(userId: string, resourceUserId: string): void {
    if (userId !== resourceUserId) {
      throw new ServiceError(
        'Access denied: You can only access your own resources',
        ServiceErrorCode.FORBIDDEN,
        403
      )
    }
  }
}

/**
 * Logger Interface
 */
export interface Logger {
  info(message: string, context?: any): void
  warn(message: string, context?: any): void
  error(message: string, context?: any): void
  debug(message: string, context?: any): void
}

/**
 * Console Logger Implementation
 */
export class ConsoleLogger implements Logger {
  info(message: string, context?: any): void {
    console.log(`[INFO] ${message}`, context ? JSON.stringify(context, null, 2) : '')
  }

  warn(message: string, context?: any): void {
    console.warn(`[WARN] ${message}`, context ? JSON.stringify(context, null, 2) : '')
  }

  error(message: string, context?: any): void {
    console.error(`[ERROR] ${message}`, context ? JSON.stringify(context, null, 2) : '')
  }

  debug(message: string, context?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`, context ? JSON.stringify(context, null, 2) : '')
    }
  }
}

/**
 * Structured Logger for production use
 */
export class StructuredLogger implements Logger {
  private service: string

  constructor(service: string) {
    this.service = service
  }

  private log(level: string, message: string, context?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
      ...context,
      requestId: this.getCurrentRequestId()
    }

    // In production, you'd send this to a logging service
    console.log(JSON.stringify(logEntry))
  }

  private getCurrentRequestId(): string | undefined {
    // This would typically come from request context
    return process.env.REQUEST_ID || undefined
  }

  info(message: string, context?: any): void {
    this.log('INFO', message, context)
  }

  warn(message: string, context?: any): void {
    this.log('WARN', message, context)
  }

  error(message: string, context?: any): void {
    this.log('ERROR', message, context)
  }

  debug(message: string, context?: any): void {
    this.log('DEBUG', message, context)
  }
}