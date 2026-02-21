/**
 * Utilitaires de validation de chaînes de caractères
 */

export interface StringValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Vérifie si une chaîne est un email valide
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email);
}

/**
 * Vérifie si une chaîne est un numéro de téléphone valide
 */
export function isValidPhone(phone: string, countryCode?: string): boolean {
  // Format international générique
  const genericRegex = /^\+?[1-9]\d{1,14}$/;

  // Formats spécifiques par pays
  const countryRegexes: Record<string, RegExp> = {
    FR: /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/,
    US: /^(?:\+1)?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/,
    UK: /^(?:(?:\+|00)44|0)\s?[1-9]\d{9}$/,
  };

  if (countryCode && countryRegexes[countryCode]) {
    return countryRegexes[countryCode].test(phone);
  }

  return genericRegex.test(phone.replace(/[\s.-]/g, ''));
}

/**
 * Vérifie si une chaîne est une URL valide
 */
export function isValidUrl(url: string, requireHttps = false): boolean {
  try {
    const parsed = new URL(url);
    if (requireHttps && parsed.protocol !== 'https:') {
      return false;
    }
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Vérifie si une chaîne est un UUID valide (v4)
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Vérifie si une chaîne est un slug valide
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Vérifie si un mot de passe respecte les critères de sécurité
 */
export function validatePassword(password: string, options?: {
  minLength?: number;
  maxLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
}): StringValidationResult {
  const {
    minLength = 8,
    maxLength = 128,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true,
  } = options || {};

  const errors: string[] = [];

  if (password.length < minLength) {
    errors.push(`Le mot de passe doit contenir au moins ${minLength} caractères`);
  }

  if (password.length > maxLength) {
    errors.push(`Le mot de passe ne doit pas dépasser ${maxLength} caractères`);
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }

  if (requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }

  if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Vérifie si une chaîne est un code postal valide
 */
export function isValidPostalCode(postalCode: string, countryCode = 'FR'): boolean {
  const postalCodeRegexes: Record<string, RegExp> = {
    FR: /^[0-9]{5}$/,
    US: /^[0-9]{5}(-[0-9]{4})?$/,
    UK: /^[A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2}$/i,
    CA: /^[A-Z][0-9][A-Z]\s*[0-9][A-Z][0-9]$/i,
    DE: /^[0-9]{5}$/,
    ES: /^[0-9]{5}$/,
    IT: /^[0-9]{5}$/,
  };

  const regex = postalCodeRegexes[countryCode] || /^[A-Za-z0-9\s-]{3,10}$/;
  return regex.test(postalCode);
}

/**
 * Vérifie si une chaîne est vide ou ne contient que des espaces
 */
export function isBlank(str: string | null | undefined): boolean {
  return str === null || str === undefined || str.trim().length === 0;
}

/**
 * Vérifie si une chaîne est non vide et contient du contenu
 */
export function isNotBlank(str: string | null | undefined): str is string {
  return !isBlank(str);
}

/**
 * Vérifie la longueur d'une chaîne
 */
export function validateLength(
  str: string,
  options: { min?: number; max?: number; exact?: number }
): StringValidationResult {
  const errors: string[] = [];

  if (options.exact !== undefined && str.length !== options.exact) {
    errors.push(`La chaîne doit contenir exactement ${options.exact} caractères`);
  } else {
    if (options.min !== undefined && str.length < options.min) {
      errors.push(`La chaîne doit contenir au moins ${options.min} caractères`);
    }
    if (options.max !== undefined && str.length > options.max) {
      errors.push(`La chaîne ne doit pas dépasser ${options.max} caractères`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Vérifie si une chaîne ne contient que des caractères alphanumériques
 */
export function isAlphanumeric(str: string, allowSpaces = false): boolean {
  const regex = allowSpaces ? /^[a-zA-Z0-9\s]+$/ : /^[a-zA-Z0-9]+$/;
  return regex.test(str);
}

/**
 * Vérifie si une chaîne est un numéro SIRET/SIREN valide (France)
 */
export function isValidSiret(siret: string): boolean {
  const cleaned = siret.replace(/\s/g, '');
  if (!/^[0-9]{14}$/.test(cleaned)) return false;

  // Algorithme de Luhn
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const char = cleaned[i];
    if (!char) return false;
    let digit = parseInt(char, 10);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/**
 * Vérifie si une chaîne est un numéro de TVA intracommunautaire valide
 */
export function isValidVatNumber(vatNumber: string): boolean {
  const vatRegexes: Record<string, RegExp> = {
    FR: /^FR[0-9A-Z]{2}[0-9]{9}$/,
    DE: /^DE[0-9]{9}$/,
    ES: /^ES[0-9A-Z][0-9]{7}[0-9A-Z]$/,
    IT: /^IT[0-9]{11}$/,
    UK: /^GB([0-9]{9}|[0-9]{12}|(GD|HA)[0-9]{3})$/,
    BE: /^BE[0-9]{10}$/,
    NL: /^NL[0-9]{9}B[0-9]{2}$/,
  };

  const cleaned = vatNumber.replace(/[\s.-]/g, '').toUpperCase();
  const countryCode = cleaned.substring(0, 2);
  const regex = vatRegexes[countryCode];

  return regex ? regex.test(cleaned) : false;
}

/**
 * Vérifie si une chaîne contient des caractères dangereux (XSS prevention)
 */
export function containsDangerousCharacters(str: string): boolean {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];

  return dangerousPatterns.some(pattern => pattern.test(str));
}
