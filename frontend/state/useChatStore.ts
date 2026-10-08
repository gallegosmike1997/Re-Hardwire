/**
 * Conversation state for the chat surface.
 *
 * Transcripts are persisted locally through `lib/storage`; users can also
 * save sessions to the backend for access on another device.
 */
import { create } from 'zustand';
import { api, type HistoryEntry, type LLMMessage, type RouteResponse } from '@/lib/api';
import { config } from '@/lib/config';
import { streamConversation } from '@/lib/stream';
import { useHistoryStore } from './useHistoryStore';
import { useProtocolStore } from './useProtocolStore';
import { getStorage, removeStorage, setStorage } from '@/lib/storage';

let activeRequest: AbortController | null = null;
const DRAFT_KEY = `${config.storage.conversationKey}-draft`;
const MAX_CONTEXT_MESSAGES = 40;
const MAX_CONTEXT_MESSAGE_CHARS = 4000;

export interface ChatState {
  messages: LLMMessage[];
  sessionId: string;
  input: string;
  isSending: boolean;
  temporaryMode: boolean;
  isHydrated: boolean;
  error: string | null;
  lastRoute: RouteResponse | null;

  stop: () => void;
  autoRouting: boolean;
  setAutoRouting: (enabled: boolean) => void;
  setTemporaryMode: (enabled: boolean) => void;
  hydrate: () => void;
  setInput: (value: string) => void;
  clearError: () => void;
  newSession: () => void;
  send: (text?: string) => Promise<void>;
  retry: () => Promise<void>;
  persist: () => Promise<void>;
  loadSession: (entry: HistoryEntry) => void;
}

function makeSessionId(): string {
  return `thread_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function stamp(): string {
  return new Date().toISOString();
}

function normaliseMessages(messages: unknown): LLMMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages.flatMap((message): LLMMessage[] => {
    if (!message || typeof message !== 'object') return [];
    const candidate = message as Partial<LLMMessage>;
    if ((candidate.role !== 'user' && candidate.role !== 'assistant')
      || typeof candidate.content !== 'string') return [];
    return [{
      role: candidate.role,
      content: candidate.content,
      ...(typeof candidate.created_at === 'string' ? { created_at: candidate.created_at } : {}),
    }];
  });
}

function offlineCheckIn(): LLMMessage {
  return {
    role: 'assistant',
    content: [
      'OFFLINE CHECK-IN',
      'The coach service is unavailable, so I can’t interpret your message or give a personal response. I won’t guess. You can still choose a short guided practice on this device.',
      'If you may be in immediate danger, contact local emergency services. In the U.S., call or text 988 for emotional crisis support when a phone connection is available.',
    ].join('\n\n'),
    created_at: stamp(),
  };
}

/** Read the persisted transcript, guarding against malformed payloads. */
function readPersisted(): { messages: LLMMessage[]; sessionId: string } | null {
  const stored = getStorage<{ messages: LLMMessage[]; sessionId: string }>(
    config.storage.conversationKey,
  );
  if (!stored || !Array.isArray(stored.messages)) return null;
  return {
    messages: normaliseMessages(stored.messages),
    sessionId: stored.sessionId || makeSessionId(),
  };
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sessionId: makeSessionId(),
  input: '',
  isSending: false,
  temporaryMode: false,
  isHydrated: false,
  error: null,
  lastRoute: null,

  autoRouting: true,
  setAutoRouting: (enabled) => {
    setStorage(`${config.storage.uiPrefsKey}-autoRouting`, enabled);
    set({ autoRouting: enabled });
  },
  setTemporaryMode: (enabled) => {
    if (get().isSending) return;
    if (enabled) {
      // Temporary chat is memory-only. Remove the current draft and active
      // transcript from browser storage as soon as the mode is enabled.
      removeStorage(config.storage.conversationKey);
      removeStorage(DRAFT_KEY);
      set({ temporaryMode: true });
      return;
    }
    if (get().messages.length > 0) return;
    set({ temporaryMode: false });
  },
  stop: () => activeRequest?.abort(),
  hydrate: () => {
    if (get().isHydrated) return;
    const persisted = readPersisted();
    const storedAutoRouting = getStorage<boolean>(`${config.storage.uiPrefsKey}-autoRouting`);
    set({
      messages: persisted?.messages ?? [],
      sessionId: persisted?.sessionId ?? get().sessionId,
      input: getStorage<string>(DRAFT_KEY) ?? '',
      ...(typeof storedAutoRouting === 'boolean' ? { autoRouting: storedAutoRouting } : {}),
      isHydrated: true,
    });
  },

  setInput: (value) => {
    set({ input: value });
    if (get().temporaryMode) removeStorage(DRAFT_KEY);
    else if (value) setStorage(DRAFT_KEY, value);
    else removeStorage(DRAFT_KEY);
  },

  clearError: () => set({ error: null }),

  newSession: () => {
    if (get().isSending) return;
    useHistoryStore.getState().setActive(null);
    removeStorage(config.storage.conversationKey);
    removeStorage(DRAFT_KEY);
    set({
      messages: [],
      sessionId: makeSessionId(),
      temporaryMode: false,
      input: '',
      error: null,
      lastRoute: null,
    });
  },

  send: async (text) => {
    const body = (text ?? get().input).trim();
    if (!body || get().isSending) return;

    const userMessage: LLMMessage = { role: 'user', content: body, created_at: stamp() };
    const transcript = [...get().messages, userMessage];

    set({ messages: transcript, input: '', isSending: true, error: null });
    removeStorage(DRAFT_KEY);
    if (!get().temporaryMode) {
      setStorage(config.storage.conversationKey, {
        messages: transcript,
        sessionId: get().sessionId,
      });
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      set({ messages: [...transcript, offlineCheckIn()], isSending: false, error: null, lastRoute: null });
      if (!get().temporaryMode) {
        setStorage(config.storage.conversationKey, {
          messages: get().messages, sessionId: get().sessionId,
        });
      }
      return;
    }

    const controller = new AbortController();
    activeRequest = controller;
    const timeout = setTimeout(() => controller.abort(), 180000);
    let content = '';
    const created_at = stamp();
    try {
      await streamConversation({
        // Keep requests bounded while preserving the complete local transcript.
        messages: transcript.slice(-MAX_CONTEXT_MESSAGES).map((message) => ({
          ...message,
          content: message.content.slice(-MAX_CONTEXT_MESSAGE_CHARS),
        })),
        ...(!get().autoRouting && useProtocolStore.getState().selected
          ? { protocol: useProtocolStore.getState().selected } : {}),
      }, controller.signal, (delta) => {
        content += delta;
        set({ messages: [...transcript, { role: 'assistant', content, created_at }] });
      }, (route) => set({ lastRoute: route }));
    } catch {
      if (controller.signal.aborted) {
        set({ error: 'Response stopped or timed out. Retry to regenerate it.' });
      } else {
        set({ messages: [...transcript, offlineCheckIn()], error: null, lastRoute: null });
      }
    } finally {
      clearTimeout(timeout);
      activeRequest = null;
      set({ isSending: false });
      if (!get().temporaryMode) {
        setStorage(config.storage.conversationKey, {
          messages: get().messages, sessionId: get().sessionId,
        });
      }
    }
  },

  retry: async () => {
    const { messages, isSending } = get();
    if (isSending) return;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;

    const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user');
    set({ messages: messages.slice(0, lastUserIndex) });
    await get().send(lastUser.content);
  },

  persist: async () => {
    const { messages, sessionId, lastRoute } = get();
    if (!messages.length || get().isSending || get().temporaryMode) return;
    const createdAt = stamp();
    const localHistoryKey = `${config.storage.conversationKey}-history`;
    const cached = getStorage<HistoryEntry[]>(localHistoryKey) ?? [];
    const localEntry: HistoryEntry = {
      id: `local_${sessionId}`,
      sessionId,
      messages,
      createdAt,
      ...(lastRoute?.protocol ? { protocolUsed: lastRoute.protocol } : {}),
    };
    setStorage(localHistoryKey, [localEntry, ...cached.filter((entry) => entry.sessionId !== sessionId)]);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await useHistoryStore.getState().refresh();
      set({ error: null });
      return;
    }

    const response = await api.saveHistory({
      sessionId,
      messages,
      createdAt,
      ...(lastRoute?.protocol ? { protocolUsed: lastRoute.protocol } : {}),
    });
    if (!response.success) {
      await useHistoryStore.getState().refresh();
      set({ error: null });
      return;
    }
    const updatedCache = getStorage<HistoryEntry[]>(localHistoryKey) ?? [];
    setStorage(localHistoryKey, updatedCache.filter((entry) => entry.sessionId !== sessionId));
    await useHistoryStore.getState().refresh();
  },

  loadSession: (entry) => {
    if (get().isSending) return;
    const messages = normaliseMessages(entry.messages);
    set({
      messages,
      sessionId: entry.sessionId,
      input: '',
      error: null,
      lastRoute: null,
    });
    removeStorage(DRAFT_KEY);
    if (!get().temporaryMode) {
      setStorage(config.storage.conversationKey, {
        messages,
        sessionId: entry.sessionId,
      });
    }
  },
}));
