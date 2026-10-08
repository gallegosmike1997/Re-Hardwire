const CACHE_NAME = 're-hardwire-shell-v3';
const CORE_PAGES = ['/', '/now/', '/tools/', '/support-plan/', '/chat/', '/protocol/', '/success/', '/account/', '/settings/'];
const APP_ASSETS = ['/offline.html', '/manifest.webmanifest', '/logo.svg', '/practice-manifest.json'];

function isCacheable(response) {
  if (!response.ok || response.headers.has('set-cookie')) return false;
  const cacheControl = response.headers.get('cache-control') || '';
  const vary = response.headers.get('vary') || '';
  return !/\b(private|no-store|no-cache)\b/i.test(cacheControl)
    && !/\b(cookie|authorization)\b/i.test(vary);
}

async function cacheStatus() {
  const cache = await caches.open(CACHE_NAME);
  const pageResults = await Promise.all(CORE_PAGES.map(async (path) => [path, Boolean(await cache.match(path))]));
  const assetResults = await Promise.all(APP_ASSETS.map(async (path) => [path, Boolean(await cache.match(path))]));
  const ready = [...pageResults, ...assetResults].every(([, present]) => present);
  return {
    ready,
    cachedPages: pageResults.filter(([, present]) => present).map(([path]) => path),
    missingPages: pageResults.filter(([, present]) => !present).map(([path]) => path),
    cachedAssets: assetResults.filter(([, present]) => present).map(([path]) => path),
    missingAssets: assetResults.filter(([, present]) => !present).map(([path]) => path),
  };
}

self.addEventListener('message', (event) => {
  const type = event.data?.type;
  if (type !== 'GET_OFFLINE_STATUS' && type !== 'PREPARE_OFFLINE') return;
  const port = event.ports?.[0];
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (type === 'PREPARE_OFFLINE') {
      await Promise.allSettled([
        ...CORE_PAGES.map((path) => cacheAppPage(cache, path)),
        ...APP_ASSETS.map(async (path) => {
          const response = await fetch(path);
          if (isCacheable(response)) await cache.put(path, response);
          else throw new Error(`Could not cache ${path}`);
        }),
      ]);
    }
    port?.postMessage({ type: 'OFFLINE_STATUS', ...(await cacheStatus()) });
  })().catch(() => port?.postMessage({ type: 'OFFLINE_STATUS', ready: false, error: true })));
});

async function cacheAppPage(cache, path) {
  const response = await fetch(path);
  if (!isCacheable(response)) return;
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
    if (isCacheable(assetResponse)) await cache.put(asset, assetResponse);
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        await Promise.allSettled([
          ...CORE_PAGES.map((url) => cacheAppPage(cache, url)),
          ...APP_ASSETS.map(async (url) => {
            const response = await fetch(url);
            if (isCacheable(response)) await cache.put(url, response);
          }),
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
        if (isCacheable(response) && response.headers.get('content-type')?.includes('text/html')) {
          await cache.put(request, response.clone());
        } else {
          await cache.delete(request);
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
        if (isCacheable(response)) await cache.put(request, response.clone());
        return response;
      } catch {
        return new Response('', { status: 504, statusText: 'Offline' });
      }
    })());
  }
});
