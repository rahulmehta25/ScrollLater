import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Comprehensive security headers implementation
 * Based on OWASP security headers best practices
 */
export class SecurityHeaders {
  private static instance: SecurityHeaders
  
  private readonly cspDirectives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for Next.js, should be replaced with nonce
      'https://cdn.jsdelivr.net',
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com'
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for styled-components/emotion
      'https://fonts.googleapis.com'
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https://*.supabase.co',
      'https://images.unsplash.com',
      'https://via.placeholder.com'
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com'
    ],
    'connect-src': [
      "'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://api.openrouter.ai',
      'https://www.google-analytics.com'
    ],
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'child-src': ["'self'"],
    'frame-src': ["'self'", 'https://www.google.com'], // For Google OAuth
    'worker-src': ["'self'", 'blob:'],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'manifest-src': ["'self'"],
    'upgrade-insecure-requests': []
  }

  private readonly permissionsPolicy = {
    'accelerometer': '()',
    'ambient-light-sensor': '()',
    'autoplay': '()',
    'battery': '()',
    'camera': '()',
    'display-capture': '()',
    'document-domain': '()',
    'encrypted-media': '()',
    'execution-while-not-rendered': '()',
    'execution-while-out-of-viewport': '()',
    'fullscreen': '(self)',
    'geolocation': '()',
    'gyroscope': '()',
    'layout-animations': '(self)',
    'legacy-image-formats': '()',
    'magnetometer': '()',
    'microphone': '()',
    'midi': '()',
    'navigation-override': '()',
    'oversized-images': '(self)',
    'payment': '()',
    'picture-in-picture': '()',
    'publickey-credentials-get': '()',
    'sync-xhr': '()',
    'usb': '()',
    'wake-lock': '()',
    'xr-spatial-tracking': '()'
  }

  private constructor() {}

  static getInstance(): SecurityHeaders {
    if (!SecurityHeaders.instance) {
      SecurityHeaders.instance = new SecurityHeaders()
    }
    return SecurityHeaders.instance
  }

  /**
   * Generate Content Security Policy header
   */
  private generateCSP(): string {
    const csp = Object.entries(this.cspDirectives)
      .map(([directive, sources]) => {
        if (sources.length === 0) {
          return directive
        }
        return `${directive} ${sources.join(' ')}`
      })
      .join('; ')
    
    return csp
  }

  /**
   * Generate Permissions Policy header
   */
  private generatePermissionsPolicy(): string {
    return Object.entries(this.permissionsPolicy)
      .map(([feature, allowlist]) => `${feature}=${allowlist}`)
      .join(', ')
  }

  /**
   * Apply all security headers to response
   */
  applySecurityHeaders(response: NextResponse): NextResponse {
    // Content Security Policy
    response.headers.set(
      'Content-Security-Policy',
      this.generateCSP()
    )

    // Report CSP violations (optional, requires endpoint setup)
    response.headers.set(
      'Content-Security-Policy-Report-Only',
      `${this.generateCSP()}; report-uri /api/csp-report`
    )

    // Strict Transport Security
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )

    // X-Frame-Options (deprecated but still useful)
    response.headers.set('X-Frame-Options', 'DENY')

    // X-Content-Type-Options
    response.headers.set('X-Content-Type-Options', 'nosniff')

    // X-XSS-Protection (deprecated but still useful for older browsers)
    response.headers.set('X-XSS-Protection', '1; mode=block')

    // Referrer Policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

    // Permissions Policy
    response.headers.set(
      'Permissions-Policy',
      this.generatePermissionsPolicy()
    )

    // X-Permitted-Cross-Domain-Policies
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')

    // Cross-Origin-Embedder-Policy
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')

    // Cross-Origin-Opener-Policy
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')

    // Cross-Origin-Resource-Policy
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')

    // Clear-Site-Data (for logout)
    if (response.headers.get('x-logout') === 'true') {
      response.headers.set('Clear-Site-Data', '"cache", "cookies", "storage"')
    }

    // Remove server information headers
    response.headers.delete('X-Powered-By')
    response.headers.delete('Server')

    return response
  }

  /**
   * Generate nonce for inline scripts (CSP)
   */
  generateNonce(): string {
    const crypto = require('crypto')
    return crypto.randomBytes(16).toString('base64')
  }

  /**
   * Apply CORS headers for API routes
   */
  applyCORSHeaders(
    request: NextRequest,
    response: NextResponse,
    options: {
      allowedOrigins?: string[]
      allowedMethods?: string[]
      allowedHeaders?: string[]
      credentials?: boolean
      maxAge?: number
    } = {}
  ): NextResponse {
    const {
      allowedOrigins = [
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'https://scrolllater.app',
        'https://www.scrolllater.app'
      ],
      allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders = ['Content-Type', 'Authorization', 'X-CSRF-Token'],
      credentials = true,
      maxAge = 86400 // 24 hours
    } = options

    const origin = request.headers.get('origin')

    // Check if origin is allowed
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    } else if (allowedOrigins.includes('*')) {
      response.headers.set('Access-Control-Allow-Origin', '*')
    }

    // Set other CORS headers
    response.headers.set('Access-Control-Allow-Methods', allowedMethods.join(', '))
    response.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '))
    response.headers.set('Access-Control-Max-Age', maxAge.toString())

    if (credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: response.headers })
    }

    return response
  }

  /**
   * Middleware to apply security headers
   */
  middleware(request: NextRequest): NextResponse {
    const response = NextResponse.next()
    
    // Apply security headers
    this.applySecurityHeaders(response)
    
    // Apply CORS for API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
      this.applyCORSHeaders(request, response)
    }
    
    return response
  }
}

// Export singleton instance
export const securityHeaders = SecurityHeaders.getInstance()

// Export middleware function for Next.js
export function securityMiddleware(request: NextRequest) {
  return securityHeaders.middleware(request)
}