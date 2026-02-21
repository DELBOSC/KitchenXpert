/**
 * Utilitaires de validation de nombres
 */

export interface NumberValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Vérifie si une valeur est un nombre valide (non NaN, fini)
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Vérifie si un nombre est un entier
 */
export function isInteger(value: number): boolean {
  return Number.isInteger(value);
}

/**
 * Vérifie si un nombre est positif
 */
export function isPositive(value: number): boolean {
  return isValidNumber(value) && value > 0;
}

/**
 * Vérifie si un nombre est positif ou zéro
 */
export function isNonNegative(value: number): boolean {
  return isValidNumber(value) && value >= 0;
}

/**
 * Vérifie si un nombre est dans une plage donnée
 */
export function isInRange(
  value: number,
  min: number,
  max: number,
  inclusive = true
): boolean {
  if (!isValidNumber(value)) return false;

  if (inclusive) {
    return value >= min && value <= max;
  }
  return value > min && value < max;
}

/**
 * Valide un nombre avec des contraintes
 */
export function validateNumber(
  value: number,
  options?: {
    min?: number;
    max?: number;
    integer?: boolean;
    positive?: boolean;
    nonNegative?: boolean;
    multipleOf?: number;
  }
): NumberValidationResult {
  const errors: string[] = [];

  if (!isValidNumber(value)) {
    return { isValid: false, errors: ['La valeur doit être un nombre valide'] };
  }

  if (options?.integer && !isInteger(value)) {
    errors.push('La valeur doit être un nombre entier');
  }

  if (options?.positive && value <= 0) {
    errors.push('La valeur doit être positive');
  }

  if (options?.nonNegative && value < 0) {
    errors.push('La valeur ne peut pas être négative');
  }

  if (options?.min !== undefined && value < options.min) {
    errors.push(`La valeur doit être supérieure ou égale à ${options.min}`);
  }

  if (options?.max !== undefined && value > options.max) {
    errors.push(`La valeur doit être inférieure ou égale à ${options.max}`);
  }

  if (options?.multipleOf !== undefined && value % options.multipleOf !== 0) {
    errors.push(`La valeur doit être un multiple de ${options.multipleOf}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Vérifie si un nombre est un prix valide
 */
export function isValidPrice(
  price: number,
  options?: {
    maxDecimals?: number;
    minValue?: number;
    maxValue?: number;
  }
): boolean {
  const { maxDecimals = 2, minValue = 0, maxValue = 1000000 } = options || {};

  if (!isValidNumber(price)) return false;
  if (price < minValue || price > maxValue) return false;

  const decimalPlaces = (price.toString().split('.')[1] || '').length;
  if (decimalPlaces > maxDecimals) return false;

  return true;
}

/**
 * Vérifie si un nombre est un pourcentage valide (0-100)
 */
export function isValidPercentage(value: number, allowNegative = false): boolean {
  if (!isValidNumber(value)) return false;

  const min = allowNegative ? -100 : 0;
  return value >= min && value <= 100;
}

/**
 * Vérifie si un nombre est une quantité valide
 */
export function isValidQuantity(
  quantity: number,
  options?: {
    min?: number;
    max?: number;
    allowFractional?: boolean;
  }
): boolean {
  const { min = 1, max = 10000, allowFractional = false } = options || {};

  if (!isValidNumber(quantity)) return false;
  if (!allowFractional && !isInteger(quantity)) return false;
  if (quantity < min || quantity > max) return false;

  return true;
}

/**
 * Vérifie si une valeur peut être convertie en nombre
 */
export function isNumeric(value: unknown): boolean {
  if (typeof value === 'number') return isValidNumber(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return false;
    const num = Number(trimmed);
    return isValidNumber(num);
  }
  return false;
}

/**
 * Vérifie si un nombre est un identifiant valide (entier positif)
 */
export function isValidId(id: number): boolean {
  return isValidNumber(id) && isInteger(id) && id > 0;
}

/**
 * Vérifie si un nombre est une année valide
 */
export function isValidYear(year: number, options?: {
  minYear?: number;
  maxYear?: number;
  allowFuture?: boolean;
}): boolean {
  const { minYear = 1900, allowFuture = false } = options || {};
  const currentYear = new Date().getFullYear();
  const maxYear = options?.maxYear ?? (allowFuture ? currentYear + 10 : currentYear);

  return isValidNumber(year) && isInteger(year) && year >= minYear && year <= maxYear;
}

/**
 * Vérifie si une coordonnée de latitude est valide
 */
export function isValidLatitude(lat: number): boolean {
  return isValidNumber(lat) && lat >= -90 && lat <= 90;
}

/**
 * Vérifie si une coordonnée de longitude est valide
 */
export function isValidLongitude(lng: number): boolean {
  return isValidNumber(lng) && lng >= -180 && lng <= 180;
}

/**
 * Vérifie si des coordonnées géographiques sont valides
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return isValidLatitude(lat) && isValidLongitude(lng);
}

/**
 * Vérifie si une dimension (mesure physique) est valide
 */
export function isValidDimension(
  value: number,
  unit: 'mm' | 'cm' | 'm' | 'in' | 'ft',
  options?: {
    min?: number;
    max?: number;
  }
): boolean {
  const defaultLimits: Record<'mm' | 'cm' | 'm' | 'in' | 'ft', { min: number; max: number }> = {
    mm: { min: 0.1, max: 100000 },
    cm: { min: 0.01, max: 10000 },
    m: { min: 0.001, max: 1000 },
    in: { min: 0.001, max: 4000 },
    ft: { min: 0.001, max: 330 },
  };

  const unitLimits = defaultLimits[unit];
  const limits = {
    min: options?.min ?? unitLimits.min,
    max: options?.max ?? unitLimits.max,
  };

  return isValidNumber(value) && isPositive(value) && isInRange(value, limits.min, limits.max);
}

/**
 * Clamp une valeur entre un min et un max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Arrondit un nombre à N décimales
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
