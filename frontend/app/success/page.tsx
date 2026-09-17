'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Card, EmptyState, Icon, Input, Notice } from '@/components/ui';
import { StatTile } from '@/components/ui/StatTile';
import { formatRelative, formatTime, truncate } from '@/lib/format';
import { config } from '@/lib/config';
import { getStorage, setStorage } from '@/lib/storage';

interface HistoryEntry {
  id: string;
  sessionId: string;
  protocolUsed?: string;
  createdAt: string;
  messages: Array<Record<string, unknown>>;
}

interface Win {
  id: string;
  text: string;
  createdAt: string;
}

const samplePrompts = [
  'Managed the morning panic attack with the box-breathing drill.',
  'Shipped the Resilience Level-3 write-up before the deadline.',
  'Paused and reset instead of snapping during the meeting.',
  'Took the evening walk even though motivation was zero.',
  'Asked for help with the quarterly plan instead of carrying it alone.',
];

const stamp = () => new Date().toISOString();

export default function SuccessPage() {
  const [sessions, setSessions] = useState<HistoryEntry[]>([]);
  const [wins, setWins] = useState<Win[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [winInput, setWinInput] = useState('');
  const [winError, setWinError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/history', { cache: 'no-store' });
      if (!response.ok) throw new Error(`history request failed (${response.status})`);
      const list = (await response.json()) as HistoryEntry[];
      setSessions(list);
    } catch {
      setError('Could not load session history. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWins = useCallback(() => {
    const stored = getStorage<Win[]>(config.storage.winsKey) ?? [];
    setWins([...stored].sort((a, b) => (b.createdAt < a.createdAt ? -1 : 1)));
  }, []);

  useEffect(() => {
    void loadSessions();
    loadWins();
  }, [loadSessions, loadWins]);

  const recordWin = (text: string) => {
    if (!text.trim()) return;
    const next = [{ id: `win_${Date.now()}`, text: text.trim(), createdAt: stamp() }, ...wins];
    setWins(next);
    setStorage(config.storage.winsKey, next);
  };

  const addWin = () => {
    setWinError(null);
    if (!winInput.trim()) {
      setWinError('Describe a win first.');
      return;
    }
        recordWin(winInput);
    setWinInput('');
  };

  const promptWin = (text: string) => {
    recordWin(text);
  };

  const totalMessages = sessions.reduce(
    (sum, session) => sum + (Array.isArray(session.messages) ? session.messages.length : 0),
    0,
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <p className="hw-label">Success</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Wins & progress</h1>
        <p className="max-w-lg text-sm leading-relaxed text-slate-500">
          Coaching progress is built from small, repeatable reps. Record the
          moments that held even when everything else did not, then review them
          when the baseline drifts.
        </p>
      </header>

      {error && <Notice tone="warn">{error}</Notice>}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Sessions saved" value={sessions.length} icon="activity" />
        <StatTile label="Total turns" value={totalMessages} icon="chat" tone="pulse" />
        <StatTile label="Wins recorded" value={wins.length} icon="trophy" tone="win" />
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Icon name="trophy" size={16} /> Record a win
        </h2>
        <Input
          placeholder="One line: what held today..."
          value={winInput}
          onChange={(event) => setWinInput(event.target.value)}
          hint="Keep it to a single sentence. The coach will echo it back to anchor the win."
        />
        {winError && <p className="text-xs text-alarm">{winError}</p>}
        <button
          type="button"
          onClick={addWin}
          disabled={!winInput.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-win/15 px-4 py-2 text-sm font-medium text-win hover:bg-win/25 disabled:opacity-50"
        >
          <Icon name="check" size={14} />
          Add win
        </button>

        <p className="text-xs text-slate-600">Recent phrases people use:</p>
        <div className="flex flex-wrap gap-1.5">
          {samplePrompts.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => promptWin(text)}
              className="rounded-lg border border-edgesoft bg-panelsoft px-2.5 py-1.5 text-left text-xs text-slate-300 transition-colors hover:border-signal-500/40 hover:text-slate-100"
            >
              {truncate(text, 44)}
            </button>
          ))}
                </div>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Icon name="trophy" size={16} /> Your wins
        </h2>
        {wins.length === 0 ? (
          <EmptyState
            title="No wins yet"
            description="Wins are small things that went right. They do count."
            icon="trophy"
          />
        ) : (
          <ul className="space-y-2">
                        {wins.map((win) => (
              <li key={win.id} className="rounded-xl border border-edgesoft bg-panelsoft/30 px-3 py-2.5">
                <p className="text-sm text-slate-200">{win.text}</p>
                <p className="mt-1 text-xs text-slate-600">{formatRelative(win.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Icon name="activity" size={16} /> Saved sessions
        </h2>
        {loading && <p className="text-xs text-slate-500">Loading sessions…</p>}
        {!loading && sessions.length === 0 ? (
          <EmptyState
            title="No saved sessions"
            description="Sessions are saved to history from the chat surface."
            icon="activity"
          />
        ) : (
          <ul className="space-y-2">
            {!loading &&
              sessions.map((session) => (
                <li
                  key={session.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-edgesoft bg-panelsoft/30 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">
                      {session.protocolUsed ?? 'Untitled session'}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {Array.isArray(session.messages) ? session.messages.length : 0} turns • saved{' '}
                      {formatTime(session.createdAt)}
                    </p>
                  </div>
                  {session.protocolUsed && (
                    <Badge tone="signal" className="mt-0.5 shrink-0">
                      {session.protocolUsed}
                    </Badge>
                  )}
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
