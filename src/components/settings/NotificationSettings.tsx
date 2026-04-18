'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react'
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribedToPush,
} from '@/lib/push-notifications'

export function NotificationSettings() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSupported(isPushSupported())
    setPermission(getNotificationPermission())

    if (isPushSupported()) {
      isSubscribedToPush().then(setSubscribed)
    }
  }, [])

  const handleEnableNotifications = async () => {
    setLoading(true)
    setError(null)

    try {
      const newPermission = await requestNotificationPermission()
      setPermission(newPermission)

      if (newPermission === 'granted') {
        const subscription = await subscribeToPush()
        if (subscription) {
          setSubscribed(true)
          // Save subscription to backend
          await saveSubscription(subscription)
        } else {
          setError('Failed to subscribe to notifications')
        }
      } else if (newPermission === 'denied') {
        setError('Notification permission denied. Please enable in browser settings.')
      }
    } catch (err) {
      setError('Failed to enable notifications')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDisableNotifications = async () => {
    setLoading(true)
    setError(null)

    try {
      await unsubscribeFromPush()
      setSubscribed(false)
      // Remove subscription from backend
      await removeSubscription()
    } catch (err) {
      setError('Failed to disable notifications')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const saveSubscription = async (subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) => {
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      })
    } catch (err) {
      console.error('Failed to save subscription:', err)
    }
  }

  const removeSubscription = async () => {
    try {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
      })
    } catch (err) {
      console.error('Failed to remove subscription:', err)
    }
  }

  if (!supported) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <BellOff className="w-5 h-5 text-gray-400" />
          <div>
            <p className="font-medium text-gray-700">Push Notifications Not Supported</p>
            <p className="text-sm text-gray-500">Your browser doesn&apos;t support push notifications.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          subscribed ? 'bg-green-100' : 'bg-gray-100'
        }`}>
          {subscribed ? (
            <BellRing className="w-5 h-5 text-green-600" />
          ) : (
            <Bell className="w-5 h-5 text-gray-500" />
          )}
        </div>

        <div className="flex-1">
          <h3 className="font-medium text-gray-900">Push Notifications</h3>
          <p className="text-sm text-gray-500 mt-1">
            Get notified when your scheduled content is ready to read.
          </p>

          {error && (
            <p className="text-sm text-red-500 mt-2">{error}</p>
          )}

          <div className="mt-4">
            {subscribed ? (
              <button
                onClick={handleDisableNotifications}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
                Disable Notifications
              </button>
            ) : (
              <button
                onClick={handleEnableNotifications}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                Enable Notifications
              </button>
            )}
          </div>

          {permission === 'denied' && (
            <p className="text-sm text-amber-600 mt-3">
              Notifications are blocked. Please enable them in your browser settings.
            </p>
          )}
        </div>
      </div>

      {subscribed && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Notify me about:</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" defaultChecked className="rounded text-orange-500" />
              Scheduled content reminders
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" defaultChecked className="rounded text-orange-500" />
              New RSS feed articles
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" className="rounded text-orange-500" />
              Weekly reading digest
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
