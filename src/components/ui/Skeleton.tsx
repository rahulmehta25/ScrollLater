'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'skeleton-shimmer rounded',
        className
      )}
    />
  );
}

function SkeletonText({ className, lines = 1 }: SkeletonProps & { lines?: number }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('p-4 bg-white border border-gray-200 rounded-xl', className)}>
      <div className="flex gap-3">
        <Skeleton className="w-14 h-14 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-14 rounded" />
            <Skeleton className="h-5 w-20 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonCardGrid({ className }: SkeletonProps) {
  return (
    <div className={cn('bg-white border border-gray-200 rounded-xl overflow-hidden', className)}>
      <Skeleton className="h-28 w-full rounded-none" />
      <div className="p-3 space-y-2">
        <div className="flex gap-1.5">
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

function SkeletonAvatar({ className, size = 'md' }: SkeletonProps & { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return <Skeleton className={cn('rounded-full', sizes[size], className)} />;
}

function SkeletonSidebar({ className }: SkeletonProps) {
  return (
    <div className={cn('p-4 space-y-4', className)}>
      <div className="flex items-center gap-2.5">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="h-5 w-24" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
      <div className="space-y-1">
        <Skeleton className="h-3 w-16 mb-2" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-lg" />
        ))}
      </div>
      <div className="space-y-1 pt-2 border-t border-gray-100">
        <Skeleton className="h-3 w-20 mb-2" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function SkeletonStats({ className }: SkeletonProps) {
  return (
    <div className={cn('flex gap-4', className)}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex-1 p-4 bg-white border border-gray-200 rounded-xl">
          <Skeleton className="h-6 w-12 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonCardGrid,
  SkeletonAvatar,
  SkeletonSidebar,
  SkeletonStats,
};
