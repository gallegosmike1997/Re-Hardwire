/**
 * User profile, permissions and UI preferences.
 *
 * The on-device profile and UI preferences are the local source of truth;
 * a configured backend can synchronize account settings.
 */
import { create } from 'zustand';
import { api, type UserProfile } from '@/lib/api';
import { config } from '@/lib/config';
import { clearSession } from '@/lib/session';
import {
  getActiveProfileId,
  getGlobalStorage,
  getStorage,
  removeStorage,
  setActiveProfileId,
  setGlobalStorage,
  setStorage,
} from '@/lib/storage';

export interface DeviceProfile {
  id: string;
  name: string;
  createdAt: string;
}

export type ProfileSyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'conflict' | 'error';

export interface UiPreferences {
  theme: 'light' | 'dark' | 'midnight';
  environment: 'forest' | 'sky' | 'dusk' | 'studio';
  textSize: 'regular' | 'large' | 'largest';
  reducedMotion: boolean;
  quietMode: boolean;
  showSignals: boolean;
  sidebarCollapsed: boolean;
  stickyNotesEnabled: boolean;
  noteColor: 'yellow' | 'blue' | 'green' | 'pink' | 'orange';
  themeAccent: 'signal' | 'emerald' | 'sky' | 'purple' | 'orange';
  buttonGlow: 'soft' | 'medium' | 'strong';
  subjectId: string;
}

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  theme: 'dark',
  environment: 'forest',
  textSize: 'regular',
  reducedMotion: false,
  quietMode: false,
  showSignals: true,
  sidebarCollapsed: false,
  stickyNotesEnabled: false,
  noteColor: 'yellow',
  themeAccent: 'signal',
  buttonGlow: 'soft',
  subjectId: 'default',
};

export interface ProfileState {
  profile: UserProfile | null;
  ui: UiPreferences;
  profiles: DeviceProfile[];
  activeProfileId: string;
  isLoading: boolean;
  isSaving: boolean;
  isHydrated: boolean;
  error: string | null;
  syncStatus: ProfileSyncStatus;
  syncConflicts: string[];

  hydrate: () => void;
  loadProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  syncProfile: () => Promise<void>;
  createProfile: (name: string) => string | null;
  switchProfile: (profileId: string) => void;
  updateUi: (updates: Partial<UiPreferences>) => void;
  togglePermission: (permission: string) => Promise<void>;
  resetProfile: () => Promise<void>;
  has: (permission: string) => boolean;
}

const PENDING_PROFILE_KEY = `${config.storage.profileKey}-pending`;
const PROFILE_SYNC_BASE_KEY = `${config.storage.profileKey}-sync-base`;
const DEVICE_PROFILES_KEY = 're-hardwire-device-profiles';

function localProfile(profileId = getActiveProfileId()): UserProfile {
  return {
    id: `local-${profileId}`,
    name: 'You',
    email: '',
    preferences: { voiceInput: true, ttsEnabled: true, analyticsEnabled: false },
    permissions: ['chat', 'tts', 'voice_input', 'history'],
    createdAt: new Date().toISOString(),
  };
}

function readProfiles(): DeviceProfile[] {
  const saved = getGlobalStorage<DeviceProfile[]>(DEVICE_PROFILES_KEY);
  const profiles = Array.isArray(saved) ? saved.filter((item) => item?.id && item?.name) : [];
  if (!profiles.some((item) => item.id === 'default')) {
    profiles.unshift({ id: 'default', name: 'This device', createdAt: new Date().toISOString() });
  }
  setGlobalStorage(DEVICE_PROFILES_KEY, profiles);
  return profiles;
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

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeThreeWay(
  base: unknown,
  local: unknown,
  remote: unknown,
  path: string,
  conflicts: string[],
): unknown {
  if (sameValue(local, base)) return remote;
  if (sameValue(remote, base) || sameValue(local, remote)) return local;
  if (isRecord(base) && isRecord(local) && isRecord(remote)) {
    const merged: Record<string, unknown> = {};
    const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]);
    for (const key of Array.from(keys)) {
      const value = mergeThreeWay(base[key], local[key], remote[key], path ? `${path}.${key}` : key, conflicts);
      if (value !== undefined) merged[key] = value;
    }
    return merged;
  }
  if (path) conflicts.push(path);
  return local;
}

function profileUpdatesComparedTo(remote: UserProfile, merged: UserProfile): Partial<UserProfile> {
  const updates: Partial<UserProfile> = {};
  if (!sameValue(remote.name, merged.name)) updates.name = merged.name;
  if (!sameValue(remote.email, merged.email)) updates.email = merged.email;
  if (!sameValue(remote.preferences, merged.preferences)) updates.preferences = merged.preferences;
  if (!sameValue(remote.permissions, merged.permissions)) updates.permissions = merged.permissions;
  return updates;
}

function readUi(): UiPreferences {
  const stored = getStorage<Partial<UiPreferences>>(config.storage.uiPrefsKey);
  return { ...DEFAULT_UI_PREFERENCES, ...(stored ?? {}) };
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  ui: DEFAULT_UI_PREFERENCES,
  profiles: [],
  activeProfileId: 'default',
  isLoading: false,
  isSaving: false,
  isHydrated: false,
  error: null,
  syncStatus: 'idle',
  syncConflicts: [],

  hydrate: () => {
    if (get().isHydrated) return;
    const profiles = readProfiles();
    let activeProfileId = getActiveProfileId();
    if (!profiles.some((item) => item.id === activeProfileId)) {
      activeProfileId = 'default';
      setActiveProfileId(activeProfileId);
    }
    const profile = getStorage<UserProfile>(config.storage.profileKey) ?? localProfile(activeProfileId);
    setStorage(config.storage.profileKey, profile);
    set({
      profiles,
      activeProfileId,
      ui: { ...readUi(), subjectId: activeProfileId },
      profile,
      isHydrated: true,
    });
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
    const syncBase = getStorage<UserProfile>(PROFILE_SYNC_BASE_KEY);
    const profile = pending ? mergeProfile(response.data, pending) : response.data;
    if (!syncBase && !pending) setStorage(PROFILE_SYNC_BASE_KEY, response.data);
    setStorage(config.storage.profileKey, profile);
    set({ profile, isLoading: false, error: null, syncStatus: pending ? 'idle' : 'synced' });
    if (pending) void get().syncProfile();
  },

  updateProfile: async (updates) => {
    const current = get().profile ?? getStorage<UserProfile>(config.storage.profileKey) ?? localProfile();
    const profile = mergeProfile(current, updates);
    const pending = mergeUpdates(getStorage<Partial<UserProfile>>(PENDING_PROFILE_KEY) ?? {}, updates);
    setStorage(config.storage.profileKey, profile);
    setStorage(PENDING_PROFILE_KEY, pending);
    set({ profile, error: null, syncStatus: 'idle' });
    await get().syncProfile();
  },

  syncProfile: async () => {
    if (get().syncStatus === 'syncing') return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      set({ syncStatus: 'offline', error: 'Saved on this device. Sync will retry when you reconnect.' });
      return;
    }
    set({ isSaving: true, syncStatus: 'syncing', error: null, syncConflicts: [] });

    const remoteResponse = await api.getProfile();
    if (!remoteResponse.success || !remoteResponse.data) {
      set({
        isSaving: false,
        syncStatus: 'error',
        error: 'Saved on this device. Backend sync is unavailable.',
      });
      return;
    }

    const remote = remoteResponse.data;
    const local = getStorage<UserProfile>(config.storage.profileKey) ?? get().profile ?? localProfile();
    const base = getStorage<UserProfile>(PROFILE_SYNC_BASE_KEY);
    const pending = getStorage<Partial<UserProfile>>(PENDING_PROFILE_KEY) ?? {};
    const conflicts: string[] = [];
    const merged = base
      ? mergeThreeWay(base, local, remote, '', conflicts) as UserProfile
      : mergeProfile(remote, pending);
    const updates = profileUpdatesComparedTo(remote, merged);

    if (!Object.keys(updates).length) {
      removeStorage(PENDING_PROFILE_KEY);
      setStorage(config.storage.profileKey, remote);
      setStorage(PROFILE_SYNC_BASE_KEY, remote);
      set({ profile: remote, isSaving: false, syncStatus: conflicts.length ? 'conflict' : 'synced', syncConflicts: conflicts });
      return;
    }

    const updateResponse = await api.updateProfile(updates);
    if (!updateResponse.success || !updateResponse.data) {
      setStorage(config.storage.profileKey, merged);
      setStorage(PENDING_PROFILE_KEY, updates);
      set({
        profile: merged,
        isSaving: false,
        syncStatus: 'error',
        syncConflicts: conflicts,
        error: 'Changes are saved on this device and will sync when the backend is available.',
      });
      return;
    }

    removeStorage(PENDING_PROFILE_KEY);
    setStorage(config.storage.profileKey, updateResponse.data);
    setStorage(PROFILE_SYNC_BASE_KEY, updateResponse.data);
    set({
      profile: updateResponse.data,
      isSaving: false,
      syncStatus: conflicts.length ? 'conflict' : 'synced',
      syncConflicts: conflicts,
      error: conflicts.length ? `Resolved sync conflicts using this device's values: ${conflicts.join(', ')}.` : null,
    });
  },

  createProfile: (name) => {
    const label = name.trim().slice(0, 60);
    if (!label) return null;
    const id = `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const profiles = [...readProfiles(), { id, name: label, createdAt: new Date().toISOString() }];
    setGlobalStorage(DEVICE_PROFILES_KEY, profiles);
    setActiveProfileId(id);
    setStorage(config.storage.profileKey, { ...localProfile(id), name: label });
    setStorage(config.storage.uiPrefsKey, { ...DEFAULT_UI_PREFERENCES, subjectId: id });
    clearSession();
    set({ profiles, activeProfileId: id });
    if (typeof window !== 'undefined') window.location.reload();
    return id;
  },

  switchProfile: (profileId) => {
    if (!readProfiles().some((item) => item.id === profileId) || profileId === getActiveProfileId()) return;
    if (get().isSaving) return;
    setActiveProfileId(profileId);
    set({ activeProfileId: profileId });
    if (typeof window !== 'undefined') window.location.reload();
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
    await get().syncProfile();
  },

  has: (permission) => get().profile?.permissions.includes(permission) ?? false,
}));
