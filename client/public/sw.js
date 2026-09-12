/* VJ_DOC service worker — make the app installable and resilient offline.
 *
 * Strategy:
 *  - precache the app shell (HTML, manifest, icons) on install;
 *  - navigation & same-origin GETs: network-first, falling back to cache so the
 *    shell loads even offline;
 *  - hashed build assets: stale-while-revalidate (snappy repeat visits);
 *  - API + Socket.IO are NEVER cached — document processing must always hit the
 *    live server.
 */
const SHELL_CACHE = 'vjdoc-shell';
const RUNTIME_CACHE = 'vjdoc-runtime';

const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png'];

// Anything dealing with user documents or live data must bypass the cache.
function isLiveRequest(request) {
  const url = request.url;
  return (
    request.method !== 'GET' ||
    url.includes('/api/') ||
    url.includes('/socket.io/') ||
    url.includes('/files/') ||
    !url.startsWith(self.location.origin)
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (isLiveRequest(event.request)) return; // network only

  const { request } = event;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    // Network-first with offline fallback to the cached shell.
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/').then((cached) => cached || caches.match(request))),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});