import { AIProcessor, AIAnalysisResult } from './ai-processor'

export class BatchProcessor {
  private aiProcessor: AIProcessor
  private batchSize = 5
  private processingQueue: Array<{
    entryId: string
    content: string
    url?: string
    priority: number
  }> = []

  constructor(aiProcessor: AIProcessor) {
    this.aiProcessor = aiProcessor
  }

  addToQueue(entry: {
    entryId: string
    content: string
    url?: string
    priority?: number
  }) {
    this.processingQueue.push({
      ...entry,
      priority: entry.priority || 5
    })

    // Sort by priority (lower number = higher priority)
    this.processingQueue.sort((a, b) => a.priority - b.priority)
  }

  async processBatch(): Promise<Array<{
    entryId: string
    analysis: AIAnalysisResult
    error?: string
  }>> {
    const batch = this.processingQueue.splice(0, this.batchSize)
    const results: Array<{ entryId: string; analysis: AIAnalysisResult; error?: string }> = []

    // Process entries in parallel with rate limiting
    const promises: Promise<{ entryId: string; analysis: AIAnalysisResult; error?: string }>[] = batch.map(async (entry, index) => {
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, index * 1000))

      try {
        const analysis = await this.aiProcessor.analyzeContent(entry.content, entry.url)
        return {
          entryId: entry.entryId,
          analysis
        }
      } catch (error) {
        return {
          entryId: entry.entryId,
          analysis: this.aiProcessor.getFallbackAnalysis(entry.content),
          error: (error as Error).message
        }
      }
    })

    const batchResults: PromiseSettledResult<{ entryId: string; analysis: AIAnalysisResult; error?: string }>[] = await Promise.allSettled(promises)
    
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        console.error('Batch processing error:', result.reason)
      }
    })

    return results
  }

  getQueueLength(): number {
    return this.processingQueue.length
  }

  clearQueue(): void {
    this.processingQueue = []
  }
} 