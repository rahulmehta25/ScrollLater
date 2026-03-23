// Typed API service layer for Supabase queries
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

// Type aliases for convenience
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']

export type Entry = Database['public']['Tables']['entries']['Row']
export type EntryInsert = Database['public']['Tables']['entries']['Insert']
export type EntryUpdate = Database['public']['Tables']['entries']['Update']

export type Category = Database['public']['Tables']['categories']['Row']

// Error types
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Result types
export type ApiResult<T> = {
  data: T
  error: null
} | {
  data: null
  error: ApiError
}

// Helper to create result
function success<T>(data: T): ApiResult<T> {
  return { data, error: null }
}

function failure<T>(message: string, code?: string, details?: unknown): ApiResult<T> {
  return { data: null, error: new ApiError(message, code, details) }
}

// Check Supabase is configured
function checkSupabase() {
  if (!isSupabaseConfigured()) {
    throw new ApiError('Supabase is not configured', 'SUPABASE_NOT_CONFIGURED')
  }
}

// ============ User Profile API ============

export async function getUserProfile(userId: string): Promise<ApiResult<UserProfile>> {
  try {
    checkSupabase()
    const supabase = createSupabaseClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      return failure(error.message, error.code, error)
    }

    return success(data)
  } catch (err) {
    if (err instanceof ApiError) return failure(err.message, err.code)
    return failure('Failed to fetch user profile', 'FETCH_ERROR', err)
  }
}

export async function updateUserProfile(
  userId: string,
  updates: UserProfileUpdate
): Promise<ApiResult<UserProfile>> {
  try {
    checkSupabase()
    const supabase = createSupabaseClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      return failure(error.message, error.code, error)
    }

    return success(data)
  } catch (err) {
    if (err instanceof ApiError) return failure(err.message, err.code)
    return failure('Failed to update user profile', 'UPDATE_ERROR', err)
  }
}

export async function createUserProfile(
  profile: UserProfileInsert
): Promise<ApiResult<UserProfile>> {
  try {
    checkSupabase()
    const supabase = createSupabaseClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .insert(profile)
      .select()
      .single()

    if (error) {
      return failure(error.message, error.code, error)
    }

    return success(data)
  } catch (err) {
    if (err instanceof ApiError) return failure(err.message, err.code)
    return failure('Failed to create user profile', 'CREATE_ERROR', err)
  }
}

// ============ Entries API ============

export type EntryFilters = {
  status?: Entry['status']
  category?: string
  search?: string
  sortBy?: 'created_at' | 'updated_at' | 'scheduled_for' | 'priority'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export async function getEntries(
  userId: string,
  filters: EntryFilters = {}
): Promise<ApiResult<Entry[]>> {
  try {
    checkSupabase()
    const supabase = createSupabaseClient()

    let query = supabase
      .from('entries')
      .select('*')
      .eq('user_id', userId)

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.category) {
      query = query.or(`ai_category.eq.${filters.category},user_category.eq.${filters.category}`)
    }

    if (filters.search) {
      query = query.textSearch('search_vector', filters.search)
    }

    const sortBy = filters.sortBy || 'created_at'
    const sortOrder = filters.sortOrder || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
    }

    const { data, error } = await query

    if (error) {
      return failure(error.message, error.code, error)
    }

    return success(data)
  } catch (err) {
    if (err instanceof ApiError) return failure(err.message, err.code)
    return failure('Failed to fetch entries', 'FETCH_ERROR', err)
  }
}

export async function getEntry(
  entryId: string
): Promise<ApiResult<Entry>> {
  try {
    checkSupabase()
    const supabase = createSupabaseClient()

    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('id', entryId)
      .single()

    if (error) {
      return failure(error.message, error.code, error)
    }

    return success(data)
  } catch (err) {
    if (err instanceof ApiError) return failure(err.message, err.code)
    return failure('Failed to fetch entry', 'FETCH_ERROR', err)
  }
}

export async function createEntry(
  entry: EntryInsert
): Promise<ApiResult<Entry>> {
  try {
    checkSupabase()
    const supabase = createSupabaseClient()

    const { data, error } = await supabase
      .from('entries')
      .insert(entry)
      .select()
      .single()

    if (error) {
      return failure(error.message, error.code, error)
    }

    return success(data)
  } catch (err) {
    if (err instanceof ApiError) return failure(err.message, err.code)
    return failure('Failed to create entry', 'CREATE_ERROR', err)
  }
}

export async function updateEntry(
  entryId: string,
  updates: EntryUpdate
): Promise<ApiResult<Entry>> {
  try {
    checkSupabase()
    const supabase = createSupabaseClient()

    const { data, error } = await supabase
      .from('entries')
      .update(updates)
      .eq('id', entryId)
      .select()
      .single()

    if (error) {
      return failure(error.message, error.code, error)
    }

    return success(data)
  } catch (err) {
    if (err instanceof ApiError) return failure(err.message, err.code)
    return failure('Failed to update entry', 'UPDATE_ERROR', err)
  }
}

export async function deleteEntry(
  entryId: string
): Promise<ApiResult<void>> {
  try {
    checkSupabase()
    const supabase = createSupabaseClient()

    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', entryId)

    if (error) {
      return failure(error.message, error.code, error)
    }

    return success(undefined)
  } catch (err) {
    if (err instanceof ApiError) return failure(err.message, err.code)
    return failure('Failed to delete entry', 'DELETE_ERROR', err)
  }
}

export async function bulkUpdateEntries(
  entryIds: string[],
  updates: EntryUpdate
): Promise<ApiResult<Entry[]>> {
  try {
    checkSupabase()
    const supabase = createSupabaseClient()

    const { data, error } = await supabase
      .from('entries')
      .update(updates)
      .in('id', entryIds)
      .select()

    if (error) {
      return failure(error.message, error.code, error)
    }

    return success(data)
  } catch (err) {
    if (err instanceof ApiError) return failure(err.message, err.code)
    return failure('Failed to bulk update entries', 'UPDATE_ERROR', err)
  }
}

export async function bulkDeleteEntries(
  entryIds: string[]
): Promise<ApiResult<void>> {
  try {
    checkSupabase()
    const supabase = createSupabaseClient()

    const { error } = await supabase
      .from('entries')
      .delete()
      .in('id', entryIds)

    if (error) {
      return failure(error.message, error.code, error)
    }

    return success(undefined)
  } catch (err) {
    if (err instanceof ApiError) return failure(err.message, err.code)
    return failure('Failed to bulk delete entries', 'DELETE_ERROR', err)
  }
}

// ============ Categories API ============

export async function getCategories(): Promise<ApiResult<Category[]>> {
  try {
    checkSupabase()
    const supabase = createSupabaseClient()

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')

    if (error) {
      return failure(error.message, error.code, error)
    }

    return success(data)
  } catch (err) {
    if (err instanceof ApiError) return failure(err.message, err.code)
    return failure('Failed to fetch categories', 'FETCH_ERROR', err)
  }
}

// ============ Dashboard Stats API ============

export type DashboardStats = {
  total_entries: number
  total_scheduled: number
  inbox_count: number
  scheduled_count: number
  completed_count: number
  archived_count: number
  entries_this_week: number
  scheduled_this_week: number
}

export async function getDashboardStats(userId: string): Promise<ApiResult<DashboardStats>> {
  try {
    checkSupabase()
    const supabase = createSupabaseClient()

    // Try the optimized view first
    const { data: viewData, error: viewError } = await supabase
      .from('user_dashboard_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!viewError && viewData) {
      return success(viewData as DashboardStats)
    }

    // Fallback to manual computation with a limit

    // Get user profile stats
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('total_entries, total_scheduled')
      .eq('id', userId)
      .single()

    if (profileError) {
      return failure(profileError.message, profileError.code, profileError)
    }

    // Get entry counts by status
    const { data: entries, error: entriesError } = await supabase
      .from('entries')
      .select('status, created_at, scheduled_for')
      .eq('user_id', userId)
      .limit(5000)

    if (entriesError) {
      return failure(entriesError.message, entriesError.code, entriesError)
    }

    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const stats: DashboardStats = {
      total_entries: profile.total_entries,
      total_scheduled: profile.total_scheduled,
      inbox_count: 0,
      scheduled_count: 0,
      completed_count: 0,
      archived_count: 0,
      entries_this_week: 0,
      scheduled_this_week: 0,
    }

    for (const entry of entries) {
      switch (entry.status) {
        case 'inbox':
          stats.inbox_count++
          break
        case 'scheduled':
          stats.scheduled_count++
          break
        case 'completed':
          stats.completed_count++
          break
        case 'archived':
          stats.archived_count++
          break
      }

      if (new Date(entry.created_at) >= oneWeekAgo) {
        stats.entries_this_week++
      }

      if (entry.scheduled_for) {
        const scheduledDate = new Date(entry.scheduled_for)
        if (scheduledDate >= now && scheduledDate <= oneWeekFromNow) {
          stats.scheduled_this_week++
        }
      }
    }

    return success(stats)
  } catch (err) {
    if (err instanceof ApiError) return failure(err.message, err.code)
    return failure('Failed to fetch dashboard stats', 'FETCH_ERROR', err)
  }
}

// ============ Export API ============

export type ExportFormat = 'json' | 'csv'

export async function exportEntries(
  userId: string,
  format: ExportFormat
): Promise<ApiResult<string>> {
  try {
    const supabase = createSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return failure('Not authenticated', 'AUTH_ERROR')
    }

    const response = await fetch('/api/entries/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ format }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Export failed' }))
      return failure(err.error || 'Export failed', 'EXPORT_ERROR')
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '')
      || `scrolllater-export.${format === 'csv' ? 'csv' : 'json'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    return success('Export downloaded successfully')
  } catch (err) {
    if (err instanceof ApiError) return failure(err.message, err.code)
    return failure('Failed to export entries', 'EXPORT_ERROR')
  }
}
