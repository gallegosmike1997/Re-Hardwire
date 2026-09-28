'use client';

import { useState } from 'react';
import { useChatStore } from '@/state/useChatStore';
import { useProtocolStore } from '@/state/useProtocolStore';
import { ConversationList } from './ConversationList';
import { Button } from '@/components/ui';
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
      <Button size="sm" disabled={chat.isSending || !chat.messages.length} onClick={async () => {
        setStatus('Saving…'); await chat.persist();
        setStatus(useChatStore.getState().error ?? 'Session saved.');
      }}>Save conversation</Button>
      <Button size="sm" disabled={chat.isSending || !chat.messages.length} onClick={() => download('json')}>Export JSON</Button>
      <Button size="sm" disabled={chat.isSending || !chat.messages.length} onClick={() => download('txt')}>Export text</Button>
      <Button size="sm" disabled={chat.isSending || !chat.messages.length} onClick={() => window.print()}>Print / Save PDF</Button>
    </div>
    <p role="status" className="text-xs">{status}</p>
    <details><summary className="cursor-pointer text-sm">Saved conversations</summary>
      <p className="my-2 text-xs">Saved on this backend and cached on this device. Deleting a saved copy does not erase an open chat or downloaded exports.</p>
      <ConversationList />
    </details>
  </div>;
}
