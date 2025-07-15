import { AIProcessor } from './ai-processor'

export interface BatchProcessingItem {
  entryId: string
  content: string
  url?: string
  priority: number
  userId: string
}

export interface BatchProcessingResult {
  entryId: string
  success: boolean
  analysis?: any
  error?: string
  processingTime?: number
}

export class BatchProcessor {
  private aiProcessor: AIProcessor
  private batchSize: number
  private processingQueue: BatchProcessingItem[] = []
  private isProcessing: boolean = false

  constructor(aiProcessor: AIProcessor, batchSize: number = 5) {
    this.aiProcessor = aiProcessor
    this.batchSize = batchSize
  }

  addToQueue(item: Omit<BatchProcessingItem, 'priority'> & { priority?: number }) {
    const queueItem: BatchProcessingItem = {
      ...item,
      priority: item.priority || 5
    }

    this.processingQueue.push(queueItem)
    
    // Sort by priority (lower number = higher priority)
    this.processingQueue.sort((a, b) => a.priority - b.priority)
  }

  async processBatch(): Promise<BatchProcessingResult[]> {
    if (this.isProcessing) {
      throw new Error('Batch processing already in progress')
    }

    this.isProcessing = true
    const results: BatchProcessingResult[] = []

    try {
      const batch = this.processingQueue.splice(0, this.batchSize)
      
      if (batch.length === 0) {
        return results
      }

      // Process entries in parallel with rate limiting
      const promises = batch.map(async (item, index) => {
        const startTime = Date.now()
        
        // Add delay to respect rate limits (1 second between requests)
        await new Promise(resolve => setTimeout(resolve, index * 1000))

        try {
          const analysis = await this.aiProcessor.analyzeContent(item.content, item.url)
          const processingTime = Date.now() - startTime

          return {
            entryId: item.entryId,
            success: true,
            analysis,
            processingTime
          }
        } catch (error) {
          const processingTime = Date.now() - startTime
          
          return {
            entryId: item.entryId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            processingTime
          }
        }
      })

      const batchResults = await Promise.allSettled(promises)
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          console.error('Batch processing error:', result.reason)
        }
      })

    } finally {
      this.isProcessing = false
    }

    return results
  }

  getQueueLength(): number {
    return this.processingQueue.length
  }

  getQueueStatus(): {
    length: number
    isProcessing: boolean
    nextBatchSize: number
  } {
    return {
      length: this.processingQueue.length,
      isProcessing: this.isProcessing,
      nextBatchSize: Math.min(this.batchSize, this.processingQueue.length)
    }
  }

  clearQueue(): void {
    this.processingQueue = []
  }

  pauseProcessing(): void {
    this.isProcessing = true
  }

  resumeProcessing(): void {
    this.isProcessing = false
  }
}

// Singleton instance for global batch processing
let globalBatchProcessor: BatchProcessor | null = null

export function getGlobalBatchProcessor(apiKey?: string): BatchProcessor {
  if (!globalBatchProcessor && apiKey) {
    const aiProcessor = new AIProcessor(apiKey)
    globalBatchProcessor = new BatchProcessor(aiProcessor)
  }
  
  if (!globalBatchProcessor) {
    throw new Error('Global batch processor not initialized. Call with API key first.')
  }
  
  return globalBatchProcessor
}

export function initializeGlobalBatchProcessor(apiKey: string): BatchProcessor {
  const aiProcessor = new AIProcessor(apiKey)
  globalBatchProcessor = new BatchProcessor(aiProcessor)
  return globalBatchProcessor
} 