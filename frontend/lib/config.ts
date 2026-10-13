/**
 * Re-Hardwire Frontend Configuration
 */
import { Capacitor } from '@capacitor/core';

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL?.trim()) {
    return process.env.NEXT_PUBLIC_API_BASE_URL.trim();
  }
  if (typeof window !== 'undefined') {
    try {
      const platform = Capacitor.getPlatform();
      if (platform === 'android') return 'http://localhost:8000';
      if (platform === 'ios') return 'http://localhost:8000';
    } catch {
      // ignore
    }
  }
  return 'http://localhost:8000';
}

export const config = {
  api: {
    baseUrl: getBaseUrl(),
    endpoints: {
      health: '/health',
      session: '/api/session',
      route: '/api/route',
      llm: '/api/llm',
      tts: '/api/tts',
      history: '/api/history',
      profile: '/api/profile',
      capabilities: '/api/v1/capabilities',
    },
    timeout: 10000,
  },
  app: {
    name: 'Re-Hardwire',
    version: '1.0.0',
    engine: 'Re-Hardwire Core v1',
  },
  features: {
    ttsEnabled: true,
    voiceInput: true,
    analytics: true,
  },
  storage: {
    conversationKey: 're-hardwire-conversations',
    profileKey: 're-hardwire-profile',
    protocolKey: 're-hardwire-protocol',
    uiPrefsKey: 're-hardwire-ui-prefs',
    winsKey: 're-hardwire-wins',
    supportPlanKey: 're-hardwire-support-plan',
    practiceKey: 're-hardwire-practice-feedback',
  },
} as const;

export type Config = typeof config;
