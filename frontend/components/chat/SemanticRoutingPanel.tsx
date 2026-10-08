'use client';

import { useCallback, useState } from 'react';
import { Card, Progress } from '@/components/ui';
import { config } from '@/lib/config';

const DEFAULT_WEIGHTS = { semantic: 0.6, keyword: 0.25, recency: 0.05, user_pref: 0.1 };
type WeightKey = keyof typeof DEFAULT_WEIGHTS;

interface SemanticRouteResult {
  protocol: string;
  confidence: number;
  reason: string;
  final_scores: Record<string, number>;
  semantic_scores: Record<string, number>;
  detected_state: string | null;
}

/**
 * Experimental semantic routing console ported from the original Re-Hardwire
 * routing lab. Scores are embedding similarities blended with weights; they
 * are NOT clinical confidence and this tool is not a medical device.
 */
export function SemanticRoutingPanel({ online }: { online: boolean }) {
  const [text, setText] = useState('I keep spiralling about the same thought tonight.');
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [result, setResult] = useState<SemanticRouteResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${config.api.baseUrl}/api/route/enhanced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_text: text, weights }),
        cache: 'no-store', credentials: 'omit', redirect: 'error',
        referrerPolicy: 'no-referrer',
      });
      if (!response.ok) throw new Error(`Routing failed (HTTP ${response.status}).`);
      setResult((await response.json()) as SemanticRouteResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Routing failed.');
    } finally {
      setBusy(false);
    }
  }, [text, weights, busy]);

  const ranked = result
    ? Object.entries(result.final_scores).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <Card
      title="Semantic router (experimental)"
      subtitle="SBERT similarity blended with keyword, recency and preference signals."
    >
      <textarea
        className="hw-focus min-h-[72px] w-full rounded-lg border border-edge bg-panel/70 p-3 text-sm text-slate-200"
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-label="Semantic routing input"
      />

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {(Object.keys(DEFAULT_WEIGHTS) as WeightKey[]).map((key) => (
          <label key={key} className="text-xs text-slate-400">
            <span className="flex justify-between">
              <span>{key}</span>
              <span className="font-mono">{weights[key].toFixed(2)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={weights[key]}
              onChange={(event) =>
                setWeights({ ...weights, [key]: Number(event.target.value) })
              }
              className="w-full accent-teal-500"
            />
          </label>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy || !online}
          className="hw-focus rounded-lg border border-signal-500/40 bg-signal-500/10 px-3 py-1.5 text-xs font-medium text-signal-300 transition-colors hover:bg-signal-500/20 disabled:cursor-wait disabled:opacity-50"
        >
          {busy ? 'Scoring…' : 'Run semantic route'}
        </button>
        {!online && (
          <span className="text-xs text-slate-500">Backend offline.</span>
        )}
        {error && <span className="text-xs text-alarm">{error}</span>}
      </div>

      {result && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-slate-400">
            Decision: <span className="text-slate-200">{result.protocol}</span> ·
            reason <code className="text-[11px] text-slate-500">{result.reason}</code>
            {result.detected_state ? <> · state {result.detected_state}</> : null}
          </p>
          {ranked.map(([protocol, score]) => (
            <Progress key={protocol} value={score} tone="signal" label={protocol} showValue />
          ))}
          <p className="text-[11px] leading-relaxed text-slate-600">
            Similarity scores are mathematical output, not clinical confidence.
          </p>
        </div>
      )}
    </Card>
  );
}
