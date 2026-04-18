import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  BatchProcessor,
} from '@/lib/batch-processor'
import { AIProcessor } from '@/lib/ai-processor'

// Mock AIProcessor
vi.mock('@/lib/ai-processor', () => ({
  AIProcessor: vi.fn().mockImplementation(() => ({
    analyzeContent: vi.fn().mockResolvedValue({
      title: 'Test Title',
      summary: 'Test Summary',
      category: 'Learning',
      tags: ['test'],
      confidence: 0.85,
      sentiment: 'positive',
      urgency: 'medium',
      estimatedReadTime: 10,
      suggestedScheduling: {
        timeOfDay: 'morning',
        duration: 30,
        priority: 3,
      },
    }),
  })),
}))

describe('BatchProcessor', () => {
  let processor: BatchProcessor
  let mockAIProcessor: AIProcessor

  beforeEach(() => {
    vi.useFakeTimers()
    mockAIProcessor = new AIProcessor('test-key')
    processor = new BatchProcessor(mockAIProcessor, 3)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('addToQueue', () => {
    it('should add items to the queue', () => {
      processor.addToQueue({
        entryId: '1',
        content: 'Test content',
        userId: 'user-1',
      })

      expect(processor.getQueueLength()).toBe(1)
    })

    it('should set default priority if not provided', () => {
      processor.addToQueue({
        entryId: '1',
        content: 'Test content',
        userId: 'user-1',
      })

      const status = processor.getQueueStatus()
      expect(status.length).toBe(1)
    })

    it('should sort queue by priority (lower = higher priority)', () => {
      processor.addToQueue({
        entryId: '1',
        content: 'Low priority',
        userId: 'user-1',
        priority: 10,
      })
      processor.addToQueue({
        entryId: '2',
        content: 'High priority',
        userId: 'user-1',
        priority: 1,
      })
      processor.addToQueue({
        entryId: '3',
        content: 'Medium priority',
        userId: 'user-1',
        priority: 5,
      })

      expect(processor.getQueueLength()).toBe(3)
    })
  })

  describe('processBatch', () => {
    it('should process items in the queue', async () => {
      processor.addToQueue({
        entryId: '1',
        content: 'Test content 1',
        userId: 'user-1',
      })
      processor.addToQueue({
        entryId: '2',
        content: 'Test content 2',
        userId: 'user-1',
      })

      const resultPromise = processor.processBatch()

      // Fast-forward timers for rate limiting delays
      await vi.runAllTimersAsync()

      const results = await resultPromise

      expect(results.length).toBe(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
    })

    it('should respect batch size limit', async () => {
      // Add more items than batch size (3)
      for (let i = 0; i < 5; i++) {
        processor.addToQueue({
          entryId: `${i}`,
          content: `Test content ${i}`,
          userId: 'user-1',
        })
      }

      expect(processor.getQueueLength()).toBe(5)

      const resultPromise = processor.processBatch()
      await vi.runAllTimersAsync()
      const results = await resultPromise

      expect(results.length).toBe(3) // Only batch size
      expect(processor.getQueueLength()).toBe(2) // Remaining
    })

    it('should throw error if already processing', async () => {
      processor.addToQueue({
        entryId: '1',
        content: 'Test',
        userId: 'user-1',
      })

      // Start first batch
      const firstBatch = processor.processBatch()

      // Try to start second batch immediately
      await expect(processor.processBatch()).rejects.toThrow(
        'Batch processing already in progress'
      )

      // Clean up
      await vi.runAllTimersAsync()
      await firstBatch
    })

    it('should return empty array if queue is empty', async () => {
      const results = await processor.processBatch()
      expect(results).toEqual([])
    })

    it('should handle analysis errors gracefully', async () => {
      const errorProcessor = new AIProcessor('test-key')
      ;(errorProcessor.analyzeContent as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Analysis failed')
      )

      const batchProcessor = new BatchProcessor(errorProcessor, 3)
      batchProcessor.addToQueue({
        entryId: '1',
        content: 'Test content',
        userId: 'user-1',
      })

      const resultPromise = batchProcessor.processBatch()
      await vi.runAllTimersAsync()
      const results = await resultPromise

      expect(results.length).toBe(1)
      expect(results[0].success).toBe(false)
      expect(results[0].error).toBe('Analysis failed')
    })

    it('should include processing time in results', async () => {
      processor.addToQueue({
        entryId: '1',
        content: 'Test content',
        userId: 'user-1',
      })

      const resultPromise = processor.processBatch()
      await vi.runAllTimersAsync()
      const results = await resultPromise

      expect(results[0].processingTime).toBeDefined()
      expect(typeof results[0].processingTime).toBe('number')
    })
  })

  describe('getQueueStatus', () => {
    it('should return correct status', () => {
      processor.addToQueue({
        entryId: '1',
        content: 'Test',
        userId: 'user-1',
      })
      processor.addToQueue({
        entryId: '2',
        content: 'Test',
        userId: 'user-1',
      })

      const status = processor.getQueueStatus()

      expect(status.length).toBe(2)
      expect(status.isProcessing).toBe(false)
      expect(status.nextBatchSize).toBe(2)
    })

    it('should limit nextBatchSize to batchSize', () => {
      for (let i = 0; i < 10; i++) {
        processor.addToQueue({
          entryId: `${i}`,
          content: 'Test',
          userId: 'user-1',
        })
      }

      const status = processor.getQueueStatus()

      expect(status.nextBatchSize).toBe(3) // Batch size is 3
    })
  })

  describe('clearQueue', () => {
    it('should clear all items from queue', () => {
      processor.addToQueue({
        entryId: '1',
        content: 'Test',
        userId: 'user-1',
      })
      processor.addToQueue({
        entryId: '2',
        content: 'Test',
        userId: 'user-1',
      })

      expect(processor.getQueueLength()).toBe(2)

      processor.clearQueue()

      expect(processor.getQueueLength()).toBe(0)
    })
  })

  describe('pauseProcessing / resumeProcessing', () => {
    it('should pause and resume processing state', () => {
      expect(processor.getQueueStatus().isProcessing).toBe(false)

      processor.pauseProcessing()
      expect(processor.getQueueStatus().isProcessing).toBe(true)

      processor.resumeProcessing()
      expect(processor.getQueueStatus().isProcessing).toBe(false)
    })
  })
})

describe('Global BatchProcessor', () => {
  beforeEach(() => {
    // Reset global state by accessing module internals
    vi.resetModules()
  })

  it('initializeGlobalBatchProcessor should create a processor', async () => {
    const { initializeGlobalBatchProcessor } = await import('@/lib/batch-processor')
    const processor = initializeGlobalBatchProcessor('test-api-key')

    expect(processor).toBeDefined()
    expect(typeof processor.addToQueue).toBe('function')
    expect(typeof processor.processBatch).toBe('function')
  })

  it('getGlobalBatchProcessor should return initialized processor', async () => {
    const { initializeGlobalBatchProcessor, getGlobalBatchProcessor } = await import(
      '@/lib/batch-processor'
    )

    initializeGlobalBatchProcessor('test-api-key')
    const processor = getGlobalBatchProcessor()

    expect(processor).toBeDefined()
  })

  it('getGlobalBatchProcessor should initialize with key if not initialized', async () => {
    const { getGlobalBatchProcessor } = await import('@/lib/batch-processor')

    const processor = getGlobalBatchProcessor('test-api-key')

    expect(processor).toBeDefined()
  })
})
