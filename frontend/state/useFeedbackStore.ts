import { create } from 'zustand';
import { getStorage, setStorage } from '@/lib/storage';

export type ReplyRating = 'helpful' | 'not_helpful';
export type ReplyFeedbackReason = 'too_long' | 'felt_off' | 'not_relevant' | 'other';

export interface ReplyFeedback {
  rating: ReplyRating;
  reason?: ReplyFeedbackReason;
  updatedAt: string;
}

interface FeedbackState {
  entries: Record<string, ReplyFeedback>;
  hydrate: () => void;
  rate: (key: string, rating: ReplyRating, reason?: ReplyFeedbackReason) => void;
}

const STORAGE_KEY = 're-hardwire-chat-feedback';
const MAX_FEEDBACK_ENTRIES = 500;
const FEEDBACK_REASONS: ReplyFeedbackReason[] = ['too_long', 'felt_off', 'not_relevant', 'other'];
let hydrated = false;

function readFeedback(): Record<string, ReplyFeedback> {
  const saved = getStorage<unknown>(STORAGE_KEY);
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
  const entries = Object.entries(saved).filter((entry): entry is [string, ReplyFeedback] => {
    const value = entry[1];
    return Boolean(value && typeof value === 'object'
      && ((value as ReplyFeedback).rating === 'helpful' || (value as ReplyFeedback).rating === 'not_helpful')
      && typeof (value as ReplyFeedback).updatedAt === 'string'
      && ((value as ReplyFeedback).reason === undefined
        || FEEDBACK_REASONS.includes((value as ReplyFeedback).reason as ReplyFeedbackReason)));
  });
  return Object.fromEntries(entries
    .sort((first, second) => second[1].updatedAt.localeCompare(first[1].updatedAt))
    .slice(0, MAX_FEEDBACK_ENTRIES));
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  entries: {},
  hydrate: () => {
    if (hydrated) return;
    hydrated = true;
    set({ entries: readFeedback() });
  },
  rate: (key, rating, reason) => {
    const updated = {
      ...get().entries,
      [key]: { rating, ...(reason ? { reason } : {}), updatedAt: new Date().toISOString() },
    };
    const entries = Object.fromEntries(Object.entries(updated)
      .sort((first, second) => second[1].updatedAt.localeCompare(first[1].updatedAt))
      .slice(0, MAX_FEEDBACK_ENTRIES));
    setStorage(STORAGE_KEY, entries);
    set({ entries });
  },
}));
