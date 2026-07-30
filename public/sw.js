// KipuLux PWA Service Worker — Resiliencia Offline para Talleres Artesanales en Paracas / Ica
const CACHE_NAME = 'kipulux-pwa-v1.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/vis-network/standalone/umd/vis-network.min.js'
];

// Instalar Service Worker y precargar shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Precargando App Shell para talleres en Paracas/Ica...');
      return cache.addAll(STATIC_ASSETS).catch(err => console.warn('[SW Cache Warn]:', err));
    }).then(() => self.skipWaiting())
  );
});

// Activar y limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia Network-First con fallback a Caché para red 3G/4G inestable
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Ignorar peticiones que no sean GET (como POST /api/productos/crear)
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
  );
});
