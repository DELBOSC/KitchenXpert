/**
 * Currency locale formatting utilities
 */

/**
 * Currency display options
 */
export type CurrencyDisplay = 'symbol' | 'narrowSymbol' | 'code' | 'name';

/**
 * Currency sign options
 */
export type CurrencySign = 'standard' | 'accounting';

/**
 * Options for currency formatting
 */
export interface CurrencyFormatOptions {
  /** How to display the currency */
  currencyDisplay?: CurrencyDisplay;
  /** How to display the sign for negative values */
  currencySign?: CurrencySign;
  /** Minimum fraction digits */
  minimumFractionDigits?: number;
  /** Maximum fraction digits */
  maximumFractionDigits?: number;
  /** Whether to use grouping separators */
  useGrouping?: boolean;
  /** Notation type */
  notation?: 'standard' | 'compact';
}

/**
 * Currency information
 */
export interface CurrencyInfo {
  /** ISO 4217 currency code */
  code: string;
  /** Currency symbol */
  symbol: string;
  /** Currency name */
  name: string;
  /** Number of decimal places */
  decimalPlaces: number;
}

/**
 * Common currency information
 */
export const CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimalPlaces: 2 },
  EUR: { code: 'EUR', symbol: '\u20ac', name: 'Euro', decimalPlaces: 2 },
  GBP: { code: 'GBP', symbol: '\u00a3', name: 'British Pound', decimalPlaces: 2 },
  JPY: { code: 'JPY', symbol: '\u00a5', name: 'Japanese Yen', decimalPlaces: 0 },
  CNY: { code: 'CNY', symbol: '\u00a5', name: 'Chinese Yuan', decimalPlaces: 2 },
  INR: { code: 'INR', symbol: '\u20b9', name: 'Indian Rupee', decimalPlaces: 2 },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', decimalPlaces: 2 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimalPlaces: 2 },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', decimalPlaces: 2 },
  KRW: { code: 'KRW', symbol: '\u20a9', name: 'South Korean Won', decimalPlaces: 0 },
  MXN: { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', decimalPlaces: 2 },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimalPlaces: 2 },
  RUB: { code: 'RUB', symbol: '\u20bd', name: 'Russian Ruble', decimalPlaces: 2 },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', decimalPlaces: 2 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimalPlaces: 2 },
  HKD: { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', decimalPlaces: 2 },
  NOK: { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', decimalPlaces: 2 },
  SEK: { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', decimalPlaces: 2 },
  DKK: { code: 'DKK', symbol: 'kr', name: 'Danish Krone', decimalPlaces: 2 },
  NZD: { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', decimalPlaces: 2 },
};

/**
 * Default locale for currency formatting
 */
let defaultLocale = 'en-US';

/**
 * Default currency code
 */
let defaultCurrency = 'USD';

/**
 * Sets the default locale for currency formatting
 * @param locale - The locale code (e.g., 'en-US', 'de-DE')
 */
export function setCurrencyLocale(locale: string): void {
  defaultLocale = locale;
}

/**
 * Gets the current default currency locale
 * @returns The current locale code
 */
export function getCurrencyLocale(): string {
  return defaultLocale;
}

/**
 * Sets the default currency
 * @param currency - The ISO 4217 currency code
 */
export function setDefaultCurrency(currency: string): void {
  defaultCurrency = currency.toUpperCase();
}

/**
 * Gets the current default currency
 * @returns The current currency code
 */
export function getDefaultCurrency(): string {
  return defaultCurrency;
}

/**
 * Formats an amount as currency
 * @param amount - The amount to format
 * @param currency - The ISO 4217 currency code (defaults to default currency)
 * @param options - Formatting options
 * @param locale - Optional locale override
 * @returns The formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency?: string,
  options: CurrencyFormatOptions = {},
  locale?: string
): string {
  const targetLocale = locale ?? defaultLocale;
  const targetCurrency = currency ?? defaultCurrency;

  const formatter = new Intl.NumberFormat(targetLocale, {
    style: 'currency',
    currency: targetCurrency,
    ...options,
  } as Intl.NumberFormatOptions);

  return formatter.format(amount);
}

/**
 * Formats currency with symbol only (e.g., "$1,234.56")
 * @param amount - The amount to format
 * @param currency - The ISO 4217 currency code
 * @param locale - Optional locale override
 * @returns The formatted currency string with symbol
 */
export function formatCurrencySymbol(amount: number, currency?: string, locale?: string): string {
  return formatCurrency(amount, currency, { currencyDisplay: 'symbol' }, locale);
}

/**
 * Formats currency with narrow symbol (e.g., "$1,234.56" instead of "US$1,234.56")
 * @param amount - The amount to format
 * @param currency - The ISO 4217 currency code
 * @param locale - Optional locale override
 * @returns The formatted currency string with narrow symbol
 */
export function formatCurrencyNarrow(amount: number, currency?: string, locale?: string): string {
  return formatCurrency(amount, currency, { currencyDisplay: 'narrowSymbol' }, locale);
}

/**
 * Formats currency with code (e.g., "USD 1,234.56")
 * @param amount - The amount to format
 * @param currency - The ISO 4217 currency code
 * @param locale - Optional locale override
 * @returns The formatted currency string with code
 */
export function formatCurrencyCode(amount: number, currency?: string, locale?: string): string {
  return formatCurrency(amount, currency, { currencyDisplay: 'code' }, locale);
}

/**
 * Formats currency with full name (e.g., "1,234.56 US dollars")
 * @param amount - The amount to format
 * @param currency - The ISO 4217 currency code
 * @param locale - Optional locale override
 * @returns The formatted currency string with name
 */
export function formatCurrencyName(amount: number, currency?: string, locale?: string): string {
  return formatCurrency(amount, currency, { currencyDisplay: 'name' }, locale);
}

/**
 * Formats currency in compact notation (e.g., "$1.2M")
 * @param amount - The amount to format
 * @param currency - The ISO 4217 currency code
 * @param locale - Optional locale override
 * @returns The formatted compact currency string
 */
export function formatCurrencyCompact(amount: number, currency?: string, locale?: string): string {
  return formatCurrency(amount, currency, { notation: 'compact' }, locale);
}

/**
 * Formats currency with accounting notation (negative in parentheses)
 * @param amount - The amount to format
 * @param currency - The ISO 4217 currency code
 * @param locale - Optional locale override
 * @returns The formatted accounting currency string
 */
export function formatCurrencyAccounting(
  amount: number,
  currency?: string,
  locale?: string
): string {
  return formatCurrency(amount, currency, { currencySign: 'accounting' }, locale);
}

/**
 * Gets currency information
 * @param currency - The ISO 4217 currency code
 * @returns Currency info or undefined if not found
 */
export function getCurrencyInfo(currency: string): CurrencyInfo | undefined {
  return CURRENCIES[currency.toUpperCase()];
}

/**
 * Gets the currency symbol for a currency code in a specific locale
 * @param currency - The ISO 4217 currency code
 * @param locale - Optional locale override
 * @returns The currency symbol
 */
export function getCurrencySymbol(currency: string, locale?: string): string {
  const targetLocale = locale ?? defaultLocale;
  const parts = new Intl.NumberFormat(targetLocale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    currencyDisplay: 'narrowSymbol',
  }).formatToParts(0);

  const symbolPart = parts.find((p) => p.type === 'currency');
  return symbolPart?.value ?? currency;
}

/**
 * Parses a locale-formatted currency string to a number
 * @param value - The formatted currency string to parse
 * @param locale - Optional locale override
 * @returns The parsed amount or NaN if invalid
 */
export function parseCurrency(value: string, locale?: string): number {
  const targetLocale = locale ?? defaultLocale;

  // Get the decimal and grouping separators for the locale
  const parts = new Intl.NumberFormat(targetLocale).formatToParts(1234.5);
  const groupSeparator = parts.find((p) => p.type === 'group')?.value || ',';
  const decimalSeparator = parts.find((p) => p.type === 'decimal')?.value || '.';

  // Remove currency symbols, grouping separators, and whitespace
  const cleaned = value
    .replace(/[^\d\-.,]/g, '')
    .replace(new RegExp(`\\${groupSeparator}`, 'g'), '')
    .replace(new RegExp(`\\${decimalSeparator}`), '.');

  return parseFloat(cleaned);
}

/**
 * Gets the list of supported currency codes
 * @returns Array of supported currency codes
 */
export function getSupportedCurrencies(): string[] {
  return Object.keys(CURRENCIES);
}
