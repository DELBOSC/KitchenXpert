/**
 * Utilitaires de formatage de devises et montants
 */

export interface CurrencyFormatOptions {
  locale?: string;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
  currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name';
}

export interface PriceRange {
  min: number;
  max: number;
  currency: string;
}

const DEFAULT_LOCALE = 'fr-FR';
const DEFAULT_CURRENCY = 'EUR';

/**
 * Formate un montant en devise
 */
export function formatCurrency(amount: number, options?: CurrencyFormatOptions): string {
  const {
    locale = DEFAULT_LOCALE,
    currency = DEFAULT_CURRENCY,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    useGrouping = true,
    currencyDisplay = 'symbol',
  } = options || {};

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping,
      currencyDisplay,
    }).format(amount);
  } catch {
    // Fallback si la locale n'est pas supportée
    return `${amount.toFixed(maximumFractionDigits)} ${currency}`;
  }
}

/**
 * Formate un montant de manière compacte (1K, 1M, etc.)
 */
export function formatCurrencyCompact(amount: number, options?: CurrencyFormatOptions): string {
  const {
    locale = DEFAULT_LOCALE,
    currency = DEFAULT_CURRENCY,
    currencyDisplay = 'symbol',
  } = options || {};

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      compactDisplay: 'short',
      currencyDisplay,
    }).format(amount);
  } catch {
    const formatted = formatCompactNumber(amount);
    return `${formatted} ${currency}`;
  }
}

/**
 * Formate un nombre de manière compacte
 */
function formatCompactNumber(num: number): string {
  if (Math.abs(num) >= 1e9) {
    return (num / 1e9).toFixed(1) + 'Md';
  }
  if (Math.abs(num) >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M';
  }
  if (Math.abs(num) >= 1e3) {
    return (num / 1e3).toFixed(1) + 'K';
  }
  return num.toFixed(2);
}

/**
 * Formate une plage de prix
 */
export function formatPriceRange(range: PriceRange, options?: CurrencyFormatOptions): string {
  const { min, max, currency } = range;
  const opts = { ...options, currency };

  if (min === max) {
    return formatCurrency(min, opts);
  }

  return `${formatCurrency(min, opts)} - ${formatCurrency(max, opts)}`;
}

/**
 * Formate un prix avec remise
 */
export function formatDiscountedPrice(
  originalPrice: number,
  discountedPrice: number,
  options?: CurrencyFormatOptions
): { original: string; discounted: string; savings: string; percentage: string } {
  const savings = originalPrice - discountedPrice;
  const percentage = (savings / originalPrice) * 100;

  return {
    original: formatCurrency(originalPrice, options),
    discounted: formatCurrency(discountedPrice, options),
    savings: formatCurrency(savings, options),
    percentage: `${Math.round(percentage)}%`,
  };
}

/**
 * Convertit un montant d'une devise à une autre
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRates: Record<string, number>
): number | null {
  // Les taux sont relatifs à une devise de base (généralement EUR ou USD)
  const fromRate = exchangeRates[fromCurrency];
  const toRate = exchangeRates[toCurrency];

  if (!fromRate || !toRate) {
    return null;
  }

  // Conversion: amount / fromRate * toRate
  return (amount / fromRate) * toRate;
}

/**
 * Parse un montant depuis une chaîne formatée
 */
export function parseCurrency(formattedAmount: string, locale = DEFAULT_LOCALE): number | null {
  // Supprimer les symboles de devise courants
  const cleanedAmount = formattedAmount
    .replace(/[€$£¥₹]/g, '')
    .replace(/\s/g, '')
    .trim();

  // Gérer les différents séparateurs selon la locale
  const decimalSeparator =
    new Intl.NumberFormat(locale).formatToParts(1.1).find((part) => part.type === 'decimal')
      ?.value || '.';

  const thousandsSeparator =
    new Intl.NumberFormat(locale).formatToParts(1000).find((part) => part.type === 'group')
      ?.value || ',';

  // Normaliser vers le format numérique standard
  const normalized = cleanedAmount
    .replace(new RegExp(`\\${thousandsSeparator}`, 'g'), '')
    .replace(decimalSeparator, '.');

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Arrondit un montant au centime le plus proche
 */
export function roundToCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Calcule le prix TTC à partir du prix HT
 */
export function calculatePriceWithTax(priceWithoutTax: number, taxRate: number): number {
  return roundToCents(priceWithoutTax * (1 + taxRate / 100));
}

/**
 * Calcule le prix HT à partir du prix TTC
 */
export function calculatePriceWithoutTax(priceWithTax: number, taxRate: number): number {
  return roundToCents(priceWithTax / (1 + taxRate / 100));
}

/**
 * Calcule le montant de la remise
 */
export function calculateDiscount(originalPrice: number, discountPercentage: number): number {
  return roundToCents(originalPrice * (discountPercentage / 100));
}

/**
 * Formate un pourcentage
 */
export function formatPercentage(
  value: number,
  options?: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const {
    locale = DEFAULT_LOCALE,
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
  } = options || {};

  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value / 100);
}

/**
 * Obtient le symbole d'une devise
 */
export function getCurrencySymbol(currency: string, locale = DEFAULT_LOCALE): string {
  const symbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    JPY: '¥',
    CHF: 'CHF',
    CAD: 'CA$',
    AUD: 'A$',
  };

  if (symbols[currency]) {
    return symbols[currency];
  }

  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);

    return parts.find((part) => part.type === 'currency')?.value || currency;
  } catch {
    return currency;
  }
}

/**
 * Vérifie si un code de devise est valide
 */
export function isValidCurrencyCode(code: string): boolean {
  const validCodes = new Set([
    'EUR',
    'USD',
    'GBP',
    'JPY',
    'CHF',
    'CAD',
    'AUD',
    'CNY',
    'INR',
    'SEK',
    'NOK',
    'DKK',
    'PLN',
    'CZK',
    'HUF',
    'RON',
    'BGN',
    'HRK',
    'RUB',
    'TRY',
    'BRL',
    'MXN',
    'ZAR',
    'KRW',
    'SGD',
    'HKD',
    'NZD',
  ]);

  return validCodes.has(code.toUpperCase());
}

/**
 * Formate un montant pour l'affichage dans une input
 */
export function formatCurrencyInput(
  amount: number | string,
  options?: CurrencyFormatOptions
): string {
  const numAmount = typeof amount === 'string' ? parseCurrency(amount) : amount;
  if (numAmount === null) return '';

  return numAmount.toFixed(options?.maximumFractionDigits ?? 2);
}
