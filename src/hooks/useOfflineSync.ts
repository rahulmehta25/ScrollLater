'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  isOnline,
  setupOfflineSync,
  syncOfflineQueue,
  getSyncStatus,
  getCachedEntries,
  cacheEntries,
  applyOptimisticCreate,
  applyOptimisticUpdate,
  applyOptimisticDelete,
  queueOfflineAction,
} from '@/lib/offline'
import {
  getEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  type Entry,
  type EntryInsert,
  type EntryUpdate,
  type EntryFilters,
} from '@/services/api'

type SyncState = {
  isOnline: boolean
  isSyncing: boolean
  pendingActions: number
  lastSync: Date | null
  error: string | null
}

export function useOfflineSync() {
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: true,
    isSyncing: false,
    pendingActions: 0,
    lastSync: null,
    error: null,
  })

  // Update sync state
  const updateSyncState = useCallback(() => {
    const status = getSyncStatus()
    setSyncState(prev => ({
      ...prev,
      isOnline: status.isOnline,
      pendingActions: status.pendingActions,
      lastSync: status.lastSync,
    }))
  }, [])

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!isOnline()) return

    setSyncState(prev => ({ ...prev, isSyncing: true, error: null }))

    try {
      const result = await syncOfflineQueue()

      if (!result.success) {
        setSyncState(prev => ({
          ...prev,
          error: result.errors.join(', '),
        }))
      }
    } catch (err) {
      setSyncState(prev => ({
        ...prev,
        error: String(err),
      }))
    } finally {
      setSyncState(prev => ({ ...prev, isSyncing: false }))
      updateSyncState()
    }
  }, [updateSyncState])

  // Setup listeners
  useEffect(() => {
    updateSyncState()

    const cleanup = setupOfflineSync((status) => {
      setSyncState(prev => ({ ...prev, isOnline: status === 'online' }))
      if (status === 'online') {
        triggerSync()
      }
    })

    return cleanup
  }, [updateSyncState, triggerSync])

  return {
    ...syncState,
    triggerSync,
    hasPendingChanges: syncState.pendingActions > 0,
  }
}

export function useOfflineEntries(filters: EntryFilters = {}) {
  const { user } = useAuth()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load entries (from cache or server)
  const loadEntries = useCallback(async () => {
    if (!user) {
      setEntries([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // Try to load from cache first
    const cached = getCachedEntries(user.id)
    if (cached.length > 0) {
      setEntries(cached)
    }

    // If online, fetch from server
    if (isOnline()) {
      const result = await getEntries(user.id, filters)

      if (result.error) {
        setError(result.error.message)
        // Fall back to cache if available
        if (cached.length === 0) {
          setEntries([])
        }
      } else {
        setEntries(result.data)
        cacheEntries(user.id, result.data)
      }
    } else if (cached.length === 0) {
      setError('You are offline and no cached data is available')
    }

    setLoading(false)
  }, [user, filters])

  // Create entry with optimistic update
  const create = useCallback(async (entry: EntryInsert): Promise<Entry | null> => {
    if (!user) return null

    // Apply optimistic update
    const optimisticEntry = applyOptimisticCreate(user.id, entry)
    setEntries(prev => [optimisticEntry, ...prev])

    if (!isOnline()) {
      // Queue for later sync
      queueOfflineAction({
        type: 'create',
        table: 'entries',
        data: entry as unknown as Record<string, unknown>,
      })
      return optimisticEntry
    }

    // Try to create on server
    const result = await createEntry(entry)

    if (result.error) {
      // Update cache with temp entry still (will sync later)
      queueOfflineAction({
        type: 'create',
        table: 'entries',
        data: entry as unknown as Record<string, unknown>,
      })
      return optimisticEntry
    }

    // Replace temp entry with real one
    setEntries(prev => prev.map(e =>
      e.id === optimisticEntry.id ? result.data : e
    ))
    cacheEntries(user.id, entries.map(e =>
      e.id === optimisticEntry.id ? result.data : e
    ))

    return result.data
  }, [user, entries])

  // Update entry with optimistic update
  const update = useCallback(async (entryId: string, updates: EntryUpdate): Promise<Entry | null> => {
    if (!user) return null

    // Find original entry for potential rollback
    const original = entries.find(e => e.id === entryId)
    if (!original) return null

    // Apply optimistic update
    const optimisticEntry = applyOptimisticUpdate(user.id, entryId, updates)
    if (optimisticEntry) {
      setEntries(prev => prev.map(e => e.id === entryId ? optimisticEntry : e))
    }

    if (!isOnline()) {
      queueOfflineAction({
        type: 'update',
        table: 'entries',
        data: { id: entryId, ...updates } as Record<string, unknown>,
      })
      return optimisticEntry
    }

    const result = await updateEntry(entryId, updates)

    if (result.error) {
      queueOfflineAction({
        type: 'update',
        table: 'entries',
        data: { id: entryId, ...updates } as Record<string, unknown>,
      })
      return optimisticEntry
    }

    setEntries(prev => prev.map(e => e.id === entryId ? result.data : e))
    cacheEntries(user.id, entries.map(e => e.id === entryId ? result.data : e))

    return result.data
  }, [user, entries])

  // Delete entry with optimistic update
  const remove = useCallback(async (entryId: string): Promise<boolean> => {
    if (!user) return false

    // Store original for potential rollback
    const original = entries.find(e => e.id === entryId)
    if (!original) return false

    // Apply optimistic delete
    applyOptimisticDelete(user.id, entryId)
    setEntries(prev => prev.filter(e => e.id !== entryId))

    if (!isOnline()) {
      queueOfflineAction({
        type: 'delete',
        table: 'entries',
        data: { id: entryId },
      })
      return true
    }

    const result = await deleteEntry(entryId)

    if (result.error) {
      // Rollback
      setEntries(prev => [...prev, original])
      cacheEntries(user.id, [...entries.filter(e => e.id !== entryId), original])
      return false
    }

    cacheEntries(user.id, entries.filter(e => e.id !== entryId))
    return true
  }, [user, entries])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  return {
    entries,
    loading,
    error,
    refresh: loadEntries,
    create,
    update,
    remove,
  }
}
