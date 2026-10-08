export type OfflineReadiness = {
  supported: boolean;
  ready: boolean;
  cachedPages: string[];
  missingPages: string[];
  cachedAssets: string[];
  missingAssets: string[];
};

type WorkerReply = Omit<OfflineReadiness, 'supported'> & { type: string; error?: boolean };

export async function requestOfflineReadiness(prepare = false): Promise<OfflineReadiness> {
  const unavailable: OfflineReadiness = {
    supported: false,
    ready: false,
    cachedPages: [],
    missingPages: [],
    cachedAssets: [],
    missingAssets: [],
  };
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return unavailable;

  try {
    const registration = await navigator.serviceWorker.ready;
    const worker = navigator.serviceWorker.controller ?? registration.active;
    if (!worker || typeof MessageChannel === 'undefined') return unavailable;

    const result = await new Promise<WorkerReply>((resolve, reject) => {
      const channel = new MessageChannel();
      const timeout = window.setTimeout(() => reject(new Error('Offline status timed out')), 15000);
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
  } catch {
    return unavailable;
  }
}
