import { NextApiRequest, NextApiResponse } from 'next'
import { createApiSupabaseClient } from '@/lib/supabase-api'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, next } = req.query

  if (code) {
    // Create Supabase client for API route
    const supabase = createApiSupabaseClient()
    
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