/**
 * Protocol selection and routing-preview state.
 *
 * `catalog` is the five-level Re-Hardwire protocol ladder fetched from the
 * backend. `preview` holds the most recent routing decision so the Lab and the
 * Protocol pages can render the engine's reasoning without re-querying.
 */
import { create } from 'zustand';
import { api, type RouteResponse } from '@/lib/api';
import { config } from '@/lib/config';
import { getStorage, setStorage } from '@/lib/storage';

export interface ProtocolLevel {
  name: string;
  level: number;
  focus: string;
  description: string;
  tags: string[];
  intensity: number;
}

export interface ProtocolState {
  catalog: ProtocolLevel[];
  selected: string;
  preview: RouteResponse | null;
  isLoading: boolean;
  isRouting: boolean;
  error: string | null;

  hydrate: () => void;
  loadCatalog: () => Promise<void>;
  select: (name: string) => void;
  previewText: (text: string) => Promise<void>;
  clearPreview: () => void;
  protocolFor: (level: number) => ProtocolLevel | undefined;
}

export const useProtocolStore = create<ProtocolState>((set, get) => ({
  catalog: [],
  selected: '',
  preview: null,
  isLoading: false,
  isRouting: false,
  error: null,

  hydrate: () => {
    const selected = getStorage<string>(config.storage.protocolKey);
    set({ selected: selected ?? '' });
  },

  loadCatalog: async () => {
    if (get().catalog.length && !get().error) return;
    set({ isLoading: true, error: null });

    const response = await api.get<ProtocolLevel[]>('/api/route/protocols');
    if (!response.success || !response.data) {
      set({ isLoading: false, error: response.error ?? 'Could not load protocols.' });
      return;
    }

    const catalog = [...response.data].sort((a, b) => a.level - b.level);
    const selected = get().selected || catalog.find((p) => p.level === 3)?.name || catalog[0]?.name || '';

    set({ catalog, selected, isLoading: false, error: null });
    if (selected) setStorage(config.storage.protocolKey, selected);
  },

  select: (name) => {
    set({ selected: name });
    setStorage(config.storage.protocolKey, name);
  },

  previewText: async (text) => {
    const body = text.trim();
    if (!body) return;

    set({ isRouting: true, error: null });
    const response = await api.autoRoute({
      userText: body,
      ...(get().selected ? { protocol: get().selected } : {}),
    });

    if (!response.success || !response.data) {
      set({ isRouting: false, error: response.error ?? 'Routing failed.' });
      return;
    }
    set({ preview: response.data, isRouting: false, error: null });
  },

  clearPreview: () => set({ preview: null }),

  protocolFor: (level) => get().catalog.find((protocol) => protocol.level === level),
}));