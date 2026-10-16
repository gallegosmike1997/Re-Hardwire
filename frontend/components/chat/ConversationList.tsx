'use client';

/**
 * Scaffold: saved-session list.
 *
 * Renders backend history via `useHistoryStore` and hands the chosen session
 * to the chat store. Falls back to the locally cached copy (handled inside
 * the store) when the engine is unreachable.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHistoryStore } from '@/state/useHistoryStore';
import { useChatStore, type ChatState } from '@/state/useChatStore';
import type { HistoryEntry } from '@/lib/api';
import { formatRelative, truncate } from '@/lib/format';
import { Button, EmptyState, Icon } from '@/components/ui';
import { historyRetentionNotice } from '@/state/useHistoryStore';

function exportSession(entry: HistoryEntry) {
  const blob = new Blob(
    [JSON.stringify({ exportedAt: new Date().toISOString(), session: entry }, null, 2)],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `re-hardwire-session-${entry.sessionId}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function firstUserLine(entry: HistoryEntry): string {
  const first = entry.messages.find((message) => message.role === 'user');
  return first?.content ?? 'Empty session';
}

interface ConversationListProps {
  onSelect?: (entry: HistoryEntry) => void;
}

export function ConversationList({ onSelect }: ConversationListProps) {
  const router = useRouter();
  const entries = useHistoryStore((state) => state.entries);
  const activeId = useHistoryStore((state) => state.activeId);
  const isLoading = useHistoryStore((state) => state.isLoading);
  const error = useHistoryStore((state) => state.error);
  const load = useHistoryStore((state) => state.load);
  const setActive = useHistoryStore((state) => state.setActive);
  const loadSession = useChatStore((state: ChatState) => state.loadSession);
  const isSending = useChatStore((state) => state.isSending);
  const remove = useHistoryStore((state) => state.remove);
  const isDeleting = useHistoryStore((state) => state.isDeleting);

  useEffect(() => {
    void load();
  }, [load]);

  const open = (entry: HistoryEntry) => {
    setActive(entry.id);
    loadSession(entry);
    onSelect?.(entry);
    router.push('/chat');
  };

  if (isLoading && entries.length === 0) {
    return (
      <div className="space-y-2" aria-label="Loading conversations">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="hw-panel animate-pulse px-3 py-3">
            <div className="h-3 w-2/3 rounded bg-edge" />
            <div className="mt-2 h-2 w-1/3 rounded bg-edge" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon="chat"
        title="No saved sessions yet"
        description={
          error ?? 'Send a message in chat, then save the session to see it here.'
        }
        action={
          <Button size="sm" onClick={() => router.push('/chat')}>
            Start chatting
          </Button>
        }
      />
    );
  }

  return (
    <div>
    {error && <p role="alert" className="mb-2 text-xs text-alarm">{error}</p>}
    <p className="mb-2 text-[11px] leading-relaxed text-slate-600">{historyRetentionNotice()} Deleting a saved chat removes it from this device now; server copies delete on reconnect. Export first if you want to keep it.</p>
    <ul className="space-y-2">
      {entries.map((entry) => {
        const isActive = entry.id === activeId;
        return (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => open(entry)}
              disabled={isSending}
              aria-current={isActive ? 'true' : undefined}
              className={[
                'hw-focus flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors',
                isActive
                  ? 'border-signal-500/40 bg-signal-500/10'
                  : 'border-edge/70 bg-panelsoft/40 hover:border-signal-500/30',
              ].join(' ')}
            >
              <Icon
                name="chat"
                size={15}
                className={isActive ? 'mt-0.5 text-signal-400' : 'mt-0.5 text-slate-500'}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs text-slate-200">
                  {truncate(firstUserLine(entry), 80)}
                </span>
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-slate-600">
                  {entry.messages.length} msgs · {formatRelative(entry.createdAt)}
                  {entry.protocolUsed ? ` · ${entry.protocolUsed}` : ''}
                </span>
              </span>
            </button>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => exportSession(entry)}>Export</Button>
              <Button size="sm" variant="ghost" disabled={isSending || isDeleting} onClick={() => {
                exportSession(entry);
                if (window.confirm('Exported. Now delete this saved conversation from this device? Server copies will delete on reconnect.')) void remove(entry.id);
              }}>Export &amp; delete</Button>
              <Button size="sm" variant="ghost" disabled={isSending || isDeleting} onClick={() => {
                if (window.confirm('Delete this saved conversation without exporting? This cannot be undone.')) void remove(entry.id);
              }}>Delete</Button>
            </div>
          </li>
        );
      })}
    </ul>
    </div>
  );
}
