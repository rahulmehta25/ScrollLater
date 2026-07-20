'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import { 
  WifiIcon, 
  SignalIcon, 
  CloudIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useNetworkStatus, useServiceWorker, useCacheManagement } from '@/hooks/usePWA'
import { Button } from './Button'
import { Badge } from './Badge'

interface OfflineIndicatorProps {
  showDetails?: boolean
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  autoHide?: boolean
  autoHideDelay?: number
}

export function EnhancedOfflineIndicator({
  showDetails = true,
  position = 'top-right',
  autoHide = true,
  autoHideDelay = 3000
}: OfflineIndicatorProps) {
  const { isOnline, connectionType, effectiveType } = useNetworkStatus()
  const { updateAvailable, updateServiceWorker, isUpdating } = useServiceWorker()
  const { cacheSize } = useCacheManagement()
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)

  // Show indicator when offline or when update is available
  useEffect(() => {
    if (!isOnline || updateAvailable) {
      setIsVisible(true)
      setIsDismissed(false)
    } else if (isOnline && autoHide && !updateAvailable) {
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, autoHideDelay)
      return () => clearTimeout(timer)
    }
  }, [isOnline, updateAvailable, autoHide, autoHideDelay])

  useEffect(() => {
    if (updateAvailable && !showUpdatePrompt) {
      setShowUpdatePrompt(true)
    }
  }, [updateAvailable, showUpdatePrompt])

  const handleDismiss = () => {
    setIsVisible(false)
    setIsDismissed(true)
  }

  const handleUpdate = async () => {
    await updateServiceWorker()
    setShowUpdatePrompt(false)
  }

  const getConnectionQuality = () => {
    if (!isOnline) return 'offline'
    
    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        return 'poor'
      case '3g':
        return 'good'
      case '4g':
        return 'excellent'
      default:
        return 'unknown'
    }
  }

  const getConnectionIcon = () => {
    if (!isOnline) return ExclamationTriangleIcon
    
    const quality = getConnectionQuality()
    switch (quality) {
      case 'poor':
        return SignalIcon
      case 'good':
      case 'excellent':
        return WifiIcon
      default:
        return CloudIcon
    }
  }

  const getConnectionColor = () => {
    if (!isOnline) return 'text-error-500 bg-error-100 border-error-300'
    
    const quality = getConnectionQuality()
    switch (quality) {
      case 'poor':
        return 'text-warning-700 bg-warning-100 border-warning-300'
      case 'good':
        return 'text-success-600 bg-success-100 border-success-300'
      case 'excellent':
        return 'text-primary-600 bg-primary-100 border-primary-300'
      default:
        return 'text-secondary-600 bg-secondary-100 border-secondary-300'
    }
  }

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  }

  if (isDismissed || (!isVisible && isOnline && !updateAvailable)) {
    return null
  }

  const ConnectionIcon = getConnectionIcon()

  return (
    <div className={clsx('fixed z-50', positionClasses[position])}>
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: position.includes('top') ? -20 : 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position.includes('top') ? -20 : 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={clsx(
              'max-w-sm rounded-lg border shadow-lg backdrop-blur-sm',
              getConnectionColor()
            )}
          >
            {/* Update Available Prompt */}
            {showUpdatePrompt && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-current/20 p-3"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ArrowPathIcon className="h-4 w-4" />
                    <span className="font-medium text-sm">Update Available</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setShowUpdatePrompt(false)}
                    className="text-current opacity-70 hover:opacity-100"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs opacity-80 mb-2">
                  A new version of ScrollLater is available.
                </p>
                <Button
                  size="xs"
                  onClick={handleUpdate}
                  loading={isUpdating}
                  className="w-full"
                >
                  {isUpdating ? 'Updating...' : 'Update Now'}
                </Button>
              </motion.div>
            )}

            {/* Connection Status */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ConnectionIcon className="h-4 w-4" />
                  <span className="font-medium text-sm">
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                {isOnline && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleDismiss}
                    className="text-current opacity-70 hover:opacity-100"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {showDetails && (
                <div className="space-y-1 text-xs opacity-80">
                  {isOnline ? (
                    <>
                      <div className="flex justify-between">
                        <span>Connection:</span>
                        <span className="capitalize">{effectiveType || 'Unknown'}</span>
                      </div>
                      {connectionType !== 'unknown' && (
                        <div className="flex justify-between">
                          <span>Type:</span>
                          <span className="capitalize">{connectionType}</span>
                        </div>
                      )}
                      {cacheSize > 0 && (
                        <div className="flex justify-between">
                          <span>Cached:</span>
                          <span>{formatBytes(cacheSize)}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-1">
                      <p>You're currently offline.</p>
                      <p>Some features may be limited.</p>
                      {cacheSize > 0 && (
                        <p>Cached content is available.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Offline actions */}
              {!isOnline && (
                <div className="mt-3 space-y-2">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="w-full text-current border-current/30 hover:border-current/50"
                  >
                    <ArrowPathIcon className="h-3 w-3 mr-1" />
                    Retry Connection
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// PWA Install Prompt Component
interface PWAInstallPromptProps {
  onInstall?: () => void
  onDismiss?: () => void
}

export function PWAInstallPrompt({ onInstall, onDismiss }: PWAInstallPromptProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Show install prompt after user has spent some time on the app
    const timer = setTimeout(() => {
      const hasDismissed = localStorage.getItem('pwa-install-dismissed')
      if (!hasDismissed && !window.matchMedia('(display-mode: standalone)').matches) {
        setIsVisible(true)
      }
    }, 30000) // Show after 30 seconds

    return () => clearTimeout(timer)
  }, [])

  const handleInstall = () => {
    setIsVisible(false)
    onInstall?.()
  }

  const handleDismiss = () => {
    setIsVisible(false)
    setIsDismissed(true)
    localStorage.setItem('pwa-install-dismissed', 'true')
    onDismiss?.()
  }

  if (!isVisible || isDismissed) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm"
    >
      <div className="bg-white dark:bg-secondary-900 rounded-lg border border-secondary-200 dark:border-secondary-700 shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
              <CloudIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="font-medium text-secondary-900 dark:text-secondary-100 mb-1">
              Install ScrollLater
            </h3>
            <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-3">
              Add to your home screen for a better experience
            </p>
            
            <div className="flex gap-2">
              <Button size="sm" onClick={handleInstall}>
                Install
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDismiss}>
                Not now
              </Button>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="xs"
            onClick={handleDismiss}
            className="text-secondary-400 hover:text-secondary-600"
          >
            <XMarkIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}