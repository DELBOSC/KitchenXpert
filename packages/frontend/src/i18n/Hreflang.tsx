import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from './LanguageProvider';

/**
 * Hreflang — injecte les `<link rel="alternate" hreflang="…">` dans
 * <head> à chaque navigation.
 *
 * Trois variantes générées :
 *   - hreflang="fr"        → /fr/<path>
 *   - hreflang="en"        → /en/<path>
 *   - hreflang="x-default" → /fr/<path>     (FR est le marché principal)
 *
 * Si `slugMap` est fourni (cas des pages /guides/* où l'URL diffère
 * d'une langue à l'autre), on traduit le slug avant de construire la
 * variante. Sinon on assume le même path à un préfixe lang près.
 *
 * Monté UNE FOIS au top du layout (ou dans SeoHead). Idempotent —
 * nettoie ses propres balises au démontage / changement de route.
 *
 * **Pourquoi pas via <Helmet> :** on n'a pas helmet-async dans le
 * projet. Manipulation directe du DOM = 30 lignes, 0 dep.
 */

const SITE_URL = 'https://kitchenxpert.com';
const TAG_MARKER = 'data-kx-hreflang';

export interface HreflangProps {
  /** Map slug FR ↔ EN si la page a un slug traduit (cf data/slug-mapping.json). */
  slugMap?: Partial<Record<SupportedLanguage, string>>;
}

export function Hreflang({ slugMap }: HreflangProps = {}): null {
  const { pathname } = useLocation();

  useEffect(() => {
    // Strip the leading /:lang if present so we work on a "neutral" path.
    const neutral = pathname.replace(/^\/(fr|en)(\/|$)/, '/');

    const links: HTMLLinkElement[] = [];
    const add = (hreflang: string, href: string): void => {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = hreflang;
      link.href = `${SITE_URL}${href}`;
      link.setAttribute(TAG_MARKER, 'true');
      document.head.appendChild(link);
      links.push(link);
    };

    for (const lang of SUPPORTED_LANGUAGES) {
      // Resolve the localised path
      const localPath = slugMap?.[lang] ?? neutral;
      const prefixed = `/${lang}${localPath.startsWith('/') ? localPath : `/${  localPath}`}`;
      add(lang, prefixed);
    }
    // x-default — what Google serves when no language matches
    const xDefaultPath = slugMap?.fr ?? neutral;
    add('x-default', `/fr${xDefaultPath.startsWith('/') ? xDefaultPath : `/${  xDefaultPath}`}`);

    return () => {
      for (const link of links) {link.remove();}
    };
  }, [pathname, slugMap]);

  return null;
}

/**
 * Generate the alternates server-side at build time. Used by:
 *   - sitemap.xml multilingue (cf scripts/generate-sitemap.mjs)
 *   - <head> dans Astro pour les pages éditoriales pré-rendues
 */
export interface AlternateEntry {
  hreflang: string;
  href: string;
}

export function buildAlternates(
  pathname: string,
  slugMap?: Partial<Record<SupportedLanguage, string>>,
): AlternateEntry[] {
  const neutral = pathname.replace(/^\/(fr|en)(\/|$)/, '/');
  const alternates: AlternateEntry[] = [];
  for (const lang of SUPPORTED_LANGUAGES) {
    const localPath = slugMap?.[lang] ?? neutral;
    alternates.push({
      hreflang: lang,
      href: `${SITE_URL}/${lang}${localPath.startsWith('/') ? localPath : `/${  localPath}`}`,
    });
  }
  const xDefaultPath = slugMap?.fr ?? neutral;
  alternates.push({
    hreflang: 'x-default',
    href: `${SITE_URL}/fr${xDefaultPath.startsWith('/') ? xDefaultPath : `/${  xDefaultPath}`}`,
  });
  return alternates;
}

export default Hreflang;
