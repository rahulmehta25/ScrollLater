import { vi } from 'vitest'

export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'mock-user-id',
    email: 'test@example.com',
    user_metadata: {
      full_name: 'Test User',
    },
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
  },
}

export const mockUser = mockSession.user

export const createMockSupabaseClient = () => {
  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn().mockResolvedValue({ data: [], error: null }),
  })

  const mockAuth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    signIn: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: 'https://oauth.example.com' }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
    refreshSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
  }

  const mockFunctions = {
    invoke: vi.fn().mockResolvedValue({ data: {}, error: null }),
  }

  return {
    from: mockFrom,
    auth: mockAuth,
    functions: mockFunctions,
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
  }
}

export const mockSupabaseClient = createMockSupabaseClient()

// Mock module
vi.mock('@/lib/supabase', () => ({
  createSupabaseClient: () => mockSupabaseClient,
  createServerSupabaseClient: async () => mockSupabaseClient,
  createSupabaseServiceClient: () => mockSupabaseClient,
  isSupabaseConfigured: () => true,
  Database: {},
}))
