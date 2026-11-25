const CACHE_NAME = 'milgos-pos-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/logo.png',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/og-image.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA ServiceWorker] Caching static app shell v4');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[PWA ServiceWorker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network first for API requests to ensure fresh data
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Navigation requests: Return cached index.html if offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cachedIndex = await caches.match('/index.html') || await caches.match('/');
        if (cachedIndex) return cachedIndex;
        return new Response('Application hors-ligne. Rebranchez la connexion pour la première ouverture.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
    );
    return;
  }

  // Cache first with network fallback and dynamic caching for UI assets & JS/CSS chunks
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
          return networkResponse;
        }
        // Cache assets for offline use (scripts, css, images, fonts)
        if (
          url.pathname.endsWith('.js') || 
          url.pathname.endsWith('.css') || 
          url.pathname.endsWith('.png') || 
          url.pathname.endsWith('.svg') || 
          url.pathname.endsWith('.ico') ||
          url.pathname.includes('/assets/') ||
          url.pathname.includes('/src/') ||
          url.pathname.includes('/@vite/') ||
          url.pathname.includes('/node_modules/')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(async () => {
        // Fallback for image requests if offline
        if (event.request.destination === 'image') {
          return caches.match('/favicon.png') || caches.match('/logo.png');
        }
        return null;
      });
    })
  );
});

// Handle incoming Web Push notifications (works even when app is closed / in background on iOS 16.4+ & Android)
self.addEventListener('push', (event) => {
  console.log('[PWA ServiceWorker] Push notification event received:', event);

  let data = {
    title: '💰 Commande Payée !',
    body: 'Une nouvelle commande a été réglée.'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const title = data.title || '💰 Commande Payée !';
  const options = {
    body: data.body || 'Détails de la commande indisponibles',
    icon: '/icon-192.png',
    badge: '/favicon.png',
    tag: data.tag || 'order-paid',
    renotify: true,
    vibrate: [150, 80, 150, 80, 250],
    data: data.data || { url: '/' }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification tap / click on Android & iOS PWA
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
