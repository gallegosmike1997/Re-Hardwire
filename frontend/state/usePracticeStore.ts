import { create } from 'zustand';
import { config } from '@/lib/config';
import { getStorage, setStorage } from '@/lib/storage';

export type PracticeFeedback = 'helped' | 'not_for_me';
type SavedPracticeState = { favorites: string[]; feedback: Record<string, PracticeFeedback> };

interface PracticeState extends SavedPracticeState {
  isHydrated: boolean;
  hydrate: () => void;
  toggleFavorite: (id: string) => void;
  setFeedback: (id: string, feedback: PracticeFeedback) => void;
}

const EMPTY: SavedPracticeState = { favorites: [], feedback: {} };

function persist(state: SavedPracticeState) {
  setStorage(config.storage.practiceKey, state);
}

export const usePracticeStore = create<PracticeState>((set, get) => ({
  ...EMPTY,
  isHydrated: false,
  hydrate: () => {
    if (get().isHydrated) return;
    const saved = getStorage<Partial<SavedPracticeState>>(config.storage.practiceKey);
    set({
      favorites: Array.isArray(saved?.favorites) ? saved.favorites : [],
      feedback: saved?.feedback && typeof saved.feedback === 'object' ? saved.feedback : {},
      isHydrated: true,
    });
  },
  toggleFavorite: (id) => {
    const current = get();
    const favorites = current.favorites.includes(id)
      ? current.favorites.filter((item) => item !== id)
      : [...current.favorites, id];
    const next = { favorites, feedback: current.feedback };
    persist(next);
    set(next);
  },
  setFeedback: (id, feedback) => {
    const current = get();
    const next = { favorites: current.favorites, feedback: { ...current.feedback, [id]: feedback } };
    persist(next);
    set(next);
  },
}));
