/**
 * Number locale formatting utilities
 */

/**
 * Number format style options
 */
export type NumberFormatStyle = 'decimal' | 'percent' | 'unit';

/**
 * Notation options for number formatting
 */
export type NumberNotation = 'standard' | 'scientific' | 'engineering' | 'compact';

/**
 * Options for number formatting
 */
export interface NumberFormatOptions {
  /** Format style */
  style?: NumberFormatStyle;
  /** Notation type */
  notation?: NumberNotation;
  /** Minimum integer digits */
  minimumIntegerDigits?: number;
  /** Minimum fraction digits */
  minimumFractionDigits?: number;
  /** Maximum fraction digits */
  maximumFractionDigits?: number;
  /** Minimum significant digits */
  minimumSignificantDigits?: number;
  /** Maximum significant digits */
  maximumSignificantDigits?: number;
  /** Whether to use grouping separators */
  useGrouping?: boolean;
  /** Sign display option */
  signDisplay?: 'auto' | 'always' | 'exceptZero' | 'never';
  /** Unit for unit formatting */
  unit?: string;
  /** Unit display style */
  unitDisplay?: 'long' | 'short' | 'narrow';
}

/**
 * Default locale for number formatting
 */
let defaultLocale = 'en-US';

/**
 * Sets the default locale for number formatting
 * @param locale - The locale code (e.g., 'en-US', 'de-DE')
 */
export function setNumberLocale(locale: string): void {
  defaultLocale = locale;
}

/**
 * Gets the current default number locale
 * @returns The current locale code
 */
export function getNumberLocale(): string {
  return defaultLocale;
}

/**
 * Formats a number according to locale conventions
 * @param value - The number to format
 * @param options - Formatting options
 * @param locale - Optional locale override
 * @returns The formatted number string
 */
export function formatNumber(
  value: number,
  options: NumberFormatOptions = {},
  locale?: string
): string {
  const targetLocale = locale ?? defaultLocale;
  const formatter = new Intl.NumberFormat(targetLocale, options as Intl.NumberFormatOptions);
  return formatter.format(value);
}

/**
 * Formats a number as a percentage
 * @param value - The number to format (0.5 = 50%)
 * @param decimals - Number of decimal places
 * @param locale - Optional locale override
 * @returns The formatted percentage string
 */
export function formatPercent(value: number, decimals = 0, locale?: string): string {
  return formatNumber(value, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }, locale);
}

/**
 * Formats a number with a specific number of decimal places
 * @param value - The number to format
 * @param decimals - Number of decimal places
 * @param locale - Optional locale override
 * @returns The formatted number string
 */
export function formatDecimal(value: number, decimals = 2, locale?: string): string {
  return formatNumber(value, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }, locale);
}

/**
 * Formats a number in compact notation (e.g., 1K, 1M)
 * @param value - The number to format
 * @param locale - Optional locale override
 * @returns The formatted compact number string
 */
export function formatCompact(value: number, locale?: string): string {
  return formatNumber(value, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }, locale);
}

/**
 * Formats a number with a unit
 * @param value - The number to format
 * @param unit - The unit (e.g., 'kilogram', 'mile', 'celsius')
 * @param unitDisplay - How to display the unit
 * @param locale - Optional locale override
 * @returns The formatted number with unit
 */
export function formatUnit(
  value: number,
  unit: string,
  unitDisplay: 'long' | 'short' | 'narrow' = 'short',
  locale?: string
): string {
  return formatNumber(value, {
    style: 'unit',
    unit,
    unitDisplay,
  }, locale);
}

/**
 * Formats an integer (no decimal places)
 * @param value - The number to format
 * @param locale - Optional locale override
 * @returns The formatted integer string
 */
export function formatInteger(value: number, locale?: string): string {
  return formatNumber(Math.round(value), {
    maximumFractionDigits: 0,
  }, locale);
}

/**
 * Formats a number as an ordinal (1st, 2nd, 3rd, etc.)
 * Note: This uses a simple English implementation as Intl doesn't support ordinals directly
 * @param value - The number to format
 * @param locale - Optional locale override
 * @returns The formatted ordinal string
 */
export function formatOrdinal(value: number, locale?: string): string {
  const targetLocale = locale ?? defaultLocale;
  const absValue = Math.abs(Math.round(value));

  // English ordinal rules
  if (targetLocale.startsWith('en')) {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const remainder = absValue % 100;

    if (remainder >= 11 && remainder <= 13) {
      return `${absValue}th`;
    }

    const suffix = suffixes[absValue % 10] || suffixes[0];
    return `${absValue}${suffix}`;
  }

  // Fallback to just the number for other locales
  return formatInteger(value, locale);
}

/**
 * Parses a locale-formatted number string to a number
 * @param value - The formatted string to parse
 * @param locale - Optional locale override
 * @returns The parsed number or NaN if invalid
 */
export function parseLocaleNumber(value: string, locale?: string): number {
  const targetLocale = locale ?? defaultLocale;

  // Get the decimal and grouping separators for the locale
  const parts = new Intl.NumberFormat(targetLocale).formatToParts(1234.5);
  const groupSeparator = parts.find(p => p.type === 'group')?.value || ',';
  const decimalSeparator = parts.find(p => p.type === 'decimal')?.value || '.';

  // Remove grouping separators and replace decimal separator with '.'
  const normalized = value
    .replace(new RegExp(`\\${groupSeparator}`, 'g'), '')
    .replace(new RegExp(`\\${decimalSeparator}`), '.');

  return parseFloat(normalized);
}

/**
 * Gets the decimal separator for a locale
 * @param locale - Optional locale override
 * @returns The decimal separator character
 */
export function getDecimalSeparator(locale?: string): string {
  const targetLocale = locale ?? defaultLocale;
  const parts = new Intl.NumberFormat(targetLocale).formatToParts(1.1);
  return parts.find(p => p.type === 'decimal')?.value || '.';
}

/**
 * Gets the grouping (thousands) separator for a locale
 * @param locale - Optional locale override
 * @returns The grouping separator character
 */
export function getGroupingSeparator(locale?: string): string {
  const targetLocale = locale ?? defaultLocale;
  const parts = new Intl.NumberFormat(targetLocale).formatToParts(1000);
  return parts.find(p => p.type === 'group')?.value || ',';
}

/**
 * Checks if a string is a valid number in the given locale format
 * @param value - The string to check
 * @param locale - Optional locale override
 * @returns True if the string is a valid locale-formatted number
 */
export function isValidLocaleNumber(value: string, locale?: string): boolean {
  const parsed = parseLocaleNumber(value, locale);
  return !isNaN(parsed) && isFinite(parsed);
}
