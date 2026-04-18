// Comprehensive error handling for Supabase operations

import { PostgrestError } from '@supabase/supabase-js'

// Error codes
export const ErrorCode = {
  // Auth errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_USER_NOT_FOUND: 'AUTH_USER_NOT_FOUND',
  AUTH_EMAIL_NOT_CONFIRMED: 'AUTH_EMAIL_NOT_CONFIRMED',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',

  // Database errors
  DB_NOT_FOUND: 'DB_NOT_FOUND',
  DB_UNIQUE_VIOLATION: 'DB_UNIQUE_VIOLATION',
  DB_FOREIGN_KEY_VIOLATION: 'DB_FOREIGN_KEY_VIOLATION',
  DB_CHECK_VIOLATION: 'DB_CHECK_VIOLATION',
  DB_PERMISSION_DENIED: 'DB_PERMISSION_DENIED',
  DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',

  // API errors
  API_RATE_LIMITED: 'API_RATE_LIMITED',
  API_TIMEOUT: 'API_TIMEOUT',
  API_NETWORK_ERROR: 'API_NETWORK_ERROR',
  API_VALIDATION_ERROR: 'API_VALIDATION_ERROR',

  // General errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
} as const

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode]

// Custom error class
export class AppError extends Error {
  code: ErrorCodeType
  originalError?: unknown
  retryable: boolean
  userMessage: string

  constructor(
    code: ErrorCodeType,
    message: string,
    options?: {
      originalError?: unknown
      retryable?: boolean
      userMessage?: string
    }
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.originalError = options?.originalError
    this.retryable = options?.retryable ?? false
    this.userMessage = options?.userMessage ?? getUserFriendlyMessage(code, message)
  }
}

// Map Postgrest errors to our error codes
export function parsePostgrestError(error: PostgrestError): AppError {
  const code = error.code
  const message = error.message

  // PostgreSQL error codes
  switch (code) {
    case 'PGRST116': // Not found
      return new AppError(ErrorCode.DB_NOT_FOUND, message, {
        originalError: error,
        userMessage: 'The requested item was not found',
      })

    case '23505': // Unique violation
      return new AppError(ErrorCode.DB_UNIQUE_VIOLATION, message, {
        originalError: error,
        userMessage: 'This item already exists',
      })

    case '23503': // Foreign key violation
      return new AppError(ErrorCode.DB_FOREIGN_KEY_VIOLATION, message, {
        originalError: error,
        userMessage: 'Referenced item does not exist',
      })

    case '23514': // Check violation
      return new AppError(ErrorCode.DB_CHECK_VIOLATION, message, {
        originalError: error,
        userMessage: 'Invalid data provided',
      })

    case '42501': // Permission denied
      return new AppError(ErrorCode.DB_PERMISSION_DENIED, message, {
        originalError: error,
        userMessage: 'You do not have permission to perform this action',
      })

    default:
      // Check message patterns
      if (message.includes('JWT expired')) {
        return new AppError(ErrorCode.AUTH_SESSION_EXPIRED, message, {
          originalError: error,
          userMessage: 'Your session has expired. Please sign in again.',
          retryable: false,
        })
      }

      if (message.includes('Invalid login credentials')) {
        return new AppError(ErrorCode.AUTH_INVALID_CREDENTIALS, message, {
          originalError: error,
          userMessage: 'Invalid email or password',
        })
      }

      return new AppError(ErrorCode.UNKNOWN_ERROR, message, {
        originalError: error,
        retryable: true,
      })
  }
}

// Parse generic errors
export function parseError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error) {
    // Check for network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return new AppError(ErrorCode.API_NETWORK_ERROR, error.message, {
        originalError: error,
        userMessage: 'Unable to connect. Please check your internet connection.',
        retryable: true,
      })
    }

    // Check for timeout
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return new AppError(ErrorCode.API_TIMEOUT, error.message, {
        originalError: error,
        userMessage: 'The request timed out. Please try again.',
        retryable: true,
      })
    }

    return new AppError(ErrorCode.UNKNOWN_ERROR, error.message, {
      originalError: error,
      retryable: true,
    })
  }

  return new AppError(ErrorCode.UNKNOWN_ERROR, String(error), {
    originalError: error,
  })
}

// Get user-friendly message for error code
function getUserFriendlyMessage(code: ErrorCodeType, fallback: string): string {
  const messages: Record<ErrorCodeType, string> = {
    [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'Invalid email or password',
    [ErrorCode.AUTH_USER_NOT_FOUND]: 'No account found with this email',
    [ErrorCode.AUTH_EMAIL_NOT_CONFIRMED]: 'Please confirm your email address',
    [ErrorCode.AUTH_SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',
    [ErrorCode.AUTH_UNAUTHORIZED]: 'You are not authorized to perform this action',
    [ErrorCode.DB_NOT_FOUND]: 'The requested item was not found',
    [ErrorCode.DB_UNIQUE_VIOLATION]: 'This item already exists',
    [ErrorCode.DB_FOREIGN_KEY_VIOLATION]: 'Referenced item does not exist',
    [ErrorCode.DB_CHECK_VIOLATION]: 'Invalid data provided',
    [ErrorCode.DB_PERMISSION_DENIED]: 'You do not have permission to perform this action',
    [ErrorCode.DB_CONNECTION_ERROR]: 'Unable to connect to the database',
    [ErrorCode.API_RATE_LIMITED]: 'Too many requests. Please wait a moment and try again.',
    [ErrorCode.API_TIMEOUT]: 'The request timed out. Please try again.',
    [ErrorCode.API_NETWORK_ERROR]: 'Unable to connect. Please check your internet connection.',
    [ErrorCode.API_VALIDATION_ERROR]: 'Invalid data provided',
    [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred',
    [ErrorCode.NOT_CONFIGURED]: 'Service not configured',
  }

  return messages[code] || fallback
}

// Error boundary helper
export function isRetryable(error: AppError): boolean {
  const retryableCodes: ErrorCodeType[] = [
    ErrorCode.API_TIMEOUT,
    ErrorCode.API_NETWORK_ERROR,
    ErrorCode.DB_CONNECTION_ERROR,
  ]

  return error.retryable || retryableCodes.includes(error.code)
}

// Retry helper with exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    baseDelayMs?: number
    maxDelayMs?: number
    shouldRetry?: (error: AppError) => boolean
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    shouldRetry = isRetryable,
  } = options

  let lastError: AppError

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = parseError(err)

      if (attempt >= maxRetries || !shouldRetry(lastError)) {
        throw lastError
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        maxDelayMs,
        baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000
      )

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// Error logger
export function logError(error: AppError, context?: Record<string, unknown>): void {
  console.error('[AppError]', {
    code: error.code,
    message: error.message,
    userMessage: error.userMessage,
    retryable: error.retryable,
    originalError: error.originalError,
    ...context,
  })

  // In production, you would send this to an error tracking service
  // e.g., Sentry.captureException(error)
}

// Toast notification helper types
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastMessage {
  type: ToastType
  title: string
  description?: string
  duration?: number
}

// Convert error to toast message
export function errorToToast(error: AppError): ToastMessage {
  return {
    type: 'error',
    title: 'Error',
    description: error.userMessage,
    duration: error.retryable ? 5000 : 7000,
  }
}

// Handle API response with error parsing
export async function handleApiResponse<T>(
  response: Response
): Promise<{ data: T; error: null } | { data: null; error: AppError }> {
  if (response.ok) {
    try {
      const data = await response.json()
      return { data, error: null }
    } catch {
      return {
        data: null,
        error: new AppError(ErrorCode.UNKNOWN_ERROR, 'Invalid response format'),
      }
    }
  }

  // Handle error responses
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After')
    return {
      data: null,
      error: new AppError(ErrorCode.API_RATE_LIMITED, 'Rate limited', {
        retryable: true,
        userMessage: retryAfter
          ? `Too many requests. Please wait ${retryAfter} seconds.`
          : 'Too many requests. Please wait a moment.',
      }),
    }
  }

  if (response.status === 401) {
    return {
      data: null,
      error: new AppError(ErrorCode.AUTH_UNAUTHORIZED, 'Unauthorized', {
        userMessage: 'Please sign in to continue',
      }),
    }
  }

  if (response.status === 403) {
    return {
      data: null,
      error: new AppError(ErrorCode.DB_PERMISSION_DENIED, 'Forbidden', {
        userMessage: 'You do not have permission to perform this action',
      }),
    }
  }

  if (response.status === 404) {
    return {
      data: null,
      error: new AppError(ErrorCode.DB_NOT_FOUND, 'Not found', {
        userMessage: 'The requested item was not found',
      }),
    }
  }

  try {
    const errorBody = await response.json()
    return {
      data: null,
      error: new AppError(
        ErrorCode.UNKNOWN_ERROR,
        errorBody.error || errorBody.message || 'Unknown error',
        { originalError: errorBody }
      ),
    }
  } catch {
    return {
      data: null,
      error: new AppError(ErrorCode.UNKNOWN_ERROR, `HTTP ${response.status}`),
    }
  }
}
