import { createMocks } from 'node-mocks-http'
import handler from '../auth/callback'
import googleCallbackHandler from '../auth/google-callback'

// Mock Supabase
jest.mock('@/lib/supabase-api', () => ({
  createApiSupabaseClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token', user: { id: 'user-123' } } },
        error: null
      })
    },
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ error: null })
      }))
    }))
  }))
}))

// Mock fetch for Google OAuth
global.fetch = jest.fn()

describe('/api/auth/callback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('redirects to home on successful auth', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        code: 'test-code'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(302)
    expect(res._getRedirectUrl()).toBe('/')
  })

  it('handles missing code parameter', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {}
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
  })

  it('rejects non-GET requests', async () => {
    const { req, res } = createMocks({
      method: 'POST'
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
  })
})

describe('/api/auth/google-callback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockReset()
  })

  it('handles successful Google OAuth callback', async () => {
    // Mock successful token exchange
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        refresh_token: 'google-refresh-token',
        access_token: 'google-access-token'
      })
    })

    const { req, res } = createMocks({
      method: 'GET',
      query: {
        code: 'google-auth-code',
        state: 'test-state'
      }
    })

    await googleCallbackHandler(req, res)

    expect(global.fetch).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({
        method: 'POST'
      })
    )

    expect(res._getStatusCode()).toBe(302)
    expect(res._getRedirectUrl()).toContain('/dashboard/settings?calendar=connected')
  })

  it('handles Google OAuth errors', async () => {
    // Mock failed token exchange
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'invalid_grant'
      })
    })

    const { req, res } = createMocks({
      method: 'GET',
      query: {
        code: 'invalid-code',
        state: 'test-state'
      }
    })

    await googleCallbackHandler(req, res)

    expect(res._getStatusCode()).toBe(302)
    expect(res._getRedirectUrl()).toContain('calendar=error')
  })

  it('handles missing parameters', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {}
    })

    await googleCallbackHandler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Missing code or state parameter')
  })

  it('rejects non-GET requests', async () => {
    const { req, res } = createMocks({
      method: 'POST'
    })

    await googleCallbackHandler(req, res)

    expect(res._getStatusCode()).toBe(405)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Method not allowed')
  })
})