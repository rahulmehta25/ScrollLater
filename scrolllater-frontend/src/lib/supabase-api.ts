import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Create Supabase client for API routes
export const createApiSupabaseClient = () => {
  // For API routes, we can use the service role key or anon key
  // Since we're server-side, we can safely use these
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Create Supabase client with service role for admin operations
export const createServiceSupabaseClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}