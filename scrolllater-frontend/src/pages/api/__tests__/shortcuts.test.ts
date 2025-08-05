import { createMocks } from 'node-mocks-http'
import webhookHandler from '../shortcuts/webhook'

// Mock Supabase
jest.mock('@/lib/supabase-api', () => ({
  createApiSupabaseClient: jest.fn(() => ({
    from: jest.fn((table) => {
      if (table === 'user_profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { 
                  id: 'user-123',
                  apple_shortcut_token: 'valid-token-123'
                },
                error: null
              })
            }))
          }))
        }
      }
      if (table === 'entries') {
        return {
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { 
                  id: 'entry-123',
                  content: 'Test entry',
                  user_id: 'user-123'
                },
                error: null
              })
            }))
          }))
        }
      }
    })
  }))
}))

describe('/api/shortcuts/webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates entry with valid token', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        token: 'valid-token-123',
        content: 'Test entry from shortcut',
        source: 'ios-shortcut'
      }
    })

    await webhookHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.success).toBe(true)
    expect(data.entry).toHaveProperty('id', 'entry-123')
  })

  it('rejects invalid token', async () => {
    // Mock invalid token response
    const supabase = require('@/lib/supabase-api').createApiSupabaseClient()
    supabase.from('user_profiles').select().eq().single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116' }
    })

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        token: 'invalid-token',
        content: 'Test entry'
      }
    })

    await webhookHandler(req, res)

    expect(res._getStatusCode()).toBe(401)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Invalid token')
  })

  it('handles missing token', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        content: 'Test entry'
      }
    })

    await webhookHandler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Missing required fields')
  })

  it('handles missing content', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        token: 'valid-token'
      }
    })

    await webhookHandler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Missing required fields')
  })

  it('rejects non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET'
    })

    await webhookHandler(req, res)

    expect(res._getStatusCode()).toBe(405)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Method not allowed')
  })

  it('rejects non-JSON content type', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: 'invalid'
    })

    await webhookHandler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Content-Type must be application/json')
  })

  it('handles database errors gracefully', async () => {
    // Mock database error
    const supabase = require('@/lib/supabase-api').createApiSupabaseClient()
    supabase.from('entries').insert().select().single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database connection failed' }
    })

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        token: 'valid-token-123',
        content: 'Test entry'
      }
    })

    await webhookHandler(req, res)

    expect(res._getStatusCode()).toBe(500)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Failed to create entry')
  })
})