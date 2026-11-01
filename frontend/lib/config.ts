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
      // Year 3-4 extended models (enabled week-by-week)
      'phi3:mini-medium': { label: 'Phi-3 Mini Medium', memoryMb: 4096, description: 'Balanced: runs on 4GB+ devices, better quality than mini' },
      'gemma-3b': { label: 'Gemma 3B', memoryMb: 8192, description: 'High quality: 3B parameters for clinical accuracy' },
      'llama-3.2-3b': { label: 'Llama 3.2 3B', memoryMb: 12288, description: 'Clinical: 3B parameters optimized for mental health contexts' },
      're-hardwire-local-v2': { label: 'Re-Hardwire Local v2', memoryMb: 2048, description: 'Offline-first: custom model for fully offline operation' },
    },
    default: 'phi3:mini',
    current: '', // Set by backend on first load; overrides to enabled preset
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
    // Year 3-4 model swap features (enabled week-by-week)
    modelSelection: true,          // Week 53: Allow users to select LLM models (now integrated)
    modelProviderSwitching: true, // Week 54: Switch between local/OpenAI providers
    adaptiveContextIntegration: true, // Week 55: Integrate model choice with context-aware coaching
    clinicalModelPresets: true,   // Week 56: Enable 3B+ parameter models for clinical accuracy
    offlineModelFallback: true,   // Week 57: Ensure offline model works when backend unavailable
    entertainmentEnabled: false, // Week 58: Enable entertainment games & tools
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

/** Year 3-4 Roadmap Extensions **/
export const roadmapExtensions = {
  // Extended model presets for Years 3-4
  extendedModels: {
    'phi3:mini-medium': {
      label: 'Phi-3 Mini Medium',
      memoryMb: 4096,
      description: 'Balanced: runs on 4GB+ devices, better quality than mini'
    },
    'gemma-3b': {
      label: 'Gemma 3B',
      memoryMb: 8192,
      description: 'Higher quality: runs on 8GB+ devices'
    },
    'llama-3.2-3b': {
      label: 'Llama 3.2 3B',
      memoryMb: 12288,
      description: 'High quality: runs on 12GB+ devices, clinical validation ready'
    },
    're-hardwire-local-v2': {
      label: 'Re-Hardwire Local v2',
      memoryMb: 2048,
      description: 'Optimized for clinical protocol routing, offline-first'
    }
  } as const,

  // Feature flags for Year 3-4
  features: {
    // Year 3: Adaptive AI & Personalized Ecosystems
    adaptiveContextAwareCoaching: true,     // Week 53 - Adaptive Context-Aware Coaching: AI that adapts grounding suggestions based on user context (location, time of day, activity type detected via smartphone sensors)
    dynamicProtocolPrioritization: false,   // Week 54
    naturalLanguageProtocols: false,        // Week 55
    crossUserAnonymousLearning: false,      // Week 56
    moodTrackingProtocolAdjustment: false,  // Week 57

    // Year 3: Expanded Clinical Integration
    phqGad7Screening: false,                // Week 58
    therapistAssignedPathways: false,       // Week 59
    realTimeCrisisLinking: false,           // Week 60
    insuranceBillingIntegration: false,     // Week 61
    multilingualCrisisProtocols: false,     // Week 62
    rpmIntegration: false,                  // Week 63

    // Year 3: Decentralized Identity & Sovereign Data
    didIntegration: false,                  // Week 65
    verifiableCredentials: false,           // Week 66
    edgeComputeModelAggregation: false,     // Week 67
    offlineFirstFederatedLearning: false,   // Week 68
    patientGeneratedResearch: false,        // Week 69
    sdkIntegration: false,                  // Week 70
    fhirSmarterApis: false,                 // Week 71

    // Year 3: Version 5.0 Global Release
    v50Beta: false,                         // Week 72
    clinicalTrialDesign: false,             // Week 73
    validationPaper: false,                 // Week 74
    globalMultiLanguageLaunch: false,       // Week 75
    v50StableRelease: false,                // Week 76

    // Year 4: Continuous Improvement
    userFeedbackSynthesis: false,           // Week 77
    accessibilityEnhancement: false,        // Week 78
    performanceOptimization: false,         // Week 79
    securityHardening: false,               // Week 80

    // Year 4: Version 5.1
    v51FeatureSuite: false,                 // Week 81
    crossPlatformParity: false,             // Week 82
    clinicalValidationPhase2: false,        // Week 83
    v51StableRelease: false,                // Week 84

    // Year 4: Ecosystem Expansion
    wellnessPlatformsIntegration: false,    // Week 85
    corporateWellnessIntegration: false,    // Week 86
    academicResearchPartnerships: false,    // Week 87
    developerConference: false,             // Week 88

    // Year 4: Version 5.2
    v52Planning: false,                     // Week 89
    deferredEnhancements: false,            // Week 90
    technologyTrendScouting: false,         // Week 91
    v52StableRelease: false                 // Week 92
  } as const
};

export type Config = typeof config;
