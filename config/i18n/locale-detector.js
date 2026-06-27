/**
 * Locale Detector for KitchenXpert
 *
 * Purpose:
 * - Smart locale detection from multiple sources
 * - Browser language detection
 * - IP-based geo-location
 * - User preference persistence
 * - Domain-based locale detection
 *
 * Detection Priority:
 * 1. User explicit preference (localStorage/cookie)
 * 2. URL parameter (?lng=fr-FR)
 * 3. Subdomain (.fr → fr-FR)
 * 4. GeoIP location
 * 5. Browser Accept-Language header
 * 6. Default locale (fr-FR)
 *
 * Usage:
 * - Detect locale: const locale = await detectLocale();
 * - Save preference: saveLocalePreference('fr-FR');
 */

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './i18n-config';

// ============================================================
// Storage Keys
// ============================================================

const STORAGE_KEY = 'kitchenxpert_locale';
const COOKIE_NAME = 'kx_locale';

// ============================================================
// Domain to Locale Mapping
// ============================================================

const DOMAIN_LOCALE_MAP = {
  '.fr': 'fr-FR',
  '.de': 'de-DE',
  '.es': 'es-ES',
  '.it': 'it-IT',
  '.com': 'en-US',
};

// ============================================================
// Detection Functions
// ============================================================

/**
 * Get locale from localStorage
 */
export const getStoredLocale = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    return null;
  }
};

/**
 * Get locale from cookie
 */
export const getCookieLocale = () => {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === COOKIE_NAME) {
      return value;
    }
  }
  return null;
};

/**
 * Get locale from URL parameter
 */
export const getUrlLocale = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('lng') || params.get('locale');
};

/**
 * Get locale from domain
 */
export const getDomainLocale = () => {
  const hostname = window.location.hostname;
  for (const [domain, locale] of Object.entries(DOMAIN_LOCALE_MAP)) {
    if (hostname.endsWith(domain)) {
      return locale;
    }
  }
  return null;
};

/**
 * Get locale from browser
 */
export const getBrowserLocale = () => {
  const browserLang = navigator.language || navigator.userLanguage;

  // Check if exact match exists
  if (SUPPORTED_LOCALES[browserLang]) {
    return browserLang;
  }

  // Try language code only (fr → fr-FR)
  const langCode = browserLang.split('-')[0];
  const match = Object.keys(SUPPORTED_LOCALES).find((locale) => locale.startsWith(langCode));

  return match || null;
};

/**
 * Get locale from GeoIP (mock implementation)
 */
export const getGeoLocale = async () => {
  try {
    // In production, use a GeoIP service
    // const response = await fetch('https://api.ipgeolocation.io/...');
    // const data = await response.json();
    // return data.country_code_iso2;
    return null;
  } catch (error) {
    console.error('GeoIP detection failed:', error);
    return null;
  }
};

/**
 * Main locale detection function
 */
export const detectLocale = async () => {
  // 1. Check user preference (storage/cookie)
  const stored = getStoredLocale() || getCookieLocale();
  if (stored && SUPPORTED_LOCALES[stored]) {
    return stored;
  }

  // 2. Check URL parameter
  const url = getUrlLocale();
  if (url && SUPPORTED_LOCALES[url]) {
    return url;
  }

  // 3. Check domain
  const domain = getDomainLocale();
  if (domain && SUPPORTED_LOCALES[domain]) {
    return domain;
  }

  // 4. Check GeoIP
  const geo = await getGeoLocale();
  if (geo && SUPPORTED_LOCALES[geo]) {
    return geo;
  }

  // 5. Check browser
  const browser = getBrowserLocale();
  if (browser && SUPPORTED_LOCALES[browser]) {
    return browser;
  }

  // 6. Default
  return DEFAULT_LOCALE;
};

/**
 * Save locale preference
 */
export const saveLocalePreference = (locale) => {
  // Save to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch (error) {
    console.error('Failed to save locale to localStorage:', error);
  }

  // Save to cookie (1 year expiration)
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${COOKIE_NAME}=${locale};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
};

/**
 * Clear locale preference
 */
export const clearLocalePreference = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear locale from localStorage:', error);
  }

  document.cookie = `${COOKIE_NAME}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

export default {
  detectLocale,
  saveLocalePreference,
  clearLocalePreference,
  getStoredLocale,
  getCookieLocale,
  getUrlLocale,
  getDomainLocale,
  getBrowserLocale,
  getGeoLocale,
};
