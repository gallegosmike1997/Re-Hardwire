/**
 * Multi-Language Localization Dictionaries (Week 12)
 *
 * Provides translations for English, Spanish, French, German, and Japanese
 * across core navigation and guided practice prompts.
 */

export type SupportedLocale = 'en' | 'es' | 'fr' | 'de' | 'ja';

const TRANSLATIONS: Record<SupportedLocale, Record<string, string>> = {
  en: {
    home: 'Home',
    now: 'Right now',
    tools: 'Guided tools',
    supportPlan: 'My support plan',
    chat: 'Chat',
    protocol: 'Protocol',
    success: 'Success',
    settings: 'Settings',
  },
  es: {
    home: 'Inicio',
    now: 'Ahora mismo',
    tools: 'Herramientas',
    supportPlan: 'Mi plan de apoyo',
    chat: 'Chat',
    protocol: 'Protocolo',
    success: 'Éxito',
    settings: 'Ajustes',
  },
  fr: {
    home: 'Accueil',
    now: 'Maintenant',
    tools: 'Outils',
    supportPlan: 'Mon plan de soutien',
    chat: 'Discussion',
    protocol: 'Protocole',
    success: 'Succès',
    settings: 'Paramètres',
  },
  de: {
    home: 'Startseite',
    now: 'Gerade jetzt',
    tools: 'Werkzeuge',
    supportPlan: 'Mein Unterstützungsplan',
    chat: 'Chat',
    protocol: 'Protokoll',
    success: 'Erfolg',
    settings: 'Einstellungen',
  },
  ja: {
    home: 'ホーム',
    now: '今すぐ',
    tools: 'ガイド付きツール',
    supportPlan: 'サポートプラン',
    chat: 'チャット',
    protocol: 'プロトコル',
    success: '達成',
    settings: '設定',
  },
};

export function t(key: string, locale: SupportedLocale = 'en'): string {
  return TRANSLATIONS[locale]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}
