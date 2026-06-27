/**
 * Utilitaires de formatage de dates
 */

const DEFAULT_LOCALE = 'fr-FR';

/**
 * Formate une date selon un format prédéfini
 */
export function formatDate(
  date: Date | string | number,
  format: DateFormat = 'medium',
  locale = DEFAULT_LOCALE
): string {
  const d = toDate(date);
  if (!d) return '';

  const options = DATE_FORMAT_OPTIONS[format];
  return new Intl.DateTimeFormat(locale, options).format(d);
}

export type DateFormat = 'short' | 'medium' | 'long' | 'full' | 'time' | 'datetime';

const DATE_FORMAT_OPTIONS: Record<DateFormat, Intl.DateTimeFormatOptions> = {
  short: { day: '2-digit', month: '2-digit', year: '2-digit' },
  medium: { day: 'numeric', month: 'short', year: 'numeric' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
  full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  time: { hour: '2-digit', minute: '2-digit' },
  datetime: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
};

/**
 * Formate une date relative (il y a 5 minutes, dans 2 jours, etc.)
 */
export function formatRelativeTime(date: Date | string | number, locale = DEFAULT_LOCALE): string {
  const d = toDate(date);
  if (!d) return '';

  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffWeek = Math.round(diffDay / 7);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffSec) < 60) {
    return rtf.format(diffSec, 'second');
  }
  if (Math.abs(diffMin) < 60) {
    return rtf.format(diffMin, 'minute');
  }
  if (Math.abs(diffHour) < 24) {
    return rtf.format(diffHour, 'hour');
  }
  if (Math.abs(diffDay) < 7) {
    return rtf.format(diffDay, 'day');
  }
  if (Math.abs(diffWeek) < 4) {
    return rtf.format(diffWeek, 'week');
  }
  if (Math.abs(diffMonth) < 12) {
    return rtf.format(diffMonth, 'month');
  }
  return rtf.format(diffYear, 'year');
}

/**
 * Formate une durée en secondes
 */
export function formatDuration(seconds: number, options?: DurationFormatOptions): string {
  const { showSeconds = true, padZeros = true, separator = ':' } = options || {};

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(padZeros ? String(hours).padStart(2, '0') : String(hours));
  }

  parts.push(padZeros ? String(minutes).padStart(2, '0') : String(minutes));

  if (showSeconds) {
    parts.push(padZeros ? String(secs).padStart(2, '0') : String(secs));
  }

  return parts.join(separator);
}

export interface DurationFormatOptions {
  showSeconds?: boolean;
  padZeros?: boolean;
  separator?: string;
}

/**
 * Formate une plage de dates
 */
export function formatDateRange(
  start: Date | string | number,
  end: Date | string | number,
  locale = DEFAULT_LOCALE
): string {
  const startDate = toDate(start);
  const endDate = toDate(end);

  if (!startDate || !endDate) return '';

  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const sameMonth = sameYear && startDate.getMonth() === endDate.getMonth();
  const sameDay = sameMonth && startDate.getDate() === endDate.getDate();

  if (sameDay) {
    return formatDate(startDate, 'long', locale);
  }

  if (sameMonth) {
    const day1 = startDate.getDate();
    const day2 = endDate.getDate();
    const monthYear = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
      startDate
    );
    return `${day1} - ${day2} ${monthYear}`;
  }

  if (sameYear) {
    const fmt1 = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(
      startDate
    );
    const fmt2 = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(endDate);
    return `${fmt1} - ${fmt2}`;
  }

  return `${formatDate(startDate, 'medium', locale)} - ${formatDate(endDate, 'medium', locale)}`;
}

/**
 * Vérifie si une date est aujourd'hui
 */
export function isToday(date: Date | string | number): boolean {
  const d = toDate(date);
  if (!d) return false;

  const today = new Date();
  return isSameDay(d, today);
}

/**
 * Vérifie si une date est hier
 */
export function isYesterday(date: Date | string | number): boolean {
  const d = toDate(date);
  if (!d) return false;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(d, yesterday);
}

/**
 * Vérifie si une date est demain
 */
export function isTomorrow(date: Date | string | number): boolean {
  const d = toDate(date);
  if (!d) return false;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(d, tomorrow);
}

/**
 * Vérifie si deux dates sont le même jour
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Formate une date pour affichage intelligent
 */
export function formatSmartDate(date: Date | string | number, locale = DEFAULT_LOCALE): string {
  const d = toDate(date);
  if (!d) return '';

  if (isToday(d)) {
    return `Aujourd'hui à ${formatDate(d, 'time', locale)}`;
  }

  if (isYesterday(d)) {
    return `Hier à ${formatDate(d, 'time', locale)}`;
  }

  if (isTomorrow(d)) {
    return `Demain à ${formatDate(d, 'time', locale)}`;
  }

  const now = new Date();
  const diffDays = Math.abs(Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  if (diffDays < 7) {
    const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d);
    return `${weekday} à ${formatDate(d, 'time', locale)}`;
  }

  return formatDate(d, 'datetime', locale);
}

/**
 * Convertit une valeur en Date
 */
function toDate(value: Date | string | number): Date | null {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Formate un timestamp ISO
 */
export function formatISODate(date: Date | string | number): string {
  const d = toDate(date);
  return d ? d.toISOString() : '';
}

/**
 * Parse une date depuis un string ISO
 */
export function parseISODate(isoString: string): Date | null {
  return toDate(isoString);
}
