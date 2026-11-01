'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FIRST_LAUNCH_SUMMARY,
  LEGAL_ACCEPTED_VERSION,
  LEGAL_STORAGE_KEY,
} from '@/lib/legal';
import { getStorage, setStorage } from '@/lib/storage';

function readAccepted(): boolean {
  try {
    return getStorage<string>(LEGAL_STORAGE_KEY) === LEGAL_ACCEPTED_VERSION;
  } catch {
    return false;
  }
}

export function FirstLaunchModal() {
  const [visible, setVisible] = useState(() =>
    typeof window === 'undefined' ? false : !readAccepted(),
  );

  if (!visible) return null;

  const accept = () => {
    setStorage(LEGAL_STORAGE_KEY, LEGAL_ACCEPTED_VERSION);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-launch-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
    >
      <div className="hw-panel max-h-[90vh] w-full max-w-lg overflow-y-auto p-5">
        <p className="hw-label">Before you begin</p>
        <h2 id="first-launch-title" className="mt-1 text-xl font-semibold text-slate-100">
          Self-help only - not medical care
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300">
          {FIRST_LAUNCH_SUMMARY.map((line) => (
            <li key={line.slice(0, 24)} className="flex gap-2">
              <span aria-hidden="true" className="text-signal-300">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-lg border border-alarm/30 bg-alarm/5 px-3 py-2 text-xs leading-relaxed text-slate-300">
          Re-Hardwire cannot monitor you or call for help. U.S. crisis: call or text{' '}
          <a href="tel:988" className="font-semibold text-slate-100 underline">988</a>.
          Emergency: <a href="tel:911" className="font-semibold text-slate-100 underline">911</a>.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/legal"
            className="hw-focus inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-edgesoft px-4 py-2.5 text-sm text-slate-200 hover:bg-panelsoft"
          >
            Read full disclaimer
          </Link>
          <button
            type="button"
            onClick={accept}
            className="hw-focus inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-signal-500 px-4 py-2.5 text-sm font-semibold text-void hover:bg-signal-400"
          >
            I understand - continue
          </button>
        </div>
      </div>
    </div>
  );
}
