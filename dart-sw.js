/* Offline cache for Dart Sprachzähler. The scoring and speech logic is untouched. */
const CACHE = 'dart-pwa-v5-offline-2';
const FILES = ['./dart_app.html','./dart-app.webmanifest','./dart-icon-192.png','./dart-icon-512.png'];
const APP = new URL('./dart_app.html', self.registration.scope).href;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(path => new Request(new URL(path, self.registration.scope), {cache:'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('dart-pwa-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const inScope = url.href.startsWith(self.registration.scope);
  if (!inScope) return;
  const appRequest = new Request(APP);
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && url.pathname.endsWith('/dart_app.html')) {
          const cache = await caches.open(CACHE);
          await cache.put(appRequest, response.clone());
        }
        return response;
      } catch (error) {
        const cache = await caches.open(CACHE);
        const fallback = await cache.match(appRequest);
        if (fallback) return fallback;
        return Response.error();
      }
    })());
    return;
  }
  const known = FILES.some(path => new URL(path, self.registration.scope).pathname === url.pathname);
  if (!known) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request, {ignoreSearch:true});
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  })());
});
