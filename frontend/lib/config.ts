/**
 * Re-Hardwire Frontend Configuration
 */
export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
    endpoints: {
      health: '/health',
      route: '/api/route',
      llm: '/api/llm',
      tts: '/api/tts',
      history: '/api/history',
      profile: '/api/profile',
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
  },
} as const;

export type Config = typeof config;
