/**
 * Resource hints for optimizing critical rendering path
 */

interface ResourceHint {
  type: 'dns-prefetch' | 'preconnect' | 'prefetch' | 'preload' | 'prerender' | 'modulepreload'
  href: string
  as?: 'script' | 'style' | 'image' | 'font' | 'document' | 'fetch'
  crossOrigin?: 'anonymous' | 'use-credentials'
  media?: string
  importance?: 'high' | 'low' | 'auto'
  integrity?: string
}

// Critical resources to optimize
const RESOURCE_HINTS: ResourceHint[] = [
  // DNS prefetch for external domains
  {
    type: 'dns-prefetch',
    href: 'https://fonts.googleapis.com'
  },
  {
    type: 'dns-prefetch',
    href: 'https://fonts.gstatic.com'
  },
  {
    type: 'dns-prefetch',
    href: 'https://images.unsplash.com'
  },
  
  // Preconnect for critical third-party origins
  {
    type: 'preconnect',
    href: 'https://fonts.googleapis.com',
    crossOrigin: 'anonymous'
  },
  {
    type: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous'
  },
  
  // Preload critical fonts
  {
    type: 'preload',
    href: '/fonts/inter-var.woff2',
    as: 'font',
    crossOrigin: 'anonymous'
  },
  
  // Preload critical CSS
  {
    type: 'preload',
    href: '/_next/static/css/app.css',
    as: 'style'
  },
  
  // Prefetch next likely navigation
  {
    type: 'prefetch',
    href: '/dashboard',
    as: 'document'
  }
]

class ResourceHintsManager {
  private appliedHints = new Set<string>()
  private observer: PerformanceObserver | null = null
  private criticalResources = new Set<string>()

  constructor() {
    if (typeof window !== 'undefined') {
      this.identifyCriticalResources()
      this.applyResourceHints()
      this.setupAdaptiveLoading()
      this.monitorResourceLoading()
    }
  }

  /**
   * Identify critical resources from the page
   */
  private identifyCriticalResources(): void {
    // Identify critical CSS
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      const href = (link as HTMLLinkElement).href
      if (href && !href.includes('async')) {
        this.criticalResources.add(href)
      }
    })

    // Identify critical scripts
    document.querySelectorAll('script[src]').forEach(script => {
      const src = (script as HTMLScriptElement).src
      if (src && !script.hasAttribute('async') && !script.hasAttribute('defer')) {
        this.criticalResources.add(src)
      }
    })

    // Identify above-the-fold images
    const viewportHeight = window.innerHeight
    document.querySelectorAll('img').forEach(img => {
      const rect = img.getBoundingClientRect()
      if (rect.top < viewportHeight && img.src) {
        this.criticalResources.add(img.src)
      }
    })

    console.log('[ResourceHints] Critical resources identified:', this.criticalResources.size)
  }

  /**
   * Apply resource hints to the page
   */
  private applyResourceHints(): void {
    const head = document.head

    // Apply configured hints
    RESOURCE_HINTS.forEach(hint => {
      this.addResourceHint(hint)
    })

    // Auto-detect and apply hints for critical resources
    this.criticalResources.forEach(resource => {
      const url = new URL(resource, window.location.origin)
      
      // Add DNS prefetch for external domains
      if (url.origin !== window.location.origin) {
        this.addResourceHint({
          type: 'dns-prefetch',
          href: url.origin
        })

        // Add preconnect for important external resources
        if (resource.includes('font') || resource.includes('css')) {
          this.addResourceHint({
            type: 'preconnect',
            href: url.origin,
            crossOrigin: 'anonymous'
          })
        }
      }

      // Preload critical local resources
      if (url.origin === window.location.origin) {
        const as = this.getResourceType(resource)
        if (as && ['style', 'script', 'font'].includes(as)) {
          this.addResourceHint({
            type: 'preload',
            href: resource,
            as
          })
        }
      }
    })
  }

  /**
   * Add a single resource hint
   */
  public addResourceHint(hint: ResourceHint): void {
    const key = `${hint.type}:${hint.href}`
    
    if (this.appliedHints.has(key)) {
      return
    }

    const link = document.createElement('link')
    link.rel = hint.type
    link.href = hint.href

    if (hint.as) {
      link.setAttribute('as', hint.as)
    }

    if (hint.crossOrigin) {
      link.setAttribute('crossorigin', hint.crossOrigin)
    }

    if (hint.media) {
      link.media = hint.media
    }

    if (hint.importance) {
      link.setAttribute('importance', hint.importance)
    }

    if (hint.integrity) {
      link.integrity = hint.integrity
    }

    document.head.appendChild(link)
    this.appliedHints.add(key)

    console.log(`[ResourceHints] Added ${hint.type} for ${hint.href}`)
  }

  /**
   * Setup adaptive loading based on connection
   */
  private setupAdaptiveLoading(): void {
    if (!('connection' in navigator)) return

    const connection = (navigator as any).connection
    const effectiveType = connection.effectiveType
    const saveData = connection.saveData

    console.log('[ResourceHints] Connection:', {
      effectiveType,
      saveData,
      downlink: connection.downlink,
      rtt: connection.rtt
    })

    // Adjust loading strategy based on connection
    if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
      console.log('[ResourceHints] Slow connection detected, reducing preloading')
      this.reducePreloading()
    } else if (effectiveType === '4g') {
      console.log('[ResourceHints] Fast connection detected, increasing preloading')
      this.increasePreloading()
    }

    // Monitor connection changes
    connection.addEventListener('change', () => {
      console.log('[ResourceHints] Connection changed:', connection.effectiveType)
      this.adjustLoadingStrategy()
    })
  }

  /**
   * Reduce preloading for slow connections
   */
  private reducePreloading(): void {
    // Remove non-critical prefetch hints
    document.querySelectorAll('link[rel="prefetch"]').forEach(link => {
      const href = (link as HTMLLinkElement).href
      if (!this.criticalResources.has(href)) {
        link.remove()
      }
    })

    // Disable image preloading
    document.querySelectorAll('link[rel="preload"][as="image"]').forEach(link => {
      link.remove()
    })
  }

  /**
   * Increase preloading for fast connections
   */
  private increasePreloading(): void {
    // Prefetch likely next pages
    const likelyPages = ['/dashboard', '/settings', '/profile']
    likelyPages.forEach(page => {
      this.addResourceHint({
        type: 'prefetch',
        href: page,
        as: 'document'
      })
    })

    // Preload next bundle chunks
    this.preloadNextChunks()
  }

  /**
   * Adjust loading strategy dynamically
   */
  private adjustLoadingStrategy(): void {
    const connection = (navigator as any).connection
    const effectiveType = connection.effectiveType

    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      this.reducePreloading()
    } else if (effectiveType === '4g') {
      this.increasePreloading()
    }
  }

  /**
   * Preload next.js chunks
   */
  private preloadNextChunks(): void {
    // Find Next.js script tags
    document.querySelectorAll('script[src*="/_next/static/chunks/"]').forEach(script => {
      const src = (script as HTMLScriptElement).src
      const match = src.match(/chunks\/(\d+)-/)
      
      if (match) {
        const chunkId = match[1]
        // Preload related chunks
        this.addResourceHint({
          type: 'prefetch',
          href: src.replace(chunkId, String(Number(chunkId) + 1)),
          as: 'script'
        })
      }
    })
  }

  /**
   * Monitor resource loading performance
   */
  private monitorResourceLoading(): void {
    if (!('PerformanceObserver' in window)) return

    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming
          
          // Check if resource was preloaded
          const wasPreloaded = this.appliedHints.has(`preload:${resourceEntry.name}`)
          
          if (wasPreloaded) {
            console.log(`[ResourceHints] Preloaded resource loaded:`, {
              name: resourceEntry.name,
              duration: resourceEntry.duration,
              transferSize: resourceEntry.transferSize
            })
          }

          // Identify slow resources that should be preloaded
          if (resourceEntry.duration > 500 && !wasPreloaded) {
            console.warn(`[ResourceHints] Slow resource detected:`, {
              name: resourceEntry.name,
              duration: resourceEntry.duration
            })
            
            // Add to preload list for next visit
            this.suggestPreload(resourceEntry.name)
          }
        }
      }
    })

    this.observer.observe({ entryTypes: ['resource'] })
  }

  /**
   * Suggest resource for preloading
   */
  private suggestPreload(url: string): void {
    const as = this.getResourceType(url)
    
    if (as && ['script', 'style', 'font'].includes(as)) {
      // Store suggestion in localStorage for next visit
      const suggestions = this.getPreloadSuggestions()
      suggestions.push({ url, as, count: 1 })
      localStorage.setItem('preload-suggestions', JSON.stringify(suggestions))
    }
  }

  /**
   * Get preload suggestions from localStorage
   */
  private getPreloadSuggestions(): Array<{ url: string; as: string; count: number }> {
    try {
      const stored = localStorage.getItem('preload-suggestions')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  /**
   * Apply suggested preloads
   */
  public applySuggestedPreloads(): void {
    const suggestions = this.getPreloadSuggestions()
    
    // Apply frequently accessed resources
    suggestions
      .filter(s => s.count > 2)
      .forEach(suggestion => {
        this.addResourceHint({
          type: 'preload',
          href: suggestion.url,
          as: suggestion.as as any
        })
      })
  }

  /**
   * Get resource type from URL
   */
  private getResourceType(url: string): ResourceHint['as'] | null {
    if (url.match(/\.js$/)) return 'script'
    if (url.match(/\.css$/)) return 'style'
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image'
    if (url.match(/\.(woff|woff2|ttf|eot|otf)$/)) return 'font'
    if (url.match(/\.json$/)) return 'fetch'
    return null
  }

  /**
   * Prefetch visible links
   */
  public prefetchVisibleLinks(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const link = entry.target as HTMLAnchorElement
            const href = link.href
            
            if (href && href.startsWith(window.location.origin)) {
              this.addResourceHint({
                type: 'prefetch',
                href,
                as: 'document'
              })
              observer.unobserve(link)
            }
          }
        })
      },
      {
        rootMargin: '50px'
      }
    )

    document.querySelectorAll('a[href]').forEach(link => {
      observer.observe(link)
    })
  }

  /**
   * Clear all resource hints
   */
  public clear(): void {
    document.querySelectorAll('link[rel="prefetch"], link[rel="preload"], link[rel="preconnect"], link[rel="dns-prefetch"]').forEach(link => {
      link.remove()
    })
    this.appliedHints.clear()
  }

  /**
   * Destroy observer
   */
  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect()
    }
    this.clear()
  }
}

// Create singleton instance
let resourceHintsManager: ResourceHintsManager | null = null

export function getResourceHintsManager(): ResourceHintsManager {
  if (!resourceHintsManager && typeof window !== 'undefined') {
    resourceHintsManager = new ResourceHintsManager()
  }
  return resourceHintsManager!
}

// Export convenience functions
export function addResourceHint(hint: ResourceHint): void {
  getResourceHintsManager().addResourceHint(hint)
}

export function prefetchVisibleLinks(): void {
  getResourceHintsManager().prefetchVisibleLinks()
}

export function applySuggestedPreloads(): void {
  getResourceHintsManager().applySuggestedPreloads()
}