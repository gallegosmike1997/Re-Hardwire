/**
 * Saved-session state for the ConversationList and Success surfaces.
 *
 * Reads the backend history first and falls back to the locally cached copy so
 * past sessions remain browsable while the engine is unreachable.
 */
import { create } from 'zustand';
import { api, type HistoryEntry } from '@/lib/api';
import { config } from '@/lib/config';
import { getStorage, setStorage } from '@/lib/storage';

export interface HistoryState {
  entries: HistoryEntry[];
  activeId: string | null;
  isLoading: boolean;
  isDeleting: boolean;
  error: string | null;

  load: () => Promise<void>;
  refresh: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  setActive: (id: string | null) => void;
  /** Every user turn kept across all stored sessions, newest first. */
  wins: () => HistoryEntry[];
}

const CACHE_KEY = `${config.storage.conversationKey}-history`;

function readCache(): HistoryEntry[] {
  const cached = getStorage<HistoryEntry[]>(CACHE_KEY);
  return Array.isArray(cached) ? cached : [];
}

function byNewest(a: HistoryEntry, b: HistoryEntry): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  activeId: null,
  isLoading: false,
  isDeleting: false,
  error: null,

  load: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });

    const response = await api.getHistory();
    if (!response.success || !response.data) {
      set({
        entries: readCache(),
        isLoading: false,
        error: response.error ?? 'Could not load history.',
      });
      return;
    }

    const entries = [...response.data].sort(byNewest);
    setStorage(CACHE_KEY, entries);
    set({ entries, isLoading: false, error: null });
  },

  refresh: async () => {
    set({ isLoading: false });
    await get().load();
  },

  remove: async (id) => {
    set({ isDeleting: true, error: null });

    const response = await api.delete(`${config.api.endpoints.history}/${id}`);
    if (!response.success) {
      set({ isDeleting: false, error: response.error ?? 'Delete failed.' });
      return;
    }

    const entries = get().entries.filter((entry) => entry.id !== id);
    setStorage(CACHE_KEY, entries);
    set({
      entries,
      isDeleting: false,
      error: null,
      activeId: get().activeId === id ? null : get().activeId,
    });
  },

  setActive: (id) => set({ activeId: id }),

  wins: () => get().entries.filter((entry) => (entry.messages?.length ?? 0) > 0),
}));