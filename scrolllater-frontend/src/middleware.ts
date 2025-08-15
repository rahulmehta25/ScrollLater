import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { securityHeaders } from '@/lib/security/security-headers'

/**
 * Global middleware for security enforcement
 * Runs before every request in the application
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const pathname = request.nextUrl.pathname

  // Apply security headers to all responses
  securityHeaders.applySecurityHeaders(response)

  // API route specific security
  if (pathname.startsWith('/api/')) {
    // CORS handling for API routes
    const origin = request.headers.get('origin')
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'https://scrolllater.app',
      'https://www.scrolllater.app'
    ]

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token')
      response.headers.set('Access-Control-Max-Age', '86400')
      return new NextResponse(null, { status: 204, headers: response.headers })
    }

    // Block requests with suspicious patterns
    const url = request.url.toLowerCase()
    const suspiciousPatterns = [
      /\.\.\//,
      /%2e%2e%2f/,
      /javascript:/,
      /<script/,
      /on\w+=/,
      /eval\(/,
      /expression\(/,
      /vbscript:/,
      /file:\/\//
    ]

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url)) {
        console.warn('Blocked suspicious request:', {
          url: request.url,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          timestamp: new Date().toISOString()
        })
        
        return new NextResponse(
          JSON.stringify({ error: 'Invalid request' }),
          { 
            status: 400,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )
      }
    }

    // Add request ID for tracing
    const requestId = crypto.randomUUID()
    response.headers.set('X-Request-ID', requestId)

    // Log API requests (excluding sensitive data)
    if (process.env.NODE_ENV === 'production') {
      console.info('API Request:', {
        requestId,
        method: request.method,
        path: pathname,
        timestamp: new Date().toISOString()
      })
    }
  }

  // Authentication pages security
  if (pathname.startsWith('/auth/') || pathname === '/login' || pathname === '/signup') {
    // Prevent clickjacking on auth pages
    response.headers.set('X-Frame-Options', 'DENY')
    
    // Clear sensitive data on auth pages
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  }

  // Admin/Dashboard routes protection
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    // Additional security for sensitive pages
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
  }

  return response
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}