/**
 * Translation Loader for KitchenXpert
 *
 * Purpose:
 * - Dynamic loading of translation files
 * - Caching mechanism for better performance
 * - Error handling with fallback support
 * - Namespace-based translation organization
 *
 * Usage:
 * - Load namespace: await loadTranslations('fr-FR', 'catalog');
 * - Preload all: await preloadTranslations('fr-FR');
 * - Clear cache: clearTranslationCache();
 *
 * File Structure:
 * public/locales/
 * ├── fr-FR/
 * │   ├── common.json
 * │   ├── catalog.json
 * │   ├── design.json
 * │   └── ...
 * ├── en-US/
 * │   ├── common.json
 * │   └── ...
 * └── ...
 *
 * @see https://www.i18next.com/
 */

import { DEFAULT_LOCALE, FALLBACK_LOCALE, NAMESPACES } from './i18n-config';

// ============================================================
// Cache Management
// ============================================================

/**
 * In-memory cache for loaded translations
 * Structure: { 'fr-FR': { 'common': { ... }, 'catalog': { ... } } }
 */
const translationCache = new Map();

/**
 * Cache expiration time (7 days in milliseconds)
 */
const CACHE_EXPIRATION = 7 * 24 * 60 * 60 * 1000;

/**
 * Cache metadata (last loaded timestamp)
 */
const cacheMetadata = new Map();

// ============================================================
// Core Loading Functions
// ============================================================

/**
 * Load translation file from server
 *
 * @param {string} locale - Locale code (e.g., 'fr-FR')
 * @param {string} namespace - Translation namespace (e.g., 'catalog')
 * @returns {Promise<Object>} Translation object
 */
export const loadTranslationFile = async (locale, namespace) => {
  try {
    const url = `/locales/${locale}/${namespace}.json`;
    const version = process.env.REACT_APP_VERSION || '1.0.0';

    const response = await fetch(`${url}?v=${version}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'default',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const translations = await response.json();

    // Validate translation structure
    if (!translations || typeof translations !== 'object') {
      throw new Error(`Invalid translation format for ${locale}/${namespace}`);
    }

    return translations;
  } catch (error) {
    console.error(`Failed to load translation: ${locale}/${namespace}`, error);
    throw error;
  }
};

/**
 * Load translations with caching
 *
 * @param {string} locale - Locale code
 * @param {string} namespace - Translation namespace
 * @param {boolean} forceReload - Force reload from server
 * @returns {Promise<Object>} Translation object
 */
export const loadTranslations = async (
  locale,
  namespace,
  forceReload = false
) => {
  // Generate cache key
  const cacheKey = `${locale}:${namespace}`;

  // Check if cached and not expired
  if (!forceReload && translationCache.has(cacheKey)) {
    const cachedTime = cacheMetadata.get(cacheKey);
    const now = Date.now();

    if (cachedTime && now - cachedTime < CACHE_EXPIRATION) {
      console.log(`Using cached translation: ${cacheKey}`);
      return translationCache.get(cacheKey);
    }

    // Cache expired, remove it
    translationCache.delete(cacheKey);
    cacheMetadata.delete(cacheKey);
  }

  try {
    // Load from server
    console.log(`Loading translation: ${cacheKey}`);
    const translations = await loadTranslationFile(locale, namespace);

    // Cache the result
    translationCache.set(cacheKey, translations);
    cacheMetadata.set(cacheKey, Date.now());

    return translations;
  } catch (error) {
    // Try fallback locale if not already using it
    if (locale !== FALLBACK_LOCALE) {
      console.warn(
        `Falling back to ${FALLBACK_LOCALE} for namespace: ${namespace}`
      );
      return loadTranslations(FALLBACK_LOCALE, namespace, forceReload);
    }

    // Return empty object as last resort
    console.error(`Failed to load translations for ${cacheKey}`, error);
    return {};
  }
};

/**
 * Preload all namespaces for a locale
 *
 * @param {string} locale - Locale code
 * @returns {Promise<Object>} All translations for the locale
 */
export const preloadTranslations = async (locale) => {
  console.log(`Preloading translations for: ${locale}`);

  const namespaceKeys = Object.values(NAMESPACES);
  const loadPromises = namespaceKeys.map((namespace) =>
    loadTranslations(locale, namespace)
  );

  try {
    const results = await Promise.allSettled(loadPromises);

    const translations = {};
    results.forEach((result, index) => {
      const namespace = namespaceKeys[index];
      if (result.status === 'fulfilled') {
        translations[namespace] = result.value;
      } else {
        console.error(
          `Failed to preload namespace: ${namespace}`,
          result.reason
        );
        translations[namespace] = {};
      }
    });

    return translations;
  } catch (error) {
    console.error(`Failed to preload translations for ${locale}`, error);
    return {};
  }
};

/**
 * Preload critical namespaces only (for faster initial load)
 *
 * @param {string} locale - Locale code
 * @returns {Promise<Object>} Critical translations
 */
export const preloadCriticalTranslations = async (locale) => {
  console.log(`Preloading critical translations for: ${locale}`);

  const criticalNamespaces = [
    NAMESPACES.common,
    NAMESPACES.auth,
    NAMESPACES.errors,
  ];

  const loadPromises = criticalNamespaces.map((namespace) =>
    loadTranslations(locale, namespace)
  );

  try {
    const results = await Promise.allSettled(loadPromises);

    const translations = {};
    results.forEach((result, index) => {
      const namespace = criticalNamespaces[index];
      if (result.status === 'fulfilled') {
        translations[namespace] = result.value;
      } else {
        console.error(
          `Failed to preload critical namespace: ${namespace}`,
          result.reason
        );
        translations[namespace] = {};
      }
    });

    return translations;
  } catch (error) {
    console.error(
      `Failed to preload critical translations for ${locale}`,
      error
    );
    return {};
  }
};

// ============================================================
// Cache Management Functions
// ============================================================

/**
 * Clear all translation cache
 */
export const clearTranslationCache = () => {
  console.log('Clearing translation cache');
  translationCache.clear();
  cacheMetadata.clear();
};

/**
 * Clear cache for specific locale
 *
 * @param {string} locale - Locale code
 */
export const clearLocaleCache = (locale) => {
  console.log(`Clearing cache for locale: ${locale}`);

  const keysToDelete = [];
  translationCache.forEach((_, key) => {
    if (key.startsWith(`${locale}:`)) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => {
    translationCache.delete(key);
    cacheMetadata.delete(key);
  });
};

/**
 * Clear cache for specific namespace
 *
 * @param {string} namespace - Namespace to clear
 */
export const clearNamespaceCache = (namespace) => {
  console.log(`Clearing cache for namespace: ${namespace}`);

  const keysToDelete = [];
  translationCache.forEach((_, key) => {
    if (key.endsWith(`:${namespace}`)) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => {
    translationCache.delete(key);
    cacheMetadata.delete(key);
  });
};

/**
 * Get cache statistics
 *
 * @returns {Object} Cache stats
 */
export const getCacheStats = () => {
  const stats = {
    totalEntries: translationCache.size,
    cacheSize: 0,
    entries: [],
  };

  translationCache.forEach((value, key) => {
    const metadata = cacheMetadata.get(key);
    const sizeInBytes = JSON.stringify(value).length;

    stats.cacheSize += sizeInBytes;
    stats.entries.push({
      key,
      sizeInBytes,
      loadedAt: metadata ? new Date(metadata).toISOString() : null,
      isExpired: metadata ? Date.now() - metadata > CACHE_EXPIRATION : true,
    });
  });

  stats.cacheSizeKB = (stats.cacheSize / 1024).toFixed(2);
  stats.cacheSizeMB = (stats.cacheSize / 1024 / 1024).toFixed(2);

  return stats;
};

// ============================================================
// Utility Functions
// ============================================================

/**
 * Check if translation exists for locale and namespace
 *
 * @param {string} locale - Locale code
 * @param {string} namespace - Namespace
 * @returns {boolean} True if exists
 */
export const hasTranslation = (locale, namespace) => {
  const cacheKey = `${locale}:${namespace}`;
  return translationCache.has(cacheKey);
};

/**
 * Get translation from cache (sync)
 *
 * @param {string} locale - Locale code
 * @param {string} namespace - Namespace
 * @returns {Object|null} Translation object or null
 */
export const getTranslationFromCache = (locale, namespace) => {
  const cacheKey = `${locale}:${namespace}`;
  return translationCache.get(cacheKey) || null;
};

/**
 * Batch load multiple namespaces
 *
 * @param {string} locale - Locale code
 * @param {string[]} namespaces - Array of namespaces
 * @returns {Promise<Object>} Object with all translations
 */
export const loadMultipleNamespaces = async (locale, namespaces) => {
  const loadPromises = namespaces.map((namespace) =>
    loadTranslations(locale, namespace)
  );

  const results = await Promise.allSettled(loadPromises);

  const translations = {};
  results.forEach((result, index) => {
    const namespace = namespaces[index];
    if (result.status === 'fulfilled') {
      translations[namespace] = result.value;
    } else {
      console.error(`Failed to load namespace: ${namespace}`, result.reason);
      translations[namespace] = {};
    }
  });

  return translations;
};

/**
 * Validate translation completeness
 *
 * @param {string} locale - Locale code
 * @param {string} namespace - Namespace
 * @returns {Promise<Object>} Validation result
 */
export const validateTranslation = async (locale, namespace) => {
  try {
    const translations = await loadTranslations(locale, namespace);
    const referenceTranslations = await loadTranslations(
      DEFAULT_LOCALE,
      namespace
    );

    const referenceKeys = getAllKeys(referenceTranslations);
    const translationKeys = getAllKeys(translations);

    const missingKeys = referenceKeys.filter(
      (key) => !translationKeys.includes(key)
    );
    const extraKeys = translationKeys.filter(
      (key) => !referenceKeys.includes(key)
    );

    return {
      isComplete: missingKeys.length === 0,
      totalKeys: referenceKeys.length,
      translatedKeys: translationKeys.length,
      missingKeys,
      extraKeys,
      coverage: (translationKeys.length / referenceKeys.length) * 100,
    };
  } catch (error) {
    console.error(`Failed to validate translation: ${locale}/${namespace}`, error);
    return null;
  }
};

/**
 * Get all keys from nested translation object
 *
 * @param {Object} obj - Translation object
 * @param {string} prefix - Key prefix
 * @returns {string[]} Array of all keys
 */
const getAllKeys = (obj, prefix = '') => {
  const keys = [];

  Object.keys(obj).forEach((key) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  });

  return keys;
};

// ============================================================
// Export
// ============================================================

export default {
  loadTranslations,
  loadTranslationFile,
  preloadTranslations,
  preloadCriticalTranslations,
  clearTranslationCache,
  clearLocaleCache,
  clearNamespaceCache,
  getCacheStats,
  hasTranslation,
  getTranslationFromCache,
  loadMultipleNamespaces,
  validateTranslation,
};

// TODO: Add Service Worker caching for offline support
// TODO: Add translation versioning and migration
// TODO: Add A/B testing support for translations
// TODO: Add automatic fallback chain (fr-FR → fr → en-US)
// TODO: Consider lazy loading translations per route
