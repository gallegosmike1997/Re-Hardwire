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
import { getStorage, removeStorage, setStorage } from '@/lib/storage';

export interface ChatState {
  messages: LLMMessage[];
  sessionId: string;
  input: string;
  isSending: boolean;
  isHydrated: boolean;
  error: string | null;
  lastRoute: RouteResponse | null;

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

  hydrate: () => {
    if (get().isHydrated) return;
    const persisted = readPersisted();
    set({
      messages: persisted?.messages ?? [],
      sessionId: persisted?.sessionId ?? get().sessionId,
      isHydrated: true,
    });
  },

  setInput: (value) => set({ input: value }),

  clearError: () => set({ error: null }),

  newSession: () => {
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

    // Route first so the coach reply is grounded in the current read.
    const routeResult = await api.autoRoute({ userText: body });
    const route = routeResult.success ? routeResult.data ?? null : null;

    const reply = await api.streamLLM({
      messages: transcript,
      ...(route?.protocol ? { protocol: route.protocol } : {}),
    });

    if (!reply.success || !reply.data) {
      set({
        isSending: false,
        error: reply.error ?? 'The coach did not respond.',
        lastRoute: route,
      });
      return;
    }

    const assistantMessage: LLMMessage = {
      role: 'assistant',
      content: reply.data.content,
      created_at: stamp(),
    };
    const next = [...transcript, assistantMessage];

    set({ messages: next, isSending: false, error: null, lastRoute: route });
    setStorage(config.storage.conversationKey, {
      messages: next,
      sessionId: get().sessionId,
    });
  },

  retry: async () => {
    const { messages, isSending } = get();
    if (isSending) return;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;

    // Drop the trailing assistant stub, if any, before resending.
    const trimmed =
      messages.length && messages[messages.length - 1].role === 'assistant'
        ? messages.slice(0, -1)
        : messages;
    set({ messages: trimmed });
    await get().send(lastUser.content);
  },

  persist: async () => {
    const { messages, sessionId, lastRoute } = get();
    if (!messages.length) return;
    await api.saveHistory({
      sessionId,
      messages,
      createdAt: stamp(),
      ...(lastRoute?.protocol ? { protocolUsed: lastRoute.protocol } : {}),
    });
  },

  loadSession: (entry) => {
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