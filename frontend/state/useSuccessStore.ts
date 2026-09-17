/**
 * Logged wins.
 *
 * Wins are the "success" surface of the protocol ladder: proof of movement
 * kept where the user can see it. They live in local storage so the record
 * survives offline use.
 */
import { create } from 'zustand';

import { config } from '@/lib/config';
import { getStorage, setStorage } from '@/lib/storage';

export interface Win {
  id: string;
  text: string;
  protocol?: string;
  /** Optional 1-5 self-rating of how much it moved the needle. */
  impact: number;
  createdAt: string;
}

export interface SuccessState {
  wins: Win[];
  draft: string;
  impact: number;
  isHydrated: boolean;

  hydrate: () => void;
  setDraft: (value: string) => void;
  setImpact: (value: number) => void;
  addWin: (text?: string, protocol?: string) => Win | null;
  removeWin: (id: string) => void;
  clearWins: () => void;
  streak: () => number;
  averageImpact: () => number;
}

function makeId(): string {
  return `win_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function normalise(records: unknown): Win[] {
  if (!Array.isArray(records)) return [];
  return records
    .filter((item): item is Win => Boolean(item) && typeof item.text === 'string')
    .map((item) => ({
      id: item.id || makeId(),
      text: item.text,
      ...(item.protocol ? { protocol: item.protocol } : {}),
      impact: typeof item.impact === 'number' ? item.impact : 3,
      createdAt: item.createdAt || new Date().toISOString(),
    }));
}

export const useSuccessStore = create<SuccessState>((set, get) => ({
  wins: [],
  draft: '',
  impact: 3,
  isHydrated: false,

  hydrate: () => {
    if (get().isHydrated) return;
    set({ wins: normalise(getStorage<Win[]>(config.storage.winsKey)), isHydrated: true });
  },

  setDraft: (value) => set({ draft: value }),

  setImpact: (value) => set({ impact: Math.min(5, Math.max(1, Math.round(value))) }),

  addWin: (text, protocol) => {
    const body = (text ?? get().draft).trim();
    if (!body) return null;

    const win: Win = {
      id: makeId(),
      text: body,
      ...(protocol ? { protocol } : {}),
      impact: get().impact,
      createdAt: new Date().toISOString(),
    };

    const wins = [win, ...get().wins];
    setStorage(config.storage.winsKey, wins);
    set({ wins, draft: '' });
    return win;
  },

  removeWin: (id) => {
    const wins = get().wins.filter((win) => win.id !== id);
    setStorage(config.storage.winsKey, wins);
    set({ wins });
  },

  clearWins: () => {
    setStorage(config.storage.winsKey, []);
    set({ wins: [] });
  },

  streak: () => {
    const days = new Set(
      get().wins.map((win) => new Date(win.createdAt).toDateString()),
    );

    let count = 0;
    const cursor = new Date();
    while (days.has(cursor.toDateString())) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  },

  averageImpact: () => {
    const wins = get().wins;
    if (!wins.length) return 0;
    return wins.reduce((total, win) => total + win.impact, 0) / wins.length;
  },
}));