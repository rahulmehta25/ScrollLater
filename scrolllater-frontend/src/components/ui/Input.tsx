'use client'

import { forwardRef, InputHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  helperText?: string
  label?: string
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type = 'text', 
    error = false, 
    helperText, 
    label, 
    icon, 
    iconPosition = 'left',
    id,
    ...props 
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
    
    const baseStyles = 'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-secondary-800 dark:text-secondary-100 dark:placeholder:text-secondary-500'
    
    const normalStyles = 'border-secondary-300 focus:border-primary-500 focus:ring-primary-500 dark:border-secondary-600 dark:focus:border-primary-400'
    const errorStyles = 'border-error-500 focus:border-error-500 focus:ring-error-500'
    
    const iconStyles = icon ? (iconPosition === 'left' ? 'pl-10' : 'pr-10') : ''

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={inputId}
            className="text-sm font-medium text-secondary-700 dark:text-secondary-300"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400">
              {icon}
            </div>
          )}
          
          <input
            type={type}
            className={clsx(
              baseStyles,
              error ? errorStyles : normalStyles,
              iconStyles,
              className
            )}
            ref={ref}
            id={inputId}
            aria-invalid={error}
            aria-describedby={helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          
          {icon && iconPosition === 'right' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400">
              {icon}
            </div>
          )}
        </div>
        
        {helperText && (
          <p 
            id={`${inputId}-helper`}
            className={clsx(
              'text-sm',
              error ? 'text-error-600 dark:text-error-400' : 'text-secondary-600 dark:text-secondary-400'
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
export type { InputProps }