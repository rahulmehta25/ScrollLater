// Offline support with optimistic updates and local storage sync

import { createSupabaseClient, isSupabaseConfigured } from './supabase'
import type { Entry, EntryInsert, EntryUpdate } from '@/services/api'

const OFFLINE_QUEUE_KEY = 'scrolllater_offline_queue'
const ENTRIES_CACHE_KEY = 'scrolllater_entries_cache'
const LAST_SYNC_KEY = 'scrolllater_last_sync'

type OfflineAction = {
  id: string
  type: 'create' | 'update' | 'delete'
  table: 'entries'
  data: Record<string, unknown>
  timestamp: number
  retries: number
}

type SyncResult = {
  success: boolean
  synced: number
  failed: number
  errors: string[]
}

// Check if we're online
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

// Get offline queue
export function getOfflineQueue(): OfflineAction[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(OFFLINE_QUEUE_KEY)
  return stored ? JSON.parse(stored) : []
}

// Save offline queue
function saveOfflineQueue(queue: OfflineAction[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
}

// Add action to offline queue
export function queueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retries'>): void {
  const queue = getOfflineQueue()
  queue.push({
    ...action,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    retries: 0,
  })
  saveOfflineQueue(queue)
}

// Remove action from queue
export function removeFromQueue(actionId: string): void {
  const queue = getOfflineQueue()
  const filtered = queue.filter(a => a.id !== actionId)
  saveOfflineQueue(filtered)
}

// Get cached entries
export function getCachedEntries(userId: string): Entry[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(`${ENTRIES_CACHE_KEY}_${userId}`)
  return stored ? JSON.parse(stored) : []
}

// Save entries to cache
export function cacheEntries(userId: string, entries: Entry[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${ENTRIES_CACHE_KEY}_${userId}`, JSON.stringify(entries))
  localStorage.setItem(LAST_SYNC_KEY, Date.now().toString())
}

// Get last sync time
export function getLastSyncTime(): number | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(LAST_SYNC_KEY)
  return stored ? parseInt(stored, 10) : null
}

// Apply optimistic update to cache
export function applyOptimisticCreate(userId: string, entry: EntryInsert): Entry {
  const tempId = `temp_${crypto.randomUUID()}`
  const optimisticEntry: Entry = {
    id: tempId,
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    url: entry.url || null,
    title: entry.title || null,
    content: entry.content,
    original_input: entry.original_input,
    ai_summary: null,
    ai_category: null,
    ai_tags: [],
    ai_confidence_score: null,
    ai_schedule_suggestions: null,
    user_category: entry.user_category || null,
    user_tags: entry.user_tags || [],
    user_notes: entry.user_notes || null,
    priority: entry.priority || 3,
    status: entry.status || 'inbox',
    scheduled_for: entry.scheduled_for || null,
    completed_at: null,
    calendar_event_id: null,
    calendar_event_url: null,
    source: entry.source || 'web',
    metadata: entry.metadata || {},
    search_vector: null as unknown,
  }

  const cached = getCachedEntries(userId)
  cached.unshift(optimisticEntry)
  cacheEntries(userId, cached)

  return optimisticEntry
}

// Apply optimistic update to existing entry
export function applyOptimisticUpdate(userId: string, entryId: string, updates: EntryUpdate): Entry | null {
  const cached = getCachedEntries(userId)
  const index = cached.findIndex(e => e.id === entryId)

  if (index === -1) return null

  const updated: Entry = {
    ...cached[index],
    ...updates,
    updated_at: new Date().toISOString(),
  }

  cached[index] = updated
  cacheEntries(userId, cached)

  return updated
}

// Apply optimistic delete
export function applyOptimisticDelete(userId: string, entryId: string): boolean {
  const cached = getCachedEntries(userId)
  const filtered = cached.filter(e => e.id !== entryId)

  if (filtered.length === cached.length) return false

  cacheEntries(userId, filtered)
  return true
}

// Rollback optimistic update
export function rollbackOptimisticUpdate(userId: string, entryId: string, originalEntry: Entry): void {
  const cached = getCachedEntries(userId)
  const index = cached.findIndex(e => e.id === entryId)

  if (index !== -1) {
    cached[index] = originalEntry
    cacheEntries(userId, cached)
  }
}

// Sync offline queue with server
export async function syncOfflineQueue(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  }

  if (!isOnline() || !isSupabaseConfigured()) {
    return { ...result, success: false, errors: ['Offline or Supabase not configured'] }
  }

  const queue = getOfflineQueue()
  if (queue.length === 0) return result

  const supabase = createSupabaseClient()

  for (const action of queue) {
    try {
      let success = false

      switch (action.type) {
        case 'create': {
          const { error } = await supabase
            .from(action.table)
            .insert(action.data as EntryInsert)
          success = !error
          if (error) result.errors.push(`Create failed: ${error.message}`)
          break
        }
        case 'update': {
          const { id, ...updates } = action.data as EntryUpdate & { id: string }
          const { error } = await supabase
            .from(action.table)
            .update(updates)
            .eq('id', id)
          success = !error
          if (error) result.errors.push(`Update failed: ${error.message}`)
          break
        }
        case 'delete': {
          const { error } = await supabase
            .from(action.table)
            .delete()
            .eq('id', action.data.id as string)
          success = !error
          if (error) result.errors.push(`Delete failed: ${error.message}`)
          break
        }
      }

      if (success) {
        result.synced++
      } else {
        action.retries++
        if (action.retries >= 3) {
          result.failed++
        }
      }
    } catch (err) {
      result.errors.push(`Action ${action.id} failed: ${String(err)}`)
      action.retries++
      if (action.retries >= 3) {
        result.failed++
      }
    }
  }

  // Save the modified queue, filtering out actions that exceeded max retries
  const remainingQueue = queue.filter(a => (a.retries || 0) < 3);
  saveOfflineQueue(remainingQueue);

  result.success = result.failed === 0
  return result
}

// Hook to listen for online/offline events
export function setupOfflineSync(callback?: (status: 'online' | 'offline') => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleOnline = () => {
    callback?.('online')
    syncOfflineQueue()
  }

  const handleOffline = () => {
    callback?.('offline')
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

// Clear all cached data
export function clearOfflineData(userId?: string): void {
  if (typeof window === 'undefined') return

  localStorage.removeItem(OFFLINE_QUEUE_KEY)
  localStorage.removeItem(LAST_SYNC_KEY)

  if (userId) {
    localStorage.removeItem(`${ENTRIES_CACHE_KEY}_${userId}`)
  }
}

// Get sync status
export function getSyncStatus(): {
  pendingActions: number
  lastSync: Date | null
  isOnline: boolean
} {
  return {
    pendingActions: getOfflineQueue().length,
    lastSync: getLastSyncTime() ? new Date(getLastSyncTime()!) : null,
    isOnline: isOnline(),
  }
}
