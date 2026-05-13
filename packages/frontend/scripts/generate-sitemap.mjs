#!/usr/bin/env node
/**
 * Generate `public/sitemap.xml` for the public surface of the SPA.
 *
 * Run via `node scripts/generate-sitemap.mjs` (wired into the
 * frontend's build script). The list of routes is hand-maintained
 * because react-router doesn't expose it at build time and crawling
 * the bundle is brittle.
 *
 * If you add or remove a public route in src/router.tsx, update the
 * PUBLIC_ROUTES array below in the same PR. The legal-compliance test
 * already enforces that legal pages exist; this is the SEO equivalent.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = process.env.SITE_URL || 'https://kitchenxpert.com';
const TODAY = new Date().toISOString().slice(0, 10);

/** @typedef {{ path: string; changefreq: 'daily'|'weekly'|'monthly'|'yearly'; priority: number }} Route */

/** @type {Route[]} */
const PUBLIC_ROUTES = [
  { path: '/',                changefreq: 'daily',   priority: 1.0 },
  { path: '/login',           changefreq: 'monthly', priority: 0.5 },
  { path: '/register',        changefreq: 'monthly', priority: 0.7 },
  { path: '/forgot-password', changefreq: 'yearly',  priority: 0.3 },
  { path: '/pricing',         changefreq: 'weekly',  priority: 0.9 },
  { path: '/comment-ca-marche', changefreq: 'weekly', priority: 0.9 },
  { path: '/designer/sandbox',  changefreq: 'monthly', priority: 0.7 },
  { path: '/catalog',         changefreq: 'weekly',  priority: 0.9 },
  { path: '/catalog/IKEA',    changefreq: 'weekly',  priority: 0.8 },
  { path: '/catalog/LEROY_MERLIN', changefreq: 'weekly', priority: 0.8 },
  { path: '/catalog/CASTORAMA',    changefreq: 'weekly', priority: 0.8 },
  { path: '/catalog/SCHMIDT',      changefreq: 'weekly', priority: 0.8 },
  { path: '/catalog/BOSCH',        changefreq: 'weekly', priority: 0.8 },
  { path: '/legal/mentions',  changefreq: 'monthly', priority: 0.3 },
  { path: '/legal/cgv',       changefreq: 'monthly', priority: 0.3 },
  { path: '/legal/privacy',   changefreq: 'monthly', priority: 0.3 },
  { path: '/legal/cookies',   changefreq: 'monthly', priority: 0.3 },
];

const escape = (s) =>
  s.replace(/&/g, '&amp;').replace(/'/g, '&apos;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  PUBLIC_ROUTES
    .map(
      (r) =>
        `  <url>\n` +
        `    <loc>${escape(SITE_URL + r.path)}</loc>\n` +
        `    <lastmod>${TODAY}</lastmod>\n` +
        `    <changefreq>${r.changefreq}</changefreq>\n` +
        `    <priority>${r.priority.toFixed(1)}</priority>\n` +
        `  </url>`,
    )
    .join('\n') +
  `\n</urlset>\n`;

const out = path.resolve(__dirname, '../public/sitemap.xml');
await writeFile(out, xml, 'utf8');
console.log(`✓ sitemap.xml written to ${out}  (${PUBLIC_ROUTES.length} URLs)`);
