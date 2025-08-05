import { createMocks } from 'node-mocks-http'
import analyzeHandler from '../ai/analyze'
import scheduleSuggestHandler from '../ai/schedule-suggest'

// Mock fetch for OpenRouter
global.fetch = jest.fn()

// Mock Supabase
jest.mock('@/lib/supabase-api', () => ({
  createApiSupabaseClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
    },
    from: jest.fn((table) => ({
      update: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ error: null })
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: { id: 'profile-123', timezone: 'America/New_York' },
            error: null
          })
        }))
      }))
    }))
  }))
}))

describe('/api/ai/analyze', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockReset()
    process.env.OPENROUTER_API_KEY = 'test-api-key'
  })

  it('analyzes content successfully', async () => {
    // Mock successful AI response
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Test Title',
              summary: 'Test summary',
              category: 'Todo',
              tags: ['test', 'api'],
              confidence_score: 0.9
            })
          }
        }]
      })
    })

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token'
      },
      body: {
        entryId: 'entry-123',
        content: 'Test content for analysis',
        url: 'https://example.com'
      }
    })

    await analyzeHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.success).toBe(true)
    expect(data.analysis).toHaveProperty('title', 'Test Title')
  })

  it('handles missing API key', async () => {
    delete process.env.OPENROUTER_API_KEY

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token'
      },
      body: {
        entryId: 'entry-123',
        content: 'Test content'
      }
    })

    await analyzeHandler(req, res)

    expect(res._getStatusCode()).toBe(500)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Server configuration error')
  })

  it('handles missing authorization', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        entryId: 'entry-123',
        content: 'Test content'
      }
    })

    await analyzeHandler(req, res)

    expect(res._getStatusCode()).toBe(401)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Unauthorized')
  })

  it('handles AI API errors', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests'
    })

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token'
      },
      body: {
        entryId: 'entry-123',
        content: 'Test content'
      }
    })

    await analyzeHandler(req, res)

    expect(res._getStatusCode()).toBe(500)
    const data = JSON.parse(res._getData())
    expect(data.error).toContain('AI analysis failed')
  })
})

describe('/api/ai/schedule-suggest', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockReset()
    process.env.OPENROUTER_API_KEY = 'test-api-key'
  })

  it('generates scheduling suggestions', async () => {
    // Mock successful AI response
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              suggestions: [{
                entryId: 'entry-123',
                suggestedTime: '2024-01-15T10:00:00Z',
                confidence: 0.8,
                reason: 'Best time for focus work',
                duration: 30
              }]
            })
          }
        }]
      })
    })

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token'
      },
      body: {
        entries: [{
          id: 'entry-123',
          content: 'Review code',
          category: 'Todo'
        }],
        weekStart: '2024-01-14',
        weekEnd: '2024-01-20'
      }
    })

    await scheduleSuggestHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.suggestions).toHaveLength(1)
    expect(data.suggestions[0]).toHaveProperty('entryId', 'entry-123')
  })

  it('handles empty entries list', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token'
      },
      body: {
        entries: [],
        weekStart: '2024-01-14',
        weekEnd: '2024-01-20'
      }
    })

    await scheduleSuggestHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.suggestions).toEqual([])
  })

  it('rejects non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET'
    })

    await scheduleSuggestHandler(req, res)

    expect(res._getStatusCode()).toBe(405)
  })
})