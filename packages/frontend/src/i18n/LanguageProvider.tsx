import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  isSupported,
} from './i18n';

/**
 * LanguageProvider — single source of truth for the active locale.
 *
 * Detection order on first load:
 *   1. URL prefix (/fr/* or /en/*) — wins because it's what crawlers see
 *   2. Cookie `kx-lang` (set by LanguageSwitcher)
 *   3. navigator.language
 *   4. DEFAULT_LANGUAGE (fr)
 *
 * Re-synchronisation on every navigation: if the URL says /en/* but
 * i18next thinks `fr`, we flip i18next. Conversely, calling
 * `setLanguage('en')` rewrites the URL prefix + the cookie so the
 * three sources stay aligned.
 */

const COOKIE_NAME = 'kx-lang';
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365; // 1 year

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  /** Strip the `/<lang>` prefix from a path. Useful in LocalizedLink. */
  stripPrefix: (path: string) => string;
  /** Add the active language prefix to a path. */
  withPrefix: (path: string, lang?: SupportedLanguage) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

function detectFromUrl(pathname: string): SupportedLanguage | null {
  const seg = pathname.split('/').filter(Boolean)[0];
  if (seg && isSupported(seg)) {return seg;}
  return null;
}

function detectFromCookie(): SupportedLanguage | null {
  if (typeof document === 'undefined') {return null;}
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match?.[1]) {return null;}
  const value = decodeURIComponent(match[1]);
  return isSupported(value) ? value : null;
}

function detectFromNavigator(): SupportedLanguage | null {
  if (typeof navigator === 'undefined') {return null;}
  // navigator.language returns "fr-FR", "en-US"… — keep only the prefix.
  const lang = (navigator.language || '').split('-')[0] ?? '';
  return isSupported(lang) ? lang : null;
}

function detectInitialLanguage(pathname: string): SupportedLanguage {
  return (
    detectFromUrl(pathname) ??
    detectFromCookie() ??
    detectFromNavigator() ??
    DEFAULT_LANGUAGE
  );
}

function writeCookie(lang: SupportedLanguage): void {
  if (typeof document === 'undefined') {return;}
  // SameSite=Lax + Secure when on HTTPS — Path=/ so it works across the SPA.
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  document.cookie = [
    `${COOKIE_NAME}=${lang}`,
    `Path=/`,
    `Max-Age=${COOKIE_MAX_AGE_S}`,
    'SameSite=Lax',
    secure ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

function withPrefixFn(path: string, lang: SupportedLanguage): string {
  // Idempotent: don't double-prefix.
  const stripped = stripPrefixFn(path);
  return `/${lang}${stripped.startsWith('/') ? stripped : `/${  stripped}`}`;
}

function stripPrefixFn(path: string): string {
  const m = path.match(/^\/(fr|en)(\/.*|$)/);
  if (!m) {return path;}
  return m[2] || '/';
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function LanguageProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const { i18n: i18nHook } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  // Effect 1 — when the URL changes, mirror its locale into i18next.
  useEffect(() => {
    const detected = detectInitialLanguage(location.pathname);
    if (i18nHook.language !== detected) {
      void i18nHook.changeLanguage(detected);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = detected;
    }
  }, [location.pathname, i18nHook]);

  const setLanguage = useMemo(
    () => (next: SupportedLanguage): void => {
      writeCookie(next);
      // Rewrite the URL so the source of truth (URL) reflects the choice.
      // Note: even FR gets a /fr prefix for consistency + hreflang.
      const stripped = stripPrefixFn(location.pathname);
      const target = `/${next}${stripped}`;
      navigate(target + location.search + location.hash);
      void i18nHook.changeLanguage(next);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = next;
      }
    },
    [location.pathname, location.search, location.hash, navigate, i18nHook],
  );

  const value = useMemo<LanguageContextValue>(() => ({
    language: (isSupported(i18nHook.language) ? i18nHook.language : DEFAULT_LANGUAGE) as SupportedLanguage,
    setLanguage,
    stripPrefix: stripPrefixFn,
    withPrefix: (path, lang) =>
      withPrefixFn(path, lang ?? ((isSupported(i18nHook.language) ? i18nHook.language : DEFAULT_LANGUAGE) as SupportedLanguage)),
  }), [i18nHook.language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Provider not mounted — return a no-op fallback so unit tests don't crash.
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => undefined,
      stripPrefix: stripPrefixFn,
      withPrefix: (p) => withPrefixFn(p, DEFAULT_LANGUAGE),
    };
  }
  return ctx;
}

export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE };
export type { SupportedLanguage };
