const CACHE_NAME = 're-hardwire-shell-v1';
const CORE_PAGES = ['/', '/tools/', '/support-plan/', '/chat/', '/protocol/', '/success/', '/account/', '/settings/'];
const APP_ASSETS = ['/offline.html', '/manifest.webmanifest', '/logo.svg'];

async function cacheAppPage(cache, path) {
  const response = await fetch(path);
  if (!response.ok) return;
  await cache.put(path, response.clone());
  if (path.length > 1 && path.endsWith('/')) {
    await cache.put(path.slice(0, -1), response.clone());
  }

  const html = await response.text();
  const assets = new Set();
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    const tag = match[0];
    const asset = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1]
      || tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (asset?.startsWith('/_next/static/')) assets.add(asset);
  }
  await Promise.allSettled([...assets].map(async (asset) => {
    const assetResponse = await fetch(asset);
    if (assetResponse.ok) await cache.put(asset, assetResponse);
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        await Promise.allSettled([
          ...CORE_PAGES.map((url) => cacheAppPage(cache, url)),
          ...APP_ASSETS.map((url) => cache.add(url)),
        ]);
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('re-hardwire-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cached = await cache.match(request) || await cache.match(`${url.pathname}${url.search}`);
        return cached || await cache.match('/offline.html');
      }
    })());
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname === '/logo.svg' || url.pathname === '/manifest.webmanifest') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return new Response('', { status: 504, statusText: 'Offline' });
      }
    })());
  }
});
