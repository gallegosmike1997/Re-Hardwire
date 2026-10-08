'use client';

import { useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { useProtocolStore } from '@/state/useProtocolStore';

export default function ProtocolPage() {
  const protocols = useProtocolStore((state) => state.catalog);
  const error = useProtocolStore((state) => state.error);
  const loading = useProtocolStore((state) => state.isLoading);
  const load = useProtocolStore((state) => state.loadCatalog);
  const selectedProtocol = useProtocolStore((state) => state.selected);
  const selectProtocol = useProtocolStore((state) => state.select);
  const active = protocols.find((protocol) => protocol.name === selectedProtocol) ?? null;

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <p className="hw-label">Protocol</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">The five levels</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
          A local reference for Re-Hardwire’s coaching ladder. The catalogue stays available when the coach service is offline.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-alarm/35 bg-alarm/5 px-3 py-2.5 text-xs text-alarm">
          {error}
        </div>
      )}

      {loading && <p className="text-xs text-slate-500">Loading catalogue…</p>}

      <div className="space-y-3">
        {protocols.map((protocol) => {
          const selected = active?.name === protocol.name;
          return (
            <article key={protocol.name}>
              <button
                type="button"
                aria-expanded={selected}
                onClick={() => selectProtocol(selected ? '' : protocol.name)}
                className={[
                  'hw-focus w-full rounded-xl border px-4 py-3 text-left transition-colors',
                  selected
                    ? 'border-signal-500/60 bg-signal-500/5'
                    : 'border-edgesoft bg-panelsoft/40 hover:border-signal-500/30',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-signal-500/40 font-mono text-sm text-signal-400">
                      {protocol.level}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">{protocol.name}</p>
                      <p className="truncate text-xs text-slate-600">{protocol.focus}</p>
                    </div>
                  </div>
                  <Icon
                    name="chevron"
                    size={15}
                    className={['shrink-0 text-slate-600 transition-transform', selected ? 'rotate-90' : ''].join(' ')}
                  />
                </div>
              </button>

              {selected && (
                <div className="mx-2 space-y-3 rounded-b-xl border border-t-0 border-edgesoft bg-panelsoft/20 px-4 py-3">
                  {protocol.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {protocol.tags.map((tag) => <Badge key={tag} tone="signal">{tag}</Badge>)}
                    </div>
                  )}
                  <p className="text-xs leading-relaxed text-slate-400">{protocol.description}</p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
