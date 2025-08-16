'use client'

import { useOffline } from '@/hooks/useOffline'
import { WifiIcon, NoSymbolIcon } from '@heroicons/react/24/outline'
import { Badge } from './Badge'

export function OfflineIndicator() {
  const { isOffline, wasOffline } = useOffline()

  if (!isOffline && !wasOffline) return null

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-down">
      <Badge 
        variant={isOffline ? 'error' : 'success'} 
        className="flex items-center space-x-2 shadow-lg"
      >
        {isOffline ? (
          <>
            <NoSymbolIcon className="h-4 w-4" />
            <span>Offline</span>
          </>
        ) : (
          <>
            <WifiIcon className="h-4 w-4" />
            <span>Back online</span>
          </>
        )}
      </Badge>
    </div>
  )
}