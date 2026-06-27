/**
 * RTL (right-to-left) language helpers
 */

/**
 * Text direction
 */
export type TextDirection = 'ltr' | 'rtl';

/**
 * List of RTL language codes
 */
export const RTL_LANGUAGES: ReadonlySet<string> = new Set([
  'ar', // Arabic
  'arc', // Aramaic
  'arz', // Egyptian Arabic
  'az', // Azerbaijani (when written in Arabic script)
  'ckb', // Central Kurdish (Sorani)
  'dv', // Divehi/Maldivian
  'fa', // Persian/Farsi
  'he', // Hebrew
  'iw', // Hebrew (old code)
  'khw', // Khowar
  'ks', // Kashmiri
  'ku', // Kurdish
  'mzn', // Mazanderani
  'nqo', // N'Ko
  'pnb', // Western Punjabi
  'ps', // Pashto
  'sd', // Sindhi
  'ug', // Uyghur
  'ur', // Urdu
  'yi', // Yiddish
]);

/**
 * Default locale for RTL detection
 */
let defaultLocale = 'en';

/**
 * Sets the default locale for RTL detection
 * @param locale - The locale code
 */
export function setRtlLocale(locale: string): void {
  defaultLocale = locale;
}

/**
 * Gets the current default RTL locale
 * @returns The current locale code
 */
export function getRtlLocale(): string {
  return defaultLocale;
}

/**
 * Extracts the language code from a locale string
 * @param locale - The locale string (e.g., 'ar-SA', 'he-IL')
 * @returns The language code (e.g., 'ar', 'he')
 */
function getLanguageCode(locale: string): string {
  const part1 = locale.split('-')[0] ?? '';
  const part2 = part1.split('_')[0] ?? '';
  return part2.toLowerCase();
}

/**
 * Checks if a locale/language is RTL
 * @param locale - The locale or language code to check
 * @returns True if the language is RTL
 */
export function isRtl(locale?: string): boolean {
  const targetLocale = locale ?? defaultLocale;
  const languageCode = getLanguageCode(targetLocale);
  return RTL_LANGUAGES.has(languageCode);
}

/**
 * Checks if a locale/language is LTR
 * @param locale - The locale or language code to check
 * @returns True if the language is LTR
 */
export function isLtr(locale?: string): boolean {
  return !isRtl(locale);
}

/**
 * Gets the text direction for a locale
 * @param locale - The locale or language code
 * @returns 'rtl' or 'ltr'
 */
export function getDirection(locale?: string): TextDirection {
  return isRtl(locale) ? 'rtl' : 'ltr';
}

/**
 * Gets the opposite direction
 * @param direction - The current direction
 * @returns The opposite direction
 */
export function getOppositeDirection(direction: TextDirection): TextDirection {
  return direction === 'rtl' ? 'ltr' : 'rtl';
}

/**
 * Converts a logical property value to a physical one based on direction
 * @param start - Value for 'start' (left in LTR, right in RTL)
 * @param end - Value for 'end' (right in LTR, left in RTL)
 * @param locale - Optional locale override
 * @returns Object with left and right values
 */
export function logicalToPhysical<T>(start: T, end: T, locale?: string): { left: T; right: T } {
  if (isRtl(locale)) {
    return { left: end, right: start };
  }
  return { left: start, right: end };
}

/**
 * Gets the physical 'start' side based on direction
 * @param locale - Optional locale override
 * @returns 'left' for LTR, 'right' for RTL
 */
export function getStartSide(locale?: string): 'left' | 'right' {
  return isRtl(locale) ? 'right' : 'left';
}

/**
 * Gets the physical 'end' side based on direction
 * @param locale - Optional locale override
 * @returns 'right' for LTR, 'left' for RTL
 */
export function getEndSide(locale?: string): 'left' | 'right' {
  return isRtl(locale) ? 'left' : 'right';
}

/**
 * CSS properties that need to be flipped for RTL
 */
export interface FlippableStyles {
  marginLeft?: string | number;
  marginRight?: string | number;
  paddingLeft?: string | number;
  paddingRight?: string | number;
  left?: string | number;
  right?: string | number;
  borderLeft?: string;
  borderRight?: string;
  borderLeftWidth?: string | number;
  borderRightWidth?: string | number;
  borderLeftColor?: string;
  borderRightColor?: string;
  borderLeftStyle?: string;
  borderRightStyle?: string;
  borderTopLeftRadius?: string | number;
  borderTopRightRadius?: string | number;
  borderBottomLeftRadius?: string | number;
  borderBottomRightRadius?: string | number;
  textAlign?: 'left' | 'right' | 'center' | 'justify' | 'start' | 'end';
  float?: 'left' | 'right' | 'none';
  clear?: 'left' | 'right' | 'both' | 'none';
  transform?: string;
}

/**
 * Flips CSS styles for RTL layout
 * @param styles - The styles to flip
 * @param locale - Optional locale override
 * @returns Flipped styles for RTL or original for LTR
 */
export function flipStyles(styles: FlippableStyles, locale?: string): FlippableStyles {
  if (!isRtl(locale)) {
    return styles;
  }

  const flipped: FlippableStyles = { ...styles };

  // Swap left/right margins
  if ('marginLeft' in styles || 'marginRight' in styles) {
    flipped.marginLeft = styles.marginRight;
    flipped.marginRight = styles.marginLeft;
  }

  // Swap left/right padding
  if ('paddingLeft' in styles || 'paddingRight' in styles) {
    flipped.paddingLeft = styles.paddingRight;
    flipped.paddingRight = styles.paddingLeft;
  }

  // Swap left/right positions
  if ('left' in styles || 'right' in styles) {
    flipped.left = styles.right;
    flipped.right = styles.left;
  }

  // Swap borders
  if ('borderLeft' in styles || 'borderRight' in styles) {
    flipped.borderLeft = styles.borderRight;
    flipped.borderRight = styles.borderLeft;
  }

  if ('borderLeftWidth' in styles || 'borderRightWidth' in styles) {
    flipped.borderLeftWidth = styles.borderRightWidth;
    flipped.borderRightWidth = styles.borderLeftWidth;
  }

  if ('borderLeftColor' in styles || 'borderRightColor' in styles) {
    flipped.borderLeftColor = styles.borderRightColor;
    flipped.borderRightColor = styles.borderLeftColor;
  }

  if ('borderLeftStyle' in styles || 'borderRightStyle' in styles) {
    flipped.borderLeftStyle = styles.borderRightStyle;
    flipped.borderRightStyle = styles.borderLeftStyle;
  }

  // Swap border radii
  if ('borderTopLeftRadius' in styles || 'borderTopRightRadius' in styles) {
    flipped.borderTopLeftRadius = styles.borderTopRightRadius;
    flipped.borderTopRightRadius = styles.borderTopLeftRadius;
  }

  if ('borderBottomLeftRadius' in styles || 'borderBottomRightRadius' in styles) {
    flipped.borderBottomLeftRadius = styles.borderBottomRightRadius;
    flipped.borderBottomRightRadius = styles.borderBottomLeftRadius;
  }

  // Flip text-align
  if (styles.textAlign === 'left') {
    flipped.textAlign = 'right';
  } else if (styles.textAlign === 'right') {
    flipped.textAlign = 'left';
  }

  // Flip float
  if (styles.float === 'left') {
    flipped.float = 'right';
  } else if (styles.float === 'right') {
    flipped.float = 'left';
  }

  // Flip clear
  if (styles.clear === 'left') {
    flipped.clear = 'right';
  } else if (styles.clear === 'right') {
    flipped.clear = 'left';
  }

  return flipped;
}

/**
 * Sets the document direction attribute
 * @param locale - Optional locale override
 */
export function setDocumentDirection(locale?: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  const direction = getDirection(locale);
  document.documentElement.setAttribute('dir', direction);
  document.documentElement.setAttribute('lang', locale ?? defaultLocale);
}

/**
 * Gets the current document direction
 * @returns The document direction or undefined if not in browser
 */
export function getDocumentDirection(): TextDirection | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const dir = document.documentElement.getAttribute('dir');
  return dir === 'rtl' ? 'rtl' : 'ltr';
}

/**
 * Creates a CSS class name with direction suffix
 * @param baseName - The base class name
 * @param locale - Optional locale override
 * @returns Class name with -ltr or -rtl suffix
 */
export function directionClass(baseName: string, locale?: string): string {
  const direction = getDirection(locale);
  return `${baseName}-${direction}`;
}

/**
 * Returns one of two values based on text direction
 * @param ltrValue - Value to use for LTR
 * @param rtlValue - Value to use for RTL
 * @param locale - Optional locale override
 * @returns The appropriate value based on direction
 */
export function directionValue<T>(ltrValue: T, rtlValue: T, locale?: string): T {
  return isRtl(locale) ? rtlValue : ltrValue;
}

/**
 * Adds directional Unicode markers to text
 * @param text - The text to mark
 * @param direction - The desired direction
 * @returns Text with directional markers
 */
export function addDirectionalMarkers(text: string, direction: TextDirection): string {
  const LRM = '\u200E'; // Left-to-right mark
  const RLM = '\u200F'; // Right-to-left mark

  if (direction === 'rtl') {
    return `${RLM}${text}${RLM}`;
  }
  return `${LRM}${text}${LRM}`;
}

/**
 * Wraps text in directional isolation
 * @param text - The text to isolate
 * @param direction - The direction of the text
 * @returns Text wrapped with isolate characters
 */
export function isolateText(text: string, direction: TextDirection): string {
  // Unicode directional characters
  // const FSI = '\u2068'; // First strong isolate (unused, kept for reference)
  const PDI = '\u2069'; // Pop directional isolate
  const LRI = '\u2066'; // Left-to-right isolate
  const RLI = '\u2067'; // Right-to-left isolate

  if (direction === 'rtl') {
    return `${RLI}${text}${PDI}`;
  }
  return `${LRI}${text}${PDI}`;
}
