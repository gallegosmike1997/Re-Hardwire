export type OfflineReadiness = {
  supported: boolean;
  ready: boolean;
  cachedPages: string[];
  missingPages: string[];
  cachedAssets: string[];
  missingAssets: string[];
};

type WorkerReply = Omit<OfflineReadiness, 'supported'> & { type: string; error?: boolean };

const CORE_PAGES = ['/', '/now/', '/tools/', '/support-plan/', '/chat/', '/protocol/', '/success/', '/account/', '/settings/'];
const APP_ASSETS = ['/offline.html', '/manifest.webmanifest', '/logo.svg', '/practice-manifest.json'];

export async function requestOfflineReadiness(prepare = false): Promise<OfflineReadiness> {
  const unavailable: OfflineReadiness = {
    supported: false,
    ready: false,
    cachedPages: [],
    missingPages: CORE_PAGES,
    cachedAssets: [],
    missingAssets: APP_ASSETS,
  };

  if (typeof window === 'undefined') return unavailable;

  try {
    if ('caches' in window) {
      const cacheName = 're-hardwire-shell-v3';
      const cache = await caches.open(cacheName);

      if (prepare) {
        await Promise.allSettled([
          ...CORE_PAGES.map(async (path) => {
            try {
              const res = await fetch(path);
              if (res.ok) await cache.put(path, res);
            } catch {
              // ignore fetch errors for offline prep
            }
          }),
          ...APP_ASSETS.map(async (path) => {
            try {
              const res = await fetch(path);
              if (res.ok) await cache.put(path, res);
            } catch {
              // ignore fetch errors for offline prep
            }
          }),
        ]);
      }

      const pageResults: Array<[string, boolean]> = await Promise.all(
        CORE_PAGES.map(async (path): Promise<[string, boolean]> => [path, Boolean(await cache.match(path))])
      );
      const assetResults: Array<[string, boolean]> = await Promise.all(
        APP_ASSETS.map(async (path): Promise<[string, boolean]> => [path, Boolean(await cache.match(path))])
      );

      const cachedPages = pageResults.filter(([, present]) => present).map(([path]) => path);
      const missingPages = pageResults.filter(([, present]) => !present).map(([path]) => path);
      const cachedAssets = assetResults.filter(([, present]) => present).map(([path]) => path);
      const missingAssets = assetResults.filter(([, present]) => !present).map(([path]) => path);
      const ready = missingPages.length === 0 && missingAssets.length === 0;

      return {
        supported: true,
        ready,
        cachedPages,
        missingPages,
        cachedAssets,
        missingAssets,
      };
    }

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const worker = navigator.serviceWorker.controller ?? registration.active;
      if (worker && typeof MessageChannel !== 'undefined') {
        const result = await new Promise<WorkerReply>((resolve, reject) => {
          const channel = new MessageChannel();
          const timeout = window.setTimeout(() => reject(new Error('Offline status timed out')), 5000);
          channel.port1.onmessage = (event: MessageEvent<WorkerReply>) => {
            window.clearTimeout(timeout);
            channel.port1.close();
            resolve(event.data);
          };
          worker.postMessage({ type: prepare ? 'PREPARE_OFFLINE' : 'GET_OFFLINE_STATUS' }, [channel.port2]);
        });

        return {
          supported: !result.error,
          ready: Boolean(result.ready),
          cachedPages: result.cachedPages ?? [],
          missingPages: result.missingPages ?? [],
          cachedAssets: result.cachedAssets ?? [],
          missingAssets: result.missingAssets ?? [],
        };
      }
    }

    return {
      supported: true,
      ready: false,
      cachedPages: [],
      missingPages: CORE_PAGES,
      cachedAssets: [],
      missingAssets: APP_ASSETS,
    };
  } catch {
    return {
      supported: true,
      ready: false,
      cachedPages: [],
      missingPages: CORE_PAGES,
      cachedAssets: [],
      missingAssets: APP_ASSETS,
    };
  }
}
