'use client'

import { forwardRef, InputHTMLAttributes, useState, useId } from 'react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { ExclamationCircleIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: boolean | string
  success?: boolean
  helperText?: string
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  showPasswordToggle?: boolean
  loading?: boolean
  variant?: 'default' | 'filled' | 'borderless'
  inputSize?: 'sm' | 'md' | 'lg'
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    label,
    error,
    success,
    helperText,
    icon,
    iconPosition = 'left',
    showPasswordToggle = false,
    loading = false,
    variant = 'default',
    inputSize = 'md',
    type: initialType = 'text',
    id: providedId,
    disabled,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const generatedId = useId()
    const id = providedId || generatedId

    const type = showPasswordToggle && initialType === 'password' 
      ? (showPassword ? 'text' : 'password')
      : initialType

    const hasError = Boolean(error)
    const errorMessage = typeof error === 'string' ? error : undefined
    const isPassword = initialType === 'password' && showPasswordToggle

    const baseClasses = 'block w-full rounded-lg transition-all duration-200 focus:outline-none'
    
    const variantClasses = {
      default: 'border bg-white dark:bg-secondary-800',
      filled: 'border-0 bg-secondary-100 dark:bg-secondary-800',
      borderless: 'border-0 bg-transparent'
    }

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-sm',
      lg: 'px-4 py-4 text-base'
    }

    const stateClasses = {
      default: 'border-secondary-300 dark:border-secondary-600 text-secondary-900 dark:text-secondary-100 placeholder-secondary-500 dark:placeholder-secondary-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
      error: 'border-error-300 dark:border-error-600 text-error-900 dark:text-error-100 placeholder-error-500 dark:placeholder-error-400 focus:border-error-500 focus:ring-2 focus:ring-error-500/20',
      success: 'border-success-300 dark:border-success-600 text-success-900 dark:text-success-100 placeholder-success-500 dark:placeholder-success-400 focus:border-success-500 focus:ring-2 focus:ring-success-500/20',
      disabled: 'border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800 text-secondary-500 dark:text-secondary-400 cursor-not-allowed'
    }

    const getStateClass = () => {
      if (disabled) return stateClasses.disabled
      if (hasError) return stateClasses.error
      if (success) return stateClasses.success
      return stateClasses.default
    }

    const inputClasses = clsx(
      baseClasses,
      variantClasses[variant],
      sizeClasses[inputSize],
      getStateClass(),
      {
        'pl-10': icon && iconPosition === 'left',
        'pr-10': icon && iconPosition === 'right',
        'pr-10': isPassword && !icon,
        'pr-16': isPassword && icon && iconPosition === 'left',
      },
      className
    )

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <motion.label
            htmlFor={id}
            className={clsx(
              'block text-sm font-medium mb-2 transition-colors',
              hasError 
                ? 'text-error-700 dark:text-error-300'
                : success
                ? 'text-success-700 dark:text-success-300'
                : 'text-secondary-700 dark:text-secondary-300'
            )}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.label>
        )}

        {/* Input container */}
        <div className="relative">
          {/* Left icon */}
          {icon && iconPosition === 'left' && (
            <div className={clsx(
              'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none',
              hasError 
                ? 'text-error-400 dark:text-error-500'
                : success
                ? 'text-success-400 dark:text-success-500'
                : 'text-secondary-400 dark:text-secondary-500'
            )}>
              <div className="h-5 w-5">
                {icon}
              </div>
            </div>
          )}

          {/* Input */}
          <motion.input
            ref={ref}
            type={type}
            id={id}
            className={inputClasses}
            disabled={disabled || loading}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            aria-invalid={hasError}
            aria-describedby={
              (helperText || errorMessage) ? `${id}-description` : undefined
            }
            whileFocus={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            {...props}
          />

          {/* Right icon or password toggle */}
          <div className="absolute inset-y-0 right-0 flex items-center">
            {/* Status icon */}
            {(hasError || success) && !isPassword && (
              <div className={clsx(
                'pr-3',
                hasError 
                  ? 'text-error-400 dark:text-error-500'
                  : 'text-success-400 dark:text-success-500'
              )}>
                {hasError ? (
                  <ExclamationCircleIcon className="h-5 w-5" />
                ) : (
                  <CheckCircleIcon className="h-5 w-5" />
                )}
              </div>
            )}

            {/* Password toggle */}
            {isPassword && (
              <button
                type="button"
                className={clsx(
                  'pr-3 text-secondary-400 hover:text-secondary-600 dark:text-secondary-500 dark:hover:text-secondary-300 focus:outline-none focus:text-secondary-600 dark:focus:text-secondary-300',
                  (hasError || success) && 'pr-10'
                )}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            )}

            {/* Right icon (non-password) */}
            {icon && iconPosition === 'right' && !isPassword && (
              <div className={clsx(
                'pr-3 pointer-events-none',
                hasError 
                  ? 'text-error-400 dark:text-error-500'
                  : success
                  ? 'text-success-400 dark:text-success-500'
                  : 'text-secondary-400 dark:text-secondary-500'
              )}>
                <div className="h-5 w-5">
                  {icon}
                </div>
              </div>
            )}

            {/* Loading spinner */}
            {loading && (
              <div className="pr-3">
                <motion.div
                  className="h-5 w-5 border-2 border-primary-300 border-t-primary-600 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              </div>
            )}
          </div>

          {/* Focus ring */}
          <AnimatePresence>
            {isFocused && (
              <motion.div
                className={clsx(
                  'absolute inset-0 rounded-lg pointer-events-none',
                  hasError 
                    ? 'ring-2 ring-error-500/20'
                    : success
                    ? 'ring-2 ring-success-500/20'
                    : 'ring-2 ring-primary-500/20'
                )}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Helper text or error message */}
        <AnimatePresence mode="wait">
          {(helperText || errorMessage) && (
            <motion.p
              id={`${id}-description`}
              className={clsx(
                'mt-2 text-sm',
                hasError 
                  ? 'text-error-600 dark:text-error-400'
                  : success
                  ? 'text-success-600 dark:text-success-400'
                  : 'text-secondary-500 dark:text-secondary-400'
              )}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              role={hasError ? 'alert' : undefined}
            >
              {errorMessage || helperText}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
export type { InputProps }

// Textarea component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: boolean | string
  success?: boolean
  helperText?: string
  resize?: 'none' | 'both' | 'horizontal' | 'vertical'
  variant?: 'default' | 'filled' | 'borderless'
  inputSize?: 'sm' | 'md' | 'lg'
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    className,
    label,
    error,
    success,
    helperText,
    resize = 'vertical',
    variant = 'default',
    inputSize = 'md',
    id: providedId,
    disabled,
    rows = 4,
    ...props
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const generatedId = useId()
    const id = providedId || generatedId

    const hasError = Boolean(error)
    const errorMessage = typeof error === 'string' ? error : undefined

    const baseClasses = 'block w-full rounded-lg transition-all duration-200 focus:outline-none'
    
    const variantClasses = {
      default: 'border bg-white dark:bg-secondary-800',
      filled: 'border-0 bg-secondary-100 dark:bg-secondary-800',
      borderless: 'border-0 bg-transparent'
    }

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-sm',
      lg: 'px-4 py-4 text-base'
    }

    const resizeClasses = {
      none: 'resize-none',
      both: 'resize',
      horizontal: 'resize-x',
      vertical: 'resize-y'
    }

    const stateClasses = {
      default: 'border-secondary-300 dark:border-secondary-600 text-secondary-900 dark:text-secondary-100 placeholder-secondary-500 dark:placeholder-secondary-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
      error: 'border-error-300 dark:border-error-600 text-error-900 dark:text-error-100 placeholder-error-500 dark:placeholder-error-400 focus:border-error-500 focus:ring-2 focus:ring-error-500/20',
      success: 'border-success-300 dark:border-success-600 text-success-900 dark:text-success-100 placeholder-success-500 dark:placeholder-success-400 focus:border-success-500 focus:ring-2 focus:ring-success-500/20',
      disabled: 'border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800 text-secondary-500 dark:text-secondary-400 cursor-not-allowed'
    }

    const getStateClass = () => {
      if (disabled) return stateClasses.disabled
      if (hasError) return stateClasses.error
      if (success) return stateClasses.success
      return stateClasses.default
    }

    const textareaClasses = clsx(
      baseClasses,
      variantClasses[variant],
      sizeClasses[inputSize],
      resizeClasses[resize],
      getStateClass(),
      className
    )

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <motion.label
            htmlFor={id}
            className={clsx(
              'block text-sm font-medium mb-2 transition-colors',
              hasError 
                ? 'text-error-700 dark:text-error-300'
                : success
                ? 'text-success-700 dark:text-success-300'
                : 'text-secondary-700 dark:text-secondary-300'
            )}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.label>
        )}

        {/* Textarea container */}
        <div className="relative">
          <motion.textarea
            ref={ref}
            id={id}
            rows={rows}
            className={textareaClasses}
            disabled={disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            aria-invalid={hasError}
            aria-describedby={
              (helperText || errorMessage) ? `${id}-description` : undefined
            }
            whileFocus={{ scale: 1.005 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            {...props}
          />

          {/* Status icon */}
          {(hasError || success) && (
            <div className={clsx(
              'absolute top-3 right-3',
              hasError 
                ? 'text-error-400 dark:text-error-500'
                : 'text-success-400 dark:text-success-500'
            )}>
              {hasError ? (
                <ExclamationCircleIcon className="h-5 w-5" />
              ) : (
                <CheckCircleIcon className="h-5 w-5" />
              )}
            </div>
          )}

          {/* Focus ring */}
          <AnimatePresence>
            {isFocused && (
              <motion.div
                className={clsx(
                  'absolute inset-0 rounded-lg pointer-events-none',
                  hasError 
                    ? 'ring-2 ring-error-500/20'
                    : success
                    ? 'ring-2 ring-success-500/20'
                    : 'ring-2 ring-primary-500/20'
                )}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Helper text or error message */}
        <AnimatePresence mode="wait">
          {(helperText || errorMessage) && (
            <motion.p
              id={`${id}-description`}
              className={clsx(
                'mt-2 text-sm',
                hasError 
                  ? 'text-error-600 dark:text-error-400'
                  : success
                  ? 'text-success-600 dark:text-success-400'
                  : 'text-secondary-500 dark:text-secondary-400'
              )}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              role={hasError ? 'alert' : undefined}
            >
              {errorMessage || helperText}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'