import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Store original env
const originalEnv = { ...process.env }

describe('Supabase client', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.clearAllMocks()
  })

  describe('isSupabaseConfigured', () => {
    it('should return true when both URL and key are set', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

      const { isSupabaseConfigured } = await import('@/lib/supabase')

      expect(isSupabaseConfigured()).toBe(true)
    })

    it('should return false when URL is missing', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = ''
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

      const { isSupabaseConfigured } = await import('@/lib/supabase')

      expect(isSupabaseConfigured()).toBe(false)
    })

    it('should return false when key is missing', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ''

      const { isSupabaseConfigured } = await import('@/lib/supabase')

      expect(isSupabaseConfigured()).toBe(false)
    })

    it('should return false when both are missing', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = ''
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ''

      const { isSupabaseConfigured } = await import('@/lib/supabase')

      expect(isSupabaseConfigured()).toBe(false)
    })
  })

  describe('createSupabaseClient', () => {
    it('should create a browser client when configured', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

      const { createSupabaseClient } = await import('@/lib/supabase')
      const client = createSupabaseClient()

      expect(client).toBeDefined()
      expect(client.auth).toBeDefined()
      expect(client.from).toBeDefined()
    })

    it('should create a placeholder client when not configured', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = ''
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ''

      const { createSupabaseClient } = await import('@/lib/supabase')
      const client = createSupabaseClient()

      // Should still return a client object (placeholder)
      expect(client).toBeDefined()
      expect(client.auth).toBeDefined()
    })
  })

  describe('createSupabaseServiceClient', () => {
    it('should throw error when service role key is missing', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      const { createSupabaseServiceClient } = await import('@/lib/supabase')

      expect(() => createSupabaseServiceClient()).toThrow(
        'Missing SUPABASE_SERVICE_ROLE_KEY environment variable'
      )
    })

    it('should create service client when key is present', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

      const { createSupabaseServiceClient } = await import('@/lib/supabase')
      const client = createSupabaseServiceClient()

      expect(client).toBeDefined()
      expect(client.auth).toBeDefined()
    })
  })
})
