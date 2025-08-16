'use client'

import { useState, useEffect } from 'react'

export function useOffline() {
  const [isOffline, setIsOffline] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    // Check initial state
    setIsOffline(!navigator.onLine)

    const handleOnline = () => {
      setIsOffline(false)
      if (wasOffline) {
        // Show reconnection message
        console.log('Back online!')
        setWasOffline(false)
      }
    }

    const handleOffline = () => {
      setIsOffline(true)
      setWasOffline(true)
      console.log('Gone offline!')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline])

  return { isOffline, wasOffline }
}