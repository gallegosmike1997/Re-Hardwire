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

export interface ChatState {
  messages: LLMMessage[];
  sessionId: string;
  input: string;
  isSending: boolean;
  isHydrated: boolean;
  error: string | null;
  lastRoute: RouteResponse | null;

  stop: () => void;
  autoRouting: boolean;
  setAutoRouting: (enabled: boolean) => void;
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
    messages: stored.messages.filter((m) => m && typeof m.content === 'string'),
    sessionId: stored.sessionId || makeSessionId(),
  };
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sessionId: makeSessionId(),
  input: '',
  isSending: false,
  isHydrated: false,
  error: null,
  lastRoute: null,

  autoRouting: true,
  setAutoRouting: (enabled) => {
    setStorage(`${config.storage.uiPrefsKey}-autoRouting`, enabled);
    set({ autoRouting: enabled });
  },
  stop: () => activeRequest?.abort(),
  hydrate: () => {
    if (get().isHydrated) return;
    const persisted = readPersisted();
    const storedAutoRouting = getStorage<boolean>(`${config.storage.uiPrefsKey}-autoRouting`);
    set({
      messages: persisted?.messages ?? [],
      sessionId: persisted?.sessionId ?? get().sessionId,
      ...(typeof storedAutoRouting === 'boolean' ? { autoRouting: storedAutoRouting } : {}),
      isHydrated: true,
    });
  },

  setInput: (value) => set({ input: value }),

  clearError: () => set({ error: null }),

  newSession: () => {
    if (get().isSending) return;
    const previous = get();
    if (previous.messages.length) {
      useHistoryStore.getState().archiveLocal({
        sessionId: previous.sessionId,
        messages: previous.messages,
        createdAt: stamp(),
        ...(previous.lastRoute?.protocol ? { protocolUsed: previous.lastRoute.protocol } : {}),
      });
    }
    useHistoryStore.getState().setActive(null);
    removeStorage(config.storage.conversationKey);
    set({
      messages: [],
      sessionId: makeSessionId(),
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
    setStorage(config.storage.conversationKey, {
      messages: transcript,
      sessionId: get().sessionId,
    });

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      set({ messages: [...transcript, offlineCheckIn()], isSending: false, error: null, lastRoute: null });
      setStorage(config.storage.conversationKey, {
        messages: get().messages, sessionId: get().sessionId,
      });
      return;
    }

    const controller = new AbortController();
    activeRequest = controller;
    const timeout = setTimeout(() => controller.abort(), 180000);
    let content = '';
    const created_at = stamp();
    try {
      await streamConversation({
        messages: transcript,
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
      setStorage(config.storage.conversationKey, {
        messages: get().messages, sessionId: get().sessionId,
      });
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
    if (!messages.length || get().isSending) return;
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
    set({
      messages: entry.messages,
      sessionId: entry.sessionId,
      error: null,
      lastRoute: null,
    });
    setStorage(config.storage.conversationKey, {
      messages: entry.messages,
      sessionId: entry.sessionId,
    });
  },
}));
