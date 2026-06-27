/**
 * Browser/system locale detection utilities
 */

// Declare browser globals for environments where they may not exist
declare const navigator: { languages?: readonly string[]; language?: string } | undefined;
declare const window: { location: { search: string } } | undefined;
declare const localStorage:
  | { getItem(key: string): string | null; setItem(key: string, value: string): void }
  | undefined;
declare const document: { cookie: string } | undefined;

/**
 * Locale information
 */
export interface LocaleInfo {
  /** Full locale string (e.g., 'en-US') */
  locale: string;
  /** Language code (e.g., 'en') */
  language: string;
  /** Region/country code (e.g., 'US') */
  region?: string;
  /** Script code (e.g., 'Latn') */
  script?: string;
}

/**
 * Locale detection options
 */
export interface LocaleDetectionOptions {
  /** Supported locales to match against */
  supportedLocales?: string[];
  /** Fallback locale if no match is found */
  fallbackLocale?: string;
  /** Whether to check URL parameters */
  checkUrlParam?: boolean;
  /** URL parameter name for locale */
  urlParamName?: string;
  /** Whether to check localStorage */
  checkLocalStorage?: boolean;
  /** localStorage key for locale */
  localStorageKey?: string;
  /** Whether to check cookies */
  checkCookie?: boolean;
  /** Cookie name for locale */
  cookieName?: string;
}

/**
 * Default detection options
 */
const defaultOptions: Required<LocaleDetectionOptions> = {
  supportedLocales: [],
  fallbackLocale: 'en',
  checkUrlParam: true,
  urlParamName: 'lang',
  checkLocalStorage: true,
  localStorageKey: 'locale',
  checkCookie: true,
  cookieName: 'locale',
};

/**
 * Parses a locale string into its components
 * @param locale - The locale string to parse
 * @returns Parsed locale information
 */
export function parseLocale(locale: string): LocaleInfo {
  // Handle formats like: en, en-US, en-Latn-US, zh-Hans-CN
  const parts = locale.replace(/_/g, '-').split('-');
  const language = parts[0] ?? '';
  const part1 = parts[1];
  const part2 = parts[2];

  const result: LocaleInfo = {
    locale: locale,
    language: language.toLowerCase(),
  };

  if (parts.length === 2 && part1) {
    // Could be en-US or zh-Hans
    if (part1.length === 2) {
      result.region = part1.toUpperCase();
    } else if (part1.length === 4) {
      result.script = part1.charAt(0).toUpperCase() + part1.slice(1).toLowerCase();
    }
  } else if (parts.length >= 3 && part1 && part2) {
    // Format like en-Latn-US
    result.script = part1.charAt(0).toUpperCase() + part1.slice(1).toLowerCase();
    result.region = part2.toUpperCase();
  }

  return result;
}

/**
 * Normalizes a locale string to a standard format
 * @param locale - The locale string to normalize
 * @returns Normalized locale string (e.g., 'en-US')
 */
export function normalizeLocale(locale: string): string {
  const parsed = parseLocale(locale);
  let normalized = parsed.language;

  if (parsed.script) {
    normalized += `-${parsed.script}`;
  }

  if (parsed.region) {
    normalized += `-${parsed.region}`;
  }

  return normalized;
}

/**
 * Gets the browser's preferred languages
 * @returns Array of preferred language codes
 */
export function getBrowserLanguages(): string[] {
  if (typeof navigator === 'undefined') {
    return [];
  }

  // navigator.languages is preferred, falls back to navigator.language
  if (navigator.languages && navigator.languages.length > 0) {
    return [...navigator.languages];
  }

  if (navigator.language) {
    return [navigator.language];
  }

  return [];
}

/**
 * Gets the primary browser language
 * @returns The primary language code or undefined
 */
export function getBrowserLanguage(): string | undefined {
  const languages = getBrowserLanguages();
  return languages[0];
}

/**
 * Gets a locale from URL query parameters
 * @param paramName - The parameter name to look for
 * @returns The locale from URL or undefined
 */
export function getLocaleFromUrl(paramName = 'lang'): string | undefined {
  if (typeof window === 'undefined' || typeof URLSearchParams === 'undefined') {
    return undefined;
  }

  const params = new URLSearchParams(window.location.search);
  const locale = params.get(paramName);
  return locale || undefined;
}

/**
 * Gets a locale from localStorage
 * @param key - The storage key
 * @returns The stored locale or undefined
 */
export function getLocaleFromLocalStorage(key = 'locale'): string | undefined {
  if (typeof localStorage === 'undefined') {
    return undefined;
  }

  try {
    const locale = localStorage.getItem(key);
    return locale || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Saves a locale to localStorage
 * @param locale - The locale to save
 * @param key - The storage key
 */
export function saveLocaleToLocalStorage(locale: string, key = 'locale'): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(key, locale);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Gets a locale from cookies
 * @param name - The cookie name
 * @returns The locale from cookie or undefined
 */
export function getLocaleFromCookie(name = 'locale'): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name && cookieValue) {
      return decodeURIComponent(cookieValue);
    }
  }

  return undefined;
}

/**
 * Saves a locale to a cookie
 * @param locale - The locale to save
 * @param name - The cookie name
 * @param days - Number of days until expiration (default: 365)
 */
export function saveLocaleToCookie(locale: string, name = 'locale', days = 365): void {
  if (typeof document === 'undefined') {
    return;
  }

  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${encodeURIComponent(locale)};${expires};path=/;SameSite=Lax`;
}

/**
 * Finds the best matching locale from a list of supported locales
 * @param requestedLocale - The requested locale
 * @param supportedLocales - List of supported locales
 * @param fallback - Fallback locale if no match
 * @returns The best matching locale
 */
export function findBestMatch(
  requestedLocale: string,
  supportedLocales: string[],
  fallback = 'en'
): string {
  if (supportedLocales.length === 0) {
    return requestedLocale;
  }

  const requested = parseLocale(requestedLocale);

  // Exact match
  const exactMatch = supportedLocales.find(
    (l) => normalizeLocale(l).toLowerCase() === normalizeLocale(requestedLocale).toLowerCase()
  );
  if (exactMatch) {
    return exactMatch;
  }

  // Language + region match (ignoring script)
  if (requested.region) {
    const regionMatch = supportedLocales.find((l) => {
      const supported = parseLocale(l);
      return supported.language === requested.language && supported.region === requested.region;
    });
    if (regionMatch) {
      return regionMatch;
    }
  }

  // Language only match
  const languageMatch = supportedLocales.find((l) => {
    const supported = parseLocale(l);
    return supported.language === requested.language;
  });
  if (languageMatch) {
    return languageMatch;
  }

  // Return fallback
  const fallbackMatch = supportedLocales.find(
    (l) => parseLocale(l).language === parseLocale(fallback).language
  );
  return fallbackMatch || supportedLocales[0] || fallback;
}

/**
 * Detects the user's preferred locale using multiple strategies
 * @param options - Detection options
 * @returns The detected locale
 */
export function detectLocale(options: LocaleDetectionOptions = {}): string {
  const opts = { ...defaultOptions, ...options };

  // 1. Check URL parameter
  if (opts.checkUrlParam) {
    const urlLocale = getLocaleFromUrl(opts.urlParamName);
    if (urlLocale) {
      return findBestMatch(urlLocale, opts.supportedLocales, opts.fallbackLocale);
    }
  }

  // 2. Check localStorage
  if (opts.checkLocalStorage) {
    const storedLocale = getLocaleFromLocalStorage(opts.localStorageKey);
    if (storedLocale) {
      return findBestMatch(storedLocale, opts.supportedLocales, opts.fallbackLocale);
    }
  }

  // 3. Check cookie
  if (opts.checkCookie) {
    const cookieLocale = getLocaleFromCookie(opts.cookieName);
    if (cookieLocale) {
      return findBestMatch(cookieLocale, opts.supportedLocales, opts.fallbackLocale);
    }
  }

  // 4. Check browser languages
  const browserLanguages = getBrowserLanguages();
  for (const lang of browserLanguages) {
    if (opts.supportedLocales.length === 0) {
      return lang;
    }
    const match = findBestMatch(lang, opts.supportedLocales, opts.fallbackLocale);
    if (
      match !== opts.fallbackLocale ||
      parseLocale(lang).language === parseLocale(match).language
    ) {
      return match;
    }
  }

  // 5. Return fallback
  return opts.fallbackLocale;
}

/**
 * Gets the system's time zone
 * @returns The IANA time zone string or undefined
 */
export function getSystemTimeZone(): string | undefined {
  if (typeof Intl === 'undefined') {
    return undefined;
  }

  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/**
 * Checks if a locale is supported by the browser
 * @param locale - The locale to check
 * @returns True if the locale is supported
 */
export function isLocaleSupported(locale: string): boolean {
  try {
    const supported = Intl.DateTimeFormat.supportedLocalesOf([locale]);
    return supported.length > 0;
  } catch {
    return false;
  }
}
