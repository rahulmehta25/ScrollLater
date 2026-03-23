import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  AppError,
  ErrorCode,
  parsePostgrestError,
  parseError,
  isRetryable,
  withRetry,
  logError,
  errorToToast,
  handleApiResponse,
} from '@/lib/errors'
import type { PostgrestError } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePostgrestError(code: string, message: string): PostgrestError {
  return {
    code,
    message,
    details: '',
    hint: '',
    name: 'PostgrestError',
  } as PostgrestError
}

function makeResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): Response {
  const h = new Headers()
  Object.entries(headers).forEach(([k, v]) => h.set(k, v))
  const init: ResponseInit = { status, headers: h }
  return new Response(JSON.stringify(body), init)
}

function makeMalformedResponse(status: number): Response {
  return new Response('not-json', { status })
}

// ---------------------------------------------------------------------------
// ErrorCode
// ---------------------------------------------------------------------------

describe('ErrorCode', () => {
  it('exposes all auth error codes as strings', () => {
    expect(ErrorCode.AUTH_INVALID_CREDENTIALS).toBe('AUTH_INVALID_CREDENTIALS')
    expect(ErrorCode.AUTH_USER_NOT_FOUND).toBe('AUTH_USER_NOT_FOUND')
    expect(ErrorCode.AUTH_EMAIL_NOT_CONFIRMED).toBe('AUTH_EMAIL_NOT_CONFIRMED')
    expect(ErrorCode.AUTH_SESSION_EXPIRED).toBe('AUTH_SESSION_EXPIRED')
    expect(ErrorCode.AUTH_UNAUTHORIZED).toBe('AUTH_UNAUTHORIZED')
  })

  it('exposes all database error codes as strings', () => {
    expect(ErrorCode.DB_NOT_FOUND).toBe('DB_NOT_FOUND')
    expect(ErrorCode.DB_UNIQUE_VIOLATION).toBe('DB_UNIQUE_VIOLATION')
    expect(ErrorCode.DB_FOREIGN_KEY_VIOLATION).toBe('DB_FOREIGN_KEY_VIOLATION')
    expect(ErrorCode.DB_CHECK_VIOLATION).toBe('DB_CHECK_VIOLATION')
    expect(ErrorCode.DB_PERMISSION_DENIED).toBe('DB_PERMISSION_DENIED')
    expect(ErrorCode.DB_CONNECTION_ERROR).toBe('DB_CONNECTION_ERROR')
  })

  it('exposes all API error codes as strings', () => {
    expect(ErrorCode.API_RATE_LIMITED).toBe('API_RATE_LIMITED')
    expect(ErrorCode.API_TIMEOUT).toBe('API_TIMEOUT')
    expect(ErrorCode.API_NETWORK_ERROR).toBe('API_NETWORK_ERROR')
    expect(ErrorCode.API_VALIDATION_ERROR).toBe('API_VALIDATION_ERROR')
  })

  it('exposes general error codes as strings', () => {
    expect(ErrorCode.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR')
    expect(ErrorCode.NOT_CONFIGURED).toBe('NOT_CONFIGURED')
  })

  it('every value is a non-empty string', () => {
    for (const value of Object.values(ErrorCode)) {
      expect(typeof value).toBe('string')
      expect(value.length).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// AppError
// ---------------------------------------------------------------------------

describe('AppError', () => {
  it('extends Error', () => {
    const err = new AppError(ErrorCode.UNKNOWN_ERROR, 'oops')
    expect(err).toBeInstanceOf(Error)
  })

  it('sets name to AppError', () => {
    const err = new AppError(ErrorCode.UNKNOWN_ERROR, 'oops')
    expect(err.name).toBe('AppError')
  })

  it('sets code from constructor argument', () => {
    const err = new AppError(ErrorCode.DB_NOT_FOUND, 'missing')
    expect(err.code).toBe(ErrorCode.DB_NOT_FOUND)
  })

  it('sets message from constructor argument', () => {
    const err = new AppError(ErrorCode.UNKNOWN_ERROR, 'something went wrong')
    expect(err.message).toBe('something went wrong')
  })

  it('defaults retryable to false when not provided', () => {
    const err = new AppError(ErrorCode.AUTH_UNAUTHORIZED, 'no access')
    expect(err.retryable).toBe(false)
  })

  it('accepts retryable option', () => {
    const err = new AppError(ErrorCode.API_NETWORK_ERROR, 'net fail', { retryable: true })
    expect(err.retryable).toBe(true)
  })

  it('sets originalError when provided', () => {
    const cause = new Error('root cause')
    const err = new AppError(ErrorCode.UNKNOWN_ERROR, 'wrapped', { originalError: cause })
    expect(err.originalError).toBe(cause)
  })

  it('defaults originalError to undefined when not provided', () => {
    const err = new AppError(ErrorCode.UNKNOWN_ERROR, 'no cause')
    expect(err.originalError).toBeUndefined()
  })

  it('uses provided userMessage over auto-derived one', () => {
    const err = new AppError(ErrorCode.UNKNOWN_ERROR, 'internal', {
      userMessage: 'Custom user message',
    })
    expect(err.userMessage).toBe('Custom user message')
  })

  it('derives a user-friendly userMessage from the code when not provided', () => {
    const err = new AppError(ErrorCode.AUTH_SESSION_EXPIRED, 'jwt expired')
    expect(err.userMessage).toBe('Your session has expired. Please sign in again.')
  })
})

// ---------------------------------------------------------------------------
// parsePostgrestError
// ---------------------------------------------------------------------------

describe('parsePostgrestError', () => {
  it('maps 23505 (unique violation) to DB_UNIQUE_VIOLATION', () => {
    const pgErr = makePostgrestError('23505', 'duplicate key value')
    const err = parsePostgrestError(pgErr)
    expect(err).toBeInstanceOf(AppError)
    expect(err.code).toBe(ErrorCode.DB_UNIQUE_VIOLATION)
    expect(err.userMessage).toBe('This item already exists')
    expect(err.originalError).toBe(pgErr)
  })

  it('maps 23503 (FK violation) to DB_FOREIGN_KEY_VIOLATION', () => {
    const pgErr = makePostgrestError('23503', 'foreign key violation')
    const err = parsePostgrestError(pgErr)
    expect(err.code).toBe(ErrorCode.DB_FOREIGN_KEY_VIOLATION)
    expect(err.userMessage).toBe('Referenced item does not exist')
  })

  it('maps PGRST116 (not found) to DB_NOT_FOUND', () => {
    const pgErr = makePostgrestError('PGRST116', 'no rows returned')
    const err = parsePostgrestError(pgErr)
    expect(err.code).toBe(ErrorCode.DB_NOT_FOUND)
    expect(err.userMessage).toBe('The requested item was not found')
  })

  it('maps 23514 (check violation) to DB_CHECK_VIOLATION', () => {
    const pgErr = makePostgrestError('23514', 'check constraint failed')
    const err = parsePostgrestError(pgErr)
    expect(err.code).toBe(ErrorCode.DB_CHECK_VIOLATION)
    expect(err.userMessage).toBe('Invalid data provided')
  })

  it('maps 42501 (permission denied) to DB_PERMISSION_DENIED', () => {
    const pgErr = makePostgrestError('42501', 'permission denied')
    const err = parsePostgrestError(pgErr)
    expect(err.code).toBe(ErrorCode.DB_PERMISSION_DENIED)
    expect(err.userMessage).toMatch(/permission/i)
  })

  it('maps JWT expired message to AUTH_SESSION_EXPIRED', () => {
    const pgErr = makePostgrestError('XXXXX', 'JWT expired')
    const err = parsePostgrestError(pgErr)
    expect(err.code).toBe(ErrorCode.AUTH_SESSION_EXPIRED)
    expect(err.retryable).toBe(false)
  })

  it('maps invalid login credentials message to AUTH_INVALID_CREDENTIALS', () => {
    const pgErr = makePostgrestError('XXXXX', 'Invalid login credentials')
    const err = parsePostgrestError(pgErr)
    expect(err.code).toBe(ErrorCode.AUTH_INVALID_CREDENTIALS)
  })

  it('falls back to UNKNOWN_ERROR with retryable:true for unrecognized codes', () => {
    const pgErr = makePostgrestError('42P01', 'undefined table')
    const err = parsePostgrestError(pgErr)
    expect(err.code).toBe(ErrorCode.UNKNOWN_ERROR)
    expect(err.retryable).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// parseError
// ---------------------------------------------------------------------------

describe('parseError', () => {
  it('returns the same AppError instance unchanged', () => {
    const original = new AppError(ErrorCode.DB_NOT_FOUND, 'not found')
    const result = parseError(original)
    expect(result).toBe(original)
  })

  it('wraps a TypeError containing "fetch" as API_NETWORK_ERROR', () => {
    const typeErr = new TypeError('Failed to fetch')
    const result = parseError(typeErr)
    expect(result.code).toBe(ErrorCode.API_NETWORK_ERROR)
    expect(result.retryable).toBe(true)
    expect(result.originalError).toBe(typeErr)
  })

  it('wraps an AbortError as API_TIMEOUT', () => {
    // DOMException may not extend Error in jsdom, so construct a plain Error
    // with name 'AbortError' which is what the source code checks.
    const abortErr = Object.assign(new Error('The user aborted a request.'), {
      name: 'AbortError',
    })
    const result = parseError(abortErr)
    expect(result.code).toBe(ErrorCode.API_TIMEOUT)
    expect(result.retryable).toBe(true)
  })

  it('wraps an Error with "timeout" in message as API_TIMEOUT', () => {
    const timeoutErr = new Error('Request timeout after 5000ms')
    const result = parseError(timeoutErr)
    expect(result.code).toBe(ErrorCode.API_TIMEOUT)
    expect(result.retryable).toBe(true)
  })

  it('wraps a plain Error as UNKNOWN_ERROR with retryable:true', () => {
    const plain = new Error('something broke')
    const result = parseError(plain)
    expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR)
    expect(result.retryable).toBe(true)
    expect(result.message).toBe('something broke')
  })

  it('converts a string to UNKNOWN_ERROR', () => {
    const result = parseError('a string error')
    expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR)
    expect(result.message).toBe('a string error')
  })

  it('converts an unknown object to UNKNOWN_ERROR', () => {
    const result = parseError({ weird: true })
    expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR)
  })

  it('converts null to UNKNOWN_ERROR', () => {
    const result = parseError(null)
    expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR)
  })
})

// ---------------------------------------------------------------------------
// isRetryable
// ---------------------------------------------------------------------------

describe('isRetryable', () => {
  it('returns true for API_TIMEOUT code', () => {
    const err = new AppError(ErrorCode.API_TIMEOUT, 'timeout')
    expect(isRetryable(err)).toBe(true)
  })

  it('returns true for API_NETWORK_ERROR code', () => {
    const err = new AppError(ErrorCode.API_NETWORK_ERROR, 'net error')
    expect(isRetryable(err)).toBe(true)
  })

  it('returns true for DB_CONNECTION_ERROR code', () => {
    const err = new AppError(ErrorCode.DB_CONNECTION_ERROR, 'conn error')
    expect(isRetryable(err)).toBe(true)
  })

  it('returns true when retryable flag is set regardless of code', () => {
    const err = new AppError(ErrorCode.UNKNOWN_ERROR, 'misc', { retryable: true })
    expect(isRetryable(err)).toBe(true)
  })

  it('returns false for AUTH_UNAUTHORIZED with retryable:false', () => {
    const err = new AppError(ErrorCode.AUTH_UNAUTHORIZED, 'forbidden')
    expect(isRetryable(err)).toBe(false)
  })

  it('returns false for API_VALIDATION_ERROR', () => {
    const err = new AppError(ErrorCode.API_VALIDATION_ERROR, 'bad input')
    expect(isRetryable(err)).toBe(false)
  })

  it('returns false for AUTH_SESSION_EXPIRED', () => {
    const err = new AppError(ErrorCode.AUTH_SESSION_EXPIRED, 'expired', { retryable: false })
    expect(isRetryable(err)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// withRetry
// ---------------------------------------------------------------------------

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('returns the result immediately when fn succeeds on the first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn, { maxRetries: 3 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on retryable errors and returns result on later success', async () => {
    const retryableErr = new AppError(ErrorCode.API_NETWORK_ERROR, 'net fail', { retryable: true })
    let calls = 0
    const fn = vi.fn().mockImplementation(() => {
      calls++
      if (calls < 3) return Promise.reject(retryableErr)
      return Promise.resolve('recovered')
    })

    const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 10, maxDelayMs: 100 })
    // Advance through all timers until promise resolves
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('throws after exhausting all retries', async () => {
    const retryableErr = new AppError(ErrorCode.API_NETWORK_ERROR, 'net fail', { retryable: true })
    const fn = vi.fn().mockRejectedValue(retryableErr)

    // Attach the rejection handler before advancing timers to avoid leaks.
    const expectation = expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 10, maxDelayMs: 100 })
    ).rejects.toBeInstanceOf(AppError)
    await vi.runAllTimersAsync()
    await expectation
    // 1 initial + 2 retries = 3 total calls
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('does not retry non-retryable errors', async () => {
    const nonRetryable = new AppError(ErrorCode.AUTH_UNAUTHORIZED, 'no access', {
      retryable: false,
    })
    const fn = vi.fn().mockRejectedValue(nonRetryable)

    await expect(
      withRetry(fn, { maxRetries: 3, baseDelayMs: 10, maxDelayMs: 100 })
    ).rejects.toBeInstanceOf(AppError)
    // Should only be called once — no retries
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('respects a custom shouldRetry predicate', async () => {
    const err = new AppError(ErrorCode.API_RATE_LIMITED, 'rate limited', { retryable: false })
    const fn = vi.fn().mockRejectedValue(err)
    const shouldRetry = vi.fn().mockReturnValue(false)

    await expect(
      withRetry(fn, { maxRetries: 3, baseDelayMs: 10, maxDelayMs: 100, shouldRetry })
    ).rejects.toBeInstanceOf(AppError)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(shouldRetry).toHaveBeenCalledWith(expect.any(AppError))
  })
})

// ---------------------------------------------------------------------------
// logError
// ---------------------------------------------------------------------------

describe('logError', () => {
  it('calls console.error with [AppError] prefix and error details', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new AppError(ErrorCode.UNKNOWN_ERROR, 'oops')
    logError(err)

    expect(spy).toHaveBeenCalledTimes(1)
    const [prefix, payload] = spy.mock.calls[0]
    expect(prefix).toBe('[AppError]')
    expect(payload).toMatchObject({
      code: ErrorCode.UNKNOWN_ERROR,
      message: 'oops',
    })
    spy.mockRestore()
  })

  it('spreads additional context into the log payload', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new AppError(ErrorCode.DB_NOT_FOUND, 'missing')
    logError(err, { userId: 'abc', action: 'fetch' })

    const [, payload] = spy.mock.calls[0]
    expect(payload).toMatchObject({ userId: 'abc', action: 'fetch' })
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// errorToToast
// ---------------------------------------------------------------------------

describe('errorToToast', () => {
  it('returns type "error"', () => {
    const err = new AppError(ErrorCode.UNKNOWN_ERROR, 'bad')
    const toast = errorToToast(err)
    expect(toast.type).toBe('error')
  })

  it('sets description to the error userMessage', () => {
    const err = new AppError(ErrorCode.DB_NOT_FOUND, 'not found')
    const toast = errorToToast(err)
    expect(toast.description).toBe(err.userMessage)
  })

  it('sets duration to 5000 for retryable errors', () => {
    const err = new AppError(ErrorCode.API_NETWORK_ERROR, 'net', { retryable: true })
    const toast = errorToToast(err)
    expect(toast.duration).toBe(5000)
  })

  it('sets duration to 7000 for non-retryable errors', () => {
    const err = new AppError(ErrorCode.AUTH_UNAUTHORIZED, 'no access', { retryable: false })
    const toast = errorToToast(err)
    expect(toast.duration).toBe(7000)
  })

  it('has a title field', () => {
    const err = new AppError(ErrorCode.UNKNOWN_ERROR, 'bad')
    const toast = errorToToast(err)
    expect(toast.title).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// handleApiResponse
// ---------------------------------------------------------------------------

describe('handleApiResponse', () => {
  it('returns data and null error for a 200 OK JSON response', async () => {
    const res = makeResponse(200, { id: 1, name: 'test' })
    const result = await handleApiResponse<{ id: number; name: string }>(res)
    expect(result.error).toBeNull()
    expect(result.data).toEqual({ id: 1, name: 'test' })
  })

  it('returns UNKNOWN_ERROR when 200 response body is not valid JSON', async () => {
    const res = makeMalformedResponse(200)
    const result = await handleApiResponse(res)
    expect(result.data).toBeNull()
    expect(result.error).toBeInstanceOf(AppError)
    expect(result.error!.code).toBe(ErrorCode.UNKNOWN_ERROR)
  })

  it('returns API_RATE_LIMITED for 429 status', async () => {
    const res = makeResponse(429, {})
    const result = await handleApiResponse(res)
    expect(result.data).toBeNull()
    expect(result.error!.code).toBe(ErrorCode.API_RATE_LIMITED)
    expect(result.error!.retryable).toBe(true)
  })

  it('includes Retry-After seconds in userMessage when header is present', async () => {
    const res = makeResponse(429, {}, { 'Retry-After': '30' })
    const result = await handleApiResponse(res)
    expect(result.error!.userMessage).toContain('30')
  })

  it('returns AUTH_UNAUTHORIZED for 401 status', async () => {
    const res = makeResponse(401, {})
    const result = await handleApiResponse(res)
    expect(result.error!.code).toBe(ErrorCode.AUTH_UNAUTHORIZED)
  })

  it('returns DB_PERMISSION_DENIED for 403 status', async () => {
    const res = makeResponse(403, {})
    const result = await handleApiResponse(res)
    expect(result.error!.code).toBe(ErrorCode.DB_PERMISSION_DENIED)
  })

  it('returns DB_NOT_FOUND for 404 status', async () => {
    const res = makeResponse(404, {})
    const result = await handleApiResponse(res)
    expect(result.error!.code).toBe(ErrorCode.DB_NOT_FOUND)
  })

  it('extracts error message from JSON body for other error statuses', async () => {
    const res = makeResponse(500, { error: 'Internal server error' })
    const result = await handleApiResponse(res)
    expect(result.error!.code).toBe(ErrorCode.UNKNOWN_ERROR)
    expect(result.error!.message).toBe('Internal server error')
  })

  it('falls back to "HTTP <status>" when error body is not valid JSON', async () => {
    const res = makeMalformedResponse(500)
    const result = await handleApiResponse(res)
    expect(result.error!.code).toBe(ErrorCode.UNKNOWN_ERROR)
    expect(result.error!.message).toBe('HTTP 500')
  })
})
