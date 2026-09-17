'use client';

import { useEffect, useRef, useState } from 'react';

import { Button, Icon, Textarea } from '@/components/ui';
import { config } from '@/lib/config';
import { useChatStore } from '@/state/useChatStore';

/** Minimal shape of the Web Speech API surface this component uses. */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

/**
 * Composer for the chat surface.
 *
 * Handles Enter-to-send, Shift+Enter for a newline, and optional dictation via
 * the Web Speech API when it is available and the user has voice input on.
 */
export function ChatComposer() {
  const input = useChatStore((state) => state.input);
  const setInput = useChatStore((state) => state.setInput);
  const send = useChatStore((state) => state.send);
  const isSending = useChatStore((state) => state.isSending);
  const newSession = useChatStore((state) => state.newSession);
  const hasMessages = useChatStore((state) => state.messages.length > 0);

  const areaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  useEffect(() => {
    const globalRef = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    setVoiceSupported(
      Boolean(globalRef.SpeechRecognition ?? globalRef.webkitSpeechRecognition) &&
        config.features.voiceInput,
    );
  }, []);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const submit = () => {
    void send();
    areaRef.current?.focus();
  };

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const globalRef = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Recognition = globalRef.SpeechRecognition ?? globalRef.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = 'en-GB';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(
        { length: event.results.length },
        (_, index) => event.results[index][0].transcript,
      ).join(' ');
      setInput(`${input ? `${input} ` : ''}${transcript}`.trim());
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const canSend = input.trim().length > 0 && !isSending;

  return (
    <div className="shrink-0 border-t border-edge bg-void/85 px-4 py-3 backdrop-blur">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2">
          <Textarea
            ref={areaRef}
            value={input}
            rows={2}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (canSend) submit();
              }
            }}
            placeholder="Say what is actually going on, then press Enter."
            aria-label="Message the coach"
            className="min-h-[64px]"
          />

          {voiceSupported && (
            <Button
              variant={listening ? 'danger' : 'secondary'}
              size="lg"
              onClick={toggleListening}
              aria-pressed={listening}
              aria-label={listening ? 'Stop dictation' : 'Start dictation'}
              title={listening ? 'Stop dictation' : 'Dictate instead of typing'}
            >
              <Icon name="mic" size={17} />
            </Button>
          )}

          <Button
            variant="primary"
            size="lg"
            loading={isSending}
            disabled={!canSend}
            onClick={submit}
            aria-label="Send message"
          >
            <Icon name="send" size={17} />
          </Button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-600">
            Enter to send · Shift+Enter for a new line
          </p>

          {hasMessages && (
            <Button variant="ghost" size="sm" onClick={() => void useChatStore.getState().persist()}>
              Save session
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={newSession}>
            <Icon name="refresh" size={13} />
            New session
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ChatComposer;