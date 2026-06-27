/**
 * Utilitaires de formatage de nombres
 */

const DEFAULT_LOCALE = 'fr-FR';

/**
 * Formate un nombre avec séparateurs et décimales
 */
export function formatNumber(value: number, options?: NumberFormatOptions): string {
  const {
    locale = DEFAULT_LOCALE,
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    useGrouping = true,
  } = options || {};

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
    useGrouping,
  }).format(value);
}

export interface NumberFormatOptions {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
}

/**
 * Formate un nombre de manière compacte (1K, 1M, etc.)
 */
export function formatCompact(value: number, locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value);
}

/**
 * Formate un nombre ordinal (1er, 2e, 3e, etc.)
 */
export function formatOrdinal(value: number, locale = DEFAULT_LOCALE): string {
  if (locale.startsWith('fr')) {
    if (value === 1) return '1er';
    return `${value}e`;
  }

  // English ordinals
  if (locale.startsWith('en')) {
    const suffixes = ['th', 'st', 'nd', 'rd'] as const;
    const v = value % 100;
    const suffix = suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0];
    return `${value}${suffix}`;
  }

  return `${value}.`;
}

/**
 * Formate une taille de fichier en bytes
 */
export function formatFileSize(bytes: number, options?: FileSizeFormatOptions): string {
  const { locale = DEFAULT_LOCALE, binary = false, decimals = 1 } = options || {};

  if (bytes === 0) return '0 B';

  const k = binary ? 1024 : 1000;
  const sizes = binary
    ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
    : ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  const unit = sizes[i] || 'B';

  return `${formatNumber(size, { locale, maximumFractionDigits: decimals })} ${unit}`;
}

export interface FileSizeFormatOptions {
  locale?: string;
  binary?: boolean;
  decimals?: number;
}

/**
 * Formate un nombre avec une unité
 */
export function formatWithUnit(
  value: number,
  unit: string,
  options?: WithUnitFormatOptions
): string {
  const { locale = DEFAULT_LOCALE, decimals = 2, spaceBeforeUnit = true } = options || {};

  const formattedValue = formatNumber(value, {
    locale,
    maximumFractionDigits: decimals,
  });

  return spaceBeforeUnit ? `${formattedValue} ${unit}` : `${formattedValue}${unit}`;
}

export interface WithUnitFormatOptions {
  locale?: string;
  decimals?: number;
  spaceBeforeUnit?: boolean;
}

/**
 * Formate un nombre en pourcentage
 */
export function formatPercent(value: number, options?: PercentFormatOptions): string {
  const { locale = DEFAULT_LOCALE, decimals = 0, alreadyPercent = false } = options || {};

  const percentValue = alreadyPercent ? value / 100 : value;

  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(percentValue);
}

export interface PercentFormatOptions {
  locale?: string;
  decimals?: number;
  alreadyPercent?: boolean;
}

/**
 * Formate un ratio (ex: 16:9)
 */
export function formatRatio(numerator: number, denominator: number): string {
  const gcd = greatestCommonDivisor(numerator, denominator);
  return `${numerator / gcd}:${denominator / gcd}`;
}

/**
 * Calcule le PGCD de deux nombres
 */
function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

/**
 * Formate un numéro de téléphone
 */
export function formatPhoneNumber(phone: string, countryCode = 'FR'): string {
  const cleaned = phone.replace(/\D/g, '');

  const formats: Record<string, (n: string) => string> = {
    FR: (n) => {
      if (n.length === 10) {
        return n.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
      }
      if (n.length === 11 && n.startsWith('33')) {
        return '+33 ' + n.slice(2).replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
      }
      return phone;
    },
    US: (n) => {
      if (n.length === 10) {
        return n.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
      }
      return phone;
    },
  };

  const formatter = formats[countryCode];
  return formatter ? formatter(cleaned) : phone;
}

/**
 * Formate une coordonnée GPS
 */
export function formatCoordinate(
  value: number,
  type: 'latitude' | 'longitude',
  format: 'decimal' | 'dms' = 'decimal'
): string {
  if (format === 'decimal') {
    return value.toFixed(6);
  }

  // DMS format (Degrees Minutes Seconds)
  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = ((minutesFloat - minutes) * 60).toFixed(1);

  const direction = type === 'latitude' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'O';

  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

/**
 * Formate une plage de nombres
 */
export function formatRange(min: number, max: number, options?: NumberFormatOptions): string {
  if (min === max) {
    return formatNumber(min, options);
  }
  return `${formatNumber(min, options)} - ${formatNumber(max, options)}`;
}
