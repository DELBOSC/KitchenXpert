/**
 * Date Conversion Utilities
 * Provides utility functions for converting dates between formats.
 */

import { DateInput, normalizeDate } from './date-comparison';

/**
 * Converts a date to a Unix timestamp (seconds since epoch).
 * @param date - The date to convert
 * @returns The Unix timestamp in seconds
 */
export function toTimestamp(date: DateInput): number {
  return Math.floor(normalizeDate(date).getTime() / 1000);
}

/**
 * Converts a Unix timestamp (seconds) to a Date object.
 * @param timestamp - The Unix timestamp in seconds
 * @returns A Date object
 */
export function fromTimestamp(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/**
 * Converts a date to milliseconds since epoch.
 * @param date - The date to convert
 * @returns The timestamp in milliseconds
 */
export function toMilliseconds(date: DateInput): number {
  return normalizeDate(date).getTime();
}

/**
 * Converts milliseconds since epoch to a Date object.
 * @param ms - The timestamp in milliseconds
 * @returns A Date object
 */
export function fromMilliseconds(ms: number): Date {
  return new Date(ms);
}

/**
 * Converts a date to an ISO 8601 string.
 * @param date - The date to convert
 * @returns The ISO 8601 string
 */
export function toISOString(date: DateInput): string {
  return normalizeDate(date).toISOString();
}

/**
 * Converts a date to an ISO date string (YYYY-MM-DD).
 * @param date - The date to convert
 * @returns The ISO date string
 */
export function toISODateString(date: DateInput): string {
  const d = normalizeDate(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts a date to an ISO time string (HH:mm:ss).
 * @param date - The date to convert
 * @returns The ISO time string
 */
export function toISOTimeString(date: DateInput): string {
  const d = normalizeDate(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Converts a date to a UTC date.
 * @param date - The date to convert
 * @returns A new Date object in UTC
 */
export function toUTC(date: DateInput): Date {
  const d = normalizeDate(date);
  return new Date(
    Date.UTC(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      d.getHours(),
      d.getMinutes(),
      d.getSeconds(),
      d.getMilliseconds()
    )
  );
}

/**
 * Converts a UTC date to local time.
 * @param date - The UTC date to convert
 * @returns A new Date object in local time
 */
export function fromUTC(date: DateInput): Date {
  const d = normalizeDate(date);
  return new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
    d.getUTCMilliseconds()
  );
}

/**
 * Converts a date to a specific timezone offset.
 * @param date - The date to convert
 * @param offsetMinutes - The timezone offset in minutes
 * @returns A new Date object with the timezone offset applied
 */
export function toTimezone(date: DateInput, offsetMinutes: number): Date {
  const d = normalizeDate(date);
  const localOffset = d.getTimezoneOffset();
  const diff = offsetMinutes - localOffset;
  return new Date(d.getTime() + diff * 60 * 1000);
}

/**
 * Extracts date components from a date.
 * @param date - The date to extract components from
 * @returns An object with date components
 */
export function toDateComponents(date: DateInput): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
  dayOfWeek: number;
  dayOfYear: number;
  weekNumber: number;
  quarter: number;
} {
  const d = normalizeDate(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  // Calculate day of year
  const startOfYear = new Date(year, 0, 1);
  const diff = d.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;

  // Calculate week number (ISO 8601)
  const tempDate = new Date(d.getTime());
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
  const yearStart = new Date(tempDate.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((tempDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  // Calculate quarter
  const quarter = Math.ceil(month / 3);

  return {
    year,
    month,
    day,
    hours: d.getHours(),
    minutes: d.getMinutes(),
    seconds: d.getSeconds(),
    milliseconds: d.getMilliseconds(),
    dayOfWeek: d.getDay(),
    dayOfYear,
    weekNumber,
    quarter,
  };
}

/**
 * Creates a Date from date components.
 * @param components - The date components
 * @returns A Date object
 */
export function fromDateComponents(components: {
  year: number;
  month: number;
  day?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}): Date {
  return new Date(
    components.year,
    components.month - 1,
    components.day ?? 1,
    components.hours ?? 0,
    components.minutes ?? 0,
    components.seconds ?? 0,
    components.milliseconds ?? 0
  );
}

/**
 * Converts a date to a relative time string.
 * @param date - The date to convert
 * @param baseDate - The base date for comparison (default: now)
 * @returns A relative time string (e.g., '2 hours ago', 'in 3 days')
 */
export function toRelativeTime(date: DateInput, baseDate: DateInput = new Date()): string {
  const d = normalizeDate(date);
  const base = normalizeDate(baseDate);
  const diffMs = d.getTime() - base.getTime();
  const absDiffMs = Math.abs(diffMs);
  const isPast = diffMs < 0;

  const seconds = Math.floor(absDiffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  let value: number;
  let unit: string;

  if (seconds < 60) {
    value = seconds;
    unit = seconds === 1 ? 'second' : 'seconds';
  } else if (minutes < 60) {
    value = minutes;
    unit = minutes === 1 ? 'minute' : 'minutes';
  } else if (hours < 24) {
    value = hours;
    unit = hours === 1 ? 'hour' : 'hours';
  } else if (days < 7) {
    value = days;
    unit = days === 1 ? 'day' : 'days';
  } else if (weeks < 4) {
    value = weeks;
    unit = weeks === 1 ? 'week' : 'weeks';
  } else if (months < 12) {
    value = months;
    unit = months === 1 ? 'month' : 'months';
  } else {
    value = years;
    unit = years === 1 ? 'year' : 'years';
  }

  if (isPast) {
    return value === 0 ? 'just now' : `${value} ${unit} ago`;
  }
  return `in ${value} ${unit}`;
}

/**
 * Converts a date to a locale date string.
 * @param date - The date to convert
 * @param locale - The locale to use (default: 'en-US')
 * @param options - Intl.DateTimeFormat options
 * @returns The formatted date string
 */
export function toLocaleString(
  date: DateInput,
  locale: string = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  return normalizeDate(date).toLocaleString(locale, options);
}

/**
 * Parses a date string in various formats.
 * @param dateString - The date string to parse
 * @param format - The expected format (optional)
 * @returns A Date object or null if parsing fails
 */
export function parseDate(dateString: string, format?: string): Date | null {
  if (!format) {
    // Try native parsing first
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    return null;
  }

  // Simple format parsing for common patterns
  const formatPatterns: Record<string, RegExp> = {
    'YYYY-MM-DD': /^(\d{4})-(\d{2})-(\d{2})$/,
    'DD/MM/YYYY': /^(\d{2})\/(\d{2})\/(\d{4})$/,
    'MM/DD/YYYY': /^(\d{2})\/(\d{2})\/(\d{4})$/,
    'DD-MM-YYYY': /^(\d{2})-(\d{2})-(\d{4})$/,
  };

  const pattern = formatPatterns[format];
  if (!pattern) {
    return null;
  }

  const match = dateString.match(pattern);
  if (!match) {
    return null;
  }

  let year: number, month: number, day: number;

  switch (format) {
    case 'YYYY-MM-DD':
      [, year, month, day] = match.map(Number) as [number, number, number, number];
      break;
    case 'DD/MM/YYYY':
    case 'DD-MM-YYYY':
      [, day, month, year] = match.map(Number) as [number, number, number, number];
      break;
    case 'MM/DD/YYYY':
      [, month, day, year] = match.map(Number) as [number, number, number, number];
      break;
    default:
      return null;
  }

  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * Converts a duration in milliseconds to a human-readable string.
 * @param ms - The duration in milliseconds
 * @returns A human-readable duration string
 */
export function msToDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours % 24 > 0) {
    parts.push(`${hours % 24}h`);
  }
  if (minutes % 60 > 0) {
    parts.push(`${minutes % 60}m`);
  }
  if (seconds % 60 > 0 || parts.length === 0) {
    parts.push(`${seconds % 60}s`);
  }

  return parts.join(' ');
}

/**
 * Converts hours, minutes, and seconds to milliseconds.
 * @param hours - The hours
 * @param minutes - The minutes
 * @param seconds - The seconds
 * @returns The total milliseconds
 */
export function hmsToMs(hours: number, minutes: number, seconds: number): number {
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}
