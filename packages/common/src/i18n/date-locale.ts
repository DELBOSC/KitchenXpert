/**
 * Date locale formatting utilities
 */

/**
 * Date format style options
 */
export type DateFormatStyle = 'full' | 'long' | 'medium' | 'short';

/**
 * Options for date formatting
 */
export interface DateFormatOptions {
  /** Date style (full, long, medium, short) */
  dateStyle?: DateFormatStyle;
  /** Time style (full, long, medium, short) */
  timeStyle?: DateFormatStyle;
  /** Time zone to use */
  timeZone?: string;
  /** Whether to use 12-hour time format */
  hour12?: boolean;
  /** Weekday format */
  weekday?: 'long' | 'short' | 'narrow';
  /** Year format */
  year?: 'numeric' | '2-digit';
  /** Month format */
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  /** Day format */
  day?: 'numeric' | '2-digit';
  /** Hour format */
  hour?: 'numeric' | '2-digit';
  /** Minute format */
  minute?: 'numeric' | '2-digit';
  /** Second format */
  second?: 'numeric' | '2-digit';
}

/**
 * Relative time unit
 */
export type RelativeTimeUnit = 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second';

/**
 * Default locale for date formatting
 */
let defaultLocale = 'en-US';

/**
 * Sets the default locale for date formatting
 * @param locale - The locale code (e.g., 'en-US', 'fr-FR')
 */
export function setDateLocale(locale: string): void {
  defaultLocale = locale;
}

/**
 * Gets the current default date locale
 * @returns The current locale code
 */
export function getDateLocale(): string {
  return defaultLocale;
}

/**
 * Formats a date according to locale conventions
 * @param date - The date to format
 * @param options - Formatting options
 * @param locale - Optional locale override
 * @returns The formatted date string
 */
export function formatDate(
  date: Date | number | string,
  options: DateFormatOptions = {},
  locale?: string
): string {
  const targetLocale = locale ?? defaultLocale;
  const dateObj = date instanceof Date ? date : new Date(date);

  const formatter = new Intl.DateTimeFormat(targetLocale, options as Intl.DateTimeFormatOptions);
  return formatter.format(dateObj);
}

/**
 * Formats a date with a predefined style
 * @param date - The date to format
 * @param style - The format style
 * @param locale - Optional locale override
 * @returns The formatted date string
 */
export function formatDateStyle(
  date: Date | number | string,
  style: DateFormatStyle = 'medium',
  locale?: string
): string {
  return formatDate(date, { dateStyle: style }, locale);
}

/**
 * Formats a time with a predefined style
 * @param date - The date/time to format
 * @param style - The format style
 * @param locale - Optional locale override
 * @returns The formatted time string
 */
export function formatTimeStyle(
  date: Date | number | string,
  style: DateFormatStyle = 'short',
  locale?: string
): string {
  return formatDate(date, { timeStyle: style }, locale);
}

/**
 * Formats both date and time
 * @param date - The date/time to format
 * @param dateStyle - The date format style
 * @param timeStyle - The time format style
 * @param locale - Optional locale override
 * @returns The formatted date and time string
 */
export function formatDateTime(
  date: Date | number | string,
  dateStyle: DateFormatStyle = 'medium',
  timeStyle: DateFormatStyle = 'short',
  locale?: string
): string {
  return formatDate(date, { dateStyle, timeStyle }, locale);
}

/**
 * Formats a relative time (e.g., "2 days ago", "in 3 hours")
 * @param value - The numeric value
 * @param unit - The time unit
 * @param locale - Optional locale override
 * @returns The formatted relative time string
 */
export function formatRelativeTime(value: number, unit: RelativeTimeUnit, locale?: string): string {
  const targetLocale = locale ?? defaultLocale;
  const formatter = new Intl.RelativeTimeFormat(targetLocale, { numeric: 'auto' });
  return formatter.format(value, unit);
}

/**
 * Gets the relative time from a date compared to now
 * @param date - The date to compare
 * @param locale - Optional locale override
 * @returns The formatted relative time string
 */
export function getRelativeTimeFromNow(date: Date | number | string, locale?: string): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);
  const diffWeeks = Math.round(diffDays / 7);
  const diffMonths = Math.round(diffDays / 30);
  const diffYears = Math.round(diffDays / 365);

  if (Math.abs(diffSeconds) < 60) {
    return formatRelativeTime(diffSeconds, 'second', locale);
  } else if (Math.abs(diffMinutes) < 60) {
    return formatRelativeTime(diffMinutes, 'minute', locale);
  } else if (Math.abs(diffHours) < 24) {
    return formatRelativeTime(diffHours, 'hour', locale);
  } else if (Math.abs(diffDays) < 7) {
    return formatRelativeTime(diffDays, 'day', locale);
  } else if (Math.abs(diffWeeks) < 4) {
    return formatRelativeTime(diffWeeks, 'week', locale);
  } else if (Math.abs(diffMonths) < 12) {
    return formatRelativeTime(diffMonths, 'month', locale);
  } else {
    return formatRelativeTime(diffYears, 'year', locale);
  }
}

/**
 * Gets localized month names
 * @param format - The month format
 * @param locale - Optional locale override
 * @returns Array of month names
 */
export function getMonthNames(
  format: 'long' | 'short' | 'narrow' = 'long',
  locale?: string
): string[] {
  const targetLocale = locale ?? defaultLocale;
  const formatter = new Intl.DateTimeFormat(targetLocale, { month: format });
  const months: string[] = [];

  for (let month = 0; month < 12; month++) {
    const date = new Date(2000, month, 1);
    months.push(formatter.format(date));
  }

  return months;
}

/**
 * Gets localized weekday names
 * @param format - The weekday format
 * @param locale - Optional locale override
 * @returns Array of weekday names (starting from Sunday)
 */
export function getWeekdayNames(
  format: 'long' | 'short' | 'narrow' = 'long',
  locale?: string
): string[] {
  const targetLocale = locale ?? defaultLocale;
  const formatter = new Intl.DateTimeFormat(targetLocale, { weekday: format });
  const weekdays: string[] = [];

  // January 2000 starts on a Saturday, so we use January 2nd (Sunday) as base
  for (let day = 2; day <= 8; day++) {
    const date = new Date(2000, 0, day);
    weekdays.push(formatter.format(date));
  }

  return weekdays;
}

/**
 * Gets the first day of the week for a locale (0 = Sunday, 1 = Monday, etc.)
 * @param locale - Optional locale override
 * @returns The first day of the week index
 */
export function getFirstDayOfWeek(locale?: string): number {
  const targetLocale = locale ?? defaultLocale;

  // Common locales that start week on Monday
  const mondayStartLocales = [
    'en-GB',
    'de',
    'de-DE',
    'fr',
    'fr-FR',
    'es',
    'es-ES',
    'it',
    'it-IT',
    'pt',
    'pt-PT',
    'nl',
    'nl-NL',
    'pl',
    'pl-PL',
    'ru',
    'ru-RU',
  ];

  const baseLocale = targetLocale.split('-')[0] ?? '';

  if (
    mondayStartLocales.includes(targetLocale) ||
    (baseLocale && mondayStartLocales.includes(baseLocale))
  ) {
    return 1; // Monday
  }

  return 0; // Sunday (default for en-US and others)
}
