/**
 * Localized Date Formats for KitchenXpert
 *
 * Purpose:
 * - Provide locale-specific date formatting
 * - Support multiple date format styles (short, medium, long, full)
 * - Include time formatting and relative time
 * - Use date-fns for consistent formatting
 *
 * Usage:
 * - Format date: formatDate(new Date(), 'short', 'fr-FR')
 * - Format time: formatTime(new Date(), 'medium', 'fr-FR')
 * - Relative time: formatRelativeTime(date, 'fr-FR')
 *
 * @see https://date-fns.org/docs/
 */

import { format, formatRelative, formatDistance, isToday, isYesterday } from 'date-fns';
import { fr, enUS, de, es, it } from 'date-fns/locale';

// ============================================================
// Locale Map
// ============================================================

const LOCALE_MAP = {
  'fr-FR': fr,
  'en-US': enUS,
  'de-DE': de,
  'es-ES': es,
  'it-IT': it,
};

// ============================================================
// Date Format Patterns
// ============================================================

export const DATE_FORMATS = {
  'fr-FR': {
    short: 'dd/MM/yyyy',         // 10/01/2026
    medium: 'd MMM yyyy',        // 10 janv. 2026
    long: 'd MMMM yyyy',         // 10 janvier 2026
    full: 'EEEE d MMMM yyyy',    // vendredi 10 janvier 2026
    numeric: 'dd/MM/yy',         // 10/01/26
    iso: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx", // ISO 8601
  },
  'en-US': {
    short: 'MM/dd/yyyy',         // 01/10/2026
    medium: 'MMM d, yyyy',       // Jan 10, 2026
    long: 'MMMM d, yyyy',        // January 10, 2026
    full: 'EEEE, MMMM d, yyyy',  // Friday, January 10, 2026
    numeric: 'MM/dd/yy',         // 01/10/26
    iso: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  },
  'de-DE': {
    short: 'dd.MM.yyyy',         // 10.01.2026
    medium: 'd. MMM yyyy',       // 10. Jan. 2026
    long: 'd. MMMM yyyy',        // 10. Januar 2026
    full: 'EEEE, d. MMMM yyyy',  // Freitag, 10. Januar 2026
    numeric: 'dd.MM.yy',         // 10.01.26
    iso: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  },
  'es-ES': {
    short: 'dd/MM/yyyy',         // 10/01/2026
    medium: 'd MMM yyyy',        // 10 ene. 2026
    long: 'd \'de\' MMMM \'de\' yyyy', // 10 de enero de 2026
    full: 'EEEE, d \'de\' MMMM \'de\' yyyy', // viernes, 10 de enero de 2026
    numeric: 'dd/MM/yy',         // 10/01/26
    iso: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  },
  'it-IT': {
    short: 'dd/MM/yyyy',         // 10/01/2026
    medium: 'd MMM yyyy',        // 10 gen 2026
    long: 'd MMMM yyyy',         // 10 gennaio 2026
    full: 'EEEE d MMMM yyyy',    // venerdì 10 gennaio 2026
    numeric: 'dd/MM/yy',         // 10/01/26
    iso: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  },
};

// ============================================================
// Time Format Patterns
// ============================================================

export const TIME_FORMATS = {
  'fr-FR': {
    short: 'HH:mm',              // 14:30
    medium: 'HH:mm:ss',          // 14:30:45
    long: 'HH:mm:ss z',          // 14:30:45 GMT+1
    full: 'HH:mm:ss zzzz',       // 14:30:45 heure normale d'Europe centrale
  },
  'en-US': {
    short: 'h:mm a',             // 2:30 PM
    medium: 'h:mm:ss a',         // 2:30:45 PM
    long: 'h:mm:ss a z',         // 2:30:45 PM GMT+1
    full: 'h:mm:ss a zzzz',      // 2:30:45 PM Central European Standard Time
  },
  'de-DE': {
    short: 'HH:mm',              // 14:30
    medium: 'HH:mm:ss',          // 14:30:45
    long: 'HH:mm:ss z',          // 14:30:45 GMT+1
    full: 'HH:mm:ss zzzz',       // 14:30:45 Mitteleuropäische Normalzeit
  },
  'es-ES': {
    short: 'HH:mm',              // 14:30
    medium: 'HH:mm:ss',          // 14:30:45
    long: 'HH:mm:ss z',          // 14:30:45 GMT+1
    full: 'HH:mm:ss zzzz',       // 14:30:45 hora estándar de Europa central
  },
  'it-IT': {
    short: 'HH:mm',              // 14:30
    medium: 'HH:mm:ss',          // 14:30:45
    long: 'HH:mm:ss z',          // 14:30:45 GMT+1
    full: 'HH:mm:ss zzzz',       // 14:30:45 Ora standard dell'Europa centrale
  },
};

// ============================================================
// DateTime Format Patterns
// ============================================================

export const DATETIME_FORMATS = {
  'fr-FR': {
    short: 'dd/MM/yyyy HH:mm',
    medium: 'd MMM yyyy HH:mm',
    long: 'd MMMM yyyy HH:mm:ss',
    full: 'EEEE d MMMM yyyy HH:mm:ss',
  },
  'en-US': {
    short: 'MM/dd/yyyy h:mm a',
    medium: 'MMM d, yyyy h:mm a',
    long: 'MMMM d, yyyy h:mm:ss a',
    full: 'EEEE, MMMM d, yyyy h:mm:ss a',
  },
  'de-DE': {
    short: 'dd.MM.yyyy HH:mm',
    medium: 'd. MMM yyyy HH:mm',
    long: 'd. MMMM yyyy HH:mm:ss',
    full: 'EEEE, d. MMMM yyyy HH:mm:ss',
  },
  'es-ES': {
    short: 'dd/MM/yyyy HH:mm',
    medium: 'd MMM yyyy HH:mm',
    long: 'd \'de\' MMMM \'de\' yyyy HH:mm:ss',
    full: 'EEEE, d \'de\' MMMM \'de\' yyyy HH:mm:ss',
  },
  'it-IT': {
    short: 'dd/MM/yyyy HH:mm',
    medium: 'd MMM yyyy HH:mm',
    long: 'd MMMM yyyy HH:mm:ss',
    full: 'EEEE d MMMM yyyy HH:mm:ss',
  },
};

// ============================================================
// Formatting Functions
// ============================================================

export const formatDate = (date, style = 'medium', locale = 'fr-FR') => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const pattern = DATE_FORMATS[locale]?.[style] || DATE_FORMATS['fr-FR'][style];
  const localeObj = LOCALE_MAP[locale] || LOCALE_MAP['fr-FR'];
  return format(dateObj, pattern, { locale: localeObj });
};

export const formatTime = (date, style = 'short', locale = 'fr-FR') => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const pattern = TIME_FORMATS[locale]?.[style] || TIME_FORMATS['fr-FR'][style];
  const localeObj = LOCALE_MAP[locale] || LOCALE_MAP['fr-FR'];
  return format(dateObj, pattern, { locale: localeObj });
};

export const formatDateTime = (date, style = 'medium', locale = 'fr-FR') => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const pattern = DATETIME_FORMATS[locale]?.[style] || DATETIME_FORMATS['fr-FR'][style];
  const localeObj = LOCALE_MAP[locale] || LOCALE_MAP['fr-FR'];
  return format(dateObj, pattern, { locale: localeObj });
};

export const formatRelativeTime = (date, locale = 'fr-FR') => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const localeObj = LOCALE_MAP[locale] || LOCALE_MAP['fr-FR'];
  return formatRelative(dateObj, new Date(), { locale: localeObj });
};

export const formatDistanceToNow = (date, locale = 'fr-FR', addSuffix = true) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const localeObj = LOCALE_MAP[locale] || LOCALE_MAP['fr-FR'];
  return formatDistance(dateObj, new Date(), { locale: localeObj, addSuffix });
};

export const formatSmartDate = (date, locale = 'fr-FR') => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const labels = {
    'fr-FR': { today: "Aujourd'hui", yesterday: 'Hier' },
    'en-US': { today: 'Today', yesterday: 'Yesterday' },
    'de-DE': { today: 'Heute', yesterday: 'Gestern' },
    'es-ES': { today: 'Hoy', yesterday: 'Ayer' },
    'it-IT': { today: 'Oggi', yesterday: 'Ieri' },
  };
  const localeLabels = labels[locale] || labels['fr-FR'];
  if (isToday(dateObj)) return localeLabels.today;
  if (isYesterday(dateObj)) return localeLabels.yesterday;
  return formatDate(dateObj, 'short', locale);
};

export default {
  DATE_FORMATS,
  TIME_FORMATS,
  DATETIME_FORMATS,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatDistanceToNow,
  formatSmartDate,
};
