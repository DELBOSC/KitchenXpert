/**
 * Build the redirect target for a locale-less URL.
 *
 * The whole pathname is the application path (NOT a bad locale): we prepend
 * the default locale to the FULL path, preserving query + hash. This keeps
 * deep-links / bookmarks / email links landing on the intended page —
 * e.g. `/login` → `/fr/login`, `/catalog/IKEA` → `/fr/catalog/IKEA`.
 *
 * Previously `LocaleAwareShell` stripped the first segment, so `/login`
 * became `/fr/` (path lost) and `/catalog/IKEA` became `/fr/IKEA` (404).
 *
 * Edge case: a structurally-valid but unsupported locale (`/xx/login`)
 * becomes `/fr/xx/login` rather than `/fr/login`. That is rare/malformed
 * and acceptable; the common case (a locale-less deep link) is now correct.
 */
export function localizeUnknownLangPath(
  pathname: string,
  search = '',
  hash = '',
  defaultLang = 'fr',
): string {
  return `/${defaultLang}${pathname}${search}${hash}`;
}
