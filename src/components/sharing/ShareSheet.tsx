'use client'

import { useState, useCallback } from 'react'
import { Share2, Copy, Check, X, Twitter, Mail, MessageCircle, Link as LinkIcon } from 'lucide-react'
import { createPortal } from 'react-dom'

interface ShareSheetProps {
  title: string
  text?: string
  url: string
  onClose?: () => void
}

export function ShareSheet({ title, text, url, onClose }: ShareSheetProps) {
  const [copied, setCopied] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)

  const shareData = {
    title,
    text: text || title,
    url,
  }

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function' && navigator.canShare?.(shareData)

  const handleNativeShare = useCallback(async () => {
    if (!canNativeShare) return

    try {
      await navigator.share(shareData)
      onClose?.()
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setShareError('Failed to share')
      }
    }
  }, [shareData, canNativeShare, onClose])

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setShareError('Failed to copy link')
    }
  }, [url])

  const handleShareVia = useCallback((platform: string) => {
    const encodedUrl = encodeURIComponent(url)
    const encodedTitle = encodeURIComponent(title)
    const encodedText = encodeURIComponent(text || title)

    let shareUrl = ''

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
        break
      case 'email':
        shareUrl = `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`
        break
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`
        break
      case 'sms':
        shareUrl = `sms:?body=${encodedText}%20${encodedUrl}`
        break
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer')
    }
  }, [url, title, text])

  const shareOptions = [
    { id: 'twitter', icon: Twitter, label: 'Twitter', color: 'bg-sky-500' },
    { id: 'email', icon: Mail, label: 'Email', color: 'bg-gray-600' },
    { id: 'whatsapp', icon: MessageCircle, label: 'WhatsApp', color: 'bg-green-500' },
  ]

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md mx-auto animate-slide-up pb-safe">
        {/* Handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Share</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content Preview */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <LinkIcon className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{title}</p>
              <p className="text-sm text-gray-500 truncate">{url}</p>
            </div>
          </div>
        </div>

        {/* Native Share Button (if available) */}
        {canNativeShare && (
          <div className="p-4 border-b border-gray-100">
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium"
            >
              <Share2 className="w-5 h-5" />
              Share via...
            </button>
          </div>
        )}

        {/* Share Options */}
        <div className="p-4 border-b border-gray-100">
          <p className="text-sm text-gray-500 mb-3">Share to</p>
          <div className="flex gap-4 justify-center">
            {shareOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleShareVia(option.id)}
                className="flex flex-col items-center gap-2"
              >
                <div className={`w-12 h-12 ${option.color} rounded-full flex items-center justify-center`}>
                  <option.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs text-gray-600">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Copy Link */}
        <div className="p-4">
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copy Link
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {shareError && (
          <div className="px-4 pb-4">
            <p className="text-sm text-red-500 text-center">{shareError}</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// Hook to use the share sheet
export function useShareSheet() {
  const [shareData, setShareData] = useState<ShareSheetProps | null>(null)

  const openShare = useCallback((data: Omit<ShareSheetProps, 'onClose'>) => {
    setShareData({ ...data, onClose: () => setShareData(null) })
  }, [])

  const closeShare = useCallback(() => {
    setShareData(null)
  }, [])

  const ShareSheetComponent = shareData ? (
    <ShareSheet {...shareData} />
  ) : null

  return { openShare, closeShare, ShareSheetComponent }
}
