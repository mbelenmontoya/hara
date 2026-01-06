// Translation system for Hará Match
// Currently Spanish-only, designed for easy multi-language expansion

import { ES_TRANSLATIONS, type Translations } from './es'

/**
 * Get translations for the current language
 * Currently returns Spanish translations only
 * Future: Can be extended to support multiple languages based on locale
 * @returns Translations object with all UI strings
 */
export function useTranslations(): Translations {
  // Simple for now - always return Spanish
  // Future enhancement: accept locale parameter or detect from context
  return ES_TRANSLATIONS
}

// Re-export types for convenience
export type { Translations } from './es'
