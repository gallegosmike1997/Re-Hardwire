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
  model: {
    presets: {
      'phi3:mini': { label: 'Phi-3 Mini', memoryMb: 2048, description: 'Low RAM: runs on 2GB+ devices' },
      'gemma-2b': { label: 'Gemma 2B', memoryMb: 4096, description: 'Balanced: good quality and speed' },
      'llama-3.2-1b': { label: 'Llama 3.2 1B', memoryMb: 1024, description: 'Fastest: minimal memory footprint' },
    },
    default: 'phi3:mini',
    current: '', // Set by backend on first load
  },
  i18n: {
    supportedLanguages: [
      'en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'pt-BR', 'it-IT', 'ko-KR',
      'zh-CN', 'ar-SA', 'ru-RU', 'nl-NL', 'vi-VN', 'th-TH', 'pl-PL', 'sw-KE',
      'ur-PK', 'hi-IN', 'tr-TR', 'fi-FI', 'cs-CZ', 'ro-RO', 'hu-HU', 'sk-SK',
      'sl-SI', 'et-EE', 'lv-LV', 'lt-LT', 'mt-MT', 'cy-GB', 'ga-IE', 'ga-GD',
    ],
    default: 'en-US',
    direction: 'ltr', // 'ltr' or 'rtl'
    uiLabels: {
      'en-US': {
        modelSelector: 'Local AI model',
        shareMemories: 'Share memories',
        exportMemories: 'Export memories',
        forgetMemory: 'Forget this memory',
      },
      'es-ES': {
        modelSelector: 'Modelo de IA local',
        shareMemories: 'Compartir memorias',
        exportMemories: 'Exportar memorias',
        forgetMemory: 'Olvidar esta memoria',
      },
      'fr-FR': {
        modelSelector: 'Modèle IA local',
        shareMemories: 'Partager les mémoires',
        exportMemories: 'Exporter les mémoires',
        forgetMemory: 'Oublier cette mémoire',
      },
      // Additional languages can be added following the same pattern
    },
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
