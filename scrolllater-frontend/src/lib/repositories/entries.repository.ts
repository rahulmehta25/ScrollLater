import { createSupabaseServer } from '@/lib/supabase-server'
import type { Database } from '@/lib/database.types'
import {
  EnhancedBaseRepository,
  RepositoryResult,
  RepositoryError,
  RepositoryErrorCode,
  PaginationParams,
  PaginatedResult,
  QueryFilters
} from './base.repository'

type Entry = Database['public']['Tables']['entries']['Row']
type EntryInsert = Database['public']['Tables']['entries']['Insert']
type EntryUpdate = Database['public']['Tables']['entries']['Update']

export interface EntryFilters extends QueryFilters {
  userId?: string
  status?: string
  category?: string
  tags?: string[]
  search?: string
  dateFrom?: string
  dateTo?: string
  priority?: number
}

export interface EntryStats {
  total: number
  byStatus: Record<string, number>
  byCategory: Record<string, number>
  avgReadTime: number
  totalReadTime: number
}

export class EntriesRepository implements EnhancedBaseRepository<Entry> {
  private supabase = createSupabaseServer()

  /**
   * Find entry by ID with user ownership validation
   */
  async findById(id: string, userId?: string): Promise<Entry | null> {
    try {
      let query = this.supabase
        .from('entries')
        .select('*')
        .eq('id', id)

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query.single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw new RepositoryError(
          'Failed to fetch entry',
          RepositoryErrorCode.DATABASE_ERROR,
          error
        )
      }

      return data
    } catch (error) {
      if (error instanceof RepositoryError) throw error
      throw new RepositoryError(
        'Unexpected error fetching entry',
        RepositoryErrorCode.DATABASE_ERROR,
        error
      )
    }
  }

  /**
   * Find all entries with filters
   */
  async findAll(filters: EntryFilters = {}): Promise<Entry[]> {
    try {
      let query = this.supabase.from('entries').select('*')

      // Apply filters
      if (filters.userId) query = query.eq('user_id', filters.userId)
      if (filters.status) query = query.eq('status', filters.status)
      if (filters.category) {
        query = query.or(`ai_category.eq.${filters.category},user_category.eq.${filters.category}`)
      }
      if (filters.priority) query = query.eq('priority', filters.priority)
      if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom)
      if (filters.dateTo) query = query.lte('created_at', filters.dateTo)
      
      // Full-text search
      if (filters.search) {
        query = query.textSearch('search_vector', filters.search)
      }

      // Tag filtering
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('ai_tags', filters.tags)
          .overlaps('user_tags', filters.tags)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        throw new RepositoryError(
          'Failed to fetch entries',
          RepositoryErrorCode.DATABASE_ERROR,
          error
        )
      }

      return data || []
    } catch (error) {
      if (error instanceof RepositoryError) throw error
      throw new RepositoryError(
        'Unexpected error fetching entries',
        RepositoryErrorCode.DATABASE_ERROR,
        error
      )
    }
  }

  /**
   * Find entries with pagination
   */
  async findWithPagination(
    filters: EntryFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<Entry>> {
    try {
      const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = pagination
      const offset = (page - 1) * limit

      // Build query
      let query = this.supabase.from('entries').select('*', { count: 'exact' })

      // Apply filters (same as findAll)
      if (filters.userId) query = query.eq('user_id', filters.userId)
      if (filters.status) query = query.eq('status', filters.status)
      if (filters.category) {
        query = query.or(`ai_category.eq.${filters.category},user_category.eq.${filters.category}`)
      }
      if (filters.priority) query = query.eq('priority', filters.priority)
      if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom)
      if (filters.dateTo) query = query.lte('created_at', filters.dateTo)
      if (filters.search) {
        query = query.textSearch('search_vector', filters.search)
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('ai_tags', filters.tags)
          .overlaps('user_tags', filters.tags)
      }

      // Apply sorting and pagination
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        throw new RepositoryError(
          'Failed to fetch paginated entries',
          RepositoryErrorCode.DATABASE_ERROR,
          error
        )
      }

      const total = count || 0
      const totalPages = Math.ceil(total / limit)

      return {
        data: data || [],
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    } catch (error) {
      if (error instanceof RepositoryError) throw error
      throw new RepositoryError(
        'Unexpected error in paginated fetch',
        RepositoryErrorCode.DATABASE_ERROR,
        error
      )
    }
  }

  /**
   * Create new entry
   */
  async create(data: EntryInsert): Promise<Entry> {
    try {
      const { data: entry, error } = await this.supabase
        .from('entries')
        .insert(data)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new RepositoryError(
            'Entry already exists',
            RepositoryErrorCode.DUPLICATE_KEY,
            error
          )
        }
        throw new RepositoryError(
          'Failed to create entry',
          RepositoryErrorCode.DATABASE_ERROR,
          error
        )
      }

      return entry
    } catch (error) {
      if (error instanceof RepositoryError) throw error
      throw new RepositoryError(
        'Unexpected error creating entry',
        RepositoryErrorCode.DATABASE_ERROR,
        error
      )
    }
  }

  /**
   * Update entry
   */
  async update(id: string, data: EntryUpdate, userId?: string): Promise<Entry | null> {
    try {
      let query = this.supabase
        .from('entries')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data: entry, error } = await query.select().single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw new RepositoryError(
          'Failed to update entry',
          RepositoryErrorCode.DATABASE_ERROR,
          error
        )
      }

      return entry
    } catch (error) {
      if (error instanceof RepositoryError) throw error
      throw new RepositoryError(
        'Unexpected error updating entry',
        RepositoryErrorCode.DATABASE_ERROR,
        error
      )
    }
  }

  /**
   * Delete entry
   */
  async delete(id: string, userId?: string): Promise<boolean> {
    try {
      let query = this.supabase
        .from('entries')
        .delete()
        .eq('id', id)

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { error, count } = await query

      if (error) {
        throw new RepositoryError(
          'Failed to delete entry',
          RepositoryErrorCode.DATABASE_ERROR,
          error
        )
      }

      return (count || 0) > 0
    } catch (error) {
      if (error instanceof RepositoryError) throw error
      throw new RepositoryError(
        'Unexpected error deleting entry',
        RepositoryErrorCode.DATABASE_ERROR,
        error
      )
    }
  }

  /**
   * Count entries with filters
   */
  async count(filters: EntryFilters = {}): Promise<number> {
    try {
      let query = this.supabase
        .from('entries')
        .select('*', { count: 'exact', head: true })

      // Apply same filters as findAll
      if (filters.userId) query = query.eq('user_id', filters.userId)
      if (filters.status) query = query.eq('status', filters.status)
      if (filters.category) {
        query = query.or(`ai_category.eq.${filters.category},user_category.eq.${filters.category}`)
      }

      const { count, error } = await query

      if (error) {
        throw new RepositoryError(
          'Failed to count entries',
          RepositoryErrorCode.DATABASE_ERROR,
          error
        )
      }

      return count || 0
    } catch (error) {
      if (error instanceof RepositoryError) throw error
      throw new RepositoryError(
        'Unexpected error counting entries',
        RepositoryErrorCode.DATABASE_ERROR,
        error
      )
    }
  }

  /**
   * Find entries by IDs
   */
  async findByIds(ids: string[], userId?: string): Promise<Entry[]> {
    try {
      let query = this.supabase
        .from('entries')
        .select('*')
        .in('id', ids)

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (error) {
        throw new RepositoryError(
          'Failed to fetch entries by IDs',
          RepositoryErrorCode.DATABASE_ERROR,
          error
        )
      }

      return data || []
    } catch (error) {
      if (error instanceof RepositoryError) throw error
      throw new RepositoryError(
        'Unexpected error fetching entries by IDs',
        RepositoryErrorCode.DATABASE_ERROR,
        error
      )
    }
  }

  /**
   * Check if entry exists
   */
  async exists(id: string, userId?: string): Promise<boolean> {
    try {
      let query = this.supabase
        .from('entries')
        .select('id', { head: true })
        .eq('id', id)

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (error) {
        throw new RepositoryError(
          'Failed to check entry existence',
          RepositoryErrorCode.DATABASE_ERROR,
          error
        )
      }

      return data !== null
    } catch (error) {
      if (error instanceof RepositoryError) throw error
      throw new RepositoryError(
        'Unexpected error checking entry existence',
        RepositoryErrorCode.DATABASE_ERROR,
        error
      )
    }
  }

  /**
   * Create multiple entries
   */
  async createMany(data: EntryInsert[]): Promise<Entry[]> {
    try {
      const { data: entries, error } = await this.supabase
        .from('entries')
        .insert(data)
        .select()

      if (error) {
        throw new RepositoryError(
          'Failed to create multiple entries',
          RepositoryErrorCode.DATABASE_ERROR,
          error
        )
      }

      return entries || []
    } catch (error) {
      if (error instanceof RepositoryError) throw error
      throw new RepositoryError(
        'Unexpected error creating multiple entries',
        RepositoryErrorCode.DATABASE_ERROR,
        error
      )
    }
  }

  /**
   * Update multiple entries
   */
  async updateMany(filters: EntryFilters, data: EntryUpdate): Promise<Entry[]> {
    try {
      let query = this.supabase
        .from('entries')
        .update({ ...data, updated_at: new Date().toISOString() })

      // Apply filters
      if (filters.userId) query = query.eq('user_id', filters.userId)
      if (filters.status) query = query.eq('status', filters.status)

      const { data: entries, error } = await query.select()

      if (error) {
        throw new RepositoryError(
          'Failed to update multiple entries',
          RepositoryErrorCode.DATABASE_ERROR,
          error
        )
      }

      return entries || []
    } catch (error) {
      if (error instanceof RepositoryError) throw error
      throw new RepositoryError(
        'Unexpected error updating multiple entries',
        RepositoryErrorCode.DATABASE_ERROR,
        error
      )
    }
  }

  /**
   * Delete multiple entries
   */
  async deleteMany(filters: EntryFilters): Promise<number> {
    try {
      let query = this.supabase.from('entries').delete()

      // Apply filters
      if (filters.userId) query = query.eq('user_id', filters.userId)
      if (filters.status) query = query.eq('status', filters.status)

      const { error, count } = await query

      if (error) {
        throw new RepositoryError(
          'Failed to delete multiple entries',
          RepositoryErrorCode.DATABASE_ERROR,
          error
        )
      }

      return count || 0
    } catch (error) {
      if (error instanceof RepositoryError) throw error
      throw new RepositoryError(
        'Unexpected error deleting multiple entries',
        RepositoryErrorCode.DATABASE_ERROR,
        error
      )
    }
  }

  /**
   * Find one entry with filters
   */
  async findOne(filters: EntryFilters): Promise<Entry | null> {
    try {
      let query = this.supabase.from('entries').select('*')

      // Apply filters
      if (filters.userId) query = query.eq('user_id', filters.userId)
      if (filters.status) query = query.eq('status', filters.status)

      const { data, error } = await query.limit(1).single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw new RepositoryError(
          'Failed to find entry',
          RepositoryErrorCode.DATABASE_ERROR,
          error
        )
      }

      return data
    } catch (error) {
      if (error instanceof RepositoryError) throw error
      throw new RepositoryError(
        'Unexpected error finding entry',
        RepositoryErrorCode.DATABASE_ERROR,
        error
      )
    }
  }

  /**
   * Get statistics for entries
   */
  async getStats(userId: string): Promise<EntryStats> {
    try {
      const { data, error } = await this.supabase
        .from('entries')
        .select('status, ai_category, user_category, estimated_read_time')
        .eq('user_id', userId)

      if (error) {
        throw new RepositoryError(
          'Failed to fetch entry statistics',
          RepositoryErrorCode.DATABASE_ERROR,
          error
        )
      }

      const entries = data || []
      const byStatus: Record<string, number> = {}
      const byCategory: Record<string, number> = {}
      let totalReadTime = 0

      entries.forEach(entry => {
        // Status stats
        byStatus[entry.status] = (byStatus[entry.status] || 0) + 1

        // Category stats
        const category = entry.user_category || entry.ai_category || 'Uncategorized'
        byCategory[category] = (byCategory[category] || 0) + 1

        // Read time stats
        totalReadTime += entry.estimated_read_time || 0
      })

      return {
        total: entries.length,
        byStatus,
        byCategory,
        avgReadTime: entries.length > 0 ? totalReadTime / entries.length : 0,
        totalReadTime
      }
    } catch (error) {
      if (error instanceof RepositoryError) throw error
      throw new RepositoryError(
        'Unexpected error calculating statistics',
        RepositoryErrorCode.DATABASE_ERROR,
        error
      )
    }
  }

  /**
   * Search entries with advanced filtering
   */
  async search(
    query: string,
    filters: EntryFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<Entry>> {
    return this.findWithPagination(
      { ...filters, search: query },
      pagination
    )
  }
}