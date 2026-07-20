/**
 * Performance monitoring and Web Vitals tracking
 */

import { onCLS, onFCP, onFID, onINP, onLCP, onTTFB } from 'web-vitals'

export interface PerformanceMetrics {
  lcp?: number
  fid?: number
  cls?: number
  fcp?: number
  ttfb?: number
  inp?: number
}

interface NavigationTiming {
  dnsLookup: number
  tcpConnection: number
  tlsNegotiation: number
  requestTime: number
  responseTime: number
  domInteractive: number
  domContentLoaded: number
  pageLoad: number
}

interface ResourceTiming {
  name: string
  type: string
  duration: number
  size: number
  transferSize: number
  cacheHit: boolean
}

interface PerformanceBudget {
  lcp: number
  fid: number
  cls: number
  fcp: number
  ttfb: number
  inp: number
  bundleSize: number
  imageSize: number
  totalSize: number
}

// Performance budgets based on Google's recommendations
const DEFAULT_PERFORMANCE_BUDGET: PerformanceBudget = {
  lcp: 2500,    // 2.5 seconds
  fid: 100,     // 100 milliseconds
  cls: 0.1,     // 0.1 cumulative layout shift
  fcp: 1800,    // 1.8 seconds
  ttfb: 800,    // 800 milliseconds
  inp: 200,     // 200 milliseconds
  bundleSize: 200000,  // 200KB for JavaScript
  imageSize: 100000,   // 100KB per image
  totalSize: 1000000   // 1MB total page weight
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {}
  private budget = DEFAULT_PERFORMANCE_BUDGET
  private observers: Map<string, PerformanceObserver> = new Map()
  private resourceTimings: ResourceTiming[] = []
  private navigationTiming?: NavigationTiming
  private reportCallback?: (metrics: any) => void

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWebVitals()
      this.observeNavigationTiming()
      this.observeResourceTiming()
      this.observeLongTasks()
      this.observeMemory()
      this.setupReporting()
    }
  }

  /**
   * Initialize Web Vitals monitoring
   */
  private initializeWebVitals() {
    // Largest Contentful Paint
    onLCP((metric) => {
      this.metrics.lcp = metric.value
      this.checkBudget('lcp', metric.value)
      console.log('[Performance] LCP:', metric.value, 'ms')
    })

    // First Input Delay
    onFID((metric) => {
      this.metrics.fid = metric.value
      this.checkBudget('fid', metric.value)
      console.log('[Performance] FID:', metric.value, 'ms')
    })

    // Cumulative Layout Shift
    onCLS((metric) => {
      this.metrics.cls = metric.value
      this.checkBudget('cls', metric.value)
      console.log('[Performance] CLS:', metric.value)
    })

    // First Contentful Paint
    onFCP((metric) => {
      this.metrics.fcp = metric.value
      this.checkBudget('fcp', metric.value)
      console.log('[Performance] FCP:', metric.value, 'ms')
    })

    // Time to First Byte
    onTTFB((metric) => {
      this.metrics.ttfb = metric.value
      this.checkBudget('ttfb', metric.value)
      console.log('[Performance] TTFB:', metric.value, 'ms')
    })

    // Interaction to Next Paint
    onINP((metric) => {
      this.metrics.inp = metric.value
      this.checkBudget('inp', metric.value)
      console.log('[Performance] INP:', metric.value, 'ms')
    })
  }

  /**
   * Observe navigation timing
   */
  private observeNavigationTiming() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
      
      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0]
        this.navigationTiming = {
          dnsLookup: nav.domainLookupEnd - nav.domainLookupStart,
          tcpConnection: nav.connectEnd - nav.connectStart,
          tlsNegotiation: nav.requestStart - nav.secureConnectionStart,
          requestTime: nav.responseStart - nav.requestStart,
          responseTime: nav.responseEnd - nav.responseStart,
          domInteractive: nav.domInteractive - nav.fetchStart,
          domContentLoaded: nav.domContentLoadedEventEnd - nav.fetchStart,
          pageLoad: nav.loadEventEnd - nav.fetchStart
        }

        console.log('[Performance] Navigation Timing:', this.navigationTiming)
      }
    }
  }

  /**
   * Observe resource timing
   */
  private observeResourceTiming() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming
            const timing: ResourceTiming = {
              name: resourceEntry.name,
              type: this.getResourceType(resourceEntry.name),
              duration: resourceEntry.duration,
              size: resourceEntry.decodedBodySize || 0,
              transferSize: resourceEntry.transferSize || 0,
              cacheHit: resourceEntry.transferSize === 0 && resourceEntry.decodedBodySize > 0
            }
            
            this.resourceTimings.push(timing)
            
            // Check bundle size budget
            if (timing.type === 'script' && timing.size > this.budget.bundleSize) {
              console.warn(`[Performance] Script exceeds budget: ${timing.name} (${timing.size} bytes)`)
            }
            
            // Check image size budget
            if (timing.type === 'image' && timing.size > this.budget.imageSize) {
              console.warn(`[Performance] Image exceeds budget: ${timing.name} (${timing.size} bytes)`)
            }
          }
        }
      })

      observer.observe({ entryTypes: ['resource'] })
      this.observers.set('resource', observer)
    }
  }

  /**
   * Observe long tasks (blocking main thread)
   */
  private observeLongTasks() {
    if ('PerformanceObserver' in window && 'PerformanceLongTaskTiming' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.warn('[Performance] Long Task detected:', {
            duration: entry.duration,
            startTime: entry.startTime,
            name: entry.name
          })

          // Track long tasks that might affect interactivity
          if (entry.duration > 50) {
            this.reportLongTask(entry)
          }
        }
      })

      try {
        observer.observe({ entryTypes: ['longtask'] })
        this.observers.set('longtask', observer)
      } catch (e) {
        console.log('[Performance] Long task observation not supported')
      }
    }
  }

  /**
   * Monitor memory usage
   */
  private observeMemory() {
    if ('performance' in window && 'memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory
        if (memory) {
          const usedMemory = memory.usedJSHeapSize
          const totalMemory = memory.jsHeapSizeLimit
          const percentage = (usedMemory / totalMemory) * 100

          if (percentage > 90) {
            console.warn('[Performance] High memory usage:', {
              used: this.formatBytes(usedMemory),
              total: this.formatBytes(totalMemory),
              percentage: percentage.toFixed(2) + '%'
            })
          }
        }
      }, 30000) // Check every 30 seconds
    }
  }

  /**
   * Setup performance reporting
   */
  private setupReporting() {
    // Report metrics when page is about to unload
    if ('sendBeacon' in navigator) {
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.reportMetrics()
        }
      })
    }

    // Also report after page load
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.reportMetrics()
      }, 5000) // Wait 5 seconds after load
    })
  }

  /**
   * Report metrics to analytics or monitoring service
   */
  private reportMetrics() {
    const report = {
      webVitals: this.metrics,
      navigation: this.navigationTiming,
      resources: this.getResourceSummary(),
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    }

    console.log('[Performance] Full Report:', report)

    // Send to analytics (Vercel Analytics is already integrated)
    if (this.reportCallback) {
      this.reportCallback(report)
    }

    // Send to monitoring endpoint
    if ('sendBeacon' in navigator && process.env.NEXT_PUBLIC_MONITORING_ENDPOINT) {
      navigator.sendBeacon(
        process.env.NEXT_PUBLIC_MONITORING_ENDPOINT,
        JSON.stringify(report)
      )
    }
  }

  /**
   * Report long task
   */
  private reportLongTask(entry: PerformanceEntry) {
    const task = {
      duration: entry.duration,
      startTime: entry.startTime,
      timestamp: Date.now(),
      url: window.location.href
    }

    console.log('[Performance] Reporting long task:', task)
  }

  /**
   * Get resource summary
   */
  private getResourceSummary() {
    const summary = {
      totalResources: this.resourceTimings.length,
      totalSize: 0,
      totalTransferSize: 0,
      cacheHitRate: 0,
      byType: {} as Record<string, { count: number; size: number; avgDuration: number }>
    }

    const typeGroups: Record<string, ResourceTiming[]> = {}

    for (const resource of this.resourceTimings) {
      summary.totalSize += resource.size
      summary.totalTransferSize += resource.transferSize
      
      if (!typeGroups[resource.type]) {
        typeGroups[resource.type] = []
      }
      typeGroups[resource.type].push(resource)
    }

    // Calculate cache hit rate
    const cachedResources = this.resourceTimings.filter(r => r.cacheHit).length
    summary.cacheHitRate = this.resourceTimings.length > 0 
      ? (cachedResources / this.resourceTimings.length) * 100 
      : 0

    // Summarize by type
    for (const [type, resources] of Object.entries(typeGroups)) {
      const totalSize = resources.reduce((sum, r) => sum + r.size, 0)
      const totalDuration = resources.reduce((sum, r) => sum + r.duration, 0)
      
      summary.byType[type] = {
        count: resources.length,
        size: totalSize,
        avgDuration: totalDuration / resources.length
      }
    }

    // Check total size budget
    if (summary.totalSize > this.budget.totalSize) {
      console.warn(`[Performance] Total page size exceeds budget: ${this.formatBytes(summary.totalSize)}`)
    }

    return summary
  }

  /**
   * Check performance budget
   */
  private checkBudget(metric: keyof PerformanceBudget, value: number) {
    const budget = this.budget[metric]
    if (value > budget) {
      console.warn(`[Performance] ${metric.toUpperCase()} exceeds budget: ${value} > ${budget}`)
      
      // Trigger alert for critical metrics
      if (['lcp', 'fid', 'cls'].includes(metric)) {
        this.triggerBudgetAlert(metric, value, budget)
      }
    } else {
      console.log(`[Performance] ${metric.toUpperCase()} within budget: ${value} <= ${budget}`)
    }
  }

  /**
   * Trigger budget alert
   */
  private triggerBudgetAlert(metric: string, value: number, budget: number) {
    const alert = {
      metric,
      value,
      budget,
      exceeded: value - budget,
      percentage: ((value / budget) * 100).toFixed(2) + '%',
      timestamp: Date.now(),
      url: window.location.href
    }

    console.error('[Performance] Budget Alert:', alert)
    
    // Could send to monitoring service
    if (process.env.NEXT_PUBLIC_MONITORING_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_MONITORING_ENDPOINT + '/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert)
      }).catch(console.error)
    }
  }

  /**
   * Get resource type from URL
   */
  private getResourceType(url: string): string {
    if (url.match(/\.(js|mjs)$/i)) return 'script'
    if (url.match(/\.(css|less|scss)$/i)) return 'style'
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) return 'image'
    if (url.match(/\.(woff|woff2|ttf|eot|otf)$/i)) return 'font'
    if (url.match(/\.(mp4|webm|ogg)$/i)) return 'video'
    if (url.includes('/api/')) return 'api'
    return 'other'
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Set custom performance budget
   */
  public setBudget(budget: Partial<PerformanceBudget>) {
    this.budget = { ...this.budget, ...budget }
  }

  /**
   * Set report callback
   */
  public setReportCallback(callback: (metrics: any) => void) {
    this.reportCallback = callback
  }

  /**
   * Get current metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Get navigation timing
   */
  public getNavigationTiming(): NavigationTiming | undefined {
    return this.navigationTiming
  }

  /**
   * Get resource timings
   */
  public getResourceTimings(): ResourceTiming[] {
    return [...this.resourceTimings]
  }

  /**
   * Clear collected data
   */
  public clear() {
    this.metrics = {}
    this.resourceTimings = []
    this.navigationTiming = undefined
  }

  /**
   * Destroy observers
   */
  public destroy() {
    for (const observer of this.observers.values()) {
      observer.disconnect()
    }
    this.observers.clear()
  }
}

// Create singleton instance
let performanceMonitor: PerformanceMonitor | null = null

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor && typeof window !== 'undefined') {
    performanceMonitor = new PerformanceMonitor()
  }
  return performanceMonitor!
}

// Export convenience functions
export function trackPerformance(callback?: (metrics: any) => void) {
  const monitor = getPerformanceMonitor()
  if (callback) {
    monitor.setReportCallback(callback)
  }
  return monitor
}

export function setPerformanceBudget(budget: Partial<PerformanceBudget>) {
  const monitor = getPerformanceMonitor()
  monitor.setBudget(budget)
}

export function getPerformanceMetrics() {
  const monitor = getPerformanceMonitor()
  return {
    webVitals: monitor.getMetrics(),
    navigation: monitor.getNavigationTiming(),
    resources: monitor.getResourceTimings()
  }
}