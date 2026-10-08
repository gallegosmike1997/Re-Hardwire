'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { requestOfflineReadiness, type OfflineReadiness } from '@/lib/offline';

const INITIAL: OfflineReadiness = {
  supported: false,
  ready: false,
  cachedPages: [],
  missingPages: [],
  cachedAssets: [],
  missingAssets: [],
};

export function OfflineReadinessCard() {
  const [status, setStatus] = useState(INITIAL);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let current = true;
    void requestOfflineReadiness().then((result) => {
      if (current) setStatus(result);
    });
    return () => { current = false; };
  }, []);

  const prepare = async () => {
    setBusy(true);
    setMessage('Preparing and checking the offline app shell…');
    const result = await requestOfflineReadiness(true);
    setStatus(result);
    setBusy(false);
    setMessage(result.ready
      ? 'Checked: core pages and app files are saved for offline use on this device.'
      : result.supported
        ? `Some items could not be saved (${result.missingPages.length} pages and ${result.missingAssets.length} files). Reconnect and try again.`
        : 'Offline preparation is unavailable until this app is served from a secure origin and its service worker is active.');
  };

  return (
    <Card title="Get ready for offline use" subtitle="Prepare and verify the app on this device.">
      <p className="text-xs leading-relaxed text-slate-400">
        The guided library and support plan work offline after the app files are cached. Coach chat needs a connection.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={prepare}
          disabled={busy}
          className="hw-focus min-h-11 rounded-xl bg-signal-500 px-4 py-2.5 text-sm font-semibold text-void hover:bg-signal-400 disabled:opacity-60"
        >
          {busy ? 'Checking…' : status.ready ? 'Check offline setup' : 'Prepare for offline'}
        </button>
        <span className="text-xs text-slate-500" aria-live="polite">
          {status.ready ? 'Core app files are cached' : status.supported ? `${status.cachedPages.length} of ${status.cachedPages.length + status.missingPages.length} pages cached` : 'Not checked yet'}
        </span>
        <Link href="/settings" className="hw-focus rounded px-1 text-xs text-slate-400 underline underline-offset-2 hover:text-slate-200">Offline details</Link>
      </div>
      {message && <p className="mt-3 text-xs leading-relaxed text-slate-400" role="status">{message}</p>}
      <p className="mt-3 text-[11px] leading-relaxed text-slate-600">
        The offline check only stores app pages and static files. Chat messages and support plan entries are not part of this offline download.
      </p>
    </Card>
  );
}
