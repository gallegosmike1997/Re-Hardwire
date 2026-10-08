'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { EmptyState, Notice, StatTile } from '@/components/ui/StatTile';

interface HealthBody {
  status: string;
  engine: string;
}

interface ApiIndexBody {
  engine: string;
  version: string;
  endpoints: Record<string, string>;
}

export default function DevPage() {
  const [health, setHealth] = useState<HealthBody | null>(null);
  const [index, setIndex] = useState<ApiIndexBody | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      const requestOptions: RequestInit = {
        cache: 'no-store', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer',
      };
      const [healthRes, indexRes] = await Promise.all([
        fetch('/health', requestOptions), fetch('/api', requestOptions),
      ]);
      if (!healthRes.ok || !indexRes.ok) throw new Error('backend not responding');
      setHealth((await healthRes.json()) as HealthBody);
      setIndex((await indexRes.json()) as ApiIndexBody);
      setCheckedAt(new Date().toISOString());
    } catch {
      setHealth(null);
      setIndex(null);
      setError('Backend unreachable. Run scripts/setup_backend.sh, then uvicorn app.main:app.');
    } finally {
      setChecking(false);
    }
  }, []);

  // Start the health check after mount; it updates the request's loading state.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void check();
  }, [check]);

  const online = health?.status === 'online';
  const endpoints = index ? Object.entries(index.endpoints) : [];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">Dev</h1>
          <p className="text-sm text-slate-500">Engine wiring, health and the API surface.</p>
        </div>
        <button
          type="button"
          onClick={() => void check()}
          disabled={checking}
          className="inline-flex items-center gap-2 rounded-lg border border-edge bg-panel px-3 py-2 text-xs text-slate-300 transition-colors hover:border-signal-500/50 disabled:opacity-50"
        >
          <Icon name="refresh" size={14} className={checking ? 'animate-spin' : ''} />
          Re-check
        </button>
      </header>

      {error && <Notice tone="warn">{error}</Notice>}

      {!health && !error && <EmptyState title="Checking engine…" icon="activity" />}

      {health && (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Status"
            value={online ? 'Online' : 'Degraded'}
            tone={online ? 'win' : 'alarm'}
            icon={online ? 'check' : 'alert'}
          />
          <StatTile label="Engine" value={health.engine} tone="signal" icon="activity" />
          <StatTile label="Version" value={index?.version ?? '---'} hint={checkedAt ? `checked ${new Date(checkedAt).toLocaleTimeString()}` : undefined} icon="code" />
        </div>
      )}

      {index && (
        <section className="space-y-3 rounded-xl border border-edge/70 bg-panel/60 p-4">
          <h2 className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <Icon name="code" size={16} /> Endpoints
          </h2>
          <ul className="divide-y divide-edge/60">
            {endpoints.map(([name, path]) => (
              <li key={path} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-slate-300">{name}</span>
                <code className="rounded bg-ink/80 px-2 py-0.5 font-mono text-xs text-signal-300">
                  {path}
                </code>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
