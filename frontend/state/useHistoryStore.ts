/**
 * Saved-session state for the ConversationList and Success surfaces.
 *
 * Keeps an on-device history cache and merges it with backend sessions when
 * the service is available.
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
const DELETED_KEY = `${CACHE_KEY}-deleted`;

function readCache(): HistoryEntry[] {
  const cached = getStorage<HistoryEntry[]>(CACHE_KEY);
  return Array.isArray(cached) ? cached : [];
}

function readDeleted(): string[] {
  const deleted = getStorage<string[]>(DELETED_KEY);
  return Array.isArray(deleted) ? deleted : [];
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

    const deleted = readDeleted();
    for (const id of deleted) {
      if (!response.data.some((entry) => entry.id === id)) continue;
      const removal = await api.delete(`${config.api.endpoints.history}/${id}`);
      if (removal.success) {
        setStorage(DELETED_KEY, readDeleted().filter((item) => item !== id));
      }
    }
    const hiddenIds = new Set(readDeleted());
    const localOnly = readCache().filter((entry) => entry.id.startsWith('local_'));
    const entries = [...response.data, ...localOnly]
      .filter((entry) => !hiddenIds.has(entry.id))
      .filter((entry, index, all) => all.findIndex((item) => item.sessionId === entry.sessionId) === index)
      .sort(byNewest);
    setStorage(CACHE_KEY, entries);
    set({ entries, isLoading: false, error: null });
  },

  refresh: async () => {
    set({ isLoading: false });
    await get().load();
  },

  remove: async (id) => {
    set({ isDeleting: true, error: null });

    const entries = get().entries.filter((entry) => entry.id !== id);
    setStorage(CACHE_KEY, entries);
    set({
      entries,
      isDeleting: true,
      error: null,
      activeId: get().activeId === id ? null : get().activeId,
    });

    if (id.startsWith('local_')) {
      set({ isDeleting: false });
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStorage(DELETED_KEY, [...new Set([...readDeleted(), id])]);
      set({ isDeleting: false, error: 'Removed from this device. Server deletion will retry when you reconnect.' });
      return;
    }

    const response = await api.delete(`${config.api.endpoints.history}/${id}`);
    if (!response.success) {
      setStorage(DELETED_KEY, [...new Set([...readDeleted(), id])]);
      set({ isDeleting: false, error: 'Removed from this device. Server deletion will retry when you reconnect.' });
      return;
    }
    setStorage(DELETED_KEY, readDeleted().filter((item) => item !== id));
    set({ isDeleting: false, error: null });
  },

  setActive: (id) => set({ activeId: id }),

  wins: () => get().entries.filter((entry) => (entry.messages?.length ?? 0) > 0),
}));
