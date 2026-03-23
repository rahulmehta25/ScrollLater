import { describe, it, expect, vi, beforeEach } from 'vitest'
// The shared mock file registers vi.mock('@/lib/supabase') globally.
// Importing mockSupabaseClient gives us a handle on the exact object that
// createSupabaseClient() returns so we can configure auth methods per-test.
import { mockSupabaseClient, mockSession, mockUser } from '../mocks/supabase'

import {
  signUpWithEmail,
  signInWithEmail,
  signInWithMagicLink,
  signInWithOAuth,
  resetPassword,
  updatePassword,
  signOut,
  getSession,
  getUser,
  validateEmail,
  validatePassword,
} from '@/lib/auth'

// Ensure window.location.origin is defined in jsdom
Object.defineProperty(window, 'location', {
  value: { origin: 'http://localhost:3000' },
  writable: true,
})

// ---------------------------------------------------------------------------
// Extend the shared auth mock with methods that are missing from the base mock.
// We add them once at module level; beforeEach resets their implementations.
// ---------------------------------------------------------------------------
const auth = mockSupabaseClient.auth as Record<string, ReturnType<typeof vi.fn>> & typeof mockSupabaseClient.auth

if (!auth.signInWithOtp) {
  auth.signInWithOtp = vi.fn()
}
if (!auth.resetPasswordForEmail) {
  auth.resetPasswordForEmail = vi.fn()
}
if (!auth.updateUser) {
  auth.updateUser = vi.fn()
}

describe('auth.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Re-establish happy-path defaults after each clearAllMocks
    auth.signUp.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    })
    auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    })
    auth.signInWithOtp.mockResolvedValue({ error: null })
    auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://oauth.example.com' },
      error: null,
    })
    auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    auth.updateUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    auth.signOut.mockResolvedValue({ error: null })
    auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })
    auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
  })

  // ---------------------------------------------------------------------------
  // signUpWithEmail
  // ---------------------------------------------------------------------------
  describe('signUpWithEmail', () => {
    it('returns user and session on successful sign-up', async () => {
      const result = await signUpWithEmail({
        email: 'test@example.com',
        password: 'Password1',
        displayName: 'Test User',
      })

      expect(result.success).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(result.session).toEqual(mockSession)
    })

    it('returns success without session when email confirmation is required', async () => {
      auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      })

      const result = await signUpWithEmail({
        email: 'test@example.com',
        password: 'Password1',
      })

      expect(result.success).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(result.session).toBeUndefined()
      expect(result.error).toMatch(/check your email/i)
    })

    it('returns error for duplicate email', async () => {
      auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered', status: 400 },
      })

      const result = await signUpWithEmail({
        email: 'existing@example.com',
        password: 'Password1',
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/already exists/i)
    })

    it('returns error for weak password rejected by server', async () => {
      auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Password should be at least 6 characters', status: 422 },
      })

      const result = await signUpWithEmail({
        email: 'test@example.com',
        password: '123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/at least 6 characters/i)
    })

    it('returns error when no user is returned without an error object', async () => {
      auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: null })

      const result = await signUpWithEmail({
        email: 'test@example.com',
        password: 'Password1',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create account')
    })

    it('returns generic error on unexpected exception', async () => {
      auth.signUp.mockRejectedValue(new Error('Network failure'))

      const result = await signUpWithEmail({
        email: 'test@example.com',
        password: 'Password1',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('An unexpected error occurred')
    })
  })

  // ---------------------------------------------------------------------------
  // signInWithEmail
  // ---------------------------------------------------------------------------
  describe('signInWithEmail', () => {
    it('returns user and session on successful sign-in', async () => {
      const result = await signInWithEmail({
        email: 'test@example.com',
        password: 'Password1',
      })

      expect(result.success).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(result.session).toEqual(mockSession)
    })

    it('returns error for wrong password', async () => {
      auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 },
      })

      const result = await signInWithEmail({
        email: 'test@example.com',
        password: 'WrongPassword',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid email or password')
    })

    it('returns error for unregistered email', async () => {
      auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 },
      })

      const result = await signInWithEmail({
        email: 'nobody@example.com',
        password: 'Password1',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid email or password')
    })

    it('returns error for unconfirmed email', async () => {
      auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email not confirmed', status: 400 },
      })

      const result = await signInWithEmail({
        email: 'unconfirmed@example.com',
        password: 'Password1',
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/confirm your email/i)
    })

    it('returns generic error on unexpected exception', async () => {
      auth.signInWithPassword.mockRejectedValue(new Error('Network failure'))

      const result = await signInWithEmail({
        email: 'test@example.com',
        password: 'Password1',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('An unexpected error occurred')
    })
  })

  // ---------------------------------------------------------------------------
  // signInWithMagicLink
  // ---------------------------------------------------------------------------
  describe('signInWithMagicLink', () => {
    it('returns success when OTP is sent', async () => {
      const result = await signInWithMagicLink('test@example.com')

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('returns error when Supabase rejects the request', async () => {
      auth.signInWithOtp.mockResolvedValue({
        error: { message: 'Email rate limit exceeded', status: 429 },
      })

      const result = await signInWithMagicLink('test@example.com')

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/too many requests/i)
    })

    it('returns generic error on unexpected exception', async () => {
      auth.signInWithOtp.mockRejectedValue(new Error('Connection error'))

      const result = await signInWithMagicLink('test@example.com')

      expect(result.success).toBe(false)
      expect(result.error).toBe('An unexpected error occurred')
    })
  })

  // ---------------------------------------------------------------------------
  // signInWithOAuth
  // ---------------------------------------------------------------------------
  describe('signInWithOAuth', () => {
    it('returns success for Google provider', async () => {
      const result = await signInWithOAuth('google')

      expect(result.success).toBe(true)
      expect(auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'google' })
      )
    })

    it('returns success for GitHub provider', async () => {
      const result = await signInWithOAuth('github')

      expect(result.success).toBe(true)
      expect(auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'github' })
      )
    })

    it('passes the correct callback redirect URL', async () => {
      await signInWithOAuth('google')

      expect(auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            redirectTo: expect.stringContaining('/api/auth/callback'),
          }),
        })
      )
    })

    it('returns error when OAuth flow fails', async () => {
      auth.signInWithOAuth.mockResolvedValue({
        data: null,
        error: { message: 'OAuth provider unavailable', status: 503 },
      })

      const result = await signInWithOAuth('google')

      expect(result.success).toBe(false)
      expect(result.error).toBe('OAuth provider unavailable')
    })
  })

  // ---------------------------------------------------------------------------
  // resetPassword
  // ---------------------------------------------------------------------------
  describe('resetPassword', () => {
    it('returns success when reset email is sent', async () => {
      const result = await resetPassword('test@example.com')

      expect(result.success).toBe(true)
    })

    it('returns error for rate-limited request', async () => {
      auth.resetPasswordForEmail.mockResolvedValue({
        error: {
          message: 'For security purposes, you can only request this once every 60 seconds',
          status: 429,
        },
      })

      const result = await resetPassword('test@example.com')

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/wait before requesting/i)
    })

    it('returns generic error on unexpected exception', async () => {
      auth.resetPasswordForEmail.mockRejectedValue(new Error('Timeout'))

      const result = await resetPassword('test@example.com')

      expect(result.success).toBe(false)
      expect(result.error).toBe('An unexpected error occurred')
    })
  })

  // ---------------------------------------------------------------------------
  // updatePassword
  // ---------------------------------------------------------------------------
  describe('updatePassword', () => {
    it('returns success and updated user when password is changed', async () => {
      const result = await updatePassword('NewPassword1')

      expect(result.success).toBe(true)
      expect(result.user).toEqual(mockUser)
    })

    it('returns error when update fails', async () => {
      auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Password should be at least 6 characters', status: 422 },
      })

      const result = await updatePassword('abc')

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/at least 6 characters/i)
    })

    it('returns generic error on unexpected exception', async () => {
      auth.updateUser.mockRejectedValue(new Error('Connection refused'))

      const result = await updatePassword('NewPassword1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('An unexpected error occurred')
    })
  })

  // ---------------------------------------------------------------------------
  // signOut
  // ---------------------------------------------------------------------------
  describe('signOut', () => {
    it('returns success on sign out', async () => {
      const result = await signOut()

      expect(result.success).toBe(true)
    })

    it('returns error when sign out fails', async () => {
      auth.signOut.mockResolvedValue({
        error: { message: 'Session not found', status: 401 },
      })

      const result = await signOut()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Session not found')
    })

    it('returns generic error on unexpected exception', async () => {
      auth.signOut.mockRejectedValue(new Error('Network error'))

      const result = await signOut()

      expect(result.success).toBe(false)
      expect(result.error).toBe('An unexpected error occurred')
    })
  })

  // ---------------------------------------------------------------------------
  // getSession
  // ---------------------------------------------------------------------------
  describe('getSession', () => {
    it('returns active session', async () => {
      const result = await getSession()

      expect(result.session).toEqual(mockSession)
      expect(result.error).toBeUndefined()
    })

    it('returns null when there is no active session', async () => {
      auth.getSession.mockResolvedValue({ data: { session: null }, error: null })

      const result = await getSession()

      expect(result.session).toBeNull()
      expect(result.error).toBeUndefined()
    })

    it('returns null and error message when Supabase reports an error', async () => {
      auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid token', status: 401 },
      })

      const result = await getSession()

      expect(result.session).toBeNull()
      expect(result.error).toBe('Invalid token')
    })

    it('returns null and generic error on unexpected exception', async () => {
      auth.getSession.mockRejectedValue(new Error('Timeout'))

      const result = await getSession()

      expect(result.session).toBeNull()
      expect(result.error).toBe('An unexpected error occurred')
    })
  })

  // ---------------------------------------------------------------------------
  // getUser
  // ---------------------------------------------------------------------------
  describe('getUser', () => {
    it('returns authenticated user', async () => {
      const result = await getUser()

      expect(result.user).toEqual(mockUser)
      expect(result.error).toBeUndefined()
    })

    it('returns null when no user is authenticated', async () => {
      auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

      const result = await getUser()

      expect(result.user).toBeNull()
      expect(result.error).toBeUndefined()
    })

    it('returns null and error message when Supabase reports an error', async () => {
      auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token', status: 401 },
      })

      const result = await getUser()

      expect(result.user).toBeNull()
      expect(result.error).toBe('Invalid token')
    })

    it('returns null and generic error on unexpected exception', async () => {
      auth.getUser.mockRejectedValue(new Error('Timeout'))

      const result = await getUser()

      expect(result.user).toBeNull()
      expect(result.error).toBe('An unexpected error occurred')
    })
  })

  // ---------------------------------------------------------------------------
  // validateEmail
  // ---------------------------------------------------------------------------
  describe('validateEmail', () => {
    it('accepts a standard email address', () => {
      expect(validateEmail('user@example.com')).toBe(true)
    })

    it('accepts email with subdomain', () => {
      expect(validateEmail('user@mail.example.com')).toBe(true)
    })

    it('accepts email with plus addressing', () => {
      expect(validateEmail('user+tag@example.com')).toBe(true)
    })

    it('accepts email with numeric local part', () => {
      expect(validateEmail('1234@example.com')).toBe(true)
    })

    it('rejects email without @ symbol', () => {
      expect(validateEmail('userexample.com')).toBe(false)
    })

    it('rejects email without domain', () => {
      expect(validateEmail('user@')).toBe(false)
    })

    it('rejects email without TLD', () => {
      expect(validateEmail('user@example')).toBe(false)
    })

    it('rejects email with spaces', () => {
      expect(validateEmail('user @example.com')).toBe(false)
    })

    it('rejects empty string', () => {
      expect(validateEmail('')).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // validatePassword
  // ---------------------------------------------------------------------------
  describe('validatePassword', () => {
    it('marks a strong password as valid', () => {
      const result = validatePassword('Secure123')
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('rejects password shorter than 8 characters', () => {
      const result = validatePassword('Ab1')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters')
    })

    it('rejects password without uppercase letter', () => {
      const result = validatePassword('password1')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
    })

    it('rejects password without lowercase letter', () => {
      const result = validatePassword('PASSWORD1')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one lowercase letter')
    })

    it('rejects password without a number', () => {
      const result = validatePassword('PasswordAbc')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('accumulates multiple errors for a very weak password', () => {
      const result = validatePassword('abc')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
    })

    it('rejects empty string with all four errors', () => {
      const result = validatePassword('')
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(4)
    })
  })
})
