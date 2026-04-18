// Push Notification Service for ScrollLater

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface NotificationPayload {
  title: string
  body: string
  url?: string
  entryId?: string
  tag?: string
  icon?: string
}

// Check if push notifications are supported
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
}

// Get current notification permission status
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied'
  }
  return Notification.permission
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    return 'denied'
  }

  const permission = await Notification.requestPermission()
  return permission
}

// Convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Subscribe to push notifications
export async function subscribeToPush(): Promise<PushSubscriptionData | null> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) {
    console.warn('Push notifications not supported or VAPID key not configured')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })
    }

    const subscriptionJson = subscription.toJSON()

    return {
      endpoint: subscriptionJson.endpoint!,
      keys: {
        p256dh: subscriptionJson.keys!.p256dh,
        auth: subscriptionJson.keys!.auth,
      },
    }
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error)
    return null
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      return true
    }
    return false
  } catch (error) {
    console.error('Failed to unsubscribe from push:', error)
    return false
  }
}

// Check if currently subscribed
export async function isSubscribedToPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription !== null
  } catch {
    return false
  }
}

// Show a local notification (for testing/fallback)
export function showLocalNotification(payload: NotificationPayload): void {
  if (getNotificationPermission() !== 'granted') {
    return
  }

  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.svg',
    badge: '/icons/icon-72x72.svg',
    tag: payload.tag || 'scrolllater-notification',
    data: {
      url: payload.url,
      entryId: payload.entryId,
    },
    requireInteraction: true,
  }

  new Notification(payload.title, options)
}

// Schedule a notification for later
export function scheduleNotification(
  payload: NotificationPayload,
  scheduledTime: Date
): NodeJS.Timeout | null {
  const now = Date.now()
  const delay = scheduledTime.getTime() - now

  if (delay <= 0) {
    showLocalNotification(payload)
    return null
  }

  return setTimeout(() => {
    showLocalNotification(payload)
  }, delay)
}
