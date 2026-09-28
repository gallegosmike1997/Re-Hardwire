/**
 * Conversation state for the chat surface.
 *
 * History is persisted locally through `lib/storage` and mirrored to the
 * backend through `api.saveHistory`, so a session survives both a refresh and
 * a device switch.
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
    } catch (error) {
      set({ error: controller.signal.aborted
        ? 'Response stopped or timed out. Retry to regenerate it.'
        : error instanceof Error ? error.message : 'The coach did not respond.' });
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
    const response = await api.saveHistory({
      sessionId,
      messages,
      createdAt: stamp(),
      ...(lastRoute?.protocol ? { protocolUsed: lastRoute.protocol } : {}),
    });
    if (!response.success) {
      set({ error: response.error ?? 'Could not save session.' });
      return;
    }
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