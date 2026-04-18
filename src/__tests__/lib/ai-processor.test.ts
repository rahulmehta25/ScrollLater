import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AIProcessor } from '@/lib/ai-processor'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AIProcessor', () => {
  let processor: AIProcessor
  const mockApiKey = 'test-api-key'

  beforeEach(() => {
    processor = new AIProcessor(mockApiKey)
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('analyzeContent', () => {
    it('should return valid analysis on successful API call', async () => {
      const mockResponse = {
        title: 'Test Article Title',
        summary: 'This is a test summary of the content.',
        category: 'Learning',
        tags: ['test', 'article', 'learning'],
        confidence: 0.85,
        sentiment: 'positive',
        urgency: 'medium',
        estimatedReadTime: 10,
        suggestedScheduling: {
          timeOfDay: 'morning',
          duration: 30,
          priority: 3,
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      })

      const result = await processor.analyzeContent('Test content for analysis')

      expect(result.title).toBe('Test Article Title')
      expect(result.summary).toBe('This is a test summary of the content.')
      expect(result.category).toBe('Learning')
      expect(result.tags).toEqual(['test', 'article', 'learning'])
      expect(result.confidence).toBe(0.85)
      expect(result.sentiment).toBe('positive')
      expect(result.urgency).toBe('medium')
      expect(result.estimatedReadTime).toBe(10)
      expect(result.suggestedScheduling.timeOfDay).toBe('morning')
    })

    it('should call OpenRouter API with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: 'Test',
                  summary: 'Summary',
                  category: 'Explore',
                  tags: ['test'],
                  confidence: 0.8,
                  sentiment: 'neutral',
                  urgency: 'low',
                  estimatedReadTime: 5,
                  suggestedScheduling: {
                    timeOfDay: 'afternoon',
                    duration: 15,
                    priority: 2,
                  },
                }),
              },
            },
          ],
        }),
      })

      await processor.analyzeContent('Test content', 'https://example.com')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should return fallback analysis on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'))

      const content = 'This is test content with multiple words for fallback testing'
      const result = await processor.analyzeContent(content)

      expect(result.title).toBe(content.substring(0, 60))
      expect(result.category).toBe('Explore')
      expect(result.confidence).toBe(0.3)
      expect(result.sentiment).toBe('neutral')
      expect(result.urgency).toBe('medium')
      expect(result.tags).toContain('uncategorized')
    })

    it('should return fallback on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: { message: 'Server error' } }),
      })

      const result = await processor.analyzeContent('Test content')

      expect(result.category).toBe('Explore')
      expect(result.confidence).toBe(0.3)
    })

    it('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'This is not JSON' } }],
        }),
      })

      const result = await processor.analyzeContent('Test content')

      expect(result.category).toBe('Explore')
      expect(result.confidence).toBe(0.3)
    })

    it('should truncate long titles to 60 characters', async () => {
      const longTitle = 'A'.repeat(100)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: longTitle,
                  summary: 'Summary',
                  category: 'Learning',
                  tags: ['test'],
                  confidence: 0.9,
                  sentiment: 'positive',
                  urgency: 'high',
                  estimatedReadTime: 10,
                  suggestedScheduling: {
                    timeOfDay: 'morning',
                    duration: 30,
                    priority: 4,
                  },
                }),
              },
            },
          ],
        }),
      })

      const result = await processor.analyzeContent('Test')
      expect(result.title.length).toBeLessThanOrEqual(60)
    })

    it('should clamp confidence between 0 and 1', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: 'Test',
                  summary: 'Summary',
                  category: 'Learning',
                  tags: ['test'],
                  confidence: 1.5, // Above max
                  sentiment: 'positive',
                  urgency: 'high',
                  estimatedReadTime: 10,
                  suggestedScheduling: {
                    timeOfDay: 'morning',
                    duration: 30,
                    priority: 4,
                  },
                }),
              },
            },
          ],
        }),
      })

      const result = await processor.analyzeContent('Test')
      expect(result.confidence).toBeLessThanOrEqual(1)
    })

    it('should default invalid sentiment to neutral', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: 'Test',
                  summary: 'Summary',
                  category: 'Learning',
                  tags: ['test'],
                  confidence: 0.8,
                  sentiment: 'invalid_sentiment',
                  urgency: 'high',
                  estimatedReadTime: 10,
                  suggestedScheduling: {
                    timeOfDay: 'morning',
                    duration: 30,
                    priority: 4,
                  },
                }),
              },
            },
          ],
        }),
      })

      const result = await processor.analyzeContent('Test')
      expect(result.sentiment).toBe('neutral')
    })

    it('should limit tags to 5', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: 'Test',
                  summary: 'Summary',
                  category: 'Learning',
                  tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7'],
                  confidence: 0.8,
                  sentiment: 'positive',
                  urgency: 'high',
                  estimatedReadTime: 10,
                  suggestedScheduling: {
                    timeOfDay: 'morning',
                    duration: 30,
                    priority: 4,
                  },
                }),
              },
            },
          ],
        }),
      })

      const result = await processor.analyzeContent('Test')
      expect(result.tags.length).toBeLessThanOrEqual(5)
    })
  })

  describe('generateSchedulingSuggestions', () => {
    it('should return suggestions on successful API call', async () => {
      const mockSuggestions = [
        {
          entryId: '1',
          suggestedTime: '2024-01-15T09:00:00Z',
          reason: 'Morning slot optimal',
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockSuggestions) } }],
        }),
      })

      const entries = [
        { content: 'Test entry', category: 'Learning', urgency: 'high' },
      ]
      const preferences = {
        availableHours: [{ start: '09:00', end: '17:00' }],
        preferredDuration: 30,
        timezone: 'America/New_York',
      }

      const result = await processor.generateSchedulingSuggestions(entries, preferences)

      expect(result).toHaveLength(1)
      expect(result[0].entryId).toBe('1')
      expect(result[0].suggestedTime).toBe('2024-01-15T09:00:00Z')
    })

    it('should return empty array on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'))

      const result = await processor.generateSchedulingSuggestions([], {
        availableHours: [],
        preferredDuration: 30,
        timezone: 'UTC',
      })

      expect(result).toEqual([])
    })

    it('should return empty array on invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'not valid json' } }],
        }),
      })

      const result = await processor.generateSchedulingSuggestions([], {
        availableHours: [],
        preferredDuration: 30,
        timezone: 'UTC',
      })

      expect(result).toEqual([])
    })
  })
})
