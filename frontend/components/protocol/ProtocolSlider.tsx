'use client';

/**
 * Scaffold: protocol intensity slider (levels 1-5).
 *
 * Writes the selection into `useProtocolStore` and highlights the matching
 * protocol from the loaded catalogue.
 */
import { useEffect } from 'react';
import { useProtocolStore } from '@/state/useProtocolStore';
import { Card, Notice } from '@/components/ui';

export function ProtocolSlider() {
  const catalog = useProtocolStore((state) => state.catalog);
  const selected = useProtocolStore((state) => state.selected);
  const isLoading = useProtocolStore((state) => state.isLoading);
  const error = useProtocolStore((state) => state.error);
  const loadCatalog = useProtocolStore((state) => state.loadCatalog);
  const select = useProtocolStore((state) => state.select);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const active = catalog.find((protocol) => protocol.name === selected);
  const level = active?.level ?? 3;

  return (
    <Card title="Protocol intensity" subtitle="Levels 1 (stabilise) to 5 (perform)">
      {error && (
        <div className="mb-3">
          <Notice tone="warn">{error}</Notice>
        </div>
      )}
      <label htmlFor="protocol-level" className="hw-label mb-2 block">
        Level {level}
        {active ? ` · ${active.name}` : ''}
      </label>
      <input
        id="protocol-level"
        type="range"
        min={1}
        max={5}
        step={1}
        value={level}
        disabled={isLoading || catalog.length === 0}
        onChange={(event) => {
          const next = catalog.find(
            (protocol) => protocol.level === Number(event.target.value),
          );
          if (next) select(next.name);
        }}
        className="hw-focus w-full accent-signal-500 disabled:opacity-50"
        aria-valuetext={active ? `${active.name}, level ${level}` : `Level ${level}`}
      />
      <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-slate-600" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((tick) => (
          <span key={tick} className={tick === level ? 'text-signal-400' : ''}>
            {tick}
          </span>
        ))}
      </div>
      {active && (
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          {active.description || active.focus}
        </p>
      )}
    </Card>
  );
}
