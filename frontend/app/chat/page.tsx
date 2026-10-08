'use client';

import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatThread } from '@/components/chat/ChatThread';
import { ConversationControls } from '@/components/chat/ConversationControls';
import { RouteInspector } from '@/components/chat/RouteInspector';
import { useChatStore } from '@/state/useChatStore';

export default function ChatPage() {
  const route = useChatStore((state) => state.lastRoute);

  return (
    <div className="space-y-5">
      <header className="px-1">
        <p className="hw-label">A space to talk it through</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">Chat</h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">
          Describe your day and explore one manageable next step.
        </p>
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
