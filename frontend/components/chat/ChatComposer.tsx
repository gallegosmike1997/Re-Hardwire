'use client';

import { useEffect, useRef, useState } from 'react';

import { Button, Icon, Textarea } from '@/components/ui';
import { config } from '@/lib/config';
import { useProfileStore } from '@/state/useProfileStore';
import { useChatStore } from '@/state/useChatStore';
import { getSpeechLanguage } from '@/lib/speech';

/** Minimal shape of the Web Speech API surface this component uses. */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
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
  const hasDraft = useChatStore((state) => Boolean(state.input.trim()));
  const temporaryMode = useChatStore((state) => state.temporaryMode);
  const setTemporaryMode = useChatStore((state) => state.setTemporaryMode);

  const areaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const profile = useProfileStore((state) => state.profile);
  const voiceEnabled = config.features.voiceInput && Boolean(profile?.preferences.voiceInput)
    && Boolean(profile?.permissions.includes('voice_input'));
  const [voiceError, setVoiceError] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(false);

  // Browser capability detection must run client-side to keep server rendering stable.
  useEffect(() => {
    const globalRef = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVoiceSupported(
      Boolean(globalRef.SpeechRecognition ?? globalRef.webkitSpeechRecognition) &&
        config.features.voiceInput,
    );
  }, []);

  useEffect(() => {
    if (!voiceEnabled || isSending) {
      recognitionRef.current?.stop();
    }
  }, [voiceEnabled, isSending]);
  useEffect(() => () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = recognition.onerror = recognition.onend = null;
      recognition.stop();
    }
  }, []);

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
    if (!Recognition || !voiceEnabled || isSending) return;
    setVoiceError('');

    const recognition = new Recognition();
    recognition.lang = getSpeechLanguage(profile?.preferences.voiceLanguage, navigator.language || 'en-US');
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(
        { length: event.results.length },
        (_, index) => event.results[index][0].transcript,
      ).join(' ');
      const currentInput = useChatStore.getState().input;
      setInput(`${currentInput ? `${currentInput} ` : ''}${transcript}`.trim());
    };
    recognition.onerror = (event) => {
      const messages: Record<string, string> = {
        'not-allowed': 'Microphone access was denied. Allow microphone access in browser settings and try again.',
        'service-not-allowed': 'The browser speech service is unavailable or blocked.',
        'audio-capture': 'No microphone is available. Connect a microphone and try again.',
        'no-speech': 'No speech was detected. Try again when you are ready.',
        network: 'The browser speech service could not connect. Check your connection or type instead.',
      };
      if (event.error !== 'aborted') setVoiceError(messages[event.error] ?? 'Dictation failed. Please try again or type your message.');
      setListening(false);
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
      setVoiceError('Dictation could not start. Check browser microphone permissions.');
    }
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
            maxLength={4000}
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

          {voiceSupported && voiceEnabled && (
            <Button
              disabled={isSending}
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

          {isSending ? (
            <Button
              variant="danger"
              size="lg"
              onClick={() => useChatStore.getState().stop()}
              aria-label="Stop generating"
              title="Stop the current response"
            >
              <Icon name="stop" size={17} />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              disabled={!canSend}
              onClick={submit}
              aria-label="Send message"
            >
              <Icon name="send" size={17} />
            </Button>
          )}
        </div>

          {voiceError && <p role="alert" className="mt-2 text-sm text-alarm">{voiceError}</p>}
          {!voiceEnabled && <p className="mt-2 text-xs text-slate-500">Enable Voice input and its capability in Settings to dictate.</p>}
          {voiceEnabled && !voiceSupported && <p className="mt-2 text-xs text-slate-500">Dictation is not supported in this browser. You can still type.</p>}

        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-600">
            Enter to send · Shift+Enter for a new line
          </p>

          {hasMessages && !temporaryMode && (
            <Button variant="ghost" size="sm" onClick={() => void useChatStore.getState().persist()}>
              Save session
            </Button>
          )}
          {temporaryMode && (
            <span className="rounded-full border border-signal-400/20 bg-signal-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-signal-300">
              Memory only
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            disabled={isSending}
            title="Start a new session; unsaved chat will be discarded"
            onClick={() => {
              if (!temporaryMode && (hasMessages || hasDraft) && !window.confirm('Start a new session? The open chat and draft will be removed from this device unless you saved the conversation. Previously saved conversations and exports remain.')) return;
              newSession();
            }}
          >
            <Icon name="refresh" size={13} />
            New session
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-white/[0.05] pt-2">
          <label className="inline-flex cursor-pointer items-center gap-2 text-[10px] text-slate-400">
            <input
              type="checkbox"
              role="switch"
              aria-checked={temporaryMode}
              checked={temporaryMode}
              disabled={isSending || (temporaryMode && hasMessages)}
              onChange={(event) => setTemporaryMode(event.target.checked)}
              className="hw-focus h-4 w-4 accent-signal-500"
            />
            Temporary chat
          </label>
          <p className="text-[10px] leading-relaxed text-slate-600">
            When online, messages go to the coach service. {temporaryMode
              ? 'This chat is memory only.'
              : 'This conversation is saved in browser storage.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ChatComposer;
