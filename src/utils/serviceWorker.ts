// Registro del service worker y aviso de versión nueva.

let waitingWorker: ServiceWorker | null = null;
const listeners = new Set<() => void>();

function setWaiting(worker: ServiceWorker | null) {
  waitingWorker = worker;
  listeners.forEach((fn) => fn());
}

export function getWaitingWorker(): ServiceWorker | null {
  return waitingWorker;
}

export function subscribeUpdate(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Activa la versión nueva; la página se recarga cuando toma el control. */
export function applyUpdate(): void {
  waitingWorker?.postMessage('SKIP_WAITING');
}

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  // En localhost la caché PWA taparía el servidor de desarrollo de Vite.
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return;

  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          installing?.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setWaiting(installing);
            }
          });
        });
        // Revisar si hay versión nueva al volver a la app
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void reg.update();
        });
      })
      .catch((err) => {
        console.warn('Error al registrar Service Worker:', err);
      });
  });
}
