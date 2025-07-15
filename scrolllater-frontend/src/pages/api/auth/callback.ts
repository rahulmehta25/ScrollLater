import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@supabase/ssr'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, next } = req.query

  if (code) {
    // Create Supabase client for API route
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            const cookies: { name: string; value: string }[] = []
            // Get cookies from request headers
            const cookieHeader = req.headers.cookie
            if (cookieHeader) {
              cookieHeader.split(';').forEach(cookie => {
                const [name, value] = cookie.trim().split('=')
                if (name && value) {
                  cookies.push({ name, value })
                }
              })
            }
            return cookies
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSet.forEach(({ name, value, options }) => {
              const cookieOptions: string[] = []
              if (options?.maxAge) cookieOptions.push(`Max-Age=${options.maxAge}`)
              if (options?.domain) cookieOptions.push(`Domain=${options.domain}`)
              if (options?.path) cookieOptions.push(`Path=${options.path}`)
              if (options?.secure) cookieOptions.push('Secure')
              if (options?.httpOnly) cookieOptions.push('HttpOnly')
              if (options?.sameSite) cookieOptions.push(`SameSite=${options.sameSite}`)
              
              const cookieString = `${name}=${value}; ${cookieOptions.join('; ')}`
              
              // Set cookie header
              const existing = res.getHeader('Set-Cookie') || []
              const existingArray = Array.isArray(existing) ? existing : [existing]
              res.setHeader('Set-Cookie', [...existingArray, cookieString].filter(Boolean) as string[])
            })
          },
        },
      }
    )
    
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code as string)
    
    if (error) {
      console.error('Auth callback error:', error)
      return res.redirect('/?error=auth_failed')
    }

    if (data.session) {
      console.log('✅ Auth callback successful for user:', data.session.user.email)
      // Redirect to the intended page or dashboard
      const redirectTo = next ? decodeURIComponent(next as string) : '/dashboard'
      return res.redirect(redirectTo)
    }
  }

  // If no code or session, redirect to home
  return res.redirect('/')
} 