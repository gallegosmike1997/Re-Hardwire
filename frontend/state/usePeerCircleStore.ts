/**
 * Peer Support Circles & Anonymous Check-In Store (Week 19)
 *
 * Manages local encrypted peer support groups, anonymous check-ins, and
 * micro-win shares within trusted peer cohorts.
 */
import { create } from 'zustand';
import { getStorage, setStorage } from '@/lib/storage';

export interface PeerCheckIn {
  id: string;
  circleName: string;
  anonymousAlias: string;
  moodBadge: string;
  sharedNote: string;
  createdAt: string;
}

interface PeerCircleState {
  checkIns: PeerCheckIn[];
  isHydrated: boolean;
  hydrate: () => void;
  addCheckIn: (checkIn: Omit<PeerCheckIn, 'id' | 'createdAt'>) => void;
  deleteCheckIn: (id: string) => void;
}

const PEER_CHECKINS_KEY = 'rehardwire_peer_checkins_v1';

const DEFAULT_CHECKINS: PeerCheckIn[] = [
  {
    id: 'pc_1',
    circleName: 'Midweek Resilience Circle',
    anonymousAlias: 'Blue Heron',
    moodBadge: 'STABLE',
    sharedNote: 'Took 5 minutes for box breathing before my afternoon presentation.',
    createdAt: new Date().toISOString(),
  },
];

export const usePeerCircleStore = create<PeerCircleState>((set, get) => ({
  checkIns: [],
  isHydrated: false,

  hydrate: () => {
    if (get().isHydrated) return;
    const stored = getStorage<PeerCheckIn[]>(PEER_CHECKINS_KEY) ?? DEFAULT_CHECKINS;
    if (!getStorage<PeerCheckIn[]>(PEER_CHECKINS_KEY)) {
      setStorage(PEER_CHECKINS_KEY, DEFAULT_CHECKINS);
    }
    set({ checkIns: stored, isHydrated: true });
  },

  addCheckIn: (data) => {
    const newCheckIn: PeerCheckIn = {
      id: `pc_${Date.now().toString(36)}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
    const checkIns = [newCheckIn, ...get().checkIns];
    setStorage(PEER_CHECKINS_KEY, checkIns);
    set({ checkIns });
  },

  deleteCheckIn: (id) => {
    const checkIns = get().checkIns.filter((c) => c.id !== id);
    setStorage(PEER_CHECKINS_KEY, checkIns);
    set({ checkIns });
  },
}));
