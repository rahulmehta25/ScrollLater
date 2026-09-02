'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { X, Download, BookOpen } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const pathname = usePathname()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // Keep the marketing landing uncluttered; only nudge inside the app
  const allowPrompt = pathname?.startsWith('/library') || pathname?.startsWith('/dashboard')

  useEffect(() => {
    if (!allowPrompt) return

    const standalone = window.matchMedia('(display-mode: standalone)').matches
    setIsStandalone(standalone)

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(ios)

    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10)
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissed < 21) {
        return
      }
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setTimeout(() => setShowPrompt(true), 18000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    if (ios && !standalone) {
      setTimeout(() => setShowPrompt(true), 22000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [allowPrompt])

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

  if (!allowPrompt || isStandalone || !showPrompt) return null

  return (
    <div className="fixed bottom-20 lg:bottom-5 right-4 z-40 animate-slide-up pointer-events-none">
      <div className="pointer-events-auto max-w-[260px] ml-auto">
        {!expanded ? (
          <div className="flex items-center gap-2 rounded-full bg-paper-raised/95 backdrop-blur border border-paper-deep shadow-soft pl-2 pr-1 py-1">
            <div className="w-8 h-8 rounded-full bg-terracotta-500 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <button
              onClick={() => setExpanded(true)}
              className="text-left min-w-0 py-1"
            >
              <p className="text-xs font-medium text-ink leading-tight">Add to home</p>
              <p className="text-[10px] text-ink-subtle leading-tight truncate">Optional</p>
            </button>
            <button
              onClick={handleInstall}
              className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-ink text-paper-raised text-[11px] font-medium hover:bg-ink/90 transition-colors"
              aria-label="Install ScrollLater"
            >
              <Download className="w-3 h-3" />
              Get
            </button>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1.5 text-ink-faint hover:text-ink-muted rounded-full hover:bg-paper-muted transition-colors"
              aria-label="Dismiss install prompt"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="relative bg-paper-raised/95 backdrop-blur rounded-2xl shadow-soft border border-paper-deep p-3.5">
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1 text-ink-faint hover:text-ink-muted rounded-lg hover:bg-paper-muted transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3 pr-4">
              <div className="w-10 h-10 bg-terracotta-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="font-serif text-sm tracking-display text-ink">
                  Keep ScrollLater handy
                </h3>
                <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                  Optional home screen shortcut for offline reading. Easy to dismiss.
                </p>

                {isIOS ? (
                  <div className="mt-2.5 text-xs text-ink-muted bg-paper-soft rounded-lg p-2.5 border border-paper-deep">
                    <p className="font-medium mb-1 text-ink">On iOS Safari</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-ink-subtle">
                      <li>Tap Share</li>
                      <li>Choose Add to Home Screen</li>
                      <li>Confirm Add</li>
                    </ol>
                  </div>
                ) : deferredPrompt ? (
                  <button
                    onClick={handleInstall}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink text-paper-raised rounded-lg hover:bg-ink/90 transition-colors text-xs font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Install
                  </button>
                ) : (
                  <p className="mt-2.5 text-[11px] text-ink-faint">
                    Use your browser menu to install when available.
                  </p>
                )}

                <button
                  onClick={() => setExpanded(false)}
                  className="mt-2 text-[11px] text-ink-faint hover:text-ink-muted transition-colors"
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
