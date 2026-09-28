'use client';

import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatThread } from '@/components/chat/ChatThread';
import { ConversationControls } from '@/components/chat/ConversationControls';
import { RouteInspector } from '@/components/chat/RouteInspector';
import { useChatStore } from '@/state/useChatStore';

export default function ChatPage() {
  const route = useChatStore((state) => state.lastRoute);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Chat</h1>
        <p className="mt-1 text-sm text-slate-400">
          Describe your day and explore one manageable next step.
        </p>
      </header>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section
          aria-label="Conversation"
          className="hw-panel flex h-[70vh] min-h-[420px] min-w-0 flex-col overflow-hidden"
        >
          <ChatThread />
          <ChatComposer />
        </section>
        <aside aria-label="Suggested protocol">
          <ConversationControls />
          <RouteInspector route={route} />
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Routing is a keyword-based coaching suggestion, not a clinical
            assessment. Replies come from the configured backend model, or a
            scripted offline fallback.
          </p>
        </aside>
      </div>
    </div>
  );
}
