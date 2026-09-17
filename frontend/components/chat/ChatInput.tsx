'use client';

/**
 * Scaffold: chat text input with send handling.
 *
 * Thin wrapper over the chat store so pages can drop in a single input
 * without wiring `useChatStore` themselves. `ChatComposer` remains the
 * full-featured composer; this is the minimal input from the scaffold spec.
 */
import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useChatStore } from '@/state/useChatStore';
import { Button, Icon } from '@/components/ui';

interface ChatInputProps {
  placeholder?: string;
  autoFocus?: boolean;
}

export function ChatInput({ placeholder = 'Describe your day…', autoFocus = false }: ChatInputProps) {
  const input = useChatStore((state) => state.input);
  const setInput = useChatStore((state) => state.setInput);
  const send = useChatStore((state) => state.send);
  const isSending = useChatStore((state) => state.isSending);
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async () => {
    if (!input.trim() || isSending) return;
    setLocalError(null);
    try {
      await send();
    } catch {
      setLocalError('Could not send that message. Try again.');
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="flex items-end gap-2">
        <label htmlFor="chat-input" className="sr-only">
          Message the coach
        </label>
        <textarea
          id="chat-input"
          value={input}
          autoFocus={autoFocus}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isSending}
          className="hw-focus hw-scroll max-h-32 min-h-[42px] w-full resize-none rounded-lg border border-edgesoft bg-ink/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 disabled:opacity-50"
        />
        <Button type="submit" disabled={!input.trim() || isSending} aria-label="Send message">
          <Icon name="send" size={16} />
          <span className="hidden sm:inline">{isSending ? 'Sending…' : 'Send'}</span>
        </Button>
      </div>
      {localError && (
        <p role="alert" className="mt-1.5 text-xs text-alarm">
          {localError}
        </p>
      )}
    </form>
  );
}
