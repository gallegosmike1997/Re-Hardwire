/**
 * Custom Coping Practice Builder Store (Week 8)
 *
 * Allows users to author, tag, and save personalized coping exercises
 * stored locally on the device.
 */
import { create } from 'zustand';
import { getStorage, setStorage } from '@/lib/storage';

export interface CustomPractice {
  id: string;
  title: string;
  category: 'settle' | 'reflect' | 'move' | 'connect';
  duration: string;
  instructions: string;
  createdAt: string;
}

interface CustomPracticeState {
  practices: CustomPractice[];
  isHydrated: boolean;
  hydrate: () => void;
  addPractice: (practice: Omit<CustomPractice, 'id' | 'createdAt'>) => void;
  deletePractice: (id: string) => void;
}

const CUSTOM_PRACTICES_KEY = 'rehardwire_custom_practices_v1';

const DEFAULT_PRACTICES: CustomPractice[] = [
  {
    id: 'cp_1',
    title: 'Favorite Window Reset',
    category: 'settle',
    duration: '3 min',
    instructions: 'Look out the nearest window, name 3 colors you see, and take two gentle exhales.',
    createdAt: new Date().toISOString(),
  },
];

export const useCustomPracticeStore = create<CustomPracticeState>((set, get) => ({
  practices: [],
  isHydrated: false,

  hydrate: () => {
    if (get().isHydrated) return;
    const stored = getStorage<CustomPractice[]>(CUSTOM_PRACTICES_KEY) ?? DEFAULT_PRACTICES;
    if (!getStorage<CustomPractice[]>(CUSTOM_PRACTICES_KEY)) {
      setStorage(CUSTOM_PRACTICES_KEY, DEFAULT_PRACTICES);
    }
    set({ practices: stored, isHydrated: true });
  },

  addPractice: (data) => {
    const newPractice: CustomPractice = {
      id: `cp_${Date.now().toString(36)}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
    const practices = [newPractice, ...get().practices];
    setStorage(CUSTOM_PRACTICES_KEY, practices);
    set({ practices });
  },

  deletePractice: (id) => {
    const practices = get().practices.filter((p) => p.id !== id);
    setStorage(CUSTOM_PRACTICES_KEY, practices);
    set({ practices });
  },
}));
