/**
 * Advanced caching strategies for browser, API, and assets
 */

interface CacheConfig {
  name: string
  version: number
  maxAge: number
  maxEntries?: number
  strategies: {
    [key: string]: CacheStrategy
  }
}

interface CacheStrategy {
  type: 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only' | 'cache-only'
  maxAge?: number
  maxEntries?: number
  cacheName?: string
}

interface CacheEntry<T = any> {
  data: T
  timestamp: number
  etag?: string
  expires?: number
}

// Cache configurations
const CACHE_CONFIG: CacheConfig = {
  name: 'scrolllater-cache',
  version: 1,
  maxAge: 86400000, // 24 hours
  strategies: {
    // API endpoints
    '/api/entries': {
      type: 'stale-while-revalidate',
      maxAge: 300000, // 5 minutes
      cacheName: 'api-entries'
    },
    '/api/ai/analyze': {
      type: 'cache-first',
      maxAge: 3600000, // 1 hour
      cacheName: 'api-ai'
    },
    '/api/user': {
      type: 'network-first',
      maxAge: 600000, // 10 minutes
      cacheName: 'api-user'
    },
    // Static assets
    '/images': {
      type: 'cache-first',
      maxAge: 604800000, // 7 days
      cacheName: 'static-images'
    },
    '/fonts': {
      type: 'cache-first',
      maxAge: 2592000000, // 30 days
      cacheName: 'static-fonts'
    },
    '/styles': {
      type: 'stale-while-revalidate',
      maxAge: 86400000, // 24 hours
      cacheName: 'static-styles'
    },
    '/scripts': {
      type: 'stale-while-revalidate',
      maxAge: 86400000, // 24 hours
      cacheName: 'static-scripts'
    }
  }
}

class CacheManager {
  private memoryCache = new Map<string, CacheEntry>()
  private cacheConfig = CACHE_CONFIG
  private dbName = 'ScrollLaterCache'
  private dbVersion = 1
  private db: IDBDatabase | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeIndexedDB()
      this.setupCacheHeaders()
      this.cleanupOldCaches()
    }
  }

  /**
   * Initialize IndexedDB for persistent caching
   */
  private async initializeIndexedDB(): Promise<void> {
    if (!('indexedDB' in window)) return

    try {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        console.error('[CacheManager] Failed to open IndexedDB')
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('[CacheManager] IndexedDB initialized')
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create object stores for different cache types
        if (!db.objectStoreNames.contains('api')) {
          db.createObjectStore('api', { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains('assets')) {
          db.createObjectStore('assets', { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains('data')) {
          db.createObjectStore('data', { keyPath: 'key' })
        }
      }
    } catch (error) {
      console.error('[CacheManager] IndexedDB initialization failed:', error)
    }
  }

  /**
   * Get cache strategy for a URL
   */
  private getStrategy(url: string): CacheStrategy {
    for (const [pattern, strategy] of Object.entries(this.cacheConfig.strategies)) {
      if (url.includes(pattern)) {
        return strategy
      }
    }
    return { type: 'network-first' }
  }

  /**
   * Memory cache operations
   */
  async getFromMemory<T>(key: string): Promise<T | null> {
    const entry = this.memoryCache.get(key)
    
    if (!entry) return null
    
    // Check if expired
    if (entry.expires && Date.now() > entry.expires) {
      this.memoryCache.delete(key)
      return null
    }
    
    return entry.data as T
  }

  setInMemory<T>(key: string, data: T, maxAge?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expires: maxAge ? Date.now() + maxAge : undefined
    }
    
    this.memoryCache.set(key, entry)
    
    // Limit memory cache size
    if (this.memoryCache.size > 100) {
      const firstKey = this.memoryCache.keys().next().value
      this.memoryCache.delete(firstKey)
    }
  }

  /**
   * IndexedDB cache operations
   */
  async getFromDB<T>(storeName: string, key: string): Promise<T | null> {
    if (!this.db) return null

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.get(key)

        request.onsuccess = () => {
          const result = request.result
          if (!result) {
            resolve(null)
            return
          }

          // Check if expired
          if (result.expires && Date.now() > result.expires) {
            this.deleteFromDB(storeName, key)
            resolve(null)
            return
          }

          resolve(result.data)
        }

        request.onerror = () => {
          console.error('[CacheManager] Failed to get from IndexedDB')
          resolve(null)
        }
      } catch (error) {
        console.error('[CacheManager] IndexedDB get error:', error)
        resolve(null)
      }
    })
  }

  async setInDB<T>(storeName: string, key: string, data: T, maxAge?: number): Promise<void> {
    if (!this.db) return

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)
        
        const entry = {
          key,
          data,
          timestamp: Date.now(),
          expires: maxAge ? Date.now() + maxAge : undefined
        }

        const request = store.put(entry)

        request.onsuccess = () => {
          resolve()
        }

        request.onerror = () => {
          console.error('[CacheManager] Failed to set in IndexedDB')
          resolve()
        }
      } catch (error) {
        console.error('[CacheManager] IndexedDB set error:', error)
        resolve()
      }
    })
  }

  async deleteFromDB(storeName: string, key: string): Promise<void> {
    if (!this.db) return

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.delete(key)

        request.onsuccess = () => resolve()
        request.onerror = () => {
          console.error('[CacheManager] Failed to delete from IndexedDB')
          resolve()
        }
      } catch (error) {
        console.error('[CacheManager] IndexedDB delete error:', error)
        resolve()
      }
    })
  }

  /**
   * HTTP cache operations with strategies
   */
  async fetch(url: string, options?: RequestInit): Promise<Response> {
    const strategy = this.getStrategy(url)
    const cacheKey = this.getCacheKey(url, options)

    switch (strategy.type) {
      case 'cache-first':
        return this.cacheFirst(url, options, cacheKey, strategy)
      
      case 'network-first':
        return this.networkFirst(url, options, cacheKey, strategy)
      
      case 'stale-while-revalidate':
        return this.staleWhileRevalidate(url, options, cacheKey, strategy)
      
      case 'cache-only':
        return this.cacheOnly(cacheKey, strategy)
      
      case 'network-only':
      default:
        return fetch(url, options)
    }
  }

  private async cacheFirst(
    url: string,
    options: RequestInit | undefined,
    cacheKey: string,
    strategy: CacheStrategy
  ): Promise<Response> {
    // Check memory cache
    const memoryData = await this.getFromMemory<Response>(cacheKey)
    if (memoryData) {
      console.log('[CacheManager] Cache hit (memory):', url)
      return memoryData
    }

    // Check IndexedDB
    const dbData = await this.getFromDB<any>('api', cacheKey)
    if (dbData) {
      console.log('[CacheManager] Cache hit (IndexedDB):', url)
      return new Response(JSON.stringify(dbData), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Fetch from network
    try {
      const response = await fetch(url, options)
      if (response.ok) {
        const data = await response.clone().json()
        
        // Cache the response
        this.setInMemory(cacheKey, response.clone(), strategy.maxAge)
        await this.setInDB('api', cacheKey, data, strategy.maxAge)
        
        console.log('[CacheManager] Cached response:', url)
      }
      return response
    } catch (error) {
      console.error('[CacheManager] Network request failed:', error)
      throw error
    }
  }

  private async networkFirst(
    url: string,
    options: RequestInit | undefined,
    cacheKey: string,
    strategy: CacheStrategy
  ): Promise<Response> {
    try {
      const response = await fetch(url, options)
      
      if (response.ok) {
        const data = await response.clone().json()
        
        // Update cache
        this.setInMemory(cacheKey, response.clone(), strategy.maxAge)
        await this.setInDB('api', cacheKey, data, strategy.maxAge)
      }
      
      return response
    } catch (error) {
      console.warn('[CacheManager] Network failed, checking cache:', url)
      
      // Fallback to cache
      const memoryData = await this.getFromMemory<Response>(cacheKey)
      if (memoryData) return memoryData

      const dbData = await this.getFromDB<any>('api', cacheKey)
      if (dbData) {
        return new Response(JSON.stringify(dbData), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      throw error
    }
  }

  private async staleWhileRevalidate(
    url: string,
    options: RequestInit | undefined,
    cacheKey: string,
    strategy: CacheStrategy
  ): Promise<Response> {
    // Return cached data immediately
    const cachedData = await this.getFromMemory<Response>(cacheKey) ||
                      await this.getFromDB<any>('api', cacheKey)

    if (cachedData) {
      console.log('[CacheManager] Serving stale cache:', url)
      
      // Revalidate in background
      fetch(url, options).then(async (response) => {
        if (response.ok) {
          const data = await response.clone().json()
          this.setInMemory(cacheKey, response.clone(), strategy.maxAge)
          await this.setInDB('api', cacheKey, data, strategy.maxAge)
          console.log('[CacheManager] Cache revalidated:', url)
        }
      }).catch(console.error)

      return cachedData instanceof Response 
        ? cachedData 
        : new Response(JSON.stringify(cachedData), {
            headers: { 'Content-Type': 'application/json' }
          })
    }

    // No cache, fetch from network
    const response = await fetch(url, options)
    if (response.ok) {
      const data = await response.clone().json()
      this.setInMemory(cacheKey, response.clone(), strategy.maxAge)
      await this.setInDB('api', cacheKey, data, strategy.maxAge)
    }
    
    return response
  }

  private async cacheOnly(
    cacheKey: string,
    strategy: CacheStrategy
  ): Promise<Response> {
    const cachedData = await this.getFromMemory<Response>(cacheKey) ||
                      await this.getFromDB<any>('api', cacheKey)

    if (cachedData) {
      return cachedData instanceof Response 
        ? cachedData 
        : new Response(JSON.stringify(cachedData), {
            headers: { 'Content-Type': 'application/json' }
          })
    }

    throw new Error('No cached data available')
  }

  /**
   * Generate cache key
   */
  private getCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET'
    const body = options?.body ? JSON.stringify(options.body) : ''
    return `${method}:${url}:${body}`
  }

  /**
   * Setup cache headers for responses
   */
  private setupCacheHeaders(): void {
    // This would typically be done on the server side
    // But we can intercept fetch to add client-side caching hints
    const originalFetch = window.fetch

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init)
      
      // Add cache control headers based on content type
      const contentType = response.headers.get('content-type')
      const url = typeof input === 'string' ? input : input.toString()

      if (contentType?.includes('image')) {
        // Images: cache for 7 days
        Object.defineProperty(response.headers, 'cache-control', {
          value: 'public, max-age=604800'
        })
      } else if (url.includes('/api/')) {
        // API responses: cache based on endpoint
        const strategy = this.getStrategy(url)
        if (strategy.maxAge) {
          Object.defineProperty(response.headers, 'cache-control', {
            value: `private, max-age=${Math.floor(strategy.maxAge / 1000)}`
          })
        }
      }

      return response
    }
  }

  /**
   * Clear old caches
   */
  private async cleanupOldCaches(): Promise<void> {
    if (!this.db) return

    const now = Date.now()
    const stores = ['api', 'assets', 'data']

    for (const storeName of stores) {
      try {
        const transaction = this.db.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.openCursor()

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result
          if (cursor) {
            const entry = cursor.value
            if (entry.expires && now > entry.expires) {
              cursor.delete()
              console.log(`[CacheManager] Deleted expired entry: ${entry.key}`)
            }
            cursor.continue()
          }
        }
      } catch (error) {
        console.error(`[CacheManager] Cleanup error for ${storeName}:`, error)
      }
    }

    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expires && now > entry.expires) {
        this.memoryCache.delete(key)
      }
    }
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear()

    // Clear IndexedDB
    if (this.db) {
      const stores = ['api', 'assets', 'data']
      for (const storeName of stores) {
        try {
          const transaction = this.db.transaction([storeName], 'readwrite')
          const store = transaction.objectStore(storeName)
          await store.clear()
        } catch (error) {
          console.error(`[CacheManager] Failed to clear ${storeName}:`, error)
        }
      }
    }

    // Clear browser caches
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
    }

    console.log('[CacheManager] All caches cleared')
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memoryEntries: number
    memorySize: number
    dbEntries: { [key: string]: number }
    browserCaches: string[]
  }> {
    const stats = {
      memoryEntries: this.memoryCache.size,
      memorySize: 0,
      dbEntries: {} as { [key: string]: number },
      browserCaches: [] as string[]
    }

    // Calculate memory size (rough estimate)
    for (const entry of this.memoryCache.values()) {
      stats.memorySize += JSON.stringify(entry).length
    }

    // Count IndexedDB entries
    if (this.db) {
      const stores = ['api', 'assets', 'data']
      for (const storeName of stores) {
        try {
          const transaction = this.db.transaction([storeName], 'readonly')
          const store = transaction.objectStore(storeName)
          const countRequest = store.count()
          
          await new Promise((resolve) => {
            countRequest.onsuccess = () => {
              stats.dbEntries[storeName] = countRequest.result
              resolve(undefined)
            }
          })
        } catch (error) {
          console.error(`[CacheManager] Failed to count ${storeName}:`, error)
        }
      }
    }

    // List browser caches
    if ('caches' in window) {
      stats.browserCaches = await caches.keys()
    }

    return stats
  }
}

// Create singleton instance
let cacheManager: CacheManager | null = null

export function getCacheManager(): CacheManager {
  if (!cacheManager && typeof window !== 'undefined') {
    cacheManager = new CacheManager()
  }
  return cacheManager!
}

// Export convenience functions
export function cachedFetch(url: string, options?: RequestInit): Promise<Response> {
  return getCacheManager().fetch(url, options)
}

export async function clearCache(): Promise<void> {
  return getCacheManager().clearAll()
}

export async function getCacheStats() {
  return getCacheManager().getStats()
}