/**
 * IKEA API Utilities
 * Helper functions for IKEA API integration
 */

import type { ItemType, ItemCode } from './types';

/**
 * Item code regex pattern: XXX.XXX.XX or variations with spaces, commas, dashes
 */
const ITEM_CODE_PATTERN = /\d{3}[, .-]{0,2}\d{3}[, .-]{0,2}\d{2}/g;

/**
 * Parse and extract item codes from a string or array
 */
export function parseItemCodes(input: string | string[]): string[] {
  const inputStr = Array.isArray(input) ? input.join(' ') : input;
  const matches = inputStr.match(ITEM_CODE_PATTERN) || [];

  // Format and deduplicate
  const formatted = matches.map(formatItemCode).filter(Boolean) as string[];
  return [...new Set(formatted)];
}

/**
 * Format an item code to XXX.XXX.XX format
 */
export function formatItemCode(itemCode: string): string | null {
  // Remove all non-digit characters
  const digits = itemCode.replace(/\D/g, '');

  if (digits.length !== 8) {
    return null;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 8)}`;
}

/**
 * Validate if a string is a valid IKEA item code
 */
export function isValidItemCode(code: string): boolean {
  const formatted = formatItemCode(code);
  return formatted !== null;
}

/**
 * Parse item code with type detection
 */
export function parseItemCodeWithType(code: string, type?: ItemType): ItemCode | null {
  const formatted = formatItemCode(code);
  if (!formatted) return null;

  return {
    code: formatted,
    type: type || 'ART', // Default to single item
  };
}

/**
 * Get default headers for IKEA API requests
 */
export function getDefaultHeaders(language: string = 'en'): Record<string, string> {
  return {
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': language,
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15',
    'Origin': 'https://www.ikea.com',
    'Referer': 'https://www.ikea.com/',
  };
}

/**
 * Build URL with query parameters
 */
export function buildUrl(baseUrl: string, params: Record<string, unknown>): string {
  const url = new URL(baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(v => url.searchParams.append(key, String(v)));
      } else {
        url.searchParams.append(key, String(value));
      }
    }
  });

  return url.toString();
}

/**
 * Parse price from various formats
 */
export function parsePrice(priceData: unknown): number {
  if (typeof priceData === 'number') {
    return priceData;
  }

  if (typeof priceData === 'string') {
    // Remove currency symbols and parse
    const cleaned = priceData.replace(/[^\d.,]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }

  if (typeof priceData === 'object' && priceData !== null) {
    const obj = priceData as Record<string, unknown>;
    // Common price object formats
    if ('amount' in obj) return parsePrice(obj.amount);
    if ('value' in obj) return parsePrice(obj.value);
    if ('price' in obj) return parsePrice(obj.price);
    if ('wholeNumber' in obj && 'decimals' in obj) {
      return Number(obj.wholeNumber) + Number(obj.decimals) / 100;
    }
  }

  return 0;
}

/**
 * Extract image URL from various response formats
 */
export function extractImageUrl(media: unknown): string | undefined {
  if (typeof media === 'string') {
    return media;
  }

  if (Array.isArray(media)) {
    const firstMedia = media[0];
    if (firstMedia) {
      return extractImageUrl(firstMedia);
    }
    return undefined;
  }

  if (typeof media === 'object' && media !== null) {
    const obj = media as Record<string, unknown>;
    // Common image URL fields
    if ('url' in obj) return String(obj.url);
    if ('href' in obj) return String(obj.href);
    if ('src' in obj) return String(obj.src);
    if ('mainImageUrl' in obj) return String(obj.mainImageUrl);
    if ('S5' in obj) return String(obj.S5); // IKEA uses size codes like S5
    if ('S4' in obj) return String(obj.S4);
    if ('S3' in obj) return String(obj.S3);
  }

  return undefined;
}

/**
 * Build product URL from item code
 */
export function buildProductUrl(
  baseUrl: string,
  country: string,
  language: string,
  itemCode: string,
  productName?: string
): string {
  const formatted = formatItemCode(itemCode);
  if (!formatted) {
    return `${baseUrl}/${country}/${language}/`;
  }

  const slug = productName
    ? productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)
    : 'product';

  const codeForUrl = formatted.replace(/\./g, '');

  return `${baseUrl}/${country}/${language}/p/${slug}-${codeForUrl}/`;
}

/**
 * Delay execution (for rate limiting)
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        const delayMs = baseDelay * Math.pow(2, attempt);
        await delay(delayMs);
      }
    }
  }

  throw lastError;
}

/**
 * Chunk an array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Convert country code to IKEA host
 */
export function getIkeaHost(country: string): string {
  // Russia uses different host
  if (country === 'ru') {
    return 'ikea.ru';
  }
  return 'ingka.com';
}

/**
 * Get currency code for country
 */
export function getCurrencyForCountry(country: string): string {
  const currencyMap: Record<string, string> = {
    fr: 'EUR',
    de: 'EUR',
    es: 'EUR',
    it: 'EUR',
    nl: 'EUR',
    be: 'EUR',
    at: 'EUR',
    gb: 'GBP',
    us: 'USD',
    ca: 'CAD',
    se: 'SEK',
    ch: 'CHF',
    pl: 'PLN',
    ru: 'RUB',
    au: 'AUD',
    jp: 'JPY',
    kr: 'KRW',
    cn: 'CNY',
    hk: 'HKD',
    tw: 'TWD',
  };

  return currencyMap[country] || 'EUR';
}
