import { useEffect } from 'react';

import { Hreflang } from '../../i18n/Hreflang';

/**
 * SeoHead — minimal, dependency-free per-page meta manager.
 *
 * The project is single-language (FR) and we only have ~12 public
 * routes, so pulling react-helmet-async (~12 KB gz + a Provider tree)
 * is overkill. This component imperatively updates `<title>`,
 * `<meta name="description">`, OG/Twitter cards and `<link rel="canonical">`
 * inside a useEffect, then resets on unmount.
 *
 * Usage:
 *
 *   <SeoHead
 *     title="Catalogue IKEA — KitchenXpert"
 *     description="Toute la gamme IKEA METOD avec dimensions, prix et import 1-clic dans votre cuisine 3D."
 *     canonical="https://kitchenxpert.com/catalog/ikea"
 *     ogImage="https://kitchenxpert.com/og/catalog-ikea.jpg"
 *   />
 *
 * For the home page (or anywhere we want structured data) pass a
 * `jsonLd` array — one `<script type="application/ld+json">` is
 * injected per entry, with the same auto-cleanup.
 */

export interface SeoHeadProps {
  /** Final <title>. Aim for 50–60 characters. */
  title: string;
  /** Meta description. Aim for 150–160 characters. */
  description: string;
  /** Absolute URL of the canonical version of this page. */
  canonical?: string;
  /** Absolute URL of the social-share image (1200×630 recommended). */
  ogImage?: string;
  /** OG type. `website` for marketing pages, `article` for blog posts. */
  ogType?: 'website' | 'article' | 'product';
  /** Block indexing (e.g. `/dashboard/*`, `/legal/privacy-settings`). */
  noindex?: boolean;
  /** One or more JSON-LD payloads to inject into <head>. */
  jsonLd?: Array<Record<string, unknown>>;
  /** Per-language slug overrides — passed to Hreflang. Defaults to
   *  reusing the current path for both languages. */
  slugMap?: { fr?: string; en?: string };
  /** Disable hreflang alternates on auth-only / no-index pages. */
  skipHreflang?: boolean;
}

// SVG fallback ships in /public/og/default.svg. When the design team
// produces a 1200×630 JPG, drop it at /public/og/default.jpg and
// update this constant — Facebook strips SVG previews so a JPG is
// strongly recommended before launch.
const DEFAULT_OG_IMAGE = 'https://kitchenxpert.com/og/default.svg';
const SITE_NAME = 'KitchenXpert';

function setMeta(selector: string, attrs: Record<string, string>): HTMLMetaElement {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    document.head.appendChild(el);
  }
  for (const [k, v] of Object.entries(attrs)) {el.setAttribute(k, v);}
  return el;
}

function setLink(rel: string, href: string): HTMLLinkElement {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
  return el;
}

export function SeoHead({
  title,
  description,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  noindex = false,
  jsonLd,
  slugMap,
  skipHreflang = false,
}: SeoHeadProps): JSX.Element {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;

    const created: Element[] = [];
    const track = <T extends Element>(el: T): T => {
      created.push(el);
      return el;
    };

    setMeta('meta[name="description"]', { name: 'description', content: description });
    setMeta('meta[name="robots"]', {
      name: 'robots',
      content: noindex ? 'noindex,nofollow' : 'index,follow',
    });

    // Open Graph
    setMeta('meta[property="og:title"]',       { property: 'og:title', content: title });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    setMeta('meta[property="og:type"]',        { property: 'og:type', content: ogType });
    setMeta('meta[property="og:site_name"]',   { property: 'og:site_name', content: SITE_NAME });
    setMeta('meta[property="og:image"]',       { property: 'og:image', content: ogImage });
    setMeta('meta[property="og:locale"]',      { property: 'og:locale', content: 'fr_FR' });
    if (canonical) {
      setMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
    }

    // Twitter Cards (treated as Open Graph fallback by most validators)
    setMeta('meta[name="twitter:card"]',        { name: 'twitter:card', content: 'summary_large_image' });
    setMeta('meta[name="twitter:title"]',       { name: 'twitter:title', content: title });
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    setMeta('meta[name="twitter:image"]',       { name: 'twitter:image', content: ogImage });

    // Canonical
    if (canonical) {setLink('canonical', canonical);}

    // JSON-LD entries (one <script> per payload — separate so each is
    // independently cacheable + parseable by crawlers).
    if (jsonLd) {
      for (const payload of jsonLd) {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(payload);
        script.dataset.seoHead = 'true';
        document.head.appendChild(script);
        track(script);
      }
    }

    return () => {
      document.title = previousTitle;
      // Only remove the JSON-LD scripts we added; leave <meta> entries
      // in place — the next page's SeoHead will overwrite them, and
      // ripping them out on unmount causes an SEO-blank flicker.
      for (const el of created) {el.remove();}
    };
  }, [title, description, canonical, ogImage, ogType, noindex, jsonLd]);

  // Hreflang alternates are rendered by a sibling component so they get
  // their own useEffect lifecycle (independent cleanup) and the prop
  // `slugMap` only triggers re-render when it actually changes.
  if (skipHreflang || noindex) {return <></>;}
  return <Hreflang slugMap={slugMap} />;
}

// ---------------------------------------------------------------------------
// Helpers — pre-baked JSON-LD payloads for the marketing site.
// ---------------------------------------------------------------------------

export const ORGANIZATION_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'KitchenXpert',
  url: 'https://kitchenxpert.com',
  logo: 'https://kitchenxpert.com/logo-512.png',
  sameAs: [
    'https://twitter.com/kitchenxpert',
    'https://www.linkedin.com/company/kitchenxpert',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'contact@kitchenxpert.com',
    availableLanguage: ['French', 'English'],
  },
} as const;

export const WEBSITE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'KitchenXpert',
  url: 'https://kitchenxpert.com',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://kitchenxpert.com/catalog?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
} as const;

export const SOFTWARE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'KitchenXpert',
  applicationCategory: 'DesignApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
    description: 'Plan Découverte gratuit ; Premium 14,90 €/mois ; Studio 49 €/mois',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '128',
  },
} as const;
