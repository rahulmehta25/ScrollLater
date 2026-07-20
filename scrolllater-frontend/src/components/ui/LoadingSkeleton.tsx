import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import React from 'react'

interface LoadingSkeletonProps {
  className?: string
  width?: string
  height?: string
  variant?: 'default' | 'rounded' | 'circle' | 'text'
  animation?: 'pulse' | 'wave' | 'shimmer'
  delay?: number
  count?: number
  spacing?: number
  lines?: number
  animated?: boolean
}

export function LoadingSkeleton({ 
  className = '', 
  width = 'w-full', 
  height = 'h-4',
  variant = 'default',
  animation = 'pulse',
  delay = 0,
  count = 1,
  spacing = 2,
  lines = 1,
  animated = true
}: LoadingSkeletonProps) {
  const baseStyles = 'bg-secondary-200 dark:bg-secondary-700'
  
  const variants = {
    default: 'rounded',
    rounded: 'rounded-lg',
    circle: 'rounded-full',
    text: 'rounded-sm'
  }
  
  const animations = {
    pulse: 'animate-pulse',
    wave: 'animate-pulse-soft',
    shimmer: 'shimmer'
  }
  
  // Handle multiple lines of text skeleton
  if (variant === 'text' && lines > 1) {
    return (
      <div className={clsx('space-y-2', className)} role="progressbar" aria-label="Loading content">
        {Array.from({ length: lines }).map((_, index) => (
          <motion.div
            key={index}
            initial={animated ? { opacity: 0, x: -20 } : undefined}
            animate={animated ? { opacity: 1, x: 0 } : undefined}
            transition={animated ? { delay: delay + index * 0.1 } : undefined}
            className={clsx(
              baseStyles,
              variants[variant],
              animations[animation],
              height,
              index === lines - 1 ? 'w-3/4' : width, // Last line is shorter
            )}
            style={{ animationDelay: `${delay + index * 0.2}s` }}
          />
        ))}
      </div>
    )
  }
  
  // Handle multiple count skeletons
  if (count > 1) {
    return (
      <div className={clsx(`space-y-${spacing}`, className)} role="progressbar" aria-label="Loading content">
        {Array.from({ length: count }).map((_, index) => (
          <motion.div
            key={index}
            initial={animated ? { opacity: 0, scale: 0.95 } : undefined}
            animate={animated ? { opacity: 1, scale: 1 } : undefined}
            transition={animated ? { 
              delay: delay + index * 0.1,
              type: "spring",
              stiffness: 300,
              damping: 20
            } : undefined}
            className={clsx(
              baseStyles,
              variants[variant],
              animations[animation],
              height,
              width,
            )}
            style={{ animationDelay: `${delay + index * 0.1}s` }}
          />
        ))}
      </div>
    )
  }
  
  // Single skeleton
  const SkeletonElement = animated ? motion.div : 'div'
  
  return (
    <SkeletonElement
      className={clsx(
        baseStyles,
        variants[variant],
        animations[animation],
        height,
        width,
        className
      )}
      initial={animated ? { opacity: 0, scale: 0.95 } : undefined}
      animate={animated ? { opacity: 1, scale: 1 } : undefined}
      transition={animated ? { 
        delay,
        type: "spring",
        stiffness: 300,
        damping: 20
      } : undefined}
      style={{ animationDelay: `${delay}s` }}
      role="progressbar"
      aria-label="Loading content"
    />
  )
}

export function ProfileSkeleton() {
  return (
    <motion.div 
      className="bg-white dark:bg-secondary-900 rounded-xl shadow-soft border border-secondary-200 dark:border-secondary-800 p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center space-x-4 mb-6">
        <LoadingSkeleton height="h-20" width="w-20" variant="circle" delay={0} />
        <div className="flex-1 space-y-2">
          <LoadingSkeleton height="h-6" width="w-1/3" delay={0.1} />
          <LoadingSkeleton height="h-4" width="w-1/2" delay={0.2} />
        </div>
      </div>
      <LoadingSkeleton variant="text" lines={4} delay={0.3} />
    </motion.div>
  )
}

export function EntryCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div 
      className="bg-white dark:bg-secondary-900 rounded-xl shadow-soft border border-secondary-200 dark:border-secondary-800 p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <LoadingSkeleton height="h-6" width="w-3/4" delay={delay} />
            <div className="flex items-center space-x-2">
              <LoadingSkeleton height="h-5" width="w-16" variant="rounded" delay={delay + 0.1} />
              <LoadingSkeleton height="h-5" width="w-20" variant="rounded" delay={delay + 0.15} />
              <LoadingSkeleton height="h-5" width="w-18" variant="rounded" delay={delay + 0.2} />
            </div>
          </div>
          <LoadingSkeleton height="h-6" width="w-6" variant="rounded" delay={delay + 0.05} />
        </div>
        
        {/* Content */}
        <LoadingSkeleton variant="text" lines={3} delay={delay + 0.3} />
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <LoadingSkeleton height="h-4" width="w-24" delay={delay + 0.4} />
          <LoadingSkeleton height="h-4" width="w-20" delay={delay + 0.45} />
        </div>
      </div>
    </motion.div>
  )
}

export function StatsCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div 
      className="bg-white dark:bg-secondary-900 rounded-xl shadow-soft border border-secondary-200 dark:border-secondary-800 p-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <LoadingSkeleton height="h-4" width="w-24" delay={delay} />
          <LoadingSkeleton height="h-8" width="w-16" delay={delay + 0.1} />
        </div>
        <LoadingSkeleton height="h-12" width="w-12" variant="circle" delay={delay + 0.05} />
      </div>
    </motion.div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-950">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <motion.div 
          className="space-y-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <LoadingSkeleton height="h-8" width="w-48" delay={0} />
          <LoadingSkeleton height="h-4" width="w-32" delay={0.05} />
        </motion.div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardSkeleton key={i} delay={0.1 + i * 0.1} />
          ))}
        </div>

        {/* Entry Form Skeleton */}
        <motion.div 
          className="bg-white dark:bg-secondary-900 rounded-xl shadow-soft border border-secondary-200 dark:border-secondary-800 p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <LoadingSkeleton height="h-6" width="w-32" delay={0.6} />
          <LoadingSkeleton height="h-24" width="w-full" variant="rounded" delay={0.65} />
          <div className="flex space-x-2">
            <LoadingSkeleton height="h-10" width="w-24" variant="rounded" delay={0.7} />
            <LoadingSkeleton height="h-10" width="w-20" variant="rounded" delay={0.75} />
            <LoadingSkeleton height="h-10" width="w-28" variant="rounded" delay={0.8} />
          </div>
          <LoadingSkeleton height="h-10" width="w-full" variant="rounded" delay={0.85} />
        </motion.div>

        {/* Search and Filters */}
        <motion.div 
          className="bg-white dark:bg-secondary-900 rounded-xl shadow-soft border border-secondary-200 dark:border-secondary-800 p-4 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.9 }}
        >
          <LoadingSkeleton height="h-10" width="w-full" variant="rounded" delay={1} />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <LoadingSkeleton key={i} height="h-8" width="w-20" variant="rounded" delay={1.05 + i * 0.05} />
            ))}
          </div>
        </motion.div>

        {/* Entry Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <EntryCardSkeleton key={i} delay={1.3 + i * 0.1} />
          ))}
        </div>
      </div>
    </div>
  )
}