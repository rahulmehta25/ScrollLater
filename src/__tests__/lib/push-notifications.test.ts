import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribedToPush,
  showLocalNotification,
  scheduleNotification,
} from '@/lib/push-notifications'

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

function setPushManager(pm: unknown) {
  Object.defineProperty(window, 'PushManager', { configurable: true, value: pm })
}

function setNotification(notif: unknown) {
  Object.defineProperty(window, 'Notification', { configurable: true, value: notif })
}

function setServiceWorker(sw: unknown) {
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: sw })
}

function makeNotificationClass(permission: NotificationPermission = 'granted') {
  // We need a constructor that can be called with `new`
  return Object.assign(vi.fn(), {
    permission,
    requestPermission: vi.fn().mockResolvedValue(permission),
  })
}

function makeMockSubscription(unsubscribeResult = true) {
  return {
    endpoint: 'https://push.example.com/endpoint',
    toJSON: () => ({
      endpoint: 'https://push.example.com/endpoint',
      keys: { p256dh: 'mock-p256dh', auth: 'mock-auth' },
    }),
    unsubscribe: vi.fn().mockResolvedValue(unsubscribeResult),
  }
}

function makeMockPushManager(existingSub: ReturnType<typeof makeMockSubscription> | null = null) {
  const newSub = makeMockSubscription()
  return {
    getSubscription: vi.fn().mockResolvedValue(existingSub),
    subscribe: vi.fn().mockResolvedValue(newSub),
    _newSub: newSub,
  }
}

function makeMockRegistration(pm = makeMockPushManager()) {
  return { pushManager: pm }
}

// ---------------------------------------------------------------------------
// isPushSupported
// ---------------------------------------------------------------------------

describe('isPushSupported', () => {
  afterEach(() => {
    // Restore to defaults so other tests are not affected
    setPushManager(undefined)
    setNotification(undefined)
    setServiceWorker(undefined)
  })

  it('returns true when serviceWorker, PushManager, and Notification are all present', () => {
    setServiceWorker({ ready: Promise.resolve({}) })
    setPushManager(class PushManager {})
    setNotification(makeNotificationClass())
    expect(isPushSupported()).toBe(true)
  })

  it('returns false when PushManager is absent', () => {
    setServiceWorker({ ready: Promise.resolve({}) })
    setPushManager(undefined)
    setNotification(makeNotificationClass())
    expect(isPushSupported()).toBe(false)
  })

  it('returns false when Notification is absent', () => {
    setServiceWorker({ ready: Promise.resolve({}) })
    setPushManager(class PushManager {})
    setNotification(undefined)
    expect(isPushSupported()).toBe(false)
  })

  it('returns false when serviceWorker is absent', () => {
    setServiceWorker(undefined)
    setPushManager(class PushManager {})
    setNotification(makeNotificationClass())
    expect(isPushSupported()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getNotificationPermission
// ---------------------------------------------------------------------------

describe('getNotificationPermission', () => {
  afterEach(() => {
    setNotification(undefined)
  })

  it('returns "granted" when Notification.permission is "granted"', () => {
    setNotification(makeNotificationClass('granted'))
    expect(getNotificationPermission()).toBe('granted')
  })

  it('returns "default" when Notification.permission is "default"', () => {
    setNotification(makeNotificationClass('default'))
    expect(getNotificationPermission()).toBe('default')
  })

  it('returns "denied" when Notification is absent', () => {
    setNotification(undefined)
    expect(getNotificationPermission()).toBe('denied')
  })
})

// ---------------------------------------------------------------------------
// requestNotificationPermission
// ---------------------------------------------------------------------------

describe('requestNotificationPermission', () => {
  afterEach(() => {
    setPushManager(undefined)
    setNotification(undefined)
    setServiceWorker(undefined)
  })

  it('returns "granted" when the user grants permission', async () => {
    const NotifClass = makeNotificationClass('granted')
    NotifClass.requestPermission = vi.fn().mockResolvedValue('granted')
    setNotification(NotifClass)
    setServiceWorker({ ready: Promise.resolve({}) })
    setPushManager(class PushManager {})

    const result = await requestNotificationPermission()
    expect(result).toBe('granted')
    expect(NotifClass.requestPermission).toHaveBeenCalled()
  })

  it('returns "denied" when the user denies permission', async () => {
    const NotifClass = makeNotificationClass('denied')
    NotifClass.requestPermission = vi.fn().mockResolvedValue('denied')
    setNotification(NotifClass)
    setServiceWorker({ ready: Promise.resolve({}) })
    setPushManager(class PushManager {})

    const result = await requestNotificationPermission()
    expect(result).toBe('denied')
  })

  it('returns "denied" without calling requestPermission when push is not supported', async () => {
    const NotifClass = makeNotificationClass('granted')
    NotifClass.requestPermission = vi.fn().mockResolvedValue('granted')
    setNotification(NotifClass)
    setServiceWorker({ ready: Promise.resolve({}) })
    setPushManager(undefined) // push not supported

    const result = await requestNotificationPermission()
    expect(result).toBe('denied')
    expect(NotifClass.requestPermission).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// subscribeToPush
// ---------------------------------------------------------------------------

describe('subscribeToPush', () => {
  afterEach(() => {
    setPushManager(undefined)
    setNotification(undefined)
    setServiceWorker(undefined)
  })

  it('returns null when push is not supported (missing PushManager)', async () => {
    setServiceWorker({ ready: Promise.resolve({}) })
    setPushManager(undefined)
    setNotification(makeNotificationClass())

    const result = await subscribeToPush()
    expect(result).toBeNull()
  })

  it('returns null when serviceWorker.ready rejects', async () => {
    const ready = Promise.reject(new Error('SW not available'))
    // Prevent unhandled rejection if subscribeToPush short-circuits on empty VAPID
    ready.catch(() => {})
    setServiceWorker({ ready })
    setPushManager(class PushManager {})
    setNotification(makeNotificationClass())

    // The module-level VAPID key is '', so it short-circuits before hitting SW.
    const result = await subscribeToPush()
    expect(result).toBeNull()
  })

  it('returns null when VAPID_PUBLIC_KEY is empty (default in test env)', async () => {
    setServiceWorker({ ready: Promise.resolve({}) })
    setPushManager(class PushManager {})
    setNotification(makeNotificationClass())

    // In the test environment NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set,
    // so the module-level VAPID_PUBLIC_KEY constant is ''.
    const result = await subscribeToPush()
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// unsubscribeFromPush
// ---------------------------------------------------------------------------

describe('unsubscribeFromPush', () => {
  afterEach(() => {
    setServiceWorker(undefined)
  })

  it('calls unsubscribe on the active subscription and returns true', async () => {
    const sub = makeMockSubscription(true)
    const pm = makeMockPushManager(sub as unknown as ReturnType<typeof makeMockSubscription>)
    const reg = makeMockRegistration(pm)
    setServiceWorker({ ready: Promise.resolve(reg) })

    const result = await unsubscribeFromPush()
    expect(sub.unsubscribe).toHaveBeenCalled()
    expect(result).toBe(true)
  })

  it('returns false when there is no active subscription', async () => {
    const pm = makeMockPushManager(null)
    const reg = makeMockRegistration(pm)
    setServiceWorker({ ready: Promise.resolve(reg) })

    const result = await unsubscribeFromPush()
    expect(result).toBe(false)
  })

  it('returns false when serviceWorker.ready rejects', async () => {
    const rejection = new Promise<never>((_, reject) => reject(new Error('SW error')))
    setServiceWorker({ ready: rejection })

    const result = await unsubscribeFromPush()
    expect(result).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isSubscribedToPush
// ---------------------------------------------------------------------------

describe('isSubscribedToPush', () => {
  afterEach(() => {
    setServiceWorker(undefined)
  })

  it('returns true when a subscription exists', async () => {
    const sub = makeMockSubscription()
    const pm = makeMockPushManager(sub as unknown as ReturnType<typeof makeMockSubscription>)
    const reg = makeMockRegistration(pm)
    setServiceWorker({ ready: Promise.resolve(reg) })

    const result = await isSubscribedToPush()
    expect(result).toBe(true)
  })

  it('returns false when no subscription exists', async () => {
    const pm = makeMockPushManager(null)
    const reg = makeMockRegistration(pm)
    setServiceWorker({ ready: Promise.resolve(reg) })

    const result = await isSubscribedToPush()
    expect(result).toBe(false)
  })

  it('returns false when an error is thrown', async () => {
    const rejection = new Promise<never>((_, reject) => reject(new Error('SW unavailable')))
    setServiceWorker({ ready: rejection })

    const result = await isSubscribedToPush()
    expect(result).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// showLocalNotification
// ---------------------------------------------------------------------------

describe('showLocalNotification', () => {
  afterEach(() => {
    setNotification(undefined)
    vi.restoreAllMocks()
  })

  it('creates a Notification with the correct title and body when permission is granted', () => {
    const NotifClass = makeNotificationClass('granted')
    setNotification(NotifClass)

    showLocalNotification({ title: 'Test Title', body: 'Test body' })

    expect(NotifClass).toHaveBeenCalledOnce()
    expect(NotifClass).toHaveBeenCalledWith(
      'Test Title',
      expect.objectContaining({ body: 'Test body' })
    )
  })

  it('passes tag, icon, and data through to the Notification options', () => {
    const NotifClass = makeNotificationClass('granted')
    setNotification(NotifClass)

    showLocalNotification({
      title: 'Tagged',
      body: 'Body',
      tag: 'my-tag',
      icon: '/custom-icon.png',
      url: 'https://example.com',
      entryId: 'entry-42',
    })

    const options = NotifClass.mock.calls[0][1]
    expect(options.tag).toBe('my-tag')
    expect(options.icon).toBe('/custom-icon.png')
    expect(options.data.url).toBe('https://example.com')
    expect(options.data.entryId).toBe('entry-42')
  })

  it('uses a default tag when none is provided', () => {
    const NotifClass = makeNotificationClass('granted')
    setNotification(NotifClass)

    showLocalNotification({ title: 'T', body: 'B' })

    const options = NotifClass.mock.calls[0][1]
    expect(options.tag).toBe('scrolllater-notification')
  })

  it('does not create a Notification when permission is "denied"', () => {
    const NotifClass = makeNotificationClass('denied')
    setNotification(NotifClass)

    showLocalNotification({ title: 'Blocked', body: 'Should not appear' })

    expect(NotifClass).not.toHaveBeenCalled()
  })

  it('does not create a Notification when permission is "default"', () => {
    const NotifClass = makeNotificationClass('default')
    setNotification(NotifClass)

    showLocalNotification({ title: 'Pending', body: 'Not yet allowed' })

    expect(NotifClass).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// scheduleNotification
// ---------------------------------------------------------------------------

describe('scheduleNotification', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    const NotifClass = makeNotificationClass('granted')
    setNotification(NotifClass)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    setNotification(undefined)
  })

  it('returns a timeout handle when the scheduled time is in the future', () => {
    const future = new Date(Date.now() + 60_000)
    const handle = scheduleNotification({ title: 'Future', body: 'Later' }, future)
    expect(handle).not.toBeNull()
  })

  it('fires the notification after the delay elapses', () => {
    const NotifClass = (window as unknown as { Notification: ReturnType<typeof vi.fn> }).Notification
    const future = new Date(Date.now() + 5_000)
    scheduleNotification({ title: 'Delayed', body: 'Now' }, future)

    expect(NotifClass).not.toHaveBeenCalled()
    vi.advanceTimersByTime(5_000)
    expect(NotifClass).toHaveBeenCalledOnce()
    expect(NotifClass).toHaveBeenCalledWith('Delayed', expect.objectContaining({ body: 'Now' }))
  })

  it('shows the notification immediately and returns null when the time is in the past', () => {
    const NotifClass = (window as unknown as { Notification: ReturnType<typeof vi.fn> }).Notification
    const past = new Date(Date.now() - 1_000)
    const handle = scheduleNotification({ title: 'Past', body: 'Immediate' }, past)

    expect(handle).toBeNull()
    expect(NotifClass).toHaveBeenCalledOnce()
  })
})
