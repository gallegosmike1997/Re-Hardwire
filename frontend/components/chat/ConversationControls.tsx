'use client';

import { useState } from 'react';
import { useChatStore } from '@/state/useChatStore';
import { useProtocolStore } from '@/state/useProtocolStore';
import { ConversationList } from './ConversationList';
import { Button, Icon } from '@/components/ui';
import { Select } from '@/components/ui/Select';

export function ConversationControls() {
  const chat = useChatStore();
  const { catalog, selected, select } = useProtocolStore();
  const [status, setStatus] = useState('');
  const download = (format: 'json' | 'txt') => {
    const text = format === 'json'
      ? JSON.stringify({ sessionId: chat.sessionId, messages: chat.messages }, null, 2)
      : chat.messages.map(m => `${m.role.toUpperCase()}\n${m.content}`).join('\n\n');
    const url = URL.createObjectURL(new Blob([text], { type: format === 'json' ? 'application/json' : 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = `re-hardwire-${Date.now()}.${format}`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Export downloaded. Keep this private conversation file secure.');
  };
  return <div className="hw-panel space-y-3 p-4 print:hidden">
    <section className={[
      'rounded-xl border p-3 transition-colors',
      chat.temporaryMode
        ? 'border-signal-400/35 bg-gradient-to-br from-signal-500/12 via-panel/80 to-pulse-500/10 shadow-[0_10px_36px_-28px_rgba(34,211,238,0.65)]'
        : 'border-edge/70 bg-panelsoft/40',
    ].join(' ')}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-signal-400/20 bg-signal-500/10 text-signal-300" aria-hidden="true">
          <Icon name="shield" size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-100">Temporary chat</span>
            <span className="rounded-full border border-edge/70 bg-ink/40 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400">
              {chat.temporaryMode ? 'On' : 'Off'}
            </span>
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-slate-400">
            {chat.temporaryMode
              ? 'This open chat stays in memory only and clears when you start a new session or reload.'
              : 'Use the switch below the message box before sending to keep this chat out of browser storage.'}
          </span>
        </span>
      </div>
      <p className="mt-2 border-t border-white/[0.06] pt-2 text-[11px] leading-relaxed text-slate-500">
        Online replies still send your message to the configured chat service. Previously saved conversations and exports are not removed.
      </p>
      {chat.temporaryMode && chat.messages.length > 0 && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-signal-300">
          Start a new session to leave temporary mode
        </p>
      )}
    </section>
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={chat.autoRouting} disabled={chat.isSending}
        onChange={e => chat.setAutoRouting(e.target.checked)} /> Automatic coaching protocol
    </label>
    {!chat.autoRouting && (
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-slate-400">Coaching protocol</span>
        <Select
          label="Coaching protocol"
          value={selected}
          disabled={chat.isSending}
          onChange={select}
          options={catalog.map((p) => ({ value: p.name, label: p.name }))}
        />
      </label>
    )}
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={chat.temporaryMode || chat.isSending || !chat.messages.length} onClick={async () => {
        setStatus('Saving…'); await chat.persist();
        setStatus(useChatStore.getState().error ?? 'Session saved.');
      }}>Save conversation</Button>
      <Button size="sm" disabled={chat.isSending || !chat.messages.length} onClick={() => download('json')}>Export JSON</Button>
      <Button size="sm" disabled={chat.isSending || !chat.messages.length} onClick={() => download('txt')}>Export text</Button>
      <Button size="sm" disabled={chat.isSending || !chat.messages.length} onClick={() => window.print()}>Print / Save PDF</Button>
    </div>
    <p role="status" className="text-xs">{status}</p>
    {!chat.temporaryMode && <details><summary className="cursor-pointer text-sm">Saved conversations</summary>
      <p className="my-2 text-xs">Saved on this backend and cached on this device. Deleting a saved copy does not erase an open chat or downloaded exports.</p>
      <ConversationList />
    </details>}
  </div>;
}
