/**
 * User profile, permissions and UI preferences.
 *
 * The on-device profile and UI preferences are the local source of truth;
 * a configured backend can synchronize account settings.
 */
import { create } from 'zustand';
import { api, type UserProfile } from '@/lib/api';
import { config } from '@/lib/config';
import { getStorage, removeStorage, setStorage } from '@/lib/storage';

export interface UiPreferences {
  theme: 'light' | 'dark' | 'midnight';
  textSize: 'regular' | 'large' | 'largest';
  reducedMotion: boolean;
  showSignals: boolean;
  sidebarCollapsed: boolean;
}

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  theme: 'dark',
  textSize: 'regular',
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
  resetProfile: () => Promise<void>;
  has: (permission: string) => boolean;
}

const PENDING_PROFILE_KEY = `${config.storage.profileKey}-pending`;

function localProfile(): UserProfile {
  return {
    id: 'local-device',
    name: 'You',
    email: '',
    preferences: { voiceInput: false, ttsEnabled: false, analyticsEnabled: false },
    permissions: ['chat', 'history'],
    createdAt: new Date().toISOString(),
  };
}

function mergeProfile(profile: UserProfile, updates: Partial<UserProfile>): UserProfile {
  return {
    ...profile,
    ...updates,
    preferences: { ...profile.preferences, ...(updates.preferences ?? {}) },
  };
}

function mergeUpdates(
  current: Partial<UserProfile>,
  updates: Partial<UserProfile>,
): Partial<UserProfile> {
  return {
    ...current,
    ...updates,
    preferences: { ...(current.preferences ?? {}), ...(updates.preferences ?? {}) },
  };
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
    const profile = getStorage<UserProfile>(config.storage.profileKey) ?? localProfile();
    setStorage(config.storage.profileKey, profile);
    set({ ui: readUi(), profile, isHydrated: true });
  },

  loadProfile: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });

    const response = await api.getProfile();
    if (!response.success || !response.data) {
      // The on-device profile and preferences remain usable without the service.
      const cached = getStorage<UserProfile>(config.storage.profileKey) ?? localProfile();
      setStorage(config.storage.profileKey, cached);
      set({
        profile: cached,
        isLoading: false,
        error: 'Profile is available on this device. Backend sync is unavailable.',
      });
      return;
    }

    const pending = getStorage<Partial<UserProfile>>(PENDING_PROFILE_KEY);
    const profile = mergeProfile(response.data, pending ?? {});
    setStorage(config.storage.profileKey, profile);
    set({ profile, isLoading: false, error: pending ? 'Saved profile changes are waiting to sync.' : null });

    if (pending) {
      const snapshot = JSON.stringify(pending);
      void api.updateProfile(pending).then((sync) => {
        const latest = getStorage<Partial<UserProfile>>(PENDING_PROFILE_KEY);
        if (!sync.success || !sync.data || JSON.stringify(latest) !== snapshot) return;
        removeStorage(PENDING_PROFILE_KEY);
        setStorage(config.storage.profileKey, sync.data);
        set({ profile: sync.data, error: null });
      });
    }
  },

  updateProfile: async (updates) => {
    const current = get().profile ?? getStorage<UserProfile>(config.storage.profileKey) ?? localProfile();
    const profile = mergeProfile(current, updates);
    const pending = mergeUpdates(getStorage<Partial<UserProfile>>(PENDING_PROFILE_KEY) ?? {}, updates);
    setStorage(config.storage.profileKey, profile);
    setStorage(PENDING_PROFILE_KEY, pending);
    set({ profile, isSaving: true, error: null });

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      set({ isSaving: false, error: 'Saved on this device. Backend sync will retry when you reconnect.' });
      return;
    }

    const response = await api.updateProfile(pending);
    const latest = getStorage<Partial<UserProfile>>(PENDING_PROFILE_KEY);
    if (!response.success || !response.data || JSON.stringify(latest) !== JSON.stringify(pending)) {
      set({ isSaving: false, error: 'Saved on this device. Backend sync will retry when available.' });
      return;
    }
    removeStorage(PENDING_PROFILE_KEY);
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

  resetProfile: async () => {
    const defaults = localProfile();
    const updates: Partial<UserProfile> = {
      name: defaults.name,
      email: defaults.email,
      preferences: defaults.preferences,
      permissions: defaults.permissions,
    };
    setStorage(config.storage.profileKey, defaults);
    setStorage(PENDING_PROFILE_KEY, updates);
    set({ profile: defaults, error: 'Profile reset on this device.' });
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const response = await api.updateProfile(updates);
      if (response.success && response.data) {
        removeStorage(PENDING_PROFILE_KEY);
        setStorage(config.storage.profileKey, response.data);
        set({ profile: response.data, error: null });
      }
    }
  },

  has: (permission) => get().profile?.permissions.includes(permission) ?? false,
}));
