import { clsx } from 'clsx'

interface LoadingSkeletonProps {
  className?: string
  width?: string
  height?: string
  variant?: 'default' | 'rounded' | 'circle'
  animation?: 'pulse' | 'wave' | 'shimmer'
}

export function LoadingSkeleton({ 
  className = '', 
  width = 'w-full', 
  height = 'h-4',
  variant = 'default',
  animation = 'pulse'
}: LoadingSkeletonProps) {
  const baseStyles = 'bg-secondary-200 dark:bg-secondary-700'
  
  const variants = {
    default: 'rounded',
    rounded: 'rounded-lg',
    circle: 'rounded-full'
  }
  
  const animations = {
    pulse: 'animate-pulse',
    wave: 'animate-pulse-soft',
    shimmer: 'animate-pulse'
  }
  
  return (
    <div 
      className={clsx(
        baseStyles,
        variants[variant],
        animations[animation],
        height,
        width,
        className
      )}
      role="progressbar"
      aria-label="Loading content"
    />
  )
}

export function ProfileSkeleton() {
  return (
    <div className="bg-white dark:bg-secondary-900 rounded-xl shadow-soft border border-secondary-200 dark:border-secondary-800 p-6 animate-fade-in">
      <div className="flex items-center space-x-4 mb-6">
        <LoadingSkeleton height="h-20" width="w-20" variant="circle" />
        <div className="flex-1 space-y-2">
          <LoadingSkeleton height="h-6" width="w-1/3" />
          <LoadingSkeleton height="h-4" width="w-1/2" />
        </div>
      </div>
      <div className="space-y-3">
        <LoadingSkeleton height="h-4" width="w-full" />
        <LoadingSkeleton height="h-4" width="w-3/4" />
        <LoadingSkeleton height="h-4" width="w-5/6" />
        <LoadingSkeleton height="h-4" width="w-2/3" />
      </div>
    </div>
  )
}

export function EntryCardSkeleton() {
  return (
    <div className="bg-white dark:bg-secondary-900 rounded-xl shadow-soft border border-secondary-200 dark:border-secondary-800 p-6 animate-fade-in">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <LoadingSkeleton height="h-6" width="w-3/4" />
            <div className="flex items-center space-x-2">
              <LoadingSkeleton height="h-5" width="w-16" variant="rounded" />
              <LoadingSkeleton height="h-5" width="w-20" variant="rounded" />
              <LoadingSkeleton height="h-5" width="w-18" variant="rounded" />
            </div>
          </div>
          <LoadingSkeleton height="h-6" width="w-6" variant="rounded" />
        </div>
        
        {/* Content */}
        <div className="space-y-2">
          <LoadingSkeleton height="h-4" width="w-full" />
          <LoadingSkeleton height="h-4" width="w-5/6" />
          <LoadingSkeleton height="h-4" width="w-4/5" />
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <LoadingSkeleton height="h-4" width="w-24" />
          <LoadingSkeleton height="h-4" width="w-20" />
        </div>
      </div>
    </div>
  )
}

export function StatsCardSkeleton() {
  return (
    <div className="bg-white dark:bg-secondary-900 rounded-xl shadow-soft border border-secondary-200 dark:border-secondary-800 p-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <LoadingSkeleton height="h-4" width="w-24" />
          <LoadingSkeleton height="h-8" width="w-16" />
        </div>
        <LoadingSkeleton height="h-12" width="w-12" variant="circle" />
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-950">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <LoadingSkeleton height="h-8" width="w-48" />
          <LoadingSkeleton height="h-4" width="w-32" />
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>

        {/* Entry Form Skeleton */}
        <div className="bg-white dark:bg-secondary-900 rounded-xl shadow-soft border border-secondary-200 dark:border-secondary-800 p-6 space-y-4">
          <LoadingSkeleton height="h-6" width="w-32" />
          <LoadingSkeleton height="h-24" width="w-full" variant="rounded" />
          <div className="flex space-x-2">
            <LoadingSkeleton height="h-10" width="w-24" variant="rounded" />
            <LoadingSkeleton height="h-10" width="w-20" variant="rounded" />
            <LoadingSkeleton height="h-10" width="w-28" variant="rounded" />
          </div>
          <LoadingSkeleton height="h-10" width="w-full" variant="rounded" />
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-secondary-900 rounded-xl shadow-soft border border-secondary-200 dark:border-secondary-800 p-4 space-y-4">
          <LoadingSkeleton height="h-10" width="w-full" variant="rounded" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <LoadingSkeleton key={i} height="h-8" width="w-20" variant="rounded" />
            ))}
          </div>
        </div>

        {/* Entry Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <EntryCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}