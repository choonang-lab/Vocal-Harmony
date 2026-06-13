/* 和声 · Harmony Path — service worker
   Bump CACHE on every shell change to retire old caches.
   Strategy:
     · HTML / navigation  → network-first (fresh when online, cached copy offline)
     · same-origin assets → cache-first  (icons, manifest)
     · Google Fonts       → stale-while-revalidate
*/
const CACHE = 'harmony-v12';

/* Local app-shell files. index.html is essential; the rest are best-effort
   so a missing optional asset (e.g. an icon you haven't added yet) never
   blocks installation. */
const ESSENTIAL = ['./', './index.html'];
const OPTIONAL  = ['./manifest.json', './icon-192.png', './icon-512.png'];

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Essential first — if this throws, install fails (as it should).
    await cache.addAll(ESSENTIAL);
    // Optional assets: cache what exists, ignore what doesn't.
    await Promise.allSettled(OPTIONAL.map((u) => cache.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* Let the page trigger an immediate update if it wants to. */
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

function isHTML(req) {
  return req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) HTML / navigations: network-first, fall back to cached shell offline.
  if (isHTML(req)) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (err) {
        const cache = await caches.open(CACHE);
        return (await cache.match(req)) ||
               (await cache.match('./index.html')) ||
               Response.error();
      }
    })());
    return;
  }

  // 2) Google Fonts: stale-while-revalidate (serve cached, refresh in bg).
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      const network = fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      return cached || (await network) || Response.error();
    })());
    return;
  }

  // 3) Same-origin static assets: cache-first, then network (and cache it).
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        return cached || Response.error();
      }
    })());
    return;
  }

  // 4) Anything else cross-origin: just pass through.
});
