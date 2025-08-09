import { createSupabaseClient } from '@/lib/supabase'
import { AIProcessor, TaskType } from './ai-processor'
import { BatchProcessor } from './batch-processor'

export interface QueuedTask {
  id: string
  entryId: string
  userId: string
  taskType: TaskType
  priority: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: Date
  result?: unknown
  error?: string
}

export interface ProcessingStats {
  pending: number
  processing: number
  completed: number
  failed: number
  avgProcessingTime: number
}

export class AIQueueManager {
  private supabase: ReturnType<typeof createSupabaseClient>
  private aiProcessor: AIProcessor
  private batchProcessor: BatchProcessor
  private pollingInterval: NodeJS.Timeout | null = null
  private processingInProgress = false

  constructor(apiKey: string) {
    this.supabase = createSupabaseClient()
    this.aiProcessor = new AIProcessor(apiKey)
    this.batchProcessor = new BatchProcessor(this.aiProcessor)
  }

  // Start the queue processor
  startProcessing(intervalMs: number = 10000) {
    if (this.pollingInterval) {
      console.log('Queue processing already started')
      return
    }

    this.pollingInterval = setInterval(() => {
      this.processNextBatch()
    }, intervalMs)

    // Process immediately on start
    this.processNextBatch()
  }

  // Stop the queue processor
  stopProcessing() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
  }

  // Process the next batch of tasks
  private async processNextBatch() {
    if (this.processingInProgress) {
      console.log('Processing already in progress, skipping')
      return
    }

    this.processingInProgress = true

    try {
      // Get next batch of pending tasks
      const { data: tasks, error } = await this.supabase
        .rpc('get_next_pending_task')
        .limit(5)

      if (error) {
        console.error('Error fetching pending tasks:', error)
        return
      }

      if (!tasks || tasks.length === 0) {
        console.log('No pending tasks')
        return
      }

      // Process each task (convert from snake_case to camelCase)
      for (const dbTask of tasks) {
        const task: QueuedTask = {
          id: dbTask.id,
          entryId: dbTask.entry_id,
          userId: dbTask.user_id,
          taskType: dbTask.task_type,
          priority: dbTask.priority,
          status: dbTask.status,
          createdAt: dbTask.created_at,
          result: dbTask.result,
          error: dbTask.error
        }
        await this.processTask(task)
      }
    } catch (error) {
      console.error('Error in batch processing:', error)
    } finally {
      this.processingInProgress = false
    }
  }

  // Process a single task
  private async processTask(task: QueuedTask) {
    const startTime = Date.now()

    try {
      // Fetch the entry content
      const { data: entry, error: entryError } = await this.supabase
        .from('entries')
        .select('*')
        .eq('id', task.entryId)
        .single()

      if (entryError || !entry) {
        throw new Error(`Entry not found: ${task.entryId}`)
      }

      let result: unknown

      switch (task.taskType as TaskType) {
        case TaskType.SUMMARIZE:
        case TaskType.CATEGORIZE:
        case TaskType.BATCH_ANALYZE:
          result = await this.aiProcessor.analyzeContent(
            entry.content || '',
            entry.url
          )
          
          // Update the entry with AI results
          await this.supabase
            .from('entries')
            .update({
              title: result.title || entry.title,
              ai_summary: result.summary,
              ai_category: result.category,
              tags: result.tags,
              sentiment: result.sentiment,
              urgency: result.urgency,
              estimated_read_time: result.estimatedReadTime,
              updated_at: new Date().toISOString()
            })
            .eq('id', entry.id)
          break

        case TaskType.SCHEDULE_SUGGEST:
          // Fetch user preferences
          const { data: profile } = await this.supabase
            .from('profiles')
            .select('preferences')
            .eq('id', task.userId)
            .single()

          const userPreferences = profile?.preferences || {
            availableHours: [{ start: '09:00', end: '17:00' }],
            preferredDuration: 30,
            timezone: 'UTC'
          }

          // Generate scheduling suggestions
          const suggestions = await this.aiProcessor.generateSchedulingSuggestions(
            [{ content: entry.content || '', category: entry.ai_category || 'General', urgency: entry.urgency || 'medium' }],
            userPreferences
          )

          result = { suggestions }

          // Optionally update the entry with suggested scheduling
          if (suggestions.length > 0) {
            await this.supabase
              .from('entries')
              .update({
                scheduled_for: suggestions[0].suggestedTime,
                updated_at: new Date().toISOString()
              })
              .eq('id', entry.id)
          }
          break

        default:
          throw new Error(`Unknown task type: ${task.taskType}`)
      }

      const processingTime = Date.now() - startTime
      const modelStats = this.aiProcessor.getUsageStats()

      // Mark task as completed
      await this.supabase.rpc('complete_processing_task', {
        p_task_id: task.id,
        p_result: result,
        p_model_used: modelStats.modelUsage[Object.keys(modelStats.modelUsage)[0]] ? Object.keys(modelStats.modelUsage)[0] : null,
        p_tokens_used: modelStats.tokensUsed,
        p_processing_time_ms: processingTime
      })

      console.log(`Task ${task.id} completed successfully in ${processingTime}ms`)
    } catch (error) {
      console.error(`Error processing task ${task.id}:`, error)
      
      // Mark task as failed
      await this.supabase.rpc('fail_processing_task', {
        p_task_id: task.id,
        p_error_message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // Add a new task to the queue
  async enqueueTask(
    entryId: string,
    userId: string,
    taskType: TaskType,
    priority: number = 5
  ): Promise<string | null> {
    const { data, error } = await this.supabase.rpc('enqueue_ai_processing', {
      p_entry_id: entryId,
      p_user_id: userId,
      p_task_type: taskType,
      p_priority: priority
    })

    if (error) {
      console.error('Error enqueueing task:', error)
      return null
    }

    return data
  }

  // Get queue statistics
  async getStats(userId?: string): Promise<ProcessingStats> {
    let query = this.supabase
      .from('processing_queue')
      .select('status, processing_time_ms')

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching stats:', error)
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        avgProcessingTime: 0
      }
    }

    const stats = data.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1
      if (task.status === 'completed' && task.processing_time_ms) {
        acc.totalProcessingTime = (acc.totalProcessingTime || 0) + task.processing_time_ms
      }
      return acc
    }, {} as Record<string, number>)

    const completedCount = stats.completed || 0
    const avgProcessingTime = completedCount > 0 
      ? Math.round(stats.totalProcessingTime / completedCount)
      : 0

    return {
      pending: stats.pending || 0,
      processing: stats.processing || 0,
      completed: completedCount,
      failed: stats.failed || 0,
      avgProcessingTime
    }
  }

  // Clean up old completed/failed tasks
  async cleanupOldTasks(daysOld: number = 7): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const { data, error } = await this.supabase
      .from('processing_queue')
      .delete()
      .in('status', ['completed', 'failed'])
      .lt('completed_at', cutoffDate.toISOString())
      .select('id')

    if (error) {
      console.error('Error cleaning up old tasks:', error)
      return 0
    }

    return data?.length || 0
  }

  // Get recent processing errors for debugging
  async getRecentErrors(limit: number = 10): Promise<Array<{
    id: string
    taskType: string
    errorMessage: string
    createdAt: string
  }>> {
    const { data, error } = await this.supabase
      .from('processing_queue')
      .select('id, task_type, error_message, created_at')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching recent errors:', error)
      return []
    }

    return data.map(task => ({
      id: task.id,
      taskType: task.task_type,
      errorMessage: task.error_message || 'Unknown error',
      createdAt: task.created_at
    }))
  }
}

// Singleton instance
let queueManager: AIQueueManager | null = null

export function getAIQueueManager(apiKey?: string): AIQueueManager {
  if (!queueManager && apiKey) {
    queueManager = new AIQueueManager(apiKey)
  }
  
  if (!queueManager) {
    throw new Error('AI Queue Manager not initialized. Call with API key first.')
  }
  
  return queueManager
}

export function initializeAIQueueManager(apiKey: string): AIQueueManager {
  queueManager = new AIQueueManager(apiKey)
  return queueManager
}