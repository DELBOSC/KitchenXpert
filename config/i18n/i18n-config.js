/**
 * i18n Configuration for KitchenXpert
 *
 * Purpose:
 * - Centralized internationalization configuration
 * - Multi-language support (French primary, English fallback)
 * - Locale detection and persistence
 * - Translation loading strategy
 *
 * Supported Languages:
 * - fr-FR: French (France) - Primary
 * - en-US: English (United States) - Fallback
 * - de-DE: German (Germany)
 * - es-ES: Spanish (Spain)
 * - it-IT: Italian (Italy)
 *
 * Usage:
 * - Import in app initialization: import i18n from './config/i18n/i18n-config';
 * - Use in components: const { t } = useTranslation();
 * - Change language: i18n.changeLanguage('fr-FR');
 *
 * @see https://www.i18next.com/
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// ============================================================
// Supported Locales
// ============================================================

export const SUPPORTED_LOCALES = {
  'fr-FR': {
    name: 'Français',
    nativeName: 'Français',
    flag: '🇫🇷',
    currency: 'EUR',
    dateFormat: 'dd/MM/yyyy',
    direction: 'ltr',
  },
  'en-US': {
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    currency: 'USD',
    dateFormat: 'MM/dd/yyyy',
    direction: 'ltr',
  },
  'de-DE': {
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    currency: 'EUR',
    dateFormat: 'dd.MM.yyyy',
    direction: 'ltr',
  },
  'es-ES': {
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    currency: 'EUR',
    dateFormat: 'dd/MM/yyyy',
    direction: 'ltr',
  },
  'it-IT': {
    name: 'Italian',
    nativeName: 'Italiano',
    flag: '🇮🇹',
    currency: 'EUR',
    dateFormat: 'dd/MM/yyyy',
    direction: 'ltr',
  },
};

// ============================================================
// Default Configuration
// ============================================================

export const DEFAULT_LOCALE = 'fr-FR';
export const FALLBACK_LOCALE = 'en-US';

// ============================================================
// Translation Namespaces
// ============================================================

export const NAMESPACES = {
  common: 'common', // Common UI elements (buttons, labels, etc.)
  catalog: 'catalog', // Product catalog
  design: 'design', // Kitchen design tool
  ai: 'ai', // AI recommendations
  checkout: 'checkout', // Checkout process
  auth: 'auth', // Authentication
  profile: 'profile', // User profile
  errors: 'errors', // Error messages
  validation: 'validation', // Form validation messages
};

export const DEFAULT_NAMESPACE = NAMESPACES.common;

// ============================================================
// i18next Configuration
// ============================================================

i18n
  // Load translations using http backend
  .use(Backend)

  // Detect user language
  .use(LanguageDetector)

  // Pass i18n instance to react-i18next
  .use(initReactI18next)

  // Initialize i18next
  .init({
    // ============================================================
    // Language Settings
    // ============================================================

    /**
     * Default language
     */
    lng: DEFAULT_LOCALE,

    /**
     * Fallback language when translation is missing
     */
    fallbackLng: FALLBACK_LOCALE,

    /**
     * Supported languages
     */
    supportedLngs: Object.keys(SUPPORTED_LOCALES),

    /**
     * Allow non-explicit supported languages
     * - false: Only exact matches (fr-FR, en-US)
     * - true: Allow partial matches (fr, en)
     */
    nonExplicitSupportedLngs: false,

    /**
     * Language to use if current is not in supportedLngs
     */
    load: 'languageOnly', // 'all' | 'currentOnly' | 'languageOnly'

    /**
     * Preload languages on init
     * - Improves performance by loading common languages upfront
     */
    preload: [DEFAULT_LOCALE, FALLBACK_LOCALE],

    // ============================================================
    // Namespace Settings
    // ============================================================

    /**
     * Default namespace
     */
    defaultNS: DEFAULT_NAMESPACE,

    /**
     * Fallback namespace
     */
    fallbackNS: DEFAULT_NAMESPACE,

    /**
     * Namespaces to load
     */
    ns: Object.values(NAMESPACES),

    // ============================================================
    // Backend Configuration
    // ============================================================

    backend: {
      /**
       * Path to load translations from
       * - /locales/{{lng}}/{{ns}}.json
       * - e.g., /locales/fr-FR/common.json
       */
      loadPath: '/locales/{{lng}}/{{ns}}.json',

      /**
       * Add version query parameter to force reload
       */
      queryStringParams: {
        v: process.env.REACT_APP_VERSION || '1.0.0',
      },

      /**
       * Allow cross-origin requests
       */
      crossDomain: false,

      /**
       * Request timeout
       */
      requestOptions: {
        mode: 'cors',
        credentials: 'same-origin',
        cache: 'default',
      },
    },

    // ============================================================
    // Detection Settings
    // ============================================================

    detection: {
      /**
       * Order of detection methods
       * 1. querystring (?lng=fr-FR)
       * 2. cookie (i18next)
       * 3. localStorage (i18nextLng)
       * 4. sessionStorage (i18nextLng)
       * 5. navigator (browser language)
       * 6. htmlTag (html lang attribute)
       */
      order: ['querystring', 'cookie', 'localStorage', 'sessionStorage', 'navigator', 'htmlTag'],

      /**
       * Keys to look for in different detection sources
       */
      lookupQuerystring: 'lng',
      lookupCookie: 'i18next',
      lookupLocalStorage: 'i18nextLng',
      lookupSessionStorage: 'i18nextLng',
      lookupFromPathIndex: 0,
      lookupFromSubdomainIndex: 0,

      /**
       * Cache user language
       */
      caches: ['localStorage', 'cookie'],

      /**
       * Cookie options
       */
      cookieOptions: {
        path: '/',
        sameSite: 'strict',
        maxAge: 365 * 24 * 60 * 60, // 1 year
      },

      /**
       * Expiration time for localStorage cache
       * - 7 days in milliseconds
       */
      cookieMinutes: 10080, // 7 days
    },

    // ============================================================
    // Interpolation Settings
    // ============================================================

    interpolation: {
      /**
       * Escape passed in values to avoid XSS
       * - false: React already escapes by default
       */
      escapeValue: false,

      /**
       * Prefix for interpolation variables
       */
      prefix: '{{',

      /**
       * Suffix for interpolation variables
       */
      suffix: '}}',

      /**
       * Format function for custom formatting
       */
      format: (value, format, lng) => {
        // Custom formatting logic
        if (format === 'uppercase') return value.toUpperCase();
        if (format === 'lowercase') return value.toLowerCase();
        if (format === 'capitalize') {
          return value.charAt(0).toUpperCase() + value.slice(1);
        }
        return value;
      },
    },

    // ============================================================
    // React Settings
    // ============================================================

    react: {
      /**
       * Use Suspense for lazy loading translations
       */
      useSuspense: true,

      /**
       * Bind i18n instance to component tree
       */
      bindI18n: 'languageChanged loaded',

      /**
       * Bind i18n store to component tree
       */
      bindI18nStore: 'added removed',

      /**
       * Use Trans component for nested translations
       */
      transSupportBasicHtmlNodes: true,

      /**
       * Allowed HTML tags in translations
       */
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p', 'span'],
    },

    // ============================================================
    // Missing Translation Handling
    // ============================================================

    /**
     * Save missing translations
     * - Development: true (log missing keys)
     * - Production: false (silent)
     */
    saveMissing: process.env.NODE_ENV === 'development',

    /**
     * Missing key handler
     */
    missingKeyHandler: (lng, ns, key, fallbackValue) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Missing translation: [${lng}][${ns}] ${key}`);
      }
    },

    /**
     * Parse missing key errors
     */
    parseMissingKeyHandler: (key) => {
      if (process.env.NODE_ENV === 'development') {
        return `⚠️ ${key}`;
      }
      return key;
    },

    // ============================================================
    // Performance Settings
    // ============================================================

    /**
     * Debounce loading of translations
     */
    updateMissing: false,

    /**
     * Load translations synchronously
     */
    initImmediate: false,

    /**
     * Partition translations into multiple requests
     */
    partialBundledLanguages: true,

    // ============================================================
    // Development Settings
    // ============================================================

    /**
     * Debug mode
     */
    debug: process.env.NODE_ENV === 'development',

    /**
     * Return objects instead of strings
     */
    returnObjects: false,

    /**
     * Return empty string for null values
     */
    returnEmptyString: true,

    /**
     * Return null for missing translations
     */
    returnNull: false,
  });

// ============================================================
// Event Listeners
// ============================================================

/**
 * Language changed event
 */
i18n.on('languageChanged', (lng) => {
  console.log(`Language changed to: ${lng}`);

  // Update HTML lang attribute
  document.documentElement.lang = lng;

  // Update HTML dir attribute for RTL languages
  const locale = SUPPORTED_LOCALES[lng];
  if (locale) {
    document.documentElement.dir = locale.direction;
  }

  // Emit custom event for analytics
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('language-changed', {
        detail: { language: lng },
      })
    );
  }
});

/**
 * Translation loaded event
 */
i18n.on('loaded', (loaded) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Translations loaded:', loaded);
  }
});

/**
 * Failed loading event
 */
i18n.on('failedLoading', (lng, ns, msg) => {
  console.error(`Failed loading translation: [${lng}][${ns}]`, msg);
});

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get locale configuration
 */
export const getLocaleConfig = (locale) => {
  return SUPPORTED_LOCALES[locale] || SUPPORTED_LOCALES[DEFAULT_LOCALE];
};

/**
 * Change language
 */
export const changeLanguage = async (locale) => {
  if (!SUPPORTED_LOCALES[locale]) {
    console.warn(`Unsupported locale: ${locale}. Falling back to ${DEFAULT_LOCALE}`);
    locale = DEFAULT_LOCALE;
  }

  await i18n.changeLanguage(locale);
  return locale;
};

/**
 * Get current language
 */
export const getCurrentLanguage = () => {
  return i18n.language || DEFAULT_LOCALE;
};

/**
 * Get available languages
 */
export const getAvailableLanguages = () => {
  return Object.keys(SUPPORTED_LOCALES).map((code) => ({
    code,
    ...SUPPORTED_LOCALES[code],
  }));
};

// ============================================================
// Export
// ============================================================

export default i18n;

// TODO: Add translation management service integration (Lokalise, Phrase, etc.)
// TODO: Add automatic translation validation on build
// TODO: Add pluralization rules for all languages
// TODO: Add context-based translations for gender/formality
// TODO: Consider adding translation keys extraction tool
