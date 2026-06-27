/**
 * Text Transformation Utilities
 * Provides utility functions for transforming text/strings.
 */

/**
 * Converts a string to camelCase.
 * @param str - The string to convert
 * @returns The camelCase string
 */
export function camelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^[A-Z]/, (char) => char.toLowerCase());
}

/**
 * Converts a string to PascalCase.
 * @param str - The string to convert
 * @returns The PascalCase string
 */
export function pascalCase(str: string): string {
  const camel = camelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * Converts a string to snake_case.
 * @param str - The string to convert
 * @returns The snake_case string
 */
export function snakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

/**
 * Converts a string to CONSTANT_CASE.
 * @param str - The string to convert
 * @returns The CONSTANT_CASE string
 */
export function constantCase(str: string): string {
  return snakeCase(str).toUpperCase();
}

/**
 * Converts a string to kebab-case.
 * @param str - The string to convert
 * @returns The kebab-case string
 */
export function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

/**
 * Converts a string to Title Case.
 * @param str - The string to convert
 * @returns The Title Case string
 */
export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[-_\s]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Converts a string to Sentence case.
 * @param str - The string to convert
 * @returns The Sentence case string
 */
export function sentenceCase(str: string): string {
  const result = str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .toLowerCase();
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Capitalizes the first letter of a string.
 * @param str - The string to capitalize
 * @returns The capitalized string
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Lowercases the first letter of a string.
 * @param str - The string to transform
 * @returns The string with lowercase first letter
 */
export function uncapitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Truncates a string to a specified length and adds an ellipsis.
 * @param str - The string to truncate
 * @param length - The maximum length
 * @param suffix - The suffix to add (default: '...')
 * @returns The truncated string
 */
export function truncate(str: string, length: number, suffix: string = '...'): string {
  if (str.length <= length) {
    return str;
  }
  return str.slice(0, length - suffix.length) + suffix;
}

/**
 * Truncates a string to a specified number of words.
 * @param str - The string to truncate
 * @param wordCount - The maximum number of words
 * @param suffix - The suffix to add (default: '...')
 * @returns The truncated string
 */
export function truncateWords(str: string, wordCount: number, suffix: string = '...'): string {
  const words = str.split(/\s+/);
  if (words.length <= wordCount) {
    return str;
  }
  return words.slice(0, wordCount).join(' ') + suffix;
}

/**
 * Pads a string on the left with a specified character.
 * @param str - The string to pad
 * @param length - The target length
 * @param char - The padding character (default: ' ')
 * @returns The padded string
 */
export function padLeft(str: string, length: number, char: string = ' '): string {
  return str.padStart(length, char);
}

/**
 * Pads a string on the right with a specified character.
 * @param str - The string to pad
 * @param length - The target length
 * @param char - The padding character (default: ' ')
 * @returns The padded string
 */
export function padRight(str: string, length: number, char: string = ' '): string {
  return str.padEnd(length, char);
}

/**
 * Pads a string on both sides with a specified character.
 * @param str - The string to pad
 * @param length - The target length
 * @param char - The padding character (default: ' ')
 * @returns The padded string
 */
export function padBoth(str: string, length: number, char: string = ' '): string {
  const totalPadding = length - str.length;
  if (totalPadding <= 0) {
    return str;
  }
  const leftPadding = Math.floor(totalPadding / 2);
  const rightPadding = totalPadding - leftPadding;
  return char.repeat(leftPadding) + str + char.repeat(rightPadding);
}

/**
 * Removes extra whitespace from a string.
 * @param str - The string to clean
 * @returns The cleaned string
 */
export function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Reverses a string.
 * @param str - The string to reverse
 * @returns The reversed string
 */
export function reverse(str: string): string {
  return [...str].reverse().join('');
}

/**
 * Counts occurrences of a substring in a string.
 * @param str - The string to search in
 * @param substring - The substring to count
 * @returns The number of occurrences
 */
export function countOccurrences(str: string, substring: string): number {
  if (!substring) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = str.indexOf(substring, pos)) !== -1) {
    count++;
    pos += substring.length;
  }
  return count;
}

/**
 * Wraps a string at a specified width.
 * @param str - The string to wrap
 * @param width - The maximum line width
 * @param separator - The separator between lines (default: '\n')
 * @returns The wrapped string
 */
export function wordWrap(str: string, width: number, separator: string = '\n'): string {
  const words = str.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= width) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.join(separator);
}

/**
 * Removes HTML tags from a string.
 * @param str - The string to strip
 * @returns The string without HTML tags
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Escapes HTML special characters in a string.
 * @param str - The string to escape
 * @returns The escaped string
 */
export function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char] ?? char);
}

/**
 * Unescapes HTML entities in a string.
 * @param str - The string to unescape
 * @returns The unescaped string
 */
export function unescapeHtml(str: string): string {
  const htmlUnescapes: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  };
  return str.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => htmlUnescapes[entity] ?? entity);
}

/**
 * Slugifies a string for URL usage.
 * @param str - The string to slugify
 * @returns The slugified string
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generates an excerpt from a text string.
 * @param str - The text string
 * @param length - The maximum length
 * @param suffix - The suffix to add (default: '...')
 * @returns The excerpt
 */
export function excerpt(str: string, length: number, suffix: string = '...'): string {
  const stripped = stripHtml(str);
  if (stripped.length <= length) {
    return stripped;
  }
  const truncated = stripped.slice(0, length);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + suffix;
}

/**
 * Checks if a string is blank (empty or only whitespace).
 * @param str - The string to check
 * @returns True if the string is blank
 */
export function isBlank(str: string | null | undefined): boolean {
  return !str || !str.trim();
}

/**
 * Checks if a string is not blank.
 * @param str - The string to check
 * @returns True if the string is not blank
 */
export function isNotBlank(str: string | null | undefined): str is string {
  return !isBlank(str);
}

/**
 * Converts a string to a URL-safe base64 string.
 * @param str - The string to encode
 * @returns The base64-encoded string
 */
export function toBase64(str: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(unescape(encodeURIComponent(str)));
  }
  return Buffer.from(str, 'utf-8').toString('base64');
}

/**
 * Decodes a base64 string.
 * @param str - The base64 string to decode
 * @returns The decoded string
 */
export function fromBase64(str: string): string {
  if (typeof atob !== 'undefined') {
    return decodeURIComponent(escape(atob(str)));
  }
  return Buffer.from(str, 'base64').toString('utf-8');
}

/**
 * Masks part of a string with a specified character.
 * @param str - The string to mask
 * @param start - The start index of the visible portion
 * @param end - The end index of the visible portion
 * @param maskChar - The masking character (default: '*')
 * @returns The masked string
 */
export function mask(str: string, start: number, end: number, maskChar: string = '*'): string {
  if (start >= end || start < 0 || end > str.length) {
    return str;
  }
  const prefix = str.slice(0, start);
  const suffix = str.slice(end);
  const masked = maskChar.repeat(end - start);
  return prefix + masked + suffix;
}

/**
 * Masks an email address for privacy.
 * @param email - The email address to mask
 * @returns The masked email address
 */
export function maskEmail(email: string): string {
  const parts = email.split('@');
  const local = parts[0];
  const domain = parts[1];
  if (!domain || !local) return email;
  const maskedLocal =
    local.length <= 2
      ? local
      : local.charAt(0) + '*'.repeat(local.length - 2) + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
}
