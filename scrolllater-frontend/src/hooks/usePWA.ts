'use client'

import { useState, useEffect, useCallback } from 'react'

// PWA Installation Hook
export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Check if app is already installed
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches)

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) return false

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setIsInstallable(false)
        setDeferredPrompt(null)
        return true
      }
      return false
    } catch (error) {
      console.error('Error installing PWA:', error)
      return false
    }
  }, [deferredPrompt])

  return { isInstallable, isInstalled, install }
}

// Service Worker Hook
export function useServiceWorker() {
  const [isSupported, setIsSupported] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      setIsSupported(true)
      
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          setIsRegistered(true)
          setRegistration(registration)

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true)
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })

      // Listen for controlling service worker changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
    }
  }, [])

  const updateServiceWorker = useCallback(async () => {
    if (!registration || !updateAvailable) return false

    setIsUpdating(true)
    try {
      await registration.update()
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
      return true
    } catch (error) {
      console.error('Error updating service worker:', error)
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [registration, updateAvailable])

  return {
    isSupported,
    isRegistered,
    updateAvailable,
    isUpdating,
    updateServiceWorker
  }
}

// Network Status Hook
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [connectionType, setConnectionType] = useState<string>('unknown')
  const [effectiveType, setEffectiveType] = useState<string>('unknown')

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    const updateConnectionInfo = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection

      if (connection) {
        setConnectionType(connection.type || 'unknown')
        setEffectiveType(connection.effectiveType || 'unknown')
      }
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    const connection = (navigator as any).connection
    if (connection) {
      connection.addEventListener('change', updateConnectionInfo)
      updateConnectionInfo()
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
      if (connection) {
        connection.removeEventListener('change', updateConnectionInfo)
      }
    }
  }, [])

  return { isOnline, connectionType, effectiveType }
}

// Cache Management Hook
export function useCacheManagement() {
  const [cacheSize, setCacheSize] = useState(0)
  const [isClearing, setIsClearing] = useState(false)

  const calculateCacheSize = useCallback(async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        setCacheSize(estimate.usage || 0)
      } catch (error) {
        console.error('Error calculating cache size:', error)
      }
    }
  }, [])

  const clearCache = useCallback(async () => {
    setIsClearing(true)
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        )
      }
      
      // Clear IndexedDB data
      if ('indexedDB' in window) {
        // Implementation depends on your app's IndexedDB usage
      }
      
      await calculateCacheSize()
      return true
    } catch (error) {
      console.error('Error clearing cache:', error)
      return false
    } finally {
      setIsClearing(false)
    }
  }, [calculateCacheSize])

  useEffect(() => {
    calculateCacheSize()
  }, [calculateCacheSize])

  return { cacheSize, isClearing, clearCache, calculateCacheSize }
}

// Background Sync Hook
export function useBackgroundSync() {
  const [isSupported, setIsSupported] = useState(false)
  const [pendingActions, setPendingActions] = useState<any[]>([])

  useEffect(() => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      setIsSupported(true)
    }
  }, [])

  const scheduleSync = useCallback(async (tag: string, data?: any) => {
    if (!isSupported) return false

    try {
      const registration = await navigator.serviceWorker.ready
      await registration.sync.register(tag)
      
      // Store data in IndexedDB for the service worker to use
      if (data) {
        const pendingAction = { tag, data, timestamp: Date.now() }
        setPendingActions(prev => [...prev, pendingAction])
        
        // Store in IndexedDB
        if ('indexedDB' in window) {
          // Implementation would store in IndexedDB
        }
      }
      
      return true
    } catch (error) {
      console.error('Error scheduling background sync:', error)
      return false
    }
  }, [isSupported])

  return { isSupported, pendingActions, scheduleSync }
}

// Push Notifications Hook
export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false

    try {
      const permission = await Notification.requestPermission()
      setPermission(permission)
      return permission === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }, [isSupported])

  const subscribe = useCallback(async (vapidPublicKey: string) => {
    if (!isSupported || permission !== 'granted') return null

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey
      })
      
      setSubscription(subscription)
      return subscription
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      return null
    }
  }, [isSupported, permission])

  const unsubscribe = useCallback(async () => {
    if (!subscription) return false

    try {
      await subscription.unsubscribe()
      setSubscription(null)
      return true
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
      return false
    }
  }, [subscription])

  return {
    isSupported,
    permission,
    subscription,
    requestPermission,
    subscribe,
    unsubscribe
  }
}

// Share API Hook
export function useWebShare() {
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported('share' in navigator)
  }, [])

  const share = useCallback(async (data: ShareData) => {
    if (!isSupported) {
      // Fallback to clipboard API
      try {
        const text = `${data.title || ''}\n${data.text || ''}\n${data.url || ''}`
        await navigator.clipboard.writeText(text)
        return true
      } catch (error) {
        console.error('Error copying to clipboard:', error)
        return false
      }
    }

    try {
      await navigator.share(data)
      return true
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error sharing:', error)
      }
      return false
    }
  }, [isSupported])

  return { isSupported, share }
}

// File System Access Hook
export function useFileSystemAccess() {
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported('showOpenFilePicker' in window)
  }, [])

  const openFile = useCallback(async (options?: OpenFilePickerOptions) => {
    if (!isSupported) return null

    try {
      const [fileHandle] = await (window as any).showOpenFilePicker(options)
      const file = await fileHandle.getFile()
      return file
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error opening file:', error)
      }
      return null
    }
  }, [isSupported])

  const saveFile = useCallback(async (data: string, options?: SaveFilePickerOptions) => {
    if (!isSupported) {
      // Fallback to download
      const blob = new Blob([data], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = options?.suggestedName || 'file.txt'
      a.click()
      URL.revokeObjectURL(url)
      return true
    }

    try {
      const fileHandle = await (window as any).showSaveFilePicker(options)
      const writable = await fileHandle.createWritable()
      await writable.write(data)
      await writable.close()
      return true
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error saving file:', error)
      }
      return false
    }
  }, [isSupported])

  return { isSupported, openFile, saveFile }
}