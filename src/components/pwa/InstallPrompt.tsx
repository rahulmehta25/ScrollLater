'use client'

import { useState, useEffect } from 'react'
import { X, Download, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    setIsStandalone(standalone)

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(ios)

    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10)
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissed < 14) {
        return
      }
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Delay so the demo remains unobstructed on first look
      setTimeout(() => setShowPrompt(true), 12000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    if (ios && !standalone) {
      setTimeout(() => setShowPrompt(true), 16000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setExpanded(true)
      return
    }

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowPrompt(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setExpanded(false)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  if (isStandalone || !showPrompt) return null

  return (
    <div className="fixed bottom-20 lg:bottom-5 right-4 z-40 animate-slide-up pointer-events-none">
      <div className="pointer-events-auto max-w-[280px] ml-auto">
        {!expanded ? (
          <div className="flex items-center gap-2 rounded-full bg-white/95 backdrop-blur border border-gray-200 shadow-lg pl-2 pr-1 py-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-3.5 h-3.5 text-white" />
            </div>
            <button
              onClick={() => setExpanded(true)}
              className="text-left min-w-0 py-1"
            >
              <p className="text-xs font-semibold text-gray-900 leading-tight">Install app</p>
              <p className="text-[10px] text-gray-500 leading-tight truncate">Optional shortcut</p>
            </button>
            <button
              onClick={handleInstall}
              className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gray-900 text-white text-[11px] font-medium hover:bg-gray-800 transition-colors"
              aria-label="Install ScrollLater"
            >
              <Download className="w-3 h-3" />
              Get
            </button>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Dismiss install prompt"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="relative bg-white/95 backdrop-blur rounded-2xl shadow-lg border border-gray-200 p-3.5">
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3 pr-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">
                  Install ScrollLater
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Optional. Add a home screen shortcut for offline access. You can keep browsing without it.
                </p>

                {isIOS ? (
                  <div className="mt-2.5 text-xs text-gray-600 bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <p className="font-medium mb-1">On iOS Safari</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-gray-500">
                      <li>Tap Share</li>
                      <li>Choose Add to Home Screen</li>
                      <li>Confirm Add</li>
                    </ol>
                  </div>
                ) : deferredPrompt ? (
                  <button
                    onClick={handleInstall}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-xs font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Install
                  </button>
                ) : (
                  <p className="mt-2.5 text-[11px] text-gray-400">
                    Use your browser menu to install when available.
                  </p>
                )}

                <button
                  onClick={() => setExpanded(false)}
                  className="mt-2 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Collapse
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
