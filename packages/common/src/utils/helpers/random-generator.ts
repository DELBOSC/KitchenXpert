/**
 * Random Generation Utilities
 * Provides utility functions for generating random values.
 */

/**
 * Generates a UUID v4.
 * @returns A UUID string
 */
export function uuid(): string {
  return crypto.randomUUID();
}

/**
 * Generates a short unique ID.
 * @param length - The length of the ID (default: 8)
 * @returns A short unique ID string
 */
export function shortId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return randomString(length, chars);
}

/**
 * Generates a random string.
 * @param length - The length of the string
 * @param charset - The character set to use (default: alphanumeric)
 * @returns A random string
 */
export function randomString(
  length: number,
  charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  let result = '';
  const charsetLength = charset.length;

  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += charset[(randomValues[i] ?? 0) % charsetLength];
  }

  return result;
}

/**
 * Generates a random alphanumeric string.
 * @param length - The length of the string
 * @returns A random alphanumeric string
 */
export function randomAlphanumeric(length: number): string {
  return randomString(length, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
}

/**
 * Generates a random alphabetic string.
 * @param length - The length of the string
 * @param uppercase - Whether to include uppercase letters only (default: both)
 * @returns A random alphabetic string
 */
export function randomAlphabetic(length: number, uppercase?: boolean): string {
  if (uppercase === true) {
    return randomString(length, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  }
  if (uppercase === false) {
    return randomString(length, 'abcdefghijklmnopqrstuvwxyz');
  }
  return randomString(length, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
}

/**
 * Generates a random numeric string.
 * @param length - The length of the string
 * @returns A random numeric string
 */
export function randomNumeric(length: number): string {
  return randomString(length, '0123456789');
}

/**
 * Generates a random hexadecimal string.
 * @param length - The length of the string
 * @param uppercase - Whether to use uppercase letters (default: false)
 * @returns A random hexadecimal string
 */
export function randomHex(length: number, uppercase: boolean = false): string {
  const charset = uppercase ? '0123456789ABCDEF' : '0123456789abcdef';
  return randomString(length, charset);
}

/**
 * Generates a random integer within a range.
 * @param min - The minimum value (inclusive)
 * @param max - The maximum value (inclusive)
 * @returns A random integer
 */
export function randomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);

  const range = max - min + 1;
  const randomBuffer = new Uint32Array(1);
  crypto.getRandomValues(randomBuffer);
  return min + ((randomBuffer[0] ?? 0) % range);
}

/**
 * Generates a random float within a range.
 * @param min - The minimum value
 * @param max - The maximum value
 * @param decimals - The number of decimal places (default: 2)
 * @returns A random float
 */
export function randomFloat(min: number, max: number, decimals: number = 2): number {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(decimals));
}

/**
 * Generates a random boolean.
 * @param probability - The probability of returning true (default: 0.5)
 * @returns A random boolean
 */
export function randomBoolean(probability: number = 0.5): boolean {
  return Math.random() < probability;
}

/**
 * Picks a random element from an array.
 * @param array - The array to pick from
 * @returns A random element
 */
export function randomElement<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error('Cannot pick from empty array');
  }
  return array[randomInt(0, array.length - 1)]!;
}

/**
 * Picks multiple random elements from an array.
 * @param array - The array to pick from
 * @param count - The number of elements to pick
 * @param allowDuplicates - Whether to allow the same element to be picked multiple times (default: false)
 * @returns An array of random elements
 */
export function randomElements<T>(
  array: T[],
  count: number,
  allowDuplicates: boolean = false
): T[] {
  if (array.length === 0) {
    return [];
  }

  if (allowDuplicates) {
    const result: T[] = [];
    for (let i = 0; i < count; i++) {
      result.push(randomElement(array));
    }
    return result;
  }

  if (count >= array.length) {
    return shuffle([...array]);
  }

  const shuffled = shuffle([...array]);
  return shuffled.slice(0, count);
}

/**
 * Shuffles an array randomly (Fisher-Yates algorithm).
 * @param array - The array to shuffle
 * @returns A new shuffled array
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

/**
 * Generates a random color in hexadecimal format.
 * @returns A hex color string (e.g., '#ff5733')
 */
export function randomColor(): string {
  return '#' + randomHex(6);
}

/**
 * Generates a random RGB color.
 * @returns An object with r, g, b values
 */
export function randomRgb(): { r: number; g: number; b: number } {
  return {
    r: randomInt(0, 255),
    g: randomInt(0, 255),
    b: randomInt(0, 255),
  };
}

/**
 * Generates a random HSL color.
 * @returns An object with h, s, l values
 */
export function randomHsl(): { h: number; s: number; l: number } {
  return {
    h: randomInt(0, 360),
    s: randomInt(0, 100),
    l: randomInt(0, 100),
  };
}

/**
 * Generates a random date within a range.
 * @param start - The start date
 * @param end - The end date
 * @returns A random date
 */
export function randomDate(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = randomInt(startTime, endTime);
  return new Date(randomTime);
}

/**
 * Generates a random email address.
 * @param domain - The email domain (default: 'example.com')
 * @returns A random email address
 */
export function randomEmail(domain: string = 'example.com'): string {
  const username = randomString(8, 'abcdefghijklmnopqrstuvwxyz0123456789');
  return `${username}@${domain}`;
}

/**
 * Generates a cryptographically secure random bytes.
 * @param length - The number of bytes
 * @returns A Uint8Array of random bytes
 */
export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Generates a random phone number.
 * @param format - The format pattern (default: '(###) ###-####')
 * @returns A random phone number
 */
export function randomPhoneNumber(format: string = '(###) ###-####'): string {
  return format.replace(/#/g, () => randomInt(0, 9).toString());
}

/**
 * Generates a random IP address (IPv4).
 * @returns A random IPv4 address
 */
export function randomIpAddress(): string {
  return Array.from({ length: 4 }, () => randomInt(0, 255)).join('.');
}

/**
 * Generates a nano ID (URL-friendly unique string identifier).
 * @param size - The length of the ID (default: 21)
 * @returns A nano ID string
 */
export function nanoId(size: number = 21): string {
  const alphabet = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';
  return randomString(size, alphabet);
}

/**
 * Generates a slug-friendly random string.
 * @param length - The length of the slug (default: 8)
 * @returns A slug-friendly string
 */
export function randomSlug(length: number = 8): string {
  return randomString(length, 'abcdefghijklmnopqrstuvwxyz0123456789');
}
