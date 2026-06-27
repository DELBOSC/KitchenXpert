/**
 * Plural rules for different languages
 */

/**
 * Plural category as defined by CLDR
 */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/**
 * Plural rule function type
 */
export type PluralRuleFunction = (n: number) => PluralCategory;

/**
 * Options for plural selection
 */
export interface PluralSelectOptions {
  /** Value for zero category */
  zero?: string;
  /** Value for one category */
  one?: string;
  /** Value for two category */
  two?: string;
  /** Value for few category */
  few?: string;
  /** Value for many category */
  many?: string;
  /** Value for other category (required) */
  other: string;
}

/**
 * Default locale for plural rules
 */
let defaultLocale = 'en';

/**
 * Sets the default locale for plural rules
 * @param locale - The locale code
 */
export function setPluralLocale(locale: string): void {
  defaultLocale = locale;
}

/**
 * Gets the current default plural locale
 * @returns The current locale code
 */
export function getPluralLocale(): string {
  return defaultLocale;
}

/**
 * Gets the plural category for a number using Intl.PluralRules
 * @param n - The number to categorize
 * @param type - The plural type ('cardinal' or 'ordinal')
 * @param locale - Optional locale override
 * @returns The plural category
 */
export function getPluralCategory(
  n: number,
  type: 'cardinal' | 'ordinal' = 'cardinal',
  locale?: string
): PluralCategory {
  const targetLocale = locale ?? defaultLocale;
  const rules = new Intl.PluralRules(targetLocale, { type });
  return rules.select(n) as PluralCategory;
}

/**
 * Gets the ordinal plural category for a number
 * @param n - The number to categorize
 * @param locale - Optional locale override
 * @returns The ordinal plural category
 */
export function getOrdinalCategory(n: number, locale?: string): PluralCategory {
  return getPluralCategory(n, 'ordinal', locale);
}

/**
 * Selects a string based on the plural category of a number
 * @param n - The number to use for selection
 * @param options - The strings for each category
 * @param locale - Optional locale override
 * @returns The selected string
 */
export function pluralSelect(n: number, options: PluralSelectOptions, locale?: string): string {
  const category = getPluralCategory(n, 'cardinal', locale);

  // Try to get the value for the specific category, fall back to 'other'
  const value = options[category] ?? options.other;

  // Replace {n} placeholder with the actual number
  return value.replace(/\{n\}/g, String(n));
}

/**
 * Selects a string based on the ordinal category of a number
 * @param n - The number to use for selection
 * @param options - The strings for each category
 * @param locale - Optional locale override
 * @returns The selected string
 */
export function ordinalSelect(n: number, options: PluralSelectOptions, locale?: string): string {
  const category = getOrdinalCategory(n, locale);
  const value = options[category] ?? options.other;
  return value.replace(/\{n\}/g, String(n));
}

/**
 * Creates a pluralized message with count
 * @param count - The count
 * @param singular - The singular form
 * @param plural - The plural form
 * @param locale - Optional locale override
 * @returns The pluralized message
 */
export function pluralize(
  count: number,
  singular: string,
  plural: string,
  locale?: string
): string {
  const category = getPluralCategory(count, 'cardinal', locale);
  const form = category === 'one' ? singular : plural;
  return form.replace(/\{n\}/g, String(count));
}

/**
 * Gets all plural categories that a locale uses
 * @param type - The plural type
 * @param locale - Optional locale override
 * @returns Array of plural categories used by the locale
 */
export function getUsedPluralCategories(
  type: 'cardinal' | 'ordinal' = 'cardinal',
  locale?: string
): PluralCategory[] {
  const targetLocale = locale ?? defaultLocale;
  const rules = new Intl.PluralRules(targetLocale, { type });

  const categories = new Set<PluralCategory>();

  // Test a range of numbers to find all used categories
  const testNumbers = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
    100, 101, 102, 1000, 1001, 1002, 0.1, 0.5, 1.5, 2.5,
  ];

  for (const n of testNumbers) {
    categories.add(rules.select(n) as PluralCategory);
  }

  return Array.from(categories);
}

/**
 * Checks if a locale uses a specific plural category
 * @param category - The plural category to check
 * @param type - The plural type
 * @param locale - Optional locale override
 * @returns True if the locale uses the category
 */
export function usesPluralCategory(
  category: PluralCategory,
  type: 'cardinal' | 'ordinal' = 'cardinal',
  locale?: string
): boolean {
  const usedCategories = getUsedPluralCategories(type, locale);
  return usedCategories.includes(category);
}

/**
 * English ordinal suffixes
 */
const englishOrdinalSuffixes: Record<PluralCategory, string> = {
  zero: 'th',
  one: 'st',
  two: 'nd',
  few: 'rd',
  many: 'th',
  other: 'th',
};

/**
 * Gets the ordinal suffix for a number (English)
 * @param n - The number
 * @param locale - Optional locale override
 * @returns The ordinal suffix
 */
export function getOrdinalSuffix(n: number, locale?: string): string {
  const targetLocale = locale ?? defaultLocale;

  // Only provide suffix for English locales
  if (!targetLocale.startsWith('en')) {
    return '';
  }

  const category = getOrdinalCategory(n, targetLocale);
  return englishOrdinalSuffixes[category] || 'th';
}

/**
 * Formats a number as an ordinal using plural rules (e.g., 1st, 2nd, 3rd)
 * @param n - The number to format
 * @param locale - Optional locale override
 * @returns The formatted ordinal
 */
export function formatOrdinalWithPluralRules(n: number, locale?: string): string {
  const suffix = getOrdinalSuffix(n, locale);
  return `${n}${suffix}`;
}

/**
 * Creates a plural rule function for custom implementations
 * @param locale - The locale code
 * @param type - The plural type
 * @returns A function that returns the plural category for a number
 */
export function createPluralRuleFunction(
  locale: string,
  type: 'cardinal' | 'ordinal' = 'cardinal'
): PluralRuleFunction {
  const rules = new Intl.PluralRules(locale, { type });
  return (n: number) => rules.select(n) as PluralCategory;
}

/**
 * Range plural category (for ranges like "1-5 items")
 * Note: This is a simplified implementation as Intl.PluralRules.selectRange
 * is not widely supported yet
 * @param start - Start of the range
 * @param end - End of the range
 * @param locale - Optional locale override
 * @returns The plural category for the range
 */
export function getRangePluralCategory(
  _start: number,
  end: number,
  locale?: string
): PluralCategory {
  // Simplified: use the end value's category
  // In a full implementation, this would use selectRange when available
  return getPluralCategory(end, 'cardinal', locale);
}
