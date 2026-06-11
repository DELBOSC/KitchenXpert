/**
 * i18next bootstrap — KitchenXpert.
 *
 * Chosen library : react-i18next (A). Already in use (180+ call sites);
 * migrating to Lingui or FormatJS would mean rewriting every call.
 * Lingui's typesafety would be nice but isn't worth the migration cost
 * at this stage.
 *
 * Detection order :
 *   1. URL prefix (`/fr/...` or `/en/...`) — owns the SEO truth
 *   2. Cookie `kx-lang` (persisted for 1 year by `LanguageProvider`)
 *   3. `navigator.language` (Accept-Language proxy on the browser side)
 *   4. Hard fallback : `fr`
 *
 * The detection lives in `LanguageProvider.tsx`, not here, because
 * react-router's URL is the source of truth and it needs to call
 * `i18n.changeLanguage()` on route change.
 *
 * Namespaces are NOT split into separate files yet — the existing
 * `translation` namespace works fine at 913 lines per locale. Once a
 * locale exceeds ~2000 lines, split by domain (auth, designer, etc.)
 * via the namespace registry below.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './translations/en.json';
import fr from './translations/fr.json';

export const SUPPORTED_LANGUAGES = ['fr', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'fr';

/**
 * Future namespaces. When you split the JSON, list them here and the
 * detector will load them all on first hit. For now we keep the
 * single `translation` namespace (existing 913-line files).
 */
export const NAMESPACES = ['translation'] as const;

export function isSupported(lang: string): lang is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}

void i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  // `lng` is set by LanguageProvider on mount — this default is only
  // visible for the ~5 ms before the first effect runs.
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: [...SUPPORTED_LANGUAGES],
  // Don't auto-load files we haven't shipped (DE/ES/AR exist on disk
  // but aren't imported here — `cleanCode` prevents the dev console
  // from being flooded with 'lang not configured' warnings).
  cleanCode: true,
  load: 'languageOnly',
  interpolation: { escapeValue: false },
  react: { useSuspense: false }, // SuspenseProvider already wraps us
});

export default i18n;
