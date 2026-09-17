'use client';

/**
 * Scaffold: routing-decision graph for the Lab surface.
 *
 * Pure SVG bar chart over the aggregated protocol counters in
 * `useSystemStore.stats`, with a text fallback when nothing is recorded yet.
 */
import { useEffect } from 'react';
import { engineLabel, useSystemStore } from '@/state/useSystemStore';
import { Card, EmptyState } from '@/components/ui';

const BAR_TONES = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#f87171'];

export function RouteGraph() {
  const stats = useSystemStore((state) => state.stats);
  const loadStats = useSystemStore((state) => state.loadStats);
  const engine = useSystemStore(engineLabel);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const entries = Object.entries(stats?.protocols ?? {}).sort((a, b) => b[1] - a[1]);
  const max = entries.reduce((peak, [, count]) => Math.max(peak, count), 0);

  if (entries.length === 0) {
    return (
      <Card title="Route graph" subtitle={`Engine: ${engine}`}>
        <EmptyState
          icon="flask"
          title="No routing events yet"
          description="Route a message from chat or the preview box below and the distribution will appear here."
        />
      </Card>
    );
  }

  return (
    <Card title="Route graph" subtitle={`${stats?.events ?? 0} events · engine ${engine}`}>
      <div className="space-y-2.5" role="img" aria-label={`Routing distribution across ${entries.length} protocols`}>
        {entries.map(([name, count], index) => (
          <div key={name} className="flex items-center gap-3">
            <span className="w-40 shrink-0 truncate text-xs text-slate-300">{name}</span>
            <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-edge/80">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${max ? Math.max(6, (count / max) * 100) : 0}%`,
                  backgroundColor: BAR_TONES[index % BAR_TONES.length],
                }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-mono text-[11px] text-slate-500">
              {count}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
