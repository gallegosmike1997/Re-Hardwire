/**
 * Backend connectivity and engine status.
 *
 * `check` polls `/health`; `loadStats` pulls the aggregated routing counters
 * used by the Dev and Lab dashboards.
 */
import { create } from 'zustand';
import { api, type HealthResponse } from '@/lib/api';
import { config } from '@/lib/config';

export interface RouteStats {
  startedAt: string;
  events: number;
  byName: Record<string, number>;
  protocols: Record<string, number>;
  emotionalStates: Record<string, number>;
  avgConfidence: number;
}

export type ConnectionStatus = 'unknown' | 'checking' | 'online' | 'offline';

export interface SystemState {
  status: ConnectionStatus;
  health: HealthResponse | null;
  stats: RouteStats | null;
  lastChecked: number | null;
  error: string | null;

  check: () => Promise<void>;
  loadStats: () => Promise<void>;
  reset: () => void;
}

export const useSystemStore = create<SystemState>((set, get) => ({
  status: 'unknown',
  health: null,
  stats: null,
  lastChecked: null,
  error: null,

  check: async () => {
    if (get().status === 'checking') return;
    set({ status: 'checking', error: null });

    const response = await api.checkHealth();
    if (!response.success || !response.data) {
      set({
        status: 'offline',
        health: null,
        error: response.error ?? 'Backend unreachable',
        lastChecked: Date.now(),
      });
      return;
    }
    set({
      status: 'online',
      health: response.data,
      error: null,
      lastChecked: Date.now(),
    });
  },

  loadStats: async () => {
    const response = await api.get<RouteStats>('/api/route/stats');
    if (!response.success || !response.data) {
      set({ error: response.error ?? 'Could not load stats.' });
      return;
    }
    set({ stats: response.data, error: null });
  },

  reset: () => set({ status: 'unknown', health: null, stats: null, error: null }),
}));

/** Convenience selector for the sidebar status dot. */
export const isOnline = (state: SystemState): boolean => state.status === 'online';

/** The configured engine label, falling back to the local config value. */
export const engineLabel = (state: SystemState): string =>
  state.health?.engine ?? config.app.engine;