'use client'

import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 bg-orange-100 rounded-full flex items-center justify-center">
          <WifiOff className="w-10 h-10 text-orange-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          You&apos;re Offline
        </h1>

        <p className="text-gray-600 mb-6">
          It looks like you&apos;ve lost your internet connection. Don&apos;t worry - any content you&apos;ve saved will sync automatically when you&apos;re back online.
        </p>

        <div className="space-y-4">
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>

          <div className="text-sm text-gray-500">
            <p>Your saved content is cached locally and accessible offline.</p>
          </div>
        </div>

        <div className="mt-8 p-4 bg-white rounded-lg border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-2">While offline you can:</h3>
          <ul className="text-sm text-gray-600 space-y-1 text-left">
            <li>• View your previously cached content</li>
            <li>• Save new links (they&apos;ll sync when online)</li>
            <li>• Browse your reading list</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
