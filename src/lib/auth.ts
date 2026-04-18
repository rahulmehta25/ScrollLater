import { createSupabaseClient } from './supabase'
import { AuthError, User, Session } from '@supabase/supabase-js'

export type AuthResult = {
  success: boolean
  error?: string
  user?: User
  session?: Session
}

export type SignUpData = {
  email: string
  password: string
  displayName?: string
}

export type SignInData = {
  email: string
  password: string
}

// Sign up with email and password
export async function signUpWithEmail({ email, password, displayName }: SignUpData): Promise<AuthResult> {
  const supabase = createSupabaseClient()

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          full_name: displayName,
        },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      return { success: false, error: getAuthErrorMessage(error) }
    }

    if (!data.user) {
      return { success: false, error: 'Failed to create account' }
    }

    // Check if email confirmation is required
    if (!data.session) {
      return {
        success: true,
        user: data.user,
        error: 'Please check your email to confirm your account'
      }
    }

    return { success: true, user: data.user, session: data.session }
  } catch (err) {
    console.error('Sign up error:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Sign in with email and password
export async function signInWithEmail({ email, password }: SignInData): Promise<AuthResult> {
  const supabase = createSupabaseClient()

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { success: false, error: getAuthErrorMessage(error) }
    }

    return { success: true, user: data.user, session: data.session }
  } catch (err) {
    console.error('Sign in error:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Sign in with magic link
export async function signInWithMagicLink(email: string): Promise<AuthResult> {
  const supabase = createSupabaseClient()

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      return { success: false, error: getAuthErrorMessage(error) }
    }

    return { success: true }
  } catch (err) {
    console.error('Magic link error:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Sign in with OAuth provider
export async function signInWithOAuth(provider: 'google' | 'github'): Promise<AuthResult> {
  const supabase = createSupabaseClient()

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      return { success: false, error: getAuthErrorMessage(error) }
    }

    return { success: true }
  } catch (err) {
    console.error('OAuth error:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Reset password
export async function resetPassword(email: string): Promise<AuthResult> {
  const supabase = createSupabaseClient()

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      return { success: false, error: getAuthErrorMessage(error) }
    }

    return { success: true }
  } catch (err) {
    console.error('Reset password error:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Update password
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  const supabase = createSupabaseClient()

  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      return { success: false, error: getAuthErrorMessage(error) }
    }

    return { success: true, user: data.user }
  } catch (err) {
    console.error('Update password error:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Sign out
export async function signOut(): Promise<AuthResult> {
  const supabase = createSupabaseClient()

  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return { success: false, error: getAuthErrorMessage(error) }
    }

    return { success: true }
  } catch (err) {
    console.error('Sign out error:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Get current session
export async function getSession(): Promise<{ session: Session | null; error?: string }> {
  const supabase = createSupabaseClient()

  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      return { session: null, error: getAuthErrorMessage(error) }
    }

    return { session }
  } catch (err) {
    console.error('Get session error:', err)
    return { session: null, error: 'An unexpected error occurred' }
  }
}

// Get current user
export async function getUser(): Promise<{ user: User | null; error?: string }> {
  const supabase = createSupabaseClient()

  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      return { user: null, error: getAuthErrorMessage(error) }
    }

    return { user }
  } catch (err) {
    console.error('Get user error:', err)
    return { user: null, error: 'An unexpected error occurred' }
  }
}

// Password validation
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  return { valid: errors.length === 0, errors }
}

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Convert Supabase auth errors to user-friendly messages
function getAuthErrorMessage(error: AuthError): string {
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Invalid email or password'
    case 'Email not confirmed':
      return 'Please confirm your email address before signing in'
    case 'User already registered':
      return 'An account with this email already exists'
    case 'Password should be at least 6 characters':
      return 'Password must be at least 6 characters'
    case 'Signup is disabled':
      return 'Sign up is currently disabled'
    case 'Email rate limit exceeded':
      return 'Too many requests. Please try again later'
    case 'For security purposes, you can only request this once every 60 seconds':
      return 'Please wait before requesting another email'
    default:
      return error.message || 'An authentication error occurred'
  }
}
