/**
 * i18n Service
 * Handles internationalization, translations, and locale management
 */

export interface TranslationKey {
  key: string;
  namespace: string;
  translations: Record<string, string>;
  description?: string;
  context?: string;
  pluralRules?: PluralRules;
  createdAt: Date;
  updatedAt: Date;
}

export interface PluralRules {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

export interface Locale {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
  timeFormat: string;
  numberFormat: NumberFormatConfig;
  currency: CurrencyConfig;
  isDefault: boolean;
  isEnabled: boolean;
}

export interface NumberFormatConfig {
  decimalSeparator: string;
  thousandsSeparator: string;
  decimalPlaces: number;
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  symbolPosition: 'before' | 'after';
  decimalPlaces: number;
}

export interface TranslationNamespace {
  name: string;
  description?: string;
  keyCount: number;
}

export interface I18nConfig {
  defaultLocale: string;
  fallbackLocale: string;
  supportedLocales: string[];
  namespaces: string[];
  interpolation: InterpolationConfig;
}

export interface InterpolationConfig {
  prefix: string;
  suffix: string;
  escapeValue: boolean;
}

export interface I18nRepository {
  getTranslation(key: string, namespace: string): Promise<TranslationKey | null>;
  getNamespaceTranslations(namespace: string, locale: string): Promise<Record<string, string>>;
  setTranslation(data: Omit<TranslationKey, 'createdAt' | 'updatedAt'>): Promise<TranslationKey>;
  deleteTranslation(key: string, namespace: string): Promise<boolean>;
  searchTranslations(query: string, locale?: string): Promise<TranslationKey[]>;
  getLocales(): Promise<Locale[]>;
  getLocale(code: string): Promise<Locale | null>;
  setLocale(locale: Locale): Promise<Locale>;
  getNamespaces(): Promise<TranslationNamespace[]>;
  getMissingTranslations(locale: string): Promise<TranslationKey[]>;
}

const defaultConfig: I18nConfig = {
  defaultLocale: 'fr',
  fallbackLocale: 'en',
  supportedLocales: ['fr', 'en', 'es', 'de', 'it'],
  namespaces: ['common', 'kitchen', 'catalog', 'errors', 'emails', 'ai'],
  interpolation: {
    prefix: '{{',
    suffix: '}}',
    escapeValue: true,
  },
};

const defaultLocales: Locale[] = [
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimalSeparator: ',', thousandsSeparator: ' ', decimalPlaces: 2 },
    currency: { code: 'EUR', symbol: '€', symbolPosition: 'after', decimalPlaces: 2 },
    isDefault: true,
    isEnabled: true,
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'hh:mm A',
    numberFormat: { decimalSeparator: '.', thousandsSeparator: ',', decimalPlaces: 2 },
    currency: { code: 'USD', symbol: '$', symbolPosition: 'before', decimalPlaces: 2 },
    isDefault: false,
    isEnabled: true,
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimalSeparator: ',', thousandsSeparator: '.', decimalPlaces: 2 },
    currency: { code: 'EUR', symbol: '€', symbolPosition: 'after', decimalPlaces: 2 },
    isDefault: false,
    isEnabled: true,
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimalSeparator: ',', thousandsSeparator: '.', decimalPlaces: 2 },
    currency: { code: 'EUR', symbol: '€', symbolPosition: 'after', decimalPlaces: 2 },
    isDefault: false,
    isEnabled: true,
  },
];

export class I18nService {
  private config: I18nConfig;
  private translationCache: Map<string, Map<string, string>> = new Map();
  private localeCache: Map<string, Locale> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private isCacheValid(key: string): boolean {
    const ts = this.cacheTimestamps.get(key);
    return ts ? Date.now() - ts < this.CACHE_TTL : false;
  }

  constructor(
    private repository: I18nRepository,
    config: Partial<I18nConfig> = {}
  ) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Translate a key
   */
  async t(
    key: string,
    locale?: string,
    options?: {
      namespace?: string;
      defaultValue?: string;
      count?: number;
      data?: Record<string, unknown>;
    }
  ): Promise<string> {
    const targetLocale = locale || this.config.defaultLocale;
    const namespace = options?.namespace || 'common';

    // Try cache first
    const cacheKey = `${namespace}:${targetLocale}`;
    let translations = this.translationCache.has(cacheKey) && this.isCacheValid(cacheKey)
      ? this.translationCache.get(cacheKey)
      : undefined;

    if (!translations) {
      const loaded = await this.repository.getNamespaceTranslations(namespace, targetLocale);
      translations = new Map(Object.entries(loaded));
      this.translationCache.set(cacheKey, translations);
      this.cacheTimestamps.set(cacheKey, Date.now());
    }

    let translation = translations.get(key);

    // Try fallback locale
    if (!translation && targetLocale !== this.config.fallbackLocale) {
      const fallbackKey = `${namespace}:${this.config.fallbackLocale}`;
      let fallbackTranslations = this.translationCache.has(fallbackKey) && this.isCacheValid(fallbackKey)
        ? this.translationCache.get(fallbackKey)
        : undefined;

      if (!fallbackTranslations) {
        const loaded = await this.repository.getNamespaceTranslations(namespace, this.config.fallbackLocale);
        fallbackTranslations = new Map(Object.entries(loaded));
        this.translationCache.set(fallbackKey, fallbackTranslations);
        this.cacheTimestamps.set(fallbackKey, Date.now());
      }

      translation = fallbackTranslations.get(key);
    }

    // Use default value or key
    if (!translation) {
      translation = options?.defaultValue || key;
    }

    // Handle pluralization
    if (options?.count !== undefined) {
      translation = this.handlePlural(translation, options.count, targetLocale);
    }

    // Interpolate variables
    if (options?.data) {
      translation = this.interpolate(translation, options.data);
    }

    return translation;
  }

  /**
   * Get all translations for a namespace and locale
   */
  async getTranslations(namespace: string, locale: string): Promise<Record<string, string>> {
    return this.repository.getNamespaceTranslations(namespace, locale);
  }

  /**
   * Set a translation
   */
  async setTranslation(
    key: string,
    namespace: string,
    translations: Record<string, string>,
    metadata?: { description?: string; context?: string }
  ): Promise<TranslationKey> {
    const result = await this.repository.setTranslation({
      key,
      namespace,
      translations,
      ...metadata,
    });

    // Clear cache for affected locales
    for (const locale of Object.keys(translations)) {
      this.translationCache.delete(`${namespace}:${locale}`);
    }

    return result;
  }

  /**
   * Delete a translation
   */
  async deleteTranslation(key: string, namespace: string): Promise<boolean> {
    const result = await this.repository.deleteTranslation(key, namespace);

    if (result) {
      // Clear entire namespace cache
      for (const cacheKey of this.translationCache.keys()) {
        if (cacheKey.startsWith(`${namespace}:`)) {
          this.translationCache.delete(cacheKey);
        }
      }
    }

    return result;
  }

  /**
   * Search translations
   */
  async searchTranslations(query: string, locale?: string): Promise<TranslationKey[]> {
    return this.repository.searchTranslations(query, locale);
  }

  /**
   * Get all locales
   */
  async getLocales(): Promise<Locale[]> {
    const locales = await this.repository.getLocales();
    return locales.length > 0 ? locales : defaultLocales;
  }

  /**
   * Get enabled locales
   */
  async getEnabledLocales(): Promise<Locale[]> {
    const locales = await this.getLocales();
    return locales.filter(l => l.isEnabled);
  }

  /**
   * Get locale by code
   */
  async getLocale(code: string): Promise<Locale | null> {
    const cacheKey = `locale:${code}`;
    if (this.localeCache.has(code) && this.isCacheValid(cacheKey)) {
      return this.localeCache.get(code)!;
    }

    const locale = await this.repository.getLocale(code);
    if (locale) {
      this.localeCache.set(code, locale);
      this.cacheTimestamps.set(cacheKey, Date.now());
    }

    return locale || defaultLocales.find(l => l.code === code) || null;
  }

  /**
   * Get default locale
   */
  async getDefaultLocale(): Promise<Locale> {
    const locales = await this.getLocales();
    return locales.find(l => l.isDefault) || locales[0] || defaultLocales[0]!;
  }

  /**
   * Set locale configuration
   */
  async setLocale(locale: Locale): Promise<Locale> {
    const result = await this.repository.setLocale(locale);
    this.localeCache.set(locale.code, result);
    this.cacheTimestamps.set(`locale:${locale.code}`, Date.now());
    return result;
  }

  /**
   * Get translation namespaces
   */
  async getNamespaces(): Promise<TranslationNamespace[]> {
    return this.repository.getNamespaces();
  }

  /**
   * Get missing translations for a locale
   */
  async getMissingTranslations(locale: string): Promise<TranslationKey[]> {
    return this.repository.getMissingTranslations(locale);
  }

  /**
   * Format number according to locale
   */
  async formatNumber(value: number, locale?: string): Promise<string> {
    const targetLocale = await this.getLocale(locale || this.config.defaultLocale);
    if (!targetLocale) {return value.toString();}

    const { decimalSeparator, thousandsSeparator, decimalPlaces } = targetLocale.numberFormat;

    const fixed = value.toFixed(decimalPlaces);
    const [intPart, decPart] = fixed.split('.');

    if (!intPart) {return fixed;}

    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
    return decPart ? `${formattedInt}${decimalSeparator}${decPart}` : formattedInt;
  }

  /**
   * Format currency according to locale
   */
  async formatCurrency(value: number, locale?: string, currencyCode?: string): Promise<string> {
    const targetLocale = await this.getLocale(locale || this.config.defaultLocale);
    if (!targetLocale) {return value.toString();}

    const currency = currencyCode
      ? { ...targetLocale.currency, code: currencyCode }
      : targetLocale.currency;

    const { decimalSeparator, thousandsSeparator } = targetLocale.numberFormat;
    const { symbol, symbolPosition, decimalPlaces } = currency;

    const fixed = value.toFixed(decimalPlaces);
    const [intPart, decPart] = fixed.split('.');

    if (!intPart) {return fixed;}

    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
    const formattedValue = decPart ? `${formattedInt}${decimalSeparator}${decPart}` : formattedInt;

    return symbolPosition === 'before' ? `${symbol}${formattedValue}` : `${formattedValue} ${symbol}`;
  }

  /**
   * Format date according to locale
   */
  async formatDate(date: Date, locale?: string, format?: string): Promise<string> {
    const targetLocale = await this.getLocale(locale || this.config.defaultLocale);
    if (!targetLocale) {return date.toISOString();}

    const dateFormat = format || targetLocale.dateFormat;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());

    return dateFormat
      .replace('DD', day)
      .replace('MM', month)
      .replace('YYYY', year);
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.translationCache.clear();
    this.localeCache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Handle plural forms
   */
  private handlePlural(translation: string, count: number, _locale: string): string {
    // Simple plural handling - could be extended with CLDR rules
    const pluralForm = count === 0 ? 'zero' : count === 1 ? 'one' : 'other';

    // Check if translation has plural forms
    if (translation.includes('|')) {
      const forms = translation.split('|');
      if (pluralForm === 'one' && forms[0]) {
        return forms[0];
      }
      return forms[1] || forms[0] || translation;
    }

    return translation;
  }

  /**
   * Interpolate variables in translation
   */
  private interpolate(translation: string, data: Record<string, unknown>): string {
    const { prefix, suffix } = this.config.interpolation;
    let result = translation;

    for (const [key, value] of Object.entries(data)) {
      const placeholder = `${prefix}${key}${suffix}`;
      result = result.replace(new RegExp(this.escapeRegex(placeholder), 'g'), String(value));
    }

    return result;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export class I18nServiceError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'I18nServiceError';
  }
}

export function createI18nService(
  repository: I18nRepository,
  config?: Partial<I18nConfig>
): I18nService {
  return new I18nService(repository, config);
}

export default I18nService;
