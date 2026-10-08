'use client';

import { useEffect, useRef } from 'react';

import { ChatMessage } from '@/components/chat/ChatMessage';
import { Button, EmptyState, Notice } from '@/components/ui';
import { useChatStore } from '@/state/useChatStore';

const PROMPTS = [
  'I am overwhelmed and cannot start anything',
  'I keep putting off the one call that matters',
  'I had a good day and shipped something',
  'I am running on empty but still pushing',
];

/**
 * Scrolling transcript. Auto-follows the newest message unless the user has
 * scrolled up to read back.
 */
export function ChatThread() {
  const messages = useChatStore((state) => state.messages);
  const sessionId = useChatStore((state) => state.sessionId);
  const isSending = useChatStore((state) => state.isSending);
  const error = useChatStore((state) => state.error);
  const lastRoute = useChatStore((state) => state.lastRoute);
  const clearError = useChatStore((state) => state.clearError);
  const retry = useChatStore((state) => state.retry);
  const send = useChatStore((state) => state.send);

  const endRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const onScroll = () => {
      const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
      pinnedRef.current = distance < 120;
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (pinnedRef.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length, isSending]);

  if (!messages.length) {
    return (
      <div className="hw-scroll flex-1 overflow-y-auto">
        <EmptyState
          icon="chat"
          title="No conversation yet"
          description="Type what is on your mind or choose a suggested starter to send it now. The coach replies once, then waits for your next message."
        />
        <div className="mx-auto grid max-w-lg gap-2 px-6 pb-8 sm:grid-cols-2">
          {PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void send(prompt)}
              className="hw-focus rounded-lg border border-edge bg-panel/70 px-3 py-2.5 text-left text-xs leading-relaxed text-slate-400 transition-colors hover:border-signal-500/50 hover:text-slate-200"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const lastAssistantIndex = messages.reduce(
    (found, message, index) => (message.role === 'assistant' ? index : found),
    -1,
  );

  return (
    <div ref={scrollerRef} className="hw-scroll flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6">
        {messages.map((message, index) => (
          <ChatMessage
            key={`${message.created_at ?? index}-${index}`}
            message={message}
            feedbackKey={`${sessionId}-${index}`}
            route={message.role === 'assistant' && index === lastAssistantIndex ? lastRoute : null}
          />
        ))}

        {isSending && (
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
            <span className="animate-blink">▍</span>
            Coach is composing
          </p>
        )}

        {error && (
          <Notice tone="error" onDismiss={clearError}>
            <div className="flex flex-wrap items-center gap-3">
              <span>{error}</span>
              <Button size="sm" variant="ghost" onClick={() => void retry()}>
                Retry
              </Button>
            </div>
          </Notice>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}

export default ChatThread;
