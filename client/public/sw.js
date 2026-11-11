// Service worker: makes the app installable and lets it open quickly, even
// without a connection.
//
// PRIVACY: it stores only the app's own files (the page, its code, styles and
// icons). It never stores /api responses, so no financial data is kept on the
// device: a lost or shared phone has nothing to read in the browser's storage.
//
// Bump VERSION only when this file's caching rules change. New app releases
// need no bump: the page is always fetched fresh when online, and its code
// files have new names (hashes) in every build.
const VERSION = 'v1';
const CACHE = `finance-tracker-${VERSION}`;
const STATIC_FILES = ['/theme.js', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png'];

// The /assets/ files (hashed JS and CSS) the given page links to.
const linkedAssets = (html) => [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);

// Stores a fresh copy of the page, then forgets code files the page no longer
// uses (left over from older releases).
async function storePage(cache, response) {
  const html = await response.clone().text();
  await cache.put('/', response);
  const keep = new Set(linkedAssets(html));
  for (const request of await cache.keys()) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/assets/') && !keep.has(pathname)) await cache.delete(request);
  }
  return keep;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const page = await fetch('/', { cache: 'no-store' });
      if (!page.ok) throw new Error(`Couldn't download the app (${page.status}).`);
      const assets = await storePage(cache, page);
      await cache.addAll([...STATIC_FILES, ...assets]);
      // Take over straight away: an update never changes data, only code.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key !== CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Only this site's own files; the API always goes straight to the network.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Pages: always try the network first, so you get the latest release.
  // Offline, every address opens the stored page and the app takes over.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const response = await fetch(request);
          if (response.ok && (response.headers.get('content-type') ?? '').includes('text/html')) {
            event.waitUntil(storePage(cache, response.clone()));
          }
          return response;
        } catch {
          return (await cache.match('/')) ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Hashed code files never change: use the stored copy if there is one.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) event.waitUntil(cache.put(request, response.clone()));
        return response;
      })(),
    );
    return;
  }

  // Icons, theme.js, the manifest: answer from storage, refresh in the background.
  if (STATIC_FILES.includes(url.pathname) || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(request);
        const refresh = fetch(request)
          .then((response) => {
            if (response.ok) return cache.put(request, response.clone()).then(() => response);
            return response;
          })
          .catch(() => cached ?? Response.error());
        if (cached) {
          event.waitUntil(refresh);
          return cached;
        }
        return refresh;
      })(),
    );
  }
});
