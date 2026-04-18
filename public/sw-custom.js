// ScrollLater Custom Service Worker
const CACHE_NAME = 'scrolllater-v1';
const OFFLINE_URL = '/offline';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/dashboard',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
];

// Install event - precache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_ASSETS);
      await self.skipWaiting();
    })()
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

// Fetch event - network first with cache fallback strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle API requests - network only with offline handling
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch (error) {
          // Return cached API response if available
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return error response for failed API calls
          return new Response(
            JSON.stringify({ error: 'Offline', message: 'No network connection' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      })()
    );
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Try network first
          const networkResponse = await fetch(request);
          // Cache successful navigation responses
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch (error) {
          // Fall back to cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return offline page
          return caches.match(OFFLINE_URL);
        }
      })()
    );
    return;
  }

  // Handle static assets - stale while revalidate
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);

      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })()
  );
});

// Background sync for offline saves
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-entries') {
    event.waitUntil(syncEntries());
  }
});

async function syncEntries() {
  const db = await openIndexedDB();
  const pendingEntries = await getAllPendingEntries(db);

  for (const entry of pendingEntries) {
    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry.data),
      });

      if (response.ok) {
        await deletePendingEntry(db, entry.id);
      }
    } catch (error) {
      console.error('Failed to sync entry:', error);
    }
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('scrolllater-offline', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-entries')) {
        db.createObjectStore('pending-entries', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getAllPendingEntries(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending-entries', 'readonly');
    const store = tx.objectStore('pending-entries');
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deletePendingEntry(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending-entries', 'readwrite');
    const store = tx.objectStore('pending-entries');
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'You have content to read!',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-72x72.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/dashboard',
      entryId: data.entryId,
    },
    actions: [
      { action: 'open', title: 'Read Now' },
      { action: 'snooze', title: 'Remind Later' },
    ],
    tag: data.tag || 'scrolllater-notification',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'ScrollLater', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action } = event;
  const { url, entryId } = event.notification.data;

  if (action === 'snooze') {
    // Schedule a reminder for 1 hour later
    event.waitUntil(
      self.registration.showNotification('Reminder Snoozed', {
        body: 'We\'ll remind you in 1 hour',
        icon: '/icons/icon-192x192.svg',
        tag: 'snooze-confirmation',
      })
    );
    return;
  }

  // Default action - open the app
  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });

      // Check if there's already a window open
      for (const client of allClients) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          await client.focus();
          if (entryId) {
            client.postMessage({ type: 'OPEN_ENTRY', entryId });
          }
          return;
        }
      }

      // Open new window
      await clients.openWindow(url);
    })()
  );
});

// Message handling from main app
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
