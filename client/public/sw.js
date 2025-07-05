// Enhanced Service Worker for Real Push Notifications (Android/iPhone)
const CACHE_NAME = 'wedding-gallery-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('💾 Service Worker installing');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activating');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Handle Push Messages (Real Android/iPhone notifications)
self.addEventListener('push', (event) => {
  console.log('📨 Push notification received');
  
  if (!event.data) {
    console.warn('Push event but no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error('Error parsing push data:', e);
    return;
  }

  const title = data.title || 'Wedding Gallery';
  const options = {
    body: data.message || data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: '/icon-72x72.png',
    image: data.image,
    tag: data.tag || 'wedding-notification',
    data: {
      url: data.url || '/',
      mediaId: data.mediaId,
      type: data.type,
      ...data.data
    },
    actions: [
      {
        action: 'view',
        title: '👀 Anzeigen',
        icon: '/icon-72x72.png'
      }
    ],
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    timestamp: Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.action);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  const mediaId = event.notification.data?.mediaId;
  
  // Build URL with media navigation if available
  let finalUrl = urlToOpen;
  if (mediaId && event.action === 'view') {
    finalUrl = `/?media=${mediaId}`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Focus existing window and navigate
            return client.focus().then(() => {
              if ('postMessage' in client) {
                client.postMessage({
                  type: 'NAVIGATE_TO_MEDIA',
                  mediaId: mediaId,
                  url: finalUrl
                });
              }
            });
          }
        }
        
        // Open new window if none exists
        if (self.clients.openWindow) {
          return self.clients.openWindow(finalUrl);
        }
      })
  );
});

// Handle Notification Close
self.addEventListener('notificationclose', (event) => {
  console.log('🔕 Notification closed');
  
  // Optional: Track notification dismissal
  if (event.notification.data?.type) {
    console.log(`Notification dismissed: ${event.notification.data.type}`);
  }
});

// Background Sync (for offline functionality)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle any pending notifications or data sync
  console.log('⚡ Performing background sync');
}

// Handle Messages from Main Thread
self.addEventListener('message', (event) => {
  console.log('📱 Message received in SW:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});