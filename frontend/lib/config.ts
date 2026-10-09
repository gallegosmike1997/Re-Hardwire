/**
 * Re-Hardwire Frontend Configuration
 */
export const config = {
  api: {
    // Local development may use its companion API. Production and Capacitor
    // builds stay offline-first unless an API endpoint is explicitly set.
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
      || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : ''),
    endpoints: {
      health: '/health',
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
