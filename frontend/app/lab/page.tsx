'use client';

import { useEffect } from 'react';
import { useProtocolStore } from '@/state/useProtocolStore';
import { useSystemStore } from '@/state/useSystemStore';
import { RouteInspector } from '@/components/chat/RouteInspector';
import { Card, EmptyState, Icon, Notice, Progress } from '@/components/ui';
import { formatPercent } from '@/lib/format';

const sampleInputs = [
  'I am overwhelmed today and everything is too much.',
  'Feeling flat and switched off for a week now.',
  'I started a project and shipped it ahead of schedule.',
  'Panicking about the call in thirty minutes.',
  'Snowed under at work but I have a clear plan.',
];

export default function LabPage() {
  const catalog = useProtocolStore((state) => state.catalog);
  const selected = useProtocolStore((state) => state.selected);
  const preview = useProtocolStore((state) => state.preview);
  const isRouting = useProtocolStore((state) => state.isRouting);
  const error = useProtocolStore((state) => state.error);
  const loadCatalog = useProtocolStore((state) => state.loadCatalog);
  const previewText = useProtocolStore((state) => state.previewText);

  const stats = useSystemStore((state) => state.stats);
  const loadStats = useSystemStore((state) => state.loadStats);
  const connection = useSystemStore((state) => state.status);

  useEffect(() => {
    void loadCatalog();
    void loadStats();
  }, [loadCatalog, loadStats]);

  const handlePreview = async (text: string) => {
    await previewText(text);
  };

  const online = connection === 'online';
  const avg = stats?.avgConfidence ?? 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <p className="hw-label">Lab</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Routing laboratory
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-slate-500">
          The router turns a keyword read into a protocol, an emotional state and a
          next action. Type or pick a sample line to watch the engine make its call.
        </p>
      </header>

      {!online && (
        <Notice tone="warn">
          Backend is offline. Start it with{' '}
          <code className="rounded bg-ink/80 px-1.5 py-0.5 text-xs text-alarm">
            uvicorn app.main:app
          </code>{' '}
          and the lab will come alive.
        </Notice>
      )}

      <Card title="Try a sample">
        <p className="hw-label mb-2">Type or pick a sample line:</p>
        <div className="flex flex-wrap gap-1.5">
          {sampleInputs.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => void handlePreview(text)}
              disabled={isRouting || !online}
              className={[
                'rounded-lg border border-edgesoft bg-panelsoft px-3 py-1.5 text-left',
                'text-xs text-slate-300 transition-colors hover:border-signal-500/40 hover:text-slate-100',
                'disabled:cursor-wait disabled:opacity-50',
              ].join(' ')}
            >
              {text}
            </button>
          ))}
        </div>

        {isRouting && (
          <div className="mt-3 flex items-center gap-3">
            <Icon name="refresh" size={16} className="animate-spin text-signal-500" />
            <span className="text-xs text-slate-500">Routing your input…</span>
          </div>
        )}

        {error && <p className="mt-2 text-xs text-alarm">{error}</p>}
      </Card>

      <div className="grid items-start gap-4 xl:grid-cols-[1fr_300px]">
        <section>
          <RouteInspector route={preview} title="Routing decision" levels={catalog.length || undefined} />
        </section>

        <aside className="space-y-4">
                    {preview && (
            <Card title="Protocol picked" subtitle={preview.protocol}>
              <p className="text-xs text-slate-500">
                Confidence {formatPercent(preview.confidence)} · Emotional read:{' '}
                {preview.emotionalState ?? 'n/a'}
              </p>
              <Progress value={preview.confidence} tone="signal" label="Confidence" showValue />
            </Card>
          )}

          {stats && (
            <Card title="Aggregate stats" subtitle={`${stats.events} recorded events`}>
              <ul className="space-y-1.5 text-xs">
                <li className="flex justify-between">
                  <span className="text-slate-500">Avg confidence</span>
                  <span className="text-slate-300">{formatPercent(stats.avgConfidence)}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">Top protocol</span>
                  <span className="text-slate-300">
                    {Object.entries(stats.protocols).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">Top state</span>
                  <span className="text-slate-300">
                    {Object.entries(stats.emotionalStates).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'}
                  </span>
                </li>
              </ul>
            </Card>
          )}

          {!preview && !isRouting && !online && (
            <EmptyState title="Pick a sample" description="Routing needs a live backend." icon="flask" />
          )}
        </aside>
      </div>

      {selected && (
        <Notice tone="info">
          Currently selected protocol: <strong className="text-signal-300">{selected}</strong>.
          Override it from the Protocol page.
        </Notice>
      )}
    </div>
  );
}