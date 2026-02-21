/**
 * Translation utilities for internationalization
 */

/**
 * Translation message value - either a string or nested messages
 */
export type TranslationMessageValue = string | { [key: string]: TranslationMessageValue };

/**
 * Translation message dictionary type
 */
export type TranslationMessages = Record<string, TranslationMessageValue>;

/**
 * Interpolation values for message formatting
 */
export type InterpolationValues = Record<string, string | number | boolean>;

/**
 * Translation options
 */
export interface TranslateOptions {
  /** Default value if key is not found */
  defaultValue?: string;
  /** Interpolation values for placeholders */
  values?: InterpolationValues;
  /** Count for pluralization */
  count?: number;
  /** Context for contextual translations */
  context?: string;
}

/**
 * Translation store to hold loaded translations
 */
const translationStore: Map<string, TranslationMessages> = new Map();

/**
 * Current active locale
 */
let currentLocale = 'en';

/**
 * Sets the current locale for translations
 * @param locale - The locale code (e.g., 'en', 'fr', 'de')
 */
export function setLocale(locale: string): void {
  currentLocale = locale;
}

/**
 * Gets the current active locale
 * @returns The current locale code
 */
export function getLocale(): string {
  return currentLocale;
}

/**
 * Loads translations for a specific locale
 * @param locale - The locale code
 * @param messages - The translation messages
 */
export function loadTranslations(locale: string, messages: TranslationMessages): void {
  const existing = translationStore.get(locale) || {};
  translationStore.set(locale, { ...existing, ...messages });
}

/**
 * Clears all loaded translations
 */
export function clearTranslations(): void {
  translationStore.clear();
}

/**
 * Gets a nested value from an object using dot notation
 * @param obj - The object to search
 * @param path - The dot-notation path (e.g., 'common.buttons.submit')
 * @returns The value at the path or undefined
 */
function getNestedValue(obj: TranslationMessages, path: string): string | undefined {
  const keys = path.split('.');
  let current: TranslationMessages | string | undefined = obj;

  for (const key of keys) {
    if (current === undefined || typeof current === 'string') {
      return undefined;
    }
    current = current[key];
  }

  return typeof current === 'string' ? current : undefined;
}

/**
 * Formats a message by replacing placeholders with values
 * @param message - The message template with placeholders like {name}
 * @param values - The values to interpolate
 * @returns The formatted message
 */
export function formatMessage(message: string, values?: InterpolationValues): string {
  if (!values) {
    return message;
  }

  return message.replace(/\{(\w+)\}/g, (match, key) => {
    if (key in values) {
      return String(values[key]);
    }
    return match;
  });
}

/**
 * Translates a key to the current locale
 * @param key - The translation key (supports dot notation)
 * @param options - Translation options
 * @returns The translated and formatted string
 */
export function translate(key: string, options: TranslateOptions = {}): string {
  const { defaultValue, values, count, context } = options;

  const messages = translationStore.get(currentLocale);
  if (!messages) {
    return defaultValue ?? key;
  }

  // Build the lookup key with context if provided
  let lookupKey = key;
  if (context) {
    lookupKey = `${key}_${context}`;
  }

  // Handle pluralization
  if (count !== undefined) {
    const pluralKey = count === 1 ? `${lookupKey}_one` : `${lookupKey}_other`;
    const pluralMessage = getNestedValue(messages, pluralKey);
    if (pluralMessage) {
      return formatMessage(pluralMessage, { ...values, count });
    }
  }

  const message = getNestedValue(messages, lookupKey);
  if (message) {
    return formatMessage(message, values);
  }

  return defaultValue ?? key;
}

/**
 * Shorthand alias for translate function
 */
export const t = translate;

/**
 * Creates a scoped translator for a specific namespace
 * @param namespace - The namespace prefix
 * @returns A translate function scoped to the namespace
 */
export function createScopedTranslator(namespace: string): (key: string, options?: TranslateOptions) => string {
  return (key: string, options?: TranslateOptions) => {
    return translate(`${namespace}.${key}`, options);
  };
}

/**
 * Checks if a translation key exists
 * @param key - The translation key to check
 * @param locale - Optional locale to check (defaults to current locale)
 * @returns True if the key exists
 */
export function hasTranslation(key: string, locale?: string): boolean {
  const targetLocale = locale ?? currentLocale;
  const messages = translationStore.get(targetLocale);
  if (!messages) {
    return false;
  }
  return getNestedValue(messages, key) !== undefined;
}
