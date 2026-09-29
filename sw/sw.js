/**
 * PLANILLA ENFERMERA - Service Worker (Offline First)
 *
 * Plantilla: vite.config.ts la copia a dist/sw.js reemplazando la versión
 * y la lista de archivos del build. No editar la versión a mano.
 *
 * Estrategias:
 * - Navegación (index.html): primero la red, la caché solo sin conexión. Así un
 *   deploy nuevo nunca deja un index.html viejo apuntando a assets que ya no existen.
 * - /assets/* (nombres con hash, inmutables): primero la caché.
 * - Resto del mismo origen: caché y actualización en segundo plano.
 * - Apps Script y otros orígenes: no se tocan.
 */

const VERSION = '__APP_VERSION__';
const CACHE_NAME = `planilla-enfermera-v${VERSION}`;
const PRECACHE = ['/', '/index.html', '/manifest.json', '/favicon.svg'].concat(__PRECACHE__);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
  // No se activa solo: la app muestra "Hay una versión nueva" y envía SKIP_WAITING.
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function offlineResponse() {
  return new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

async function putInCache(request, response) {
  if (response && response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response.ok) await putInCache('/index.html', response);
    return response;
  } catch {
    return (await caches.match('/index.html')) || (await caches.match('/')) || offlineResponse();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    return await putInCache(request, await fetch(request));
  } catch {
    return offlineResponse();
  }
}

async function staleWhileRevalidate(event) {
  const cached = await caches.match(event.request);
  const network = fetch(event.request)
    .then((response) => putInCache(event.request, response))
    .catch(() => null);
  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  return (await network) || offlineResponse();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Apps Script, CDNs, etc.

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(event));
  }
});
