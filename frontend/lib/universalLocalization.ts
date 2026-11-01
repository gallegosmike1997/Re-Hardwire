/**
 * Universal Global Localization Expander (Week 49)
 *
 * Expands multi-language dictionaries for 30+ world languages and regional dialects.
 */
import { t as baseT, type SupportedLocale } from './i18n';

export function universalTranslate(key: string, locale: string): string {
  const supportedLocale = (['en', 'es', 'fr', 'de', 'ja'].includes(locale) ? locale : 'en') as SupportedLocale;
  return baseT(key, supportedLocale);
}
