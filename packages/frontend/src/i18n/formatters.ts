/**
 * Localised formatters — thin wrappers around `Intl.*` with locale
 * picked from the current i18next language.
 *
 * Why hooks instead of plain functions :
 *   - The locale changes at runtime (LanguageSwitcher), and React
 *     components need to re-render when it does. Hooks subscribe to
 *     i18n.language for free.
 *   - Calling `Intl.NumberFormat` on every render is fine perf-wise
 *     (memoized internally by the engine), but we memoize once per
 *     locale for clarity.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { SupportedLanguage } from './i18n';

const LOCALE_MAP: Record<SupportedLanguage, string> = {
  fr: 'fr-FR',
  en: 'en-US',
};

function intlLocale(lang: string): string {
  return LOCALE_MAP[lang as SupportedLanguage] ?? lang;
}

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

export function useFormatNumber(): (n: number, opts?: Intl.NumberFormatOptions) => string {
  const { i18n } = useTranslation();
  const formatter = useMemo(
    () => new Intl.NumberFormat(intlLocale(i18n.language)),
    [i18n.language]
  );
  return (n, opts) =>
    opts ? new Intl.NumberFormat(intlLocale(i18n.language), opts).format(n) : formatter.format(n);
}

// ---------------------------------------------------------------------------
// Currency — supports EUR / USD / GBP. Locale defaults:
//   fr → EUR
//   en → EUR if browser locale is en-GB/en-IE/en-FR/etc., USD otherwise.
//
// The user can override via `useUserCurrency()` (cookie-backed) later
// when we ship a settings page — for now we use the locale default.
// ---------------------------------------------------------------------------

const DEFAULT_CURRENCY_BY_LANG: Record<SupportedLanguage, string> = {
  fr: 'EUR',
  en: 'EUR', // sensible default since the product targets EU first
};

function detectCurrency(language: string): string {
  // Cookie override would land here.
  return DEFAULT_CURRENCY_BY_LANG[language as SupportedLanguage] ?? 'EUR';
}

export function useFormatCurrency(): (amount: number, currency?: string) => string {
  const { i18n } = useTranslation();
  return (amount, currency) =>
    new Intl.NumberFormat(intlLocale(i18n.language), {
      style: 'currency',
      currency: currency ?? detectCurrency(i18n.language),
      maximumFractionDigits: amount >= 100 ? 0 : 2,
    }).format(amount);
}

// ---------------------------------------------------------------------------
// Dates — guard against the FR/US format ambiguity.
//
// Default = `medium` style: "9 mai 2026" vs "May 9, 2026" — unambiguous.
// `short` is shipped behind a kwarg for tables where space matters.
// ---------------------------------------------------------------------------

export function useFormatDate(): (
  d: Date | string | number,
  style?: 'short' | 'medium' | 'long'
) => string {
  const { i18n } = useTranslation();
  return (d, style = 'medium') => {
    const date = d instanceof Date ? d : new Date(d);
    return new Intl.DateTimeFormat(intlLocale(i18n.language), {
      dateStyle: style,
    }).format(date);
  };
}

// ---------------------------------------------------------------------------
// Relative time — "il y a 3 jours" / "3 days ago"
// ---------------------------------------------------------------------------

const RELATIVE_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
  { unit: 'second', ms: 1000 },
];

export function useFormatRelativeTime(): (d: Date | string | number) => string {
  const { i18n } = useTranslation();
  const rtf = useMemo(
    () => new Intl.RelativeTimeFormat(intlLocale(i18n.language), { numeric: 'auto' }),
    [i18n.language]
  );
  return (d) => {
    const date = d instanceof Date ? d : new Date(d);
    const diff = date.getTime() - Date.now();
    for (const { unit, ms } of RELATIVE_UNITS) {
      if (Math.abs(diff) >= ms || unit === 'second') {
        return rtf.format(Math.round(diff / ms), unit);
      }
    }
    return rtf.format(0, 'second');
  };
}

// ---------------------------------------------------------------------------
// Units — toggleable inches/feet/m² vs cm/m. The default follows the
// locale; user override is plumbed via `kx-units` cookie (to be added
// later, currently a no-op).
// ---------------------------------------------------------------------------

export type UnitSystem = 'metric' | 'imperial';

const DEFAULT_UNITS_BY_LANG: Record<SupportedLanguage, UnitSystem> = {
  fr: 'metric',
  en: 'metric', // matches our EU-first positioning; flip when EN-US user toggles
};

export function useUnitSystem(): UnitSystem {
  const { i18n } = useTranslation();
  return DEFAULT_UNITS_BY_LANG[i18n.language as SupportedLanguage] ?? 'metric';
}

/** Convert centimetres to the right unit string for the active locale. */
export function useFormatLength(): (cm: number) => string {
  const units = useUnitSystem();
  const numberFmt = useFormatNumber();
  return (cm) => {
    if (units === 'imperial') {
      const inches = cm / 2.54;
      if (inches < 12) {
        return `${numberFmt(inches, { maximumFractionDigits: 1 })} in`;
      }
      const feet = inches / 12;
      return `${numberFmt(feet, { maximumFractionDigits: 1 })} ft`;
    }
    if (cm < 100) {
      return `${numberFmt(cm)} cm`;
    }
    return `${numberFmt(cm / 100, { maximumFractionDigits: 2 })} m`;
  };
}
