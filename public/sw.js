/**
 * PLANILLA ENFERMERA - Service Worker (Offline First)
 * Permite instalación PWA y funcionamiento continuo en zonas sin conexión hospitalaria.
 */

const CACHE_NAME = 'planilla-enfermera-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Ignorar webhooks y el redirect JSONP de Apps Script (script.googleusercontent.com)
  const url = request.url;
  if (
    request.method !== 'GET' ||
    url.includes('script.google.com') ||
    url.includes('script.googleusercontent.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retornar caché y actualizar en segundo plano (Stale-While-Revalidate)
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Sin conexión, continúa con el caché
          });
        return cachedResponse;
      }

      // Si no está en caché, buscar en red y cachear
      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Fallback para navegación de páginas offline
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});
