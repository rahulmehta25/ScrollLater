// src/lib/supabase.ts
import { createClientComponentClient, createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Re-export the Database type
export type { Database }
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// Client-side Supabase client (for use in Client Components)
export const createSupabaseClient = () => {
  return createClientComponentClient<Database>()
}

// Server-side Supabase client (for use in API routes with proper cookie handling)
export const createServerSupabaseClient = (req: any, res: any) => {
  return createPagesServerClient<Database>({ req, res })
}

// Service role client (for use in server-side logic with elevated privileges)
export const createSupabaseServiceClient = () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}