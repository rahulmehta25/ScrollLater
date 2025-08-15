import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import crypto from 'crypto'

// Security constants
const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const SESSION_COOKIE_NAME = 'sb-session'
const MAX_REQUEST_AGE_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Enhanced authentication middleware with security features
 * Implements OWASP authentication best practices
 */
export class AuthMiddleware {
  private static instance: AuthMiddleware
  private readonly trustedOrigins: Set<string>

  private constructor() {
    // Configure trusted origins
    this.trustedOrigins = new Set([
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'https://scrolllater.app',
      'https://www.scrolllater.app'
    ])
  }

  static getInstance(): AuthMiddleware {
    if (!AuthMiddleware.instance) {
      AuthMiddleware.instance = new AuthMiddleware()
    }
    return AuthMiddleware.instance
  }

  /**
   * Create a secure Supabase server client with proper cookie handling
   */
  async createSecureSupabaseClient(request: NextRequest) {
    const cookieStore = cookies()
    
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ 
                name, 
                value, 
                ...options,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax'
              })
            } catch (error) {
              // Handle cookie errors in middleware
              console.error('Cookie set error:', error)
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ 
                name, 
                value: '', 
                ...options,
                maxAge: 0 
              })
            } catch (error) {
              console.error('Cookie remove error:', error)
            }
          }
        }
      }
    )
  }

  /**
   * Validate authentication and return user session
   */
  async validateAuth(request: NextRequest) {
    try {
      const supabase = await this.createSecureSupabaseClient(request)
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        return { 
          isAuthenticated: false, 
          session: null,
          error: error?.message || 'No valid session found'
        }
      }

      // Validate session expiry
      const expiresAt = new Date(session.expires_at! * 1000)
      if (expiresAt <= new Date()) {
        return { 
          isAuthenticated: false, 
          session: null,
          error: 'Session expired'
        }
      }

      // Additional JWT validation
      if (!this.validateJWT(session.access_token)) {
        return { 
          isAuthenticated: false, 
          session: null,
          error: 'Invalid access token'
        }
      }

      return { 
        isAuthenticated: true, 
        session,
        error: null
      }
    } catch (error) {
      console.error('Auth validation error:', error)
      return { 
        isAuthenticated: false, 
        session: null,
        error: 'Authentication validation failed'
      }
    }
  }

  /**
   * Validate JWT structure and claims
   */
  private validateJWT(token: string): boolean {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) return false

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString()
      )

      // Check required claims
      if (!payload.sub || !payload.exp || !payload.iat) {
        return false
      }

      // Check token expiration
      const now = Math.floor(Date.now() / 1000)
      if (payload.exp <= now) {
        return false
      }

      // Check token age (prevent replay attacks)
      if (payload.iat < now - MAX_REQUEST_AGE_MS / 1000) {
        return false
      }

      return true
    } catch {
      return false
    }
  }

  /**
   * Generate CSRF token for state-changing operations
   */
  generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Validate CSRF token from request
   */
  validateCSRFToken(request: NextRequest): boolean {
    const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
    const headerToken = request.headers.get(CSRF_HEADER_NAME)

    if (!cookieToken || !headerToken) {
      return false
    }

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken)
    )
  }

  /**
   * Validate request origin
   */
  validateOrigin(request: NextRequest): boolean {
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')

    // For same-origin requests
    if (!origin && !referer) {
      return true
    }

    // Check against trusted origins
    if (origin && this.trustedOrigins.has(origin)) {
      return true
    }

    // Check referer as fallback
    if (referer) {
      try {
        const refererUrl = new URL(referer)
        return this.trustedOrigins.has(refererUrl.origin)
      } catch {
        return false
      }
    }

    return false
  }

  /**
   * Main middleware function for API routes
   */
  async middleware(
    request: NextRequest,
    options: {
      requireAuth?: boolean
      requireCSRF?: boolean
      validateOrigin?: boolean
      rateLimit?: boolean
    } = {}
  ) {
    const {
      requireAuth = true,
      requireCSRF = true,
      validateOrigin = true,
      rateLimit = true
    } = options

    // Validate origin for cross-origin requests
    if (validateOrigin && !this.validateOrigin(request)) {
      return NextResponse.json(
        { error: 'Invalid request origin' },
        { status: 403 }
      )
    }

    // Validate CSRF for state-changing operations
    if (requireCSRF && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      if (!this.validateCSRFToken(request)) {
        return NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        )
      }
    }

    // Validate authentication
    if (requireAuth) {
      const { isAuthenticated, session, error } = await this.validateAuth(request)
      
      if (!isAuthenticated) {
        return NextResponse.json(
          { error: error || 'Authentication required' },
          { status: 401 }
        )
      }

      // Add user context to request for downstream use
      const requestWithAuth = request as any
      requestWithAuth.user = session?.user
      requestWithAuth.session = session
    }

    return null // Continue to API route
  }

  /**
   * Create secure response with security headers
   */
  createSecureResponse(data: any, status = 200): NextResponse {
    const response = NextResponse.json(data, { status })

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    // Add CSRF token for authenticated responses
    if (status === 200) {
      const csrfToken = this.generateCSRFToken()
      response.cookies.set({
        name: CSRF_COOKIE_NAME,
        value: csrfToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 // 24 hours
      })
    }

    return response
  }
}

// Export singleton instance
export const authMiddleware = AuthMiddleware.getInstance()