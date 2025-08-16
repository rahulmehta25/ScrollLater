'use client'

import dynamic from 'next/dynamic'
import { LoadingSkeleton, EntryCardSkeleton, StatsCardSkeleton } from '@/components/ui/LoadingSkeleton'

// Lazy load dashboard components
export const LazyEntryForm = dynamic(
  () => import('@/components/forms/EntryForm').then(mod => ({ default: mod.EntryForm })),
  {
    loading: () => (
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
    ),
    ssr: false
  }
)

export const LazySmartScheduler = dynamic(
  () => import('@/components/dashboard/SmartScheduler').then(mod => ({ default: mod.SmartScheduler })),
  {
    loading: () => (
      <div className="bg-white dark:bg-secondary-900 rounded-xl shadow-soft border border-secondary-200 dark:border-secondary-800 p-6">
        <LoadingSkeleton height="h-6" width="w-40" className="mb-4" />
        <div className="space-y-3">
          <LoadingSkeleton height="h-4" width="w-full" />
          <LoadingSkeleton height="h-4" width="w-3/4" />
          <LoadingSkeleton height="h-8" width="w-32" variant="rounded" />
        </div>
      </div>
    ),
    ssr: false
  }
)

export const LazyAIComponents = dynamic(
  () => import('@/components/ai/AIAnalysisDisplay').then(mod => ({ default: mod.AIAnalysisDisplay })),
  {
    loading: () => (
      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
        <div className="flex items-center space-x-2 mb-3">
          <LoadingSkeleton height="h-5" width="w-5" variant="circle" />
          <LoadingSkeleton height="h-4" width="w-24" />
        </div>
        <div className="space-y-2">
          <LoadingSkeleton height="h-4" width="w-full" />
          <LoadingSkeleton height="h-4" width="w-2/3" />
        </div>
      </div>
    ),
    ssr: false
  }
)

// Lazy load settings components
export const LazyProfileSettings = dynamic(
  () => import('@/components/settings/ProfileSettings').then(mod => ({ default: mod.ProfileSettings })),
  {
    loading: () => (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <LoadingSkeleton height="h-20" width="w-20" variant="circle" />
          <div className="space-y-2">
            <LoadingSkeleton height="h-6" width="w-32" />
            <LoadingSkeleton height="h-4" width="w-24" />
          </div>
        </div>
        <div className="space-y-4">
          <LoadingSkeleton height="h-10" width="w-full" variant="rounded" />
          <LoadingSkeleton height="h-10" width="w-full" variant="rounded" />
          <LoadingSkeleton height="h-10" width="w-24" variant="rounded" />
        </div>
      </div>
    ),
    ssr: false
  }
)

export const LazyCalendarConnection = dynamic(
  () => import('@/components/settings/CalendarConnection').then(mod => ({ default: mod.CalendarConnection })),
  {
    loading: () => (
      <div className="space-y-4">
        <LoadingSkeleton height="h-6" width="w-32" />
        <div className="flex items-center justify-between p-4 border border-secondary-200 dark:border-secondary-700 rounded-lg">
          <div className="space-y-2">
            <LoadingSkeleton height="h-5" width="w-24" />
            <LoadingSkeleton height="h-4" width="w-32" />
          </div>
          <LoadingSkeleton height="h-8" width="w-20" variant="rounded" />
        </div>
      </div>
    ),
    ssr: false
  }
)

// Utility component for code splitting with suspense
export function LazyWrapper({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  return (
    <div className="min-h-[200px]">
      {children}
    </div>
  )
}