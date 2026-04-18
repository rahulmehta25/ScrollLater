'use client'

import { useEffect, useState, useRef } from 'react'
import { RefreshCw } from 'lucide-react'

export function ServiceWorkerRegistration() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw-custom.js', {
          scope: '/',
        })
        setRegistration(reg)

        // Check for updates on load
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true)
            }
          })
        })

        // Check for updates periodically
        intervalRef.current = setInterval(() => {
          reg.update()
        }, 60 * 60 * 1000) // Check every hour

        console.log('Service Worker registered successfully')
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }

    registerSW()

    // Listen for controller changes
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const handleUpdate = () => {
    if (!registration?.waiting) return

    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  if (!updateAvailable) return null

  return (
    <div className="fixed top-4 left-4 right-4 z-50">
      <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4 max-w-md mx-auto flex items-center justify-between">
        <div>
          <p className="font-medium">Update Available</p>
          <p className="text-sm text-blue-100">A new version is ready to install.</p>
        </div>
        <button
          onClick={handleUpdate}
          className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Update
        </button>
      </div>
    </div>
  )
}
