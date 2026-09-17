/**
 * User profile, permissions and UI preferences.
 *
 * The profile is the backend's source of truth; the UI preferences
 * (sidebar collapse, motion) live only in local storage.
 */
import { create } from 'zustand';
import { api, type UserProfile } from '@/lib/api';
import { config } from '@/lib/config';
import { getStorage, setStorage } from '@/lib/storage';

export interface UiPreferences {
  theme: 'dark' | 'midnight';
  reducedMotion: boolean;
  showSignals: boolean;
  sidebarCollapsed: boolean;
}

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  theme: 'dark',
  reducedMotion: false,
  showSignals: true,
  sidebarCollapsed: false,
};

export interface ProfileState {
  profile: UserProfile | null;
  ui: UiPreferences;
  isLoading: boolean;
  isSaving: boolean;
  isHydrated: boolean;
  error: string | null;

  hydrate: () => void;
  loadProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateUi: (updates: Partial<UiPreferences>) => void;
  togglePermission: (permission: string) => Promise<void>;
  has: (permission: string) => boolean;
}

function readUi(): UiPreferences {
  const stored = getStorage<Partial<UiPreferences>>(config.storage.uiPrefsKey);
  return { ...DEFAULT_UI_PREFERENCES, ...(stored ?? {}) };
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  ui: DEFAULT_UI_PREFERENCES,
  isLoading: false,
  isSaving: false,
  isHydrated: false,
  error: null,

  hydrate: () => {
    if (get().isHydrated) return;
    set({ ui: readUi(), isHydrated: true });
  },

  loadProfile: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });

    const response = await api.getProfile();
    if (!response.success || !response.data) {
      // Fall back to the cached copy so the app still renders offline.
      const cached = getStorage<UserProfile>(config.storage.profileKey);
      set({
        profile: cached,
        isLoading: false,
        error: response.error ?? 'Could not load profile.',
      });
      return;
    }

    setStorage(config.storage.profileKey, response.data);
    set({ profile: response.data, isLoading: false, error: null });
  },

  updateProfile: async (updates) => {
    const current = get().profile;
    // Optimistic merge so the form never flickers back to the old value.
    if (current) set({ profile: { ...current, ...updates } });

    set({ isSaving: true, error: null });
    const response = await api.updateProfile(updates);

    if (!response.success || !response.data) {
      set({ profile: current, isSaving: false, error: response.error ?? 'Save failed.' });
      return;
    }
    setStorage(config.storage.profileKey, response.data);
    set({ profile: response.data, isSaving: false, error: null });
  },

  updateUi: (updates) => {
    const ui = { ...get().ui, ...updates };
    setStorage(config.storage.uiPrefsKey, ui);
    set({ ui });
  },

  togglePermission: async (permission) => {
    const granted = get().profile?.permissions.includes(permission) ?? false;
    const current = get().profile?.permissions ?? [];
    const permissions = granted
      ? current.filter((item) => item !== permission)
      : [...current, permission];
    await get().updateProfile({ permissions });
  },

  has: (permission) => get().profile?.permissions.includes(permission) ?? false,
}));