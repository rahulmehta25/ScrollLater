'use client'

import React, { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Button } from './Button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
  className?: string
  overlayClassName?: string
  contentClassName?: string
  initialFocus?: React.RefObject<HTMLElement>
  preventScroll?: boolean
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
  overlayClassName,
  contentClassName,
  initialFocus,
  preventScroll = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // Size variants
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4',
  }

  // Focus management
  const focusableElementsSelector = 
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

  const getFocusableElements = useCallback(() => {
    if (!modalRef.current) return []
    return Array.from(
      modalRef.current.querySelectorAll(focusableElementsSelector)
    ) as HTMLElement[]
  }, [])

  const trapFocus = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return

    const focusableElements = getFocusableElements()
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (event.key === 'Tab') {
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement?.focus()
        }
      }
    }
  }, [isOpen, getFocusableElements])

  // Handle escape key
  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && closeOnEscape && isOpen) {
      onClose()
    }
  }, [closeOnEscape, isOpen, onClose])

  // Handle overlay click
  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose()
    }
  }, [closeOnOverlayClick, onClose])

  // Set up event listeners and focus management
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement

      // Prevent body scroll if requested
      if (preventScroll) {
        document.body.style.overflow = 'hidden'
      }

      // Add event listeners
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('keydown', trapFocus)

      // Focus management
      const timer = setTimeout(() => {
        if (initialFocus?.current) {
          initialFocus.current.focus()
        } else {
          const focusableElements = getFocusableElements()
          const firstFocusable = focusableElements[0]
          if (firstFocusable) {
            firstFocusable.focus()
          } else {
            modalRef.current?.focus()
          }
        }
      }, 100)

      return () => {
        clearTimeout(timer)
        document.removeEventListener('keydown', handleEscape)
        document.removeEventListener('keydown', trapFocus)
      }
    } else {
      // Restore body scroll
      if (preventScroll) {
        document.body.style.overflow = ''
      }

      // Restore focus to the previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
        previousActiveElement.current = null
      }
    }
  }, [isOpen, handleEscape, trapFocus, getFocusableElements, initialFocus, preventScroll])

  if (typeof window === 'undefined') return null

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Overlay */}
          <motion.div
            className={clsx(
              'fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm',
              overlayClassName
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleOverlayClick}
            aria-hidden="true"
          />

          {/* Modal container */}
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              ref={modalRef}
              className={clsx(
                'relative w-full bg-white dark:bg-secondary-900 rounded-xl shadow-xl',
                sizeClasses[size],
                className
              )}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 25,
                opacity: { duration: 0.2 }
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? 'modal-title' : undefined}
              aria-describedby={description ? 'modal-description' : undefined}
              tabIndex={-1}
            >
              {/* Close button */}
              {showCloseButton && (
                <div className="absolute right-4 top-4 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="text-secondary-400 hover:text-secondary-500 dark:text-secondary-500 dark:hover:text-secondary-400"
                    aria-label="Close modal"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </Button>
                </div>
              )}

              {/* Content */}
              <div className={clsx('p-6', contentClassName)}>
                {/* Header */}
                {(title || description) && (
                  <div className={clsx('mb-6', showCloseButton && 'pr-10')}>
                    {title && (
                      <h2
                        id="modal-title"
                        className="text-lg font-semibold text-secondary-900 dark:text-secondary-100"
                      >
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p
                        id="modal-description"
                        className={clsx(
                          'text-secondary-600 dark:text-secondary-400',
                          title && 'mt-2'
                        )}
                      >
                        {description}
                      </p>
                    )}
                  </div>
                )}

                {/* Main content */}
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )

  return createPortal(modalContent, document.body)
}

// Confirmation dialog component
interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  loading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    if (!loading) {
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
      showCloseButton={!loading}
    >
      <div className="space-y-6">
        <p className="text-secondary-600 dark:text-secondary-400">
          {message}
        </p>
        
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'primary'}
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Hook for confirm dialog
export function useConfirmDialog() {
  const [state, setState] = React.useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    variant?: 'default' | 'destructive'
    confirmText?: string
    cancelText?: string
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

  const confirm = useCallback((props: Omit<typeof state, 'isOpen'>) => {
    return new Promise<boolean>((resolve) => {
      setState({
        ...props,
        isOpen: true,
        onConfirm: () => {
          props.onConfirm()
          resolve(true)
        },
      })
    })
  }, [])

  const handleClose = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }))
  }, [])

  const ConfirmDialogComponent = useCallback(() => (
    <ConfirmDialog
      isOpen={state.isOpen}
      onClose={handleClose}
      onConfirm={state.onConfirm}
      title={state.title}
      message={state.message}
      variant={state.variant}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
    />
  ), [state, handleClose])

  return { confirm, ConfirmDialog: ConfirmDialogComponent }
}