import { EntriesRepository, EntryFilters, EntryStats } from '@/lib/repositories/entries.repository'
import { BaseService, ServiceResult, ServiceError, ServiceErrorCode } from './base.service'
import { PaginationParams, PaginatedResult } from '@/lib/repositories/base.repository'
import type { Database } from '@/lib/database.types'
import { AIProcessor } from '@/lib/ai-processor'
import { getAIQueueManager } from '@/lib/ai-queue-manager'

type Entry = Database['public']['Tables']['entries']['Row']
type EntryInsert = Database['public']['Tables']['entries']['Insert']
type EntryUpdate = Database['public']['Tables']['entries']['Update']

export interface CreateEntryData {
  content: string
  url?: string
  originalInput: string
  source?: string
  userCategory?: string
  userTags?: string[]
  userNotes?: string
  priority?: number
}

export interface UpdateEntryData {
  title?: string
  content?: string
  userCategory?: string
  userTags?: string[]
  userNotes?: string
  priority?: number
  status?: string
  scheduledFor?: string
}

export interface BulkOperationResult {
  processed: number
  successful: number
  failed: number
  errors: Array<{ id: string; error: string }>
}

export interface EntrySearchOptions {
  query?: string
  filters?: EntryFilters
  pagination?: PaginationParams
  includeAI?: boolean
}

/**
 * Entries Service
 * Handles business logic for entry management
 */
export class EntriesService extends BaseService {
  private entriesRepo: EntriesRepository
  private aiProcessor?: AIProcessor

  constructor(aiApiKey?: string) {
    super()
    this.entriesRepo = new EntriesRepository()
    if (aiApiKey) {
      this.aiProcessor = new AIProcessor(aiApiKey)
    }
  }

  /**
   * Get entry by ID with user validation
   */
  async getEntry(id: string, userId: string): Promise<ServiceResult<Entry>> {
    return this.execute(async () => {
      this.validateRequired({ id, userId }, ['id', 'userId'])

      const entry = await this.entriesRepo.findById(id, userId)
      if (!entry) {
        throw new ServiceError(
          'Entry not found',
          ServiceErrorCode.NOT_FOUND,
          404
        )
      }

      return entry
    }, 'getEntry')
  }

  /**
   * Get entries with filters and pagination
   */
  async getEntries(
    userId: string,
    options: EntrySearchOptions = {}
  ): Promise<ServiceResult<PaginatedResult<Entry>>> {
    return this.execute(async () => {
      this.validateRequired({ userId }, ['userId'])

      const filters: EntryFilters = {
        userId,
        ...options.filters
      }

      const pagination: PaginationParams = {
        page: 1,
        limit: 20,
        ...options.pagination
      }

      if (options.query) {
        return await this.entriesRepo.search(options.query, filters, pagination)
      }

      return await this.entriesRepo.findWithPagination(filters, pagination)
    }, 'getEntries')
  }

  /**
   * Create new entry with optional AI processing
   */
  async createEntry(
    userId: string,
    data: CreateEntryData,
    processWithAI = true
  ): Promise<ServiceResult<Entry>> {
    return this.execute(async () => {
      this.validateRequired({ userId, ...data }, ['userId', 'content', 'originalInput'])

      // Prepare entry data
      const entryData: EntryInsert = {
        user_id: userId,
        content: data.content,
        url: data.url,
        original_input: data.originalInput,
        source: data.source || 'web',
        user_category: data.userCategory,
        user_tags: data.userTags || [],
        user_notes: data.userNotes,
        priority: data.priority || 3,
        status: 'inbox'
      }

      // Create entry
      const entry = await this.entriesRepo.create(entryData)

      // Queue AI processing if enabled and API key available
      if (processWithAI && this.aiProcessor && process.env.OPENROUTER_API_KEY) {
        try {
          const queueManager = getAIQueueManager(process.env.OPENROUTER_API_KEY)
          await queueManager.enqueueTask(
            entry.id,
            userId,
            'batch_analyze' as any,
            5
          )
          this.logger.info('AI processing queued for entry', { entryId: entry.id })
        } catch (error) {
          this.logger.warn('Failed to queue AI processing', { entryId: entry.id, error })
          // Continue without AI processing
        }
      }

      return entry
    }, 'createEntry')
  }

  /**
   * Update entry
   */
  async updateEntry(
    id: string,
    userId: string,
    data: UpdateEntryData
  ): Promise<ServiceResult<Entry>> {
    return this.execute(async () => {
      this.validateRequired({ id, userId }, ['id', 'userId'])

      // Check if entry exists and belongs to user
      const existingEntry = await this.entriesRepo.findById(id, userId)
      if (!existingEntry) {
        throw new ServiceError(
          'Entry not found or access denied',
          ServiceErrorCode.NOT_FOUND,
          404
        )
      }

      const updateData: EntryUpdate = {
        ...data,
        updated_at: new Date().toISOString()
      }

      const updatedEntry = await this.entriesRepo.update(id, updateData, userId)
      if (!updatedEntry) {
        throw new ServiceError(
          'Failed to update entry',
          ServiceErrorCode.INTERNAL_ERROR,
          500
        )
      }

      return updatedEntry
    }, 'updateEntry')
  }

  /**
   * Delete entry
   */
  async deleteEntry(id: string, userId: string): Promise<ServiceResult<boolean>> {
    return this.execute(async () => {
      this.validateRequired({ id, userId }, ['id', 'userId'])

      const deleted = await this.entriesRepo.delete(id, userId)
      if (!deleted) {
        throw new ServiceError(
          'Entry not found or access denied',
          ServiceErrorCode.NOT_FOUND,
          404
        )
      }

      return true
    }, 'deleteEntry')
  }

  /**
   * Bulk update entries
   */
  async bulkUpdateEntries(
    userId: string,
    entryIds: string[],
    updateData: UpdateEntryData
  ): Promise<ServiceResult<BulkOperationResult>> {
    return this.execute(async () => {
      this.validateRequired({ userId, entryIds }, ['userId', 'entryIds'])

      if (entryIds.length === 0) {
        throw new ServiceError(
          'No entries specified for bulk update',
          ServiceErrorCode.VALIDATION_ERROR,
          400
        )
      }

      const result: BulkOperationResult = {
        processed: entryIds.length,
        successful: 0,
        failed: 0,
        errors: []
      }

      // Update entries one by one to ensure proper ownership validation
      for (const entryId of entryIds) {
        try {
          await this.entriesRepo.update(entryId, updateData, userId)
          result.successful++
        } catch (error) {
          result.failed++
          result.errors.push({
            id: entryId,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return result
    }, 'bulkUpdateEntries')
  }

  /**
   * Bulk delete entries
   */
  async bulkDeleteEntries(
    userId: string,
    entryIds: string[]
  ): Promise<ServiceResult<BulkOperationResult>> {
    return this.execute(async () => {
      this.validateRequired({ userId, entryIds }, ['userId', 'entryIds'])

      if (entryIds.length === 0) {
        throw new ServiceError(
          'No entries specified for bulk delete',
          ServiceErrorCode.VALIDATION_ERROR,
          400
        )
      }

      const result: BulkOperationResult = {
        processed: entryIds.length,
        successful: 0,
        failed: 0,
        errors: []
      }

      // Delete entries one by one to ensure proper ownership validation
      for (const entryId of entryIds) {
        try {
          const deleted = await this.entriesRepo.delete(entryId, userId)
          if (deleted) {
            result.successful++
          } else {
            result.failed++
            result.errors.push({
              id: entryId,
              error: 'Entry not found or access denied'
            })
          }
        } catch (error) {
          result.failed++
          result.errors.push({
            id: entryId,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return result
    }, 'bulkDeleteEntries')
  }

  /**
   * Get entry statistics
   */
  async getEntryStats(userId: string): Promise<ServiceResult<EntryStats>> {
    return this.execute(async () => {
      this.validateRequired({ userId }, ['userId'])

      return await this.entriesRepo.getStats(userId)
    }, 'getEntryStats')
  }

  /**
   * Search entries with advanced options
   */
  async searchEntries(
    userId: string,
    query: string,
    options: Omit<EntrySearchOptions, 'query'> = {}
  ): Promise<ServiceResult<PaginatedResult<Entry>>> {
    return this.execute(async () => {
      this.validateRequired({ userId, query }, ['userId', 'query'])

      const filters: EntryFilters = {
        userId,
        ...options.filters
      }

      const pagination: PaginationParams = {
        page: 1,
        limit: 20,
        ...options.pagination
      }

      return await this.entriesRepo.search(query, filters, pagination)
    }, 'searchEntries')
  }

  /**
   * Schedule entry
   */
  async scheduleEntry(
    id: string,
    userId: string,
    scheduledFor: string,
    calendarEventId?: string
  ): Promise<ServiceResult<Entry>> {
    return this.execute(async () => {
      this.validateRequired({ id, userId, scheduledFor }, ['id', 'userId', 'scheduledFor'])

      // Validate date
      const scheduledDate = new Date(scheduledFor)
      if (isNaN(scheduledDate.getTime())) {
        throw new ServiceError(
          'Invalid scheduled date',
          ServiceErrorCode.VALIDATION_ERROR,
          400
        )
      }

      const updateData: EntryUpdate = {
        status: 'scheduled',
        scheduled_for: scheduledFor,
        calendar_event_id: calendarEventId
      }

      const updatedEntry = await this.entriesRepo.update(id, updateData, userId)
      if (!updatedEntry) {
        throw new ServiceError(
          'Entry not found or access denied',
          ServiceErrorCode.NOT_FOUND,
          404
        )
      }

      return updatedEntry
    }, 'scheduleEntry')
  }

  /**
   * Mark entry as completed
   */
  async completeEntry(id: string, userId: string): Promise<ServiceResult<Entry>> {
    return this.execute(async () => {
      this.validateRequired({ id, userId }, ['id', 'userId'])

      const updateData: EntryUpdate = {
        status: 'completed',
        completed_at: new Date().toISOString()
      }

      const updatedEntry = await this.entriesRepo.update(id, updateData, userId)
      if (!updatedEntry) {
        throw new ServiceError(
          'Entry not found or access denied',
          ServiceErrorCode.NOT_FOUND,
          404
        )
      }

      return updatedEntry
    }, 'completeEntry')
  }

  /**
   * Archive entry
   */
  async archiveEntry(id: string, userId: string): Promise<ServiceResult<Entry>> {
    return this.execute(async () => {
      this.validateRequired({ id, userId }, ['id', 'userId'])

      const updateData: EntryUpdate = {
        status: 'archived'
      }

      const updatedEntry = await this.entriesRepo.update(id, updateData, userId)
      if (!updatedEntry) {
        throw new ServiceError(
          'Entry not found or access denied',
          ServiceErrorCode.NOT_FOUND,
          404
        )
      }

      return updatedEntry
    }, 'archiveEntry')
  }

  /**
   * Get entries scheduled for a date range
   */
  async getScheduledEntries(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<ServiceResult<Entry[]>> {
    return this.execute(async () => {
      this.validateRequired({ userId, startDate, endDate }, ['userId', 'startDate', 'endDate'])

      const filters: EntryFilters = {
        userId,
        status: 'scheduled',
        dateFrom: startDate,
        dateTo: endDate
      }

      return await this.entriesRepo.findAll(filters)
    }, 'getScheduledEntries')
  }

  /**
   * Get entries by category
   */
  async getEntriesByCategory(
    userId: string,
    category: string,
    pagination?: PaginationParams
  ): Promise<ServiceResult<PaginatedResult<Entry>>> {
    return this.execute(async () => {
      this.validateRequired({ userId, category }, ['userId', 'category'])

      const filters: EntryFilters = {
        userId,
        category
      }

      return await this.entriesRepo.findWithPagination(filters, pagination)
    }, 'getEntriesByCategory')
  }
}