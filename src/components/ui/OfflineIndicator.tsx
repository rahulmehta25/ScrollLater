'use client'

import { useOfflineSync } from '@/hooks/useOfflineSync'
import { Wifi, WifiOff, CloudOff, RefreshCw } from 'lucide-react'

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingActions, hasPendingChanges, triggerSync, error } = useOfflineSync()

  if (isOnline && !hasPendingChanges && !error) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {!isOnline && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg shadow-lg mb-2">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">You are offline</span>
        </div>
      )}

      {hasPendingChanges && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg shadow-lg">
          {isSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Syncing changes...</span>
            </>
          ) : (
            <>
              <CloudOff className="w-4 h-4" />
              <span className="text-sm font-medium">
                {pendingActions} pending {pendingActions === 1 ? 'change' : 'changes'}
              </span>
              {isOnline && (
                <button
                  onClick={triggerSync}
                  className="ml-2 text-xs bg-blue-200 hover:bg-blue-300 px-2 py-1 rounded transition-colors"
                >
                  Sync now
                </button>
              )}
            </>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg shadow-lg mt-2">
          <CloudOff className="w-4 h-4" />
          <span className="text-sm font-medium">Sync error</span>
        </div>
      )}
    </div>
  )
}

export function ConnectionStatus() {
  const { isOnline, lastSync } = useOfflineSync()

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      {isOnline ? (
        <Wifi className="w-4 h-4 text-green-500" />
      ) : (
        <WifiOff className="w-4 h-4 text-yellow-500" />
      )}
      <span>{isOnline ? 'Connected' : 'Offline'}</span>
      {lastSync && (
        <span className="text-xs text-gray-400">
          Last sync: {formatRelativeTime(lastSync)}
        </span>
      )}
    </div>
  )
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return date.toLocaleDateString()
}
