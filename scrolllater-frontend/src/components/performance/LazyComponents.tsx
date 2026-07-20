'use client'

import { 
  lazy, 
  Suspense, 
  memo, 
  useMemo, 
  useCallback, 
  ComponentType, 
  ReactNode,
  forwardRef,
  useState,
  useEffect
} from 'react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { LoadingSkeleton, DashboardSkeleton, EntryCardSkeleton } from '@/components/ui/LoadingSkeleton'

// Lazy load heavy components
export const LazyDashboard = lazy(() => 
  import('@/components/dashboard/Dashboard').then(module => ({
    default: module.Dashboard
  }))
)

export const LazyEntryForm = lazy(() => 
  import('@/components/forms/EntryForm').then(module => ({
    default: module.EntryForm
  }))
)

export const LazySettingsPage = lazy(() => 
  import('@/app/dashboard/settings/page').then(module => ({
    default: module.default
  }))
)

export const LazyAIAnalysisDisplay = lazy(() => 
  import('@/components/ai/AIAnalysisDisplay').then(module => ({
    default: module.AIAnalysisDisplay
  }))
)

export const LazySmartScheduler = lazy(() => 
  import('@/components/dashboard/SmartScheduler').then(module => ({
    default: module.SmartScheduler
  }))
)

// HOC for lazy loading with custom fallback
interface LazyWrapperProps {
  fallback?: ReactNode
  errorFallback?: ReactNode
  children: ReactNode
}

export function LazyWrapper({ 
  fallback = <LoadingSkeleton />, 
  errorFallback,
  children 
}: LazyWrapperProps) {
  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

// Memoized components for better performance
export const MemoizedEntryCard = memo(function MemoizedEntryCard(props: any) {
  const { EnhancedEntryCard } = require('@/components/dashboard/EnhancedEntryCard')
  return <EnhancedEntryCard {...props} />
}, (prevProps, nextProps) => {
  // Custom comparison for entry card
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.updated_at === nextProps.item.updated_at &&
    prevProps.item.status === nextProps.item.status &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.compact === nextProps.compact
  )
})

export const MemoizedStatsCard = memo(function MemoizedStatsCard(props: any) {
  const { StatsCards } = require('@/components/dashboard/StatsCards')
  return <StatsCards {...props} />
}, (prevProps, nextProps) => {
  return prevProps.entries.length === nextProps.entries.length
})

// Virtual list component for large datasets
interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => ReactNode
  overscan?: number
  keyExtractor: (item: T, index: number) => string
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  keyExtractor
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index
    }))
  }, [items, startIndex, endIndex])

  const totalHeight = items.length * itemHeight

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop)
  }, [])

  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index }) => (
          <div
            key={keyExtractor(item, index)}
            style={{
              position: 'absolute',
              top: index * itemHeight,
              height: itemHeight,
              width: '100%'
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  )
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [element, setElement] = useState<HTMLElement | null>(null)

  const observer = useMemo(() => {
    if (typeof window === 'undefined') return null
    
    return new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
    }, {
      threshold: 0.1,
      rootMargin: '100px',
      ...options
    })
  }, [options])

  useEffect(() => {
    if (!element || !observer) return

    observer.observe(element)
    return () => observer.unobserve(element)
  }, [element, observer])

  return { ref: setElement, isIntersecting }
}

// Lazy loading component with intersection observer
interface LazyLoadProps {
  children: ReactNode
  fallback?: ReactNode
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
  className?: string
}

export function LazyLoad({
  children,
  fallback = <LoadingSkeleton />,
  threshold = 0.1,
  rootMargin = '100px',
  triggerOnce = true,
  className
}: LazyLoadProps) {
  const [hasLoaded, setHasLoaded] = useState(false)
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold,
    rootMargin
  })

  useEffect(() => {
    if (isIntersecting && !hasLoaded) {
      setHasLoaded(true)
    }
  }, [isIntersecting, hasLoaded])

  const shouldLoad = triggerOnce ? hasLoaded : isIntersecting

  return (
    <div ref={ref} className={className}>
      {shouldLoad ? children : fallback}
    </div>
  )
}

// Image lazy loading component
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: ReactNode
  placeholderSrc?: string
  threshold?: number
  rootMargin?: string
}

export const LazyImage = memo(forwardRef<HTMLImageElement, LazyImageProps>(
  function LazyImage({
    src,
    alt,
    fallback = <LoadingSkeleton height="h-48" variant="rounded" />,
    placeholderSrc,
    threshold = 0.1,
    rootMargin = '100px',
    className,
    ...props
  }, ref) {
    const [hasLoaded, setHasLoaded] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(false)
    const { ref: observerRef, isIntersecting } = useIntersectionObserver({
      threshold,
      rootMargin
    })

    const handleLoad = useCallback(() => {
      setIsLoading(false)
      setHasLoaded(true)
    }, [])

    const handleError = useCallback(() => {
      setIsLoading(false)
      setError(true)
    }, [])

    useEffect(() => {
      if (isIntersecting && !hasLoaded && !isLoading && !error) {
        setIsLoading(true)
      }
    }, [isIntersecting, hasLoaded, isLoading, error])

    if (error) {
      return (
        <div className={className} ref={observerRef}>
          <div className="flex items-center justify-center h-48 bg-secondary-100 dark:bg-secondary-800 rounded-lg">
            <span className="text-secondary-500 dark:text-secondary-400">Failed to load image</span>
          </div>
        </div>
      )
    }

    if (!isIntersecting || (!hasLoaded && !isLoading)) {
      return (
        <div className={className} ref={observerRef}>
          {placeholderSrc ? (
            <img
              src={placeholderSrc}
              alt={alt}
              className={className}
              {...props}
            />
          ) : (
            fallback
          )}
        </div>
      )
    }

    return (
      <div ref={observerRef}>
        <img
          ref={ref}
          src={src}
          alt={alt}
          className={className}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            opacity: hasLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out'
          }}
          {...props}
        />
        {isLoading && !hasLoaded && (
          <div className="absolute inset-0">
            {fallback}
          </div>
        )}
      </div>
    )
  }
))

// Performance monitoring hook
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<{
    renderTime: number
    totalComponents: number
    memoryUsage?: number
  }>({
    renderTime: 0,
    totalComponents: 0
  })

  useEffect(() => {
    const startTime = performance.now()
    
    // Measure render time
    const endTime = performance.now()
    const renderTime = endTime - startTime

    // Count React components (rough estimate)
    const totalComponents = document.querySelectorAll('[data-reactroot] *').length

    // Memory usage (if available)
    const memoryUsage = (performance as any).memory?.usedJSHeapSize

    setMetrics({
      renderTime,
      totalComponents,
      memoryUsage
    })
  }, [])

  return metrics
}

// Component bundling for code splitting
export const ComponentBundle = {
  // Core components (loaded immediately)
  Core: {
    Button: () => import('@/components/ui/Button'),
    Input: () => import('@/components/ui/Input'),
    Card: () => import('@/components/ui/Card'),
    LoadingSkeleton: () => import('@/components/ui/LoadingSkeleton')
  },
  
  // Dashboard components (loaded when needed)
  Dashboard: {
    Dashboard: () => import('@/components/dashboard/Dashboard'),
    EntryCard: () => import('@/components/dashboard/EnhancedEntryCard'),
    EntryForm: () => import('@/components/forms/EntryForm'),
    StatsCards: () => import('@/components/dashboard/StatsCards')
  },
  
  // AI components (loaded when needed)
  AI: {
    AIAnalysisDisplay: () => import('@/components/ai/AIAnalysisDisplay'),
    AIAnalyzeButton: () => import('@/components/ai/AIAnalyzeButton'),
    SmartScheduler: () => import('@/components/dashboard/SmartScheduler')
  },
  
  // Settings components (loaded when needed)
  Settings: {
    ProfileSettings: () => import('@/components/settings/ProfileSettings'),
    CalendarConnection: () => import('@/components/settings/CalendarConnection'),
    ShortcutSetup: () => import('@/components/settings/ShortcutSetup')
  }
}

// Preload hook for critical resources
export function usePreload() {
  const preloadComponent = useCallback((importFunction: () => Promise<any>) => {
    if (typeof window !== 'undefined') {
      // Preload on mouse enter or during idle time
      const preload = () => importFunction()
      
      if ('requestIdleCallback' in window) {
        requestIdleCallback(preload)
      } else {
        setTimeout(preload, 1)
      }
    }
  }, [])

  const preloadRoute = useCallback((href: string) => {
    if (typeof window !== 'undefined') {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = href
      document.head.appendChild(link)
    }
  }, [])

  return { preloadComponent, preloadRoute }
}