import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export function createSupabaseServer() {
  const cookieStore = cookies()

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        getSession: async () => {
          const token = cookieStore.get('supabase-auth-token')
          return token ? { data: { session: { access_token: token.value } } } : null
        },
      },
    }
  )
}

export function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}