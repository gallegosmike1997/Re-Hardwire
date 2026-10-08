/**
 * Protocol selection and routing-preview state.
 *
 * `catalog` is the five-level Re-Hardwire protocol ladder, fetched from the
 * backend when available and bundled locally as a fallback. `preview` holds
 * the most recent routing decision so the Lab can render it without re-querying.
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

const LOCAL_PROTOCOLS: ProtocolLevel[] = [
  { name: 'Stabilise & Breathe', level: 1, focus: 'safety', description: 'Down-regulate first. Short breath cycles, no problem solving yet.', tags: ['grounding', 'breath', 'safety'], intensity: 2 },
  { name: 'Ground & Regulate', level: 2, focus: 'regulation', description: 'Bring the nervous system back into range before any forward motion.', tags: ['grounding', 'regulation', 'routine'], intensity: 3 },
  { name: 'Resilience Builder Level 3', level: 3, focus: 'stability', description: 'Steady load, steady reps. Build the baseline that survives bad days.', tags: ['mindset', 'stability', 'focus'], intensity: 5 },
  { name: 'Momentum & Load', level: 4, focus: 'growth', description: 'Push into stretch while protecting recovery windows.', tags: ['momentum', 'growth', 'discipline'], intensity: 7 },
  { name: 'Pressure Performance', level: 5, focus: 'performance', description: 'High-load execution with active monitoring for overload signals.', tags: ['performance', 'pressure', 'execution'], intensity: 9 },
];

/** Convert historical selections (some versions stored a whole protocol object) to a name. */
function protocolName(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';

  const record = value as Record<string, unknown>;
  for (const key of ['name', 'protocol', 'selected']) {
    if (typeof record[key] === 'string') return (record[key] as string).trim();
  }
  return '';
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
    const saved = getStorage<unknown>(config.storage.protocolKey);
    const selected = protocolName(saved);
    set({ selected });
    if (selected && typeof saved !== 'string') {
      setStorage(config.storage.protocolKey, selected);
    }
  },

  loadCatalog: async () => {
    if (get().catalog.length && !get().error) return;
    set({ isLoading: true, error: null });

    const response = await api.get<ProtocolLevel[]>('/api/route/protocols');
    if (!response.success || !response.data) {
      const selected = get().selected || LOCAL_PROTOCOLS[2].name;
      set({ catalog: LOCAL_PROTOCOLS, selected, isLoading: false, error: null });
      setStorage(config.storage.protocolKey, selected);
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
