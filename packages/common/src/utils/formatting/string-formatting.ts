/**
 * Utilitaires de formatage de chaînes de caractères
 */

/**
 * Met la première lettre en majuscule
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Met la première lettre de chaque mot en majuscule
 */
export function titleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ');
}

/**
 * Tronque une chaîne à une longueur maximale
 */
export function truncate(
  str: string,
  maxLength: number,
  options?: TruncateOptions
): string {
  const { suffix = '...', wordBoundary = false } = options || {};

  if (!str || str.length <= maxLength) return str;

  const truncatedLength = maxLength - suffix.length;

  if (wordBoundary) {
    const truncated = str.slice(0, truncatedLength);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 0) {
      return truncated.slice(0, lastSpace) + suffix;
    }
  }

  return str.slice(0, truncatedLength) + suffix;
}

export interface TruncateOptions {
  suffix?: string;
  wordBoundary?: boolean;
}

/**
 * Convertit une chaîne en slug URL-friendly
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Pluralise un mot en fonction d'un compteur
 */
export function pluralize(
  word: string,
  count: number,
  options?: PluralizeOptions
): string {
  const { plural, showCount = true, locale = 'fr' } = options || {};

  const pluralWord = plural || getPluralForm(word, locale);
  const selectedWord = count === 1 ? word : pluralWord;

  return showCount ? `${count} ${selectedWord}` : selectedWord;
}

export interface PluralizeOptions {
  plural?: string;
  showCount?: boolean;
  locale?: string;
}

function getPluralForm(word: string, locale: string): string {
  // Règles de pluralisation françaises simplifiées
  if (locale === 'fr') {
    if (word.endsWith('al')) {
      return word.slice(0, -2) + 'aux';
    }
    if (word.endsWith('au') || word.endsWith('eu')) {
      return word + 'x';
    }
    if (word.endsWith('s') || word.endsWith('x') || word.endsWith('z')) {
      return word;
    }
    return word + 's';
  }

  // Règles anglaises
  if (word.endsWith('y') && !/[aeiou]y$/.test(word)) {
    return word.slice(0, -1) + 'ies';
  }
  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('z') ||
      word.endsWith('ch') || word.endsWith('sh')) {
    return word + 'es';
  }
  return word + 's';
}

/**
 * Échappe les caractères HTML
 */
export function escapeHtml(str: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return str.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

/**
 * Déséchape les entités HTML
 */
export function unescapeHtml(str: string): string {
  const htmlEntities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
  };

  return str.replace(/&(?:amp|lt|gt|quot|#39|#x27|#x2F);/g, (entity) => htmlEntities[entity] || entity);
}

/**
 * Supprime les balises HTML
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Masque une partie d'une chaîne (emails, phones, etc.)
 */
export function mask(
  str: string,
  options?: MaskOptions
): string {
  const {
    visibleStart = 3,
    visibleEnd = 3,
    maskChar = '*',
    minMaskLength = 3,
  } = options || {};

  if (str.length <= visibleStart + visibleEnd + minMaskLength) {
    return str;
  }

  const start = str.slice(0, visibleStart);
  const end = str.slice(-visibleEnd);
  const maskLength = str.length - visibleStart - visibleEnd;

  return start + maskChar.repeat(maskLength) + end;
}

export interface MaskOptions {
  visibleStart?: number;
  visibleEnd?: number;
  maskChar?: string;
  minMaskLength?: number;
}

/**
 * Masque une adresse email
 */
export function maskEmail(email: string): string {
  const parts = email.split('@');
  const localPart = parts[0];
  const domain = parts[1];

  if (!localPart || !domain) return mask(email);

  const maskedLocal = mask(localPart, { visibleStart: 2, visibleEnd: 0 });
  return `${maskedLocal}@${domain}`;
}

/**
 * Formate des initiales
 */
export function getInitials(
  name: string,
  maxLength = 2
): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, maxLength)
    .join('');
}

/**
 * Pad une chaîne à gauche
 */
export function padLeft(
  str: string,
  length: number,
  char = '0'
): string {
  return str.padStart(length, char);
}

/**
 * Pad une chaîne à droite
 */
export function padRight(
  str: string,
  length: number,
  char = ' '
): string {
  return str.padEnd(length, char);
}

/**
 * Supprime les espaces multiples
 */
export function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Convertit une chaîne en array de lignes
 */
export function toLines(str: string): string[] {
  return str.split(/\r?\n/);
}

/**
 * Génère un extrait d'un texte
 */
export function excerpt(
  text: string,
  query: string,
  options?: ExcerptOptions
): string {
  const { length = 150, highlightTag = 'mark' } = options || {};

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    return truncate(text, length);
  }

  const start = Math.max(0, index - Math.floor(length / 2));
  const end = Math.min(text.length, start + length);

  let excerpt = text.slice(start, end);

  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';

  if (highlightTag && query) {
    // Escape HTML in excerpt before inserting highlight tags to prevent XSS
    excerpt = excerpt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    excerpt = excerpt.replace(regex, `<${highlightTag}>$1</${highlightTag}>`);
  }

  return excerpt;
}

export interface ExcerptOptions {
  length?: number;
  highlightTag?: string | null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
