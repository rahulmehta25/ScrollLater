import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRequestClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error_code = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')
  const redirectTo = requestUrl.searchParams.get('redirect_to')?.toString()
  
  // Use the correct origin based on environment
  const origin = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin

  // Log the Google OAuth callback request for debugging
  console.log('Google OAuth callback received:', {
    hasCode: !!code,
    error_code,
    error_description,
    origin,
    url: request.url,
    provider: 'google'
  })

  // Handle OAuth errors from Google
  if (error_code) {
    console.error('Google OAuth error:', { error_code, error_description })
    const message = error_description || `Google OAuth error: ${error_code}`
    return NextResponse.redirect(`${origin}/login?error=oauth_error&message=${encodeURIComponent(message)}`)
  }

  if (code) {
    const { supabase, response } = createSupabaseRequestClient(request)
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Supabase Google OAuth exchange error:', error)
        return NextResponse.redirect(`${origin}/login?error=auth_failed&message=${encodeURIComponent(error.message)}`)
      }

      console.log('Google OAuth exchange successful:', { 
        userId: data.user?.id, 
        email: data.user?.email,
        provider: 'google'
      })

      // Successful Google authentication - redirect to dashboard or specified redirect URL
      const finalRedirectTo = redirectTo || '/dashboard'
      return NextResponse.redirect(`${origin}${finalRedirectTo}`, {
        headers: response.headers,
      })
    } catch (err) {
      console.error('Google OAuth callback exception:', err)
      const message = err instanceof Error ? err.message : 'Google authentication failed'
      return NextResponse.redirect(`${origin}/login?error=auth_failed&message=${encodeURIComponent(message)}`)
    }
  }

  // No code provided - redirect to login with error
  console.warn('Google OAuth callback without code or error')
  return NextResponse.redirect(`${origin}/login?error=auth_failed&message=No Google authorization code provided`)
}