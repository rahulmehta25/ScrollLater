import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Supabase mock — declared at module scope so vi.mock hoisting works correctly
// ---------------------------------------------------------------------------
const mockIsSupabaseConfigured = vi.fn(() => true)
const mockCreateSupabaseClient = vi.fn()

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => mockIsSupabaseConfigured(),
  createSupabaseClient: () => mockCreateSupabaseClient(),
}))

// ---------------------------------------------------------------------------
// In-memory localStorage mock
// ---------------------------------------------------------------------------
function createLocalStorageMock() {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get length() { return Object.keys(store).length },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  }
}

// ---------------------------------------------------------------------------
// Constants matching source file
// ---------------------------------------------------------------------------
const OFFLINE_QUEUE_KEY = 'scrolllater_offline_queue'
const ENTRIES_CACHE_KEY = 'scrolllater_entries_cache'
const LAST_SYNC_KEY = 'scrolllater_last_sync'

// ---------------------------------------------------------------------------
// Helper — build a minimal valid Entry-shaped object
// ---------------------------------------------------------------------------
function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'entry-1',
    user_id: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    url: 'https://example.com',
    title: 'Test entry',
    content: null,
    original_input: 'https://example.com',
    ai_summary: null,
    ai_category: null,
    ai_tags: [],
    ai_confidence_score: null,
    ai_schedule_suggestions: null,
    user_category: null,
    user_tags: [],
    user_notes: null,
    priority: 3,
    status: 'inbox',
    scheduled_for: null,
    completed_at: null,
    calendar_event_id: null,
    calendar_event_url: null,
    source: 'web',
    metadata: {},
    search_vector: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Helper — build a chainable Supabase mock
// ---------------------------------------------------------------------------
function makeSupabaseMock(error: { message: string } | null = null) {
  const chain = {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error }),
  }
  return { from: vi.fn(() => chain), _chain: chain }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('offline.ts', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>
  // Import the module once and reuse — avoids issues with resetModules + vi.mock
  let offline: typeof import('@/lib/offline')

  beforeEach(async () => {
    // Fresh localStorage
    localStorageMock = createLocalStorageMock()
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    })

    // Stable UUID
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      'test-uuid-1234-1234-1234-123456789012' as ReturnType<typeof crypto.randomUUID>
    )

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-01T12:00:00Z'))

    // Reset supabase mocks to safe defaults
    mockIsSupabaseConfigured.mockReturnValue(true)
    mockCreateSupabaseClient.mockReturnValue(makeSupabaseMock(null))

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })

    // Import the module (cached after first run — that's fine; we reset mocks above)
    offline = await import('@/lib/offline')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // isOnline
  // -------------------------------------------------------------------------
  describe('isOnline', () => {
    it('returns true when navigator.onLine is true', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
      expect(offline.isOnline()).toBe(true)
    })

    it('returns false when navigator.onLine is false', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
      expect(offline.isOnline()).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // getOfflineQueue
  // -------------------------------------------------------------------------
  describe('getOfflineQueue', () => {
    it('returns an empty array when localStorage has no queue key', () => {
      expect(offline.getOfflineQueue()).toEqual([])
    })

    it('parses and returns the stored queue', () => {
      const queue = [
        { id: 'a', type: 'create', table: 'entries', data: {}, timestamp: 1000, retries: 0 },
      ]
      localStorageMock.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
      expect(offline.getOfflineQueue()).toEqual(queue)
    })

    it('throws when localStorage contains corrupt JSON', () => {
      localStorageMock.setItem(OFFLINE_QUEUE_KEY, '{corrupt}')
      expect(() => offline.getOfflineQueue()).toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // queueOfflineAction
  // -------------------------------------------------------------------------
  describe('queueOfflineAction', () => {
    it('adds an action with generated id, current timestamp, and retries=0', () => {
      offline.queueOfflineAction({ type: 'create', table: 'entries', data: { url: 'https://test.com' } })

      const queue = offline.getOfflineQueue()
      expect(queue).toHaveLength(1)
      expect(queue[0].id).toBe('test-uuid-1234-1234-1234-123456789012')
      expect(queue[0].timestamp).toBe(new Date('2024-06-01T12:00:00Z').getTime())
      expect(queue[0].retries).toBe(0)
      expect(queue[0].type).toBe('create')
      expect(queue[0].data).toEqual({ url: 'https://test.com' })
    })

    it('persists the action to localStorage', () => {
      offline.queueOfflineAction({ type: 'delete', table: 'entries', data: { id: '123' } })
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        OFFLINE_QUEUE_KEY,
        expect.stringContaining('"type":"delete"')
      )
    })

    it('appends to an existing queue', () => {
      const existing = [
        { id: 'existing-1', type: 'update', table: 'entries', data: {}, timestamp: 999, retries: 0 },
      ]
      localStorageMock.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(existing))

      offline.queueOfflineAction({ type: 'create', table: 'entries', data: {} })
      expect(offline.getOfflineQueue()).toHaveLength(2)
    })
  })

  // -------------------------------------------------------------------------
  // removeFromQueue
  // -------------------------------------------------------------------------
  describe('removeFromQueue', () => {
    it('removes the action with the specified id', () => {
      const queue = [
        { id: 'keep', type: 'create', table: 'entries', data: {}, timestamp: 1, retries: 0 },
        { id: 'remove-me', type: 'delete', table: 'entries', data: {}, timestamp: 2, retries: 0 },
      ]
      localStorageMock.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))

      offline.removeFromQueue('remove-me')

      const remaining = offline.getOfflineQueue()
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe('keep')
    })

    it('is a no-op when the id does not exist', () => {
      const queue = [
        { id: 'only', type: 'create', table: 'entries', data: {}, timestamp: 1, retries: 0 },
      ]
      localStorageMock.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))

      offline.removeFromQueue('nonexistent')
      expect(offline.getOfflineQueue()).toHaveLength(1)
    })
  })

  // -------------------------------------------------------------------------
  // cacheEntries / getCachedEntries
  // -------------------------------------------------------------------------
  describe('cacheEntries and getCachedEntries', () => {
    it('writes entries and reads them back', () => {
      const entries = [makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' })]
      offline.cacheEntries('user-1', entries as never)
      const result = offline.getCachedEntries('user-1')
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('e1')
      expect(result[1].id).toBe('e2')
    })

    it('stores under the user-scoped key', () => {
      offline.cacheEntries('user-42', [])
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `${ENTRIES_CACHE_KEY}_user-42`,
        '[]'
      )
    })

    it('updates the last sync timestamp when caching', () => {
      offline.cacheEntries('user-1', [])
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        LAST_SYNC_KEY,
        String(new Date('2024-06-01T12:00:00Z').getTime())
      )
    })

    it('returns empty array for unknown user', () => {
      expect(offline.getCachedEntries('unknown-user')).toEqual([])
    })

    it('keeps caches isolated per user', () => {
      offline.cacheEntries('user-A', [makeEntry({ id: 'A' })] as never)
      offline.cacheEntries('user-B', [makeEntry({ id: 'B' }), makeEntry({ id: 'B2' })] as never)

      expect(offline.getCachedEntries('user-A')).toHaveLength(1)
      expect(offline.getCachedEntries('user-B')).toHaveLength(2)
    })
  })

  // -------------------------------------------------------------------------
  // getLastSyncTime
  // -------------------------------------------------------------------------
  describe('getLastSyncTime', () => {
    it('returns null when no sync has occurred', () => {
      expect(offline.getLastSyncTime()).toBeNull()
    })

    it('returns the stored timestamp as a number', () => {
      const ts = new Date('2024-06-01T12:00:00Z').getTime()
      localStorageMock.setItem(LAST_SYNC_KEY, String(ts))
      expect(offline.getLastSyncTime()).toBe(ts)
    })
  })

  // -------------------------------------------------------------------------
  // clearOfflineData
  // -------------------------------------------------------------------------
  describe('clearOfflineData', () => {
    it('removes the queue and last-sync keys', () => {
      localStorageMock.setItem(OFFLINE_QUEUE_KEY, '[]')
      localStorageMock.setItem(LAST_SYNC_KEY, '12345')

      offline.clearOfflineData()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(OFFLINE_QUEUE_KEY)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(LAST_SYNC_KEY)
    })

    it('also removes the user-scoped cache when userId is provided', () => {
      offline.clearOfflineData('user-99')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        `${ENTRIES_CACHE_KEY}_user-99`
      )
    })

    it('does not remove the user cache when userId is omitted', () => {
      offline.clearOfflineData()
      const removedKeys = localStorageMock.removeItem.mock.calls.map(c => c[0])
      expect(removedKeys.some((k: string) => k.includes(ENTRIES_CACHE_KEY))).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // getSyncStatus
  // -------------------------------------------------------------------------
  describe('getSyncStatus', () => {
    it('reports zero pending actions when queue is empty', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
      const status = offline.getSyncStatus()
      expect(status.pendingActions).toBe(0)
      expect(status.lastSync).toBeNull()
      expect(status.isOnline).toBe(true)
    })

    it('counts pending actions correctly', () => {
      const queue = [
        { id: '1', type: 'create', table: 'entries', data: {}, timestamp: 1, retries: 0 },
        { id: '2', type: 'delete', table: 'entries', data: {}, timestamp: 2, retries: 0 },
      ]
      localStorageMock.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
      expect(offline.getSyncStatus().pendingActions).toBe(2)
    })

    it('returns lastSync as a Date when a sync timestamp exists', () => {
      const ts = new Date('2024-05-15T08:00:00Z').getTime()
      localStorageMock.setItem(LAST_SYNC_KEY, String(ts))
      const status = offline.getSyncStatus()
      expect(status.lastSync).toBeInstanceOf(Date)
      expect(status.lastSync!.getTime()).toBe(ts)
    })

    it('reflects offline status', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
      expect(offline.getSyncStatus().isOnline).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // applyOptimisticCreate
  // -------------------------------------------------------------------------
  describe('applyOptimisticCreate', () => {
    it('prepends a new temporary entry to the cached list', () => {
      const existing = [makeEntry({ id: 'existing' })]
      localStorageMock.setItem(`${ENTRIES_CACHE_KEY}_user-1`, JSON.stringify(existing))

      const result = offline.applyOptimisticCreate('user-1', {
        user_id: 'user-1',
        original_input: 'https://example.com',
        url: 'https://example.com',
        title: 'New entry',
        content: '',
      })

      expect(result.id).toMatch(/^temp_/)
      expect(result.title).toBe('New entry')
      expect(result.status).toBe('inbox')
    })

    it('saves the updated cache to localStorage', () => {
      offline.applyOptimisticCreate('user-1', {
        user_id: 'user-1',
        original_input: 'test',
        content: '',
      })
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `${ENTRIES_CACHE_KEY}_user-1`,
        expect.stringContaining('temp_')
      )
    })

    it('sets sensible defaults for optional fields', () => {
      const entry = offline.applyOptimisticCreate('user-1', {
        user_id: 'user-1',
        original_input: 'test',
        content: '',
      })
      expect(entry.priority).toBe(3)
      expect(entry.source).toBe('web')
      expect(entry.ai_tags).toEqual([])
      expect(entry.user_tags).toEqual([])
    })
  })

  // -------------------------------------------------------------------------
  // applyOptimisticUpdate
  // -------------------------------------------------------------------------
  describe('applyOptimisticUpdate', () => {
    it('updates the matching entry in the cache', () => {
      const entries = [makeEntry({ id: 'e1', title: 'Old title' })]
      localStorageMock.setItem(`${ENTRIES_CACHE_KEY}_user-1`, JSON.stringify(entries))

      const updated = offline.applyOptimisticUpdate('user-1', 'e1', { title: 'New title' })
      expect(updated).not.toBeNull()
      expect(updated!.title).toBe('New title')
      expect(updated!.id).toBe('e1')
    })

    it('bumps updated_at to the current time', () => {
      const entries = [makeEntry({ id: 'e1', updated_at: '2020-01-01T00:00:00Z' })]
      localStorageMock.setItem(`${ENTRIES_CACHE_KEY}_user-1`, JSON.stringify(entries))

      const updated = offline.applyOptimisticUpdate('user-1', 'e1', { title: 'Changed' })
      expect(updated!.updated_at).toBe(new Date('2024-06-01T12:00:00Z').toISOString())
    })

    it('returns null when the entry id is not found', () => {
      localStorageMock.setItem(
        `${ENTRIES_CACHE_KEY}_user-1`,
        JSON.stringify([makeEntry()])
      )
      expect(offline.applyOptimisticUpdate('user-1', 'does-not-exist', { title: 'x' })).toBeNull()
    })

    it('persists changes to localStorage', () => {
      const entries = [makeEntry({ id: 'e1' })]
      localStorageMock.setItem(`${ENTRIES_CACHE_KEY}_user-1`, JSON.stringify(entries))

      offline.applyOptimisticUpdate('user-1', 'e1', { status: 'completed' })
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `${ENTRIES_CACHE_KEY}_user-1`,
        expect.stringContaining('"status":"completed"')
      )
    })
  })

  // -------------------------------------------------------------------------
  // applyOptimisticDelete
  // -------------------------------------------------------------------------
  describe('applyOptimisticDelete', () => {
    it('removes the entry and returns true', () => {
      const entries = [makeEntry({ id: 'del' }), makeEntry({ id: 'keep' })]
      localStorageMock.setItem(`${ENTRIES_CACHE_KEY}_user-1`, JSON.stringify(entries))

      const result = offline.applyOptimisticDelete('user-1', 'del')
      expect(result).toBe(true)

      const remaining = offline.getCachedEntries('user-1')
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe('keep')
    })

    it('returns false when the entry is not found', () => {
      const entries = [makeEntry({ id: 'e1' })]
      localStorageMock.setItem(`${ENTRIES_CACHE_KEY}_user-1`, JSON.stringify(entries))
      expect(offline.applyOptimisticDelete('user-1', 'nonexistent')).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // rollbackOptimisticUpdate
  // -------------------------------------------------------------------------
  describe('rollbackOptimisticUpdate', () => {
    it('restores the original entry at its index', () => {
      const original = makeEntry({ id: 'e1', title: 'Original title' })
      const modified = [makeEntry({ id: 'e1', title: 'Temporarily changed' })]
      localStorageMock.setItem(`${ENTRIES_CACHE_KEY}_user-1`, JSON.stringify(modified))

      offline.rollbackOptimisticUpdate('user-1', 'e1', original as never)
      expect(offline.getCachedEntries('user-1')[0].title).toBe('Original title')
    })

    it('is a no-op when the entry does not exist in the cache', () => {
      const entries = [makeEntry({ id: 'other' })]
      localStorageMock.setItem(`${ENTRIES_CACHE_KEY}_user-1`, JSON.stringify(entries))

      offline.rollbackOptimisticUpdate('user-1', 'missing', makeEntry({ id: 'missing' }) as never)

      const cached = offline.getCachedEntries('user-1')
      expect(cached).toHaveLength(1)
      expect(cached[0].id).toBe('other')
    })
  })

  // -------------------------------------------------------------------------
  // setupOfflineSync
  // -------------------------------------------------------------------------
  describe('setupOfflineSync', () => {
    it('registers online and offline event listeners and returns a cleanup fn', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      const removeSpy = vi.spyOn(window, 'removeEventListener')

      const cleanup = offline.setupOfflineSync()

      expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(addSpy).toHaveBeenCalledWith('offline', expect.any(Function))

      cleanup()

      expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    })

    it('calls the callback with "offline" when an offline event fires', () => {
      const callback = vi.fn()
      const cleanup = offline.setupOfflineSync(callback)

      window.dispatchEvent(new Event('offline'))
      expect(callback).toHaveBeenCalledWith('offline')

      cleanup()
    })
  })

  // -------------------------------------------------------------------------
  // syncOfflineQueue
  // -------------------------------------------------------------------------
  describe('syncOfflineQueue', () => {
    it('returns early with success=false when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
      const result = await offline.syncOfflineQueue()
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Offline or Supabase not configured')
    })

    it('returns early with success=false when Supabase is not configured', async () => {
      mockIsSupabaseConfigured.mockReturnValue(false)
      const result = await offline.syncOfflineQueue()
      expect(result.success).toBe(false)
    })

    it('returns success=true with synced=0 when queue is empty', async () => {
      const result = await offline.syncOfflineQueue()
      expect(result.success).toBe(true)
      expect(result.synced).toBe(0)
    })

    it('processes a create action successfully and removes it from the queue', async () => {
      const queue = [
        { id: 'a1', type: 'create', table: 'entries', data: { url: 'https://t.com' }, timestamp: 1, retries: 0 },
      ]
      localStorageMock.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))

      const supabaseMock = makeSupabaseMock(null)
      mockCreateSupabaseClient.mockReturnValue(supabaseMock)

      const result = await offline.syncOfflineQueue()

      expect(result.synced).toBe(1)
      expect(result.failed).toBe(0)
      expect(offline.getOfflineQueue()).toHaveLength(0)
    })

    it('increments retries on failure and keeps action in queue if under threshold', async () => {
      const queue = [
        { id: 'b1', type: 'create', table: 'entries', data: {}, timestamp: 1, retries: 0 },
      ]
      localStorageMock.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))

      const supabaseMock = makeSupabaseMock({ message: 'network error' })
      mockCreateSupabaseClient.mockReturnValue(supabaseMock)

      await offline.syncOfflineQueue()

      const remaining = offline.getOfflineQueue()
      expect(remaining).toHaveLength(1)
      expect(remaining[0].retries).toBe(1)
    })

    it('filters out actions that have reached 3 retries', async () => {
      // At retries=2, one more failure brings it to 3 — should be dropped
      const queue = [
        { id: 'c1', type: 'delete', table: 'entries', data: { id: 'e1' }, timestamp: 1, retries: 2 },
      ]
      localStorageMock.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))

      const supabaseMock = makeSupabaseMock({ message: 'server error' })
      mockCreateSupabaseClient.mockReturnValue(supabaseMock)

      const result = await offline.syncOfflineQueue()

      expect(result.failed).toBe(1)
      expect(offline.getOfflineQueue()).toHaveLength(0)
    })

    it('saves retries on the in-memory queue reference, not a re-read from localStorage (bug-fix)', async () => {
      // This verifies the fix: the source mutates `action.retries` on the in-memory
      // queue array and saves that same reference — it does NOT re-read localStorage
      // to build the saved queue.
      const queue = [
        { id: 'd1', type: 'update', table: 'entries', data: { id: 'e1', title: 'x' }, timestamp: 1, retries: 0 },
      ]
      localStorageMock.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))

      // After the first getOfflineQueue() call in syncOfflineQueue, subsequent reads
      // would return stale retries=0 data — but the code must NOT re-read.
      let readCount = 0
      const originalGetItem = localStorageMock.getItem.getMockImplementation()
      localStorageMock.getItem.mockImplementation(((key: string): string | null => {
        if (key === OFFLINE_QUEUE_KEY) {
          if (readCount++ > 0) {
            // Return queue with retries=0 to simulate stale external state
            return JSON.stringify([{ ...queue[0], retries: 0 }])
          }
        }
        return originalGetItem ? originalGetItem(key) : null
      }) as (key: string) => string)

      const supabaseMock = makeSupabaseMock({ message: 'error' })
      mockCreateSupabaseClient.mockReturnValue(supabaseMock)

      await offline.syncOfflineQueue()

      // The persisted queue must contain the mutated retries=1, not the re-read retries=0
      const saveCallArgs = localStorageMock.setItem.mock.calls
        .filter(c => c[0] === OFFLINE_QUEUE_KEY)
        .at(-1)

      expect(saveCallArgs).toBeDefined()
      const savedQueue = JSON.parse(saveCallArgs![1] as string)
      expect(savedQueue[0].retries).toBe(1)
    })

    it('processes a delete action successfully', async () => {
      const queue = [
        { id: 'e1', type: 'delete', table: 'entries', data: { id: 'entry-to-delete' }, timestamp: 1, retries: 0 },
      ]
      localStorageMock.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))

      const supabaseMock = makeSupabaseMock(null)
      mockCreateSupabaseClient.mockReturnValue(supabaseMock)

      const result = await offline.syncOfflineQueue()
      expect(result.synced).toBe(1)
      expect(supabaseMock._chain.delete).toHaveBeenCalled()
    })

    it('processes an update action successfully', async () => {
      const queue = [
        { id: 'f1', type: 'update', table: 'entries', data: { id: 'entry-1', title: 'Updated' }, timestamp: 1, retries: 0 },
      ]
      localStorageMock.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))

      const supabaseMock = makeSupabaseMock(null)
      mockCreateSupabaseClient.mockReturnValue(supabaseMock)

      const result = await offline.syncOfflineQueue()
      expect(result.synced).toBe(1)
      expect(supabaseMock._chain.update).toHaveBeenCalled()
    })

    it('handles thrown exceptions by incrementing retries and recording the error', async () => {
      const queue = [
        { id: 'g1', type: 'create', table: 'entries', data: {}, timestamp: 1, retries: 0 },
      ]
      localStorageMock.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))

      const throwingChain = {
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockRejectedValue(new Error('network crash')),
      }
      mockCreateSupabaseClient.mockReturnValue({ from: vi.fn(() => throwingChain) })

      const result = await offline.syncOfflineQueue()

      expect(result.errors.some(e => e.includes('network crash'))).toBe(true)
      const remaining = offline.getOfflineQueue()
      expect(remaining[0].retries).toBe(1)
    })

    it('reports success=false when any action permanently failed', async () => {
      const queue = [
        { id: 'h1', type: 'create', table: 'entries', data: {}, timestamp: 1, retries: 2 },
      ]
      localStorageMock.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))

      const supabaseMock = makeSupabaseMock({ message: 'permanent error' })
      mockCreateSupabaseClient.mockReturnValue(supabaseMock)

      const result = await offline.syncOfflineQueue()
      expect(result.success).toBe(false)
    })
  })
})
