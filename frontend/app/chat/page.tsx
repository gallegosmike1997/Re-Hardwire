'use client';

import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatThread } from '@/components/chat/ChatThread';
import { ConversationControls } from '@/components/chat/ConversationControls';
import { RouteInspector } from '@/components/chat/RouteInspector';
import { useChatStore } from '@/state/useChatStore';

export default function ChatPage() {
  const route = useChatStore((state) => state.lastRoute);
  const temporaryMode = useChatStore((state) => state.temporaryMode);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-signal-400/20 bg-gradient-to-br from-signal-500/15 to-pulse-500/10 text-signal-300 shadow-[0_10px_34px_-22px_rgba(34,211,238,0.7)]">
            <span className="text-lg" aria-hidden="true">✳</span>
          </span>
          <div>
            <p className="hw-label">A space to talk it through</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">Chat</h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              Describe your day and explore one manageable next step.
            </p>
          </div>
        </div>
        <span className={[
          'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em]',
          temporaryMode
            ? 'border-signal-400/25 bg-signal-500/10 text-signal-300'
            : 'border-edge bg-panel/70 text-slate-400',
        ].join(' ')} role="status">
          <span className={['h-1.5 w-1.5 rounded-full', temporaryMode ? 'bg-signal-300 shadow-[0_0_9px_rgba(34,211,238,0.7)]' : 'bg-slate-500'].join(' ')} />
          {temporaryMode ? 'Temporary · memory only' : 'Saved on this device'}
        </span>
      </header>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section
          aria-label="Conversation"
          className="hw-panel flex h-[min(72vh,760px)] min-h-[460px] min-w-0 flex-col overflow-hidden shadow-[0_24px_70px_-44px_rgba(0,0,0,0.9)]"
        >
          <ChatThread />
          <ChatComposer />
        </section>
        <aside aria-label="Suggested protocol">
          <ConversationControls />
          <RouteInspector route={route} />
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Routing is a keyword-based coaching suggestion, not a clinical
            assessment. Personal coach replies need the configured backend. If
            it is unavailable, your chat stays on this device and you can open
            the guided practice library.
          </p>
        </aside>
      </div>
    </div>
  );
}
