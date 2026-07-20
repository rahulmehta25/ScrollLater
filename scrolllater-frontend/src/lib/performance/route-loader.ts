/**
 * Route-based code splitting and preloading
 */

import { ComponentType, lazy } from 'react'

export interface RouteConfig {
  path: string
  component: () => Promise<{ default: ComponentType<any> }>
  preload?: boolean
  prefetch?: boolean
  priority?: 'high' | 'medium' | 'low'
  chunkName?: string
}

// Route configurations with lazy loading
export const routes: RouteConfig[] = [
  {
    path: '/',
    component: () => import('@/app/page'),
    preload: true,
    priority: 'high',
    chunkName: 'home'
  },
  {
    path: '/dashboard',
    component: () => import('@/app/dashboard/page'),
    preload: false,
    prefetch: true,
    priority: 'high',
    chunkName: 'dashboard'
  },
  {
    path: '/dashboard/settings',
    component: () => import('@/app/dashboard/settings/page'),
    preload: false,
    priority: 'medium',
    chunkName: 'settings'
  }
]

class RouteLoader {
  private preloadedRoutes = new Set<string>()
  private loadingRoutes = new Map<string, Promise<any>>()
  private componentCache = new Map<string, ComponentType<any>>()

  /**
   * Preload a route component
   */
  async preloadRoute(path: string): Promise<void> {
    if (this.preloadedRoutes.has(path)) {
      return
    }

    const route = routes.find(r => r.path === path)
    if (!route) {
      console.warn(`[RouteLoader] Route not found: ${path}`)
      return
    }

    // Check if already loading
    if (this.loadingRoutes.has(path)) {
      await this.loadingRoutes.get(path)
      return
    }

    console.log(`[RouteLoader] Preloading route: ${path}`)
    
    const loadPromise = route.component().then(module => {
      this.componentCache.set(path, module.default)
      this.preloadedRoutes.add(path)
      this.loadingRoutes.delete(path)
      console.log(`[RouteLoader] Route preloaded: ${path}`)
    }).catch(error => {
      console.error(`[RouteLoader] Failed to preload route ${path}:`, error)
      this.loadingRoutes.delete(path)
      throw error
    })

    this.loadingRoutes.set(path, loadPromise)
    await loadPromise
  }

  /**
   * Prefetch a route (lower priority than preload)
   */
  prefetchRoute(path: string): void {
    if (this.preloadedRoutes.has(path) || this.loadingRoutes.has(path)) {
      return
    }

    const route = routes.find(r => r.path === path)
    if (!route) {
      return
    }

    console.log(`[RouteLoader] Prefetching route: ${path}`)

    // Use requestIdleCallback for prefetching
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.preloadRoute(path).catch(console.error)
      }, { timeout: 2000 })
    } else {
      setTimeout(() => {
        this.preloadRoute(path).catch(console.error)
      }, 100)
    }
  }

  /**
   * Get component for a route
   */
  getComponent(path: string): ComponentType<any> | null {
    return this.componentCache.get(path) || null
  }

  /**
   * Check if route is preloaded
   */
  isPreloaded(path: string): boolean {
    return this.preloadedRoutes.has(path)
  }

  /**
   * Preload all high priority routes
   */
  async preloadHighPriorityRoutes(): Promise<void> {
    const highPriorityRoutes = routes.filter(r => r.priority === 'high' && r.preload)
    
    console.log('[RouteLoader] Preloading high priority routes...')
    
    await Promise.all(
      highPriorityRoutes.map(route => this.preloadRoute(route.path))
    )
  }

  /**
   * Prefetch medium priority routes
   */
  prefetchMediumPriorityRoutes(): void {
    const mediumPriorityRoutes = routes.filter(r => r.priority === 'medium' && r.prefetch)
    
    mediumPriorityRoutes.forEach(route => {
      this.prefetchRoute(route.path)
    })
  }

  /**
   * Setup intersection observer for link prefetching
   */
  setupLinkPrefetching(): void {
    if (typeof window === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const link = entry.target as HTMLAnchorElement
            const href = link.getAttribute('href')
            
            if (href && href.startsWith('/')) {
              this.prefetchRoute(href)
              observer.unobserve(link)
            }
          }
        })
      },
      {
        rootMargin: '100px'
      }
    )

    // Observe all internal links
    document.querySelectorAll('a[href^="/"]').forEach(link => {
      observer.observe(link)
    })

    // Setup mutation observer for dynamically added links
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            const element = node as HTMLElement
            if (element.tagName === 'A' && element.getAttribute('href')?.startsWith('/')) {
              observer.observe(element)
            }
            element.querySelectorAll('a[href^="/"]').forEach(link => {
              observer.observe(link)
            })
          }
        })
      })
    })

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    })
  }

  /**
   * Preload route on hover
   */
  setupHoverPrefetching(): void {
    if (typeof window === 'undefined') return

    document.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement
      const link = target.closest('a[href^="/"]') as HTMLAnchorElement
      
      if (link) {
        const href = link.getAttribute('href')
        if (href) {
          this.prefetchRoute(href)
        }
      }
    })
  }

  /**
   * Setup all prefetching strategies
   */
  setupPrefetching(): void {
    if (typeof window === 'undefined') return

    // Wait for page load
    if (document.readyState === 'complete') {
      this.initialize()
    } else {
      window.addEventListener('load', () => {
        this.initialize()
      })
    }
  }

  private initialize(): void {
    // Preload high priority routes
    this.preloadHighPriorityRoutes().catch(console.error)

    // Setup prefetching strategies
    setTimeout(() => {
      this.prefetchMediumPriorityRoutes()
      this.setupLinkPrefetching()
      this.setupHoverPrefetching()
    }, 2000)
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.preloadedRoutes.clear()
    this.loadingRoutes.clear()
    this.componentCache.clear()
  }
}

// Create singleton instance
let routeLoader: RouteLoader | null = null

export function getRouteLoader(): RouteLoader {
  if (!routeLoader) {
    routeLoader = new RouteLoader()
  }
  return routeLoader
}

// Export convenience functions
export function preloadRoute(path: string): Promise<void> {
  return getRouteLoader().preloadRoute(path)
}

export function prefetchRoute(path: string): void {
  getRouteLoader().prefetchRoute(path)
}

export function setupRoutePrefetching(): void {
  getRouteLoader().setupPrefetching()
}

/**
 * Hook for route preloading
 */
export function useRoutePreload() {
  const loader = getRouteLoader()

  return {
    preload: (path: string) => loader.preloadRoute(path),
    prefetch: (path: string) => loader.prefetchRoute(path),
    isPreloaded: (path: string) => loader.isPreloaded(path)
  }
}

/**
 * Create lazy component with preloading
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options?: {
    chunkName?: string
    preload?: boolean
    fallback?: ComponentType<any>
  }
): T {
  const LazyComponent = lazy(importFn) as T

  if (options?.preload) {
    // Preload during idle time
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(() => {
        importFn().catch(console.error)
      })
    }
  }

  return LazyComponent
}