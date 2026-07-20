'use client'

import { forwardRef, ButtonHTMLAttributes, useState } from 'react'
import { clsx } from 'clsx'
import { Slot } from '@radix-ui/react-slot'
import { motion, HTMLMotionProps } from 'framer-motion'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'warning'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon'
  asChild?: boolean
  loading?: boolean
  loadingText?: string
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  animate?: boolean
  ripple?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    asChild = false, 
    loading = false,
    loadingText,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    animate = true,
    ripple = true,
    disabled,
    children,
    onClick,
    ...props 
  }, ref) => {
    const [isPressed, setIsPressed] = useState(false)
    const [rippleCoords, setRippleCoords] = useState<{ x: number; y: number } | null>(null)
    
    const Comp = asChild ? Slot : (animate ? motion.button : 'button')
    
    const baseStyles = 'relative inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 overflow-hidden group'
    
    const variants = {
      primary: 'bg-primary-600 text-white shadow-sm hover:bg-primary-700 hover:shadow-md focus:ring-primary-500 dark:bg-primary-500 dark:hover:bg-primary-600 active:scale-[0.98]',
      secondary: 'bg-secondary-100 text-secondary-900 shadow-sm hover:bg-secondary-200 hover:shadow-md focus:ring-secondary-500 dark:bg-secondary-800 dark:text-secondary-100 dark:hover:bg-secondary-700 active:scale-[0.98]',
      outline: 'border border-secondary-300 bg-transparent text-secondary-700 shadow-sm hover:bg-secondary-50 hover:shadow-md focus:ring-secondary-500 dark:border-secondary-600 dark:text-secondary-300 dark:hover:bg-secondary-800 active:scale-[0.98]',
      ghost: 'text-secondary-700 hover:bg-secondary-100 focus:ring-secondary-500 dark:text-secondary-300 dark:hover:bg-secondary-800 active:scale-[0.98]',
      destructive: 'bg-error-600 text-white shadow-sm hover:bg-error-700 hover:shadow-md focus:ring-error-500 active:scale-[0.98]',
      success: 'bg-success-600 text-white shadow-sm hover:bg-success-700 hover:shadow-md focus:ring-success-500 active:scale-[0.98]',
      warning: 'bg-warning-600 text-white shadow-sm hover:bg-warning-700 hover:shadow-md focus:ring-warning-500 active:scale-[0.98]'
    }
    
    const sizes = {
      xs: 'h-7 px-2 text-xs gap-1.5',
      sm: 'h-8 px-3 text-sm gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2',
      xl: 'h-14 px-8 text-lg gap-3',
      icon: 'h-10 w-10'
    }

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return
      
      // Create ripple effect
      if (ripple && event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        setRippleCoords({ x, y })
        
        // Clear ripple after animation
        setTimeout(() => setRippleCoords(null), 600)
      }
      
      // Trigger press animation
      setIsPressed(true)
      setTimeout(() => setIsPressed(false), 150)
      
      onClick?.(event)
    }
    
    const motionProps = animate ? {
      whileTap: { scale: 0.98 },
      whileHover: { scale: 1.02 },
      transition: { type: "spring", stiffness: 400, damping: 17 }
    } : {}
    
    const iconSizeMap = {
      xs: 'h-3 w-3',
      sm: 'h-3.5 w-3.5', 
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
      xl: 'h-6 w-6',
      icon: 'h-5 w-5'
    }
    
    const loadingSpinner = loading && (
      <svg
        className={clsx('animate-spin', iconSizeMap[size])}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    )
    
    const iconElement = icon && (
      <span className={clsx(iconSizeMap[size])} aria-hidden="true">
        {icon}
      </span>
    )
    
    const content = loading ? (
      <>
        {loadingSpinner}
        {loadingText || children}
      </>
    ) : (
      <>
        {iconPosition === 'left' && iconElement}
        {children}
        {iconPosition === 'right' && iconElement}
      </>
    )

    return (
      <Comp
        className={clsx(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          isPressed && 'scale-95',
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        onClick={handleClick}
        aria-pressed={isPressed}
        aria-disabled={disabled || loading}
        {...(animate ? motionProps : {})}
        {...props}
      >
        {/* Ripple effect */}
        {ripple && rippleCoords && (
          <span
            className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none"
            aria-hidden="true"
          >
            <span
              className="absolute bg-white opacity-30 rounded-full animate-ping"
              style={{
                left: rippleCoords.x - 10,
                top: rippleCoords.y - 10,
                width: 20,
                height: 20,
              }}
            />
          </span>
        )}
        
        {/* Hover gradient overlay */}
        <span 
          className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" 
          aria-hidden="true"
        />
        
        {/* Content */}
        <span className="relative z-10 flex items-center justify-center gap-inherit">
          {content}
        </span>
      </Comp>
    )
  }
)

Button.displayName = 'Button'

export { Button }
export type { ButtonProps }