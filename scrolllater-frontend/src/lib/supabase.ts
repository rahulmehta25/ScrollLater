// src/lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Re-export the Database type
export type { Database }
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// Client-side Supabase client (for use in Client Components)
export const createSupabaseClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Server-side Supabase client for App Router (for use in Server Components)
export const createServerSupabaseClient = async () => {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: { maxAge?: number; domain?: string; path?: string; secure?: boolean; httpOnly?: boolean; sameSite?: boolean | "lax" | "strict" | "none" } }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              let safeOptions = options;
              if (options && typeof options.sameSite !== 'undefined') {
                const validSameSite = [true, false, 'lax', 'strict', 'none'].includes(options.sameSite);
                if (!validSameSite) {
                  safeOptions = { ...options, sameSite: undefined };
                }
              }
              cookieStore.set(name, value, safeOptions)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
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