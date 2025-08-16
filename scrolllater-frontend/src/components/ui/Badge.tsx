'use client'

import { forwardRef, HTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'secondary', size = 'md', dot = false, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center font-medium rounded-full transition-colors'
    
    const variants = {
      primary: 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200',
      secondary: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-800 dark:text-secondary-200',
      success: 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200',
      warning: 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200',
      error: 'bg-error-100 text-error-800 dark:bg-error-900 dark:text-error-200',
      outline: 'border border-secondary-300 text-secondary-700 dark:border-secondary-600 dark:text-secondary-300'
    }
    
    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-0.5 text-sm',
      lg: 'px-3 py-1 text-sm'
    }
    
    const dotSizes = {
      sm: 'h-2 w-2',
      md: 'h-2.5 w-2.5',
      lg: 'h-3 w-3'
    }

    return (
      <div
        ref={ref}
        className={clsx(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {dot && (
          <div 
            className={clsx(
              'rounded-full mr-1.5',
              dotSizes[size],
              variant === 'primary' && 'bg-primary-500',
              variant === 'secondary' && 'bg-secondary-500',
              variant === 'success' && 'bg-success-500',
              variant === 'warning' && 'bg-warning-500',
              variant === 'error' && 'bg-error-500',
              variant === 'outline' && 'bg-secondary-400'
            )}
          />
        )}
        {children}
      </div>
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }
export type { BadgeProps }